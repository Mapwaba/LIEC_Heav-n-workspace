import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { authenticateServerRequest } from '@/lib/rbac';
import { canSubmitPaymentEvidence } from '@/lib/paymentSubmissions';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

/**
 * POST /api/payments/submissions/[id]/submit
 * Submits a payment submission and its attached evidence for Central Main Admin validation.
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const db = await getDb();
    const auth = await authenticateServerRequest(req, db);
    if (!auth.success) return auth.response;
    const user = auth.user;

    if (!canSubmitPaymentEvidence(user)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient privileges to submit payment records.' },
        { status: 403, headers: corsHeaders() }
      );
    }

    const resolvedParams = await Promise.resolve(context.params);
    const submissionId = parseInt(resolvedParams.id, 10);
    const body = await req.json().catch(() => ({}));
    const expectedVersion = body.version !== undefined ? Number(body.version) : undefined;

    // 1. Fetch submission
    const subRes = await db.query(
      `SELECT * FROM payment_submissions WHERE id = $1;`,
      [submissionId]
    );
    if (subRes.rows.length === 0) {
      return NextResponse.json({ error: 'Payment submission not found.' }, { status: 404, headers: corsHeaders() });
    }
    const sub = subRes.rows[0];

    // Optimistic Concurrency Control: Check version conflict
    if (expectedVersion !== undefined && sub.version !== undefined && sub.version !== expectedVersion) {
      return NextResponse.json(
        {
          error: 'CONCURRENT_MODIFICATION',
          code: 'CONCURRENCY_CONFLICT',
          message: 'This payment submission was modified by another user or process. Please reload to review the latest state.',
          current_version: sub.version,
          client_version: expectedVersion,
        },
        { status: 409, headers: corsHeaders() }
      );
    }

    if (sub.is_archived) {
      return NextResponse.json({ error: 'Cannot submit an archived record.' }, { status: 400, headers: corsHeaders() });
    }
    if (sub.status === 'VALIDATED') {
      return NextResponse.json({ error: 'Submission is already validated.' }, { status: 400, headers: corsHeaders() });
    }

    // 2. Verify that at least one evidence file is attached
    const evCountRes = await db.query(
      `SELECT count(*) as c FROM payment_submission_evidence WHERE submission_id = $1;`,
      [submissionId]
    );
    const evidenceCount = parseInt(evCountRes.rows[0].c, 10);
    if (evidenceCount === 0) {
      return NextResponse.json(
        { error: 'Cannot submit for validation: at least one supporting evidence file (PDF, JPEG, PNG) must be attached.' },
        { status: 400, headers: corsHeaders() }
      );
    }

    // 3. Atomically update status and increment version
    const updateRes = await db.query(
      `UPDATE payment_submissions
       SET status = 'PENDING_ADMIN_VALIDATION',
           version = version + 1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND ($2::int IS NULL OR version = $2::int)
       RETURNING *;`,
      [submissionId, expectedVersion !== undefined ? expectedVersion : null]
    );

    if (updateRes.rowCount === 0) {
      return NextResponse.json(
        {
          error: 'CONCURRENT_MODIFICATION',
          code: 'CONCURRENCY_CONFLICT',
          message: 'Atomic update failed due to concurrent modification. Zero rows modified.',
        },
        { status: 409, headers: corsHeaders() }
      );
    }

    const updatedSub = updateRes.rows[0];

    // 4. Log immutable audit event
    await db.query(
      `INSERT INTO payment_submission_events (
        submission_id, event_type, actor_email, actor_name, actor_role,
        previous_status, new_status, decision_reason, metadata
      ) VALUES ($1, 'SUBMITTED', $2, $3, $4, $5, 'PENDING_ADMIN_VALIDATION', $6, $7);`,
      [
        submissionId,
        user.email,
        user.name || user.email,
        user.business_profile || 'Staff',
        sub.status,
        `Submission queued for Main Admin validation with ${evidenceCount} evidence file(s).`,
        JSON.stringify({ evidence_count: evidenceCount }),
      ]
    );

    return NextResponse.json(
      {
        success: true,
        submissionId,
        status: 'PENDING_ADMIN_VALIDATION',
        version: updatedSub.version,
        evidenceCount,
      },
      { headers: corsHeaders() }
    );
  } catch (err: any) {
    console.error('Error in POST /api/payments/submissions/[id]/submit:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to submit payment evidence' },
      { status: 500, headers: corsHeaders() }
    );
  }
}
