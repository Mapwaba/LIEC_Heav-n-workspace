/**
 * Subproduction Neon PostgreSQL Diagnostic & Verification Tool
 *
 * Verifies connectivity, connection pooling, SSL settings, and table schemas
 * WITHOUT logging or exposing credentials.
 */

import { Pool } from 'pg';

function parseSafeInfo(rawUrl) {
  try {
    const u = new URL(rawUrl);
    return {
      host: u.host,
      database: u.pathname.replace(/^\//, '') || 'neondb',
      protocol: u.protocol,
    };
  } catch {
    return { host: 'invalid-url', database: 'unknown', protocol: 'unknown' };
  }
}

async function testConnection(label, connStr) {
  if (!connStr) {
    console.log(`[-] ${label}: Not configured (skipped).`);
    return null;
  }

  const safe = parseSafeInfo(connStr);
  console.log(`\n======================================================`);
  console.log(`[+] Testing ${label}:`);
  console.log(`    Host:     ${safe.host}`);
  console.log(`    Database: ${safe.database}`);
  console.log(`    Protocol: ${safe.protocol}`);
  console.log(`======================================================`);

  const pool = new Pool({
    connectionString: connStr,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 10000,
    max: 2,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const start = Date.now();
    const res = await pool.query('SELECT current_database() as db, current_user as usr, version() as ver, NOW() as server_time');
    const latency = Date.now() - start;

    console.log(`[✓] Connected successfully in ${latency}ms!`);
    console.log(`    Database:    ${res.rows[0].db}`);
    console.log(`    Server Time: ${res.rows[0].server_time}`);
    console.log(`    Engine:      ${res.rows[0].ver.slice(0, 45)}...`);

    // Verify existing tables
    const tableRes = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log(`\n[i] Public Tables Found (${tableRes.rows.length}):`);
    const tableNames = tableRes.rows.map((r) => r.table_name);
    console.log(`    ${tableNames.join(', ') || 'No public tables found yet.'}`);

    // If tables exist, check record counts
    if (tableNames.includes('users')) {
      const uRes = await pool.query('SELECT COUNT(*) as count FROM users');
      console.log(`    users:                   ${uRes.rows[0].count} records`);
    }
    if (tableNames.includes('demandes')) {
      const dRes = await pool.query('SELECT COUNT(*) as count FROM demandes');
      console.log(`    demandes:                ${dRes.rows[0].count} records`);
    }
    if (tableNames.includes('candidats')) {
      const cRes = await pool.query('SELECT COUNT(*) as count FROM candidats');
      console.log(`    candidats:               ${cRes.rows[0].count} records`);
    }
    if (tableNames.includes('prospects')) {
      const pRes = await pool.query('SELECT COUNT(*) as count FROM prospects');
      console.log(`    prospects:               ${pRes.rows[0].count} records`);
    }
    if (tableNames.includes('avi_requests')) {
      const aRes = await pool.query('SELECT COUNT(*) as count FROM avi_requests');
      console.log(`    avi_requests:            ${aRes.rows[0].count} records`);
    }

    await pool.end();
    return { success: true, tables: tableNames };
  } catch (err) {
    console.error(`[✗] Connection test failed for ${label}:`, err.message);
    await pool.end().catch(() => {});
    return { success: false, error: err.message };
  }
}

async function main() {
  const direct = process.env.DATABASE_URL;
  const pooled = process.env.DATABASE_URL_POOLED;

  if (!direct && !pooled) {
    console.log('\n[!] Neither DATABASE_URL nor DATABASE_URL_POOLED is set in environment.');
    console.log('    Provide them via environment variables or a local subproduction configuration file.');
    process.exit(1);
  }

  if (pooled) {
    await testConnection('Neon Pooled Connection (DATABASE_URL_POOLED)', pooled);
  }
  if (direct) {
    await testConnection('Neon Direct Connection (DATABASE_URL)', direct);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
