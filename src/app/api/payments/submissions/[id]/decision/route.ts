import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { authenticateServerRequest } from '@/lib/rbac';
import {
  isMainAdmin,
  validatePaymentSubmissionWithConcurrency,
  rejectPaymentSubmission,
  requestAdditionalEvidence,
} from '@/lib/paymentSubmissions';

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
 * POST /api/payments/submissions/[id]/decision
 * Central Admin Validation Decision Endpoint.
 *
 * Enforces:
 * 1. Strict Main Admin identity and permission verification.
 * 2. Staff (Secretary, Finance Officer) are strictly prohibited from approving payments.
 * 3. Atomic transaction isolation with course-level and instalment-level row locking (FOR UPDATE).
 * 4. Approval-time cumulative balance recalculation and overpayment rejection.
 * 5. Immutable event trail logging.
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

    // Strict RBAC: Only Platform Main Admin may approve, reject, or request evidence
    if (!isMainAdmin(user)) {
      return NextResponse.json(
        {
          error:
            'Forbidden: Payment validation decisions strictly require Platform Main Administrator privileges. Finance Officers and Secretariat staff cannot approve payments.',
        },
        { status: 403, headers: corsHeaders() }
      );
    }

    const resolvedParams = await Promise.resolve(context.params);
    const submissionId = parseInt(resolvedParams.id, 10);

    if (isNaN(submissionId) || submissionId <= 0) {
      return NextResponse.json(
        { error: 'Invalid submission ID parameter.' },
        { status: 400, headers: corsHeaders() }
      );
    }

    const body = await req.json();
    const action = (body.action || '').trim().toLowerCase();
    const reason = (body.reason || body.notes || body.decision_reason || '').trim();

    if (action === 'approve' || action === 'validate') {
      // Execute ACID transactional validation with row-level locks
      const result = await validatePaymentSubmissionWithConcurrency(
        db,
        submissionId,
        user,
        reason || 'Approved by Platform Main Administrator'
      );
      return NextResponse.json(
        {
          success: true,
          action: 'approve',
          submissionId: result.submissionId,
          status: result.status,
          eventId: result.eventId,
        },
        { headers: corsHeaders() }
      );
    } else if (action === 'reject') {
      if (!reason || reason.length < 5) {
        return NextResponse.json(
          { error: 'A specific rejection reason is mandatory (minimum 5 characters).' },
          { status: 400, headers: corsHeaders() }
        );
      }
      const result = await rejectPaymentSubmission(db, submissionId, user, reason);
      return NextResponse.json(
        {
          success: true,
          action: 'reject',
          submissionId: result.submissionId,
          status: result.status,
          eventId: result.eventId,
        },
        { headers: corsHeaders() }
      );
    } else if (action === 'request_evidence' || action === 'request_additional_evidence') {
      if (!reason || reason.length < 5) {
        return NextResponse.json(
          { error: 'Detailed instructions for additional evidence are mandatory.' },
          { status: 400, headers: corsHeaders() }
        );
      }
      const result = await requestAdditionalEvidence(db, submissionId, user, reason);
      return NextResponse.json(
        {
          success: true,
          action: 'request_evidence',
          submissionId: result.submissionId,
          status: result.status,
          eventId: result.eventId,
        },
        { headers: corsHeaders() }
      );
    } else {
      return NextResponse.json(
        { error: `Invalid action '${action}'. Must be 'approve', 'reject', or 'request_evidence'.` },
        { status: 400, headers: corsHeaders() }
      );
    }
  } catch (err: any) {
    console.error('Error in POST /api/payments/submissions/[id]/decision:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to process validation decision' },
      { status: 400, headers: corsHeaders() }
    );
  }
}
