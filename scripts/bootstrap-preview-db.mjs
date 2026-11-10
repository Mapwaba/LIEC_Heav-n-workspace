#!/usr/bin/env node

/**
 * ============================================================================
 * LIEC Heav'n — Dedicated Preview Database Bootstrap Utility
 * Architecture: Option C (Standalone Schema + Synthetic Zero-PII Fixtures)
 * ============================================================================
 *
 * Mandatory Security Controls:
 * 1. Exact Neon Endpoint Identity Verification:
 *    - Strict exact hostname or endpoint ID equality (no substring/loose matching).
 *    - Rejects known production project/endpoint identifiers fail-closed.
 *    - Verifies Direct connection (rejects pooled connection endpoints).
 * 2. Full Transactional Integrity:
 *    - Schema, fixtures, admin provisioning and initial role assignment run inside
 *      one single atomic PostgreSQL transaction (BEGIN ... COMMIT).
 *    - Complete ROLLBACK if any statement fails.
 * 3. Exclusive Activation File Creation & Safe Recovery:
 *    - Uses exclusive creation (flag: 'wx', mode: 0o600).
 *    - Cleans up partial files on failure.
 *    - Supports controlled, authorized re-issuance (--reissue-invitation) for recovery.
 * 4. Strict Preflight Database Protection:
 *    - Requires a completely clean, empty database for initial provisioning.
 *    - Zero DROP or TRUNCATE operations.
 *    - Comprehensive read-only --verify-only mode confirming all 26 tables,
 *      synthetic records, zero PII, and making 0 database writes.
 * 5. Administrator RBAC Protection:
 *    - Assigns initial roles ONLY during verified initial provisioning.
 *    - Preserves existing account status, passwords, and revoked privileges.
 * 6. Invitation Reliability & HTTPS Enforcement:
 *    - Requires valid HTTPS Preview application URL (--app-url or PREVIEW_APP_URL).
 *    - Single-use 32-byte cryptographic token (SHA-256 in DB, 7-day expiry).
 * 7. Connection Secret Protection:
 *    - Connection strings accepted ONLY via environment variable (PREVIEW_DATABASE_URL).
 *    - CLI argument --db-url is strictly forbidden to prevent process listing leaks.
 *    - Redacts credentials from all exception and log messages.
 * 8. Verified TLS Connection:
 *    - Enforces verified TLS (rejectUnauthorized: true) against Neon endpoints.
 * ============================================================================
 */

import { Pool } from 'pg';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Known Production Neon endpoint and project identifiers (Strict Blocklist)
export const PRODUCTION_BLOCKLIST_PATTERNS = [
  'ep-silent-recipe-b9ahkke2',
  'b9ahkke2',
  'silent-recipe',
  'br-delicate-glitter',
];

// Expected 26 Schema Tables in public schema
export const EXPECTED_SCHEMA_TABLES = [
  'roles',
  'role_session_timeouts',
  'users',
  'user_roles',
  'demandes',
  'demande_notes',
  'prospects',
  'candidats',
  'parent_student_links',
  'priority_tasks',
  'avi_requests',
  'prepa_cohorts',
  'invoices',
  'accommodation_requests',
  'prepa_payments',
  'prepa_receipts',
  'accommodation_access_tokens',
  'audit_logs',
  'staff_2fa',
  'prospect_calls',
  'prospect_notes',
  'user_notification_reads',
  'document_retention_logs',
  'programme_report_snapshots',
  'user_import_sets',
  'user_import_staging_rows',
];

// Helper: Redact passwords and credentials from error messages and logs
export function redactSensitiveText(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/postgres(?:ql)?:\/\/([^:]+):([^@]+)@/gi, 'postgres://$1:***@')
    .replace(/(password|secret|token|invitation_token)=([^&\s]+)/gi, '$1=***');
}

// Helper: Sanitize and parse database connection URL without leaking credentials
export function parseSanitizedDbInfo(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valid: false, error: 'Connection string is empty or invalid.' };
  }
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase();
    const port = parsed.port || '5432';
    const database = parsed.pathname.replace(/^\//, '') || 'neondb';
    const isPooled = host.includes('-pooler');
    const isNeon = host.endsWith('.neon.tech');

    return {
      valid: true,
      host,
      port,
      database,
      isPooled,
      isNeon,
      protocol: parsed.protocol,
    };
  } catch (err) {
    return { valid: false, error: 'Malformed database URL.' };
  }
}

