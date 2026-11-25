import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { enforceRbac } from '@/lib/rbac';
import {
  TRUSTAVI_OFFERS,
  buildTrustAviFinancialSnapshot,
  validateTrustAviChecklist,
  TrustAviChecklistItem,
} from '@/lib/aviCommercialCatalog';

export async function GET(req: NextRequest) {
  const auth = await enforceRbac(req, 'avi', 'Query AVI Records');
  if (!auth.allowed) return auth.response;

  const { db, user } = auth;
  const isIntakeOnly = user.business_profile === 'Secretary';
  try {
    const res = await db.query('SELECT * FROM avi_requests ORDER BY id DESC');
    const partnersRes = await db.query('SELECT * FROM avi_partners WHERE active = true ORDER BY name').catch(() => ({ rows: [] }));
    const offersRes = await db.query('SELECT * FROM avi_commercial_offers WHERE active = true ORDER BY id').catch(() => ({ rows: [] }));

    return NextResponse.json({
      aviRequests: res.rows.map((r: any) => {
        const checklist = typeof r.trustavi_checklist_json === 'string'
          ? JSON.parse(r.trustavi_checklist_json)
          : r.trustavi_checklist_json;
        if (isIntakeOnly) {
          // Redact protected financial snapshots, commissions & settlement figures for Secretary intake scope
          const {
            financial_snapshot_json: _fs,
            liec_retained_eur: _lr,
            total_interest_eur: _ti,
            amount_eur: _ae,
            amount_usd: _au,
            amount_xaf: _ax,
            ...safeAdminFields
          } = r;
          return {
            ...safeAdminFields,
            financial_snapshot: null,
            trustavi_checklist: checklist,
          };
        }
        return {
          ...r,
          financial_snapshot: typeof r.financial_snapshot_json === 'string'
            ? JSON.parse(r.financial_snapshot_json)
            : r.financial_snapshot_json,
          trustavi_checklist: checklist,
        };
      }),
      partners: partnersRes.rows.length > 0 ? partnersRes.rows : [
        { id: 'yimmiline', name: 'YIMMILINE' },
        { id: 'trustavi', name: 'TrustAVI SAS' },
      ],
      commercialOffers: isIntakeOnly
        ? Object.values(TRUSTAVI_OFFERS).map((o: any) => ({
            key: o.key,
            name_en: o.name_en,
            name_fr: o.name_fr,
            guarantor_policy: o.guarantor_policy,
          }))
        : (offersRes.rows.length > 0 ? offersRes.rows : Object.values(TRUSTAVI_OFFERS)),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await enforceRbac(req, 'avi', 'Register Parent AVI Dossier');
  if (!auth.allowed) return auth.response;

  const { db, user } = auth;

  try {
    const body = await req.json();
    const partnerId = (body.partner_id || 'yimmiline').toLowerCase();

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

    // Allocate Monotonic Reference
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

    if (partnerId === 'trustavi') {
      const offerKey = body.offer_key as keyof typeof TRUSTAVI_OFFERS;
      if (!offerKey || !TRUSTAVI_OFFERS[offerKey]) {
        return NextResponse.json(
          { error: `Invalid TrustAVI offer '${body.offer_key}'. Must be normal_avi, prefinancing_with_contribution, or prefinancing_without_contribution.` },
          { status: 400 }
        );
      }

      // Validate 8 Mandatory Checklist Items
      const checklistItems: TrustAviChecklistItem[] = Array.isArray(body.trustavi_checklist)
        ? body.trustavi_checklist
        : [];
      
      const checklistValidation = validateTrustAviChecklist(checklistItems);
      if (!checklistValidation.valid) {
        return NextResponse.json(
          {
            error: 'MISSING_MANDATORY_DOCUMENTS',
            message: 'All 8 TrustAVI checklist documents and contact items must be provided before submission.',
            missing_items: checklistValidation.missingItems,
          },
          { status: 400 }
        );
      }

      const offerMeta = TRUSTAVI_OFFERS[offerKey];
      const snapshot = buildTrustAviFinancialSnapshot({
        offerKey,
        depositReference: body.deposit_reference || `DEP-${ref}`,
        depositPaymentDate: body.deposit_payment_date || new Date().toISOString().slice(0, 10),
        depositEvidenceKey: body.deposit_payment_evidence_key,
        responsibleStaff: `${user.name} (${user.business_profile})`,
      });

      await db.query(
        `INSERT INTO avi_requests (
          ref, parent_name, country, town, nationality, physical_address, occupation, phone, email,
          other_guarantor, guarantor_details, expected_start, student_name, student_program, student_id_doc,
          offer_key, offer_name, interest_rate, duration_months, principal_eur, principal_usd, principal_xaf,
          usd_eur_rate, usd_xaf_rate, total_interest_eur, liec_fee_usd, files_count, supporting_docs, status,
          partner_id, offer_version, financial_snapshot_json, trustavi_checklist_json,
          deposit_reference, deposit_payment_date, responsible_staff
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29,
          $30, $31, $32, $33, $34, $35, $36
        )`,
        [
          ref,
          parentName,
          body.country || 'RDC',
          body.town || 'Kinshasa',
          body.nationality || 'Congolaise',
          body.physical_address || 'Kinshasa',
          body.occupation || 'Cadre',
          parentPhone,
          body.email || 'parent@example.com',
          true, // DRC Guarantors accepted for TrustAVI
          body.guarantor_details || 'Caution bancaire / Garant RDC vérifié',
          body.expected_start || '2025-09',
          studentName,
          studentProgram,
          passportId,
          offerKey,
          offerMeta.offer_name,
          0, // TrustAVI commercial fees are modeled through the snapshot breakdown
          12,
          offerMeta.parent_deposit_eur,
          offerMeta.parent_deposit_eur * 1.087,
          offerMeta.parent_deposit_eur * 655.957,
          0.92,
          603.48,
          0,
          offerMeta.liec_commission_eur,
          8, // 8 mandatory items
          'TrustAVI 8-Document Dossier (Accord préalable, Passeport, CNI, Contact étudiant, ID garant, Contact garant)',
          'Partner Review',
          'trustavi',
          'v1',
          JSON.stringify(snapshot),
          JSON.stringify(checklistItems),
          snapshot.deposit_reference,
          snapshot.deposit_payment_date,
          snapshot.responsible_staff,
        ]
      );

      // Save/update parent-student link
      if (parentName && studentName) {
        await db.query(
          `INSERT INTO parent_student_links (parent_name, parent_phone, student_name, student_email, student_program, source)
           VALUES ($1, $2, $3, $4, $5, 'trustavi')
           ON CONFLICT (parent_name, student_name) DO UPDATE SET
             parent_phone = COALESCE(EXCLUDED.parent_phone, parent_student_links.parent_phone),
             student_program = COALESCE(EXCLUDED.student_program, parent_student_links.student_program)`,
          [parentName, parentPhone, studentName, body.email || '', studentProgram]
        );
      }

      await db.query(
        `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
         VALUES ($1, 'CREATE_TRUSTAVI_DOSSIER', $2, 'SUCCESS', $3)`,
        [
          `${user.name} (${user.business_profile})`,
          ref,
          `TrustAVI dossier created for ${studentName} with offer ${offerMeta.offer_name} (Deposit: €${offerMeta.parent_deposit_eur}, LIEC commission: €${offerMeta.liec_commission_eur}, Net TrustAVI: €${offerMeta.net_payable_to_trustavi_eur})`,
        ]
      );

      return NextResponse.json({
        success: true,
        ref,
        partner: 'TrustAVI SAS',
        offer: offerMeta.offer_name,
        snapshot,
        message: `Dossier TrustAVI ${ref} enregistré avec succès.`,
      });
    }

    // YIMMILINE Flow (Preserved, cap removed)
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

    const yimmilineSnapshot = {
      partner_id: 'yimmiline',
      partner_name: 'YIMMILINE',
      offer_key: offerKey,
      offer_name: offerMeta.name,
      offer_version: 'v1',
      principal_eur: principalEur,
      interest_rate: offerMeta.rate,
      duration_months: offerMeta.months,
      total_interest_eur: totalInterestEur,
      liec_commission_eur: liecRetainedEur,
      net_partner_interest_eur: Math.max(0, totalInterestEur - liecRetainedEur),
      snapshot_timestamp: new Date().toISOString(),
    };

    await db.query(
      `INSERT INTO avi_requests (
        ref, parent_name, country, town, nationality, physical_address, occupation, phone, email,
        other_guarantor, guarantor_details, expected_start, student_name, student_program, student_id_doc,
        offer_key, offer_name, interest_rate, duration_months, principal_eur, principal_usd, principal_xaf,
        usd_eur_rate, usd_xaf_rate, total_interest_eur, liec_fee_usd, files_count, supporting_docs, status,
        partner_id, offer_version, financial_snapshot_json, responsible_staff
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29,
        $30, $31, $32, $33
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
        'yimmiline',
        'v1',
        JSON.stringify(yimmilineSnapshot),
        `${user.name} (${user.business_profile})`,
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
        `AVI dossier created for student ${studentName} with offer ${offerMeta.name}`,
      ]
    );

    // Notify Finance/AVI Officer workspace (deduplicated by ref, zero restricted financial data)
    await db.query(
      `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
       SELECT $1, 'AVI_OFFICER_NOTIFICATION', $2, 'PENDING_REVIEW', $3
       WHERE NOT EXISTS (
         SELECT 1 FROM audit_logs WHERE action = 'AVI_OFFICER_NOTIFICATION' AND entity_ref = $2
       )`,
      [
        `${user.name} (${user.business_profile})`,
        ref,
        `New AVI intake dossier ${ref} created for student ${studentName} (Partner: YIMMILINE) by ${user.name} (${user.business_profile}). Awaiting Finance/AVI Officer review.`,
      ]
    ).catch(() => {});

    return NextResponse.json({
      success: true,
      ref,
      partner: 'YIMMILINE',
      snapshot: yimmilineSnapshot,
      message: `Demande AVI ${ref} enregistrée avec succès.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await enforceRbac(req, 'avi', 'Verify TrustAVI Document Item');
  if (!auth.allowed) return auth.response;

  const { db, user } = auth;

  try {
    const body = await req.json();
    const { ref, item_id, status, notes } = body;

    if (!ref || !item_id || !status) {
      return NextResponse.json({ error: 'ref, item_id, and status are required' }, { status: 400 });
    }

    // Separate administrative document completeness (allowed for Secretary) from financial approval (Admin/Finance Officer only)
    const normalizedStatus = String(status).trim().toUpperCase();
    const FINANCIAL_APPROVAL_STATUSES = ['APPROVED', 'FINANCE_APPROVED', 'SETTLED', 'DISBURSED'];
    if (user.business_profile === 'Secretary' && FINANCIAL_APPROVAL_STATUSES.includes(normalizedStatus)) {
      return NextResponse.json(
        { error: 'Forbidden: Financial approval statuses require Admin or Finance Officer privileges.' },
        { status: 403 }
      );
    }

    const res = await db.query('SELECT * FROM avi_requests WHERE ref = $1', [ref]);
    if (!res.rows || res.rows.length === 0) {
      return NextResponse.json({ error: 'AVI record not found' }, { status: 404 });
    }

    const row = res.rows[0];
    let checklist: TrustAviChecklistItem[] = typeof row.trustavi_checklist_json === 'string'
      ? JSON.parse(row.trustavi_checklist_json || '[]')
      : (row.trustavi_checklist_json || []);

    const targetItem = checklist.find((i) => i.id === item_id);
    if (!targetItem) {
      return NextResponse.json({ error: `Checklist item ${item_id} not found on dossier` }, { status: 404 });
    }

    targetItem.status = status;
    targetItem.verified_by = `${user.name} (${user.business_profile})`;
    targetItem.verified_at = new Date().toISOString();
    if (notes) targetItem.notes = notes;

    await db.query(
      `UPDATE avi_requests SET trustavi_checklist_json = $1 WHERE ref = $2`,
      [JSON.stringify(checklist), ref]
    );

    await db.query(
      `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
       VALUES ($1, 'VERIFY_TRUSTAVI_CHECKLIST_ITEM', $2, 'SUCCESS', $3)`,
      [
        `${user.name} (${user.business_profile})`,
        ref,
        `Item '${item_id}' updated to status '${status}'`,
      ]
    );

    return NextResponse.json({ ok: true, checklist });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
