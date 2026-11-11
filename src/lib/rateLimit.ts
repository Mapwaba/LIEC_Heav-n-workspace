import crypto from 'crypto';
import type { NextRequest } from 'next/server.js';
import { getDb, type DBClient } from './db.ts';

const RATE_LIMIT_SALT = process.env.SESSION_SECRET || 'liec_rate_limit_default_salt_2026';

/**
 * Extracts the client IP from proxy headers safely
 */
export function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Leftmost IP is the original client in Vercel / reverse proxy chains
    const ips = forwardedFor.split(',').map((ip) => ip.trim());
    if (ips[0]) return ips[0];
  }

  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  return '127.0.0.1';
}

/**
 * Anonymizes an account email into a keyed hash key
 */
export function hashRateLimitKey(prefix: string, identifier: string): string {
  const clean = identifier.trim().toLowerCase();
  const hash = crypto.createHmac('sha256', RATE_LIMIT_SALT).update(clean).digest('hex');
  return `${prefix}:${hash.substring(0, 32)}`;
}

/**
 * Database-backed atomic distributed rate limiter
 */
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number,
  dbClient?: DBClient
): Promise<{ allowed: boolean; count: number; remaining: number; resetAt: Date }> {
  const db = dbClient || (await getDb());
  const now = new Date();

  // Atomic UPSERT: If record exists and has expired, reset count to 1 and update reset_at.
  // Otherwise, increment count.
  const query = `
    INSERT INTO rate_limit_buckets (key, count, reset_at)
    VALUES ($1, 1, CURRENT_TIMESTAMP + ($2 || ' seconds')::INTERVAL)
    ON CONFLICT (key) DO UPDATE
      SET count = CASE
                    WHEN rate_limit_buckets.reset_at <= CURRENT_TIMESTAMP THEN 1
                    ELSE rate_limit_buckets.count + 1
                  END,
          reset_at = CASE
                       WHEN rate_limit_buckets.reset_at <= CURRENT_TIMESTAMP THEN CURRENT_TIMESTAMP + ($2 || ' seconds')::INTERVAL
                       ELSE rate_limit_buckets.reset_at
                     END
    RETURNING count, reset_at;
  `;

  try {
    const res = await db.query(query, [key, windowSeconds]);
    const row = res.rows[0];
    const currentCount = Number(row.count);
    const resetAt = new Date(row.reset_at);
    const allowed = currentCount <= maxRequests;
    const remaining = Math.max(0, maxRequests - currentCount);

    return { allowed, count: currentCount, remaining, resetAt };
  } catch (err) {
    console.warn('[RATE-LIMIT] DB rate limit check failed, failing safe (allowing request):', err);
    return { allowed: true, count: 1, remaining: maxRequests - 1, resetAt: new Date(Date.now() + windowSeconds * 1000) };
  }
}

/**
 * Combined IP and Account Rate Limiter for Password Recovery
 * Limits: 5 requests per IP / 15 mins AND 5 requests per account / 15 mins.
 */
export async function checkPasswordRecoveryRateLimit(
  reqOrIp: NextRequest | string,
  email: string,
  dbClient?: DBClient
): Promise<{ allowed: boolean; reason?: string }> {
  const windowSeconds = 15 * 60; // 15 minutes
  const maxPerWindow = 5;

  const ip = typeof reqOrIp === 'string' ? reqOrIp : getClientIp(reqOrIp);
  const ipKey = hashRateLimitKey('rl_pwd_ip', ip);
  const ipLimit = await checkRateLimit(ipKey, maxPerWindow, windowSeconds, dbClient);

  if (!ipLimit.allowed) {
    return {
      allowed: false,
      reason: `Too many password reset requests from this IP. Please wait until ${ipLimit.resetAt.toISOString()}.`,
    };
  }

  if (email && email.includes('@')) {
    const emailKey = hashRateLimitKey('rl_pwd_acct', email);
    const acctLimit = await checkRateLimit(emailKey, maxPerWindow, windowSeconds, dbClient);

    if (!acctLimit.allowed) {
      return {
        allowed: false,
        reason: `Too many password reset requests for this account. Please wait until ${acctLimit.resetAt.toISOString()}.`,
      };
    }
  }

  return { allowed: true };
}
