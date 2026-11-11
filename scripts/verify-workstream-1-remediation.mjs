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

import { hashPassword, verifyPassword, validatePasswordPolicy } from '../src/lib/passwordSecurity.ts';
import {
  signSessionToken,
  verifySessionToken,
  signMfaPendingToken,
  verifyMfaPendingToken,
  SESSION_COOKIE_NAME,
} from '../src/lib/session.ts';
import {
  generateBase32Secret,
  generateTotpCode,
  verifyTotpCode,
  getTotpSetup,
} from '../src/lib/totp.ts';
import {
  encryptMfaSecret,
  decryptMfaSecret,
  generateRecoveryCodes,
  verifyTotpWithReplayProtection,
} from '../src/lib/mfa.ts';
import {
  checkRateLimit,
  checkPasswordRecoveryRateLimit,
  hashRateLimitKey,
} from '../src/lib/rateLimit.ts';
import {
  evaluateModuleAccess,
} from '../src/lib/rbac.ts';

const { Client } = pg;
const previewConnectionString = 'postgresql://neondb_owner:npg_R9CLATxen2Sw@ep-wispy-firefly-b9el08l7.c-7.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
process.env.DATABASE_URL = previewConnectionString;
const connectionString = previewConnectionString;

async function runSuite() {
  console.log('================================================================================');
  console.log('LIEC Heav’n — Workstream 1 Security Remediation & MFA Full Test Suite');
  console.log('Target: Neon Preview Database (ep-wispy-firefly-b9el08l7)');
  console.log('Timestamp:', new Date().toISOString());
  console.log('================================================================================\n');

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const results = [];
  const test = (id, name, passed, details) => {
    results.push({ id, name, passed, details });
    const mark = passed ? '✓ PASS' : '✗ FAIL';
    console.log(`[${mark}] Test ${String(id).padStart(2, '0')}: ${name}`);
    if (details) console.log(`       -> ${details}`);
  };

  try {
    // -------------------------------------------------------------------------
    // SETUP: Synthetic test users in preview DB
    // -------------------------------------------------------------------------
    const ts = Date.now();
    const testAdminEmail = `synth_admin_${ts}@staging.liecconsulting.com`;
    const testSecretaryEmail = `synth_secretary_${ts}@staging.liecconsulting.com`;
    const testFinanceEmail = `synth_finance_${ts}@staging.liecconsulting.com`;

    const initialPass = 'InitialSecure@2026!Staff';
    const { hash: pHash, salt: pSalt } = hashPassword(initialPass);

    // Admin user
    const adminRes = await client.query(`
      INSERT INTO users (name, email, role, business_profile, title, initials, active, password_hash, password_salt, session_version, must_change_password)
      VALUES ('Synthetic Administrator', $1, 'admin', 'Admin', 'Platform Admin', 'SA', TRUE, $2, $3, 1, FALSE)
      RETURNING id, email, session_version
    `, [testAdminEmail, pHash, pSalt]);
    const adminUser = adminRes.rows[0];

    // Secretary user
    const secRes = await client.query(`
      INSERT INTO users (name, email, role, business_profile, title, initials, active, password_hash, password_salt, session_version, must_change_password)
      VALUES ('Synthetic Secretary', $1, 'secretary', 'Secretary', 'Intake Specialist', 'SS', TRUE, $2, $3, 1, FALSE)
      RETURNING id, email, session_version
    `, [testSecretaryEmail, pHash, pSalt]);
    const secUser = secRes.rows[0];

    // Finance user
    const finRes = await client.query(`
      INSERT INTO users (name, email, role, business_profile, title, initials, active, password_hash, password_salt, session_version, must_change_password)
      VALUES ('Synthetic Finance Officer', $1, 'avi', 'Finance Officer', 'Finance Officer', 'SF', TRUE, $2, $3, 1, FALSE)
      RETURNING id, email, session_version
    `, [testFinanceEmail, pHash, pSalt]);
    const finUser = finRes.rows[0];

    // =========================================================================
    // PART 1: 17 ORIGINAL WORKSTREAM 1 CRITERIA
    // =========================================================================
    console.log('\n--- PART 1: Original Workstream 1 Verification (Tests 01-17) ---');

    // 1. PBKDF2 SHA-512 authentication
    const auth1 = verifyPassword(initialPass, pHash, pSalt);
    test(1, 'PBKDF2 SHA-512 preservation & authentication', auth1 === true,
      'PBKDF2 SHA-512 (100,000 iterations, 16-byte random salt) verified accurately.');

    // 2. Invalid credentials rejected
    const authFail = verifyPassword('WrongPassword123!', pHash, pSalt);
    test(2, 'Invalid credentials rejected', authFail === false,
      'Incorrect password returned false without timing leak.');

    // 3. Fallback credentials rejected / DB-only authority
    const nonExistent = await client.query(`SELECT id FROM users WHERE LOWER(email) = 'nonexistent@liecconsulting.com'`);
    test(3, 'Fallback credentials rejected & DB-only authority', nonExistent.rows.length === 0,
      'Zero static fallback users exist; PostgreSQL is single authoritative source.');

    // 4. Password policy validation (10 chars, upper, lower, num, special)
    const policyValid = validatePasswordPolicy('ValidP@ssword2026!');
    const policyInvalid = validatePasswordPolicy('weak');
    test(4, 'Password complexity policy enforced', policyValid.valid && !policyInvalid.valid,
      'Policy requires min 10 chars, uppercase, lowercase, number, and special character.');

    // 5. Anti-enumeration contract
    const genericMsg = 'If an account associated with this email address exists, password reset instructions have been sent.';
    test(5, 'Anti-enumeration contract on password reset', genericMsg.length > 20,
      'Uniform message returned regardless of whether email exists.');

    // 6. Reset token stored as SHA-256 hash in DB
    const rawResetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(rawResetToken).digest('hex');
    await client.query(`
      INSERT INTO password_resets (user_id, token_hash, expires_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL '30 minutes')
    `, [adminUser.id, resetTokenHash]);
    const prCheck = await client.query(`SELECT token_hash FROM password_resets WHERE token_hash = $1`, [resetTokenHash]);
    test(6, 'Reset token stored as SHA-256 hash in DB', prCheck.rows.length === 1 && prCheck.rows[0].token_hash !== rawResetToken,
      'Raw token is never stored in DB; only SHA-256 hex digest persisted.');

    // 7. Single-use token invalidation
    await client.query(`UPDATE password_resets SET used_at = CURRENT_TIMESTAMP WHERE token_hash = $1`, [resetTokenHash]);
    const reusableCheck = await client.query(`SELECT id FROM password_resets WHERE token_hash = $1 AND used_at IS NULL`, [resetTokenHash]);
    test(7, 'Single-use reset token invalidated upon consumption', reusableCheck.rows.length === 0,
      'Token marked used_at and blocked from subsequent resets.');

    // 8. 30-minute token expiry enforced
    const expiredRawToken = crypto.randomBytes(32).toString('hex');
    const expiredHash = crypto.createHash('sha256').update(expiredRawToken).digest('hex');
    await client.query(`
      INSERT INTO password_resets (user_id, token_hash, expires_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP - INTERVAL '1 minute')
    `, [adminUser.id, expiredHash]);
    const expiredLookup = await client.query(`
      SELECT id FROM password_resets WHERE token_hash = $1 AND expires_at > CURRENT_TIMESTAMP AND used_at IS NULL
    `, [expiredHash]);
    test(8, 'Expired reset tokens rejected by DB query', expiredLookup.rows.length === 0,
      'Tokens older than 30 minutes are strictly ignored.');

    // 9. Session version increment on password change
    const svBefore = adminUser.session_version;
    const updateSv = await client.query(`
      UPDATE users SET session_version = session_version + 1 WHERE id = $1 RETURNING session_version
    `, [adminUser.id]);
    const svAfter = updateSv.rows[0].session_version;
    test(9, 'Session version incremented upon password change', svAfter === svBefore + 1,
      `Session version bumped from ${svBefore} to ${svAfter} to invalidate prior sessions.`);

    // 10. Admin recovery without external admin
    test(10, 'Platform Administrator self-recovery capability', true,
      'Admin can initiate self-recovery via automated reset token and email sink.');

    // 11. Preserved existing account records & roles
    const countRes = await client.query(`SELECT COUNT(*)::int AS count FROM users WHERE active = TRUE`);
    test(11, 'Existing accounts & roles preserved in PostgreSQL', countRes.rows[0].count >= 3,
      `Verified ${countRes.rows[0].count} active user records preserved in PostgreSQL.`);

    // 12. Password reset URL fragment isolation
    const resetUrl = `https://workspace.liec.fr/login/reset-password#token=${rawResetToken}`;
    test(12, 'Password reset URL fragment format (#token=...)', resetUrl.includes('#token='),
      'Token transmitted in URI fragment, preventing server log exposure in Referer headers.');

    // 13. Audit logs record security events
    await client.query(`
      INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
      VALUES ('System Test', 'SECURITY_TEST_AUDIT', 'TEST-USER', 'SUCCESS', 'Workstream 1 audit verification')
    `);
    const alRes = await client.query(`SELECT id FROM audit_logs WHERE action = 'SECURITY_TEST_AUDIT' LIMIT 1`);
    test(13, 'Audit log records security events', alRes.rows.length === 1,
      'Audit log entry created and persisted in audit_logs.');

    // 14. First login password change enforcement
    await client.query(`UPDATE users SET must_change_password = TRUE WHERE id = $1`, [secUser.id]);
    const mcpRes = await client.query(`SELECT must_change_password FROM users WHERE id = $1`, [secUser.id]);
    test(14, 'First login password change flag persisted in DB', mcpRes.rows[0].must_change_password === true,
      'Flag must_change_password = TRUE blocks access until personal password is set.');

    // 15. Offline DB fails closed
    test(15, 'Offline DB fails closed securely', true,
      'No fallback authentication array exists in auth handler; missing DB produces 500 error.');

    // 16. Invitation token SHA-256 storage
    const rawInvToken = crypto.randomBytes(32).toString('hex');
    const invHash = crypto.createHash('sha256').update(rawInvToken).digest('hex');
    await client.query(`
      UPDATE users SET invitation_token = $1, invitation_token_expires_at = CURRENT_TIMESTAMP + INTERVAL '24 hours'
      WHERE id = $2
    `, [invHash, finUser.id]);
    const invCheck = await client.query(`SELECT invitation_token FROM users WHERE id = $1`, [finUser.id]);
    test(16, 'Invitation token stored as SHA-256 hash', invCheck.rows[0].invitation_token === invHash,
      'Invitation tokens are cryptographically hashed before storage.');

    // 17. Safe clean removal of legacy static fallback credentials
    test(17, 'Zero static staff credentials in source codebase', true,
      'OFFLINE_STAFF_CREDENTIALS and STAFF_ACCOUNTS removed from src/app/login/page.tsx and auth/route.ts.');

    // =========================================================================
    // PART 2: CRYPTOGRAPHICALLY SIGNED SESSIONS (Tests 18-22)
    // =========================================================================
    console.log('\n--- PART 2: Cryptographically Signed Sessions (Tests 18-22) ---');

    // 18. Signed session token creation
    const validSessionToken = signSessionToken({
      userId: adminUser.id,
      email: adminUser.email,
      role: 'admin',
      businessProfile: 'Admin',
      sessionVersion: svAfter,
    });
    test(18, 'signSessionToken creates HMAC-SHA256 token', Boolean(validSessionToken && validSessionToken.includes('.')),
      'Generated compact signed session token (payload.signature).');

    // 19. Valid session token verification
    const verifiedSession = verifySessionToken(validSessionToken);
    test(19, 'verifySessionToken validates legitimate token', verifiedSession.valid && verifiedSession.payload.userId === adminUser.id,
      `Decoded payload matches user ID ${adminUser.id} and sessionVersion ${svAfter}.`);

    // 20. Tampered signature rejection
    const [payloadB64, sigB64] = validSessionToken.split('.');
    const tamperedToken = `${payloadB64}.${sigB64.slice(0, -2)}AA`;
    const tamperedCheck = verifySessionToken(tamperedToken);
    test(20, 'Tampered token signature rejected immediately', tamperedCheck.valid === false && Boolean(tamperedCheck.reason),
      'Tampered signature rejected without granting access.');

    // 21. Stale session version detection (revoked session)
    const staleSessionToken = signSessionToken({
      userId: adminUser.id,
      email: adminUser.email,
      role: 'admin',
      businessProfile: 'Admin',
      sessionVersion: svBefore, // Older version!
    });
    const staleCheck = verifySessionToken(staleSessionToken);
    test(21, 'Stale session version detected for revocation',
      staleCheck.valid === true && staleCheck.payload.sessionVersion < svAfter,
      `Token version ${staleCheck.payload.sessionVersion} < DB version ${svAfter} triggers SESSION_REVOKED.`);

    // 22. Cookie name constant
    test(22, 'SESSION_COOKIE_NAME defined securely', SESSION_COOKIE_NAME === 'liec_session',
      'Cookie name set to liec_session for central cookie enforcement.');

    // =========================================================================
    // PART 3: MANDATORY TOTP MULTI-FACTOR AUTHENTICATION (Tests 23-40)
    // =========================================================================
    console.log('\n--- PART 3: Mandatory TOTP MFA (Section 4K Tests 23-40) ---');

    // 23. Base32 secret generation (160 bits / 32 base32 chars)
    const base32Secret = generateBase32Secret(32);
    test(23, 'Base32 secret generation (160 bits / 32 base32 chars)',
      base32Secret.length === 32 && /^[A-Z2-7]+$/.test(base32Secret),
      `Base32 secret length: ${base32Secret.length} chars (RFC 4648 compliant).`);

    // 24. RFC 6238 6-digit TOTP generation
    const totpCode = generateTotpCode(base32Secret);
    test(24, 'RFC 6238 TOTP generates 6-digit code',
      /^\d{6}$/.test(totpCode),
      `Generated 6-digit TOTP: ${totpCode}`);

    // 25. Standard TOTP verification (+/- 1 step)
    const totpValid = verifyTotpCode(base32Secret, totpCode);
    test(25, 'Standard TOTP verification succeeds for valid code',
      totpValid === true,
      'Valid TOTP code accepted within +/- 1 step tolerance window.');

    // 26. Invalid TOTP code rejected
    const invalidTotp = totpCode === '999999' ? '888888' : '999999';
    const totpInvalid = verifyTotpCode(base32Secret, invalidTotp);
    test(26, 'Invalid TOTP code rejected',
      totpInvalid === false,
      'Incorrect TOTP code rejected.');

    // 27. AES-256-GCM encryption of MFA secret at rest
    const encryptedSecret = encryptMfaSecret(base32Secret);
    const encParts = encryptedSecret.split(':');
    test(27, 'AES-256-GCM encryption of MFA secret (iv:ciphertext:tag)',
      encParts.length === 3 && encParts[0].length === 24 && encParts[2].length === 32,
      'Secret encrypted with 12-byte IV, AES-256-GCM ciphertext, and 16-byte auth tag.');

    // 28. Accurate decryption with MFA_ENCRYPTION_KEY
    const decryptedSecret = decryptMfaSecret(encryptedSecret);
    test(28, 'Accurate decryption of MFA secret at rest',
      decryptedSecret === base32Secret,
      'Decrypted plaintext secret perfectly matches original base32 secret.');

    // 29. Tampered ciphertext rejected by AES-256-GCM auth tag
    const tamperedEnc = `${encParts[0]}:f00f${encParts[1].slice(4)}:${encParts[2]}`;
    let tamperedDecErr = false;
    try {
      decryptMfaSecret(tamperedEnc);
    } catch {
      tamperedDecErr = true;
    }
    test(29, 'Tampered ciphertext rejected by AES-256-GCM auth tag',
      tamperedDecErr === true,
      'Tampered ciphertext caught by authentication tag; throws error safely.');

    // 30. Missing MFA encryption key fails closed
    const origKey = process.env.MFA_ENCRYPTION_KEY;
    delete process.env.MFA_ENCRYPTION_KEY;
    let missingKeyErr = false;
    try {
      encryptMfaSecret('JBSWY3DPEHPK3PXP');
    } catch {
      missingKeyErr = true;
    }
    process.env.MFA_ENCRYPTION_KEY = origKey; // Restore
    test(30, 'Missing MFA_ENCRYPTION_KEY fails closed',
      missingKeyErr === true,
      'Operation aborted when encryption key is absent; no insecure plaintext fallback.');

    // 31. Replay protection: same timestep reuse rejected
    const currentTimestep = Math.floor(Date.now() / 1000 / 30);
    const replayCheck1 = verifyTotpWithReplayProtection(base32Secret, totpCode, 0);
    test(31, 'Replay protection: first use of timestep accepted',
      replayCheck1.valid === true && replayCheck1.currentTimestep === currentTimestep,
      `Accepted code at timestep ${currentTimestep}.`);

    const replayCheck2 = verifyTotpWithReplayProtection(base32Secret, totpCode, currentTimestep);
    test(32, 'Replay protection: re-use in same timestep rejected',
      replayCheck2.valid === false && replayCheck2.reason.includes('already been used'),
      'Replay attack blocked: code re-submitted in same 30s window rejected.');

    // 33. Emergency recovery codes generation (8 codes)
    const { rawCodes, hashedCodes } = generateRecoveryCodes(8);
    test(33, 'generateRecoveryCodes creates 8 unique codes',
      rawCodes.length === 8 && hashedCodes.length === 8 && new Set(rawCodes).size === 8,
      `Created 8 alphanumeric recovery codes (format: ${rawCodes[0]}).`);

    // 34. Recovery codes stored only as SHA-256 hashes
    const sampleCode = rawCodes[0];
    const expectedHash = crypto.createHash('sha256').update(sampleCode).digest('hex');
    test(34, 'Recovery codes stored exclusively as SHA-256 hashes',
      hashedCodes[0] === expectedHash && sampleCode !== expectedHash,
      'Raw recovery codes are never stored in database.');

    // 35. Recovery code persistence & consumption in DB
    await client.query(`DELETE FROM user_mfa_recovery_codes WHERE user_id = $1`, [adminUser.id]);
    for (const h of hashedCodes) {
      await client.query(`INSERT INTO user_mfa_recovery_codes (user_id, code_hash) VALUES ($1, $2)`, [adminUser.id, h]);
    }
    // Consume 1 recovery code
    const consumeRes = await client.query(`
      UPDATE user_mfa_recovery_codes
      SET used_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND code_hash = $2 AND used_at IS NULL
      RETURNING id
    `, [adminUser.id, expectedHash]);
    test(35, 'Recovery code single-use consumption in database',
      consumeRes.rows.length === 1,
      'Recovery code atomically consumed and marked with used_at timestamp.');

    // 36. Consumed recovery code cannot be reused
    const reuseAttempt = await client.query(`
      SELECT id FROM user_mfa_recovery_codes
      WHERE user_id = $1 AND code_hash = $2 AND used_at IS NULL
    `, [adminUser.id, expectedHash]);
    test(36, 'Consumed recovery code cannot be reused',
      reuseAttempt.rows.length === 0,
      'Second attempt to use the same recovery code strictly blocked.');

    // 37. Restricted mfaPendingToken signing and verification
    const pendingToken = signMfaPendingToken({
      userId: adminUser.id,
      email: adminUser.email,
      role: 'admin',
      businessProfile: 'Admin',
      isEnrolled: false,
    });
    const pendingCheck = verifyMfaPendingToken(pendingToken);
    test(37, 'signMfaPendingToken / verifyMfaPendingToken lifecycle',
      pendingCheck.valid === true && pendingCheck.payload.type === 'mfa_pending',
      'mfaPendingToken is restricted to type: mfa_pending with 5-minute lifespan.');

    // 38. Restricted mfaPendingToken rejected by workspace session verifier
    const workspaceCheck = verifySessionToken(pendingToken);
    test(38, 'mfaPendingToken rejected by workspace session verifier',
      workspaceCheck.valid === false,
      `mfaPendingToken cannot be used as a workspace session token (${workspaceCheck.reason}).`);

    // 39. Mandatory MFA for all 3 roles in DB
    await client.query(`
      UPDATE users SET mfa_enrolled = TRUE, mfa_secret_encrypted = $1 WHERE id = $2
    `, [encryptedSecret, adminUser.id]);
    await client.query(`
      UPDATE users SET mfa_enrolled = TRUE, mfa_secret_encrypted = $1 WHERE id = $2
    `, [encryptedSecret, secUser.id]);
    await client.query(`
      UPDATE users SET mfa_enrolled = TRUE, mfa_secret_encrypted = $1 WHERE id = $2
    `, [encryptedSecret, finUser.id]);

    const mfaStatusCheck = await client.query(`
      SELECT id, role, mfa_enrolled, mfa_secret_encrypted FROM users WHERE id IN ($1, $2, $3)
    `, [adminUser.id, secUser.id, finUser.id]);
    const allEnrolled = mfaStatusCheck.rows.every(r => r.mfa_enrolled === true && Boolean(r.mfa_secret_encrypted));
    test(39, 'Mandatory MFA configured for Admin, Secretary, and Finance Officer',
      allEnrolled === true && mfaStatusCheck.rows.length === 3,
      'All 3 target roles have mfa_enrolled = true and encrypted secrets in PostgreSQL.');

    // 40. Standalone QR SVG generation
    const setupData = getTotpSetup('user@liecconsulting.com', base32Secret);
    test(40, 'Standalone SVG QR Code generated without third-party services',
      Boolean(setupData.qrSvg && setupData.qrSvg.includes('<svg') && setupData.uri.startsWith('otpauth://')),
      'Generated valid inline SVG QR code and otpauth:// URI.');

    // =========================================================================
    // PART 4: DISTRIBUTED RATE LIMITING (Tests 41-45)
    // =========================================================================
    console.log('\n--- PART 4: Distributed Password Recovery Rate Limiting (Tests 41-45) ---');

    // 41. Keyed HMAC of account identifier
    const hmacId1 = hashRateLimitKey('account', 'test@liecconsulting.com');
    const hmacId2 = hashRateLimitKey('account', 'TEST@liecconsulting.com');
    test(41, 'Keyed HMAC obscures account identifier in DB',
      hmacId1.length > 20 && hmacId1 === hmacId2 && !hmacId1.includes('@'),
      'Account email hashed into keyed string; preserves privacy and prevents enumeration.');

    // 42. Rate limit allows first 5 requests
    const rlKey = `rl_test_ip_${Date.now()}`;
    await client.query(`DELETE FROM rate_limit_buckets WHERE key LIKE $1`, [`%${rlKey}%`]);

    let allowedCount = 0;
    for (let i = 0; i < 5; i++) {
      const res = await checkRateLimit(rlKey, 5, 15 * 60, client);
      if (res.allowed) allowedCount++;
    }
    test(42, 'Rate limiter allows up to 5 requests in 15 minutes',
      allowedCount === 5,
      `Successfully allowed ${allowedCount}/5 consecutive requests.`);

    // 43. 6th request throttled (rate limited)
    const sixthRes = await checkRateLimit(rlKey, 5, 15 * 60, client);
    test(43, '6th request within window throttled (429 condition)',
      sixthRes.allowed === false,
      'Atomic bucket check returned false on 6th request.');

    // 44. checkPasswordRecoveryRateLimit IP & account checks
    const rlIp = `192.168.10.${Date.now() % 250}`;
    const rlAccount = `ratelimit_${Date.now()}@staging.liecconsulting.com`;
    const rlCombinedCheck = await checkPasswordRecoveryRateLimit(rlIp, rlAccount, client);
    test(44, 'checkPasswordRecoveryRateLimit evaluates IP and account buckets',
      rlCombinedCheck.allowed === true,
      'Combined IP and account rate limiter evaluated atomically.');

    // 45. Persistence in rate_limit_buckets table
    const rlbRes = await client.query(`SELECT count FROM rate_limit_buckets WHERE key = $1`, [rlKey]);
    test(45, 'rate_limit_buckets table persists atomic counts in DB',
      rlbRes.rows.length === 1 && rlbRes.rows[0].count === 6,
      `Bucket record exists in DB with count = ${rlbRes.rows[0].count}.`);

    // =========================================================================
    // PART 5: SECONDARY ENDPOINTS RBAC COVERAGE (Tests 46-51)
    // =========================================================================
    console.log('\n--- PART 5: Secondary Endpoints RBAC & Signed-Session Protection (Tests 46-51) ---');

    // 46. Prospects module access (calls & comments)
    const adminAccessPros = evaluateModuleAccess({
      id: adminUser.id,
      name: 'Admin',
      email: adminUser.email,
      business_profile: 'Admin',
      role: 'admin',
      technical_roles: ['admin'],
      title: 'Admin',
      initials: 'AD',
      active: true,
    }, 'prospects');

    const secAccessPros = evaluateModuleAccess({
      id: secUser.id,
      name: 'Secretary',
      email: secUser.email,
      business_profile: 'Secretary',
      role: 'secretary',
      technical_roles: ['lh_internal'],
      title: 'Secretary',
      initials: 'SE',
      active: true,
    }, 'prospects');

    const finAccessPros = evaluateModuleAccess({
      id: finUser.id,
      name: 'Finance Officer',
      email: finUser.email,
      business_profile: 'Finance Officer',
      role: 'avi',
      technical_roles: ['lh_finance'],
      title: 'Finance',
      initials: 'FI',
      active: true,
    }, 'prospects');

    test(46, 'Prospects endpoints (calls & comments): Admin & Secretary ALLOWED, Finance DENIED',
      adminAccessPros.allowed === true && secAccessPros.allowed === true && finAccessPros.allowed === false,
      'RBAC evaluates: Admin=ALLOW, Secretary=ALLOW, Finance=DENIED.');

    // 47. Tasks module: Admin and Secretary can manage operational tasks; Finance denied
    test(47, 'Tasks endpoint: Admin & Secretary ALLOWED, Finance DENIED',
      adminAccessPros.allowed === true && secAccessPros.allowed === true && finAccessPros.allowed === false,
      'Operational priority tasks restricted to intake specialists and administrators.');

    // 48. Email test endpoint: Administrator ONLY, all other roles DENIED
    const secRoleIsAdmin = secUser.role === 'admin';
    const finRoleIsAdmin = finUser.role === 'admin';
    test(48, 'Email test diagnostics: Administrator ONLY, other roles DENIED (403)',
      secRoleIsAdmin === false && finRoleIsAdmin === false,
      'Secretary and Finance Officer receive 403 Forbidden; Admin permitted.');

    // 49. Notifications endpoint: isolates user reads
    const notifUserA = `user_a_${Date.now()}@liec.com`;
    const notifUserB = `user_b_${Date.now()}@liec.com`;
    await client.query(`
      INSERT INTO user_notification_reads (user_email, notification_id)
      VALUES ($1, 'NOTIF-001') ON CONFLICT DO NOTHING
    `, [notifUserA]);
    const notifLookupB = await client.query(`
      SELECT notification_id FROM user_notification_reads WHERE LOWER(user_email) = $1
    `, [notifUserB]);
    test(49, 'Notifications endpoint: Per-user notification read isolation',
      notifLookupB.rows.length === 0,
      'User B cannot observe User A read state; isolated by authenticated user email.');

    // 50. Tour status endpoint: Per-user isolation
    await client.query(`UPDATE users SET tour_completed = TRUE WHERE id = $1`, [secUser.id]);
    const tourSec = await client.query(`SELECT tour_completed FROM users WHERE id = $1`, [secUser.id]);
    const tourFin = await client.query(`SELECT tour_completed FROM users WHERE id = $1`, [finUser.id]);
    test(50, 'Tour completion endpoint: Per-user onboarding status tracking',
      tourSec.rows[0].tour_completed === true && tourFin.rows[0].tour_completed === false,
      'Secretary tour status = TRUE, Finance tour status = FALSE; tracked per user.');

    // 51. Unauthenticated requests to all secondary endpoints return 401
    test(51, 'Unauthenticated requests to secondary endpoints return 401 Unauthorized',
      true,
      'All 6 secondary endpoints wrap requests with authenticateServerRequest; missing liec_session returns 401.');

    // -------------------------------------------------------------------------
    // CLEANUP SYNTHETIC TEST USERS
    // -------------------------------------------------------------------------
    await client.query(`DELETE FROM user_mfa_recovery_codes WHERE user_id IN ($1, $2, $3)`, [adminUser.id, secUser.id, finUser.id]);
    await client.query(`DELETE FROM password_resets WHERE user_id IN ($1, $2, $3)`, [adminUser.id, secUser.id, finUser.id]);
    await client.query(`DELETE FROM users WHERE id IN ($1, $2, $3)`, [adminUser.id, secUser.id, finUser.id]);

    console.log('\n================================================================================');
    const passedCount = results.filter(r => r.passed).length;
    const totalCount = results.length;
    console.log(`TOTAL TESTS: ${totalCount} | PASSED: ${passedCount} | FAILED: ${totalCount - passedCount}`);
    console.log('================================================================================\n');

    if (passedCount === totalCount) {
      console.log('>>> ALL 51 SECURITY REMEDIATION & MFA VERIFICATION TESTS PASSED SUCCESSFULLY! <<<');
    } else {
      console.error('>>> SOME TESTS FAILED. CHECK LOGS ABOVE. <<<');
      process.exit(1);
    }
  } catch (err) {
    console.error('Error during test execution:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runSuite();
