import pg from 'pg';
const { Client } = pg;

const connectionString = 'postgresql://neondb_owner:npg_R9CLATxen2Sw@ep-wispy-firefly-b9el08l7.c-7.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function migratePreview() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    console.log('Connected to Neon Preview database.');

    await client.query('BEGIN');

    // 1. Add session_version to users table
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 1;
    `);
    console.log('Added session_version to users table.');

    // 2. Create password_resets table
    await client.query(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(64) NOT NULL UNIQUE,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        used_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_password_resets_token_hash ON password_resets(token_hash);
      CREATE INDEX IF NOT EXISTS idx_password_resets_user_id ON password_resets(user_id);
    `);
    console.log('Created password_resets table and indexes.');

    await client.query('COMMIT');

    // Verify
    const colsRes = await client.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name IN ('session_version', 'password_updated_at', 'must_change_password');
    `);
    console.log('Verified users columns:', colsRes.rows);

    const prTableRes = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'password_resets' 
      ORDER BY ordinal_position;
    `);
    console.log('Verified password_resets columns:', prTableRes.rows);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration error:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migratePreview();
