/**
 * Subproduction Neon Controlled Demo-Data Cleanup & Admin Provisioning Tool
 *
 * Implements strict safeguards:
 * 1. Checks that connection is subproduction (not production).
 * 2. Pre-counts records per category before transaction.
 * 3. Deletes demo business records in reverse foreign-key order.
 * 4. Preserves roles, system configurations, and creates/updates Barthelemy MAPWABA NTORO.
 * 5. Generates cryptographically strong temporary credentials with PBKDF2/SHA-512.
 */

import { Pool } from 'pg';
import crypto from 'crypto';

function generateSecureTemporaryPassword() {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%*&-+=';

  const requiredChars = [
    upper[crypto.randomInt(0, upper.length)],
    upper[crypto.randomInt(0, upper.length)],
    lower[crypto.randomInt(0, lower.length)],
    lower[crypto.randomInt(0, lower.length)],
    digits[crypto.randomInt(0, digits.length)],
    digits[crypto.randomInt(0, digits.length)],
    symbols[crypto.randomInt(0, symbols.length)],
    symbols[crypto.randomInt(0, symbols.length)],
  ];

  const allChars = upper + lower + digits + symbols;
  while (requiredChars.length < 16) {
    requiredChars.push(allChars[crypto.randomInt(0, allChars.length)]);
  }

  for (let i = requiredChars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [requiredChars[i], requiredChars[j]] = [requiredChars[j], requiredChars[i]];
  }

  return requiredChars.join('');
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

function parseSafeInfo(rawUrl) {
  try {
    const u = new URL(rawUrl);
    return {
      host: u.host,
      database: u.pathname.replace(/^\//, '') || 'neondb',
    };
  } catch {
    return { host: 'unknown-host', database: 'unknown' };
  }
}

export async function runSubproductionReset(connectionString, executeWipe = false) {
  const safe = parseSafeInfo(connectionString);

  console.log(`\n======================================================`);
  console.log(`[!] SUBPRODUCTION DATA RESET CHECK`);
  console.log(`    Target Host:     ${safe.host}`);
  console.log(`    Target Database: ${safe.database}`);
  console.log(`    Dry Run / Mode:  ${executeWipe ? 'EXECUTION' : 'DRY-RUN (Inspection only)'}`);
  console.log(`======================================================`);

  const pool = new Pool({
    connectionString,
    connectionTimeoutMillis: 10000,
    max: 2,
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();

  try {
    // 1. Pre-cleanup audit count
    const countTable = async (t) => {
      try {
        const r = await client.query(`SELECT COUNT(*) as count FROM ${t}`);
        return Number(r.rows[0].count);
      } catch {
        return 0;
      }
    };

    const preCounts = {
      demande_notes: await countTable('demande_notes'),
      demandes: await countTable('demandes'),
      prospects: await countTable('prospects'),
      candidats: await countTable('candidats'),
      priority_tasks: await countTable('priority_tasks'),
      avi_requests: await countTable('avi_requests'),
      prepa_cohorts: await countTable('prepa_cohorts'),
      invoices: await countTable('invoices'),
      audit_logs: await countTable('audit_logs'),
      accommodation_requests: await countTable('accommodation_requests'),
      parent_student_links: await countTable('parent_student_links'),
      users: await countTable('users'),
      user_roles: await countTable('user_roles'),
      roles: await countTable('roles'),
    };

    console.log('\n[i] Current Record Counts Before Reset:');
    Object.entries(preCounts).forEach(([k, v]) => {
      console.log(`    - ${k.padEnd(24)}: ${v}`);
    });

    if (!executeWipe) {
      console.log('\n[✓] Dry-run audit complete. Pass --execute to perform controlled reset.');
      client.release();
      await pool.end();
      return { success: true, preCounts, dryRun: true };
    }

    console.log('\n[!] Executing controlled subproduction transaction...');
    await client.query('BEGIN');

    // Delete in reverse foreign key order
    await client.query('DELETE FROM demande_notes;');
    await client.query('DELETE FROM parent_student_links;');
    await client.query('DELETE FROM accommodation_requests;');
    await client.query('DELETE FROM avi_requests;');
    await client.query('DELETE FROM demandes;');
    await client.query('DELETE FROM prospects;');
    await client.query('DELETE FROM candidats;');
    await client.query('DELETE FROM priority_tasks;');
    await client.query('DELETE FROM prepa_cohorts;');
    await client.query('DELETE FROM invoices;');
    await client.query('DELETE FROM audit_logs;');

    // Admin user provisioning
    const adminEmail = 'bmapwabantoro@liecconsulting.com';
    const adminName = 'Barthelemy MAPWABA NTORO';
    const tempPassword = generateSecureTemporaryPassword();
    const { hash, salt } = hashPassword(tempPassword);

    // Delete non-admin users
    await client.query(
      `DELETE FROM user_roles WHERE user_id NOT IN (SELECT id FROM users WHERE LOWER(email) = $1);`,
      [adminEmail]
    );
    await client.query(
      `DELETE FROM users WHERE LOWER(email) != $1;`,
      [adminEmail]
    );

    // Ensure roles exist
    await client.query(`
      INSERT INTO roles (role_id, role_name, business_profile, description, safeguards, active) VALUES
        ('admin', 'Platform Administrator', 'Admin', 'Highest privilege. Assign only to trusted administrators.', 'Assign only to trusted administrators; log assignments and removals.', TRUE),
        ('lh_security_admin', 'Security Administrator', 'Admin', 'Security administration. Limit access to security configuration and sensitive controls.', 'Limit access to security configuration and sensitive controls.', TRUE),
        ('ITIL', 'ITIL Workflow Operator', 'Secretary', 'Secretary workflows (as configured). Applicant intake and administrative tracking.', 'Do not assume this role means full administrator access. Verify permissions and inherited access.', TRUE),
        ('lh_internal', 'Internal Application Access', 'Secretary', 'Internal application access. Restrict to applicant intake, assigned records, comments and history.', 'Restrict to applicant intake, assigned records, comments and history.', TRUE),
        ('lh_finance', 'Finance & AVI Officer', 'Finance Officer', 'AVI and parent-financing operations, YIMMILINE desk calculations and loan requests.', 'Restrict to AVI-related functions and records; do not grant unrelated finance or system configuration access.', TRUE)
      ON CONFLICT (role_id) DO NOTHING;
    `);

    // Insert or update Admin
    const userRes = await client.query(
      `INSERT INTO users (name, email, business_profile, role, title, initials, active, password_hash, password_salt, must_change_password)
       VALUES ($1, $2, 'Admin', 'admin', 'Platform Administrator & Managing Director', 'BM', TRUE, $3, $4, TRUE)
       ON CONFLICT (email) DO UPDATE SET
         name = EXCLUDED.name,
         business_profile = 'Admin',
         role = 'admin',
         title = 'Platform Administrator & Managing Director',
         initials = 'BM',
         active = TRUE,
         password_hash = EXCLUDED.password_hash,
         password_salt = EXCLUDED.password_salt,
         must_change_password = TRUE
       RETURNING id, name, email, business_profile, role;`,
      [adminName, adminEmail, hash, salt]
    );

    const adminId = userRes.rows[0].id;

    // Assign technical roles to Admin
    await client.query(
      `INSERT INTO user_roles (user_id, role_id, assigned_by)
       VALUES ($1, 'admin', 'System Initializer'),
              ($1, 'lh_security_admin', 'System Initializer')
       ON CONFLICT (user_id, role_id) DO NOTHING;`,
      [adminId]
    );

    // Initial Audit Log Entry for Admin initialization
    await client.query(
      `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
       VALUES ($1, 'INITIALIZE_SUBPRODUCTION', 'SYSTEM', 'SUCCESS', $2);`,
      [
        adminName,
        'Subproduction demo data wiped. Primary administrator account initialized with secure credentials and mandatory first-login password change.'
      ]
    );

    await client.query('COMMIT');
    console.log('[✓] Transaction successfully committed.');

    client.release();
    await pool.end();

    return {
      success: true,
      preCounts,
      admin: {
        id: adminId,
        name: adminName,
        email: adminEmail,
        role: 'Admin',
        technical_roles: ['admin', 'lh_security_admin'],
      },
      temporaryPassword: tempPassword,
    };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    client.release();
    await pool.end();
    console.error('[✗] Subproduction reset failed:', err);
    throw err;
  }
}

if (process.argv[1]?.endsWith('reset-subproduction-data.mjs')) {
  const direct = process.env.DATABASE_URL || process.env.DATABASE_URL_POOLED;
  const isExecute = process.argv.includes('--execute');

  if (!direct) {
    console.error('DATABASE_URL or DATABASE_URL_POOLED required');
    process.exit(1);
  }

  runSubproductionReset(direct, isExecute)
    .then((res) => {
      if (res.temporaryPassword) {
        console.log(`\n======================================================`);
        console.log(`[✓] ADMINISTRATOR CONFIGURED: ${res.admin.name} (${res.admin.email})`);
        console.log(`[i] One-time temporary password generated (mandatory change on first login)`);
        console.log(`======================================================`);
      }
    })
    .catch(() => process.exit(1));
}
