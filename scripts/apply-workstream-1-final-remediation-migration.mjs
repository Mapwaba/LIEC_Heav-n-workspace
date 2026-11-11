import pg from 'pg';
const { Client } = pg;

const connectionString = 'postgresql://neondb_owner:npg_R9CLATxen2Sw@ep-wispy-firefly-b9el08l7.c-7.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function migratePreview() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    console.log('[MIGRATION] Connected to Neon Preview database (ep-wispy-firefly-b9el08l7).');

    await client.query('BEGIN');

    // 1. Create mfa_enrollment_authorizations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS mfa_enrollment_authorizations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(64) NOT NULL UNIQUE,
        created_by INTEGER REFERENCES users(id),
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        used_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_mfa_auth_user ON mfa_enrollment_authorizations(user_id);
      CREATE INDEX IF NOT EXISTS idx_mfa_auth_hash ON mfa_enrollment_authorizations(token_hash);
    `);
    console.log('[MIGRATION] Created mfa_enrollment_authorizations table and indexes.');

    // 2. Create user_sessions table for per-session jti tracking, revocation, and idle timeouts
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id SERIAL PRIMARY KEY,
        jti VARCHAR(64) NOT NULL UNIQUE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(40) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_active_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        revoked BOOLEAN NOT NULL DEFAULT FALSE,
        revoked_at TIMESTAMP WITH TIME ZONE
      );
      CREATE INDEX IF NOT EXISTS idx_user_sessions_jti ON user_sessions(jti);
      CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);
    `);
    console.log('[MIGRATION] Created user_sessions table and indexes.');

    await client.query('COMMIT');

    // Verify schemas
    const authTable = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'mfa_enrollment_authorizations'
      ORDER BY ordinal_position;
    `);
    console.log('[MIGRATION VERIFIED] mfa_enrollment_authorizations columns:', authTable.rows.map(r => `${r.column_name} (${r.data_type})`));

    const sessTable = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'user_sessions'
      ORDER BY ordinal_position;
    `);
    console.log('[MIGRATION VERIFIED] user_sessions columns:', sessTable.rows.map(r => `${r.column_name} (${r.data_type})`));

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[MIGRATION ERROR]', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migratePreview();
