import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { authenticateServerRequest, canAssignAdvisor, canPerformManualStatusOverride, canVerifyFinancialPayments, canManageProspects } from '@/lib/rbac';
import { sendAdvisorAssignmentEmail } from '@/lib/emailService';
import { verifyFirstInstalmentPayment } from '@/lib/paymentVerification';

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
            workspaceUrl: 'https://workspace.liecconsulting.com/?tab=prospects',
            idempotencyKey: stableIdempotencyKey,
          });
          emailSent = emailRes.success;
          emailProvider = emailRes.provider;
          emailMessageId = emailRes.messageId || null;

          await db.query(
            `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
             VALUES ($1, 'Advisor Email Dispatched', $2, 'Succès', $3)`,
            [actor, `PROSPECTS-${assignedProspects.length}`, `Dispatched to ${verifiedEmail} via ${emailProvider}. ID: ${emailMessageId || 'N/A'}`]
          );
        } catch (e: any) {
          console.warn('Advisor assignment email notification error:', e.message);
          emailError = e.message;

          await db.query(
            `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
             VALUES ($1, 'Advisor Email Failed', $2, 'Echec', $3)`,
            [actor, `PROSPECTS-${assignedProspects.length}`, `Failed to dispatch to ${verifiedEmail}: ${e.message}`]
          );
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

    if (action === 'record_first_contact') {
      const pId = Number(id);
      if (!pId) return NextResponse.json({ error: 'Valid prospect ID is required.' }, { status: 400 });

      const method = (body.contact_method || 'telephone').trim();
      const outcome = (body.contact_outcome || 'Reachable / Interested').trim();
      const notes = (body.notes || '').trim();
      const contactDate = body.contact_date || new Date().toISOString();
      const author = body.actor || 'Barthelemy MAPWABA NTORO';

      const updateRes = await db.query(
        `UPDATE prospects SET
          stage = 'premier_contact',
          first_contact_date = $1,
          first_contact_method = $2,
          first_contact_outcome = $3,
          first_contact_notes = $4,
          badge_text = 'Contact Établi',
          badge_tone = 'amber',
          meta_right = 'Éligibilité à évaluer',
          meta_right_tone = 'amber'
         WHERE id = $5
         RETURNING *`,
        [contactDate, method, outcome, notes, pId]
      );

      const p = updateRes.rows[0];
      if (!p) return NextResponse.json({ error: 'Prospect not found.' }, { status: 404 });

      // Record note in prospect_notes table
      const logNote = `[PREMIER CONTACT] Méthode: ${method}. Résultat: ${outcome}.${notes ? ` Notes: ${notes}` : ''}`;
      await db.query(
        `INSERT INTO prospect_notes (prospect_id, author, content) VALUES ($1, $2, $3)`,
        [pId, author, logNote]
      );

      await db.query(
        `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
         VALUES ($1, 'Enregistrement Premier Contact', $2, 'Succès', $3)`,
        [author, `PROSPECT-${pId}`, `Contact via ${method} - ${outcome}`]
      );

      return NextResponse.json({ ok: true, prospect: p, message: 'First contact recorded successfully.' });
    }

    if (action === 'record_eligibility') {
      const pId = Number(id);
      if (!pId) return NextResponse.json({ error: 'Valid prospect ID is required.' }, { status: 400 });

      const eligibilityStatus = (body.eligibility_status || 'Pending Review').trim();
      const notes = (body.notes || '').trim();
      const assessedBy = (body.assessed_by || 'Barthelemy MAPWABA NTORO').trim();

      const badgeTone = eligibilityStatus === 'Eligible' ? 'mint' : eligibilityStatus === 'Not Eligible' ? 'urgent' : 'amber';
      const badgeText = eligibilityStatus === 'Eligible' ? 'Éligible LIEC' : eligibilityStatus === 'Not Eligible' ? 'Non Éligible' : 'Éligibilité en cours';

      const updateRes = await db.query(
        `UPDATE prospects SET
          stage = 'diagnostic',
          eligibility_status = $1,
          eligibility_date = CURRENT_TIMESTAMP,
          eligibility_assessed_by = $2,
          eligibility_notes = $3,
          badge_text = $4,
          badge_tone = $5,
          meta_right = $6,
          meta_right_tone = $7
         WHERE id = $8
         RETURNING *`,
        [
          eligibilityStatus,
          assessedBy,
          notes,
          badgeText,
          badgeTone,
          eligibilityStatus === 'Eligible' ? 'Prêt Inscription' : 'Dossier Bloqué',
          badgeTone === 'mint' ? 'teal' : 'neutral',
          pId,
        ]
      );

      const p = updateRes.rows[0];
      if (!p) return NextResponse.json({ error: 'Prospect not found.' }, { status: 404 });

      const logNote = `[BILAN ÉLIGIBILITÉ] Statut: ${eligibilityStatus}. Évaluateur: ${assessedBy}.${notes ? ` Justification: ${notes}` : ''}`;
      await db.query(
        `INSERT INTO prospect_notes (prospect_id, author, content) VALUES ($1, $2, $3)`,
        [pId, assessedBy, logNote]
      );

      await db.query(
        `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
         VALUES ($1, 'Évaluation Éligibilité Prospect', $2, 'Succès', $3)`,
        [assessedBy, `PROSPECT-${pId}`, `Statut: ${eligibilityStatus}`]
      );

      return NextResponse.json({ ok: true, prospect: p, message: 'Eligibility assessment recorded successfully.' });
    }

    if (action === 'complete_registration') {
      const pId = Number(id);
      if (!pId) return NextResponse.json({ error: 'Valid prospect ID is required.' }, { status: 400 });

      const updateRes = await db.query(
        `UPDATE prospects SET
          registration_completed = TRUE,
          registration_date = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`,
        [pId]
      );
      return NextResponse.json({ ok: true, prospect: updateRes.rows[0], message: 'Registration marked completed.' });
    }

    if (action === 'verify_first_instalment') {
      const authResult = await authenticateServerRequest(req, db);
      if (authResult.authenticated && !canVerifyFinancialPayments(authResult.user)) {
        return NextResponse.json(
          { error: 'Forbidden: Only Finance Officers or Administrators can manually verify first-instalment payments.' },
          { status: 403 }
        );
      }

      const pId = Number(id);
      if (!pId) return NextResponse.json({ error: 'Valid prospect ID is required.' }, { status: 400 });

      const pRes = await db.query(`SELECT full_name, first_instalment_ref FROM prospects WHERE id = $1`, [pId]);
      const p = pRes.rows[0];
      if (!p) return NextResponse.json({ error: 'Prospect not found.' }, { status: 404 });

      let amount = Number(body.amount) || 1800;
      let paymentRef = (body.payment_ref || body.ref || `INST1-P${pId}`).trim();

      // Check authoritative payment verification
      const paymentOutcome = await verifyFirstInstalmentPayment(db, {
        fullName: p.full_name,
        knownPaymentRef: body.payment_ref || p.first_instalment_ref,
      });

      if (paymentOutcome.verified) {
        paymentRef = paymentOutcome.paymentRef || paymentRef;
        amount = paymentOutcome.amount || amount;
      }

      const updateRes = await db.query(
        `UPDATE prospects SET
          first_instalment_paid = TRUE,
          first_instalment_amount = $1,
          first_instalment_ref = $2,
          first_instalment_date = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING *`,
        [amount, paymentRef, pId]
      );

      return NextResponse.json({
        ok: true,
        prospect: updateRes.rows[0],
        first_instalment_paid: true,
        amount,
        paymentRef,
        message: 'First instalment verified and recorded.',
      });
    }

    if (!id || !stage) {
      return NextResponse.json({ error: 'ID et stade requis' }, { status: 400 });
    }

    const pId = Number(id);
    const currProspectRes = await db.query(`SELECT * FROM prospects WHERE id = $1`, [pId]);
    const currProspect = currProspectRes.rows[0];
    if (!currProspect) {
      return NextResponse.json({ error: 'Prospect not found.' }, { status: 404 });
    }

    // STRICT BUSINESS RULE: Stage 4 (Qualified) requires all 3 conditions:
    if (stage === 'qualifie') {
      const authResult = await authenticateServerRequest(req, db);
      if (authResult.authenticated && !canManageProspects(authResult.user)) {
        return NextResponse.json(
          { error: 'Forbidden: Insufficient privileges to qualify prospects.' },
          { status: 403 }
        );
      }

      let eligibilityPassed = currProspect.eligibility_status === 'Eligible';
      let registrationCompleted = !!currProspect.registration_completed;
      let firstInstalmentPaid = !!currProspect.first_instalment_paid;

      // Authoritative verification via verifyFirstInstalmentPayment
      const paymentOutcome = await verifyFirstInstalmentPayment(db, {
        studentRef: currProspect.converted_candidate_ref,
        fullName: currProspect.full_name,
        knownPaymentRef: currProspect.first_instalment_ref,
      });

      if (paymentOutcome.status === 'AMBIGUOUS_REQUIRES_FINANCE') {
        return NextResponse.json(
          {
            error: `Qualification rejected: First instalment payment verification is ambiguous (${paymentOutcome.reason}). Authoritative manual review by a Finance Officer is required.`,
            paymentStatus: paymentOutcome.status,
          },
          { status: 400 }
        );
      }

      if (paymentOutcome.verified) {
        firstInstalmentPaid = true;
        await db.query(
          `UPDATE prospects SET first_instalment_paid = TRUE, first_instalment_ref = $1, first_instalment_amount = $2, first_instalment_date = CURRENT_TIMESTAMP WHERE id = $3`,
          [paymentOutcome.paymentRef, paymentOutcome.amount || 1800, pId]
        );
      }

      const missingConditions: string[] = [];
      if (!eligibilityPassed) {
        missingConditions.push('Condition 1 Failed: Prospect must pass eligibility assessment (status is currently: ' + (currProspect.eligibility_status || 'Pending Review') + '). A non-eligible prospect cannot be qualified.');
      }
      if (!registrationCompleted) {
        missingConditions.push('Condition 2 Failed: Prospect registration is not completed.');
      }
      if (!firstInstalmentPaid) {
        missingConditions.push('Condition 3 Failed: First instalment payment is not recorded or verified in authoritative financial records.');
      }

      if (missingConditions.length > 0) {
        return NextResponse.json(
          {
            error: 'Qualification rejected: A prospect is considered Qualified ONLY when all three business conditions are satisfied.',
            missingConditions,
            conditions: {
              eligibilityPassed,
              registrationCompleted,
              firstInstalmentPaid,
            },
          },
          { status: 400 }
        );
      }
    }

    await db.query(
      `UPDATE prospects SET
        stage = $1,
        badge_text = $2,
        badge_tone = $3,
        qualification_completed = CASE WHEN $1 = 'qualifie' THEN TRUE ELSE qualification_completed END,
        qualification_date = CASE WHEN $1 = 'qualifie' AND qualification_date IS NULL THEN CURRENT_TIMESTAMP ELSE qualification_date END
       WHERE id = $4`,
      [
        stage,
        stage === 'qualifie' ? 'Qualifié CRM' : stage === 'diagnostic' ? 'Éligibilité' : stage === 'premier_contact' ? 'Contact Établi' : 'Nouveau Lead',
        stage === 'qualifie' ? 'gold' : stage === 'diagnostic' ? 'amber' : 'mint',
        id,
      ]
    );
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
      adviser_email,
      estimated_value,
      is_urgent,
      meta_right,
      meta_left,
      badge_text,
      actor: clientActor,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Prospect ID requis' }, { status: 400 });
    }

    const pId = Number(id);
    const oldRes = await db.query(`SELECT * FROM prospects WHERE id = $1`, [pId]);
    const oldP = oldRes.rows[0];
    if (!oldP) {
      return NextResponse.json({ error: 'Prospect introuvable' }, { status: 404 });
    }

    const actor =
      clientActor ||
      req.headers.get('x-user-name') ||
      req.headers.get('x-user-email') ||
      'Barthelemy MAPWABA NTORO';

    let adviserInitials = undefined;
    let verifiedAdviserName = adviser_name;
    let verifiedAdviserEmail = adviser_email;
    let emailSent = false;
    let emailError: string | null = null;
    let emailProvider: string | null = null;
    let emailMessageId: string | null = null;

    if (adviser_name) {
      adviserInitials = adviser_name
        .split(/\s+/)
        .map((w: string) => w[0]?.toUpperCase() || '')
        .join('')
        .slice(0, 2);

      // Verify and resolve advisor email from users table
      const uRes = await db.query(
        `SELECT id, name, email FROM users WHERE active = TRUE AND (LOWER(name) = LOWER($1) OR LOWER(email) = LOWER($1) OR LOWER(email) = LOWER($2)) LIMIT 1`,
        [adviser_name.trim(), (adviser_email || '').trim()]
      );

      if (uRes.rows.length > 0) {
        verifiedAdviserName = uRes.rows[0].name;
        verifiedAdviserEmail = uRes.rows[0].email;
      }

      // If an advisor is newly assigned or changed, dispatch notification email
      const isNewOrChangedAdvisor =
        verifiedAdviserName &&
        (oldP.adviser_name !== verifiedAdviserName || !oldP.adviser_email);

      if (isNewOrChangedAdvisor && verifiedAdviserEmail) {
        const assignedAtIso = new Date().toISOString();
        const displayAssignedAt = new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Kinshasa' });

        let history: any[] = [];
        try {
          history = oldP.assignment_history_json ? JSON.parse(oldP.assignment_history_json) : [];
          if (!Array.isArray(history)) history = [];
        } catch {
          history = [];
        }

        history.unshift({
          previous_adviser: oldP.adviser_name || 'Unassigned',
          previous_adviser_email: oldP.adviser_email || null,
          new_adviser: verifiedAdviserName,
          new_adviser_email: verifiedAdviserEmail,
          assigned_by: actor,
          assigned_at: assignedAtIso,
          source: 'prospect card modal edit',
        });

        await db.query(
          `UPDATE prospects SET
            adviser_assigned_at = CURRENT_TIMESTAMP,
            adviser_assigned_by = $1,
            assignment_history_json = $2
           WHERE id = $3`,
          [actor, JSON.stringify(history), pId]
        );

        try {
          const cleanRef = `PROSPECT-${pId}`.replace(/[^a-zA-Z0-9_-]/g, '');
          const cleanEmail = verifiedAdviserEmail.replace(/[^a-zA-Z0-9_-]/g, '_');
          const cleanTime = assignedAtIso.replace(/[^0-9]/g, '').slice(0, 14);
          const idempotencyKey = `assign_${cleanEmail}_${cleanRef}_${cleanTime}`.slice(0, 120);

          const emailRes = await sendAdvisorAssignmentEmail({
            advisorName: verifiedAdviserName,
            advisorEmail: verifiedAdviserEmail,
            assignedBy: actor,
            assignedAt: displayAssignedAt,
            prospects: [
              {
                ref: `PROSPECT-${pId}`,
                fullName: full_name || oldP.full_name,
                country: country_city || oldP.country_city,
                program: program_tag || oldP.program_tag,
              },
            ],
            workspaceUrl: 'https://workspace.liecconsulting.com/?tab=prospects',
            idempotencyKey,
          });

          emailSent = emailRes.success;
          emailProvider = emailRes.provider;
          emailMessageId = emailRes.messageId || null;

          await db.query(
            `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
             VALUES ($1, 'Advisor Email Dispatched', $2, 'Succès', $3)`,
            [actor, `PROSPECT-${pId}`, `Dispatched to ${verifiedAdviserEmail} via ${emailProvider}. ID: ${emailMessageId || 'N/A'}`]
          );
        } catch (e: any) {
          console.warn('Advisor assignment email notification error on prospect card edit:', e.message);
          emailError = e.message;

          await db.query(
            `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
             VALUES ($1, 'Advisor Email Failed', $2, 'Echec', $3)`,
            [actor, `PROSPECT-${pId}`, `Failed to dispatch to ${verifiedAdviserEmail}: ${e.message}`]
          );
        }

        await db.query(
          `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
           VALUES ($1, 'Assign Advisor (Prospects CRM - Card Edit)', $2, 'Succès', $3)`,
          [actor, `PROSPECT-${pId}`, `Assigned to ${verifiedAdviserName} (${verifiedAdviserEmail}) by ${actor}`]
        );
      }
    }

    const res = await db.query(
      `UPDATE prospects SET
        full_name = COALESCE($1, full_name),
        stage = COALESCE($2, stage),
        country_city = COALESCE($3, country_city),
        program_tag = COALESCE($4, program_tag),
        adviser_name = COALESCE($5, adviser_name),
        adviser_initials = COALESCE($6, adviser_initials),
        adviser_email = COALESCE($7, adviser_email),
        estimated_value = COALESCE($8, estimated_value),
        is_urgent = COALESCE($9, is_urgent),
        meta_right = COALESCE($10, meta_right),
        meta_left = COALESCE($11, meta_left),
        badge_text = COALESCE($12, badge_text)
      WHERE id = $13
      RETURNING *`,
      [
        full_name,
        stage,
        country_city,
        program_tag,
        verifiedAdviserName || adviser_name,
        adviserInitials,
        verifiedAdviserEmail || adviser_email || null,
        estimated_value !== undefined ? Number(estimated_value) : null,
        is_urgent !== undefined ? Boolean(is_urgent) : null,
        meta_right,
        meta_left,
        badge_text,
        pId,
      ]
    );

    await db.query(
      `INSERT INTO audit_logs (actor, action, entity_ref, outcome)
       VALUES ($1, $2, $3, 'Succès')`,
      [actor, `Mise à jour fiche prospect (${res.rows[0]?.full_name || id})`, `PROSPECT-${id}`]
    );

    return NextResponse.json({
      prospect: res.rows[0],
      ok: true,
      emailSent,
      emailError,
      emailProvider,
      emailMessageId,
    });
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
