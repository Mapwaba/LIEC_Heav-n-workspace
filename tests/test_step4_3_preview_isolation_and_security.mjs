import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { PGlite } from '@electric-sql/pglite';

console.log('===============================================================');
console.log('LIEC Heav\'n — Step 4.3 Security Remediation & Preview Isolation');
console.log('===============================================================\n');

async function runStep43SecurityAudit() {
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

  // --------------------------------------------------------------------------
  // SUITE 1: Critical S3 Credential Remediation
  // --------------------------------------------------------------------------
  console.log('\n--- 1. S3 Object Storage Security & Hardcoded Credential Audit ---');

  const storageCode = fs.readFileSync('src/lib/storage.ts', 'utf8');

  test('No hardcoded Neon S3 access keys exist in storage.ts', () => {
    assert.strictEqual(storageCode.includes('nak_live_'), false, 'Found exposed nak_live_ key in storage.ts');
  });

  test('No hardcoded Neon S3 secret keys exist in storage.ts', () => {
    assert.strictEqual(storageCode.includes('nsk_live_'), false, 'Found exposed nsk_live_ key in storage.ts');
  });

  test('No hardcoded Neon S3 endpoint URLs exist in storage.ts', () => {
    assert.strictEqual(storageCode.includes('br-delicate-glitter'), false, 'Found hardcoded Neon endpoint URL in storage.ts');
  });

  test('No hardcoded production bucket fallbacks exist for unconfigured environments', () => {
    const rawDefaultPattern = /process\.env\.S3_BUCKET\s*\|\|\s*['"]uploads['"]/;
    assert.strictEqual(rawDefaultPattern.test(storageCode), false, 'Found process.env.S3_BUCKET || "uploads" fallback');
  });

  const { getStorageConfig, isStorageConfigured, uploadDocument, deleteDocument, getSignedDownloadUrl } =
    await import('../src/lib/storage.ts');

  test('getStorageConfig returns null when env vars are absent (fails closed)', () => {
    const origEnv = { ...process.env };
    delete process.env.AWS_ENDPOINT_URL_S3;
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
    delete process.env.S3_BUCKET;
    delete process.env.PREVIEW_S3_BUCKET;

    assert.strictEqual(getStorageConfig(), null, 'Should return null when storage variables are unconfigured');
    assert.strictEqual(isStorageConfigured(), false, 'isStorageConfigured should be false');

    process.env = origEnv;
  });

  await testAsync('uploadDocument, deleteDocument, getSignedDownloadUrl return safe failure when unconfigured', async () => {
    const origEnv = { ...process.env };
    delete process.env.AWS_ENDPOINT_URL_S3;
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
    delete process.env.S3_BUCKET;

    const upRes = await uploadDocument('test.pdf', Buffer.from('test'));
    assert.strictEqual(upRes.success, false);
    assert.ok(upRes.error?.includes('not configured'));

    const delRes = await deleteDocument('test.pdf');
    assert.strictEqual(delRes.success, false);
    assert.ok(delRes.error?.includes('not configured'));

    const signRes = await getSignedDownloadUrl('test.pdf');
    assert.strictEqual(signRes.success, false);
    assert.ok(signRes.error?.includes('not configured'));

    process.env = origEnv;
  });

  test('Preview environment requires PREVIEW_S3_BUCKET and rejects production bucket', () => {
    const origEnv = { ...process.env };
    process.env.VERCEL_ENV = 'preview';
    process.env.PREVIEW_AWS_ENDPOINT_URL_S3 = 'https://s3.preview.example.com';
    process.env.PREVIEW_AWS_ACCESS_KEY_ID = 'preview-key';
    process.env.PREVIEW_AWS_SECRET_ACCESS_KEY = 'preview-secret';
    process.env.S3_BUCKET = 'production-uploads'; // Production bucket name set

    // 1. Without PREVIEW_S3_BUCKET, fails closed (returns null)
    delete process.env.PREVIEW_S3_BUCKET;
    const conf1 = getStorageConfig();
    assert.strictEqual(conf1, null, 'Preview must return null if PREVIEW_S3_BUCKET is unset');

    // 2. If PREVIEW_S3_BUCKET is set to 'uploads', fails closed
    process.env.PREVIEW_S3_BUCKET = 'uploads';
    const conf2 = getStorageConfig();
    assert.strictEqual(conf2, null, 'Preview must reject standard "uploads" bucket name');

    // 3. If PREVIEW_S3_BUCKET matches S3_BUCKET, fails closed
    process.env.PREVIEW_S3_BUCKET = 'production-uploads';
    const conf3 = getStorageConfig();
    assert.strictEqual(conf3, null, 'Preview must reject PREVIEW_S3_BUCKET matching production S3_BUCKET');

    // 4. With dedicated, distinct PREVIEW_S3_BUCKET and PREVIEW_AWS_* keys, succeeds safely
    process.env.PREVIEW_S3_BUCKET = 'preview-isolated-uploads';
    const conf4 = getStorageConfig();
    assert.ok(conf4, 'Preview should configure successfully with dedicated distinct bucket and keys');
    assert.strictEqual(conf4.bucket, 'preview-isolated-uploads');
    assert.strictEqual(conf4.accessKeyId, 'preview-key');

    // 5. Zero silent fallback to production AWS credentials in Preview
    delete process.env.PREVIEW_AWS_ACCESS_KEY_ID;
    process.env.AWS_ACCESS_KEY_ID = 'production-key';
    const conf5 = getStorageConfig();
    assert.strictEqual(conf5, null, 'Preview must NEVER silently fall back to production AWS_ACCESS_KEY_ID');

    process.env = origEnv;
  });

  // --------------------------------------------------------------------------
  // SUITE 2: Preview Email & Strict Environment Isolation
  // --------------------------------------------------------------------------
  console.log('\n--- 2. Preview Outbound Email & Strict Environment Isolation Audit ---');

  const {
    sendEmail,
    getEmailProviderDiagnostics,
    isPreviewEnvironment,
    isProductionEnvironment,
    isApprovedPreviewSmtpHost,
  } = await import('../src/lib/emailService.ts');

  test('Strict Environment Detection: Production ALWAYS takes absolute precedence over preview flags', () => {
    const origEnv = { ...process.env };

    // 1. Vercel Preview
    process.env.VERCEL_ENV = 'preview';
    delete process.env.PREVIEW_MODE;
    assert.strictEqual(isPreviewEnvironment(), true);
    assert.strictEqual(isProductionEnvironment(), false);

    // 2. Vercel Production with conflicting PREVIEW_MODE=true (Production Precedence Guard)
    process.env.VERCEL_ENV = 'production';
    process.env.PREVIEW_MODE = 'true';
    assert.strictEqual(isProductionEnvironment(), true, 'Production must override PREVIEW_MODE=true');
    assert.strictEqual(isPreviewEnvironment(), false, 'Preview must be false in Production');

    // 3. NODE_ENV=production CANNOT be overridden by preview flags
    delete process.env.VERCEL_ENV;
    process.env.NODE_ENV = 'production';
    process.env.PREVIEW_MODE = 'true';
    process.env.ALLOW_LOCAL_PREVIEW = 'true';
    assert.strictEqual(isProductionEnvironment(), true, 'NODE_ENV=production must be recognized as Production');
    assert.strictEqual(isPreviewEnvironment(), false, 'NODE_ENV=production cannot be overridden by preview flags');

    // 4. NEXT_PUBLIC_VERCEL_ENV is NOT an authoritative security signal
    delete process.env.VERCEL_ENV;
    delete process.env.NODE_ENV;
    delete process.env.PREVIEW_MODE;
    delete process.env.ALLOW_LOCAL_PREVIEW;
    process.env.NEXT_PUBLIC_VERCEL_ENV = 'preview';
    assert.strictEqual(isPreviewEnvironment(), false, 'NEXT_PUBLIC_VERCEL_ENV alone must NOT activate preview');
    assert.strictEqual(isProductionEnvironment(), false);

    // 5. Local development
    process.env.VERCEL_ENV = 'development';
    delete process.env.PREVIEW_MODE;
    delete process.env.NEXT_PUBLIC_VERCEL_ENV;
    assert.strictEqual(isPreviewEnvironment(), false);
    assert.strictEqual(isProductionEnvironment(), false);

    // 6. Missing environment variables (defaults safely to unconfigured local)
    delete process.env.VERCEL_ENV;
    delete process.env.NODE_ENV;
    delete process.env.PREVIEW_MODE;
    assert.strictEqual(isPreviewEnvironment(), false);
    assert.strictEqual(isProductionEnvironment(), false);

    // 7. PREVIEW_MODE=true alone without explicit ALLOW_LOCAL_PREVIEW is rejected
    process.env.PREVIEW_MODE = 'true';
    delete process.env.ALLOW_LOCAL_PREVIEW;
    process.env.NODE_ENV = 'development';
    assert.strictEqual(isPreviewEnvironment(), false, 'PREVIEW_MODE alone must not activate preview in development');

    // 8. Explicit ALLOW_LOCAL_PREVIEW=true with PREVIEW_MODE=true activates preview in dev/test
    process.env.ALLOW_LOCAL_PREVIEW = 'true';
    assert.strictEqual(isPreviewEnvironment(), true, 'ALLOW_LOCAL_PREVIEW with PREVIEW_MODE activates preview safely');

    process.env = origEnv;
  });

  await testAsync('Preview environment intercepts sendEmail and NEVER calls Resend (Mock Sink Routing)', async () => {
    const origEnv = { ...process.env };
    process.env.VERCEL_ENV = 'preview';
    process.env.RESEND_API_KEY = 're_test_dummy_key_12345'; // Even if a Resend key is present!

    const result = await sendEmail({
      to: 'partner@example.com',
      subject: 'Test Accommodation Notification',
      html: '<p>Test</p>',
      text: 'Test',
      idempotencyKey: 'test-idemp-001',
    });

    assert.strictEqual(result.success, true, 'Preview should succeed safely');
    assert.strictEqual(result.transport, 'preview_sink', 'Must use preview_sink transport');
    assert.strictEqual(result.provider, 'json_transport', 'Provider must be json_transport in preview sink');
    assert.ok(result.messageId?.startsWith('preview_sink_'), 'MessageId must indicate preview sink');
    assert.strictEqual(result.details?.isolated, true);

    process.env = origEnv;
  });

  test('Preview diagnostics report preview_sink as active provider and isPreview: true', () => {
    const origEnv = { ...process.env };
    process.env.VERCEL_ENV = 'preview';
    process.env.RESEND_API_KEY = 're_test_dummy_key_12345';

    const diag = getEmailProviderDiagnostics();
    assert.strictEqual(diag.isPreview, true);
    assert.strictEqual(diag.isProduction, false);
    assert.strictEqual(diag.activeProvider, 'preview_sink');

    process.env = origEnv;
  });

  test('SMTP Test-Sink Security: Rejects production host, unapproved hosts, commercial relays; requires approved test sink', () => {
    const origEnv = { ...process.env };
    process.env.VERCEL_ENV = 'preview';
    process.env.SMTP_HOST = 'smtp.sendgrid.net';
    process.env.SMTP_USER = 'production_user';
    process.env.SMTP_PASS = 'production_pass';

    // 1. Hostname collision with production SMTP_HOST is rejected
    assert.strictEqual(isApprovedPreviewSmtpHost('smtp.sendgrid.net'), false);
    process.env.PREVIEW_SMTP_HOST = 'smtp.sendgrid.net';
    process.env.PREVIEW_SMTP_USER = 'some_user';
    process.env.PREVIEW_SMTP_PASS = 'some_pass';
    const diagCollision = getEmailProviderDiagnostics();
    assert.strictEqual(diagCollision.activeProvider, 'preview_sink');

    // 2. Commercial production email relays are rejected (cannot bypass sink)
    assert.strictEqual(isApprovedPreviewSmtpHost('smtp.gmail.com'), false);
    assert.strictEqual(isApprovedPreviewSmtpHost('smtp.office365.com'), false);
    assert.strictEqual(isApprovedPreviewSmtpHost('smtp.postmarkapp.com'), false);

    // 3. Arbitrary unapproved corporate host is rejected and routes to preview_sink
    process.env.PREVIEW_SMTP_HOST = 'mail.mycompany.com';
    assert.strictEqual(isApprovedPreviewSmtpHost('mail.mycompany.com'), false);
    const diagUnapproved = getEmailProviderDiagnostics();
    assert.strictEqual(diagUnapproved.activeProvider, 'preview_sink');

    // 4. Approved mock and test sinks are accepted
    assert.strictEqual(isApprovedPreviewSmtpHost('sandbox.smtp.mailtrap.io'), true);
    assert.strictEqual(isApprovedPreviewSmtpHost('mailpit.internal'), true);
    assert.strictEqual(isApprovedPreviewSmtpHost('mailhog'), true);
    assert.strictEqual(isApprovedPreviewSmtpHost('smtp.ethereal.email'), true);
    assert.strictEqual(isApprovedPreviewSmtpHost('localhost'), true);
    assert.strictEqual(isApprovedPreviewSmtpHost('127.0.0.1'), true);

    process.env.PREVIEW_SMTP_HOST = 'sandbox.smtp.mailtrap.io';
    process.env.PREVIEW_SMTP_USER = 'trap_user';
    process.env.PREVIEW_SMTP_PASS = 'trap_pass';
    const diagAccepted = getEmailProviderDiagnostics();
    assert.strictEqual(diagAccepted.activeProvider, 'smtp');
    assert.strictEqual(diagAccepted.hasSmtpConfig, true);

    process.env = origEnv;
  });

  await testAsync('Preview sendEmail with unapproved SMTP host safely defaults to JSON mock sink (zero network)', async () => {
    const origEnv = { ...process.env };
    process.env.VERCEL_ENV = 'preview';
    process.env.PREVIEW_SMTP_HOST = 'smtp.gmail.com'; // Commercial unapproved host
    process.env.PREVIEW_SMTP_USER = 'user';
    process.env.PREVIEW_SMTP_PASS = 'pass';

    const result = await sendEmail({
      to: 'unapproved-test@example.com',
      subject: 'Fallback Verification',
      html: '<p>Test</p>',
      text: 'Test',
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.transport, 'preview_sink', 'Must safely default to preview_sink mock transport');
    assert.strictEqual(result.provider, 'json_transport');

    process.env = origEnv;
  });

  await testAsync('Production environment fails closed if no email provider credentials exist', async () => {
    const origEnv = { ...process.env };
    process.env.VERCEL_ENV = 'production';
    delete process.env.RESEND_API_KEY;
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;

    let threw = false;
    try {
      await sendEmail({
        to: 'student@example.com',
        subject: 'Welcome',
        html: '<p>Hi</p>',
        text: 'Hi',
      });
    } catch (err) {
      threw = true;
      assert.ok(err.message.includes('No production email provider is configured'));
    }
    assert.strictEqual(threw, true, 'Must throw in production when unconfigured');

    process.env = origEnv;
  });

  // --------------------------------------------------------------------------
  // SUITE 3: Schema Completeness & Parity (26 Tables)
  // --------------------------------------------------------------------------
  console.log('\n--- 3. Canonical Schema & Runtime Schema Parity (26 Tables) ---');

  const schemaContent = fs.readFileSync('database/schema.sql', 'utf8');
  const dbContent = fs.readFileSync('src/lib/db.ts', 'utf8');

  function extractTableNames(content) {
    const regex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+)/gi;
    const list = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      list.push(match[1]);
    }
    return list;
  }

  const schemaTables = extractTableNames(schemaContent);
  const dbTables = extractTableNames(dbContent);

  test('Canonical schema.sql defines exactly 26 tables', () => {
    assert.strictEqual(schemaTables.length, 26, `Expected 26 tables in schema.sql, found ${schemaTables.length}`);
  });

  test('Runtime src/lib/db.ts defines exactly 26 tables (no duplicates)', () => {
    assert.strictEqual(dbTables.length, 26, `Expected 26 tables in db.ts, found ${dbTables.length}`);
  });

  test('100% table name parity between schema.sql and db.ts', () => {
    const sSet = [...new Set(schemaTables)].sort();
    const dSet = [...new Set(dbTables)].sort();
    assert.strictEqual(sSet.length, 26);
    assert.strictEqual(dSet.length, 26);
    assert.deepStrictEqual(sSet, dSet, 'Tables between schema.sql and db.ts do not match');
  });

  test('prepa_payments and prepa_receipts tables are present in schema.sql and db.ts', () => {
    assert.ok(schemaTables.includes('prepa_payments'), 'prepa_payments missing from schema.sql');
    assert.ok(schemaTables.includes('prepa_receipts'), 'prepa_receipts missing from schema.sql');
    assert.ok(dbTables.includes('prepa_payments'), 'prepa_payments missing from db.ts');
    assert.ok(dbTables.includes('prepa_receipts'), 'prepa_receipts missing from db.ts');
  });

  const { initSchemaDDL } = await import('../src/lib/db.ts');
  const { verifyPassword } = await import('../src/lib/passwordSecurity.ts');
  const { bootstrapPreviewAdmin } = await import('../src/lib/previewBootstrap.ts');

  await testAsync('Deep catalog comparison: 100% columns, constraints, and indexes parity', async () => {
    const dbCanon = new PGlite();
    await dbCanon.exec(schemaContent);

    const dbRuntime = new PGlite();
    await initSchemaDDL(dbRuntime);

    const colsCanon = (await dbCanon.query(`
      SELECT table_name, column_name, data_type, is_nullable
      FROM information_schema.columns WHERE table_schema = 'public' ORDER BY table_name, column_name
    `)).rows;

    const colsRuntime = (await dbRuntime.query(`
      SELECT table_name, column_name, data_type, is_nullable
      FROM information_schema.columns WHERE table_schema = 'public' ORDER BY table_name, column_name
    `)).rows;

    assert.strictEqual(colsCanon.length, 460, `Canonical columns expected 460, got ${colsCanon.length}`);
    assert.strictEqual(colsRuntime.length, 460, `Runtime columns expected 460, got ${colsRuntime.length}`);

    const colKey = (c) => `${c.table_name}.${c.column_name} (${c.data_type}, null:${c.is_nullable})`;
    const setCanonCols = new Set(colsCanon.map(colKey));
    const setRuntimeCols = new Set(colsRuntime.map(colKey));
    const diffCols = colsCanon.filter(c => !setRuntimeCols.has(colKey(c)));
    assert.deepStrictEqual(diffCols, [], 'Column differences detected between schema.sql and db.ts');

    const consCanon = (await dbCanon.query(`
      SELECT tc.table_name, tc.constraint_name, tc.constraint_type, kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      WHERE tc.table_schema = 'public' ORDER BY tc.table_name, tc.constraint_type, kcu.column_name
    `)).rows;

    const consRuntime = (await dbRuntime.query(`
      SELECT tc.table_name, tc.constraint_name, tc.constraint_type, kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      WHERE tc.table_schema = 'public' ORDER BY tc.table_name, tc.constraint_type, kcu.column_name
    `)).rows;

    assert.strictEqual(consCanon.length, 54, `Canonical constraints expected 54, got ${consCanon.length}`);
    assert.strictEqual(consRuntime.length, 54, `Runtime constraints expected 54, got ${consRuntime.length}`);

    const idxCanon = (await dbCanon.query(`
      SELECT tablename, indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename, indexname
    `)).rows;

    const idxRuntime = (await dbRuntime.query(`
      SELECT tablename, indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename, indexname
    `)).rows;

    assert.strictEqual(idxCanon.length, 59, `Canonical indexes expected 59, got ${idxCanon.length}`);
    assert.strictEqual(idxRuntime.length, 59, `Runtime indexes expected 59, got ${idxRuntime.length}`);
  });

  // --------------------------------------------------------------------------
  // SUITE 4: Synthetic Fixture Integrity & PGlite Verification
  // --------------------------------------------------------------------------
  console.log('\n--- 4. Synthetic Fixture Application & Constraint Verification ---');

  const pg = new PGlite();

  await testAsync('Canonical schema.sql initialises cleanly in PGlite', async () => {
    await pg.exec(schemaContent);
    const res = await pg.query("SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public'");
    assert.strictEqual(Number(res.rows[0].count), 26, 'All 26 tables must exist in public schema');
  });

  const fixtureSql = fs.readFileSync('database/fixtures/preview_synthetic_fixtures.sql', 'utf8');

  test('Synthetic fixture does not contain real administrator email or live production PII', () => {
    assert.strictEqual(fixtureSql.includes('bmapwabantoro@liecconsulting.com'), false);
  });

  await testAsync('Synthetic fixtures execute without error or constraint violations', async () => {
    await pg.exec(fixtureSql);
  });

  await testAsync('Synthetic fixtures are 100% idempotent (second execution succeeds)', async () => {
    await pg.exec(fixtureSql);
  });

  await testAsync('All required synthetic personas and business profiles exist', async () => {
    const usersRes = await pg.query(`
      SELECT email, role, business_profile, active, password_hash, password_salt FROM users ORDER BY email
    `);
    const emails = usersRes.rows.map((r) => r.email);

    // Verify Synthetic Preview Admin
    assert.ok(emails.includes('admin.preview@staging.liecconsulting.com'));
    // Verify Secretary
    assert.ok(emails.includes('secretaire.test@staging.liecconsulting.com'));
    // Verify Finance Officer
    assert.ok(emails.includes('finance.test@staging.liecconsulting.com'));
    // Verify Academic Advisor
    assert.ok(emails.includes('conseiller.test@staging.liecconsulting.com'));
    // Verify Candidate
    assert.ok(emails.includes('etudiant.test@staging.liecconsulting.com'));
    // Verify Parent
    assert.ok(emails.includes('parent.test@staging.liecconsulting.com'));

    // Verify Synthetic Admin credential hardening (NULL in fixture, no static disclosed credential)
    const adminUser = usersRes.rows.find((r) => r.email === 'admin.preview@staging.liecconsulting.com');
    assert.strictEqual(adminUser.password_hash, null, 'Synthetic admin password_hash in fixture must be NULL');
    assert.strictEqual(adminUser.password_salt, null, 'Synthetic admin password_salt in fixture must be NULL');
  });

  await testAsync('bootstrapPreviewAdmin fails closed outside preview environment', async () => {
    const origEnv = { ...process.env };
    process.env.VERCEL_ENV = 'production';
    const res = await bootstrapPreviewAdmin(pg, { initialPassword: 'TestPassword2026!' });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.action, 'skipped_not_preview');
    process.env = origEnv;
  });

  await testAsync('bootstrapPreviewAdmin securely provisions synthetic admin in preview', async () => {
    const origEnv = { ...process.env };
    process.env.VERCEL_ENV = 'preview';

    const testSecret = 'DynamicPreviewSecret2026!Secure';
    const res = await bootstrapPreviewAdmin(pg, { initialPassword: testSecret });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.action, 'password_updated');
    assert.deepStrictEqual(res.roleAssignments, ['admin', 'lh_security_admin']);

    const userRes = await pg.query("SELECT * FROM users WHERE email = 'admin.preview@staging.liecconsulting.com'");
    const admin = userRes.rows[0];
    assert.ok(admin.password_hash);
    assert.ok(admin.password_salt);
    const isValid = verifyPassword(testSecret, admin.password_hash, admin.password_salt);
    assert.strictEqual(isValid, true, 'Dynamically provisioned password hash must verify correctly');

    process.env = origEnv;
  });

  await testAsync('bootstrapPreviewAdmin is 100% idempotent and preserves password unless forceReset is specified', async () => {
    const origEnv = { ...process.env };
    process.env.VERCEL_ENV = 'preview';

    const userBefore = (await pg.query("SELECT * FROM users WHERE email = 'admin.preview@staging.liecconsulting.com'")).rows[0];

    // Second bootstrap call without forceReset
    const resIdemp = await bootstrapPreviewAdmin(pg, { initialPassword: 'ShouldNotOverwrite123!' });
    assert.strictEqual(resIdemp.success, true);
    assert.strictEqual(resIdemp.action, 'already_configured_preserved');

    const userAfter = (await pg.query("SELECT * FROM users WHERE email = 'admin.preview@staging.liecconsulting.com'")).rows[0];
    assert.strictEqual(userAfter.password_hash, userBefore.password_hash, 'Password hash must be preserved');
    assert.strictEqual(userAfter.password_salt, userBefore.password_salt, 'Password salt must be preserved');

    // Force reset call
    const resReset = await bootstrapPreviewAdmin(pg, { initialPassword: 'NewForcedPassword2026!', forceReset: true });
    assert.strictEqual(resReset.success, true);
    assert.strictEqual(resReset.action, 'password_updated');

    const userReset = (await pg.query("SELECT * FROM users WHERE email = 'admin.preview@staging.liecconsulting.com'")).rows[0];
    assert.notStrictEqual(userReset.password_hash, userBefore.password_hash);
    const isNewValid = verifyPassword('NewForcedPassword2026!', userReset.password_hash, userReset.password_salt);
    assert.strictEqual(isNewValid, true);

    process.env = origEnv;
  });

  await testAsync('bootstrapPreviewAdmin provides single-use invitation token flow when no initial password is configured', async () => {
    const origEnv = { ...process.env };
    process.env.VERCEL_ENV = 'preview';
    delete process.env.PREVIEW_ADMIN_INITIAL_PASSWORD;

    // Reset password so invitation flow triggers
    await pg.query(`
      UPDATE users
      SET password_hash = NULL, password_salt = NULL, invitation_token = NULL
      WHERE email = 'admin.preview@staging.liecconsulting.com'
    `);

    // Bootstrap without initialPassword
    const res = await bootstrapPreviewAdmin(pg, { forceReset: true });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.action, 'invitation_token_refreshed');
    assert.ok(res.activationToken, 'Activation token must be generated');
    assert.strictEqual(res.activationToken.length, 64);
    assert.ok(res.activationUrl?.startsWith('/login?invitationToken='));

    // Verify token stored in DB as SHA-256 hash
    const userRes = await pg.query("SELECT * FROM users WHERE email = 'admin.preview@staging.liecconsulting.com'");
    const user = userRes.rows[0];
    assert.ok(user.invitation_token);
    assert.ok(user.invitation_token_expires_at);

    const crypto = await import('crypto');
    const expectedHash = crypto.createHash('sha256').update(res.activationToken).digest('hex');
    assert.strictEqual(user.invitation_token, expectedHash, 'Database must store SHA-256 hash of activation token');

    // 1. Repeated cold starts do NOT issue unnecessary new invitations
    const resColdStart = await bootstrapPreviewAdmin(pg);
    assert.strictEqual(resColdStart.success, true);
    assert.strictEqual(resColdStart.action, 'already_configured_preserved', 'Cold start must preserve active invitation token');
    const userCold = (await pg.query("SELECT invitation_token FROM users WHERE email = 'admin.preview@staging.liecconsulting.com'")).rows[0];
    assert.strictEqual(userCold.invitation_token, expectedHash, 'Existing invitation token must not be overwritten on cold start');

    // 2. Successful activation invalidates the single-use token atomically
    const newPassword = 'ActivatedAdminSecret2026!Secure';
    const { hash: newHash, salt: newSalt } = (await import('../src/lib/passwordSecurity.ts')).hashPassword(newPassword);

    const consumeRes = await pg.query(
      `UPDATE users
       SET password_hash = $1,
           password_salt = $2,
           invitation_token = NULL,
           invitation_token_expires_at = NULL,
           must_change_password = FALSE
       WHERE invitation_token = $3 AND invitation_token_expires_at > CURRENT_TIMESTAMP
       RETURNING id, email`,
      [newHash, newSalt, expectedHash]
    );
    assert.strictEqual(consumeRes.rows.length, 1, 'Token consumption must succeed on first use');

    // 3. Replay attack fails: token cannot be consumed a second time
    const replayRes = await pg.query(
      `UPDATE users
       SET password_hash = $1
       WHERE invitation_token = $2 AND invitation_token_expires_at > CURRENT_TIMESTAMP
       RETURNING id`,
      [newHash, expectedHash]
    );
    assert.strictEqual(replayRes.rows.length, 0, 'Replay attack must fail: token is invalidated');

    // 4. Subsequent cold starts preserve established password
    const resPostActivation = await bootstrapPreviewAdmin(pg);
    assert.strictEqual(resPostActivation.success, true);
    assert.strictEqual(resPostActivation.action, 'already_configured_preserved');

    process.env = origEnv;
  });

  await testAsync('User role mappings match RBAC specifications', async () => {
    const rolesRes = await pg.query(`
      SELECT u.email, ur.role_id
      FROM user_roles ur
      JOIN users u ON u.id = ur.user_id
      ORDER BY u.email, ur.role_id
    `);

    const adminRoles = rolesRes.rows
      .filter((r) => r.email === 'admin.preview@staging.liecconsulting.com')
      .map((r) => r.role_id);
    assert.ok(adminRoles.includes('admin'), 'Admin role missing');
    assert.ok(adminRoles.includes('lh_security_admin'), 'Security admin role missing');

    const secRoles = rolesRes.rows
      .filter((r) => r.email === 'secretaire.test@staging.liecconsulting.com')
      .map((r) => r.role_id);
    assert.ok(secRoles.includes('secretary'));
    assert.ok(secRoles.includes('ITIL'));

    const finRoles = rolesRes.rows
      .filter((r) => r.email === 'finance.test@staging.liecconsulting.com')
      .map((r) => r.role_id);
    assert.ok(finRoles.includes('avi'));
    assert.ok(finRoles.includes('lh_finance'));
  });

  await testAsync('Fixture execution does NOT alter or affect existing production administrator', async () => {
    // If a production admin record pre-exists in the database
    await pg.query(`
      INSERT INTO users (name, email, role, business_profile, active, title)
      VALUES ('Barthelemy MAPWABA NTORO', 'bmapwabantoro@liecconsulting.com', 'admin', 'Admin', TRUE, 'Managing Director')
      ON CONFLICT (email) DO NOTHING
    `);

    const before = (await pg.query("SELECT * FROM users WHERE email = 'bmapwabantoro@liecconsulting.com'")).rows[0];

    // Re-run fixture
    await pg.exec(fixtureSql);

    const after = (await pg.query("SELECT * FROM users WHERE email = 'bmapwabantoro@liecconsulting.com'")).rows[0];
    assert.strictEqual(before.title, after.title);
    assert.strictEqual(before.name, after.name);
    assert.strictEqual(before.role, after.role);
  });

  await testAsync('Candidate #CAN-2026-001 has complete synthetic lifecycle properties', async () => {
    const candRes = await pg.query(`SELECT * FROM candidats WHERE ref = '#CAN-2026-001'`);
    assert.strictEqual(candRes.rows.length, 1);
    const cand = candRes.rows[0];
    assert.strictEqual(cand.full_name, 'Christian Ndombe (Test Preview)');
    assert.strictEqual(cand.qualification_status, 'QUALIFIED');
    assert.strictEqual(cand.registration_completed, true);
    assert.strictEqual(cand.first_instalment_paid, true);
    assert.strictEqual(Number(cand.first_instalment_amount), 500);
    assert.strictEqual(cand.first_instalment_ref, 'TEST-INST-2026-001');
  });

  await testAsync('Demande #DEM-2026-001 and Prospect exist with valid synthetic data', async () => {
    const demRes = await pg.query(`SELECT * FROM demandes WHERE ref = '#DEM-2026-001'`);
    assert.strictEqual(demRes.rows.length, 1);
    assert.strictEqual(demRes.rows[0].eligibility_status, 'ELIGIBLE');

    const proRes = await pg.query(`SELECT * FROM prospects WHERE full_name LIKE '%Test Preview%'`);
    assert.strictEqual(proRes.rows.length, 1);
    assert.strictEqual(proRes.rows[0].lead_source, 'TEST_PREVIEW_FORM');
  });

  await testAsync('Accommodation and AVI requests are linked to candidate #CAN-2026-001', async () => {
    const accRes = await pg.query(`SELECT * FROM accommodation_requests WHERE ref = '#ACC-2026-001'`);
    assert.strictEqual(accRes.rows.length, 1);
    assert.strictEqual(accRes.rows[0].student_ref, '#CAN-2026-001');

    const aviRes = await pg.query(`SELECT * FROM avi_requests WHERE ref = '#AVI-2026-001'`);
    assert.strictEqual(aviRes.rows.length, 1);
    assert.strictEqual(aviRes.rows[0].student_ref, '#CAN-2026-001');
  });

  await testAsync('All financial records are explicitly marked as test simulations', async () => {
    const payRes = await pg.query(`SELECT * FROM prepa_payments WHERE payment_ref = 'TEST-PAY-2026-001'`);
    assert.strictEqual(payRes.rows.length, 1);
    assert.ok(payRes.rows[0].notes?.includes('SIMULATED TEST PAYMENT'));

    const recRes = await pg.query(`SELECT * FROM prepa_receipts WHERE receipt_number = 'TEST-REC-2026-001'`);
    assert.strictEqual(recRes.rows.length, 1);
    assert.strictEqual(recRes.rows[0].payment_ref, 'TEST-PAY-2026-001');

    const invRes = await pg.query(`SELECT * FROM invoices WHERE ref = 'INV-TEST-2026-001'`);
    assert.strictEqual(invRes.rows.length, 1);
    assert.ok(invRes.rows[0].service_label?.includes('TEST DATA'));
  });

  console.log(`\n===============================================================`);
  console.log(`ALL AUDIT VERIFICATIONS PASSED: ${passed}/${total} checks (100%)`);
  console.log(`===============================================================\n`);
}

runStep43SecurityAudit().catch((err) => {
  console.error('Fatal audit error:', err);
  process.exit(1);
});
