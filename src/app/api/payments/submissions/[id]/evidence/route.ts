import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { authenticateServerRequest } from '@/lib/rbac';
import {
  validateEvidenceFile,
  generateSecureEvidenceKey,
  storeEvidenceDocument,
} from '@/lib/evidenceStorage';
import { canSubmitPaymentEvidence } from '@/lib/paymentSubmissions';

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
 * GET /api/payments/submissions/[id]/evidence
 * Returns all evidence files attached to this payment submission.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const db = await getDb();
    const auth = await authenticateServerRequest(req, db);
    if (!auth.success) return auth.response;

    const resolvedParams = await context.params;
    const submissionId = parseInt(resolvedParams.id, 10);

    const evRes = await db.query(
      `SELECT id, submission_id, file_name, file_size_bytes, mime_type, uploaded_by, uploaded_at
       FROM payment_submission_evidence
       WHERE submission_id = $1
       ORDER BY id ASC;`,
      [submissionId]
    );

    return NextResponse.json({ evidence: evRes.rows }, { headers: corsHeaders() });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Failed to retrieve evidence list', details: err?.message },
      { status: 500, headers: corsHeaders() }
    );
  }
}

/**
 * POST /api/payments/submissions/[id]/evidence
 * Uploads and registers an evidence file for a payment submission.
 * Enforces file size limits, MIME type validation, and unpredictable S3 key generation.
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const db = await getDb();
    const auth = await authenticateServerRequest(req, db);
    if (!auth.success) return auth.response;
    const user = auth.user;

    if (!canSubmitPaymentEvidence(user)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient privileges to upload payment evidence.' },
        { status: 403, headers: corsHeaders() }
      );
    }

    const resolvedParams = await context.params;
    const submissionId = parseInt(resolvedParams.id, 10);

    // 1. Verify submission exists and is not archived or already validated
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

    if (submission.is_archived) {
      return NextResponse.json(
        { error: 'Cannot attach evidence to an archived payment submission.' },
        { status: 400, headers: corsHeaders() }
      );
    }

    // 2. Extract file data from multipart/form-data or JSON payload
    let fileName = '';
    let mimeType = '';
    let buffer: Buffer;

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return NextResponse.json({ error: 'No file provided in form-data.' }, { status: 400 });
      }
      fileName = file.name;
      mimeType = file.type;
      buffer = Buffer.from(await file.arrayBuffer());
    } else {
      const body = await req.json();
      fileName = body.file_name;
      mimeType = body.mime_type;
      if (body.file_base64) {
        buffer = Buffer.from(body.file_base64, 'base64');
      } else if (body.content) {
        buffer = Buffer.from(body.content);
      } else {
        return NextResponse.json({ error: 'Missing file content in payload.' }, { status: 400 });
      }
    }

    // 3. Strict server-side validation (MIME type, size, binary magic number)
    const validation = validateEvidenceFile(fileName, mimeType, buffer.length, buffer);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400, headers: corsHeaders() });
    }

    // 4. Generate unpredictable object key
    const fileKey = generateSecureEvidenceKey(submission.entity_type, validation.extension!);

    // 5. Store file in object storage
    const storageRes = await storeEvidenceDocument(fileKey, buffer, validation.mimeType!);
    if (!storageRes.success) {
      return NextResponse.json(
        { error: `Storage failure: ${storageRes.error}` },
        { status: 502, headers: corsHeaders() }
      );
    }

    // 6. Record metadata in PostgreSQL
    const insertEvRes = await db.query(
      `INSERT INTO payment_submission_evidence (
        submission_id, file_key, file_name, file_size_bytes, mime_type, storage_bucket, uploaded_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, submission_id, file_name, file_size_bytes, mime_type, uploaded_by, uploaded_at;`,
      [
        submissionId,
        fileKey,
        validation.sanitizedFileName,
        buffer.length,
        validation.mimeType,
        storageRes.storageBucket,
        user.email,
      ]
    );

    const evidenceRecord = insertEvRes.rows[0];

    // 7. Append immutable audit event
    await db.query(
      `INSERT INTO payment_submission_events (
        submission_id, event_type, actor_email, actor_name, actor_role,
        previous_status, new_status, decision_reason, metadata
      ) VALUES ($1, 'EVIDENCE_PROVIDED', $2, $3, $4, $5, $5, $6, $7);`,
      [
        submissionId,
        user.email,
        user.name || user.email,
        user.business_profile || 'Staff',
        submission.status,
        `Evidence file '${validation.sanitizedFileName}' attached by staff.`,
        JSON.stringify({
          evidence_id: evidenceRecord.id,
          file_name: validation.sanitizedFileName,
          file_size_bytes: buffer.length,
          mime_type: validation.mimeType,
        }),
      ]
    );

    return NextResponse.json(
      {
        success: true,
        evidence: evidenceRecord,
      },
      { status: 201, headers: corsHeaders() }
    );
  } catch (err: any) {
    console.error('Error in POST /api/payments/submissions/[id]/evidence:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to upload evidence' },
      { status: 500, headers: corsHeaders() }
    );
  }
}
