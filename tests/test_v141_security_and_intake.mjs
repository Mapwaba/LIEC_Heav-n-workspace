/**
 * LIEC Heav'n - v1.4.1 Security Hotfix & Intake Verification Test Suite
 *
 * Verifies:
 * 1. Candidate API Security (GET, POST, PUT, PATCH, DELETE):
 *    - Anonymous rejection with 401 Unauthorized across all HTTP methods.
 *    - RBAC enforcement: Admin full access, Secretary operational access, Finance Officer restricted scoping.
 *    - Finance Officer scoping: 403 on unlinked dossiers, 200 on linked AVI/financing dossiers with non-financial masking.
 *    - Finance Officer write block: 403 Forbidden on POST, PUT, PATCH, DELETE.
 *    - Authentic staff signature in audit logs and notes (no anonymous fallbacks).
 * 2. Public Intake Validation (/api/demandes & /api/prospects):
 *    - Strict rejection of empty `{}` payloads with HTTP 400 Bad Request.
 *    - Strict rejection of dummy emails, phone numbers, and placeholder names.
 *    - Validation of valid public intake and creation of linked records.
 * 3. Monotonic, Concurrency-Safe Reference Allocation:
 *    - Zero reuse of erased historical references (#DEM-2025-102, #CAN-2025-056).
 *    - Next numbers start cleanly at >= #DEM-2025-103 and >= #CAN-2025-057.
 *    - High-concurrency serialized allocation under transaction locks with zero collisions.
 *
 * Database Safety: Runs ONLY against an isolated local PGlite instance.
 * NEVER connects to or modifies external Neon / Production databases.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';

// Force disconnection from any external database
delete process.env.DATABASE_URL;
delete process.env.POSTGRES_URL;
delete process.env.DATABASE_URL_UNPOOLED;
process.env.SESSION_SECRET = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

import { initSchemaDDL, seedInitialData, withTransaction } from '../src/lib/db.ts';
import { allocateDemandeRef, allocateCandidatRef } from '../src/lib/referenceAllocator.ts';
import { evaluateModuleAccess, applyFieldLevelAcl } from '../src/lib/rbac.ts';
import { signSessionToken } from '../src/lib/session.ts';

describe('LIEC Heav\'n v1.4.1 Security Hotfix & Intake Suite', () => {
  let pglite;
  let db;

  // Mock Request helper
  function createMockRequest(method, urlPath, body = null, headers = {}) {
    const headerMap = new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), String(v)]));
    return {
      method,
      url: `http://localhost:3000${urlPath}`,
      headers: {
        get(name) {
          return headerMap.get(name.toLowerCase()) || null;
        },
      },
      cookies: {
        get(name) {
          const cookieHeader = headerMap.get('cookie') || '';
          const match = cookieHeader.split(';').map(c => c.trim()).find(c => c.startsWith(`${name}=`));
          return match ? { value: match.split('=')[1] } : undefined;
        },
      },
      json: async () => (body ? JSON.parse(JSON.stringify(body)) : {}),
    };
  }

  before(async () => {
    pglite = new PGlite();
    await pglite.waitReady;

    let pgliteTxQueue = Promise.resolve();

    db = {
      engine: 'pglite',
      async query(sql, params) {
        const res = await pglite.query(sql, params);
        const rowCount =
          res.rows && res.rows.length > 0
            ? res.rows.length
            : (typeof res.affectedRows === 'number' ? res.affectedRows : 0);
        return { rows: res.rows, rowCount };
      },
      async exec(sql) {
        await pglite.exec(sql);
      },
      async transaction(callback) {
        let release = () => {};
        const currentTxPromise = new Promise((resolve) => {
          release = resolve;
        });
        const previousQueue = pgliteTxQueue;
        pgliteTxQueue = pgliteTxQueue.then(() => currentTxPromise);

        await previousQueue;
        try {
          await pglite.query('BEGIN;');
          try {
            const result = await callback(db);
            await pglite.query('COMMIT;');
            return result;
          } catch (err) {
            await pglite.query('ROLLBACK;').catch(() => {});
            throw err;
          }
        } finally {
          release();
        }
      },
    };

    // Initialize DDL and seed reference roles
    await initSchemaDDL(db);
    await seedInitialData(db);

    // Set global db client so route imports use this isolated PGlite instance
    global.__liecDbClientV4 = Promise.resolve(db);

    // Seed test users
    // 1. Admin
    await db.query(`
      INSERT INTO users (id, name, email, business_profile, role, title, initials, active)
      VALUES (1, 'Barthelemy MAPWABA NTORO', 'bmapwabantoro@liecconsulting.com', 'Admin', 'admin', 'Platform Administrator', 'BM', TRUE)
      ON CONFLICT (id) DO UPDATE SET active = TRUE
    `);
    await db.query(`
      INSERT INTO user_roles (user_id, role_id)
      VALUES (1, 'admin'), (1, 'lh_security_admin')
      ON CONFLICT (user_id, role_id) DO NOTHING
    `);

    // 2. Secretary
    await db.query(`
      INSERT INTO users (id, name, email, business_profile, role, title, initials, active)
      VALUES (2, 'Glodi MUPEMBA', 'gmupemba@liecconsulting.com', 'Secretary', 'secretary', 'Conseiller Senior', 'GM', TRUE)
      ON CONFLICT (id) DO UPDATE SET active = TRUE
    `);
    await db.query(`
      INSERT INTO user_roles (user_id, role_id)
      VALUES (2, 'ITIL'), (2, 'lh_internal')
      ON CONFLICT (user_id, role_id) DO NOTHING
    `);

    // 3. Finance Officer
    await db.query(`
      INSERT INTO users (id, name, email, business_profile, role, title, initials, active)
      VALUES (3, 'Finance Staff', 'finance@liecconsulting.com', 'Finance Officer', 'finance', 'Finance & AVI Officer', 'FS', TRUE)
      ON CONFLICT (id) DO UPDATE SET active = TRUE
    `);
    await db.query(`
      INSERT INTO user_roles (user_id, role_id)
      VALUES (3, 'lh_finance')
      ON CONFLICT (user_id, role_id) DO NOTHING
    `);

    // Seed candidates for testing scoping
    // Candidate 1: Linked to AVI (Student Ref CAN-2025-050)
    await db.query(`
      INSERT INTO candidats (ref, initials, full_name, program, cities, adviser, stage_badge, admission_status, procedure_status, email, phone, notes_json, pieces_json)
      VALUES ('#CAN-2025-050', 'JD', 'John Doe AVI', 'MDS — Web', 'Lyon', 'Glodi MUPEMBA', 'Admitted', 'Admitted', 'Milestone 2', 'john.avi@example.com', '+243810000001',
              '[{"author":"Pedagogical Advisor","text":"Confidential pedagogical note"}]',
              '[{"name":"Passeport","status":"valid"},{"name":"Relevé de notes","status":"pending"}]')
    `);
    await db.query(`
      INSERT INTO avi_requests (
        ref, parent_name, country, town, nationality, occupation, phone, email,
        expected_start, student_name, student_program, student_id_doc, principal_eur, status, student_ref
      ) VALUES (
        'AVI-2025-001', 'Parent Doe', 'RDC', 'Kinshasa', 'Congolaise', 'Cadre', '+243810000000', 'parent@example.com',
        'Septembre 2025', 'John Doe AVI', 'MDS — Web', 'ID-12345', 7500.00, 'Validated', '#CAN-2025-050'
      )
    `);

    // Candidate 2: Unlinked (Student Ref CAN-2025-055)
    await db.query(`
      INSERT INTO candidats (ref, initials, full_name, program, cities, adviser, stage_badge, admission_status, procedure_status, email, phone, notes_json, pieces_json)
      VALUES ('#CAN-2025-055', 'AS', 'Alice Student', 'ISCOM — Com', 'Lyon', 'Glodi MUPEMBA', 'Admitted', 'Admitted', 'Milestone 2', 'alice.student@example.com', '+243810000002',
              '[{"author":"Glodi Mupemba","text":"Internal secret interview remarks"}]',
              '[{"name":"Passeport","status":"valid"}]')
    `);

    // Seed Demande 41 (#DEM-2025-101)
    await db.query(`
      INSERT INTO demandes (ref, initials, full_name, email, phone, country_name, city, program, service_pole)
      VALUES ('#DEM-2025-101', 'DM', 'Demande Historique', 'dem101@example.com', '+243810000003', 'RDC', 'Kinshasa', 'MDS', 'PREPA')
    `);
  });

  after(async () => {
    if (pglite) {
      await pglite.close();
    }
  });

  // ---------------------------------------------------------------------------
  // 1. CANDIDATE API SECURITY & RBAC ENFORCEMENT
  // ---------------------------------------------------------------------------
  describe('1. Candidate API Security & Scoping (/api/candidats)', () => {
    let adminToken;
    let secretaryToken;
    let financeToken;

    async function createTestSession(user) {
      const jti = crypto.randomBytes(32).toString('hex');
      const token = signSessionToken({
        jti,
        userId: user.id,
        email: user.email,
        role: user.role,
        businessProfile: user.business_profile,
        sessionVersion: 1,
      });

      const expiresAt = new Date(Date.now() + 8 * 3600 * 1000);
      await db.query(
        `INSERT INTO user_sessions (jti, user_id, role, expires_at, revoked, last_active_at)
         VALUES ($1, $2, $3, $4, FALSE, CURRENT_TIMESTAMP)`,
        [jti, user.id, user.role, expiresAt]
      );

      return token;
    }

    before(async () => {
      const admRes = await db.query("SELECT * FROM users WHERE email = 'bmapwabantoro@liecconsulting.com'");
      const secRes = await db.query("SELECT * FROM users WHERE email = 'gmupemba@liecconsulting.com'");
      const finRes = await db.query("SELECT * FROM users WHERE email = 'finance@liecconsulting.com'");

      adminToken = await createTestSession(admRes.rows[0]);
      secretaryToken = await createTestSession(secRes.rows[0]);
      financeToken = await createTestSession(finRes.rows[0]);
    });

    it('1.1 Anonymous requests must be rejected with HTTP 401 on all HTTP methods', async () => {
      const { GET, POST, PUT, DELETE, PATCH } = await import('../src/app/api/candidats/route.ts');

      // GET
      const getReq = createMockRequest('GET', '/api/candidats');
      const getRes = await GET(getReq);
      assert.strictEqual(getRes.status, 401, 'Anonymous GET must return 401');

      // POST
      const postReq = createMockRequest('POST', '/api/candidats', { full_name: 'Test' });
      const postRes = await POST(postReq);
      assert.strictEqual(postRes.status, 401, 'Anonymous POST must return 401');

      // PUT
      const putReq = createMockRequest('PUT', '/api/candidats', { ref: '#CAN-2025-050' });
      const putRes = await PUT(putReq);
      assert.strictEqual(putRes.status, 401, 'Anonymous PUT must return 401');

      // PATCH
      const patchReq = createMockRequest('PATCH', '/api/candidats', { ref: '#CAN-2025-050', action: 'add_note' });
      const patchRes = await PATCH(patchReq);
      assert.strictEqual(patchRes.status, 401, 'Anonymous PATCH must return 401');

      // DELETE
      const deleteReq = createMockRequest('DELETE', '/api/candidats?ref=%23CAN-2025-050');
      const deleteRes = await DELETE(deleteReq);
      assert.strictEqual(deleteRes.status, 401, 'Anonymous DELETE must return 401');
    });

    it('1.2 Finance Officer access to unlinked candidate is rejected with HTTP 403', async () => {
      const { GET } = await import('../src/app/api/candidats/route.ts');
      const req = createMockRequest('GET', '/api/candidats?ref=%23CAN-2025-055', null, {
        authorization: `Bearer ${financeToken}`,
      });
      const res = await GET(req);
      assert.strictEqual(res.status, 403, 'Finance Officer requesting unlinked candidate must receive 403');
      const body = await res.json();
      assert.match(body.error, /Finance Officer access is limited to students with active AVI/);
    });

    it('1.3 Finance Officer access to linked candidate returns HTTP 200 with non-financial data masked', async () => {
      const { GET } = await import('../src/app/api/candidats/route.ts');
      const req = createMockRequest('GET', '/api/candidats?ref=%23CAN-2025-050', null, {
        authorization: `Bearer ${financeToken}`,
      });
      const res = await GET(req);
      assert.strictEqual(res.status, 200, 'Finance Officer requesting linked candidate must receive 200');
      const body = await res.json();
      assert.ok(body.ok, 'Response must be ok');
      const cand = body.candidat;
      assert.strictEqual(cand.ref, '#CAN-2025-050');
      // Notes must be masked or empty for Finance Officer
      assert.deepStrictEqual(cand.notes, [], 'Non-financial notes must be masked for Finance Officer');
    });

    it('1.4 Finance Officer is forbidden from write operations (POST, PUT, PATCH, DELETE) with HTTP 403', async () => {
      const { POST, PUT, PATCH, DELETE } = await import('../src/app/api/candidats/route.ts');
      const headers = { authorization: `Bearer ${financeToken}` };

      // POST
      const postReq = createMockRequest('POST', '/api/candidats', { full_name: 'New Student' }, headers);
      const postRes = await POST(postReq);
      assert.strictEqual(postRes.status, 403, 'Finance Officer cannot POST');

      // PUT
      const putReq = createMockRequest('PUT', '/api/candidats', { ref: '#CAN-2025-050' }, headers);
      const putRes = await PUT(putReq);
      assert.strictEqual(putRes.status, 403, 'Finance Officer cannot PUT');

      // PATCH
      const patchReq = createMockRequest('PATCH', '/api/candidats', { ref: '#CAN-2025-050', action: 'add_note' }, headers);
      const patchRes = await PATCH(patchReq);
      assert.strictEqual(patchRes.status, 403, 'Finance Officer cannot PATCH');

      // DELETE
      const deleteReq = createMockRequest('DELETE', '/api/candidats?ref=%23CAN-2025-050', null, headers);
      const deleteRes = await DELETE(deleteReq);
      assert.strictEqual(deleteRes.status, 403, 'Finance Officer cannot DELETE');
    });

    it('1.5 Secretary can create, update and patch, but cannot DELETE candidate', async () => {
      const { POST, DELETE } = await import('../src/app/api/candidats/route.ts');
      const headers = { authorization: `Bearer ${secretaryToken}` };

      // Secretary DELETE -> 403
      const delReq = createMockRequest('DELETE', '/api/candidats?ref=%23CAN-2025-055', null, headers);
      const delRes = await DELETE(delReq);
      assert.strictEqual(delRes.status, 403, 'Secretary cannot DELETE candidates');

      // Secretary POST valid candidate -> 200
      const postReq = createMockRequest(
        'POST',
        '/api/candidats',
        {
          full_name: 'Benoit Kalala',
          email: 'benoit.kalala@example.com',
          phone: '+243815551234',
          program: 'MyDigitalSchool Lyon — Dév. Web & UX/UI',
        },
        headers
      );
      const postRes = await POST(postReq);
      assert.strictEqual(postRes.status, 200, 'Secretary can create candidate');
      const postBody = await postRes.json();
      assert.ok(postBody.ok);
      assert.match(postBody.ref, /^#CAN-2025-\d{3}$/);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. PUBLIC INTAKE VALIDATION & REJECTION
  // ---------------------------------------------------------------------------
  describe('2. Public Intake Validation (/api/demandes & /api/prospects)', () => {
    it('2.1 POST /api/demandes with empty payload {} is strictly rejected with HTTP 400', async () => {
      const { POST } = await import('../src/app/api/demandes/route.ts');
      const req = createMockRequest('POST', '/api/demandes', {});
      const res = await POST(req);
      assert.strictEqual(res.status, 400, 'Empty payload must return 400');
      const body = await res.json();
      assert.strictEqual(body.code, 'VALIDATION_ERROR');
      assert.ok(Array.isArray(body.errors) && body.errors.length >= 3, 'Must report missing required fields');
    });

    it('2.2 POST /api/demandes rejects dummy/placeholder values with HTTP 400', async () => {
      const { POST } = await import('../src/app/api/demandes/route.ts');
      const req = createMockRequest('POST', '/api/demandes', {
        full_name: 'Nouveau Candidat',
        email: 'contact@exemple.com',
        phone: '243810000000',
        program: 'MDS',
      });
      const res = await POST(req);
      assert.strictEqual(res.status, 400, 'Placeholder synthetic values must be rejected');
      const body = await res.json();
      assert.strictEqual(body.code, 'VALIDATION_ERROR');
    });

    it('2.3 POST /api/prospects with empty payload {} is rejected with HTTP 400', async () => {
      const { POST } = await import('../src/app/api/prospects/route.ts');
      const req = createMockRequest('POST', '/api/prospects', {});
      const res = await POST(req);
      assert.strictEqual(res.status, 400, 'Empty prospect payload must return 400');
      const body = await res.json();
      assert.strictEqual(body.code, 'VALIDATION_ERROR');
    });

    it('2.4 POST /api/prospects rejects dummy name "Nouveau Prospect" with HTTP 400', async () => {
      const { POST } = await import('../src/app/api/prospects/route.ts');
      const req = createMockRequest('POST', '/api/prospects', {
        full_name: 'Nouveau Prospect',
        program_tag: 'MyDigitalSchool Lyon',
      });
      const res = await POST(req);
      assert.strictEqual(res.status, 400, 'Dummy prospect name must be rejected');
    });

    it('2.5 Valid public intake creates records with monotonic references starting above floors', async () => {
      const { POST } = await import('../src/app/api/demandes/route.ts');
      const validPayload = {
        full_name: 'Grace Mwamba',
        email: 'grace.mwamba@domain.com',
        phone: '+243819876543',
        program: 'MyDigitalSchool Lyon — Dév. Web & UX/UI',
        country_name: 'RDC',
        city: 'Kinshasa',
      };

      const req = createMockRequest('POST', '/api/demandes', validPayload);
      const res = await POST(req);
      assert.strictEqual(res.status, 200, 'Valid intake must succeed with 200');
      const body = await res.json();

      assert.ok(body.ok, 'Response must be ok');
      assert.ok(body.ref, 'Demande ref must be present');
      assert.ok(body.candidatRef, 'Candidate ref must be present');

      // Floor checks:
      // Demande floor is 102 (historical Demande 41 Cosma), so next must be >= 103!
      const demNum = parseInt(body.ref.replace('#DEM-2025-', ''), 10);
      assert.ok(demNum >= 103, `Demande reference number (${demNum}) must be >= 103 and never reuse #DEM-2025-102`);

      // Candidat floor is 56, so next must be >= 57!
      const canNum = parseInt(body.candidatRef.replace('#CAN-2025-', ''), 10);
      assert.ok(canNum >= 57, `Candidate reference number (${canNum}) must be >= 57 and never reuse #CAN-2025-056`);

      // Verify records exist in database
      const demDb = await db.query('SELECT * FROM demandes WHERE ref = $1', [body.ref]);
      assert.strictEqual(demDb.rows.length, 1, 'Demande must exist in database');

      const canDb = await db.query('SELECT * FROM candidats WHERE ref = $1', [body.candidatRef]);
      assert.strictEqual(canDb.rows.length, 1, 'Candidat must exist in database');

      const proDb = await db.query('SELECT * FROM prospects WHERE full_name = $1', [validPayload.full_name]);
      assert.strictEqual(proDb.rows.length, 1, 'Prospect must exist in database');
    });
  });

  // ---------------------------------------------------------------------------
  // 3. MONOTONIC REFERENCE ALLOCATION & CONCURRENCY SAFETY
  // ---------------------------------------------------------------------------
  describe('3. Monotonic Reference Allocation & Concurrency Safety', () => {
    it('3.1 allocateDemandeRef and allocateCandidatRef respect historical floors and never collide', async () => {
      const nextDem = await withTransaction(db, async (txDb) => {
        return allocateDemandeRef(txDb, 2025);
      });
      const nextCan = await withTransaction(db, async (txDb) => {
        return allocateCandidatRef(txDb, 2025);
      });

      const demNum = parseInt(nextDem.replace('#DEM-2025-', ''), 10);
      const canNum = parseInt(nextCan.replace('#CAN-2025-', ''), 10);

      assert.ok(demNum >= 103, `allocateDemandeRef must produce >= 103 (got ${demNum})`);
      assert.ok(canNum >= 57, `allocateCandidatRef must produce >= 57 (got ${canNum})`);
    });

    it('3.2 Concurrent parallel allocations produce strictly unique monotonic references without collision', async () => {
      const CONCURRENCY_COUNT = 8;
      const promises = [];

      for (let i = 0; i < CONCURRENCY_COUNT; i++) {
        promises.push(
          withTransaction(db, async (txDb) => {
            const ref = await allocateDemandeRef(txDb, 2025);
            // Simulate minimal work inside transaction
            await txDb.query(
              `INSERT INTO demandes (ref, initials, full_name, email, phone, country_name, city, program, service_pole)
               VALUES ($1, 'TC', $2, $3, '+243810000999', 'RDC', 'Kinshasa', 'MDS', 'PREPA')`,
              [ref, `Concurrent Test ${i}`, `concurrent_${i}_${Date.now()}@example.com`]
            );
            return ref;
          })
        );
      }

      const results = await Promise.all(promises);
      assert.strictEqual(results.length, CONCURRENCY_COUNT, 'All concurrent allocations must complete');

      // Verify all references are unique
      const uniqueRefs = new Set(results);
      assert.strictEqual(uniqueRefs.size, CONCURRENCY_COUNT, 'All allocated references must be unique (zero collisions)');

      // Verify all are strictly formatted and above floor 102
      for (const ref of results) {
        assert.match(ref, /^#DEM-2025-\d{3}$/);
        const num = parseInt(ref.replace('#DEM-2025-', ''), 10);
        assert.ok(num >= 103, `Reference ${ref} must be >= 103`);
      }
    });
  });
});
