import crypto from 'crypto';

export const SESSION_COOKIE_NAME = 'liec_session';

export interface SessionPayload {
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

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET?.trim();
  if (!secret || secret.length < 32) {
    // In production or preview, fail closed if secret is missing or insecure
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      throw new Error('[SECURITY FATAL] SESSION_SECRET is missing or has insufficient entropy (minimum 32 characters required).');
    }
    // Fallback secret for local test execution only
    return '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  }
  return secret;
}

/**
 * Creates a cryptographically signed session token: <base64url(payload)>.<hmac-sha256>
 */
export function signSessionToken(
  data: Omit<SessionPayload, 'issuedAt' | 'expiresAt'>,
  expiresInSeconds = 7 * 24 * 3600
): string {
  const secret = getSessionSecret();
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: SessionPayload = {
    ...data,
    issuedAt: now,
    expiresAt: now + expiresInSeconds,
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

    if (!payload.userId || !payload.email || typeof payload.sessionVersion !== 'number') {
      return { valid: false, reason: 'Incomplete session payload.' };
    }

    return { valid: true, payload };
  } catch (err: any) {
    return { valid: false, reason: `Token decode error: ${err?.message || 'unknown error'}` };
  }
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
