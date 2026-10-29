import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getDb } from '@/lib/db';
import { authenticateServerRequest } from '@/lib/rbac';
import { PREPA_TOTAL_FEE } from '../payments/route';

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const auth = await authenticateServerRequest(req, db);
    if (!auth.success) {
      return auth.response;
    }

    const { searchParams } = new URL(req.url);
    const receiptNumber = searchParams.get('receipt_number');
    const candidateRef = searchParams.get('candidate_ref');
    const paymentId = searchParams.get('payment_id');

    let query = 'SELECT * FROM prepa_receipts';
    const params: any[] = [];

    if (receiptNumber) {
      query += ' WHERE receipt_number = $1';
      params.push(receiptNumber);
    } else if (paymentId) {
      query += ' WHERE payment_id = $1';
      params.push(paymentId);
    } else if (candidateRef) {
      query += ' WHERE candidate_ref = $1';
      params.push(candidateRef);
    }
    query += ' ORDER BY id DESC';

    const res = await db.query(query, params);
    return NextResponse.json({ receipts: res.rows });
  } catch (err: any) {
    console.error('Error in prepa receipts GET:', err);
    return NextResponse.json({ error: 'Database error', details: err?.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = await getDb();
    const auth = await authenticateServerRequest(req, db);
    if (!auth.success) {
      return auth.response;
    }
    const user = auth.user;

    // Role check: Only Admin and Finance Officer can generate official receipts
    const isAuthorizedValidator =
      user.role === 'admin' ||
      user.role === 'avi' ||
      user.business_profile === 'Admin' ||
      user.business_profile === 'Finance Officer' ||
      (user.technical_roles && (user.technical_roles.includes('admin') || user.technical_roles.includes('lh_finance')));

    if (!isAuthorizedValidator) {
      return NextResponse.json(
        { error: 'Forbidden: Generating official receipts requires Admin or Finance Officer privileges.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { payment_id, is_reissue = false } = body;

    if (!payment_id) {
      return NextResponse.json({ error: 'Missing payment_id' }, { status: 400 });
    }

    // 1. Fetch payment record
    const payRes = await db.query('SELECT * FROM prepa_payments WHERE id = $1', [payment_id]);
    if (payRes.rows.length === 0) {
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
    }
    const payment = payRes.rows[0];

    // 2. Acceptance Criterion C: Unvalidated payment check
    if (payment.status !== 'Validated') {
      return NextResponse.json(
        {
          error: 'Unvalidated payment',
          message: `Cannot generate receipt: Payment #${payment.payment_ref} is currently '${payment.status}'. Only eligible, validated payments may be receipted under LIEC-France PREPA regulations.`,
        },
        { status: 400 }
      );
    }

    // 3. Check for existing receipt for this specific payment (prevent accidental duplicate)
    const existingReceiptRes = await db.query(
      'SELECT * FROM prepa_receipts WHERE payment_id = $1 ORDER BY id DESC LIMIT 1',
      [payment.id]
    );

    if (existingReceiptRes.rows.length > 0 && !is_reissue) {
      // Return existing receipt without creating a new duplicate
      return NextResponse.json({
        success: true,
        already_issued: true,
        receipt: existingReceiptRes.rows[0],
        message: `Receipt ${existingReceiptRes.rows[0].receipt_number} has already been issued for this payment.`,
      });
    }

    // 4. Server-side recalculation of cumulative validated payments for this candidate
    const allValidatedPaymentsRes = await db.query(
      `SELECT * FROM prepa_payments
       WHERE candidate_ref = $1 AND status = 'Validated'
       ORDER BY instalment_number ASC, id ASC`,
      [payment.candidate_ref]
    );

    const validatedList = allValidatedPaymentsRes.rows;
    let cumulativePaid = 0;
    let previouslyValidatedAmount = 0;

    for (const p of validatedList) {
      if (p.id === payment.id) {
        cumulativePaid += Number(p.amount);
        break;
      } else {
        previouslyValidatedAmount += Number(p.amount);
        cumulativePaid += Number(p.amount);
      }
    }

    const amountPaid = Number(payment.amount);
    const outstandingBalance = Math.max(0, PREPA_TOTAL_FEE - cumulativePaid);

    // 5. Generate formatted timestamps in Europe/Paris time zone
    const now = new Date();
    const formatterDate = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const formatterTime = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const issue_date_paris = formatterDate.format(now);
    const issue_time_paris = formatterTime.format(now);

    // 6. Generate unique receipt number & verification code
    const countRes = await db.query('SELECT COUNT(*) as total FROM prepa_receipts');
    const totalReceipts = parseInt(countRes.rows[0].total, 10) || 0;
    const serial = String(totalReceipts + 1001).padStart(4, '0');
    const receipt_number = `REC-PREPA-2026-${serial}`;
    const verification_ref = `LIEC-PREPA-VERIFY-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

    let reissueCount = 0;
    if (is_reissue && existingReceiptRes.rows.length > 0) {
      reissueCount = (existingReceiptRes.rows[0].reissue_count || 0) + 1;
    }

    // 7. Store receipt metadata
    const metadata = {
      total_programme_fee: PREPA_TOTAL_FEE,
      instalment_number: payment.instalment_number,
      instalment_label: payment.instalment_label,
      instalment_percentage: payment.instalment_percentage,
      amount_received: amountPaid,
      previously_validated_amount: previouslyValidatedAmount,
      cumulative_amount_paid: cumulativePaid,
      outstanding_balance: outstandingBalance,
      is_fully_paid: cumulativePaid >= PREPA_TOTAL_FEE,
      payment_method: payment.payment_method,
      transaction_ref: payment.transaction_ref,
      proof_file_url: payment.proof_file_url,
      proof_filename: payment.proof_filename,
      validated_by: payment.validated_by,
      validated_at: payment.validated_at,
      expected_next_date: payment.expected_next_date,
      generated_by: user.name || 'Barthelemy MAPWABA NTORO',
      is_reissue: Boolean(is_reissue),
      reissue_count: reissueCount,
      academic_intake: payment.academic_intake || '2025–2026',
      program: 'LIEC-France PREPA',
    };

    const insertRes = await db.query(
      `INSERT INTO prepa_receipts (
        receipt_number, payment_id, payment_ref, candidate_ref,
        candidate_name, instalment_number, amount_paid, cumulative_paid,
        outstanding_balance, issue_date_paris, issue_time_paris,
        timezone, verification_ref, is_reissue, reissue_count,
        generated_by, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *`,
      [
        receipt_number,
        payment.id,
        payment.payment_ref,
        payment.candidate_ref,
        payment.candidate_name,
        payment.instalment_number,
        amountPaid,
        cumulativePaid,
        outstandingBalance,
        issue_date_paris,
        issue_time_paris,
        'Europe/Paris',
        verification_ref,
        Boolean(is_reissue),
        reissueCount,
        user.name || 'Barthelemy MAPWABA NTORO',
        JSON.stringify(metadata),
      ]
    );

    // 8. Audit trail log
    await db.query(
      `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        user.name || user.email || 'Admin',
        is_reissue ? 'REISSUE_PREPA_RECEIPT' : 'GENERATE_PREPA_RECEIPT',
        receipt_number,
        'Succès',
        `${is_reissue ? 'Reissued' : 'Generated'} official receipt ${receipt_number} for candidate ${payment.candidate_name} (${payment.candidate_ref}) — ${payment.instalment_label} of €${amountPaid.toFixed(2)}. Verification Ref: ${verification_ref}`,
      ]
    );

    return NextResponse.json({
      success: true,
      receipt: insertRes.rows[0],
      reissued: Boolean(is_reissue),
    });
  } catch (err: any) {
    console.error('Error in prepa receipts POST:', err);
    return NextResponse.json({ error: 'Failed to generate receipt', details: err?.message }, { status: 500 });
  }
}
