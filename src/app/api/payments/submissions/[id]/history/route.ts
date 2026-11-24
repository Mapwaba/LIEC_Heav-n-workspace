import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { authenticateServerRequest } from '@/lib/rbac';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

/**
 * GET /api/payments/submissions/[id]/history
 * Retrieves full immutable audit event trail and decision history.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const db = await getDb();
    const auth = await authenticateServerRequest(req, db);
    if (!auth.success) return auth.response;
    const user = auth.user;

    const { id } = await context.params;
    const submissionId = parseInt(id, 10);

    // Verify submission exists
    const subRes = await db.query(
      `SELECT id, submission_ref, submitted_by FROM payment_submissions WHERE id = $1;`,
      [submissionId]
    );
    if (subRes.rows.length === 0) {
      return NextResponse.json({ error: 'Payment submission not found.' }, { status: 404, headers: corsHeaders() });
    }
    const sub = subRes.rows[0];

    // Ownership check for Secretary
    if (user.business_profile === 'Secretary' && sub.submitted_by !== user.email) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to view this history.' },
        { status: 403, headers: corsHeaders() }
      );
    }

    const eventsRes = await db.query(
      `SELECT 
         id, submission_id, event_type, actor_email, actor_name, actor_role,
         previous_status, new_status, decision_reason, evidence_reference, metadata, created_at
       FROM payment_submission_events
       WHERE submission_id = $1
       ORDER BY id ASC;`,
      [submissionId]
    );

    return NextResponse.json(
      {
        submissionId,
        events: eventsRes.rows,
      },
      { headers: corsHeaders() }
    );
  } catch (err: any) {
    console.error('Error in GET /api/payments/submissions/[id]/history:', err);
    return NextResponse.json(
      { error: 'Failed to retrieve submission history', details: err?.message },
      { status: 500, headers: corsHeaders() }
    );
  }
}
