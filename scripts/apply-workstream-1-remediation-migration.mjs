import pg from 'pg';
const { Client } = pg;

const connectionString = 'postgresql://neondb_owner:npg_R9CLATxen2Sw@ep-wispy-firefly-b9el08l7.c-7.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function migratePreview() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    console.log('Connected to Neon Preview database.');

    await client.query('BEGIN');

    // 1. Add MFA fields to users table
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enrolled BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_secret_encrypted TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enrolled_at TIMESTAMP WITH TIME ZONE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_last_timestep BIGINT DEFAULT 0;
    `);
    console.log('Added MFA columns to users table.');

    // 2. Create user_mfa_recovery_codes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_mfa_recovery_codes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        code_hash VARCHAR(64) NOT NULL,
        used_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_mfa_recovery_codes_user ON user_mfa_recovery_codes(user_id);
      CREATE INDEX IF NOT EXISTS idx_mfa_recovery_codes_hash ON user_mfa_recovery_codes(code_hash);
    `);
    console.log('Created user_mfa_recovery_codes table and indexes.');

    // 3. Create rate_limit_buckets table for distributed rate limiting
    await client.query(`
      CREATE TABLE IF NOT EXISTS rate_limit_buckets (
        key VARCHAR(128) PRIMARY KEY,
        count INTEGER NOT NULL DEFAULT 1,
        reset_at TIMESTAMP WITH TIME ZONE NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_rate_limit_reset ON rate_limit_buckets(reset_at);
    `);
    console.log('Created rate_limit_buckets table and indexes.');

    await client.query('COMMIT');

    // Verification queries
    const cols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name LIKE 'mfa%'
      ORDER BY ordinal_position;
    `);
    console.log('Verified users MFA columns:', cols.rows);

    const recTable = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'user_mfa_recovery_codes'
      ORDER BY ordinal_position;
    `);
    console.log('Verified user_mfa_recovery_codes columns:', recTable.rows);

    const rlTable = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'rate_limit_buckets'
      ORDER BY ordinal_position;
    `);
    console.log('Verified rate_limit_buckets columns:', rlTable.rows);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration error:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migratePreview();
