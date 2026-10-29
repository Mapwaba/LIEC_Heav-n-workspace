import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { authenticateServerRequest } from '@/lib/rbac';

// Exact configured fee and payment schedule for LIEC-France PREPA
export const PREPA_TOTAL_FEE = 2800.00;
export const PREPA_INSTALMENT_1_AMOUNT = 1800.12;
export const PREPA_INSTALMENT_1_PCT = 64.29;
export const PREPA_INSTALMENT_2_AMOUNT = 999.88;
export const PREPA_INSTALMENT_2_PCT = 35.71;

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const auth = await authenticateServerRequest(req, db);
    if (!auth.success) {
      return auth.response;
    }

    const { searchParams } = new URL(req.url);
    const candidateRef = searchParams.get('candidate_ref');

    let query = 'SELECT * FROM prepa_payments';
    const params: any[] = [];

    if (candidateRef) {
      query += ' WHERE candidate_ref = $1';
      params.push(candidateRef);
    }
    query += ' ORDER BY id DESC';

    const res = await db.query(query, params);
    return NextResponse.json({ payments: res.rows });
  } catch (err: any) {
    console.error('Error in prepa payments GET:', err);
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

    const body = await req.json();
    const {
      candidate_ref,
      candidate_name,
      candidate_email,
      academic_intake = '2025–2026',
      instalment_number,
      payment_method = 'Bank Wire (Virement)',
      transaction_ref,
      proof_file_url,
      proof_filename,
      auto_validate = false,
      notes,
    } = body;

    if (!candidate_ref || !candidate_name || !instalment_number) {
      return NextResponse.json(
        { error: 'Missing required fields (candidate_ref, candidate_name, instalment_number)' },
        { status: 400 }
      );
    }

    const instNum = Number(instalment_number);
    let amount: number;
    let instalment_percentage: number;
    let instalment_label: string;

    if (instNum === 1) {
      amount = PREPA_INSTALMENT_1_AMOUNT; // €1,800.12
      instalment_percentage = PREPA_INSTALMENT_1_PCT; // 64.29%
      instalment_label = 'Instalment 1 of 2 (64.29%)';
    } else if (instNum === 2) {
      amount = PREPA_INSTALMENT_2_AMOUNT; // €999.88
      instalment_percentage = PREPA_INSTALMENT_2_PCT; // 35.71%
      instalment_label = 'Instalment 2 of 2 (35.71%)';
    } else {
      return NextResponse.json(
        { error: 'Invalid instalment number. Must be 1 or 2.' },
        { status: 400 }
      );
    }

    // Generate unique payment reference
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const payment_ref = `PAY-PREPA-${Date.now().toString().slice(-4)}-${randomSuffix}`;

    const isAuthorizedValidator =
      user.role === 'admin' ||
      user.role === 'avi' ||
      user.business_profile === 'Admin' ||
      user.business_profile === 'Finance Officer' ||
      (user.technical_roles && (user.technical_roles.includes('admin') || user.technical_roles.includes('lh_finance')));

    let status = 'Pending';
    let validated_by: string | null = null;
    let validated_at: string | null = null;
    let expected_next_date: string | null = null;

    if (auto_validate && isAuthorizedValidator) {
      status = 'Validated';
      validated_by = user.name || 'Barthelemy MAPWABA NTORO';
      validated_at = new Date().toISOString();
      if (instNum === 1) {
        // Due 30 calendar days after first instalment
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + 30);
        expected_next_date = nextDate.toISOString();
      }
    }

    const insertRes = await db.query(
      `INSERT INTO prepa_payments (
        payment_ref, candidate_ref, candidate_name, candidate_email,
        academic_intake, program, instalment_number, instalment_label,
        instalment_percentage, amount, payment_method, transaction_ref,
        proof_file_url, proof_filename, status, validated_by, validated_at,
        expected_next_date, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *`,
      [
        payment_ref,
        candidate_ref,
        candidate_name,
        candidate_email || null,
        academic_intake,
        'LIEC-France PREPA',
        instNum,
        instalment_label,
        instalment_percentage,
        amount,
        payment_method,
        transaction_ref || null,
        proof_file_url || null,
        proof_filename || null,
        status,
        validated_by,
        validated_at,
        expected_next_date,
        notes || null,
      ]
    );

    // Audit log
    await db.query(
      `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        user.name || user.email || 'System',
        'REGISTER_PREPA_PAYMENT',
        payment_ref,
        'Succès',
        `Registered ${instalment_label} of €${amount.toFixed(2)} for candidate ${candidate_name} (${candidate_ref}). Status: ${status}`,
      ]
    );

    return NextResponse.json({ success: true, payment: insertRes.rows[0] });
  } catch (err: any) {
    console.error('Error in prepa payments POST:', err);
    return NextResponse.json({ error: 'Failed to record payment', details: err?.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const db = await getDb();
    const auth = await authenticateServerRequest(req, db);
    if (!auth.success) {
      return auth.response;
    }
    const user = auth.user;

    const isAuthorizedValidator =
      user.role === 'admin' ||
      user.role === 'avi' ||
      user.business_profile === 'Admin' ||
      user.business_profile === 'Finance Officer' ||
      (user.technical_roles && (user.technical_roles.includes('admin') || user.technical_roles.includes('lh_finance')));

    if (!isAuthorizedValidator) {
      return NextResponse.json(
        { error: 'Forbidden: Payment validation requires Admin or Finance Officer privileges.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { payment_id, action, notes } = body;

    if (!payment_id || !action) {
      return NextResponse.json({ error: 'Missing payment_id or action' }, { status: 400 });
    }

    const checkRes = await db.query('SELECT * FROM prepa_payments WHERE id = $1', [payment_id]);
    if (checkRes.rows.length === 0) {
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
    }
    const payment = checkRes.rows[0];

    if (action === 'validate') {
      let expectedNextDate: string | null = null;
      if (payment.instalment_number === 1) {
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + 30);
        expectedNextDate = nextDate.toISOString();
      }

      const updateRes = await db.query(
        `UPDATE prepa_payments
         SET status = 'Validated',
             validated_by = $1,
             validated_at = CURRENT_TIMESTAMP,
             expected_next_date = $2,
             notes = COALESCE($3, notes),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4
         RETURNING *`,
        [
          user.name || 'Barthelemy MAPWABA NTORO',
          expectedNextDate,
          notes || null,
          payment_id,
        ]
      );

      // Log validation event
      await db.query(
        `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          user.name || user.email || 'Admin',
          'VALIDATE_PREPA_PAYMENT',
          payment.payment_ref,
          'Succès',
          `Validated ${payment.instalment_label} of €${payment.amount} for ${payment.candidate_name}. Next instalment due: ${expectedNextDate ? expectedNextDate.slice(0, 10) : 'None (Fully Paid)'}`,
        ]
      );

      return NextResponse.json({ success: true, payment: updateRes.rows[0] });
    } else if (action === 'reject') {
      const updateRes = await db.query(
        `UPDATE prepa_payments
         SET status = 'Rejected',
             validated_by = $1,
             validated_at = CURRENT_TIMESTAMP,
             notes = COALESCE($2, notes),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING *`,
        [user.name || 'Staff', notes || null, payment_id]
      );

      await db.query(
        `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          user.name || user.email || 'Staff',
          'REJECT_PREPA_PAYMENT',
          payment.payment_ref,
          'Succès',
          `Rejected payment ${payment.payment_ref} for ${payment.candidate_name}. Reason: ${notes || 'Verification failed'}`,
        ]
      );

      return NextResponse.json({ success: true, payment: updateRes.rows[0] });
    } else {
      return NextResponse.json({ error: 'Invalid action. Must be validate or reject.' }, { status: 400 });
    }
  } catch (err: any) {
    console.error('Error in prepa payments PATCH:', err);
    return NextResponse.json({ error: 'Failed to update payment status', details: err?.message }, { status: 500 });
  }
}
