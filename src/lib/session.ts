import crypto from 'crypto';
import type { DBClient } from './db.ts';

export const SESSION_COOKIE_NAME = 'liec_session';

export interface SessionPayload {
  jti: string;
  userId: number;
  email: string;
  role: string;
  businessProfile: string;
  sessionVersion: number;
  issuedAt: number;
  expiresAt: number;
}

export interface MfaPendingPayload {
  type: 'mfa_pending';
  userId: number;
  email: string;
  role: string;
  businessProfile: string;
  isEnrolled: boolean;
  issuedAt: number;
  expiresAt: number;
}

/**
 * Enterprise Session Lifetime Policy:
 * - Admin: 8 hours (28,800s)
 * - Finance Officer: 8 hours (28,800s)
 * - Secretary: 12 hours (43,200s)
 * - Idle Timeout: 30 minutes (1,800s) for all roles
 */
export function getMaxSessionLifetimeSeconds(role?: string): number {
  const r = (role || '').trim().toLowerCase();
  if (r === 'admin' || r === 'lh_security_admin') {
    return 8 * 3600; // 8 hours for Admin
  }
  if (r === 'avi' || r === 'finance' || r === 'lh_finance') {
    return 8 * 3600; // 8 hours for Finance Officer
  }
  return 12 * 3600; // 12 hours for Secretary
}

export const IDLE_TIMEOUT_SECONDS = 30 * 60; // 30 minutes

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET?.trim();
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      throw new Error('[SECURITY FATAL] SESSION_SECRET is missing or has insufficient entropy (minimum 32 characters required).');
    }
    return '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  }
  return secret;
}

/**
 * Creates a cryptographically signed session token: <base64url(payload)>.<hmac-sha256>
 */
export function signSessionToken(
  data: Omit<SessionPayload, 'issuedAt' | 'expiresAt'> & { jti?: string },
  expiresInSeconds?: number
): string {
  const secret = getSessionSecret();
  const now = Math.floor(Date.now() / 1000);
  const jti = data.jti || crypto.randomBytes(32).toString('hex');
  const lifetime = expiresInSeconds ?? getMaxSessionLifetimeSeconds(data.role);

  const fullPayload: SessionPayload = {
    ...data,
    jti,
    issuedAt: now,
    expiresAt: now + lifetime,
  };

  const encodedPayload = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(encodedPayload)
    .digest('hex');

  return `${encodedPayload}.${signature}`;
}

/**
 * Verifies the HMAC-SHA256 signature and expiration of a session token
 */
export function verifySessionToken(
  token: string
): { valid: true; payload: SessionPayload } | { valid: false; reason: string } {
  if (!token || typeof token !== 'string') {
    return { valid: false, reason: 'Session token is missing or malformed.' };
  }

  const parts = token.trim().split('.');
  if (parts.length !== 2) {
    return { valid: false, reason: 'Invalid token structure.' };
  }

  const [encodedPayload, providedSignature] = parts;

  try {
    const secret = getSessionSecret();
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(encodedPayload)
      .digest('hex');

    const expectedBuf = Buffer.from(expectedSignature, 'hex');
    const providedBuf = Buffer.from(providedSignature, 'hex');

    if (expectedBuf.length !== providedBuf.length || !crypto.timingSafeEqual(expectedBuf, providedBuf)) {
      return { valid: false, reason: 'Cryptographic signature verification failed (tampered token).' };
    }

    const payloadJson = Buffer.from(encodedPayload, 'base64url').toString('utf-8');
    const payload: SessionPayload = JSON.parse(payloadJson);

    if ((payload as any).type === 'mfa_pending') {
      return { valid: false, reason: 'Invalid session token: MFA verification pending.' };
    }

    const now = Math.floor(Date.now() / 1000);
    if (payload.expiresAt <= now) {
      return { valid: false, reason: 'Session token has expired.' };
    }

    if (!payload.jti || !payload.userId || !payload.email || typeof payload.sessionVersion !== 'number') {
      return { valid: false, reason: 'Incomplete session payload.' };
    }

    return { valid: true, payload };
  } catch (err: any) {
    return { valid: false, reason: `Token decode error: ${err?.message || 'unknown error'}` };
  }
}

/**
 * Registers an active session in the database for per-session tracking and server-side revocation
 */
export async function registerDatabaseSession(
  db: DBClient,
  payload: SessionPayload
): Promise<void> {
  const expiresAt = new Date(payload.expiresAt * 1000);
  await db.query(
    `INSERT INTO user_sessions (jti, user_id, role, expires_at, last_active_at, revoked)
     VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, FALSE)
     ON CONFLICT (jti) DO NOTHING`,
    [payload.jti, payload.userId, payload.role, expiresAt]
  );
}

/**
 * Revokes an individual session server-side by its unique jti
 */
export async function revokeDatabaseSession(
  db: DBClient,
  jti: string
): Promise<boolean> {
  if (!jti) return false;
  const res = await db.query(
    `UPDATE user_sessions
     SET revoked = TRUE, revoked_at = CURRENT_TIMESTAMP
     WHERE jti = $1 AND revoked = FALSE
     RETURNING id`,
    [jti]
  );
  return (res.rowCount ?? res.rows.length) > 0;
}

/**
 * Generates a short-lived, restricted MFA-pending token (5 minutes validity)
 */
export function signMfaPendingToken(
  data: Omit<MfaPendingPayload, 'type' | 'issuedAt' | 'expiresAt'>,
  expiresInSeconds = 300
): string {
  const secret = getSessionSecret();
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: MfaPendingPayload = {
    type: 'mfa_pending',
    ...data,
    issuedAt: now,
    expiresAt: now + expiresInSeconds,
  };

  const encodedPayload = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`mfa:${encodedPayload}`)
    .digest('hex');

  return `${encodedPayload}.${signature}`;
}

/**
 * Validates an MFA-pending token
 */
export function verifyMfaPendingToken(
  token: string
): { valid: true; payload: MfaPendingPayload } | { valid: false; reason: string } {
  if (!token || typeof token !== 'string') {
    return { valid: false, reason: 'MFA pending token missing.' };
  }

  const parts = token.trim().split('.');
  if (parts.length !== 2) {
    return { valid: false, reason: 'Invalid MFA token structure.' };
  }

  const [encodedPayload, providedSignature] = parts;

  try {
    const secret = getSessionSecret();
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`mfa:${encodedPayload}`)
      .digest('hex');

    const expectedBuf = Buffer.from(expectedSignature, 'hex');
    const providedBuf = Buffer.from(providedSignature, 'hex');

    if (expectedBuf.length !== providedBuf.length || !crypto.timingSafeEqual(expectedBuf, providedBuf)) {
      return { valid: false, reason: 'MFA token signature verification failed.' };
    }

    const payloadJson = Buffer.from(encodedPayload, 'base64url').toString('utf-8');
    const payload: MfaPendingPayload = JSON.parse(payloadJson);

    if (payload.type !== 'mfa_pending') {
      return { valid: false, reason: 'Invalid token type for MFA.' };
    }

    const now = Math.floor(Date.now() / 1000);
    if (payload.expiresAt <= now) {
      return { valid: false, reason: 'MFA verification window expired (5 minutes).' };
    }

    return { valid: true, payload };
  } catch (err: any) {
    return { valid: false, reason: `MFA token decode error: ${err?.message || 'unknown error'}` };
  }
}
