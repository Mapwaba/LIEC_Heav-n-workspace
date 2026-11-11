import pg from 'pg';
import crypto from 'crypto';

const { Client } = pg;
const connectionString = process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_R9CLATxen2Sw@ep-wispy-firefly-b9el08l7.c-7.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function bootstrap() {
  const targetEmail = (process.argv[2] || 'bmapwabantoro@liecconsulting.com').trim().toLowerCase();
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    console.log(`[BOOTSTRAP] Connected to Preview DB. Targeting user: ${targetEmail}`);

    const userRes = await client.query(`SELECT id, name, email, role FROM users WHERE LOWER(email) = $1`, [targetEmail]);
    if (userRes.rows.length === 0) {
      console.error(`[ERROR] User ${targetEmail} not found in database.`);
      process.exit(1);
    }

    const user = userRes.rows[0];
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    await client.query('BEGIN');
    await client.query(
      `UPDATE mfa_enrollment_authorizations SET used_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND used_at IS NULL`,
      [user.id]
    );

    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000);
    await client.query(
      `INSERT INTO mfa_enrollment_authorizations (user_id, token_hash, created_by, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [user.id, tokenHash, user.id, expiresAt]
    );

    await client.query(
      `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
       VALUES ('Bootstrap Script', 'MFA_BOOTSTRAP_TOKEN_GENERATED', $1, 'SUCCESS', 'Generated single-use bootstrap token via CLI.')`,
      [`USER-${user.id}`]
    );
    await client.query('COMMIT');

    console.log('\n================================================================');
    console.log('MFA ONE-TIME ENROLMENT BOOTSTRAP TOKEN GENERATED');
    console.log('================================================================');
    console.log(`User:      ${user.name} (${user.email})`);
    console.log(`Role:      ${user.role}`);
    console.log(`Expires:   ${expiresAt.toISOString()}`);
    console.log(`Token:     ${rawToken}`);
    console.log('================================================================\n');
  } catch (err) {
    console.error('Bootstrap error:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

bootstrap();
