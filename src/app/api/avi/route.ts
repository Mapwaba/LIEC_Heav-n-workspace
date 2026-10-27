import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { enforceRbac } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  const auth = await enforceRbac(req, 'avi', 'Query AVI Records');
  if (!auth.allowed) return auth.response;

  const { db } = auth;
  try {
    const res = await db.query('SELECT * FROM avi_requests ORDER BY id DESC');
    return NextResponse.json({ aviRequests: res.rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // Enforce server-side RBAC authorization for Blocked Finance (AVI) & YIMMILINE
  const auth = await enforceRbac(req, 'avi', 'Register Parent AVI / YIMMILINE Dossier');
  if (!auth.allowed) return auth.response;

  const { db, user } = auth;

  try {
    const body = await req.json();

    const passportId = String(body.student_id_doc || body.passport_number || '').trim().toUpperCase();
    if (!/^(OP|PO)(\d{7}|\d{9})$/.test(passportId)) {
      return NextResponse.json(
        {
          error:
            'Invalid Passport ID format: must start with OP or PO followed by 9 digits (or 9 characters total starting with OP/PO).',
        },
        { status: 400 }
      );
    }

    const countRes = await db.query<{ count: string | number }>(
      'SELECT COUNT(*) as count FROM avi_requests'
    );
    let nextNum = 1 + Number(countRes.rows[0]?.count ?? 0);
    let ref = `AVI-2025-${String(nextNum).padStart(3, '0')}`;
    while (true) {
      const existing = await db.query('SELECT 1 FROM avi_requests WHERE ref = $1', [ref]);
      if (!existing.rows || existing.rows.length === 0) break;
      nextNum++;
      ref = `AVI-2025-${String(nextNum).padStart(3, '0')}`;
    }

    const offerMap: Record<string, { name: string; rate: number; months: number }> = {
      classique: { name: 'Classique', rate: 12.0, months: 8 },
      partiel1: { name: 'Partiel 1', rate: 6.0, months: 3 },
      partiel2: { name: 'Partiel 2', rate: 12.0, months: 12 },
    };

    const offerKey = body.offer_key || 'classique';
    const offerMeta = offerMap[offerKey] || offerMap.classique;

    const principalEur = Number(body.principal_eur || body.monthly_allowance_eur) || 2800;
    const usdEurRate = Number(body.usd_eur_rate) || 0.92;
    const usdXafRate = Number(body.usd_xaf_rate) || 603.48;
    const principalUsd =
      Number(body.principal_usd || body.monthly_allowance_usd) || (usdEurRate > 0 ? principalEur / usdEurRate : 3043.48);
    const principalXaf = Number(body.principal_xaf || body.monthly_allowance_cdf) || principalEur * 655.957;
    const totalInterestEur =
      Number(body.total_interest_eur) || principalEur * (offerMeta.rate / 100);
    const liecRetainedEur = 150.0;

    const parentName = (body.parent_name || 'Parent Responsable').trim();
    const studentName = (body.student_name || 'Étudiant LIEC').trim();
    const parentPhone = (body.phone || '+243 81 000 0000').trim();

    // Validate Parent Phone / WhatsApp (max 14 digits)
    const parentPhoneDigits = parentPhone.replace(/\D/g, '');
    if (parentPhoneDigits.length > 14) {
      return NextResponse.json(
        { error: 'Parent Phone / WhatsApp must be limited to a maximum of 14 digits.' },
        { status: 400 }
      );
    }
    const studentProgram = (body.student_program || 'Programme Lyon').trim();

    await db.query(
      `INSERT INTO avi_requests (
        ref, parent_name, country, town, nationality, physical_address, occupation, phone, email,
        other_guarantor, guarantor_details, expected_start, student_name, student_program, student_id_doc,
        offer_key, offer_name, interest_rate, duration_months, principal_eur, principal_usd, principal_xaf,
        usd_eur_rate, usd_xaf_rate, total_interest_eur, liec_fee_usd, files_count, supporting_docs, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29
      )`,
      [
        ref,
        parentName,
        body.country || body.country_name || 'RDC',
        body.town || body.city || 'Kinshasa',
        body.nationality || 'Congolaise',
        body.physical_address || body.residential_address || 'Kinshasa',
        body.occupation || body.profession || 'Cadre',
        parentPhone,
        body.email || 'parent@example.com',
        body.other_guarantor ?? body.has_france_guarantor ?? true,
        body.guarantor_details || 'Caution bancaire France vérifiée',
        body.expected_start || body.session_date || '2025-09',
        studentName,
        studentProgram,
        passportId,
        offerKey,
        offerMeta.name,
        offerMeta.rate,
        offerMeta.months,
        principalEur,
        principalUsd,
        principalXaf,
        usdEurRate,
        usdXafRate,
        totalInterestEur,
        liecRetainedEur,
        Number(body.files_count) || 3,
        body.supporting_docs || body.documents_submitted || 'Passeport, Attestation hébergement, Fiches de paie',
        'Partner Review',
      ]
    );

    // Save/update parent-student link
    if (parentName && studentName) {
      await db.query(
        `INSERT INTO parent_student_links (parent_name, parent_phone, student_name, student_email, student_program, source)
         VALUES ($1, $2, $3, $4, $5, 'avi')
         ON CONFLICT (parent_name, student_name) DO UPDATE SET
           parent_phone = COALESCE(EXCLUDED.parent_phone, parent_student_links.parent_phone),
           student_program = COALESCE(EXCLUDED.student_program, parent_student_links.student_program)`,
        [parentName, parentPhone, studentName, body.email || '', studentProgram]
      );
    }

    await db.query(
      `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
       VALUES ($1, 'CREATE_AVI_DOSSIER', $2, 'SUCCESS', $3)`,
      [
        `${user.name} (${user.business_profile})`,
        ref,
        `AVI dossier created for student ${body.student_name} with offer ${offerMeta.name} (LIEC share: €150.00)`,
      ]
    );

    return NextResponse.json({
      success: true,
      ref,
      message: `Demande AVI ${ref} enregistrée avec succès.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
