/**
 * Schema Migration Tool for Neon Subproduction
 *
 * Uses direct connection (DATABASE_URL) to apply the full DDL schema.
 */

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

async function main() {
  const directUrl = process.env.DATABASE_URL;
  if (!directUrl) {
    console.error('DATABASE_URL is required to run migrations.');
    process.exit(1);
  }

  const schemaPath = path.join(process.cwd(), 'database', 'schema.sql');
  if (!fs.existsSync(schemaPath)) {
    console.error('database/schema.sql not found at:', schemaPath);
    process.exit(1);
  }

  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  console.log('[+] Connecting to Neon via direct connection for schema migration...');
  const pool = new Pool({
    connectionString: directUrl,
    connectionTimeoutMillis: 15000,
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();

  try {
    console.log('[+] Executing database/schema.sql on Neon...');
    await client.query(schemaSql);
    console.log('[✓] Schema executed successfully!');

    // Query tables created
    const res = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log(`\n[✓] Tables in Neon subproduction (${res.rows.length}):`);
    res.rows.forEach((r) => console.log(`    - ${r.table_name}`));

    client.release();
    await pool.end();
  } catch (err) {
    console.error('[✗] Migration error:', err);
    client.release();
    await pool.end();
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
