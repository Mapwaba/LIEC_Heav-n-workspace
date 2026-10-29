import { Pool } from 'pg';
import crypto from 'crypto';

function generateSecureTemporaryPassword() {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%*&-+=';

  const chars = [
    upper[crypto.randomInt(0, upper.length)],
    upper[crypto.randomInt(0, upper.length)],
    lower[crypto.randomInt(0, lower.length)],
    lower[crypto.randomInt(0, lower.length)],
    digits[crypto.randomInt(0, digits.length)],
    digits[crypto.randomInt(0, digits.length)],
    symbols[crypto.randomInt(0, symbols.length)],
    symbols[crypto.randomInt(0, symbols.length)],
  ];

  const all = upper + lower + digits + symbols;
  while (chars.length < 16) {
    chars.push(all[crypto.randomInt(0, all.length)]);
  }

  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

function verifyPassword(password, hash, salt) {
  const computed = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(hash, 'hex'));
}

async function main() {
  const connStr = process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL;
  const pool = new Pool({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false },
  });

  const email = 'bmapwabantoro@liecconsulting.com';
  const name = 'Barthelemy MAPWABA NTORO';
  const tempPassword = generateSecureTemporaryPassword();
  const { hash, salt } = hashPassword(tempPassword);

  // Update Neon database
  await pool.query(
    `UPDATE users
     SET name = $1,
         business_profile = 'Admin',
         role = 'admin',
         title = 'Platform Administrator & Managing Director',
         initials = 'BM',
         active = TRUE,
         password_hash = $2,
         password_salt = $3,
         must_change_password = TRUE
     WHERE LOWER(email) = $4`,
    [name, hash, salt, email]
  );

  // Verify
  const check = await pool.query('SELECT password_hash, password_salt, must_change_password FROM users WHERE LOWER(email) = $1', [email]);
  const row = check.rows[0];
  const ok = verifyPassword(tempPassword, row.password_hash, row.password_salt);

  if (!ok) {
    console.error('Password verification check failed');
    process.exit(1);
  }

  console.log('[✓] Admin credentials set and verified successfully.');
  // Output secure handoff file (ignored by git)
  fs.writeFileSync('.admin-credentials.json', JSON.stringify({
    name,
    email,
    temporaryPassword: tempPassword,
    mustChangePassword: true,
    generatedAt: new Date().toISOString()
  }, null, 2), { mode: 0o600 });

  await pool.end();
}

import fs from 'fs';
main().catch(console.error);