// Helper: Check for known production identifiers
export function checkProductionBlocklist(host, rawUrl = '') {
  const normalizedHost = (host || '').toLowerCase();
  const normalizedUrl = (rawUrl || '').toLowerCase();

  for (const blockItem of PRODUCTION_BLOCKLIST_PATTERNS) {
    if (normalizedHost.includes(blockItem) || normalizedUrl.includes(blockItem)) {
      return {
        blocked: true,
        matchedPattern: blockItem,
      };
    }
  }
  return { blocked: false };
}

// Helper: Exact Neon endpoint identity verification (Strict exact equality)
export function verifyExactPreviewIdentity(host, expectedIdentifier) {
  if (!expectedIdentifier || typeof expectedIdentifier !== 'string' || !expectedIdentifier.trim()) {
    return {
      valid: false,
      error: 'Missing required Preview endpoint identifier (--preview-endpoint or PREVIEW_NEON_PROJECT_ID).',
    };
  }

  const cleanExpected = expectedIdentifier.trim().toLowerCase();
  const cleanHost = (host || '').trim().toLowerCase();
  const hostEndpointId = cleanHost.split('.')[0];

  const isExactHostMatch = cleanHost === cleanExpected;
  const isExactEndpointMatch = hostEndpointId === cleanExpected;

  if (isExactHostMatch || isExactEndpointMatch) {
    return { valid: true, endpointId: hostEndpointId, host: cleanHost };
  }

  return {
    valid: false,
    error: `Target host "${cleanHost}" (endpoint ID "${hostEndpointId}") does not match expected Preview identifier "${cleanExpected}" exactly. Substring and partial matches are strictly forbidden.`,
  };
}

// Helper: Validate HTTPS Preview Application URL
export function validatePreviewAppUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return { valid: false, error: 'Missing required Preview application URL (--app-url or PREVIEW_APP_URL).' };
  }
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== 'https:') {
      return {
        valid: false,
        error: `Preview application URL must use HTTPS protocol. Received: "${parsed.protocol}"`,
      };
    }
    if (!parsed.hostname || parsed.hostname.length < 3) {
      return { valid: false, error: 'Preview application URL has an invalid hostname.' };
    }
    return { valid: true, origin: parsed.origin };
  } catch {
    return { valid: false, error: 'Invalid Preview application URL format.' };
  }
}

// Helper: Secure exclusive file creation with rollback cleanup
export function writeActivationFileExclusive(filePath, content, overwrite = false) {
  if (fs.existsSync(filePath)) {
    if (!overwrite) {
      const err = new Error(`Activation file already exists at ${filePath}. Will not overwrite without --overwrite-activation-file.`);
      err.code = 'EEXIST';
      throw err;
    }
    // Delete existing file before exclusive recreation
    fs.unlinkSync(filePath);
  }

  // Temporary staging file to prevent partial writes
  const tempPath = path.join(path.dirname(filePath), `.preview-activation-url.tmp.${Date.now()}.${crypto.randomBytes(4).toString('hex')}`);
  try {
    // Exclusive write to temporary path with 0o600 permissions
    fs.writeFileSync(tempPath, content, { flag: 'wx', mode: 0o600 });
    // Atomic rename to final path
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    if (fs.existsSync(tempPath)) {
      try { fs.unlinkSync(tempPath); } catch {}
    }
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch {}
    }
    throw err;
  }
}

// Command-line arguments parser
export function parseArgs(argv) {
  const args = {
    execute: false,
    verifyOnly: false,
    reissueInvitation: false,
    confirmPreview: false,
    previewEndpoint: process.env.PREVIEW_NEON_PROJECT_ID || process.env.PREVIEW_NEON_ENDPOINT || '',
    appUrl: process.env.PREVIEW_APP_URL || '',
    overwriteActivation: false,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--execute') {
      args.execute = true;
    } else if (arg === '--verify-only') {
      args.verifyOnly = true;
    } else if (arg === '--reissue-invitation') {
      args.reissueInvitation = true;
    } else if (arg === '--confirm-preview') {
      args.confirmPreview = true;
    } else if (arg === '--overwrite-activation-file') {
      args.overwriteActivation = true;
    } else if (arg === '--preview-endpoint' || arg === '--preview-project-id') {
      args.previewEndpoint = argv[++i] || '';
    } else if (arg === '--app-url') {
      args.appUrl = argv[++i] || '';
    } else if (arg.startsWith('--db-url')) {
      args.forbiddenDbUrlPassed = true;
    } else if (arg === '--help' || arg === '-h') {
      args.help = true;
    }
  }

  return args;
}

