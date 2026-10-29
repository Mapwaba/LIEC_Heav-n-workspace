import { Pool } from 'pg';
import crypto from 'crypto';

function verifyPassword(password, hash, salt) {
  if (!password || !hash || !salt) return false;
  try {
    const computed = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(hash, 'hex'));
  } catch {
    return false;
  }
}

async function main() {
  const connStr = process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL;
  const pool = new Pool({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false },
  });

  console.log('[+] Verifying Admin configuration in Neon database...');
  const res = await pool.query(`
    SELECT u.id, u.name, u.email, u.business_profile, u.role, u.title, u.initials,
           u.active, u.must_change_password, u.password_hash, u.password_salt,
           COALESCE(ARRAY_AGG(ur.role_id) FILTER (WHERE ur.role_id IS NOT NULL), ARRAY[]::VARCHAR[]) as technical_roles
    FROM users u
    LEFT JOIN user_roles ur ON u.id = ur.user_id
    WHERE LOWER(u.email) = 'bmapwabantoro@liecconsulting.com'
    GROUP BY u.id, u.name, u.email, u.business_profile, u.role, u.title, u.initials, u.active, u.must_change_password, u.password_hash, u.password_salt;
  `);

  if (res.rows.length === 0) {
    console.error('[✗] Admin account not found in database!');
    process.exit(1);
  }

  const admin = res.rows[0];
  console.log(`[✓] Admin Account Found:`);
  console.log(`    ID:                   ${admin.id}`);
  console.log(`    Name:                 ${admin.name}`);
  console.log(`    Email:                ${admin.email}`);
  console.log(`    Profile:              ${admin.business_profile}`);
  console.log(`    Role:                 ${admin.role}`);
  console.log(`    Technical Roles:      ${admin.technical_roles.join(', ')}`);
  console.log(`    Active:               ${admin.active}`);
  console.log(`    Must Change Password: ${admin.must_change_password}`);
  console.log(`    Password Hash Exists: ${Boolean(admin.password_hash && admin.password_salt)}`);

  // Verify other business tables are clean
  const counts = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM demandes) as demandes_count,
      (SELECT COUNT(*) FROM candidats) as candidats_count,
      (SELECT COUNT(*) FROM prospects) as prospects_count,
      (SELECT COUNT(*) FROM avi_requests) as avi_count,
      (SELECT COUNT(*) FROM accommodation_requests) as acc_count,
      (SELECT COUNT(*) FROM users) as users_count
  `);

  console.log('\n[✓] Subproduction Tables State:');
  console.log(`    Demandes:             ${counts.rows[0].demandes_count}`);
  console.log(`    Candidats:            ${counts.rows[0].candidats_count}`);
  console.log(`    Prospects:            ${counts.rows[0].prospects_count}`);
  console.log(`    AVI Requests:         ${counts.rows[0].avi_count}`);
  console.log(`    Accommodation:        ${counts.rows[0].acc_count}`);
  console.log(`    Users (Admin only):   ${counts.rows[0].users_count}`);

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
