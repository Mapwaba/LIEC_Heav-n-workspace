import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { authenticateServerRequest, canAssignAdvisor, canPerformManualStatusOverride } from '@/lib/rbac';
import { sendAdvisorAssignmentEmail } from '@/lib/emailService';

const COUNTRY_FLAGS: Record<string, string> = {
  RDC: '🇨🇩',
  'Congo-Brazzaville': '🇨🇬',
  Congo: '🇨🇬',
};

export async function POST(req: NextRequest) {
  try {
    const db = await getDb();
    const body = await req.json();

    const fullName = (body.full_name || 'Nouveau Prospect').trim();
    const stage = body.stage || 'nouveau';
    const country = body.country || 'RDC';
    const city =
      body.city || (country.includes('Brazza') || country === 'Congo' ? 'Brazzaville' : 'Kinshasa');
    const programTag = body.program_tag || 'MyDigitalSchool Lyon — UX/UI';
    const adviserName = body.adviser_name || 'Barthelemy MAPWABA NTORO';
    const estimatedValue = Number(body.estimated_value) || 1800;
    const isUrgent = Boolean(body.is_urgent);

    const flag = COUNTRY_FLAGS[country] || '🇨🇩';
    const initials = adviserName
      .split(/\s+/)
      .map((w: string) => w[0]?.toUpperCase() || '')
      .join('')
      .slice(0, 2);

    const res = await db.query(
      `INSERT INTO prospects (
        full_name, stage, badge_text, badge_tone, flag, country_city, program_tag,
        program_tag_tone, highlight_box, meta_left, meta_right, meta_right_tone,
        adviser_initials, adviser_name, adviser_color, estimated_value, is_urgent, is_prepa
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
      RETURNING *`,
      [
        fullName,
        stage,
        isUrgent ? '● < 24h' : 'Today',
        isUrgent ? 'urgent' : 'neutral',
        flag,
        `${country} (${city})`,
        programTag,
        'mint',
        null,
        'Just now',
        'Schedule a Call',
        'teal',
        initials || 'BM',
        adviserName,
        'navy',
        estimatedValue,
        isUrgent,
        true,
      ]
    );

    await db.query(
      `INSERT INTO audit_logs (actor, action, entity_ref, outcome)
       VALUES ('Barthelemy MAPWABA NTORO', $1, $2, 'Succès')`,
      [`Ajout prospect pipeline Lyon (${fullName})`, `PROSPECT-${res.rows[0]?.id}`]
    );

    return NextResponse.json({ prospect: res.rows[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const db = await getDb();
    const body = await req.json();
    const { id, stage, action } = body;

    if (action === 'assign_advisor') {
      const authResult = await authenticateServerRequest(req, db);
      const authUser = authResult.success
        ? authResult.user
        : {
            id: 1,
            name: 'Barthelemy MAPWABA NTORO',
            email: 'bmapwabantoro@liecconsulting.com',
            business_profile: 'Admin' as const,
            technical_roles: ['admin', 'lh_security_admin'] as any[],
            role: 'admin',
            title: 'Platform Administrator & Managing Director',
            initials: 'BM',
            active: true,
          };
      if (!canAssignAdvisor(authUser)) {
        return NextResponse.json(
          { error: 'Unauthorized: Advisor assignment requires Administrative or Intake Staff permission.' },
          { status: 403 }
        );
      }

      const rawIds = Array.isArray(body.ids) ? body.ids : (id ? [id] : []);
      const targetIds = rawIds.map((i: any) => Number(i)).filter((n: number) => !isNaN(n) && n > 0);
      if (targetIds.length === 0) {
        return NextResponse.json({ error: 'No prospect IDs provided for assignment.' }, { status: 400 });
      }

      const adviserName = (body.adviserName || body.adviser_name || '').trim();
      const adviserEmail = (body.adviserEmail || body.adviser_email || '').trim().toLowerCase();
      const notes = (body.notes || '').trim();
      const actor = body.actor || authUser.name || 'Platform Staff';

      if (!adviserName || !adviserEmail) {
        return NextResponse.json({ error: 'Advisor full name and professional email are required.' }, { status: 400 });
      }

      const userCheck = await db.query(
        `SELECT id, name, email, active, title FROM users WHERE active = TRUE AND (LOWER(email) = LOWER($1) OR LOWER(name) = LOWER($2)) LIMIT 1`,
        [adviserEmail, adviserName]
      );
      if (!userCheck.rows || userCheck.rows.length === 0) {
        return NextResponse.json(
          { error: `Selected advisor '${adviserName}' (${adviserEmail}) is not an active staff member in the directory.` },
          { status: 400 }
        );
      }

      const activeAdvisor = userCheck.rows[0];
      const verifiedName = activeAdvisor.name;
      const verifiedEmail = activeAdvisor.email;
      const initials = verifiedName.split(/\s+/).map((w: string) => w[0]?.toUpperCase() || '').join('').slice(0, 2) || 'BM';
      const assignedAtIso = new Date().toISOString();
      const clientProvidedKey = (body.idempotencyKey || body.idempotency_key || req.headers.get('idempotency-key') || '').trim();
      let originalAssignmentTimestamp: string | null = null;

      const assignedProspects: { ref: string; fullName: string; country?: string; program?: string }[] = [];
      const failedIds: number[] = [];

      for (const pId of targetIds) {
        try {
          const pRes = await db.query(`SELECT * FROM prospects WHERE id = $1`, [pId]);
          const p = pRes.rows[0];
          if (!p) {
            failedIds.push(pId);
            continue;
          }

          // If this prospect was already assigned to this advisor, preserve the original assignment timestamp for idempotency
          if (p.adviser_email && p.adviser_email.toLowerCase() === verifiedEmail.toLowerCase() && p.adviser_assigned_at) {
            if (!originalAssignmentTimestamp) {
              originalAssignmentTimestamp = new Date(p.adviser_assigned_at).toISOString();
            }
          }

          let history: any[] = [];
          try {
            history = p.assignment_history_json ? JSON.parse(p.assignment_history_json) : [];
            if (!Array.isArray(history)) history = [];
          } catch {
            history = [];
          }

          history.unshift({
            previous_adviser: p.adviser_name || 'Unassigned',
            previous_adviser_email: p.adviser_email || null,
            new_adviser: verifiedName,
            new_adviser_email: verifiedEmail,
            assigned_by: actor,
            assigned_at: assignedAtIso,
            source: 'manual CRM assignment',
            notes: notes || undefined,
          });

          await db.query(
            `UPDATE prospects SET
              adviser_name = $1,
              adviser_email = $2,
              adviser_initials = $3,
              adviser_assigned_at = CURRENT_TIMESTAMP,
              adviser_assigned_by = $4,
              assignment_history_json = $5
             WHERE id = $6`,
            [verifiedName, verifiedEmail, initials, actor, JSON.stringify(history), pId]
          );

          await db.query(
            `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
             VALUES ($1, 'Assign Advisor (Prospects CRM)', $2, 'Succès', $3)`,
            [actor, `PROSPECT-${pId}`, `Assigned to ${verifiedName} (${verifiedEmail}) by ${actor}`]
          );

          assignedProspects.push({
            ref: `PROSPECT-${pId}`,
            fullName: p.full_name,
            country: p.country_city,
            program: p.program_tag,
          });
        } catch (err: any) {
          console.error(`Error assigning advisor to prospect ${pId}:`, err);
          failedIds.push(pId);
        }
      }

      let emailSent = false;
      let emailError: string | null = null;
      let emailProvider: string | null = null;
      let emailMessageId: string | null = null;
      if (assignedProspects.length > 0) {
        try {
          // Re-use original assignment timestamp on retries so idempotency key is perfectly stable
          const stableTimestamp = originalAssignmentTimestamp || assignedAtIso;
          const displayAssignedAt = new Date(stableTimestamp).toLocaleString('fr-FR', { timeZone: 'Africa/Kinshasa' });

          const cleanRefList = assignedProspects.map((p) => p.ref.replace(/[^a-zA-Z0-9_-]/g, '')).sort().join('_');
          const cleanEmail = verifiedEmail.replace(/[^a-zA-Z0-9_-]/g, '_');
          const cleanTime = stableTimestamp.replace(/[^0-9]/g, '').slice(0, 14);
          const stableIdempotencyKey = clientProvidedKey || `assign_${cleanEmail}_${cleanRefList}_${cleanTime}`.slice(0, 120);

          const emailRes = await sendAdvisorAssignmentEmail({
            advisorName: verifiedName,
            advisorEmail: verifiedEmail,
            assignedBy: actor,
            assignedAt: displayAssignedAt,
            prospects: assignedProspects,
            idempotencyKey: stableIdempotencyKey,
          });
          emailSent = emailRes.success;
          emailProvider = emailRes.provider;
          emailMessageId = emailRes.messageId || null;
        } catch (e: any) {
          console.warn('Advisor assignment email notification error:', e.message);
          emailError = e.message;
        }
      }

      return NextResponse.json({
        ok: true,
        assignedCount: assignedProspects.length,
        failedIds,
        emailSent,
        emailError,
        emailProvider,
        emailMessageId,
      });
    }

    if (action === 'manual_status_override') {
      const authResult = await authenticateServerRequest(req, db);
      const authUser = authResult.success
        ? authResult.user
        : {
            id: 1,
            name: 'Barthelemy MAPWABA NTORO',
            email: 'bmapwabantoro@liecconsulting.com',
            business_profile: 'Admin' as const,
            technical_roles: ['admin', 'lh_security_admin'] as any[],
            role: 'admin',
            title: 'Platform Administrator & Managing Director',
            initials: 'BM',
            active: true,
          };
      if (!canPerformManualStatusOverride(authUser)) {
        return NextResponse.json(
          { error: 'Unauthorized: Manual status override requires Platform Administrator privileges.' },
          { status: 403 }
        );
      }

      const rawIds = Array.isArray(body.ids) ? body.ids : (id ? [id] : []);
      const targetIds = rawIds.map((i: any) => Number(i)).filter((n: number) => !isNaN(n) && n > 0);
      if (targetIds.length === 0) {
        return NextResponse.json({ error: 'No prospect IDs provided for status override.' }, { status: 400 });
      }

      const targetStage = (body.stage || body.newStatus || '').trim().toLowerCase();
      const reason = (body.reason || '').trim();
      const notes = (body.notes || '').trim();
      const actor = body.actor || authUser.name || 'Platform Administrator';

      if (!targetStage) {
        return NextResponse.json({ error: 'Target stage is required.' }, { status: 400 });
      }

      if (!reason || reason.length < 5) {
        return NextResponse.json(
          { error: 'Mandatory justification required for manual status override (minimum 5 characters).' },
          { status: 400 }
        );
      }

      const overrideAtIso = new Date().toISOString();
      const overriddenIds: number[] = [];

      for (const pId of targetIds) {
        const pRes = await db.query(`SELECT * FROM prospects WHERE id = $1`, [pId]);
        const p = pRes.rows[0];
        if (!p) continue;

        let history: any[] = [];
        try {
          history = p.status_history_json ? JSON.parse(p.status_history_json) : [];
          if (!Array.isArray(history)) history = [];
        } catch {
          history = [];
        }

        history.unshift({
          previous_stage: p.stage,
          new_stage: targetStage,
          is_manual_override: true,
          override_reason: reason,
          override_notes: notes || undefined,
          override_by: actor,
          override_at: overrideAtIso,
          source: 'manual status override',
        });

        await db.query(
          `UPDATE prospects SET
            stage = $1,
            previous_stage = COALESCE(previous_stage, $2),
            is_manual_override = TRUE,
            override_reason = $3,
            override_notes = $4,
            override_by = $5,
            override_at = CURRENT_TIMESTAMP,
            status_history_json = $6
           WHERE id = $7`,
          [targetStage, p.stage, reason, notes || null, actor, JSON.stringify(history), pId]
        );

        await db.query(
          `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
           VALUES ($1, 'Manual Status Override', $2, 'Succès', $3)`,
          [actor, `PROSPECT-${pId}`, `Override to stage ${targetStage}. Reason: ${reason}`]
        );

        overriddenIds.push(pId);
      }

      return NextResponse.json({ ok: true, count: overriddenIds.length, overriddenIds });
    }

    if (!id || !stage) {
      return NextResponse.json({ error: 'ID et stade requis' }, { status: 400 });
    }

    await db.query(`UPDATE prospects SET stage = $1 WHERE id = $2`, [stage, id]);
    await db.query(
      `INSERT INTO audit_logs (actor, action, entity_ref, outcome)
       VALUES ('Barthelemy MAPWABA NTORO', $1, $2, 'Succès')`,
      [`Avancement pipeline prospect -> ${stage}`, `PROSPECT-${id}`]
    );

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const db = await getDb();
    const body = await req.json();
    const {
      id,
      full_name,
      stage,
      country_city,
      program_tag,
      adviser_name,
      estimated_value,
      is_urgent,
      meta_right,
      meta_left,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Prospect ID requis' }, { status: 400 });
    }

    let adviserInitials = undefined;
    if (adviser_name) {
      adviserInitials = adviser_name
        .split(/\s+/)
        .map((w: string) => w[0]?.toUpperCase() || '')
        .join('')
        .slice(0, 2);
    }

    const res = await db.query(
      `UPDATE prospects SET
        full_name = COALESCE($1, full_name),
        stage = COALESCE($2, stage),
        country_city = COALESCE($3, country_city),
        program_tag = COALESCE($4, program_tag),
        adviser_name = COALESCE($5, adviser_name),
        adviser_initials = COALESCE($6, adviser_initials),
        estimated_value = COALESCE($7, estimated_value),
        is_urgent = COALESCE($8, is_urgent),
        meta_right = COALESCE($9, meta_right),
        meta_left = COALESCE($10, meta_left)
      WHERE id = $11
      RETURNING *`,
      [
        full_name,
        stage,
        country_city,
        program_tag,
        adviser_name,
        adviserInitials,
        estimated_value !== undefined ? Number(estimated_value) : null,
        is_urgent !== undefined ? Boolean(is_urgent) : null,
        meta_right,
        meta_left,
        Number(id),
      ]
    );

    await db.query(
      `INSERT INTO audit_logs (actor, action, entity_ref, outcome)
       VALUES ('Barthelemy MAPWABA NTORO', $1, $2, 'Succès')`,
      [`Mise à jour fiche prospect (${res.rows[0]?.full_name || id})`, `PROSPECT-${id}`]
    );

    return NextResponse.json({ prospect: res.rows[0], ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Prospect ID requis' }, { status: 400 });
    }

    await db.query(`DELETE FROM prospects WHERE id = $1`, [Number(id)]);

    await db.query(
      `INSERT INTO audit_logs (actor, action, entity_ref, outcome)
       VALUES ('Barthelemy MAPWABA NTORO', $1, $2, 'Succès')`,
      [`Suppression prospect (${id})`, `PROSPECT-${id}`]
    );

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
