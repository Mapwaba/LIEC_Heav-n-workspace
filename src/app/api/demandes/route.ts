import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { authenticateServerRequest, canAssignAdvisor, canPerformManualStatusOverride } from '@/lib/rbac';
import { sendAdvisorAssignmentEmail } from '@/lib/emailService';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-email, x-user-lang',
  };
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(),
  });
}


const COUNTRY_MAP: Record<string, { code: string; flag: string }> = {
  RDC: { code: 'CD', flag: '🇨🇩' },
  'Congo (RDC)': { code: 'CD', flag: '🇨🇩' },
  'Congo-Brazzaville': { code: 'CG', flag: '🇨🇬' },
  Congo: { code: 'CG', flag: '🇨🇬' },
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export async function POST(req: NextRequest) {
  try {
    const db = await getDb();
    const body = await req.json();

    const fullName = (body.full_name || body.name || 'Nouveau Candidat').trim();
    const email = (body.email || 'contact@exemple.com').trim();
    const phone = (body.phone || '+243 81 000 0000').trim();

    // 0. Candidate Phone Number (max 14 digits)
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length > 14) {
      return NextResponse.json(
        { error: 'Phone / WhatsApp must be limited to a maximum of 14 digits.' },
        { status: 400 }
      );
    }

    // 1. Parent Full Name
    const parentFullName = (body.parent_full_name || body.parent_name || '').trim();

    // 2. Parent Phone Number (max 14 digits)
    const parentPhone = (body.parent_phone || '').trim();
    const parentPhoneDigits = parentPhone.replace(/\D/g, '');
    if (parentPhoneDigits.length > 14) {
      return NextResponse.json(
        { error: 'Parent Phone Number must be limited to a maximum of 14 digits.' },
        { status: 400 }
      );
    }

    // 3. Year of Graduation (selection between 2010 and 2026)
    const graduationYear = String(body.graduation_year || '').trim();
    if (graduationYear) {
      const gradNum = parseInt(graduationYear, 10);
      if (isNaN(gradNum) || gradNum < 2010 || gradNum > 2030) {
        return NextResponse.json(
          { error: 'Year of Graduation must be between 2010 and 2026.' },
          { status: 400 }
        );
      }
    }

    // 4. Current Activity (max 25 characters)
    const currentActivity = (body.current_activity || '').trim();
    if (currentActivity.length > 25) {
      return NextResponse.json(
        { error: 'Current Activity cannot exceed 25 characters.' },
        { status: 400 }
      );
    }

    // 5. Final Year of University (max 4 digits)
    const finalYearUniversity = (body.final_year_university || '').trim();
    if (finalYearUniversity.length > 4) {
      return NextResponse.json(
        { error: 'Final Year of University cannot exceed 4 digits.' },
        { status: 400 }
      );
    }

    const countryName = (body.country_name || body.country || 'RDC').trim();
    const city = (
      body.city ||
      body.town ||
      (countryName.includes('Brazza') || countryName === 'Congo'
        ? 'Brazzaville, Congo'
        : 'Kinshasa, RDC')
    ).trim();
    const nationality =
      countryName.includes('Brazza') || countryName === 'Congo'
        ? 'Congolaise (Brazzaville)'
        : 'Congolaise (RDC)';
    const program = (body.program || 'MyDigitalSchool Lyon — Dév. Web & UX/UI').trim();
    const servicePole = (body.service_pole || 'PREPA / Écoles Partenaires Lyon').trim();
    const targetCities = (body.target_cities || 'Lyon (Campus Partenaire LIEC)').trim();
    const currentLevel = (body.current_level || 'Licence / Bac+3 (En cours)').trim();
    const budgetRange = (body.budget_range || '8 500 € – 10 000 € / an').trim();
    const expectedStart = (body.expected_start || 'Septembre 2025').trim();
    const rawSexe = (body.sexe || body.gender || 'Male').trim();
    const sexe = (rawSexe === 'Féminin' || rawSexe === 'Female') ? 'Female' : 'Male';
    const message = (
      body.message || 'Demande soumise depuis le portail web LIEC pour un recrutement à Lyon.'
    ).trim();

    // Deduplication check: prevent duplicate submissions within 15 minutes
    const recentDup = await db.query(
      `SELECT * FROM demandes 
       WHERE (LOWER(email) = LOWER($1) OR (phone = $2 AND length($2) > 6))
         AND created_at > NOW() - INTERVAL '15 minutes'
       ORDER BY id DESC LIMIT 1`,
      [email, phone]
    );

    if (recentDup.rows && recentDup.rows.length > 0) {
      const existingDem = recentDup.rows[0];
      const existingCan = await db.query(
        'SELECT ref FROM candidats WHERE LOWER(email) = LOWER($1) OR LOWER(full_name) = LOWER($2) LIMIT 1',
        [email, fullName]
      );
      const canRef = existingCan.rows[0]?.ref || '#CAN-2025-043';

      return NextResponse.json(
        {
          ok: true,
          success: true,
          ref: existingDem.ref,
          demRef: existingDem.ref,
          candidatRef: canRef,
          demande: existingDem,
          message: 'Candidature déjà enregistrée avec succès (dédoublonnée).',
        },
        { headers: corsHeaders() }
      );
    }

    const countRes = await db.query<{ count: string | number }>('SELECT COUNT(*) as count FROM demandes');
    let nextNum = 89 + Number(countRes.rows[0]?.count ?? 0);
    let ref = `#DEM-2025-${String(nextNum).padStart(3, '0')}`;
    while (true) {
      const existing = await db.query('SELECT 1 FROM demandes WHERE ref = $1', [ref]);
      if (!existing.rows || existing.rows.length === 0) break;
      nextNum++;
      ref = `#DEM-2025-${String(nextNum).padStart(3, '0')}`;
    }
    const initials = getInitials(fullName);
    const countryMeta = COUNTRY_MAP[countryName] || { code: 'CD', flag: '🇨🇩' };

    const nowLabel = 'Just now';

    const insertRes = await db.query(
      `INSERT INTO demandes (
        ref, initials, full_name, email, phone, parent_full_name, parent_phone, graduation_year, current_activity, final_year_university,
        whatsapp_verified, country_code, flag, country_name, city, nationality, program, service_pole, target_cities, current_level,
        budget_range, status, adviser, expected_start, message, submitted_at, is_dashboard_recent, sexe
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28)
      RETURNING *`,
      [
        ref,
        initials,
        fullName,
        email,
        phone,
        parentFullName || null,
        parentPhone || null,
        graduationYear || null,
        currentActivity || null,
        finalYearUniversity || null,
        true,
        countryMeta.code,
        countryMeta.flag,
        countryName,
        city,
        nationality,
        program,
        servicePole,
        targetCities,
        currentLevel,
        budgetRange,
        'Nouvelle',
        'Barthelemy MAPWABA NTORO',
        expectedStart,
        message,
        nowLabel,
        true,
        sexe,
      ]
    );

    // Link Student to Parent in parent_student_links
    if (parentFullName && fullName) {
      await db.query(
        `INSERT INTO parent_student_links (parent_name, parent_phone, student_name, student_email, student_program, source)
         VALUES ($1, $2, $3, $4, $5, 'application')
         ON CONFLICT (parent_name, student_name) DO UPDATE SET
           parent_phone = COALESCE(EXCLUDED.parent_phone, parent_student_links.parent_phone),
           student_program = COALESCE(EXCLUDED.student_program, parent_student_links.student_program)`,
        [parentFullName, parentPhone, fullName, email, program]
      );
    }

    await db.query(
      `INSERT INTO demande_notes (demande_ref, author, timestamp_label, content)
       VALUES ($1, $2, $3, $4)`,
      [ref, 'Portail Public LIEC Lyon', "À l'instant", `Demande reçue (${countryName} → Lyon) : ${message}`]
    );

    await db.query(
      `INSERT INTO audit_logs (actor, action, entity_ref, outcome)
       VALUES ($1, $2, $3, 'Succès')`,
      ['Portail Web / API', `Création nouvelle demande (${fullName} - ${program})`, ref]
    );

    // Also register candidate record and prospect CRM entry linked to this application
    const existingCanCheck = await db.query(
      'SELECT ref FROM candidats WHERE LOWER(email) = LOWER($1) OR LOWER(full_name) = LOWER($2) LIMIT 1',
      [email, fullName]
    );

    let canRef = existingCanCheck.rows[0]?.ref;
    const shouldInsertCandidate = !canRef;

    if (!canRef) {
      const canCountRes = await db.query<{ count: string | number }>('SELECT COUNT(*) as count FROM candidats');
      let nextCanNum = 43 + Number(canCountRes.rows[0]?.count ?? 0);
      canRef = `#CAN-2025-${String(nextCanNum).padStart(3, '0')}`;
      while (true) {
        const existingCan = await db.query('SELECT 1 FROM candidats WHERE ref = $1', [canRef]);
        if (!existingCan.rows || existingCan.rows.length === 0) break;
        nextCanNum++;
        canRef = `#CAN-2025-${String(nextCanNum).padStart(3, '0')}`;
      }
    }

    const schoolCode = program.includes('ISCOM')
      ? 'ISCO'
      : program.includes('Tunon')
      ? 'TUNO'
      : program.includes('IHECF')
      ? 'IHEC'
      : program.includes('Ipac')
      ? 'IPAC'
      : program.includes('MBway')
      ? 'MBW'
      : program.includes('ESMES')
      ? 'ESMES'
      : 'MDS';

    const schoolName = program.includes('ISCOM')
      ? 'ISCOM Lyon'
      : program.includes('Tunon')
      ? 'École Internationale Tunon Lyon'
      : program.includes('IHECF')
      ? 'IHECF Lyon'
      : program.includes('Ipac')
      ? 'Ipac Bachelor Factory Lyon'
      : program.includes('MBway')
      ? 'MBway Lyon'
      : program.includes('ESMES')
      ? 'ESMES Business School'
      : 'MyDigitalSchool Lyon';

    const initialJalons = [
      {
        num: 1,
        label: 'JALON 1',
        title: 'Orientation & Dossier',
        status: 'EN COURS',
        tone: 'active',
        description: `Candidature reçue depuis le site web pour ${schoolName}. Qualification en cours.`,
        footer: 'Dossier en examen',
      },
      {
        num: 2,
        label: 'JALON 2',
        title: 'Pièces Académiques',
        status: 'À VENIR',
        tone: 'upcoming',
        description: 'Collecte et certification des relevés de notes et pièces justificatives.',
        footer: 'À planifier',
      },
      {
        num: 3,
        label: 'JALON 3',
        title: 'Dépôt Officiel',
        status: 'ATTENTE',
        tone: 'pending',
        description: `Soumission Campus France et portail ${schoolName}.`,
        footer: 'Session 2027–2028',
      },
      {
        num: 4,
        label: 'JALON 4',
        title: 'Visa & Installation',
        status: 'ATTENTE',
        tone: 'pending',
        description: 'Attestation bancaire YimmiLine AVI et réservation de logement à Lyon.',
        footer: 'Dès admission',
      },
    ];

    const initialVoeux = [
      {
        code: schoolCode,
        codeBg: 'navy',
        university: schoolName,
        rankBadge: 'Vœu n°1',
        rankTone: 'mint',
        program: program.includes('—') ? program.split('—')[1].trim() : program,
        location: 'Campus Lyon',
        meta: 'École Partenaire LIEC Lyon',
        statusBadge: 'Dossier Reçu',
        statusTone: 'teal',
        statusSub: 'En attente qualification',
      },
    ];

    const initialPieces = [
      { name: 'Passeport biométrique', meta: 'En attente', status: 'pending' },
      { name: 'Relevés de notes L1/L2 ou Bac', meta: 'À vérifier', status: 'pending' },
      { name: 'Attestation TCF B2', meta: 'Non requis', status: 'pending' },
    ];

    const nowIso = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const initialHistory = [
      {
        timestamp: nowIso,
        author: 'Portail Web (demarrer-mon-projet)',
        activity_type: 'WEB_APPLICATION_RECEIVED',
        details: `Application submitted on public website. Assigned Demande ${ref} and Candidate Ref ${canRef}.`,
      },
    ];

    // Insert Candidate profile under review (if not already existing)
    if (shouldInsertCandidate) {
      await db.query(
        `INSERT INTO candidats (
          ref, initials, full_name, avatar_url, program, cities, adviser,
          stage_badge, stage_badge_tone, progress_pct, status_left, status_right,
          email, phone, parent_full_name, parent_phone, parent_email, parent_relation,
          graduation_year, current_activity, final_year_university,
          country, nationality, current_diploma, tcf_score, garant_info, interview_date,
          admission_status, procedure_status, description, comments,
          jalons_json, voeux_json, notes_json, pieces_json, history_json
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,
          $8,$9,$10,$11,$12,
          $13,$14,$15,$16,$17,$18,
          $19,$20,$21,
          $22,$23,$24,$25,$26,$27,
          $28,$29,$30,$31,
          $32,$33,$34,$35,$36
        )`,
        [
          canRef,
          initials,
          fullName.toUpperCase(),
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop&q=80',
          program,
          'Lyon (Campus Partenaire)',
          'Barthelemy MAPWABA NTORO',
          'Dossier Reçu',
          'teal',
          15,
          'Dossier à 15%',
          'J-60 Prépa',
          email,
          phone,
          parentFullName || null,
          parentPhone || null,
          null,
          'Parent',
          graduationYear || null,
          currentActivity || null,
          finalYearUniversity || null,
          countryName,
          nationality,
          currentLevel,
          'À planifier',
          'Dossier AVI YIMMILINE à initier',
          'À fixer',
          'Under Review — Pending Qualification',
          'In Progress (Milestone 1)',
          message,
          `Candidature transmise via le formulaire public 2027–2028 (Demande: ${ref})`,
          JSON.stringify(initialJalons),
          JSON.stringify(initialVoeux),
          JSON.stringify([{ author: 'Système', date: "À l'instant", text: `Demande web reçue (${ref})` }]),
          JSON.stringify(initialPieces),
          JSON.stringify(initialHistory),
        ]
      );
    }

    // Also register in prospects CRM queue if not already present
    const existingProspectCheck = await db.query(
      'SELECT id FROM prospects WHERE LOWER(full_name) = LOWER($1) LIMIT 1',
      [fullName]
    );
    if (!existingProspectCheck.rows || existingProspectCheck.rows.length === 0) {
      await db.query(
        `INSERT INTO prospects (
          full_name, stage, badge_text, badge_tone, flag, country_city, program_tag,
          program_tag_tone, highlight_box, meta_left, meta_right, meta_right_tone,
          adviser_initials, adviser_name, adviser_color, estimated_value, is_urgent, is_prepa
        ) VALUES ($1,'nouveau','New Web','cyan',$2,$3,$4,'mint',NULL,'2 800 € TTC','À qualifier','teal','BM','B. Mapwaba','navy',2800,FALSE,TRUE)`,
        [fullName, countryMeta.flag, city, program]
      );
    }

    return NextResponse.json({
      ok: true,
      success: true,
      ref,
      demRef: ref,
      candidatRef: canRef,
      demande: insertRes.rows[0],
      message: 'Candidature enregistrée avec succès dans le Workspace LIEC Heav’n.',
    }, { headers: corsHeaders() });
  } catch (error: any) {
    console.error('Error creating demande:', error);
    return NextResponse.json({ error: error?.message || 'Erreur création demande' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const db = await getDb();
    const body = await req.json();
    const { ref, action } = body;

    const rawRefs = Array.isArray(body.refs) ? body.refs : (ref ? [ref] : []);
    const requestRefs = rawRefs.map((r: any) => String(r).trim()).filter(Boolean);

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

      if (requestRefs.length === 0) {
        return NextResponse.json({ error: 'No prospect references provided for assignment.' }, { status: 400 });
      }

      const adviserName = (body.adviserName || body.adviser_name || '').trim();
      const adviserEmail = (body.adviserEmail || body.adviser_email || '').trim().toLowerCase();
      const notes = (body.notes || '').trim();
      const actor = body.actor || authUser.name || 'Platform Staff';

      if (!adviserName || !adviserEmail) {
        return NextResponse.json({ error: 'Advisor full name and professional email are required.' }, { status: 400 });
      }

      // Verify advisor exists and is active in users directory
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
      const assignedAtIso = new Date().toISOString();
      const clientProvidedKey = (body.idempotencyKey || body.idempotency_key || req.headers.get('idempotency-key') || '').trim();
      let originalAssignmentTimestamp: string | null = null;

      const assignedProspects: { ref: string; fullName: string; country?: string; program?: string }[] = [];
      const failedRefs: string[] = [];

      for (const targetRef of requestRefs) {
        try {
          const demRes = await db.query(`SELECT * FROM demandes WHERE ref = $1`, [targetRef]);
          const dem = demRes.rows[0];
          if (!dem) {
            failedRefs.push(targetRef);
            continue;
          }

          // If this record was already assigned to this advisor, preserve the original assignment timestamp for idempotency
          if (dem.adviser_email && dem.adviser_email.toLowerCase() === verifiedEmail.toLowerCase() && dem.adviser_assigned_at) {
            if (!originalAssignmentTimestamp) {
              originalAssignmentTimestamp = new Date(dem.adviser_assigned_at).toISOString();
            }
          }

          let history: any[] = [];
          try {
            history = dem.assignment_history_json ? JSON.parse(dem.assignment_history_json) : [];
            if (!Array.isArray(history)) history = [];
          } catch {
            history = [];
          }

          history.unshift({
            previous_adviser: dem.adviser || 'Unassigned',
            previous_adviser_email: dem.adviser_email || null,
            new_adviser: verifiedName,
            new_adviser_email: verifiedEmail,
            assigned_by: actor,
            assigned_at: assignedAtIso,
            source: 'manual CRM assignment',
            notes: notes || undefined,
          });

          await db.query(
            `UPDATE demandes SET
              adviser = $1,
              adviser_email = $2,
              adviser_assigned_at = CURRENT_TIMESTAMP,
              adviser_assigned_by = $3,
              assignment_history_json = $4
             WHERE ref = $5`,
            [verifiedName, verifiedEmail, actor, JSON.stringify(history), targetRef]
          );

          // Add note to internal log
          const noteText = notes
            ? `Advisor assigned: ${verifiedName} (${verifiedEmail}). Note: ${notes}`
            : `Advisor assigned: ${verifiedName} (${verifiedEmail}) via manual CRM assignment.`;

          await db.query(
            `INSERT INTO demande_notes (demande_ref, author, timestamp_label, content)
             VALUES ($1, $2, $3, $4)`,
            [targetRef, actor, "Aujourd'hui, à l'instant", noteText]
          );

          // Audit log
          await db.query(
            `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
             VALUES ($1, 'Assign Advisor (Manual CRM)', $2, 'Succès', $3)`,
            [actor, targetRef, `Assigned to ${verifiedName} (${verifiedEmail}) by ${actor}`]
          );

          // Also synchronize with prospects table if matching record exists
          const initials = verifiedName.split(/\s+/).map((w: string) => w[0]?.toUpperCase() || '').join('').slice(0, 2) || 'BM';
          await db.query(
            `UPDATE prospects SET
              adviser_name = $1,
              adviser_email = $2,
              adviser_initials = $3,
              adviser_assigned_at = CURRENT_TIMESTAMP,
              adviser_assigned_by = $4
             WHERE full_name ILIKE $5`,
            [verifiedName, verifiedEmail, initials, actor, dem.full_name]
          );

          assignedProspects.push({
            ref: targetRef,
            fullName: dem.full_name || 'Prospect',
            country: dem.country_name || dem.country_code || 'RDC',
            program: dem.program || 'Lyon Partner Program',
          });
        } catch (err: any) {
          console.error(`Error assigning advisor to ${targetRef}:`, err);
          failedRefs.push(targetRef);
        }
      }

      // If at least one prospect was assigned, send email notification
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
            workspaceUrl: 'https://workspace.liecconsulting.com?tab=prospects',
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

      if (assignedProspects.length === 0 && failedRefs.length > 0) {
        return NextResponse.json(
          { error: `Failed to assign advisor. None of the specified records could be updated: ${failedRefs.join(', ')}` },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ok: true,
        assignedCount: assignedProspects.length,
        failedRefs,
        emailSent,
        emailError,
        emailProvider,
        emailMessageId,
        adviserName: verifiedName,
        adviserEmail: verifiedEmail,
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

      if (requestRefs.length === 0) {
        return NextResponse.json({ error: 'No prospect references provided for status override.' }, { status: 400 });
      }

      const targetStatus = (body.newStatus || body.status || '').trim();
      const reason = (body.reason || '').trim();
      const notes = (body.notes || '').trim();
      const actor = body.actor || authUser.name || 'Platform Administrator';

      if (!targetStatus) {
        return NextResponse.json({ error: 'Target status is required.' }, { status: 400 });
      }

      if (!reason || reason.length < 5) {
        return NextResponse.json(
          { error: 'Mandatory justification required for manual status override (minimum 5 characters).' },
          { status: 400 }
        );
      }

      const overriddenRefs: string[] = [];
      const failedRefs: string[] = [];
      const overrideAtIso = new Date().toISOString();

      for (const targetRef of requestRefs) {
        try {
          const demRes = await db.query(`SELECT * FROM demandes WHERE ref = $1`, [targetRef]);
          const dem = demRes.rows[0];
          if (!dem) {
            failedRefs.push(targetRef);
            continue;
          }

          let history: any[] = [];
          try {
            history = dem.status_history_json ? JSON.parse(dem.status_history_json) : [];
            if (!Array.isArray(history)) history = [];
          } catch {
            history = [];
          }

          history.unshift({
            previous_status: dem.status,
            new_status: targetStatus,
            is_manual_override: true,
            override_reason: reason,
            override_notes: notes || undefined,
            override_by: actor,
            override_at: overrideAtIso,
            source: 'manual status override',
          });

          await db.query(
            `UPDATE demandes SET
              status = $1,
              previous_status = COALESCE(previous_status, $2),
              is_manual_override = TRUE,
              override_reason = $3,
              override_notes = $4,
              override_by = $5,
              override_at = CURRENT_TIMESTAMP,
              status_history_json = $6
             WHERE ref = $7`,
            [targetStatus, dem.status, reason, notes || null, actor, JSON.stringify(history), targetRef]
          );

          // Add note to internal log
          const logNote = `[MANUAL STATUS OVERRIDE] Status changed from "${dem.status}" to "${targetStatus}". Reason: ${reason}.${notes ? ` Notes: ${notes}` : ''}`;
          await db.query(
            `INSERT INTO demande_notes (demande_ref, author, timestamp_label, content)
             VALUES ($1, $2, $3, $4)`,
            [targetRef, actor, "Aujourd'hui, à l'instant", logNote]
          );

          // Audit log (immutable)
          await db.query(
            `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
             VALUES ($1, 'Manual Status Override', $2, 'Succès', $3)`,
            [actor, targetRef, `Override to ${targetStatus}. Reason: ${reason}`]
          );

          overriddenRefs.push(targetRef);
        } catch (err: any) {
          console.error(`Error overriding status for ${targetRef}:`, err);
          failedRefs.push(targetRef);
        }
      }

      if (overriddenRefs.length === 0 && failedRefs.length > 0) {
        return NextResponse.json(
          { error: `Failed to apply manual override to records: ${failedRefs.join(', ')}` },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ok: true,
        count: overriddenRefs.length,
        overriddenRefs,
        failedRefs,
        status: targetStatus,
      });
    }

    if (action === 'release_manual_override') {
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
          { error: 'Unauthorized: Releasing manual status override requires Platform Administrator privileges.' },
          { status: 403 }
        );
      }

      if (requestRefs.length === 0) {
        return NextResponse.json({ error: 'No prospect references provided.' }, { status: 400 });
      }

      const actor = body.actor || authUser.name || 'Platform Administrator';

      for (const targetRef of requestRefs) {
        const demRes = await db.query(`SELECT * FROM demandes WHERE ref = $1`, [targetRef]);
        const dem = demRes.rows[0];
        if (!dem) continue;

        let history: any[] = [];
        try {
          history = dem.status_history_json ? JSON.parse(dem.status_history_json) : [];
          if (!Array.isArray(history)) history = [];
        } catch {
          history = [];
        }

        history.unshift({
          action: 'release_manual_override',
          released_by: actor,
          released_at: new Date().toISOString(),
          status: dem.status,
          message: 'Manual override released; normal automated workflow resumed.'
        });

        await db.query(
          `UPDATE demandes SET
            is_manual_override = FALSE,
            status_history_json = $1
           WHERE ref = $2`,
          [JSON.stringify(history), targetRef]
        );

        await db.query(
          `INSERT INTO demande_notes (demande_ref, author, timestamp_label, content)
           VALUES ($1, $2, $3, $4)`,
          [targetRef, actor, "Aujourd'hui, à l'instant", `[WORKFLOW RESUMED] Manual override released by ${actor}. Automated CRM workflow resumed.`]
        );

        await db.query(
          `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
           VALUES ($1, 'Release Manual Override', $2, 'Succès', 'Manual override released; automated workflow resumed')`,
          [actor, targetRef]
        );
      }

      return NextResponse.json({ ok: true, released: true });
    }

    if (!ref) {
      return NextResponse.json({ error: 'Référence requise' }, { status: 400 });
    }

    if (action === 'add_note') {
      const author = body.author || 'Barthelemy MAPWABA NTORO (Administrateur)';
      const content = (body.content || '').trim();
      if (!content) {
        return NextResponse.json({ error: 'Contenu de note vide' }, { status: 400 });
      }
      const res = await db.query(
        `INSERT INTO demande_notes (demande_ref, author, timestamp_label, content)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [ref, author, "Aujourd'hui, à l'instant", content]
      );
      await db.query(
        `INSERT INTO audit_logs (actor, action, entity_ref, outcome)
         VALUES ($1, $2, $3, 'Succès')`,
        [author, 'Ajout note interne sur demande', ref]
      );
      return NextResponse.json({ note: res.rows[0] });
    }

    if (action === 'update_status') {
      const newStatus = body.status || 'Qualifiée';
      const adviser = body.adviser;
      if (adviser) {
        await db.query(`UPDATE demandes SET status = $1, adviser = $2 WHERE ref = $3`, [
          newStatus,
          adviser,
          ref,
        ]);
      } else {
        await db.query(`UPDATE demandes SET status = $1 WHERE ref = $2`, [newStatus, ref]);
      }
      await db.query(
        `INSERT INTO audit_logs (actor, action, entity_ref, outcome)
         VALUES ('Barthelemy MAPWABA NTORO', $1, $2, 'Succès')`,
        [`Changement statut demande -> ${newStatus}`, ref]
      );
      return NextResponse.json({ ok: true, status: newStatus });
    }

    if (action === 'convert_to_candidat') {
      const demRes = await db.query(`SELECT * FROM demandes WHERE ref = $1`, [ref]);
      const dem = demRes.rows[0];
      if (!dem) {
        return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 });
      }

      await db.query(`UPDATE demandes SET status = 'Convertie' WHERE ref = $1`, [ref]);

      // Check if candidate already exists for this application
      const existingCanRes = await db.query(
        'SELECT ref FROM candidats WHERE LOWER(email) = LOWER($1) OR LOWER(full_name) = LOWER($2) LIMIT 1',
        [dem.email, dem.full_name]
      );
      if (existingCanRes.rows && existingCanRes.rows.length > 0) {
        const existingRef = existingCanRes.rows[0].ref;
        await db.query(
          `UPDATE candidats SET
             stage_badge = 'En cours (Jalon 1)',
             procedure_status = 'En cours (Jalon 1)',
             progress_pct = 25,
             status_right = 'Qualifié'
           WHERE ref = $1`,
          [existingRef]
        );
        return NextResponse.json({ ok: true, candidatRef: existingRef });
      }

      const canCountRes = await db.query<{ count: string | number }>('SELECT COUNT(*) as count FROM candidats');
      let nextCanNum = 43 + Number(canCountRes.rows[0]?.count ?? 0);
      let canRef = `#CAN-2025-${String(nextCanNum).padStart(3, '0')}`;
      while (true) {
        const existingCan = await db.query('SELECT 1 FROM candidats WHERE ref = $1', [canRef]);
        if (!existingCan.rows || existingCan.rows.length === 0) break;
        nextCanNum++;
        canRef = `#CAN-2025-${String(nextCanNum).padStart(3, '0')}`;
      }

      const schoolCode = dem.program.includes('ISCOM')
        ? 'ISCO'
        : dem.program.includes('Tunon')
        ? 'TUNO'
        : dem.program.includes('IHECF')
        ? 'IHEC'
        : dem.program.includes('Ipac')
        ? 'IPAC'
        : dem.program.includes('MBway')
        ? 'MBW'
        : dem.program.includes('ESMES')
        ? 'ESMES'
        : 'MDS';

      const schoolName = dem.program.includes('ISCOM')
        ? 'ISCOM Lyon'
        : dem.program.includes('Tunon')
        ? 'École Internationale Tunon Lyon'
        : dem.program.includes('IHECF')
        ? 'IHECF Lyon'
        : dem.program.includes('Ipac')
        ? 'Ipac Bachelor Factory Lyon'
        : dem.program.includes('MBway')
        ? 'MBway Lyon'
        : dem.program.includes('ESMES')
        ? 'ESMES Business School'
        : 'MyDigitalSchool Lyon';

      const defaultJalons = [
        {
          num: 1,
          label: 'JALON 1',
          title: 'Orientation & Ciblage',
          status: 'EN COURS',
          tone: 'active',
          description: `Dossier issu de la demande ${dem.ref} (${dem.country_name}). Ciblage école partenaire : ${schoolName}.`,
          footer: 'École partenaire Lyon validée',
        },
        {
          num: 2,
          label: 'JALON 2',
          title: 'Pièces Académiques',
          status: 'À VENIR',
          tone: 'upcoming',
          description: `Vérification du niveau ${dem.current_level} et préparation test TCF.`,
          footer: '3 / 10 documents validés',
        },
        {
          num: 3,
          label: 'JALON 3',
          title: 'Dépôt Officiel',
          status: 'ATTENTE',
          tone: 'pending',
          description: `Soumission Campus France (${dem.country_name}) & portail d'admission ${schoolName}.`,
          footer: 'Échéance : 15 Décembre',
        },
        {
          num: 4,
          label: 'JALON 4',
          title: 'Visa & Installation',
          status: 'ATTENTE',
          tone: 'pending',
          description: `Garant financier (${dem.budget_range}), attestation bancaire AVI et logement à Lyon.`,
          footer: 'Dès réception des avis',
        },
      ];

      const defaultVoeux = [
        {
          code: schoolCode,
          codeBg: 'navy',
          university: schoolName,
          rankBadge: 'Vœu n°1',
          rankTone: 'mint',
          program: dem.program,
          location: 'Campus Lyon',
          meta: 'École Partenaire LIEC Lyon',
          statusBadge: 'Dossier Initié',
          statusTone: 'green',
          statusSub: `Qualifié par ${dem.adviser}`,
        },
      ];

      const defaultNotes = [
        {
          author: dem.adviser || 'Barthelemy MAPWABA NTORO',
          date: "Aujourd'hui",
          text: `Dossier candidat créé pour ${schoolName} suite à la qualification de la demande ${dem.ref} (${dem.city}).`,
        },
      ];

      const defaultPieces = [
        { name: `Passeport biométrique (${dem.country_name})`, meta: 'Vérifié', status: 'valid' },
        { name: dem.current_level, meta: 'Reçu', status: 'valid' },
        { name: `Lettre de motivation ${schoolName}`, meta: 'En cours', status: 'pending' },
      ];

      await db.query(
        `INSERT INTO candidats (
          ref, initials, full_name, avatar_url, program, cities, adviser,
          stage_badge, stage_badge_tone, progress_pct, status_left, status_right,
          email, phone, parent_full_name, parent_phone, graduation_year, current_activity, final_year_university,
          country, nationality, current_diploma, tcf_score,
          garant_info, interview_date, jalons_json, voeux_json, notes_json, pieces_json, sexe
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30)`,
        [
          canRef,
          dem.initials,
          dem.full_name.toUpperCase(),
          '',
          dem.program,
          'Lyon (Campus Partenaire)',
          dem.adviser || 'Barthelemy MAPWABA NTORO',
          'En cours (Jalon 1)',
          'teal',
          25,
          'Dossier à 25%',
          'Qualifié',
          dem.email,
          dem.phone,
          dem.parent_full_name || null,
          dem.parent_phone || null,
          dem.graduation_year || null,
          dem.current_activity || null,
          dem.final_year_university || null,
          dem.city,
          dem.nationality,
          dem.current_level,
          'En cours de planification',
          `Budget garanti : ${dem.budget_range}`,
          'À planifier',
          JSON.stringify(defaultJalons),
          JSON.stringify(defaultVoeux),
          JSON.stringify(defaultNotes),
          JSON.stringify(defaultPieces),
          dem.sexe || 'Male',
        ]
      );

      await db.query(
        `INSERT INTO prospects (
          full_name, stage, badge_text, badge_tone, flag, country_city, program_tag,
          program_tag_tone, highlight_box, meta_left, meta_right, meta_right_tone,
          adviser_initials, adviser_name, adviser_color, estimated_value, is_urgent, is_prepa
        ) VALUES ($1,'qualifie','Qualifié CRM','gold',$2,$3,$4,'mint',NULL,'1 800 € TTC','Converti Candidat','teal','BM','Barthelemy MAPWABA NTORO','navy',1800,FALSE,TRUE)`,
        [dem.full_name, dem.flag, dem.city, dem.program]
      );

      await db.query(
        `INSERT INTO audit_logs (actor, action, entity_ref, outcome)
         VALUES ('Barthelemy MAPWABA NTORO', $1, $2, 'Succès')`,
        [`Qualification et conversion en Candidat Lyon (${canRef})`, ref]
      );

      return NextResponse.json({ ok: true, candidatRef: canRef });
    }

    return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 });
  } catch (error: any) {
    console.error('Error updating demande:', error);
    return NextResponse.json({ error: error?.message || 'Erreur mise à jour demande' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(req.url);
    const ref = searchParams.get('ref');
    const refsParam = searchParams.get('refs');
    const mode = (searchParams.get('mode') || (searchParams.get('permanent') === 'true' ? 'permanent' : 'archive')).toLowerCase();

    const rawRefs = refsParam ? refsParam.split(',') : (ref ? [ref] : []);
    const refs = rawRefs.map((r) => r.trim()).filter(Boolean);

    if (refs.length === 0) {
      return NextResponse.json({ error: 'Missing reference(s)' }, { status: 400 });
    }

    if (mode === 'permanent' || mode === 'delete') {
      for (const targetRef of refs) {
        await db.query(`DELETE FROM demande_notes WHERE demande_ref = $1`, [targetRef]);
        await db.query(`DELETE FROM demandes WHERE ref = $1`, [targetRef]);
        await db.query(
          `INSERT INTO audit_logs (actor, action, entity_ref, outcome)
           VALUES ('Barthelemy MAPWABA NTORO', 'Permanent Deletion', $1, 'Success')`,
          [targetRef]
        );
      }
      return NextResponse.json({ ok: true, deleted: true, count: refs.length });
    } else {
      for (const targetRef of refs) {
        await db.query(
          `UPDATE demandes SET is_archived = TRUE, status = 'Archived' WHERE ref = $1`,
          [targetRef]
        );
        await db.query(
          `INSERT INTO audit_logs (actor, action, entity_ref, outcome)
           VALUES ('Barthelemy MAPWABA NTORO', 'Archive Application', $1, 'Success')`,
          [targetRef]
        );
      }
      return NextResponse.json({ ok: true, archived: true, count: refs.length });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
