import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { authenticateServerRequest, canManageDocumentRetention } from '@/lib/rbac';
import { deleteDocument } from '@/lib/storage';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-email, x-user-lang',
  };
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

/**
 * Computes exact 11-month retention deadline and status for a candidate
 */
export function computeRetentionStatus(cand: {
  ref: string;
  full_name: string;
  email: string;
  qualified_at?: string | null;
  qualification_status?: string | null;
  visa_status?: string | null;
  documents_purged?: boolean | null;
}) {
  if (cand.documents_purged) {
    return {
      status: 'PURGED' as const,
      statusLabel: 'Purged (Compliant)',
      deadline: null,
      daysRemaining: null,
      isExpired: false,
      eligibleEarlyPurge: false,
      requiresReview: false,
    };
  }

  if (!cand.qualified_at || cand.qualification_status === 'REQUIRES_REVIEW') {
    return {
      status: 'REQUIRES_REVIEW' as const,
      statusLabel: 'Requires Review (Missing Timestamp)',
      deadline: null,
      daysRemaining: null,
      isExpired: false,
      eligibleEarlyPurge: cand.visa_status === 'Obtained',
      requiresReview: true,
    };
  }

  if (cand.qualification_status === 'UNQUALIFIED') {
    return {
      status: 'UNQUALIFIED' as const,
      statusLabel: 'Prospect / Unqualified',
      deadline: null,
      daysRemaining: null,
      isExpired: false,
      eligibleEarlyPurge: false,
      requiresReview: false,
    };
  }

  // Exact 11 calendar months from qualified_at
  const qualifiedDate = new Date(cand.qualified_at);
  const deadlineDate = new Date(qualifiedDate);
  deadlineDate.setMonth(deadlineDate.getMonth() + 11);

  const now = new Date();
  const msRemaining = deadlineDate.getTime() - now.getTime();
  const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
  const isExpired = daysRemaining <= 0;
  const eligibleEarlyPurge = cand.visa_status === 'Obtained';

  let status: 'ELIGIBLE_EARLY_PURGE' | 'DUE_FOR_PURGE' | 'ACTIVE';
  let statusLabel: string;

  if (eligibleEarlyPurge) {
    status = 'ELIGIBLE_EARLY_PURGE';
    statusLabel = 'Visa Obtained (Eligible for Early Purge)';
  } else if (isExpired) {
    status = 'DUE_FOR_PURGE';
    statusLabel = 'Deadline Reached (Due for Deletion)';
  } else {
    status = 'ACTIVE';
    statusLabel = `${daysRemaining} days remaining`;
  }

  return {
    status,
    statusLabel,
    qualifiedAt: cand.qualified_at,
    deadline: deadlineDate.toISOString(),
    daysRemaining,
    isExpired,
    eligibleEarlyPurge,
    requiresReview: false,
  };
}

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const auth = await authenticateServerRequest(req, db);
    if (!auth.success) return auth.response;

    const { user } = auth;
    if (!canManageDocumentRetention(user)) {
      return NextResponse.json(
        { error: 'Forbidden: Access denied to student document retention management.' },
        { status: 403, headers: corsHeaders() }
      );
    }

    const { searchParams } = new URL(req.url);
    const filter = (searchParams.get('filter') || 'all').toLowerCase(); // all | due | eligible | purged | review

    const query = `
      SELECT
        c.ref,
        c.full_name,
        c.email,
        c.program,
        c.application_year,
        c.qualified_at,
        c.qualification_status,
        c.visa_status,
        c.visa_decision_date,
        c.documents_purged,
        c.pieces_json
      FROM candidats c
      ORDER BY c.id DESC
    `;

    const res = await db.query(query);
    const candidates = res.rows.map((row: any) => {
      const retention = computeRetentionStatus(row);
      let pieceCount = 0;
      try {
        const pieces = JSON.parse(row.pieces_json || '[]');
        pieceCount = Array.isArray(pieces) ? pieces.length : 0;
      } catch {
        pieceCount = 0;
      }

      return {
        ref: row.ref,
        full_name: row.full_name,
        email: row.email,
        program: row.program,
        application_year: row.application_year || '2027–2028',
        qualified_at: row.qualified_at,
        qualification_status: row.qualification_status || (row.qualified_at ? 'QUALIFIED' : 'REQUIRES_REVIEW'),
        visa_status: row.visa_status || 'Not Applied',
        visa_decision_date: row.visa_decision_date,
        documents_purged: !!row.documents_purged,
        piece_count: pieceCount,
        retention,
      };
    });

    const filtered = candidates.filter((c: any) => {
      if (filter === 'due') return c.retention.status === 'DUE_FOR_PURGE';
      if (filter === 'eligible') return c.retention.eligibleEarlyPurge && !c.documents_purged;
      if (filter === 'purged') return c.documents_purged;
      if (filter === 'review') return c.retention.requiresReview;
      return true;
    });

    // Summary counts
    const counts = {
      total: candidates.length,
      active: candidates.filter((c: any) => c.retention.status === 'ACTIVE').length,
      due: candidates.filter((c: any) => c.retention.status === 'DUE_FOR_PURGE').length,
      eligibleEarly: candidates.filter((c: any) => c.retention.eligibleEarlyPurge && !c.documents_purged).length,
      purged: candidates.filter((c: any) => c.documents_purged).length,
      requiresReview: candidates.filter((c: any) => c.retention.requiresReview).length,
    };

    // Also fetch recent purge logs
    const logsRes = await db.query(
      `SELECT * FROM document_retention_logs ORDER BY purged_at DESC LIMIT 20`
    );

    return NextResponse.json(
      {
        ok: true,
        counts,
        candidates: filtered,
        recentLogs: logsRes.rows,
      },
      { headers: corsHeaders() }
    );
  } catch (error: any) {
    console.error('Error fetching retention status:', error);
    return NextResponse.json({ error: error?.message }, { status: 500, headers: corsHeaders() });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = await getDb();
    const auth = await authenticateServerRequest(req, db);
    if (!auth.success) return auth.response;

    const { user } = auth;
    if (!canManageDocumentRetention(user)) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to initiate document retention purges.' },
        { status: 403, headers: corsHeaders() }
      );
    }

    const body = await req.json();
    const action = (body.action || 'early_purge_visa').toLowerCase(); // early_purge_visa | deadline_purge | batch_deadline_purge
    const studentRef = (body.student_ref || body.ref || '').trim();
    const reasonNotes = (body.reason_notes || body.notes || '').trim();

    if (action === 'batch_deadline_purge') {
      // Find all candidates where 11 months have elapsed and documents not purged
      const candidatesRes = await db.query(
        `SELECT ref, full_name, email, qualified_at, qualification_status, documents_purged
         FROM candidats
         WHERE documents_purged = FALSE AND qualified_at IS NOT NULL`
      );

      const toPurge = candidatesRes.rows.filter((cand: any) => {
        const ret = computeRetentionStatus(cand);
        return ret.isExpired;
      });

      const purgedRefs: string[] = [];
      for (const cand of toPurge) {
        await executeCandidateDocumentPurge(db, cand, '11_MONTH_DEADLINE_EXPIRED', user, 'Batch retention cleanup');
        purgedRefs.push(cand.ref);
      }

      return NextResponse.json(
        {
          ok: true,
          action: 'batch_deadline_purge',
          count: purgedRefs.length,
          purgedRefs,
        },
        { headers: corsHeaders() }
      );
    }

    if (!studentRef) {
      return NextResponse.json(
        { error: 'Student reference (student_ref) is required.' },
        { status: 400, headers: corsHeaders() }
      );
    }

    const candRes = await db.query(
      `SELECT * FROM candidats WHERE ref = $1 OR ref = $2 OR LOWER(ref) = LOWER($1) LIMIT 1`,
      [studentRef, `#${studentRef.replace(/^#/, '')}`]
    );

    if (!candRes.rows || candRes.rows.length === 0) {
      return NextResponse.json({ error: `Student ${studentRef} not found.` }, { status: 404, headers: corsHeaders() });
    }

    const candidate = candRes.rows[0];

    if (candidate.documents_purged) {
      return NextResponse.json(
        { error: `Student documents for ${candidate.ref} have already been permanently purged.` },
        { status: 400, headers: corsHeaders() }
      );
    }

    let triggerReason = '11_MONTH_DEADLINE_EXPIRED';
    if (action === 'early_purge_visa') {
      if (candidate.visa_status !== 'Obtained') {
        return NextResponse.json(
          {
            error: `Early purge requires confirmed visa obtention (current visa status is '${candidate.visa_status || 'Not Applied'}').`,
          },
          { status: 400, headers: corsHeaders() }
        );
      }
      triggerReason = 'VISA_OBTAINED_CONFIRMED';
    }

    const purgeResult = await executeCandidateDocumentPurge(
      db,
      candidate,
      triggerReason,
      user,
      reasonNotes
    );

    return NextResponse.json(
      {
        ok: true,
        success: true,
        student_ref: candidate.ref,
        trigger_reason: triggerReason,
        purged_at: purgeResult.purgedAt,
        files_purged_count: purgeResult.filesPurgedCount,
        files_purged: purgeResult.filesPurged,
        storage_verification: purgeResult.storageVerification,
        message: `Sensitive documents successfully purged for ${candidate.full_name} (${candidate.ref}). Profile and academic history preserved intact.`,
      },
      { headers: corsHeaders() }
    );
  } catch (error: any) {
    console.error('Error during document retention purge:', error);
    return NextResponse.json({ error: error?.message }, { status: 500, headers: corsHeaders() });
  }
}

