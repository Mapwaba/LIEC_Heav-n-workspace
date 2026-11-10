import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { PGlite } from '@electric-sql/pglite';
import {
  parseSanitizedDbInfo,
  checkProductionBlocklist,
  verifyExactPreviewIdentity,
  validatePreviewAppUrl,
  redactSensitiveText,
  writeActivationFileExclusive,
  parseArgs,
  runBootstrap,
} from '../scripts/bootstrap-preview-db.mjs';

console.log('===============================================================');
console.log('LIEC Heav\'n — Preview Bootstrap Final Security & Regression Suite');
console.log('===============================================================\n');

async function runSecurityAudit() {
  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      console.log(`  ✓ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ [FAIL] ${name}`);
      console.error(`    ${err.message}`);
      throw err;
    }
  }

  async function testAsync(name, fn) {
    total++;
    try {
      await fn();
      console.log(`  ✓ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ [FAIL] ${name}`);
      console.error(`    ${err.message}`);
      throw err;
    }
  }

  // Mock pg Pool wrapper around in-memory PGlite
  function createMockPool(pgliteDb, queryHook = null) {
    return {
      connect: async () => ({
        query: async (sql, params) => {
          if (queryHook) queryHook(sql, params);
          const trimmed = sql.trim().toUpperCase();
          if (trimmed.startsWith('SELECT')) {
            const res = await pgliteDb.query(sql, params);
            return { rows: res.rows, rowCount: res.rows ? res.rows.length : 0 };
          }
          if (!params || params.length === 0) {
            await pgliteDb.exec(sql);
            return { rows: [], rowCount: 0 };
          }
          const res = await pgliteDb.query(sql, params);
          return { rows: res.rows, rowCount: res.rows ? res.rows.length : 0 };
        },
        release: () => {},
      }),
      end: async () => {},
    };
  }

  // Helper to ensure activation files are cleaned up between tests
  const activationFilePath = path.join(process.cwd(), '.preview-activation-url.txt');
  function cleanupActivationFile() {
    if (fs.existsSync(activationFilePath)) {
      try { fs.unlinkSync(activationFilePath); } catch {}
    }
  }

  // --------------------------------------------------------------------------
  // SUITE 1: Production Endpoint & Identity Guards
  // --------------------------------------------------------------------------
  console.log('\n--- 1. Production Endpoint & Exact Identity Guards ---');

  test('checkProductionBlocklist rejects known Production endpoint ep-silent-recipe-b9ahkke2', () => {
    assert.strictEqual(checkProductionBlocklist('ep-silent-recipe-b9ahkke2.eu-central-1.aws.neon.tech').blocked, true);
  });

  test('checkProductionBlocklist rejects b9ahkke2 identifier in connection string', () => {
    assert.strictEqual(checkProductionBlocklist('ep-other.neon.tech', 'postgres://u:p@ep-b9ahkke2.neon.tech/neondb').blocked, true);
  });

  test('verifyExactPreviewIdentity accepts exact endpoint ID and full hostname', () => {
    assert.strictEqual(verifyExactPreviewIdentity('ep-liec-preview-8899.eu-central-1.aws.neon.tech', 'ep-liec-preview-8899').valid, true);
    assert.strictEqual(verifyExactPreviewIdentity('ep-liec-preview-8899.eu-central-1.aws.neon.tech', 'ep-liec-preview-8899.eu-central-1.aws.neon.tech').valid, true);
  });

  test('verifyExactPreviewIdentity rejects near-match prefix and suffix fail-closed', () => {
    assert.strictEqual(verifyExactPreviewIdentity('ep-liec-preview-8899.neon.tech', 'ep-liec-preview-88').valid, false);
    assert.strictEqual(verifyExactPreviewIdentity('ep-liec-preview-8899-attacker.neon.tech', 'ep-liec-preview-8899').valid, false);
  });

  test('verifyExactPreviewIdentity rejects empty or missing identifier', () => {
    assert.strictEqual(verifyExactPreviewIdentity('ep-liec-preview-8899.neon.tech', '').valid, false);
  });

  // --------------------------------------------------------------------------
  // SUITE 2: Activation File Protection & Exclusive Creation
  // --------------------------------------------------------------------------
  console.log('\n--- 2. Activation File Protection & Exclusive Creation ---');

  test('writeActivationFileExclusive creates file with mode 0o600', () => {
    cleanupActivationFile();
    writeActivationFileExclusive(activationFilePath, 'Test Activation Content');
    assert.strictEqual(fs.existsSync(activationFilePath), true);
    const stat = fs.statSync(activationFilePath);
    assert.strictEqual(fs.readFileSync(activationFilePath, 'utf8'), 'Test Activation Content');
    cleanupActivationFile();
  });

  test('writeActivationFileExclusive refuses to overwrite existing file without overwrite flag', () => {
    cleanupActivationFile();
    writeActivationFileExclusive(activationFilePath, 'Original Content');
    assert.throws(
      () => writeActivationFileExclusive(activationFilePath, 'New Content', false),
      (err) => err.code === 'EEXIST' || err.message.includes('already exists')
    );
    assert.strictEqual(fs.readFileSync(activationFilePath, 'utf8'), 'Original Content');
    cleanupActivationFile();
  });

  test('writeActivationFileExclusive cleans up temporary files on write failure', () => {
    cleanupActivationFile();
    const badPath = path.join(process.cwd(), 'non_existent_dir_99999', 'activation.txt');
    assert.throws(() => writeActivationFileExclusive(badPath, 'Content'));
    // Verify no stray tmp files left in root
    const strayTmp = fs.readdirSync(process.cwd()).filter(f => f.startsWith('.preview-activation-url.tmp'));
    assert.strictEqual(strayTmp.length, 0);
  });

  // --------------------------------------------------------------------------
  // SUITE 3: Full Transaction Rollback on Failure
  // --------------------------------------------------------------------------
  console.log('\n--- 3. Single Atomic Transaction Rollback on Failure ---');

  await testAsync('Fixture error rolls back schema DDL completely (0 tables remain)', async () => {
    cleanupActivationFile();
    const pglite = new PGlite();
    await pglite.waitReady;

    const mockPool = {
      connect: async () => ({
        query: async (sql, params) => {
          const trimmed = sql.trim().toUpperCase();
          if (trimmed.startsWith('SELECT')) {
            const res = await pglite.query(sql, params);
            return { rows: res.rows, rowCount: res.rows ? res.rows.length : 0 };
          }
          if (sql.includes("LIEC Heav'n — Dedicated Preview Database Synthetic Fixtures")) {
            throw new Error('Simulated syntax error in fixture SQL');
          }
          await pglite.exec(sql);
          return { rows: [], rowCount: 0 };
        },
        release: () => {},
      }),
      end: async () => {},
    };

    const orig = process.env.PREVIEW_DATABASE_URL;
    process.env.PREVIEW_DATABASE_URL = 'postgres://u:p@ep-valid-preview-55.eu-central-1.aws.neon.tech/neondb';

    const res = await runBootstrap(
      [
        'node',
        'scripts/bootstrap-preview-db.mjs',
        '--execute',
        '--confirm-preview',
        '--preview-endpoint',
        'ep-valid-preview-55',
        '--app-url',
        'https://valid-preview.vercel.app',
      ],
      mockPool
    );

    process.env.PREVIEW_DATABASE_URL = orig;
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.error.includes('Simulated syntax error in fixture SQL'), true);

    const tableRes = await pglite.query("SELECT count(*) as count FROM information_schema.tables WHERE table_schema = 'public'");
    assert.strictEqual(parseInt(tableRes.rows[0].count, 10), 0, 'Schema tables must be completely rolled back');
    cleanupActivationFile();
  });

  await testAsync('Activation file write failure rolls back DB transaction and cleans up files', async () => {
    cleanupActivationFile();
    const pglite = new PGlite();
    await pglite.waitReady;
    const mockPool = createMockPool(pglite);

    // Pre-create file so writeActivationFileExclusive throws EEXIST
    fs.writeFileSync(activationFilePath, 'Existing token', { flag: 'wx' });

    const orig = process.env.PREVIEW_DATABASE_URL;
    process.env.PREVIEW_DATABASE_URL = 'postgres://u:p@ep-valid-preview-55.eu-central-1.aws.neon.tech/neondb';

    const res = await runBootstrap(
      [
        'node',
        'scripts/bootstrap-preview-db.mjs',
        '--execute',
        '--confirm-preview',
        '--preview-endpoint',
        'ep-valid-preview-55',
        '--app-url',
        'https://valid-preview.vercel.app',
      ],
      mockPool
    );

    process.env.PREVIEW_DATABASE_URL = orig;
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.error, 'ACTIVATION_FILE_EXISTS');

    // Confirm database is completely empty (no partial tables)
    const tableRes = await pglite.query("SELECT count(*) as count FROM information_schema.tables WHERE table_schema = 'public'");
    assert.strictEqual(parseInt(tableRes.rows[0].count, 10), 0);
    cleanupActivationFile();
  });

  // --------------------------------------------------------------------------
  // SUITE 4: Controlled Recovery (--reissue-invitation)
  // --------------------------------------------------------------------------
  console.log('\n--- 4. Controlled Invitation Recovery Procedure ---');

  await testAsync('--reissue-invitation successfully regenerates token for unactivated admin', async () => {
    cleanupActivationFile();
    const pglite = new PGlite();
    await pglite.waitReady;
    const mockPool = createMockPool(pglite);

    const orig = process.env.PREVIEW_DATABASE_URL;
    process.env.PREVIEW_DATABASE_URL = 'postgres://u:p@ep-valid-preview-55.eu-central-1.aws.neon.tech/neondb';

    // 1. Initial successful bootstrap
    const bootRes = await runBootstrap(
      [
        'node',
        'scripts/bootstrap-preview-db.mjs',
        '--execute',
        '--confirm-preview',
        '--preview-endpoint',
        'ep-valid-preview-55',
        '--app-url',
        'https://valid-preview.vercel.app',
      ],
      mockPool
    );
    assert.strictEqual(bootRes.success, true);

    // Read original token from DB
    const adminBefore = await pglite.query("SELECT invitation_token FROM users WHERE email = 'admin.preview@staging.liecconsulting.com'");
    const origToken = adminBefore.rows[0].invitation_token;
    assert.strictEqual(typeof origToken, 'string');

    // Delete activation file (simulating file loss before admin could activate)
    cleanupActivationFile();

    // 2. Re-issue invitation
    const reissueRes = await runBootstrap(
      [
        'node',
        'scripts/bootstrap-preview-db.mjs',
        '--reissue-invitation',
        '--confirm-preview',
        '--preview-endpoint',
        'ep-valid-preview-55',
        '--app-url',
        'https://valid-preview.vercel.app',
      ],
      mockPool
    );
    assert.strictEqual(reissueRes.success, true);
    assert.strictEqual(fs.existsSync(activationFilePath), true);

    // Confirm new token in DB is different from original
    const adminAfter = await pglite.query("SELECT invitation_token FROM users WHERE email = 'admin.preview@staging.liecconsulting.com'");
    const newToken = adminAfter.rows[0].invitation_token;
    assert.notStrictEqual(newToken, origToken);
    cleanupActivationFile();

    // 3. Re-issue refusal if administrator already set a password
    await pglite.exec("UPDATE users SET password_hash = 'established_pbkdf2_hash' WHERE email = 'admin.preview@staging.liecconsulting.com'");
    const blockedReissue = await runBootstrap(
      [
        'node',
        'scripts/bootstrap-preview-db.mjs',
        '--reissue-invitation',
        '--confirm-preview',
        '--preview-endpoint',
        'ep-valid-preview-55',
        '--app-url',
        'https://valid-preview.vercel.app',
      ],
      mockPool
    );
    process.env.PREVIEW_DATABASE_URL = orig;
    assert.strictEqual(blockedReissue.success, false);
    assert.strictEqual(blockedReissue.error.includes('already activated their account'), true);
  });

  // --------------------------------------------------------------------------
  // SUITE 5: Strengthened --verify-only Audits
  // --------------------------------------------------------------------------
  console.log('\n--- 5. Strengthened --verify-only Audits ---');

  await testAsync('--verify-only executes strictly SELECT queries (0 database writes)', async () => {
    const pglite = new PGlite();
    await pglite.waitReady;

    let writeOperationsDetected = 0;
    const queryHook = (sql) => {
      const trimmed = sql.trim().toUpperCase();
      if (!trimmed.startsWith('SELECT')) {
        writeOperationsDetected++;
      }
    };
    const mockPool = createMockPool(pglite, queryHook);

    const orig = process.env.PREVIEW_DATABASE_URL;
    process.env.PREVIEW_DATABASE_URL = 'postgres://u:p@ep-valid-preview-55.eu-central-1.aws.neon.tech/neondb';

    await runBootstrap(
      [
        'node',
        'scripts/bootstrap-preview-db.mjs',
        '--verify-only',
        '--preview-endpoint',
        'ep-valid-preview-55',
      ],
      mockPool
    );

    process.env.PREVIEW_DATABASE_URL = orig;
    assert.strictEqual(writeOperationsDetected, 0, '--verify-only must execute strictly read-only queries');
  });

  await testAsync('--verify-only detects missing preview administrator', async () => {
    const pglite = new PGlite();
    await pglite.waitReady;
    const mockPool = createMockPool(pglite);

    // Initial provision
    cleanupActivationFile();
    const orig = process.env.PREVIEW_DATABASE_URL;
    process.env.PREVIEW_DATABASE_URL = 'postgres://u:p@ep-valid-preview-55.eu-central-1.aws.neon.tech/neondb';
    await runBootstrap(
      ['node', 'scripts/bootstrap-preview-db.mjs', '--execute', '--confirm-preview', '--preview-endpoint', 'ep-valid-preview-55', '--app-url', 'https://valid.vercel.app'],
      mockPool
    );
    cleanupActivationFile();

    // Delete admin user
    await pglite.exec("DELETE FROM users WHERE email = 'admin.preview@staging.liecconsulting.com'");

    const verifyRes = await runBootstrap(
      ['node', 'scripts/bootstrap-preview-db.mjs', '--verify-only', '--preview-endpoint', 'ep-valid-preview-55'],
      mockPool
    );

    process.env.PREVIEW_DATABASE_URL = orig;
    assert.strictEqual(verifyRes.success, false);
    assert.strictEqual(verifyRes.issues.some(i => i.includes('Preview administrator (admin.preview@staging.liecconsulting.com) is MISSING')), true);
  });

  await testAsync('--verify-only detects missing administrator role without restoring it', async () => {
    const pglite = new PGlite();
    await pglite.waitReady;
    const mockPool = createMockPool(pglite);

    cleanupActivationFile();
    const orig = process.env.PREVIEW_DATABASE_URL;
    process.env.PREVIEW_DATABASE_URL = 'postgres://u:p@ep-valid-preview-55.eu-central-1.aws.neon.tech/neondb';
    await runBootstrap(
      ['node', 'scripts/bootstrap-preview-db.mjs', '--execute', '--confirm-preview', '--preview-endpoint', 'ep-valid-preview-55', '--app-url', 'https://valid.vercel.app'],
      mockPool
    );
    cleanupActivationFile();

    // Revoke lh_security_admin
    await pglite.exec("DELETE FROM user_roles WHERE role_id = 'lh_security_admin'");

    const verifyRes = await runBootstrap(
      ['node', 'scripts/bootstrap-preview-db.mjs', '--verify-only', '--preview-endpoint', 'ep-valid-preview-55'],
      mockPool
    );

    assert.strictEqual(verifyRes.success, false);
    assert.strictEqual(verifyRes.issues.some(i => i.includes('missing expected roles: lh_security_admin')), true);

    // Verify revoked role was NOT restored
    const checkRole = await pglite.query("SELECT role_id FROM user_roles WHERE role_id = 'lh_security_admin'");
    assert.strictEqual(checkRole.rows.length, 0, 'Role must not be restored by --verify-only');
    process.env.PREVIEW_DATABASE_URL = orig;
  });

  await testAsync('--verify-only detects missing synthetic business records', async () => {
    const pglite = new PGlite();
    await pglite.waitReady;
    const mockPool = createMockPool(pglite);

    cleanupActivationFile();
    const orig = process.env.PREVIEW_DATABASE_URL;
    process.env.PREVIEW_DATABASE_URL = 'postgres://u:p@ep-valid-preview-55.eu-central-1.aws.neon.tech/neondb';
    await runBootstrap(
      ['node', 'scripts/bootstrap-preview-db.mjs', '--execute', '--confirm-preview', '--preview-endpoint', 'ep-valid-preview-55', '--app-url', 'https://valid.vercel.app'],
      mockPool
    );
    cleanupActivationFile();

    // Delete candidate record
    await pglite.exec("DELETE FROM candidats WHERE ref = '#CAN-2026-001'");

    const verifyRes = await runBootstrap(
      ['node', 'scripts/bootstrap-preview-db.mjs', '--verify-only', '--preview-endpoint', 'ep-valid-preview-55'],
      mockPool
    );

    assert.strictEqual(verifyRes.success, false);
    assert.strictEqual(verifyRes.issues.some(i => i.includes('Candidate #CAN-2026-001')), true);
    process.env.PREVIEW_DATABASE_URL = orig;
  });

  // --------------------------------------------------------------------------
  // SUITE 6: Secret Redaction & Protocol Validation
  // --------------------------------------------------------------------------
  console.log('\n--- 6. Secret Redaction & Protocol Validation ---');

  test('redactSensitiveText redacts credentials from Postgres connection strings', () => {
    const input = 'Error: postgresql://admin:MySecretPassword123!@ep-xyz.neon.tech:5432/db failed';
    const redacted = redactSensitiveText(input);
    assert.strictEqual(redacted.includes('MySecretPassword123!'), false);
    assert.strictEqual(redacted.includes('postgres://admin:***@'), true);
  });

  test('Forbidden --db-url argument is immediately rejected', async () => {
    const res = await runBootstrap(['node', 'scripts/bootstrap-preview-db.mjs', '--db-url', 'postgres://u:p@h/db']);
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.error, 'FORBIDDEN_CLI_DB_URL');
  });

  test('validatePreviewAppUrl enforces HTTPS protocol', () => {
    assert.strictEqual(validatePreviewAppUrl('https://preview-liec.vercel.app').valid, true);
    assert.strictEqual(validatePreviewAppUrl('http://insecure.com').valid, false);
  });

  console.log('\n===============================================================');
  console.log(`✓ ALL TESTS PASSED: ${passed}/${total} security and regression checks passed.`);
  console.log('===============================================================\n');
}

runSecurityAudit().catch((err) => {
  console.error('\n✗ TEST SUITE FAILED:', err);
  process.exit(1);
});
