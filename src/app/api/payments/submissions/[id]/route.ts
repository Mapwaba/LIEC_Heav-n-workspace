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

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const db = await getDb();
    const auth = await authenticateServerRequest(req, db);
    if (!auth.success) {
      return auth.response;
    }
    const user = auth.user;

    const { id } = await context.params;
    const submissionId = parseInt(id, 10);

    if (isNaN(submissionId) || submissionId <= 0) {
      return NextResponse.json(
        { error: 'Invalid submission ID parameter.' },
        { status: 400, headers: corsHeaders() }
      );
    }

    // 1. Fetch submission record
    const subRes = await db.query(
      `SELECT * FROM payment_submissions WHERE id = $1;`,
      [submissionId]
    );

    if (subRes.rows.length === 0) {
      return NextResponse.json(
        { error: 'Payment submission not found.' },
        { status: 404, headers: corsHeaders() }
      );
    }
    const submission = subRes.rows[0];

    // 2. Ownership & RBAC check
    if (user.business_profile === 'Secretary' && submission.submitted_by !== user.email) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to view this applicant payment record.' },
        { status: 403, headers: corsHeaders() }
      );
    }

    // 3. Fetch attached evidence documents
    const evRes = await db.query(
      `SELECT id, submission_id, file_name, file_size_bytes, mime_type, uploaded_by, uploaded_at
       FROM payment_submission_evidence
       WHERE submission_id = $1
       ORDER BY id ASC;`,
      [submissionId]
    );

    // 4. Fetch recent event history
    const histRes = await db.query(
      `SELECT id, event_type, actor_email, actor_name, actor_role, previous_status, new_status, decision_reason, created_at
       FROM payment_submission_events
       WHERE submission_id = $1
       ORDER BY id ASC;`,
      [submissionId]
    );

    return NextResponse.json(
      {
        submission,
        evidence: evRes.rows,
        history: histRes.rows,
      },
      { headers: corsHeaders() }
    );
  } catch (err: any) {
    console.error('Error in GET /api/payments/submissions/[id]:', err);
    return NextResponse.json(
      { error: 'Failed to retrieve payment submission details', details: err?.message },
      { status: 500, headers: corsHeaders() }
    );
  }
}
