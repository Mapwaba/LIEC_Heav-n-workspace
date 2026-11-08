/**
 * LIEC Heav'n - Centralized Environment & Isolation Guard
 *
 * Provides a single source of truth for runtime environment detection across
 * database, storage, email, and authentication subsystems.
 *
 * Core Security Principles (Step 4.8):
 * 1. Production Precedence: Server-side VERCEL_ENV=production always takes absolute precedence.
 * 2. NODE_ENV=production cannot be overridden by Preview flags (such as PREVIEW_MODE=true or ALLOW_LOCAL_PREVIEW=true).
 * 3. Server-Side Security Authority: NEXT_PUBLIC_* variables are client-facing bundle values and
 *    are NEVER treated as authoritative security signals on the server.
 * 4. Explicit Preview Scoping: Vercel Preview strictly requires the server-side variable VERCEL_ENV === 'preview'.
 * 5. Safe Defaults: Missing or ambiguous variables default safely to local development (not production,
 *    not preview), preventing access to production resources or accidental mock bypasses.
 * 6. Local & Automated Testing: Non-production environments (NODE_ENV !== 'production' and !VERCEL_ENV)
 *    can safely simulate preview via explicit ALLOW_LOCAL_PREVIEW === 'true' paired with PREVIEW_MODE === 'true',
 *    or within test harnesses (NODE_ENV === 'test' with PREVIEW_MODE === 'true').
 */

export type AppEnvironment = 'production' | 'preview' | 'development' | 'test';

/**
 * Returns true if the current runtime is Production.
 * Enforces absolute precedence over any conflicting flags.
 * NEXT_PUBLIC_* variables are NOT authoritative.
 */
export function isProductionEnvironment(): boolean {
  const vercelEnv = process.env.VERCEL_ENV?.trim().toLowerCase();
  const nodeEnv = process.env.NODE_ENV?.trim().toLowerCase();

  // 1. Explicit server-side Vercel Production is absolute
  if (vercelEnv === 'production') {
    return true;
  }

  // 2. Server-side NODE_ENV=production cannot be overridden by preview flags.
  // Exception: in Vercel deployments, Next.js always sets NODE_ENV=production at build
  // and runtime, even for preview deployments. In that Vercel-managed context,
  // server-side VERCEL_ENV determines the deployment identity:
  // - If VERCEL_ENV === 'preview', it is an authoritative Vercel Preview deployment (not production).
  // - If VERCEL_ENV === 'development', it is a Vercel Dev deployment.
  // Outside Vercel (or when VERCEL_ENV is unset), NODE_ENV=production is strictly Production
  // and CANNOT be overridden by PREVIEW_MODE or any preview flag.
  if (nodeEnv === 'production') {
    if (vercelEnv === 'preview' || vercelEnv === 'development') {
      return false;
    }
    return true;
  }

  return false;
}

/**
 * Returns true if the current runtime is an isolated Preview deployment.
 * Production signals ALWAYS override preview flags.
 * NEXT_PUBLIC_* variables are NOT authoritative.
 */
export function isPreviewEnvironment(): boolean {
  // Production guard: Production ALWAYS takes precedence
  if (isProductionEnvironment()) {
    return false;
  }

  const vercelEnv = process.env.VERCEL_ENV?.trim().toLowerCase();
  const nodeEnv = process.env.NODE_ENV?.trim().toLowerCase();

  // 1. Authoritative server-side Vercel Preview deployment
  if (vercelEnv === 'preview') {
    return true;
  }

  // 2. Local development and automated testing support:
  // NODE_ENV=production CANNOT be overridden. Only non-production runtimes
  // (e.g. test, development, or unset) may activate local preview testing via explicit flags.
  if (nodeEnv !== 'production' && !vercelEnv) {
    if (process.env.ALLOW_LOCAL_PREVIEW === 'true' && process.env.PREVIEW_MODE === 'true') {
      return true;
    }
    if (nodeEnv === 'test' && process.env.PREVIEW_MODE === 'true') {
      return true;
    }
  }

  return false;
}

/**
 * Returns true if the current runtime is local development.
 */
export function isLocalDevelopment(): boolean {
  return !isProductionEnvironment() && !isPreviewEnvironment();
}

/**
 * Resolves the canonical environment identity.
 */
export function resolveAppEnvironment(): AppEnvironment {
  if (isProductionEnvironment()) return 'production';
  if (isPreviewEnvironment()) return 'preview';
  if (process.env.NODE_ENV === 'test') return 'test';
  return 'development';
}