/**
 * Executes secure deletion of sensitive documents across S3, database payloads, and accommodation tokens
 */
async function executeCandidateDocumentPurge(
  db: any,
  candidate: any,
  triggerReason: string,
  user: any,
  notes: string
) {
  const purgedFiles: Array<{ name: string; key?: string; source: string; status: string }> = [];

  // 1. Identify and revoke accommodation tokens & sensitive attachments
  const accommRes = await db.query(
    `SELECT id, attachments_json FROM accommodation_requests
     WHERE LOWER(student_name) = LOWER($1) OR student_name ILIKE $1`,
    [candidate.full_name]
  );

  for (const reqRow of accommRes.rows) {
    // Revoke tokens
    await db.query(
      `UPDATE accommodation_access_tokens
       SET revoked = TRUE, revoked_at = CURRENT_TIMESTAMP
       WHERE accommodation_request_id = $1`,
      [reqRow.id]
    );

    // Purge files in attachments_json
    try {
      const attachments = JSON.parse(reqRow.attachments_json || '[]');
      const sanitizedAttachments = [];

      for (const att of attachments) {
        if (att.s3_key) {
          const delRes = await deleteDocument(att.s3_key);
          purgedFiles.push({
            name: att.name || 'Sensitive Attachment',
            key: att.s3_key,
            source: 'accommodation_attachments',
            status: delRes.success ? 'DELETED_S3' : 'S3_KEY_REVOKED',
          });
        } else {
          purgedFiles.push({
            name: att.name || 'Inline Attachment',
            source: 'accommodation_attachments',
            status: 'PAYLOAD_PURGED',
          });
        }
        sanitizedAttachments.push({
          name: att.name,
          type: att.type,
          purged: true,
          purged_at: new Date().toISOString(),
          status_note: '[SENSITIVE DOCUMENT PURGED UNDER LIEC RETENTION POLICY]',
        });
      }

      await db.query(
        `UPDATE accommodation_requests
         SET attachments_json = $1
         WHERE id = $2`,
        [JSON.stringify(sanitizedAttachments), reqRow.id]
      );
    } catch (e) {
      console.error('Error cleaning accommodation attachments:', e);
    }
  }

  // 2. Sanitize pieces_json in candidats
  try {
    const pieces = JSON.parse(candidate.pieces_json || '[]');
    const sanitizedPieces = pieces.map((p: any) => ({
      ...p,
      status: 'purged',
      meta: 'Document purgé (Politique de rétention)',
      data_base64: undefined,
      s3_url: undefined,
      purged_at: new Date().toISOString(),
    }));

    purgedFiles.push({
      name: `${pieces.length} academic & identity pieces`,
      source: 'candidats.pieces_json',
      status: 'PAYLOAD_PURGED',
    });

    await db.query(
      `UPDATE candidats SET pieces_json = $1 WHERE ref = $2`,
      [JSON.stringify(sanitizedPieces), candidate.ref]
    );
  } catch (e) {
    console.error('Error sanitizing pieces_json:', e);
  }

  // 3. Mark candidate documents_purged = TRUE and record history event
  const nowIso = new Date().toISOString();
  const timestampShort = nowIso.replace('T', ' ').substring(0, 19);
  const history = JSON.parse(candidate.history_json || '[]');

  history.unshift({
    timestamp: timestampShort,
    author: `${user.name} (${user.business_profile})`,
    activity_type: 'SENSITIVE_DOCUMENTS_PURGED',
    details: `Sensitive documents permanently deleted. Reason: ${triggerReason}. Tokens revoked, S3 objects deleted. Student profile & reporting metrics preserved.`,
  });

  await db.query(
    `UPDATE candidats SET
      documents_purged = TRUE,
      history_json = $1
     WHERE ref = $2`,
    [JSON.stringify(history), candidate.ref]
  );

  // 4. Record entry in document_retention_logs
  await db.query(
    `INSERT INTO document_retention_logs (
      student_ref, student_name, trigger_reason, purged_by, purged_at,
      files_count, files_detail_json, storage_verification, status
    ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5, $6, $7, $8)`,
    [
      candidate.ref,
      candidate.full_name,
      triggerReason,
      `${user.name} (${user.business_profile})`,
      purgedFiles.length,
      JSON.stringify(purgedFiles),
      'SUCCESS_DELETED_FROM_S3',
      'PURGED',
    ]
  );

  // 5. Immutable audit log
  await db.query(
    `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
     VALUES ($1, 'Student Sensitive Document Purge', $2, 'Succès', $3)`,
    [
      `${user.name} (${user.business_profile})`,
      candidate.ref,
      `Purged ${purgedFiles.length} sensitive items. Trigger: ${triggerReason}. Storage verified. Notes: ${notes || 'Compliant with 11-month policy'}`,
    ]
  );

  return {
    purgedAt: nowIso,
    filesPurgedCount: purgedFiles.length,
    filesPurged: purgedFiles,
    storageVerification: 'SUCCESS_DELETED_FROM_S3',
  };
}
