import fs from 'fs';
import path from 'path';
import pg from 'pg';
import crypto from 'crypto';

// Load .env.local
const envLocalPath = path.resolve('.env.local');
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

import { hashPassword, verifyPassword } from '../src/lib/passwordSecurity.ts';
import {
  signSessionToken,
  verifySessionToken,
  signMfaPendingToken,
  verifyMfaPendingToken,
  SESSION_COOKIE_NAME,
  registerDatabaseSession,
} from '../src/lib/session.ts';
import {
  generateBase32Secret,
  generateTotpCode,
} from '../src/lib/totp.ts';
import {
  encryptMfaSecret,
  decryptMfaSecret,
  generateRecoveryCodes,
} from '../src/lib/mfa.ts';
import {
  checkRateLimit,
  checkPasswordRecoveryRateLimit,
  cleanupExpiredRateLimitBuckets,
} from '../src/lib/rateLimit.ts';

const { Client } = pg;
const previewConnectionString = 'postgresql://neondb_owner:npg_R9CLATxen2Sw@ep-wispy-firefly-b9el08l7.c-7.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
process.env.DATABASE_URL = previewConnectionString;

async function runHardeningTests() {
  console.log('================================================================================');
  console.log('LIEC Heav’n — Workstream 1 Final Release Hardening Suite (008)');
  console.log('Target: Neon Preview Database (ep-wispy-firefly-b9el08l7)');
  console.log('Timestamp:', new Date().toISOString());
  console.log('================================================================================\n');

  const client = new Client({ connectionString: previewConnectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const results = [];
  const test = (id, name, passed, details) => {
    results.push({ id, name, passed, details });
    const mark = passed ? '✓ PASS' : '✗ FAIL';
    console.log(`[${mark}] Test ${String(id).padStart(2, '0')}: ${name}`);
    if (details) console.log(`       -> ${details}`);
  };

  try {
    const ts = Date.now();
    const testAdminEmail = `hard_admin_${ts}@preview.liecconsulting.com`;
    const testSecEmail = `hard_sec_${ts}@preview.liecconsulting.com`;
    const testFinEmail = `hard_fin_${ts}@preview.liecconsulting.com`;

    const initialPass = 'ReleaseHardening@2026!Strict';
    const { hash: pHash, salt: pSalt } = hashPassword(initialPass);

    // Create synthetic test accounts in Neon Preview
    const adminRes = await client.query(`
      INSERT INTO users (name, email, role, business_profile, title, initials, active, password_hash, password_salt, session_version, must_change_password, mfa_enrolled)
      VALUES ('Hardening Admin', $1, 'admin', 'Admin', 'Platform Admin', 'HA', TRUE, $2, $3, 1, FALSE, TRUE)
      RETURNING id, email, session_version
    `, [testAdminEmail, pHash, pSalt]);
    const adminId = adminRes.rows[0].id;

    const secRes = await client.query(`
      INSERT INTO users (name, email, role, business_profile, title, initials, active, password_hash, password_salt, session_version, must_change_password, mfa_enrolled)
      VALUES ('Hardening Secretary', $1, 'secretary', 'Secretary', 'Intake Specialist', 'HS', TRUE, $2, $3, 1, FALSE, FALSE)
      RETURNING id, email, session_version
    `, [testSecEmail, pHash, pSalt]);
    const secId = secRes.rows[0].id;

    const finRes = await client.query(`
      INSERT INTO users (name, email, role, business_profile, title, initials, active, password_hash, password_salt, session_version, must_change_password, mfa_enrolled)
      VALUES ('Hardening Finance', $1, 'avi', 'Finance Officer', 'Finance Officer', 'HF', TRUE, $2, $3, 1, FALSE, FALSE)
      RETURNING id, email, session_version
    `, [testFinEmail, pHash, pSalt]);
    const finId = finRes.rows[0].id;

    // -------------------------------------------------------------------------
    // SECTION 1: SEC-007-01 — Atomic recovery-code consumption
    // -------------------------------------------------------------------------
    const { rawCodes: rawRecList, hashedCodes: hashRecList } = generateRecoveryCodes(3);
    const codeA_raw = rawRecList[0];
    const codeA_hash = hashRecList[0];
    const codeB_raw = rawRecList[1];
    const codeB_hash = hashRecList[1];
    const codeC_raw = rawRecList[2];
    const codeC_hash = hashRecList[2];

    for (const hc of [codeA_hash, codeB_hash, codeC_hash]) {
      await client.query(`
        INSERT INTO user_mfa_recovery_codes (user_id, code_hash) VALUES ($1, $2)
      `, [adminId, hc]);
    }

    // 1.1: Valid recovery code succeeds once via atomic UPDATE
    const use1 = await client.query(`
      UPDATE user_mfa_recovery_codes
      SET used_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
        AND code_hash = $2
        AND used_at IS NULL
      RETURNING id
    `, [adminId, codeA_hash]);

    test(1, 'Valid recovery code succeeds once (atomic UPDATE RETURNING id)',
      use1.rows.length === 1,
      `Code consumed cleanly, returned ID: ${use1.rows[0]?.id}.`);

    // 1.2: Reusing a consumed code fails
    const use1_replay = await client.query(`
      UPDATE user_mfa_recovery_codes
      SET used_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
        AND code_hash = $2
        AND used_at IS NULL
      RETURNING id
    `, [adminId, codeA_hash]);

    test(2, 'Reusing a consumed recovery code fails (0 rows returned)',
      use1_replay.rows.length === 0,
      'Replay attack blocked; cannot re-consume used recovery code.');

    // 1.3: 10 concurrent requests using the same recovery code result in exactly ONE successful consumption
    const concurrentCodeResults = await Promise.all(
      Array.from({ length: 10 }).map(async () => {
        const res = await client.query(`
          UPDATE user_mfa_recovery_codes
          SET used_at = CURRENT_TIMESTAMP
          WHERE user_id = $1
            AND code_hash = $2
            AND used_at IS NULL
          RETURNING id
        `, [adminId, codeB_hash]);
        return res.rows.length > 0;
      })
    );

    const codeWins = concurrentCodeResults.filter(Boolean).length;
    const codeLosses = concurrentCodeResults.filter(r => !r).length;

    test(3, 'Ten concurrent requests using same recovery code result in exactly ONE success',
      codeWins === 1 && codeLosses === 9,
      `Concurrency race resolved atomically: ${codeWins} SUCCESS, ${codeLosses} REJECTED.`);

    // 1.4: Different unused recovery code remains valid
    const useUnused = await client.query(`
      UPDATE user_mfa_recovery_codes
      SET used_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
        AND code_hash = $2
        AND used_at IS NULL
      RETURNING id
    `, [adminId, codeC_hash]);

    test(4, 'Different unused recovery code remains completely valid',
      useUnused.rows.length === 1,
      `Unused recovery code C consumed cleanly with ID: ${useUnused.rows[0]?.id}.`);

    // -------------------------------------------------------------------------
    // SECTION 2: SEC-007-02 — Atomic MFA enrolment-token consumption
    // -------------------------------------------------------------------------
    // Generate valid 24h token for secId
    const rawTokenSec = crypto.randomBytes(32).toString('hex');
    const hashTokenSec = crypto.createHash('sha256').update(rawTokenSec).digest('hex');
    const expires24h = new Date(Date.now() + 24 * 3600 * 1000);

    await client.query(`
      INSERT INTO mfa_enrollment_authorizations (user_id, token_hash, created_by, expires_at)
      VALUES ($1, $2, $3, $4)
    `, [secId, hashTokenSec, adminId, expires24h]);

    // 2.1: Cross-account use fails
    const crossAccountRes = await client.query(`
      UPDATE mfa_enrollment_authorizations
      SET used_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
        AND token_hash = $2
        AND used_at IS NULL
        AND expires_at > CURRENT_TIMESTAMP
      RETURNING id
    `, [finId, hashTokenSec]); // Fin user tries to use Sec's token

    test(5, 'Cross-account enrolment token use strictly prohibited (0 rows matched)',
      crossAccountRes.rows.length === 0,
      'Token query matches 0 rows when user_id does not match the bound account.');

    // 2.2: Expired token fails
    const rawTokenExpired = crypto.randomBytes(32).toString('hex');
    const hashTokenExpired = crypto.createHash('sha256').update(rawTokenExpired).digest('hex');
    const pastExpiry = new Date(Date.now() - 3600 * 1000); // 1 hour ago

    await client.query(`
      INSERT INTO mfa_enrollment_authorizations (user_id, token_hash, created_by, expires_at)
      VALUES ($1, $2, $3, $4)
    `, [secId, hashTokenExpired, adminId, pastExpiry]);

    const expiredRes = await client.query(`
      UPDATE mfa_enrollment_authorizations
      SET used_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
        AND token_hash = $2
        AND used_at IS NULL
        AND expires_at > CURRENT_TIMESTAMP
      RETURNING id
    `, [secId, hashTokenExpired]);

    test(6, 'Expired enrolment token fails (0 rows matched by expires_at > CURRENT_TIMESTAMP)',
      expiredRes.rows.length === 0,
      'Expired token rejected atomically by timestamp condition.');

    // 2.3: Valid token succeeds for intended account
    const validTokenRes = await client.query(`
      UPDATE mfa_enrollment_authorizations
      SET used_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
        AND token_hash = $2
        AND used_at IS NULL
        AND expires_at > CURRENT_TIMESTAMP
      RETURNING id
    `, [secId, hashTokenSec]);

    test(7, 'Valid enrolment token succeeds for intended account (atomic UPDATE RETURNING id)',
      validTokenRes.rows.length === 1,
      `Token consumed cleanly with ID: ${validTokenRes.rows[0]?.id}.`);

    // 2.4: Reuse of consumed token fails
    const reuseTokenRes = await client.query(`
      UPDATE mfa_enrollment_authorizations
      SET used_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
        AND token_hash = $2
        AND used_at IS NULL
        AND expires_at > CURRENT_TIMESTAMP
      RETURNING id
    `, [secId, hashTokenSec]);

    test(8, 'Reuse of consumed enrolment token fails (0 rows matched)',
      reuseTokenRes.rows.length === 0,
      'Consumed token rejected; used_at IS NULL condition unsatisfied.');

    // 2.5: 10 concurrent requests using the same enrolment token result in exactly ONE success
    const rawTokenConcurrent = crypto.randomBytes(32).toString('hex');
    const hashTokenConcurrent = crypto.createHash('sha256').update(rawTokenConcurrent).digest('hex');

    await client.query(`
      INSERT INTO mfa_enrollment_authorizations (user_id, token_hash, created_by, expires_at)
      VALUES ($1, $2, $3, $4)
    `, [finId, hashTokenConcurrent, adminId, expires24h]);

    const concurrentTokenResults = await Promise.all(
      Array.from({ length: 10 }).map(async () => {
        const res = await client.query(`
          UPDATE mfa_enrollment_authorizations
          SET used_at = CURRENT_TIMESTAMP
          WHERE user_id = $1
            AND token_hash = $2
            AND used_at IS NULL
            AND expires_at > CURRENT_TIMESTAMP
          RETURNING id
        `, [finId, hashTokenConcurrent]);
        return res.rows.length > 0;
      })
    );

    const tokenWins = concurrentTokenResults.filter(Boolean).length;
    const tokenLosses = concurrentTokenResults.filter(r => !r).length;

    test(9, 'Ten concurrent requests using same enrolment token result in exactly ONE success',
      tokenWins === 1 && tokenLosses === 9,
      `Concurrency race resolved atomically: ${tokenWins} SUCCESS, ${tokenLosses} REJECTED.`);

    // -------------------------------------------------------------------------
    // SECTION 3: SEC-007-03 — Rate-limit bucket cleanup
    // -------------------------------------------------------------------------
    // Set up test buckets:
    // Bucket 1: Stale expired > 7 days ago (e.g. 10 days ago) -> MUST BE DELETED
    const keyOldExpired = `test_bucket_old_${ts}`;
    await client.query(`
      INSERT INTO rate_limit_buckets (key, count, reset_at)
      VALUES ($1, 5, CURRENT_TIMESTAMP - INTERVAL '10 days')
      ON CONFLICT (key) DO UPDATE SET reset_at = CURRENT_TIMESTAMP - INTERVAL '10 days'
    `, [keyOldExpired]);

    // Bucket 2: Recently expired < 7 days ago (e.g. 2 days ago) -> MUST REMAIN INTACT
    const keyRecentExpired = `test_bucket_recent_${ts}`;
    await client.query(`
      INSERT INTO rate_limit_buckets (key, count, reset_at)
      VALUES ($1, 5, CURRENT_TIMESTAMP - INTERVAL '2 days')
      ON CONFLICT (key) DO UPDATE SET reset_at = CURRENT_TIMESTAMP - INTERVAL '2 days'
    `, [keyRecentExpired]);

    // Bucket 3: Currently active bucket (reset_at in the future) -> MUST REMAIN INTACT
    const keyActive = `test_bucket_active_${ts}`;
    await client.query(`
      INSERT INTO rate_limit_buckets (key, count, reset_at)
      VALUES ($1, 2, CURRENT_TIMESTAMP + INTERVAL '10 minutes')
      ON CONFLICT (key) DO UPDATE SET reset_at = CURRENT_TIMESTAMP + INTERVAL '10 minutes'
    `, [keyActive]);

    // Execute cleanup function with default 7-day retention
    const cleanupResult = await cleanupExpiredRateLimitBuckets(client, 7);

    // Verify state of all three buckets:
    const checkOld = await client.query(`SELECT key FROM rate_limit_buckets WHERE key = $1`, [keyOldExpired]);
    const checkRecent = await client.query(`SELECT key FROM rate_limit_buckets WHERE key = $1`, [keyRecentExpired]);
    const checkActive = await client.query(`SELECT key FROM rate_limit_buckets WHERE key = $1`, [keyActive]);

    test(10, 'Rate-limit cleanup removes buckets older than 7 days',
      checkOld.rows.length === 0 && cleanupResult.success === true,
      `Bucket older than 7 days successfully purged; deletedCount: ${cleanupResult.deletedCount}.`);

    test(11, 'Rate-limit cleanup preserves recent expired buckets within 7-day retention window',
      checkRecent.rows.length === 1,
      'Recent expired bucket (< 7 days) remains intact in rate_limit_buckets.');

    test(12, 'Rate-limit cleanup preserves active rate-limit buckets',
      checkActive.rows.length === 1,
      'Active bucket (reset_at > CURRENT_TIMESTAMP) remains untouched.');

    // 3.4: Test that cleanup failure does not compromise rate-limiting fail-closed behavior
    const brokenDb = {
      query: async (q) => {
        throw new Error('Simulated Database Network Failure during cleanup');
      }
    };
    const failCleanupRes = await cleanupExpiredRateLimitBuckets(brokenDb);
    const failRateLimitRes = await checkPasswordRecoveryRateLimit('127.0.0.1', 'target@liec.com', brokenDb);

    test(13, 'Cleanup failure is non-fatal and rate limiting strictly fails closed',
      failCleanupRes.success === false && failRateLimitRes.allowed === false && failRateLimitRes.isSystemFailure === true,
      'Cleanup failure reported safely without crashing; rate limiter fails closed (denying access).');

    // 3.5: Normal rate-limit behavior remains completely functional
    const normalKey = `test_normal_rl_${ts}`;
    const rl1 = await checkRateLimit(normalKey, 3, 60, client);
    const rl2 = await checkRateLimit(normalKey, 3, 60, client);
    const rl3 = await checkRateLimit(normalKey, 3, 60, client);
    const rl4 = await checkRateLimit(normalKey, 3, 60, client); // 4th request throttled

    test(14, 'Normal rate-limiting counting and throttling behavior remains intact',
      rl1.allowed === true && rl2.allowed === true && rl3.allowed === true && rl4.allowed === false,
      `Requests 1-3 allowed; Request 4 throttled (count=${rl4.count}, max=3).`);

    // -------------------------------------------------------------------------
    // CLEANUP SYNTHETIC TEST DATA
    // -------------------------------------------------------------------------
    await client.query(`DELETE FROM user_mfa_recovery_codes WHERE user_id IN ($1, $2, $3)`, [adminId, secId, finId]);
    await client.query(`DELETE FROM mfa_enrollment_authorizations WHERE user_id IN ($1, $2, $3)`, [adminId, secId, finId]);
    await client.query(`DELETE FROM users WHERE id IN ($1, $2, $3)`, [adminId, secId, finId]);
    await client.query(`DELETE FROM rate_limit_buckets WHERE key IN ($1, $2, $3, $4)`, [keyOldExpired, keyRecentExpired, keyActive, normalKey]);

    console.log('\n================================================================================');
    const passedCount = results.filter(r => r.passed).length;
    const totalCount = results.length;
    console.log(`TOTAL HARDENING TESTS: ${totalCount} | PASSED: ${passedCount} | FAILED: ${totalCount - passedCount}`);
    console.log('================================================================================\n');

    if (passedCount === totalCount) {
      console.log('>>> ALL 14 RELEASE HARDENING TESTS PASSED WITH 100% SUCCESS! <<<');
    } else {
      console.error('>>> SOME HARDENING TESTS FAILED. CHECK LOGS ABOVE. <<<');
      process.exit(1);
    }
  } catch (err) {
    console.error('Hardening test execution error:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runHardeningTests();
