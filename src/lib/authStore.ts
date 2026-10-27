import { getDb } from '@/lib/db';
import { generateBase32Secret } from '@/lib/totp';
import { canonicalizeUserEmail } from '@/lib/rbac';

// In-memory fallback map to guarantee 2FA state persistence even across dev hot-reloads
interface User2FaRecord {
  email: string;
  secret: string;
  isActivated: boolean;
  activatedAt?: string;
  lastVerifiedAt?: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __liec2FaMemoryStore: Map<string, User2FaRecord> | undefined;
}

if (!global.__liec2FaMemoryStore) {
  global.__liec2FaMemoryStore = new Map();
}

const memoryStore = global.__liec2FaMemoryStore;

export async function getOrCreateStaff2Fa(
  rawEmail: string
): Promise<{ email: string; secret: string; isActivated: boolean }> {
  const email = canonicalizeUserEmail(rawEmail);

  // 1. Try DB
  try {
    const db = await getDb();
    const res = await db.query(
      'SELECT secret, is_activated FROM staff_2fa WHERE LOWER(user_email) = $1',
      [email]
    );

    if (res.rows.length > 0) {
      const row = res.rows[0];
      const record: User2FaRecord = {
        email,
        secret: row.secret,
        isActivated: Boolean(row.is_activated),
      };
      memoryStore.set(email, record);
      return record;
    }

    // Check memory store next
    if (memoryStore.has(email)) {
      const mem = memoryStore.get(email)!;
      try {
        await db.query(
          `INSERT INTO staff_2fa (user_email, secret, is_activated)
           VALUES ($1, $2, $3)
           ON CONFLICT (user_email) DO UPDATE SET secret = $2`,
          [email, mem.secret, mem.isActivated]
        );
      } catch (e) {
        console.warn('Sync 2FA to DB skipped:', e);
      }
      return mem;
    }

    // Create new secret
    const newSecret = generateBase32Secret(20);
    const newRecord: User2FaRecord = {
      email,
      secret: newSecret,
      isActivated: false,
    };
    memoryStore.set(email, newRecord);

    try {
      await db.query(
        `INSERT INTO staff_2fa (user_email, secret, is_activated)
         VALUES ($1, $2, FALSE)
         ON CONFLICT (user_email) DO NOTHING`,
        [email, newSecret]
      );
    } catch (dbErr) {
      console.warn('DB insert staff_2fa error:', dbErr);
    }

    return newRecord;
  } catch (err) {
    console.warn('DB unavailable for 2FA, using fallback memory store:', err);
    if (!memoryStore.has(email)) {
      const newSecret = generateBase32Secret(20);
      memoryStore.set(email, {
        email,
        secret: newSecret,
        isActivated: false,
      });
    }
    return memoryStore.get(email)!;
  }
}

export async function activateStaff2Fa(rawEmail: string): Promise<void> {
  const email = canonicalizeUserEmail(rawEmail);
  const now = new Date().toISOString();

  if (memoryStore.has(email)) {
    const mem = memoryStore.get(email)!;
    mem.isActivated = true;
    mem.activatedAt = now;
    mem.lastVerifiedAt = now;
  }

  try {
    const db = await getDb();
    await db.query(
      `UPDATE staff_2fa
       SET is_activated = TRUE, activated_at = CURRENT_TIMESTAMP, last_verified_at = CURRENT_TIMESTAMP
       WHERE LOWER(user_email) = $1`,
      [email]
    );
  } catch (err) {
    console.warn('DB update staff_2fa activation skipped:', err);
  }
}

export async function recordStaff2FaVerification(rawEmail: string): Promise<void> {
  const email = canonicalizeUserEmail(rawEmail);
  const now = new Date().toISOString();

  if (memoryStore.has(email)) {
    const mem = memoryStore.get(email)!;
    mem.lastVerifiedAt = now;
  }

  try {
    const db = await getDb();
    await db.query(
      `UPDATE staff_2fa
       SET last_verified_at = CURRENT_TIMESTAMP
       WHERE LOWER(user_email) = $1`,
      [email]
    );
  } catch (err) {
    console.warn('DB update staff_2fa last_verified skipped:', err);
  }
}
