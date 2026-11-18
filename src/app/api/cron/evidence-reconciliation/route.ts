import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getDb } from '@/lib/db';
import { authenticateServerRequest } from '@/lib/rbac';
import { isMainAdmin } from '@/lib/paymentSubmissions';
import { listBucketObjects, isStorageConfigured, getStorageConfig } from '@/lib/storage';

/**
 * LIEC Heav'n — Workstream 3 Phase 3G
 * S3 Orphaned Upload Reconciliation Task
 *
 * CRITICAL SAFETY REQUIREMENT:
 * Must operate strictly in REPORT-ONLY mode.
 * Zero automatic object deletion under any circumstances.
 */

function secureTimingSafeEqual(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, 'utf-8');
    const bufB = Buffer.from(b, 'utf-8');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

function verifyCronSecret(req: NextRequest): boolean {
  const configuredSecret = process.env.CRON_SECRET?.trim();
  if (!configuredSecret) return false;

  const authHeader = (req.headers.get('authorization') || '').trim();
  const xCronAuth = (req.headers.get('x-cron-auth') || '').trim();

  let bearerToken = '';
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    bearerToken = authHeader.slice(7).trim();
  }

  return (
    (bearerToken !== '' && secureTimingSafeEqual(bearerToken, configuredSecret)) ||
    (xCronAuth !== '' && secureTimingSafeEqual(xCronAuth, configuredSecret))
  );
}

export async function GET(req: NextRequest) {
  return handleReconciliation(req);
}

export async function POST(req: NextRequest) {
  return handleReconciliation(req);
}

async function handleReconciliation(req: NextRequest) {
  try {
    const db = await getDb();

    // 1. Authorize caller: either valid CRON_SECRET or authenticated Main Admin
    const isCron = verifyCronSecret(req);
    let callerIdentity = 'CRON_SCHEDULER';

    if (!isCron) {
      const auth = await authenticateServerRequest(req, db);
      if (!auth.success || !isMainAdmin(auth.user)) {
        return NextResponse.json(
          { error: 'Unauthorized: Reconciliation task requires valid CRON_SECRET or Main Admin credentials.' },
          { status: 401 }
        );
      }
      callerIdentity = `ADMIN:${auth.user.email}`;
    }

    const timestamp = new Date().toISOString();

    // 2. Query all database evidence records with their parent submission status
    const dbEvidenceRes = await db.query(`
      SELECT 
        e.id as evidence_id,
        e.submission_id,
        e.file_name,
        e.storage_key,
        e.file_size_bytes,
        e.mime_type,
        e.created_at,
        s.submission_ref,
        s.entity_type,
        s.entity_ref,
        s.applicant_name,
        s.status as submission_status,
        s.is_archived
      FROM payment_submission_evidence e
      LEFT JOIN payment_submissions s ON e.submission_id = s.id
      ORDER BY e.id ASC;
    `);

    const dbEvidenceList = dbEvidenceRes.rows;
    const dbKeyMap = new Map<string, any>();
    for (const ev of dbEvidenceList) {
      if (ev.storage_key) {
        dbKeyMap.set(ev.storage_key.trim(), ev);
      }
    }

    // 3. Inspect S3 bucket inventory
    const storageConfigured = isStorageConfigured();
    const config = getStorageConfig();
    let s3Objects: { key: string; size: number; lastModified?: string }[] = [];
    let storageStatus = 'CONFIGURED';

    if (storageConfigured) {
      const s3ListRes = await listBucketObjects('evidence/');
      if (s3ListRes.success) {
        s3Objects = s3ListRes.objects;
      } else {
        storageStatus = `S3_LIST_ERROR: ${s3ListRes.error}`;
      }
    } else {
      storageStatus = 'STORAGE_NOT_CONFIGURED_DEV_MODE';
    }

    const s3KeyMap = new Map<string, { key: string; size: number; lastModified?: string }>();
    for (const obj of s3Objects) {
      s3KeyMap.set(obj.key.trim(), obj);
    }

    // 4. Categorize objects (Report-Only Mode)
    const matchedActive: any[] = [];
    const matchedArchived: any[] = [];
    const missingS3Objects: any[] = [];
    const orphanedS3Objects: any[] = [];

    // Check DB records against S3
    for (const [key, dbItem] of dbKeyMap.entries()) {
      const s3Item = s3KeyMap.get(key);
      if (s3Item || !storageConfigured) {
        // Matched
        const record = {
          storage_key: key,
          file_name: dbItem.file_name,
          submission_ref: dbItem.submission_ref,
          entity_ref: dbItem.entity_ref,
          applicant_name: dbItem.applicant_name,
          submission_status: dbItem.submission_status,
          file_size_bytes: dbItem.file_size_bytes,
          s3_size_bytes: s3Item?.size ?? dbItem.file_size_bytes,
        };
        if (dbItem.is_archived) {
          matchedArchived.push(record);
        } else {
          matchedActive.push(record);
        }
      } else {
        // In DB but not in S3
        missingS3Objects.push({
          storage_key: key,
          evidence_id: dbItem.evidence_id,
          submission_ref: dbItem.submission_ref,
          applicant_name: dbItem.applicant_name,
          file_name: dbItem.file_name,
          expected_size_bytes: dbItem.file_size_bytes,
          submission_status: dbItem.submission_status,
        });
      }
    }

    // Check S3 objects against DB
    if (storageConfigured) {
      for (const [key, s3Item] of s3KeyMap.entries()) {
        if (!dbKeyMap.has(key)) {
          orphanedS3Objects.push({
            storage_key: key,
            size_bytes: s3Item.size,
            last_modified: s3Item.lastModified,
            reason: 'Object exists in S3 bucket but has no corresponding record in payment_submission_evidence.',
          });
        }
      }
    }

    // 5. Build reconciliation audit report
    const report = {
      reconciliation_mode: 'REPORT_ONLY',
      execution_timestamp: timestamp,
      executed_by: callerIdentity,
      storage_status: storageStatus,
      target_bucket: config?.bucket || 'N/A',
      summary: {
        total_db_evidence_records: dbEvidenceList.length,
        total_s3_objects_scanned: s3Objects.length,
        matched_active_count: matchedActive.length,
        matched_archived_count: matchedArchived.length,
        orphaned_s3_objects_count: orphanedS3Objects.length,
        missing_s3_objects_count: missingS3Objects.length,
        automatic_deletions_executed: 0, // STRICTLY ZERO
        deletion_prohibited_guarantee: true,
      },
      matched_active: matchedActive,
      matched_archived: matchedArchived,
      orphaned_s3_objects: orphanedS3Objects,
      missing_s3_objects: missingS3Objects,
      safety_attestation: 'Zero automatic object deletions executed. All orphaned objects retained for manual administrative review.',
    };

    return NextResponse.json(report, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Reconciliation failed' }, { status: 500 });
  }
}
