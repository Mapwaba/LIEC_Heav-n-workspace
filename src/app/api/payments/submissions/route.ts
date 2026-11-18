import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { authenticateServerRequest } from '@/lib/rbac';
import {
  createPaymentSubmission,
  canSubmitPaymentEvidence,
  isMainAdmin,
} from '@/lib/paymentSubmissions';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

/**
 * GET /api/payments/submissions
 * Lists payment submissions scoped to authenticated user role and ownership.
 * - Platform Admin: Sees all submissions across all applicants and statuses.
 * - Finance Officer: Sees all active and pending submissions.
 * - Secretary / Advisor: Sees submissions created by themselves or assigned records.
 */
export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const auth = await authenticateServerRequest(req, db);
    if (!auth.success) {
      return auth.response;
    }
    const user = auth.user;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const entityType = searchParams.get('entity_type');
    const entityRef = searchParams.get('entity_ref');
    const instalmentNumber = searchParams.get('instalment_number');
    const includeArchived = searchParams.get('include_archived') === 'true';

    let query = `
      SELECT 
        s.*,
        COALESCE(ev.evidence_count, 0) as evidence_count
      FROM payment_submissions s
      LEFT JOIN (
        SELECT submission_id, count(*) as evidence_count 
        FROM payment_submission_evidence 
        GROUP BY submission_id
      ) ev ON ev.submission_id = s.id
      WHERE 1=1
    `;
    const params: any[] = [];

    // Filter out archived unless specifically requested by Admin
    if (!includeArchived || user.business_profile !== 'Admin') {
      query += ` AND s.is_archived = FALSE`;
    }

    // Role-based visibility scoping
    if (user.business_profile === 'Secretary' || user.role === 'secretary') {
      params.push(user.email);
      query += ` AND (s.submitted_by = $${params.length})`;
    }

    // Optional query filters
    if (status) {
      params.push(status);
      query += ` AND s.status = $${params.length}`;
    }
    if (entityType) {
      params.push(entityType.toUpperCase());
      query += ` AND s.entity_type = $${params.length}`;
    }
    if (entityRef) {
      params.push(entityRef);
      query += ` AND s.entity_ref = $${params.length}`;
    }
    if (instalmentNumber) {
      params.push(parseInt(instalmentNumber, 10));
      query += ` AND s.instalment_number = $${params.length}`;
    }

    query += ` ORDER BY s.id DESC LIMIT 100;`;

    const res = await db.query(query, params);
    return NextResponse.json({ submissions: res.rows }, { headers: corsHeaders() });
  } catch (err: any) {
    console.error('Error in GET /api/payments/submissions:', err);
    return NextResponse.json(
      { error: 'Failed to retrieve payment submissions', details: err?.message },
      { status: 500, headers: corsHeaders() }
    );
  }
}

/**
 * POST /api/payments/submissions
 * Creates a new payment submission.
 * Enforces dual-control permissions and concurrency locks.
 */
export async function POST(req: NextRequest) {
  try {
    const db = await getDb();
    const auth = await authenticateServerRequest(req, db);
    if (!auth.success) {
      return auth.response;
    }
    const user = auth.user;

    if (!canSubmitPaymentEvidence(user)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient privileges to submit payment records.' },
        { status: 403, headers: corsHeaders() }
      );
    }

    const body = await req.json();

    const created = await createPaymentSubmission(
      db,
      {
        entityType: body.entity_type,
        entityRef: body.entity_ref,
        applicantName: body.applicant_name,
        applicantEmail: body.applicant_email,
        instalmentNumber: parseInt(body.instalment_number, 10),
        amount: parseFloat(body.amount),
        currency: body.currency || 'EUR',
        paymentDate: body.payment_date,
        paymentMethod: body.payment_method,
        rawbankSlipNumber: body.rawbank_slip_number,
        rawbankOperationCode: body.rawbank_operation_code,
        otherMethodDetails: body.other_method_details,
        notes: body.notes,
        isDirectAdminEntry: Boolean(body.is_direct_admin_entry),
      },
      user
    );

    return NextResponse.json(
      {
        success: true,
        submission: created.submission,
        eventId: created.eventId,
      },
      { status: 201, headers: corsHeaders() }
    );
  } catch (err: any) {
    console.error('Error in POST /api/payments/submissions:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to create payment submission' },
      { status: 400, headers: corsHeaders() }
    );
  }
}
