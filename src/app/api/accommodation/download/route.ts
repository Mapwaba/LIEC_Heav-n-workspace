import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getDb } from '@/lib/db';
import { getSignedDownloadUrl } from '@/lib/storage';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawToken = (searchParams.get('token') || '').trim();
  const docId = (searchParams.get('doc') || '').trim();
  const refParam = (searchParams.get('ref') || '').trim();

  const clientIp =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1';
  const userAgent = req.headers.get('user-agent') || 'Unknown';

  if (!rawToken || !docId) {
    return NextResponse.json(
      { error: 'Bad Request: Missing required document access parameters (token and doc ID).' },
      { status: 400 }
    );
  }

  try {
    const db = await getDb();

    // 1. Compute cryptographic SHA-256 hash of the presented bearer token
    const presentedHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // 2. Query token record by token_hash
    const tokenRes = await db.query(
      `SELECT * FROM accommodation_access_tokens WHERE token_hash = $1`,
      [presentedHash]
    );

    if (!tokenRes.rows || tokenRes.rows.length === 0) {
      // Audit security rejection
      try {
        await db.query(
          `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
           VALUES ($1, 'ACCOMMODATION_DOC_DOWNLOAD', $2, 'Denied (403)', $3)`,
          [
            'Unauthenticated Visitor',
            docId,
            `Rejected download request: Invalid or unrecognised document access token. Client IP: ${clientIp}.`,
          ]
        );
      } catch {}

      return NextResponse.json(
        {
          error:
            'Access Denied: Invalid or unrecognised document access token. Please verify the link received in your accommodation notification.',
        },
        { status: 403 }
      );
    }

    const tokenRecord = tokenRes.rows[0];

    // Constant-time hash verification to protect against timing attacks
    const storedHashBuffer = Buffer.from(tokenRecord.token_hash, 'hex');
    const presentedHashBuffer = Buffer.from(presentedHash, 'hex');
    if (
      storedHashBuffer.length !== presentedHashBuffer.length ||
      !crypto.timingSafeEqual(storedHashBuffer, presentedHashBuffer)
    ) {
      return NextResponse.json(
        { error: 'Access Denied: Cryptographic token verification failed.' },
        { status: 403 }
      );
    }

    // 3. Verify Revocation Status
    if (tokenRecord.revoked) {
      try {
        await db.query(
          `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
           VALUES ($1, 'ACCOMMODATION_DOC_DOWNLOAD', $2, 'Revoked (403)', $3)`,
          [
            `${tokenRecord.partner_id} (${tokenRecord.partner_email})`,
            `${tokenRecord.request_ref} / ${docId}`,
            `Access blocked: Token was revoked on ${tokenRecord.revoked_at} by ${tokenRecord.revoked_by}. Client IP: ${clientIp}.`,
          ]
        );
      } catch {}

      return NextResponse.json(
        {
          error:
            'Access Revoked: This document access link was revoked by the LIEC Admissions Secretariat. Please contact secretariat@liecconsulting.com for an updated authorization.',
        },
        { status: 403 }
      );
    }

    // 4. Verify 48-Hour Token Expiration
    const expiresAt = new Date(tokenRecord.expires_at).getTime();
    if (Date.now() > expiresAt) {
      try {
        await db.query(
          `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
           VALUES ($1, 'ACCOMMODATION_DOC_DOWNLOAD', $2, 'Expired (410)', $3)`,
          [
            `${tokenRecord.partner_id} (${tokenRecord.partner_email})`,
            `${tokenRecord.request_ref} / ${docId}`,
            `Access blocked: Token expired on ${tokenRecord.expires_at}. Client IP: ${clientIp}.`,
          ]
        );
      } catch {}

      return NextResponse.json(
        {
          error:
            'Access Expired: This document download link expired after 48 hours in accordance with student data retention policies. Please contact the LIEC Secretariat to generate a renewed link.',
        },
        { status: 410 }
      );
    }

    // 5. Verify Document Authorization (Token must be explicitly authorized for this doc ID)
    let authorizedDocIds: string[] = [];
    try {
      authorizedDocIds = JSON.parse(tokenRecord.document_ids || '[]');
    } catch {}

    if (!authorizedDocIds.includes(docId)) {
      try {
        await db.query(
          `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
           VALUES ($1, 'ACCOMMODATION_DOC_DOWNLOAD', $2, 'Forbidden (403)', $3)`,
          [
            `${tokenRecord.partner_id} (${tokenRecord.partner_email})`,
            `${tokenRecord.request_ref} / ${docId}`,
            `Cross-document violation attempt: Token is not authorized for requested document ID ${docId}. Client IP: ${clientIp}.`,
          ]
        );
      } catch {}

      return NextResponse.json(
        {
          error: 'Access Forbidden: This access token is not authorized for the requested document.',
        },
        { status: 403 }
      );
    }

    // 6. Retrieve Accommodation Request and Document Metadata
    const accRes = await db.query(
      `SELECT * FROM accommodation_requests WHERE ref = $1`,
      [tokenRecord.request_ref]
    );

    if (!accRes.rows || accRes.rows.length === 0) {
      return NextResponse.json(
        { error: 'Associated accommodation request could not be located.' },
        { status: 404 }
      );
    }

    const accRecord = accRes.rows[0];
    let attachments: Array<{
      id: string;
      filename: string;
      storage_key: string;
      mime_type?: string;
      file_size?: number;
    }> = [];

    try {
      attachments = JSON.parse(accRecord.attachments_json || '[]');
    } catch {}

    const targetDoc = attachments.find((a) => a.id === docId);
    if (!targetDoc || !targetDoc.storage_key) {
      return NextResponse.json(
        { error: 'Requested document metadata or storage key could not be found.' },
        { status: 404 }
      );
    }

    // 7. Generate a 5-minute private S3 signed download URL
    const signedUrlRes = await getSignedDownloadUrl(targetDoc.storage_key, 300);
    if (!signedUrlRes.success || !signedUrlRes.url) {
      return NextResponse.json(
        {
          error:
            'Temporary storage service error: Could not generate pre-signed download session.',
          details: signedUrlRes.error,
        },
        { status: 502 }
      );
    }

    // 8. Record Successful Audit Log (No raw tokens or full signed URLs logged)
    try {
      await db.query(
        `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
         VALUES ($1, 'ACCOMMODATION_DOC_DOWNLOAD', $2, 'Success', $3)`,
        [
          `${tokenRecord.partner_id} (${tokenRecord.partner_email})`,
          `${tokenRecord.request_ref} / ${targetDoc.filename}`,
          `Partner downloaded supporting document "${targetDoc.filename}" (Doc ID: ${targetDoc.id}, Size: ${targetDoc.file_size || 'N/A'}). Client IP: ${clientIp}. User-Agent: ${userAgent.substring(0, 80)}. Generated 5-minute S3 signed link.`,
        ]
      );
    } catch (auditErr) {
      console.warn('Could not write audit log:', auditErr);
    }

    // 9. Redirect partner directly to the private S3 pre-signed URL (HTTP 302)
    return NextResponse.redirect(signedUrlRes.url, { status: 302 });
  } catch (error: any) {
    console.error('Unhandled error in accommodation download route:', error);
    return NextResponse.json(
      { error: 'Internal server error processing document download', details: error?.message },
      { status: 500 }
    );
  }
}