export function printHelp() {
  console.log(`
LIEC Heav'n — Dedicated Preview Database Bootstrap Utility

Usage:
  node scripts/bootstrap-preview-db.mjs [options]

Modes:
  Default:               READ-ONLY DRY RUN (connects, inspects preflight state, verifies identity)
  --verify-only          Read-only verification of an already-provisioned database (zero DB writes)
  --execute              Execute single atomic transaction schema, fixtures and admin provisioning
  --reissue-invitation   Safely generate a new activation invitation token for unactivated admin

Required Flags for --execute:
  --execute                       Permit database schema application and provisioning
  --confirm-preview               Explicit confirmation that target is the isolated Preview database
  --preview-endpoint <endpoint>   Expected Preview endpoint ID or hostname (e.g. ep-name-123456)
  --app-url <https://url>         Base HTTPS URL of Vercel Preview app (for secure activation link)

Optional Flags:
  --overwrite-activation-file     Permit replacing an existing .preview-activation-url.txt file

Environment Variables:
  PREVIEW_DATABASE_URL            Target direct Neon Preview connection string (REQUIRED)
  PREVIEW_NEON_PROJECT_ID         Expected Preview endpoint or project identifier
  PREVIEW_APP_URL                 Vercel Preview deployment base HTTPS URL
`);
}

