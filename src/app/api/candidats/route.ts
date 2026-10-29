import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { authenticateServerRequest, evaluateModuleAccess } from '@/lib/rbac';

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

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(req.url);
    const ref = searchParams.get('ref');

    let query = 'SELECT * FROM candidats';
    const params: any[] = [];
    if (ref) {
      query += ' WHERE ref = $1';
      params.push(ref);
    } else {
      query += ' ORDER BY id DESC';
    }

    const res = await db.query(query, params);
    const parsed = res.rows.map((row: any) => ({
      ...row,
      jalons: JSON.parse(row.jalons_json || '[]'),
      voeux: JSON.parse(row.voeux_json || '[]'),
      notes: JSON.parse(row.notes_json || '[]'),
      pieces: JSON.parse(row.pieces_json || '[]'),
      history: JSON.parse(row.history_json || '[]'),
    }));

    if (ref) {
      if (parsed.length === 0) {
        return NextResponse.json({ error: `Candidate ${ref} not found` }, { status: 404, headers: corsHeaders() });
      }
      return NextResponse.json({ ok: true, candidat: parsed[0] }, { headers: corsHeaders() });
    }

    return NextResponse.json({ ok: true, candidats: parsed }, { headers: corsHeaders() });
  } catch (error: any) {
    console.error('Error fetching candidates:', error);
    return NextResponse.json({ error: error?.message }, { status: 500, headers: corsHeaders() });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = await getDb();
    const auth = await authenticateServerRequest(req, db);
    const currentUser = auth.success ? auth.user : null;

    const body = await req.json();

    // 1. Candidate Info (supports both standard and external public form field names)
    const fullName = (
      body.full_name ||
      body.nom_complet ||
      body.fullName ||
      'Nouveau Candidat'
    ).trim();
    const email = (body.email || body.adresse_email || 'candidat@liec.edu').trim();
    const phone = (body.phone || body.telephone || '+243 81 000 0000').trim();

    // Validate Candidate Phone Number (max 14 digits)
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length > 14) {
      return NextResponse.json(
        { error: 'Phone / WhatsApp must be limited to a maximum of 14 digits.' },
        { status: 400, headers: corsHeaders() }
      );
    }

    const country = (
      body.country ||
      body.pays_recrutement ||
      body.pays ||
      'RDC (Kinshasa)'
    ).trim();
    const nationality = (
      body.nationality ||
      (country.includes('RDC') ? 'Congolaise (RDC)' : country.includes('Congo') ? 'Congolaise (Brazzaville)' : 'Internationale')
    ).trim();

    const villeOrigine = (body.ville_origine || body.city || 'Kinshasa').trim();
    const program = (
      body.program ||
      body.filiere_cible ||
      body.formation_choisie ||
      'MyDigitalSchool Lyon — Dév. Web & UX/UI'
    ).trim();
    const cities = (body.cities || 'Lyon (Campus Part-Dieu)').trim();
    const adviser = (body.adviser || currentUser?.name || 'Barthelemy MAPWABA NTORO').trim();

    // 2. Parent / Tutor Information
    const parentFullName = (
      body.parent_full_name ||
      body.parent_name ||
      body.nom_parent ||
      ''
    ).trim();
    const parentPhone = (body.parent_phone || body.telephone_parent || '').trim();
    const parentEmail = (body.parent_email || '').trim();
    const parentRelation = (body.parent_relation || 'Parent / Tuteur').trim();

    if (parentPhone) {
      const parentPhoneDigits = parentPhone.replace(/\D/g, '');
      if (parentPhoneDigits.length > 14) {
        return NextResponse.json(
          { error: 'Parent Phone Number must be limited to a maximum of 14 digits.' },
          { status: 400, headers: corsHeaders() }
        );
      }
    }

    // 3. Academic & Procedure Status
    const admissionStatus = (body.admission_status || 'Admitted — Partner School Lyon').trim();
    const procedureStatus = (body.procedure_status || 'In Progress (Milestone 2)').trim();
    const description = (body.description || '').trim();
    const comments = (body.comments || body.message || '').trim();

    const graduationYear = String(body.graduation_year || body.annee_diplome || '2024').trim();
    const currentActivity = (body.current_activity || body.activite_actuelle || '').trim();
    const finalYearUniversity = (body.final_year_university || body.derniere_annee_univ || '').trim();

    // Generate unique reference #CAN-2025-XXX
    const countRes = await db.query<{ count: string | number }>('SELECT COUNT(*) as count FROM candidats');
    let nextNum = 43 + Number(countRes.rows[0]?.count ?? 0);
    let ref = `#CAN-2025-${String(nextNum).padStart(3, '0')}`;
    while (true) {
      const existingCan = await db.query('SELECT 1 FROM candidats WHERE ref = $1', [ref]);
      if (!existingCan.rows || existingCan.rows.length === 0) break;
      nextNum++;
      ref = `#CAN-2025-${String(nextNum).padStart(3, '0')}`;
    }

    const parts = fullName.split(/\s+/);
    const initials =
      parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : fullName.slice(0, 2).toUpperCase();

    const schoolName = program.split('—')[0]?.trim() || 'MyDigitalSchool Lyon';
    const schoolCode = schoolName.includes('ISCOM')
      ? 'ISCO'
      : schoolName.includes('Tunon')
      ? 'TUNO'
      : schoolName.includes('IHECF')
      ? 'IHEC'
      : schoolName.includes('Ipac')
      ? 'IPAC'
      : schoolName.includes('MBway')
      ? 'MBW'
      : 'MDS';

    const jalons = [
      {
        num: 1,
        label: 'JALON 1',
        title: 'Orientation & Ciblage',
        status: 'EN COURS',
        tone: 'active',
        description: `Sélection de l'école partenaire à Lyon (${schoolName}) en cours avec ${adviser}.`,
        footer: 'École partenaire Lyon',
      },
      {
        num: 2,
        label: 'JALON 2',
        title: 'Pièces Académiques',
        status: 'À VENIR',
        tone: 'upcoming',
        description: 'Collecte et certification des relevés de notes et test de langue TCF.',
        footer: '2 / 10 documents validés',
      },
      {
        num: 3,
        label: 'JALON 3',
        title: 'Dépôt Officiel',
        status: 'ATTENTE',
        tone: 'pending',
        description: `Soumission Campus France (${country}) & portail d'admission ${schoolName}.`,
        footer: 'Échéance : 15 Décembre',
      },
      {
        num: 4,
        label: 'JALON 4',
        title: 'Visa & Installation',
        status: 'ATTENTE',
        tone: 'pending',
        description: 'Attestation bancaire YimmiLine AVI et réservation de logement à Lyon.',
        footer: 'Dès avis favorable',
      },
    ];

    const voeux = [
      {
        code: schoolCode,
        codeBg: 'navy',
        university: schoolName,
        rankBadge: 'Vœu n°1',
        rankTone: 'mint',
        program: program.includes('—') ? program.split('—')[1].trim() : program,
        location: 'Campus Lyon',
        meta: 'École Partenaire LIEC Lyon',
        statusBadge: 'Dossier Préparé',
        statusTone: 'green',
        statusSub: 'En attente commission',
      },
    ];

    const notes = comments
      ? [
          {
            author: adviser,
            date: "Aujourd'hui, à l'instant",
            text: comments,
          },
        ]
      : [];

    const pieces = [
      { name: 'Passeport biométrique', meta: 'En attente', status: 'pending' },
      { name: 'Relevés de notes L1/L2 certifiés', meta: 'À vérifier', status: 'pending' },
      { name: 'Attestation TCF B2', meta: 'Non requis', status: 'pending' },
    ];

    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const initialHistory = [
      {
        timestamp,
        author: currentUser ? `${currentUser.name} (${currentUser.business_profile})` : adviser,
        activity_type: 'RECORD_CREATED',
        details: `Student Record initiated for ${fullName} (${ref}).`,
      },
    ];

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
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12,
        $13, $14, $15, $16, $17, $18,
        $19, $20, $21,
        $22, $23, $24, $25, $26, $27,
        $28, $29, $30, $31,
        $32, $33, $34, $35, $36
      )`,
      [
        ref,
        initials,
        fullName,
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop&q=80',
        program,
        cities,
        adviser,
        procedureStatus,
        'teal',
        25,
        'Dossier à 25%',
        'J-30 CF',
        email,
        phone,
        parentFullName || null,
        parentPhone || null,
        parentEmail || null,
        parentRelation || 'Parent',
        graduationYear || null,
        currentActivity || null,
        finalYearUniversity || null,
        country,
        nationality,
        'Licence / Bac+3 (En cours)',
        'Inscription TCF en cours',
        'Dossier AVI YIMMILINE à initier',
        '15 Novembre 2025',
        admissionStatus,
        procedureStatus,
        description,
        comments,
        JSON.stringify(jalons),
        JSON.stringify(voeux),
        JSON.stringify(notes),
        JSON.stringify(pieces),
        JSON.stringify(initialHistory),
      ]
    );

    if (parentFullName && fullName) {
      await db.query(
        `INSERT INTO parent_student_links (parent_name, parent_phone, student_name, student_email, student_program, source)
         VALUES ($1, $2, $3, $4, $5, 'candidate')
         ON CONFLICT (parent_name, student_name) DO UPDATE SET
           parent_phone = COALESCE(EXCLUDED.parent_phone, parent_student_links.parent_phone),
           student_program = COALESCE(EXCLUDED.student_program, parent_student_links.student_program)`,
        [parentFullName, parentPhone, fullName, email, program]
      );
    }

    await db.query(
      `INSERT INTO audit_logs (actor, action, entity_ref, outcome)
       VALUES ($1, $2, $3, 'Succès')`,
      [adviser, `Création nouveau candidat Lyon (${fullName})`, ref]
    );

    return NextResponse.json(
      { ok: true, success: true, ref, candidatRef: ref, message: 'Student Record successfully created.' },
      { headers: corsHeaders() }
    );
  } catch (error: any) {
    console.error('Error in candidate POST:', error);
    return NextResponse.json({ error: error?.message }, { status: 500, headers: corsHeaders() });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const db = await getDb();
    const auth = await authenticateServerRequest(req, db);
    if (!auth.success) return auth.response;

    const { user } = auth;
    const access = evaluateModuleAccess(user, 'candidats');
    if (!access.allowed) {
      return NextResponse.json({ error: access.reason || 'Forbidden' }, { status: 403, headers: corsHeaders() });
    }

    const body = await req.json();
    const ref = (body.ref || '').trim();
    if (!ref) {
      return NextResponse.json({ error: 'Candidate reference (ref) is required.' }, { status: 400, headers: corsHeaders() });
    }

    const cleanRef = ref.startsWith('#') ? ref : `#${ref}`;
    const existingRes = await db.query(
      'SELECT * FROM candidats WHERE ref = $1 OR ref = $2 OR LOWER(ref) = LOWER($1)',
      [ref, cleanRef]
    );
    if (!existingRes.rows || existingRes.rows.length === 0) {
      return NextResponse.json({ error: `Candidate ${ref} not found.` }, { status: 404, headers: corsHeaders() });
    }
    const cand = existingRes.rows[0];

    // Validate phone numbers if provided (max 14 digits)
    const phone = body.phone !== undefined ? body.phone.trim() : cand.phone;
    if (phone) {
      const pDigits = phone.replace(/\D/g, '');
      if (pDigits.length > 14) {
        return NextResponse.json(
          { error: 'Student phone number must be limited to a maximum of 14 digits.' },
          { status: 400, headers: corsHeaders() }
        );
      }
    }

    const parentPhone = body.parent_phone !== undefined ? body.parent_phone.trim() : cand.parent_phone;
    if (parentPhone) {
      const ppDigits = parentPhone.replace(/\D/g, '');
      if (ppDigits.length > 14) {
        return NextResponse.json(
          { error: 'Parent phone number must be limited to a maximum of 14 digits.' },
          { status: 400, headers: corsHeaders() }
        );
      }
    }

    const fullName = body.full_name !== undefined ? body.full_name.trim() : cand.full_name;
    const email = body.email !== undefined ? body.email.trim() : cand.email;
    const country = body.country !== undefined ? body.country.trim() : cand.country;
    const nationality = body.nationality !== undefined ? body.nationality.trim() : cand.nationality;
    const parentFullName = body.parent_full_name !== undefined ? body.parent_full_name.trim() : cand.parent_full_name;
    const parentEmail = body.parent_email !== undefined ? body.parent_email.trim() : cand.parent_email;
    const parentRelation = body.parent_relation !== undefined ? body.parent_relation.trim() : cand.parent_relation;
    const admissionStatus = body.admission_status !== undefined ? body.admission_status.trim() : cand.admission_status;
    const procedureStatus = body.procedure_status !== undefined ? body.procedure_status.trim() : cand.procedure_status;
    const description = body.description !== undefined ? body.description : cand.description;
    const newComment = (body.new_comment || body.comments || '').trim();

    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const history = JSON.parse(cand.history_json || '[]');
    const changeDetails: string[] = [];

    if (body.full_name && body.full_name !== cand.full_name) changeDetails.push('Updated name');
    if (body.admission_status && body.admission_status !== cand.admission_status) {
      changeDetails.push(`Admission status: '${body.admission_status}'`);
    }
    if (body.procedure_status && body.procedure_status !== cand.procedure_status) {
      changeDetails.push(`Procedure status: '${body.procedure_status}'`);
    }
    if (newComment) {
      changeDetails.push(`New communication/comment added`);
    }

    if (changeDetails.length === 0) {
      changeDetails.push('Record information updated');
    }

    history.unshift({
      timestamp,
      author: `${user.name} (${user.business_profile})`,
      activity_type: 'RECORD_UPDATED',
      details: changeDetails.join('; '),
    });

    let notes = JSON.parse(cand.notes_json || '[]');
    if (newComment) {
      notes.unshift({
        author: `${user.name} (${user.business_profile})`,
        date: "Today, just now",
        text: newComment,
      });
    }

    await db.query(
      `UPDATE candidats SET
        full_name = $1,
        email = $2,
        phone = $3,
        country = $4,
        nationality = $5,
        parent_full_name = $6,
        parent_phone = $7,
        parent_email = $8,
        parent_relation = $9,
        admission_status = $10,
        procedure_status = $11,
        stage_badge = $11,
        description = $12,
        notes_json = $13,
        history_json = $14
       WHERE ref = $15`,
      [
        fullName,
        email,
        phone,
        country,
        nationality,
        parentFullName,
        parentPhone,
        parentEmail,
        parentRelation,
        admissionStatus,
        procedureStatus,
        description,
        JSON.stringify(notes),
        JSON.stringify(history),
        ref,
      ]
    );

    if (parentFullName && fullName) {
      await db.query(
        `INSERT INTO parent_student_links (parent_name, parent_phone, student_name, student_email, student_program, source)
         VALUES ($1, $2, $3, $4, $5, 'update')
         ON CONFLICT (parent_name, student_name) DO UPDATE SET
           parent_phone = COALESCE(EXCLUDED.parent_phone, parent_student_links.parent_phone)`,
        [parentFullName, parentPhone, fullName, email, cand.program]
      );
    }

    await db.query(
      `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
       VALUES ($1, 'Update Student Record', $2, 'Success', $3)`,
      [
        `${user.name} (${user.business_profile})`,
        ref,
        changeDetails.join('; '),
      ]
    );

    const updatedRes = await db.query('SELECT * FROM candidats WHERE ref = $1', [ref]);
    const updated = updatedRes.rows[0];

    return NextResponse.json({
      success: true,
      ok: true,
      candidat: {
        ...updated,
        jalons: JSON.parse(updated.jalons_json || '[]'),
        voeux: JSON.parse(updated.voeux_json || '[]'),
        notes: JSON.parse(updated.notes_json || '[]'),
        pieces: JSON.parse(updated.pieces_json || '[]'),
        history: JSON.parse(updated.history_json || '[]'),
      },
    }, { headers: corsHeaders() });
  } catch (error: any) {
    console.error('Error updating candidate record:', error);
    return NextResponse.json({ error: error?.message }, { status: 500, headers: corsHeaders() });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const db = await getDb();
    const auth = await authenticateServerRequest(req, db);
    if (!auth.success) return auth.response;

    const { user } = auth;
    const profile = user.business_profile;
    const userRole = (user as any).role;
    const roles = user.technical_roles || [];
    const isAdmin =
      profile === 'Admin' ||
      userRole === 'admin' ||
      roles.includes('admin') ||
      roles.includes('lh_security_admin');

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Only Administrators are authorized to delete student records.' },
        { status: 403, headers: corsHeaders() }
      );
    }

    const { searchParams } = new URL(req.url);
    const ref = searchParams.get('ref');
    const forceCascade = searchParams.get('force') === 'true';

    if (!ref) {
      return NextResponse.json({ error: 'Candidate reference (ref) is required.' }, { status: 400, headers: corsHeaders() });
    }

    const cleanRef = ref.startsWith('#') ? ref : `#${ref}`;
    const candRes = await db.query(
      'SELECT * FROM candidats WHERE ref = $1 OR ref = $2 OR LOWER(ref) = LOWER($1)',
      [ref, cleanRef]
    );
    if (!candRes.rows || candRes.rows.length === 0) {
      return NextResponse.json({ error: `Candidate ${ref} not found.` }, { status: 404, headers: corsHeaders() });
    }
    const cand = candRes.rows[0];

    // Safeguard check for linked secondary requests
    const [aviCheck, accCheck] = await Promise.all([
      db.query(
        'SELECT ref, status FROM avi_requests WHERE student_ref = $1 OR student_name ILIKE $2',
        [cand.ref, `%${cand.full_name}%`]
      ),
      db.query(
        'SELECT ref, status FROM accommodation_requests WHERE student_ref = $1',
        [cand.ref]
      ),
    ]);

    const linkedAviCount = aviCheck.rows?.length ?? 0;
    const linkedAccCount = accCheck.rows?.length ?? 0;

    if ((linkedAviCount > 0 || linkedAccCount > 0) && !forceCascade) {
      const linkedRefs = [
        ...aviCheck.rows.map((r: any) => `AVI: ${r.ref} (${r.status})`),
        ...accCheck.rows.map((r: any) => `Accommodation: ${r.ref} (${r.status})`),
      ];

      return NextResponse.json(
        {
          error: `Safeguard Protected: Cannot delete Student Record ${ref} because it has active linked secondary requests.`,
          hasLinkedRecords: true,
          linkedCount: linkedAviCount + linkedAccCount,
          linkedRecords: linkedRefs,
          message: `This student has ${linkedAviCount} AVI request(s) and ${linkedAccCount} Accommodation request(s). Please archive or remove linked requests first, or provide explicit cascade confirmation.`,
        },
        { status: 409, headers: corsHeaders() }
      );
    }

    if (forceCascade) {
      await Promise.all([
        db.query('DELETE FROM accommodation_requests WHERE student_ref = $1', [ref]),
        db.query('DELETE FROM avi_requests WHERE student_ref = $1', [ref]),
      ]);
    }

    await db.query('DELETE FROM candidats WHERE ref = $1', [ref]);

    await db.query(
      `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
       VALUES ($1, 'Delete Student Record', $2, 'Success', $3)`,
      [
        `${user.name} (${user.business_profile})`,
        ref,
        `Student Record ${ref} (${cand.full_name}) deleted by Admin.${forceCascade ? ' (Cascade forced)' : ''}`,
      ]
    );

    return NextResponse.json({
      success: true,
      ok: true,
      message: `Student Record ${ref} successfully removed.`,
    }, { headers: corsHeaders() });
  } catch (error: any) {
    console.error('Error deleting student record:', error);
    return NextResponse.json({ error: error?.message }, { status: 500, headers: corsHeaders() });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const db = await getDb();
    const body = await req.json();
    const { ref, action } = body;

    const cleanRef = ref && ref.startsWith('#') ? ref : `#${ref}`;
    const res = await db.query(
      'SELECT * FROM candidats WHERE ref = $1 OR ref = $2 OR LOWER(ref) = LOWER($1)',
      [ref, cleanRef]
    );
    const cand = res.rows[0];
    if (!cand) {
      return NextResponse.json({ error: 'Candidat introuvable' }, { status: 404, headers: corsHeaders() });
    }

    if (action === 'add_note') {
      const notes = JSON.parse(cand.notes_json || '[]');
      const newNote = {
        author: body.author || 'Barthelemy MAPWABA NTORO',
        date: "Aujourd'hui, à l'instant",
        text: (body.text || '').trim(),
      };
      notes.unshift(newNote);

      const history = JSON.parse(cand.history_json || '[]');
      history.unshift({
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        author: newNote.author,
        activity_type: 'NOTE_ADDED',
        details: `Note added: "${newNote.text.slice(0, 60)}${newNote.text.length > 60 ? '...' : ''}"`,
      });

      await db.query('UPDATE candidats SET notes_json = $1, history_json = $2 WHERE ref = $3', [
        JSON.stringify(notes),
        JSON.stringify(history),
        ref,
      ]);
      await db.query(
        `INSERT INTO audit_logs (actor, action, entity_ref, outcome)
         VALUES ($1, 'Ajout note pédagogique dossier candidat', $2, 'Succès')`,
        [newNote.author, ref]
      );
      return NextResponse.json({ ok: true, notes, history }, { headers: corsHeaders() });
    }

    if (action === 'add_voeu') {
      const voeux = JSON.parse(cand.voeux_json || '[]');
      const newVoeu = {
        code: (body.code || 'MDS').slice(0, 4).toUpperCase(),
        codeBg: voeux.length % 2 === 0 ? 'navy' : 'teal',
        university: body.university || 'MyDigitalSchool Lyon',
        rankBadge: `Vœu n°${voeux.length + 1}`,
        rankTone: voeux.length === 0 ? 'mint' : 'neutral',
        program: body.program || cand.program,
        location: body.location || 'Campus Lyon',
        meta: body.meta || 'École Partenaire LIEC Lyon',
        statusBadge: 'Cible Ajoutée',
        statusTone: 'green',
        statusSub: 'Validé par comité LIEC Lyon',
      };
      voeux.push(newVoeu);

      const history = JSON.parse(cand.history_json || '[]');
      history.unshift({
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        author: body.author || 'Barthelemy MAPWABA NTORO',
        activity_type: 'SCHOOL_APPLICATION_ADDED',
        details: `Partner school application added: ${newVoeu.university} (${newVoeu.program}).`,
      });

      await db.query('UPDATE candidats SET voeux_json = $1, history_json = $2 WHERE ref = $3', [
        JSON.stringify(voeux),
        JSON.stringify(history),
        ref,
      ]);
      return NextResponse.json({ ok: true, voeux, history }, { headers: corsHeaders() });
    }

    if (action === 'advance_jalon') {
      const jalonNum = Number(body.jalonNum);
      const jalons = JSON.parse(cand.jalons_json || '[]').map((j: any) => {
        if (j.num < jalonNum) {
          return { ...j, status: 'VALIDÉ', tone: 'done' };
        }
        if (j.num === jalonNum) {
          return { ...j, status: 'EN COURS', tone: 'active' };
        }
        return { ...j, status: 'À VENIR', tone: 'upcoming' };
      });
      const pctMap: Record<number, number> = { 1: 30, 2: 62, 3: 85, 4: 96 };
      const nextPct = pctMap[jalonNum] || cand.progress_pct;

      const history = JSON.parse(cand.history_json || '[]');
      history.unshift({
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        author: body.author || 'Barthelemy MAPWABA NTORO',
        activity_type: 'MILESTONE_ADVANCED',
        details: `Milestone advanced to Jalon ${jalonNum} (Progress: ${nextPct}%).`,
      });

      await db.query(
        'UPDATE candidats SET jalons_json = $1, progress_pct = $2, stage_badge = $3, history_json = $4 WHERE ref = $5',
        [JSON.stringify(jalons), nextPct, `En cours (Jalon ${jalonNum})`, JSON.stringify(history), ref]
      );
      return NextResponse.json({ ok: true, jalons, progress_pct: nextPct, history }, { headers: corsHeaders() });
    }

    if (action === 'toggle_piece') {
      const index = Number(body.index);
      const pieces = JSON.parse(cand.pieces_json || '[]');
      if (pieces[index]) {
        pieces[index].status = pieces[index].status === 'valid' ? 'pending' : 'valid';
        pieces[index].meta = pieces[index].status === 'valid' ? 'Certifié' : 'En révision';
      }
      await db.query('UPDATE candidats SET pieces_json = $1 WHERE ref = $2', [
        JSON.stringify(pieces),
        ref,
      ]);
      return NextResponse.json({ ok: true, pieces }, { headers: corsHeaders() });
    }

    return NextResponse.json({ error: 'Action non supportée' }, { status: 400, headers: corsHeaders() });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500, headers: corsHeaders() });
  }
}
