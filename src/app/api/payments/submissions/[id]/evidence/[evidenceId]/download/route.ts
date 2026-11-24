import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { authenticateServerRequest } from '@/lib/rbac';
import { getEvidenceDownloadUrl } from '@/lib/evidenceStorage';

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
  context: { params: Promise<{ id: string; evidenceId: string }> }
) {
  try {
    const db = await getDb();
    const auth = await authenticateServerRequest(req, db);
    if (!auth.success) return auth.response;
    const user = auth.user;

    const resolvedParams = await context.params;
    const submissionId = parseInt(resolvedParams.id, 10);
    const evidenceId = parseInt(resolvedParams.evidenceId, 10);

    if (isNaN(submissionId) || isNaN(evidenceId)) {
      return NextResponse.json(
        { error: 'Invalid submission ID or evidence ID parameter.' },
        { status: 400, headers: corsHeaders() }
      );
    }

    // 1. Fetch submission and evidence records
    const res = await db.query(
      `SELECT e.id, e.file_key, e.file_name, e.mime_type, e.uploaded_by, s.submitted_by
       FROM payment_submission_evidence e
       JOIN payment_submissions s ON s.id = e.submission_id
       WHERE e.id = $1 AND e.submission_id = $2;`,
      [evidenceId, submissionId]
    );

    if (res.rows.length === 0) {
      return NextResponse.json(
        { error: 'Evidence record not found for this submission.' },
        { status: 404, headers: corsHeaders() }
      );
    }

    const record = res.rows[0];

    // 2. Strict authorization check
    const isOwnerStaff = record.uploaded_by === user.email || record.submitted_by === user.email;
    const isPrivilegedStaff =
      user.business_profile === 'Admin' ||
      user.business_profile === 'Finance Officer' ||
      user.role === 'admin' ||
      user.role === 'avi';

    if (!isOwnerStaff && !isPrivilegedStaff) {
      return NextResponse.json(
        { error: 'Forbidden: You are not authorized to access or download this evidence document.' },
        { status: 403, headers: corsHeaders() }
      );
    }

    // 3. Generate short-lived presigned download URL (300 seconds)
    const signedUrlRes = await getEvidenceDownloadUrl(record.file_key, 300);
    if (!signedUrlRes.success || !signedUrlRes.downloadUrl) {
      return NextResponse.json(
        { error: `Download failed: ${signedUrlRes.error}` },
        { status: 500, headers: corsHeaders() }
      );
    }

    return NextResponse.json(
      {
        success: true,
        fileName: record.file_name,
        mimeType: record.mime_type,
        downloadUrl: signedUrlRes.downloadUrl,
        expiresInSeconds: 300,
      },
      { headers: corsHeaders() }
    );
  } catch (err: any) {
    console.error('Error in GET /api/payments/submissions/[id]/evidence/[evidenceId]/download:', err);
    return NextResponse.json(
      { error: 'Failed to generate evidence download', details: err?.message },
      { status: 500, headers: corsHeaders() }
    );
  }
}