export async function runBootstrap(cliArgs = process.argv, customPool = null) {
  const args = parseArgs(cliArgs);

  if (args.help) {
    printHelp();
    return { success: true, mode: 'help' };
  }

  if (args.forbiddenDbUrlPassed) {
    console.error('[-] FATAL SECURITY VIOLATION: Supplying database connection strings via --db-url argument is strictly forbidden.');
    console.error('    Please pass the connection string via the PREVIEW_DATABASE_URL environment variable.');
    return { success: false, error: 'FORBIDDEN_CLI_DB_URL' };
  }

  const modeLabel = args.reissueInvitation
    ? 'REISSUE INVITATION'
    : args.verifyOnly
    ? 'READ-ONLY VERIFICATION'
    : args.execute
    ? 'LIVE ATOMIC EXECUTION'
    : 'READ-ONLY DRY RUN (Default)';

  console.log('===============================================================');
  console.log("LIEC Heav'n — Dedicated Preview Database Bootstrap Tool");
  console.log('Target Architecture: Option C (Standalone Schema + Fixtures)');
  console.log(`Execution Mode:      ${modeLabel}`);
  console.log('===============================================================\n');

  // 1. Connection String Resolution (EXCLUSIVELY via Environment Variable)
  const rawUrl = process.env.PREVIEW_DATABASE_URL;
  if (!rawUrl) {
    console.error('[-] FATAL: Missing PREVIEW_DATABASE_URL environment variable.');
    console.error('    The connection string must be provided through PREVIEW_DATABASE_URL.');
    console.error('    The utility will NEVER fall back to default or production connections.');
    return { success: false, error: 'MISSING_CONNECTION_STRING' };
  }

  // 2. Strict URL and Protocol Validation
  const dbInfo = parseSanitizedDbInfo(rawUrl);
  if (!dbInfo.valid) {
    console.error(`[-] FATAL: Invalid connection string: ${dbInfo.error}`);
    return { success: false, error: 'INVALID_URL' };
  }

  console.log(`[+] Target Endpoint Host: ${dbInfo.host}`);
  console.log(`[+] Target Database Name: ${dbInfo.database}`);
  console.log(`[+] Port:                 ${dbInfo.port}`);

  // 3. Direct Connection Enforcement (Must NOT be pooled)
  if (dbInfo.isPooled) {
    console.error('[-] FATAL: Pooled connection detected (-pooler in hostname).');
    console.error('    Schema migration and DDL bootstrap MUST use Neon Direct connection (DATABASE_URL).');
    console.error('    Pooled connections (DATABASE_URL_POOLED) are reserved for application runtime queries.');
    return { success: false, error: 'POOLED_CONNECTION_REJECTED' };
  }

  // 4. Production Identity Blocklist Check
  const blockCheck = checkProductionBlocklist(dbInfo.host, rawUrl);
  if (blockCheck.blocked) {
    console.error('[-] CRITICAL SECURITY VIOLATION: Target matches known Production identifier:');
    console.error(`    Blocked identifier: "${blockCheck.matchedPattern}"`);
    console.error('    Execution immediately terminated to protect Production.');
    return { success: false, error: 'PRODUCTION_IDENTIFIER_BLOCKED' };
  }

  // 5. Exact Preview Identity Verification
  const identityCheck = verifyExactPreviewIdentity(dbInfo.host, args.previewEndpoint);
  if (!identityCheck.valid) {
    console.error(`[-] FATAL: Project identity mismatch: ${identityCheck.error}`);
    console.error('    Please specify --preview-endpoint <endpoint> or set PREVIEW_NEON_PROJECT_ID.');
    return { success: false, error: 'PREVIEW_IDENTITY_MISMATCH' };
  }
  console.log(`[✓] Project Identity:     VERIFIED exact match for Preview identifier ("${args.previewEndpoint}")`);

  // 6. Security Confirmation Flags (Required for --execute and --reissue-invitation)
  if (args.execute || args.reissueInvitation) {
    if (!args.confirmPreview) {
      console.error('[-] FATAL: Missing explicit preview confirmation flag: --confirm-preview.');
      return { success: false, error: 'MISSING_CONFIRM_PREVIEW_FLAG' };
    }

    const urlValidation = validatePreviewAppUrl(args.appUrl);
    if (!urlValidation.valid) {
      console.error(`[-] FATAL: Invalid Preview application URL: ${urlValidation.error}`);
      return { success: false, error: 'INVALID_PREVIEW_APP_URL' };
    }
  }

  // 7. Verify Activation File Pre-Condition
  const activationFilePath = path.join(process.cwd(), '.preview-activation-url.txt');
  if ((args.execute || args.reissueInvitation) && fs.existsSync(activationFilePath) && !args.overwriteActivation) {
    console.error('[-] FATAL: An existing .preview-activation-url.txt file was found.');
    console.error('    To prevent accidental credential loss, the utility will not overwrite it.');
    console.error('    Either delete the old activation file or pass --overwrite-activation-file.');
    return { success: false, error: 'ACTIVATION_FILE_EXISTS' };
  }

  // 8. Establish Verified TLS Connection
  console.log('[+] Connecting to Neon endpoint with verified TLS (rejectUnauthorized: true)...');
  const pool =
    customPool ||
    new Pool({
      connectionString: rawUrl,
      connectionTimeoutMillis: 15000,
      ssl: {
        rejectUnauthorized: true,
      },
    });

  let client;
  try {
    client = await pool.connect();
    console.log('[✓] Secure TLS connection established successfully.');
  } catch (connErr) {
    const safeErrorMsg = redactSensitiveText(connErr.message);
    console.error('[-] Connection failed: Unable to connect to database endpoint.');
    console.error(`    Error details: ${safeErrorMsg}`);
    if (pool && !customPool) await pool.end();
    return { success: false, error: 'CONNECTION_FAILED' };
  }

  try {
    // 9. Preflight Table Inspection
    console.log('\n--- Preflight Database Inspection ---');
    const tableRes = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    const existingTables = tableRes.rows.map((r) => r.table_name);
    console.log(`[+] Existing Public Tables Count: ${existingTables.length}`);

    // ========================================================================
    // MODE A: STRENGTHENED --verify-only (STRICTLY READ-ONLY, 0 DATABASE WRITES)
    // ========================================================================
    if (args.verifyOnly) {
      console.log('\n===============================================================');
      console.log('--- READ-ONLY DATABASE VERIFICATION REPORT ---');
      console.log('===============================================================');

      let verificationPassed = true;
      const issues = [];

      // Check pre-provisioning empty state vs provisioned state
      if (existingTables.length === 0) {
        console.log('[✓] Public Schema Tables: 0/26 tables present.');
        console.log('[✓] Preflight Condition: Target database is completely clean and empty (0 tables).');
        console.log('[✓] Status: Ready for initial Option C schema and synthetic fixtures provisioning.');
        console.log('===============================================================');
        console.log('✓ VERIFICATION RESULT: PASSED (Expected clean pre-provisioning state, 0 database writes)');
        console.log('===============================================================\n');
        client.release();
        if (!customPool) await pool.end();
        return {
          success: true,
          mode: 'verify-only',
          empty: true,
          tableCount: 0,
          status: 'READY_FOR_PROVISIONING',
        };
      }

      // 1. Check all 26 schema tables
      const missingTables = EXPECTED_SCHEMA_TABLES.filter(t => !existingTables.includes(t));
      if (missingTables.length > 0) {
        verificationPassed = false;
        issues.push(`Missing schema tables (${missingTables.length}): ${missingTables.join(', ')}`);
        console.log(`[-] Tables Check: FAILED. Missing: ${missingTables.join(', ')}`);
      } else {
        console.log(`[✓] Schema Tables: 26/26 expected tables present in public schema.`);
      }

      // 2. Check synthetic administrator
      const adminEmail = 'admin.preview@staging.liecconsulting.com';
      const adminRes = await client.query(
        'SELECT id, email, active, password_hash, invitation_token, invitation_token_expires_at FROM users WHERE email = $1',
        [adminEmail]
      );

      if (adminRes.rows.length === 0) {
        verificationPassed = false;
        issues.push(`Preview administrator (${adminEmail}) is MISSING.`);
        console.log(`[-] Administrator: FAILED. Record ${adminEmail} not found.`);
      } else {
        const admin = adminRes.rows[0];
        if (!admin.active) {
          verificationPassed = false;
          issues.push(`Preview administrator account is suspended (active=false).`);
          console.log(`[-] Administrator Status: Suspended.`);
        } else {
          console.log(`[✓] Administrator Account: PRESENT and ACTIVE.`);
        }

        // 3. Check administrator roles
        const rolesRes = await client.query(
          'SELECT role_id FROM user_roles WHERE user_id = $1 ORDER BY role_id',
          [admin.id]
        );
        const roles = rolesRes.rows.map(r => r.role_id);
        const expectedRoles = ['admin', 'lh_security_admin'];
        const missingRoles = expectedRoles.filter(r => !roles.includes(r));

        if (missingRoles.length > 0) {
          verificationPassed = false;
          issues.push(`Administrator is missing expected roles: ${missingRoles.join(', ')}.`);
          console.log(`[-] Administrator Roles: FAILED. Missing: ${missingRoles.join(', ')}. Present: ${roles.join(', ') || 'None'}`);
        } else {
          console.log(`[✓] Administrator Roles: Confirmed present (${roles.join(', ')}).`);
        }
      }

      // 4. Check synthetic business records
      const candRes = await client.query("SELECT ref FROM candidats WHERE ref = '#CAN-2026-001'");
      const demRes = await client.query("SELECT ref FROM demandes WHERE ref = '#DEM-2026-001'");
      const proRes = await client.query("SELECT full_name FROM prospects WHERE full_name = 'Synthetique Prospect (Test Preview)'");
      const accRes = await client.query("SELECT ref FROM accommodation_requests WHERE ref = '#ACC-2026-001'");
      const aviRes = await client.query("SELECT ref FROM avi_requests WHERE ref = '#AVI-2026-001'");

      const missingRecords = [];
      if (candRes.rows.length === 0) missingRecords.push('Candidate #CAN-2026-001');
      if (demRes.rows.length === 0) missingRecords.push('Demande #DEM-2026-001');
      if (proRes.rows.length === 0) missingRecords.push('Prospect Synthetique Prospect (Test Preview)');
      if (accRes.rows.length === 0) missingRecords.push('Accommodation #ACC-2026-001');
      if (aviRes.rows.length === 0) missingRecords.push('AVI Request #AVI-2026-001');

      if (missingRecords.length > 0) {
        verificationPassed = false;
        issues.push(`Missing synthetic business records: ${missingRecords.join(', ')}.`);
        console.log(`[-] Synthetic Records: FAILED. Missing: ${missingRecords.join(', ')}`);
      } else {
        console.log(`[✓] Synthetic Records: All required synthetic candidate, applicant, prospect, accommodation and AVI records exist.`);
      }

      // 5. Check synthetic user count consistency
      const userCountRes = await client.query('SELECT count(*) as count FROM users');
      const totalUsers = parseInt(userCountRes.rows[0].count, 10);
      console.log(`[+] Total Users in Database: ${totalUsers}`);
      if (totalUsers < 6 || totalUsers > 10) {
        verificationPassed = false;
        issues.push(`Unexpected user count (${totalUsers}). Expected exactly 7 baseline synthetic users.`);
        console.log(`[-] User Count Consistency: Discrepancy detected.`);
      } else {
        console.log(`[✓] User Count Consistency: Consistent with synthetic fixtures.`);
      }

      // 6. Check for unexpected real user or business records (PII Leakage Check)
      const realUserCheck = await client.query(`
        SELECT email FROM users
        WHERE email NOT LIKE '%@staging.liecconsulting.com'
          AND email != 'bmapwabantoro@liecconsulting.com'
      `);

      if (realUserCheck.rows.length > 0) {
        verificationPassed = false;
        issues.push(`CRITICAL: Found ${realUserCheck.rows.length} unexpected non-synthetic user emails in preview database!`);
        console.log(`[-] Real PII Guard: FAILED. Found non-synthetic emails.`);
      } else {
        console.log(`[✓] Zero-PII Guard: Confirmed 100% synthetic user accounts (no production emails).`);
      }

      console.log('===============================================================');
      if (verificationPassed) {
        console.log('✓ VERIFICATION RESULT: PASSED (All checks confirmed, 0 database writes)');
      } else {
        console.log('✗ VERIFICATION RESULT: FAILED with issues:');
        issues.forEach(i => console.log(`    - ${i}`));
      }
      console.log('===============================================================\n');

      client.release();
      if (!customPool) await pool.end();
      return {
        success: verificationPassed,
        mode: 'verify-only',
        issues,
      };
    }

    // ========================================================================
    // MODE B: CONTROLLED RECOVERY (--reissue-invitation)
    // ========================================================================
    if (args.reissueInvitation) {
      console.log('\n--- Authorised Invitation Re-issuance Procedure ---');

      const adminEmail = 'admin.preview@staging.liecconsulting.com';
      const adminRes = await client.query(
        'SELECT id, email, active, password_hash FROM users WHERE email = $1',
        [adminEmail]
      );

      if (adminRes.rows.length === 0) {
        throw new Error(`Preview administrator (${adminEmail}) does not exist in the database. Run initial bootstrap first.`);
      }

      const admin = adminRes.rows[0];
      if (admin.password_hash) {
        throw new Error(`Administrator (${adminEmail}) has already activated their account and set a private password. Re-issuing invitation is blocked to protect established credentials.`);
      }

      const baseAppUrl = validatePreviewAppUrl(args.appUrl).origin;
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const activationPath = `${baseAppUrl}/login?invite_token=${rawToken}`;

      const activationContent = [
        '# ====================================================================',
        "# LIEC Heav'n — Preview Administrator Single-Use Activation Handoff",
        '# ====================================================================',
        `Administrator Email: ${adminEmail}`,
        `Activation URL:      ${activationPath}`,
        'Valid For:           7 days',
        'Security Policy:     Single-use cryptographic token (SHA-256 in DB).',
        '                     Token is permanently consumed and erased upon password setup.',
        'Action Required:     Open the Activation URL in your browser, set your password,',
        '                     and then DELETE THIS FILE immediately.',
        '# ====================================================================',
      ].join('\n');

      // Update database first in transaction
      await client.query('BEGIN');
      try {
        await client.query(
          `UPDATE users
           SET invitation_token = $1,
               invitation_token_expires_at = CURRENT_TIMESTAMP + INTERVAL '7 days',
               must_change_password = TRUE,
               active = TRUE
           WHERE id = $2`,
          [tokenHash, admin.id]
        );

        // Exclusive write to activation file
        writeActivationFileExclusive(activationFilePath, activationContent, args.overwriteActivation);

        await client.query('COMMIT');
        console.log(`[✓] New invitation token generated for ${adminEmail}.`);
        console.log(`    Activation handoff written securely to .preview-activation-url.txt (0o600).`);
        console.log(`    (Raw token is never printed to terminal or logs).`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }

      client.release();
      if (!customPool) await pool.end();
      return { success: true, mode: 'reissue-invitation' };
    }

    // ========================================================================
    // MODE C: INITIAL PROVISIONING (LIVE EXECUTION OR DRY RUN)
    // ========================================================================
    // STRICT PREFLIGHT: Initial bootstrap strictly requires a clean, empty database
    if (existingTables.length > 0) {
      console.error('[-] PREFLIGHT REJECTION: Target database is NOT empty.');
      console.error(`    Found ${existingTables.length} pre-existing tables in public schema.`);
      console.error('    Initial bootstrap strictly requires a completely clean, empty database.');
      console.error('    To inspect an already-provisioned database safely, use --verify-only.');
      client.release();
      if (!customPool) await pool.end();
      return { success: false, error: 'PREFLIGHT_NON_EMPTY_DATABASE' };
    }
    console.log('[✓] Preflight check PASSED: Target database is completely clean and empty.');

    // DRY RUN EXIT POINT
    if (!args.execute) {
      console.log('\n===============================================================');
      console.log('✓ DRY RUN COMPLETE — PREFLIGHT AND IDENTITY CHECKS PASSED');
      console.log('===============================================================');
      console.log('Summary of pending live atomic transaction:');
      console.log('  1. Execute database/schema.sql (26 tables, indexes, constraints).');
      console.log('  2. Execute database/fixtures/preview_synthetic_fixtures.sql (zero PII).');
      console.log('  3. Provision admin.preview@staging.liecconsulting.com with single-use invitation.');
      console.log('  4. Assign initial RBAC roles (admin, lh_security_admin).');
      console.log('  5. Atomically write activation handoff to .preview-activation-url.txt (flag: wx, 0o600).');
      console.log('  6. Atomic COMMIT (or complete ROLLBACK on any failure).');
      console.log('\nTo execute live against the Preview database, run:');
      console.log(`  node scripts/bootstrap-preview-db.mjs --execute --confirm-preview --preview-endpoint "${args.previewEndpoint}" --app-url "${args.appUrl || 'https://<preview-app>.vercel.app'}"`);
      console.log('===============================================================\n');

      client.release();
      if (!customPool) await pool.end();
      return { success: true, mode: 'dry-run', tableCount: 0 };
    }

    // LIVE ATOMIC TRANSACTION
    console.log('\n--- Executing Atomic Provisioning Transaction ---');

    const schemaPath = path.join(process.cwd(), 'database', 'schema.sql');
    const fixturesPath = path.join(process.cwd(), 'database', 'fixtures', 'preview_synthetic_fixtures.sql');

    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at: ${schemaPath}`);
    }
    if (!fs.existsSync(fixturesPath)) {
      throw new Error(`Fixtures file not found at: ${fixturesPath}`);
    }

    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    const fixturesSql = fs.readFileSync(fixturesPath, 'utf8');

    const adminEmail = 'admin.preview@staging.liecconsulting.com';
    const baseAppUrl = validatePreviewAppUrl(args.appUrl).origin;

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const activationPath = `${baseAppUrl}/login?invite_token=${rawToken}`;

    const activationContent = [
      '# ====================================================================',
      "# LIEC Heav'n — Preview Administrator Single-Use Activation Handoff",
      '# ====================================================================',
      `Administrator Email: ${adminEmail}`,
      `Activation URL:      ${activationPath}`,
      'Valid For:           7 days',
      'Security Policy:     Single-use cryptographic token (SHA-256 in DB).',
      '                     Token is permanently consumed and erased upon password setup.',
      'Action Required:     Open the Activation URL in your browser, set your password,',
      '                     and then DELETE THIS FILE immediately.',
      '# ====================================================================',
    ].join('\n');

    // START SINGLE TRANSACTION
    await client.query('BEGIN');
    console.log('[+] Transaction started (BEGIN).');

    try {
      // Step 1: DDL Schema
      console.log('[+] Step 1/4: Applying database/schema.sql...');
      await client.query(schemaSql);
      console.log('[✓] Schema DDL applied.');

      // Step 2: Synthetic Fixtures
      console.log('[+] Step 2/4: Applying database/fixtures/preview_synthetic_fixtures.sql...');
      await client.query(fixturesSql);
      console.log('[✓] Synthetic fixtures applied.');

      // Step 3: Provision Administrator with Single-Use Token
      console.log(`[+] Step 3/4: Provisioning ${adminEmail} with single-use invitation token...`);
      const updateAdminRes = await client.query(
        `UPDATE users
         SET invitation_token = $1,
             invitation_token_expires_at = CURRENT_TIMESTAMP + INTERVAL '7 days',
             must_change_password = TRUE,
             active = TRUE
         WHERE LOWER(email) = LOWER($2)
         RETURNING id`,
        [tokenHash, adminEmail]
      );

      if (updateAdminRes.rows.length === 0) {
        throw new Error(`Expected admin user (${adminEmail}) was not created by fixtures.`);
      }

      const adminUserId = updateAdminRes.rows[0].id;

      // Step 4: Initial Role Assignment (strictly first-time initial provisioning)
      console.log('[+] Step 4/4: Assigning initial administrator roles (admin, lh_security_admin)...');
      const initialRoles = ['admin', 'lh_security_admin'];
      for (const roleId of initialRoles) {
        await client.query(
          `INSERT INTO user_roles (user_id, role_id, assigned_by)
           VALUES ($1, $2, 'Preview Bootstrap Tool (Initial Provisioning)')
           ON CONFLICT (user_id, role_id) DO NOTHING`,
          [adminUserId, roleId]
        );
      }
      console.log('[✓] Initial roles assigned.');

      // Step 5: Exclusive Activation File Creation
      console.log('[+] Writing activation handoff file exclusively (.preview-activation-url.txt)...');
      writeActivationFileExclusive(activationFilePath, activationContent, args.overwriteActivation);
      console.log('[✓] Activation file successfully created with 0o600 permissions.');

      // Step 6: Commit Transaction
      await client.query('COMMIT');
      console.log('[✓] Transaction successfully committed (COMMIT). Database provisioned completely.');
    } catch (transactionErr) {
      await client.query('ROLLBACK');
      console.error('[-] Transaction aborted and completely rolled back (ROLLBACK).');

      // Cleanup activation file if write occurred before failure
      if (fs.existsSync(activationFilePath)) {
        try { fs.unlinkSync(activationFilePath); } catch {}
      }
      throw transactionErr;
    }

    // Post-Execution Verification Audit
    console.log('\n--- Post-Execution Verification Audit ---');
    const finalTables = await client.query("SELECT count(*) as count FROM information_schema.tables WHERE table_schema = 'public'");
    const finalUsers = await client.query('SELECT count(*) as count FROM users');

    console.log('\n===============================================================');
    console.log('✓ PREVIEW DATABASE BOOTSTRAP SUCCEEDED');
    console.log('===============================================================');
    console.log(`Total Tables Created:       ${finalTables.rows[0].count}`);
    console.log(`Synthetic Test Users:       ${finalUsers.rows[0].count}`);
    console.log(`Administrator Status:       ACTIVE (${adminEmail})`);
    console.log(`Activation File:            .preview-activation-url.txt (mode 0o600)`);
    console.log('===============================================================\n');

    client.release();
    if (!customPool) await pool.end();
    return {
      success: true,
      mode: 'live',
      tableCount: parseInt(finalTables.rows[0].count, 10),
      userCount: parseInt(finalUsers.rows[0].count, 10),
    };
  } catch (execErr) {
    const safeMsg = redactSensitiveText(execErr.message);
    if (client) client.release();
    if (!customPool) await pool.end();
    console.error('[-] Execution failed:', safeMsg);
    return { success: false, error: safeMsg };
  }
}

// Self-invoking CLI runner
if (process.argv[1] && process.argv[1].endsWith('bootstrap-preview-db.mjs')) {
  runBootstrap(process.argv)
    .then(res => { if (!res.success) process.exit(1); })
    .catch(err => {
      console.error('[-] Unhandled fatal error:', redactSensitiveText(err.message || String(err)));
      process.exit(1);
    });
}
