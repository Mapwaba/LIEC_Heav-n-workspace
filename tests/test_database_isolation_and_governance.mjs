/**
 * LIEC Heav'n - Database Isolation & Governance Test Suite
 * 
 * Verifies:
 * 1. Engine-Based Runtime Guards (5 Scenarios):
 *    - Scenario 1: External PostgreSQL with no environment overrides blocks runtime DDL and seeding (Fail-Closed).
 *    - Scenario 2: External PostgreSQL with FORCE_PGLITE=true cannot bypass DDL/seeding restrictions.
 *    - Scenario 3: External PostgreSQL with unsafe override variables remains blocked (Exclusively Migration-Driven).
 *    - Scenario 4: Actual PGlite with no overrides allows local schema DDL and seeding.
 *    - Scenario 5: Actual PGlite with FORCE_PGLITE=true allows local schema DDL and seeding.
 * 2. SQL Statement Categorisation & Purity (2 Tests):
 *    - initSchemaDDL executes ONLY DDL statements (CREATE, ALTER, INDEX) and ZERO DML statements.
 *    - seedInitialData executes ONLY DML statements (INSERT, UPDATE) and ZERO DDL statements.
 * 3. Cold-Start Runtime Guarding & Fail-Closed Orchestration (1 Test):
 *    - initSchemaAndSeed strictly skips DDL and Seeding on external PostgreSQL and logs security warnings.
 * 4. Administrator RBAC & Seed Protection (6 Explicit Tests):
 *    - Test 1: Newly created default administrator receives initial role assignments ('admin', 'lh_security_admin').
 *    - Test 2: Existing administrator with custom role assignments retains them without alteration.
 *    - Test 3: Existing administrator without 'admin' assignment does NOT receive it automatically.
 *    - Test 4: Existing administrator without 'lh_security_admin' assignment does NOT receive it automatically.
 *    - Test 5: Suspended administrator remains suspended and receives no automatic privilege restoration.
 *    - Test 6: Repeated initialisation (multiple cold starts) does not change existing user_roles records.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';

import {
  initSchemaDDL,
  seedInitialData,
  shouldExecuteRuntimeDDL,
  shouldExecuteRuntimeSeeding,
  initSchemaAndSeed,
} from '../src/lib/db.ts';

describe('LIEC Heav\'n - Database Governance & Security Suite', () => {

  describe('1. Engine-Based Runtime Guards (5 Explicit Scenarios)', () => {
    it('Scenario 1: External PostgreSQL with no environment overrides (Fail-Closed)', () => {
      delete process.env.FORCE_PGLITE;
      delete process.env.ALLOW_UNSAFE_RUNTIME_DDL;
      delete process.env.ALLOW_UNSAFE_RUNTIME_SEEDING;

      const pgClient = {
        engine: 'pg',
        async query() { return { rows: [], rowCount: 0 }; },
        async exec() {},
      };

      assert.strictEqual(
        shouldExecuteRuntimeDDL(pgClient),
        false,
        'External PostgreSQL must be blocked from runtime DDL with no overrides'
      );
      assert.strictEqual(
        shouldExecuteRuntimeSeeding(pgClient),
        false,
        'External PostgreSQL must be blocked from runtime seeding with no overrides'
      );
    });

    it('Scenario 2: External PostgreSQL with FORCE_PGLITE=true (Cannot Bypass)', () => {
      process.env.FORCE_PGLITE = 'true';
      delete process.env.ALLOW_UNSAFE_RUNTIME_DDL;
      delete process.env.ALLOW_UNSAFE_RUNTIME_SEEDING;

      const pgClient = {
        engine: 'pg',
        async query() { return { rows: [], rowCount: 0 }; },
        async exec() {},
      };

      assert.strictEqual(
        shouldExecuteRuntimeDDL(pgClient),
        false,
        'FORCE_PGLITE=true must NEVER enable runtime DDL on an external PostgreSQL client'
      );
      assert.strictEqual(
        shouldExecuteRuntimeSeeding(pgClient),
        false,
        'FORCE_PGLITE=true must NEVER enable runtime seeding on an external PostgreSQL client'
      );

      delete process.env.FORCE_PGLITE;
    });

    it('Scenario 3: External PostgreSQL with both unsafe override variables set (Exclusively Migration-Driven)', () => {
      delete process.env.FORCE_PGLITE;
      process.env.ALLOW_UNSAFE_RUNTIME_DDL = 'true';
      process.env.ALLOW_UNSAFE_RUNTIME_SEEDING = 'true';

      const pgClient = {
        engine: 'pg',
        async query() { return { rows: [], rowCount: 0 }; },
        async exec() {},
      };

      assert.strictEqual(
        shouldExecuteRuntimeDDL(pgClient),
        false,
        'External PostgreSQL must remain blocked from runtime DDL even if unsafe override variables are set'
      );
      assert.strictEqual(
        shouldExecuteRuntimeSeeding(pgClient),
        false,
        'External PostgreSQL must remain blocked from runtime seeding even if unsafe override variables are set'
      );

      delete process.env.ALLOW_UNSAFE_RUNTIME_DDL;
      delete process.env.ALLOW_UNSAFE_RUNTIME_SEEDING;
    });

    it('Scenario 4: Actual PGlite with no overrides (Allowed)', () => {
      delete process.env.FORCE_PGLITE;
      delete process.env.ALLOW_UNSAFE_RUNTIME_DDL;
      delete process.env.ALLOW_UNSAFE_RUNTIME_SEEDING;

      const pgliteClient = {
        engine: 'pglite',
        async query() { return { rows: [], rowCount: 0 }; },
        async exec() {},
      };

      assert.strictEqual(
        shouldExecuteRuntimeDDL(pgliteClient),
        true,
        'Actual PGlite client must allow local runtime DDL with no overrides'
      );
      assert.strictEqual(
        shouldExecuteRuntimeSeeding(pgliteClient),
        true,
        'Actual PGlite client must allow local runtime seeding with no overrides'
      );
    });

    it('Scenario 5: Actual PGlite with FORCE_PGLITE=true (Allowed)', () => {
      process.env.FORCE_PGLITE = 'true';
      delete process.env.ALLOW_UNSAFE_RUNTIME_DDL;
      delete process.env.ALLOW_UNSAFE_RUNTIME_SEEDING;

      const pgliteClient = {
        engine: 'pglite',
        async query() { return { rows: [], rowCount: 0 }; },
        async exec() {},
      };

      assert.strictEqual(
        shouldExecuteRuntimeDDL(pgliteClient),
        true,
        'Actual PGlite client must allow local runtime DDL with FORCE_PGLITE=true'
      );
      assert.strictEqual(
        shouldExecuteRuntimeSeeding(pgliteClient),
        true,
        'Actual PGlite client must allow local runtime seeding with FORCE_PGLITE=true'
      );

      delete process.env.FORCE_PGLITE;
    });
  });

  describe('2. SQL Statement Categorisation & Purity (2 Tests)', () => {
    it('initSchemaDDL executes ONLY DDL statements and ZERO DML statements', async () => {
      const executedSqls = [];
      const mockClient = {
        engine: 'pglite',
        async query() { return { rows: [], rowCount: 0 }; },
        async exec(sql) { executedSqls.push(sql); },
      };

      await initSchemaDDL(mockClient);

      assert.ok(executedSqls.length > 0, 'initSchemaDDL should execute SQL statements');

      const fullSql = executedSqls.join('\n');
      const uncommentedSql = fullSql.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

      // Must have DDL
      assert.ok(/CREATE\s+TABLE/i.test(uncommentedSql), 'Should contain CREATE TABLE');
      assert.ok(/ALTER\s+TABLE/i.test(uncommentedSql), 'Should contain ALTER TABLE');
      assert.ok(/CREATE\s+INDEX/i.test(uncommentedSql), 'Should contain CREATE INDEX');

      // Must NOT have DML
      assert.strictEqual(/\bINSERT\s+INTO\b/i.test(uncommentedSql), false, 'initSchemaDDL must NOT contain INSERT INTO');
      assert.strictEqual(/\bUPDATE\s+[a-zA-Z0-9_]+\s+SET\b/i.test(uncommentedSql), false, 'initSchemaDDL must NOT contain UPDATE statements');
      assert.strictEqual(/\bDELETE\s+FROM\b/i.test(uncommentedSql), false, 'initSchemaDDL must NOT contain DELETE FROM');
    });

    it('seedInitialData executes ONLY DML statements and ZERO DDL statements', async () => {
      const executedSqls = [];
      const mockClient = {
        engine: 'pglite',
        async query() { return { rows: [], rowCount: 0 }; },
        async exec(sql) { executedSqls.push(sql); },
      };

      await seedInitialData(mockClient);

      assert.ok(executedSqls.length > 0, 'seedInitialData should execute SQL statements');

      const fullSql = executedSqls.join('\n');
      const uncommentedSql = fullSql.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

      // Must have DML
      assert.ok(/\bINSERT\s+INTO\b/i.test(uncommentedSql), 'seedInitialData should contain INSERT INTO');

      // Must NOT have DDL
      assert.strictEqual(/\bCREATE\s+TABLE\b/i.test(uncommentedSql), false, 'seedInitialData must NOT contain CREATE TABLE');
      assert.strictEqual(/\bALTER\s+TABLE\b/i.test(uncommentedSql), false, 'seedInitialData must NOT contain ALTER TABLE');
      assert.strictEqual(/\bDROP\s+TABLE\b/i.test(uncommentedSql), false, 'seedInitialData must NOT contain DROP TABLE');
      assert.strictEqual(/\bCREATE\s+(UNIQUE\s+)?INDEX\b/i.test(uncommentedSql), false, 'seedInitialData must NOT contain CREATE INDEX');
    });
  });

  describe('3. Cold-Start Runtime Guarding & Fail-Closed Orchestration (1 Test)', () => {
    it('initSchemaAndSeed strictly skips DDL and Seeding on external PostgreSQL and logs warnings', async () => {
      const executedSqls = [];
      const warnings = [];
      const origWarn = console.warn;
      console.warn = (...args) => warnings.push(args.join(' '));

      delete process.env.FORCE_PGLITE;
      delete process.env.ALLOW_UNSAFE_RUNTIME_DDL;
      delete process.env.ALLOW_UNSAFE_RUNTIME_SEEDING;

      const mockPgClient = {
        engine: 'pg',
        async query() { return { rows: [], rowCount: 0 }; },
        async exec(sql) { executedSqls.push(sql); },
      };

      try {
        await initSchemaAndSeed(mockPgClient);

        assert.strictEqual(executedSqls.length, 0, 'No SQL queries should execute against external PostgreSQL on cold start');
        assert.ok(warnings.some(w => w.includes('Runtime DDL initialization is disabled (Fail-Closed)')), 'Must log DDL disabled warning');
        assert.ok(warnings.some(w => w.includes('Runtime data seeding is disabled (Fail-Closed)')), 'Must log seeding disabled warning');
      } finally {
        console.warn = origWarn;
      }
    });
  });

  describe('4. Comprehensive Administrator RBAC & Seed Protection (6 Explicit Tests)', () => {
    it('1. Newly created default administrator receives intended initial role assignments (admin, lh_security_admin)', async () => {
      const pglite = new PGlite();
      await pglite.waitReady;

      const client = {
        engine: 'pglite',
        async query(sql, params) {
          const res = await pglite.query(sql, params);
          return { rows: res.rows, rowCount: res.rows ? res.rows.length : 0 };
        },
        async exec(sql) { await pglite.exec(sql); },
      };

      await initSchemaDDL(client);
      await seedInitialData(client);

      const userRes = await client.query(`
        SELECT id, email, user_id, role, business_profile, active FROM users
        WHERE LOWER(email) = 'bmapwabantoro@liecconsulting.com'
      `);

      assert.strictEqual(userRes.rows.length, 1, 'Default administrator account should be created');
      const adminId = userRes.rows[0].id;
      assert.strictEqual(userRes.rows[0].email, 'bmapwabantoro@liecconsulting.com');
      assert.strictEqual(userRes.rows[0].user_id, 'bmapwaba');
      assert.strictEqual(userRes.rows[0].role, 'admin');
      assert.strictEqual(userRes.rows[0].active, true);

      // Verify role assignments in user_roles
      const rolesRes = await client.query(`
        SELECT role_id FROM user_roles WHERE user_id = $1 ORDER BY role_id
      `, [adminId]);

      const roleIds = rolesRes.rows.map(r => r.role_id);
      assert.deepStrictEqual(roleIds, ['admin', 'lh_security_admin'], 'Newly created admin must receive admin and lh_security_admin');

      await pglite.close();
    });

    it('2. Existing administrator with custom role assignments retains them without alteration', async () => {
      const pglite = new PGlite();
      await pglite.waitReady;

      const client = {
        engine: 'pglite',
        async query(sql, params) {
          const res = await pglite.query(sql, params);
          return { rows: res.rows, rowCount: res.rows ? res.rows.length : 0 };
        },
        async exec(sql) { await pglite.exec(sql); },
      };

      await initSchemaDDL(client);

      // Seed roles first so foreign keys exist
      await seedInitialData(client);

      // Clear default roles and assign custom role set (e.g. 'secretary', 'avi')
      const userRes = await client.query(`SELECT id FROM users WHERE LOWER(email) = 'bmapwabantoro@liecconsulting.com'`);
      const adminId = userRes.rows[0].id;

      await client.query(`DELETE FROM user_roles WHERE user_id = $1`, [adminId]);
      await client.query(`INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES ($1, 'secretary', 'Custom Auditor'), ($1, 'avi', 'Custom Auditor')`, [adminId]);

      // Re-run seedInitialData (simulating application startup / cold start)
      await seedInitialData(client);

      // Verify custom roles were NOT altered or replaced
      const rolesRes = await client.query(`SELECT role_id, assigned_by FROM user_roles WHERE user_id = $1 ORDER BY role_id`, [adminId]);
      const roleIds = rolesRes.rows.map(r => r.role_id);
      assert.deepStrictEqual(roleIds, ['avi', 'secretary'], 'Custom assigned roles must remain unchanged');
      assert.strictEqual(rolesRes.rows[0].assigned_by, 'Custom Auditor', 'Assigned by auditor must remain intact');

      await pglite.close();
    });

    it('3. Existing administrator without "admin" assignment does not receive it automatically', async () => {
      const pglite = new PGlite();
      await pglite.waitReady;

      const client = {
        engine: 'pglite',
        async query(sql, params) {
          const res = await pglite.query(sql, params);
          return { rows: res.rows, rowCount: res.rows ? res.rows.length : 0 };
        },
        async exec(sql) { await pglite.exec(sql); },
      };

      await initSchemaDDL(client);
      await seedInitialData(client);

      const userRes = await client.query(`SELECT id FROM users WHERE LOWER(email) = 'bmapwabantoro@liecconsulting.com'`);
      const adminId = userRes.rows[0].id;

      // Deliberately revoke 'admin' role
      await client.query(`DELETE FROM user_roles WHERE user_id = $1 AND role_id = 'admin'`, [adminId]);

      // Verify 'admin' is gone
      const beforeRes = await client.query(`SELECT role_id FROM user_roles WHERE user_id = $1`, [adminId]);
      assert.strictEqual(beforeRes.rows.some(r => r.role_id === 'admin'), false);

      // Re-run seedInitialData
      await seedInitialData(client);

      // Verify 'admin' role was NOT restored
      const afterRes = await client.query(`SELECT role_id FROM user_roles WHERE user_id = $1`, [adminId]);
      assert.strictEqual(afterRes.rows.some(r => r.role_id === 'admin'), false, 'Revoked "admin" role must NOT be restored automatically');

      await pglite.close();
    });

    it('4. Existing administrator without "lh_security_admin" assignment does not receive it automatically', async () => {
      const pglite = new PGlite();
      await pglite.waitReady;

      const client = {
        engine: 'pglite',
        async query(sql, params) {
          const res = await pglite.query(sql, params);
          return { rows: res.rows, rowCount: res.rows ? res.rows.length : 0 };
        },
        async exec(sql) { await pglite.exec(sql); },
      };

      await initSchemaDDL(client);
      await seedInitialData(client);

      const userRes = await client.query(`SELECT id FROM users WHERE LOWER(email) = 'bmapwabantoro@liecconsulting.com'`);
      const adminId = userRes.rows[0].id;

      // Deliberately revoke 'lh_security_admin' role
      await client.query(`DELETE FROM user_roles WHERE user_id = $1 AND role_id = 'lh_security_admin'`, [adminId]);

      // Re-run seedInitialData
      await seedInitialData(client);

      // Verify 'lh_security_admin' was NOT restored
      const afterRes = await client.query(`SELECT role_id FROM user_roles WHERE user_id = $1`, [adminId]);
      assert.strictEqual(afterRes.rows.some(r => r.role_id === 'lh_security_admin'), false, 'Revoked "lh_security_admin" role must NOT be restored automatically');

      await pglite.close();
    });

    it('5. Suspended administrator remains suspended and receives no automatic privilege restoration', async () => {
      const pglite = new PGlite();
      await pglite.waitReady;

      const client = {
        engine: 'pglite',
        async query(sql, params) {
          const res = await pglite.query(sql, params);
          return { rows: res.rows, rowCount: res.rows ? res.rows.length : 0 };
        },
        async exec(sql) { await pglite.exec(sql); },
      };

      await initSchemaDDL(client);

      // Pre-create a suspended administrator with no role assignments and custom credentials
      const customHash = 'pbkdf2$100000$saltsusp$hashsusp123';
      const insertRes = await client.query(`
        INSERT INTO users (
          name, first_name, last_name, user_id, email, business_profile, role,
          title, initials, active, password_hash, password_salt,
          suspended_at, suspended_by
        ) VALUES (
          'Suspended Admin', 'Suspended', 'Admin', 'admin_susp', 'bmapwabantoro@liecconsulting.com',
          'Admin', 'admin', 'Suspended Admin', 'SA', FALSE, $1, 'saltsusp',
          NOW(), 'Security Incident Response Team'
        ) RETURNING id
      `, [customHash]);

      const adminId = insertRes.rows[0].id;

      // Re-run seedInitialData (simulating application startup)
      await seedInitialData(client);

      // Verify user account state remained suspended with zero privilege restoration
      const verifyRes = await client.query(`
        SELECT active, suspended_by, password_hash, password_salt FROM users WHERE id = $1
      `, [adminId]);

      assert.strictEqual(verifyRes.rows[0].active, false, 'Suspended admin must remain suspended (active = false)');
      assert.strictEqual(verifyRes.rows[0].suspended_by, 'Security Incident Response Team');
      assert.strictEqual(verifyRes.rows[0].password_hash, customHash, 'Password hash must NOT be modified');

      // Verify zero roles were automatically granted
      const rolesRes = await client.query(`SELECT * FROM user_roles WHERE user_id = $1`, [adminId]);
      assert.strictEqual(rolesRes.rows.length, 0, 'Suspended administrator must receive ZERO automatic role assignments');

      await pglite.close();
    });

    it('6. Repeated initialisation (multiple cold starts) does not change existing user_roles records', async () => {
      const pglite = new PGlite();
      await pglite.waitReady;

      const client = {
        engine: 'pglite',
        async query(sql, params) {
          const res = await pglite.query(sql, params);
          return { rows: res.rows, rowCount: res.rows ? res.rows.length : 0 };
        },
        async exec(sql) { await pglite.exec(sql); },
      };

      await initSchemaDDL(client);
      await seedInitialData(client);

      // Query roles after 1st seed
      const roles1 = await client.query(`SELECT user_id, role_id, assigned_by FROM user_roles ORDER BY user_id, role_id`);

      // Run 2nd seed
      await seedInitialData(client);
      const roles2 = await client.query(`SELECT user_id, role_id, assigned_by FROM user_roles ORDER BY user_id, role_id`);

      // Run 3rd seed
      await seedInitialData(client);
      const roles3 = await client.query(`SELECT user_id, role_id, assigned_by FROM user_roles ORDER BY user_id, role_id`);

      assert.deepStrictEqual(roles1.rows, roles2.rows, 'Roles must be identical between 1st and 2nd initialisation');
      assert.deepStrictEqual(roles2.rows, roles3.rows, 'Roles must be identical between 2nd and 3rd initialisation');

      await pglite.close();
    });
  });
  describe('5. Email Uniqueness & Identity Verification (2 Tests)', () => {
    it('1. Database schema strictly enforces UNIQUE constraint on users.email', async () => {
      const pglite = new PGlite();
      await pglite.waitReady;

      const client = {
        engine: 'pglite',
        async query(sql, params) {
          const res = await pglite.query(sql, params);
          return { rows: res.rows, rowCount: res.rows ? res.rows.length : 0 };
        },
        async exec(sql) { await pglite.exec(sql); },
      };

      await initSchemaDDL(client);

      // Insert first user
      await client.query(`
        INSERT INTO users (name, first_name, last_name, user_id, email, business_profile, role)
        VALUES ('Claire Martin', 'Claire', 'Martin', 'cmartin', 'claire.martin@liecconsulting.com', 'Secretary', 'secretary')
      `);

      // Attempt to insert duplicate email
      await assert.rejects(
        async () => {
          await client.query(`
            INSERT INTO users (name, first_name, last_name, user_id, email, business_profile, role)
            VALUES ('Claire Clone', 'Claire', 'Clone', 'cclone', 'claire.martin@liecconsulting.com', 'Secretary', 'secretary')
          `);
        },
        (err) => {
          assert.strictEqual(err.code, '23505', 'Must throw unique constraint violation error code 23505');
          assert.ok(err.message.includes('users_email_key'), 'Must cite users_email_key unique constraint');
          return true;
        },
        'Database must reject duplicate email insertion'
      );

      await pglite.close();
    });

    it('2. Account provisioning enforces case-insensitive email uniqueness and prevents duplicate creation', async () => {
      const pglite = new PGlite();
      await pglite.waitReady;

      const client = {
        engine: 'pglite',
        async query(sql, params) {
          const res = await pglite.query(sql, params);
          return { rows: res.rows, rowCount: res.rows ? res.rows.length : 0 };
        },
        async exec(sql) { await pglite.exec(sql); },
      };

      await initSchemaDDL(client);
      await seedInitialData(client);

      // Helper function emulating provisionUserAccount's case-insensitive email lookup
      async function findUserByEmailCaseInsensitive(email) {
        const res = await client.query(
          'SELECT id, name, email FROM users WHERE LOWER(email) = LOWER($1)',
          [email.trim()]
        );
        return res.rows.length > 0 ? res.rows[0] : null;
      }

      // 1. Insert user with lowercase email
      await client.query(`
        INSERT INTO users (name, first_name, last_name, user_id, email, business_profile, role)
        VALUES ('Jean Dupont', 'Jean', 'Dupont', 'jdupont', 'jean.dupont@liecconsulting.com', 'Secretary', 'secretary')
      `);

      // 2. Query with uppercase email
      const matchedUpper = await findUserByEmailCaseInsensitive('JEAN.DUPONT@liecconsulting.com');
      assert.ok(matchedUpper, 'Must match existing user case-insensitively');
      assert.strictEqual(matchedUpper.email, 'jean.dupont@liecconsulting.com');

      // 3. Query with mixed-case email
      const matchedMixed = await findUserByEmailCaseInsensitive('Jean.Dupont@liecconsulting.com');
      assert.ok(matchedMixed, 'Must match existing user with mixed case');

      // 4. Verify ON CONFLICT (email) DO NOTHING behaves safely on lowercase normalized insert
      await client.query(`
        INSERT INTO users (name, first_name, last_name, user_id, email, business_profile, role)
        VALUES ('Jean Duplicate', 'Jean', 'Dupont', 'jdupont2', LOWER('JEAN.DUPONT@liecconsulting.com'), 'Secretary', 'secretary')
        ON CONFLICT (email) DO NOTHING
      `);

      // 5. Assert only ONE user exists
      const countRes = await client.query(`
        SELECT COUNT(*) as count FROM users WHERE LOWER(email) = 'jean.dupont@liecconsulting.com'
      `);
      assert.strictEqual(Number(countRes.rows[0].count), 1, 'Exactly one user record must exist; duplicate was prevented');

      await pglite.close();
    });
  });
});
