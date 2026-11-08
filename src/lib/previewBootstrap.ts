/**
 * LIEC Heav'n - Secure Preview Administrator Bootstrap Service
 *
 * Implements secure dynamic provisioning of the Preview Administrator
 * strictly in Vercel Preview and isolated preview test environments.
 *
 * Security Requirements:
 * 1. Zero static or committed credentials: Passwords are dynamically sourced from
 *    a secure environment variable (PREVIEW_ADMIN_INITIAL_PASSWORD) or activated
 *    via a password-free, single-use cryptographic invitation token.
 * 2. Inaccessibility Protection: If no initial password is provided via environment,
 *    the service creates a single-use invitation token (SHA-256 in DB) and returns
 *    the activation link to the caller in memory, avoiding permanently locked accounts.
 * 3. Industry-standard PBKDF2 (SHA-512, 100k rounds) hashing with unique 16-byte salt.
 * 4. Never logs or leaks plaintext credentials to logs, stdout, or files.
 * 5. Strictly isolated to admin.preview@staging.liecconsulting.com in preview environments.
 * 6. 100% idempotent: Preserves existing passwords across multiple cold starts without reset.
 * 7. Guarantees intended RBAC roles (admin, lh_security_admin).
 * 8. Production Immunity: Production administrator (bmapwabantoro@liecconsulting.com)
 *    is strictly immutable and can never be targeted or modified.
 */

import crypto from 'crypto';
import { DBClient } from './db';
import { hashPassword, generateSecureTemporaryPassword } from './passwordSecurity';
import { isPreviewEnvironment } from './environment';

export interface PreviewBootstrapOptions {
  initialPassword?: string;
  forceReset?: boolean;
  resetSecret?: string;
}

export interface PreviewBootstrapResult {
  success: boolean;
  email: string;
  action:
    | 'created_with_password'
    | 'created_with_invitation_token'
    | 'password_updated'
    | 'invitation_token_refreshed'
    | 'already_configured_preserved'
    | 'skipped_not_preview';
  roleAssignments: string[];
  activationToken?: string;
  activationUrl?: string;
  error?: string;
}

/**
 * Bootstrap the Preview Administrator account with secure, dynamic authentication credentials.
 */
export async function bootstrapPreviewAdmin(
  db: DBClient,
  options: PreviewBootstrapOptions = {}
): Promise<PreviewBootstrapResult> {
  // 1. Strict Environment Guard: Restricted to Preview environments
  if (!isPreviewEnvironment()) {
    return {
      success: false,
      email: 'admin.preview@staging.liecconsulting.com',
      action: 'skipped_not_preview',
      roleAssignments: [],
      error: 'Preview administrator bootstrap is strictly restricted to preview environments.',
    };
  }

  const adminEmail = 'admin.preview@staging.liecconsulting.com';

  // 2. Production Administrator Immunity Guard
  const prodAdminEmail = 'bmapwabantoro@liecconsulting.com';
  if (adminEmail.toLowerCase() === prodAdminEmail.toLowerCase()) {
    throw new Error('Security Violation: Production administrator cannot be bootstrapped or altered.');
  }

  // 3. Query for existing preview administrator record
  const existingUserRes = await db.query(
    'SELECT id, email, password_hash, password_salt, invitation_token, active FROM users WHERE LOWER(email) = LOWER($1)',
    [adminEmail]
  );

  let userId: number;
  let action: PreviewBootstrapResult['action'] = 'already_configured_preserved';
  let activationToken: string | undefined;
  let activationUrl: string | undefined;

  const resolvedPassword =
    options.initialPassword?.trim() ||
    process.env.PREVIEW_ADMIN_INITIAL_PASSWORD?.trim();

  if (existingUserRes.rows.length === 0) {
    if (resolvedPassword) {
      // Path A: Explicit environment password configured
      const { hash, salt } = hashPassword(resolvedPassword);

      const insertRes = await db.query(
        `INSERT INTO users (
          name, first_name, last_name, user_id, email,
          business_profile, role, title, initials, active,
          password_hash, password_salt, must_change_password
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id`,
        [
          'Admin Test (Preview)',
          'Admin',
          'Preview',
          'admin.preview',
          adminEmail,
          'Admin',
          'admin',
          'Platform Administrator (Preview Test)',
          'AP',
          true,
          hash,
          salt,
          false,
        ]
      );

      userId = insertRes.rows[0].id;
      action = 'created_with_password';
    } else {
      // Path B: Password-free, single-use invitation token flow
      // Prevents permanently locked account when no initial password is provided
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      // Locked random hash until activation
      const lockedCreds = hashPassword(crypto.randomBytes(32).toString('hex'));

      const insertRes = await db.query(
        `INSERT INTO users (
          name, first_name, last_name, user_id, email,
          business_profile, role, title, initials, active,
          password_hash, password_salt, must_change_password,
          invitation_token, invitation_token_expires_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, TRUE,
          $13, CURRENT_TIMESTAMP + INTERVAL '7 days'
        )
        RETURNING id`,
        [
          'Admin Test (Preview)',
          'Admin',
          'Preview',
          'admin.preview',
          adminEmail,
          'Admin',
          'admin',
          'Platform Administrator (Preview Test)',
          'AP',
          true,
          lockedCreds.hash,
          lockedCreds.salt,
          tokenHash,
        ]
      );

      userId = insertRes.rows[0].id;
      activationToken = rawToken;
      activationUrl = `/login?invitationToken=${rawToken}`;
      action = 'created_with_invitation_token';
    }
  } else {
    const user = existingUserRes.rows[0];
    userId = user.id;

    // Idempotency: preserve credentials if already set, unless forceReset is explicitly requested
    const needsPasswordSetup = !user.password_hash && !user.invitation_token;
    if (needsPasswordSetup || options.forceReset) {
      if (resolvedPassword) {
        const { hash, salt } = hashPassword(resolvedPassword);

        await db.query(
          `UPDATE users
           SET password_hash = $1,
               password_salt = $2,
               invitation_token = NULL,
               invitation_token_expires_at = NULL,
               must_change_password = FALSE,
               active = TRUE
           WHERE id = $3`,
          [hash, salt, userId]
        );
        action = 'password_updated';
      } else {
        // Issue fresh activation token
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

        await db.query(
          `UPDATE users
           SET invitation_token = $1,
               invitation_token_expires_at = CURRENT_TIMESTAMP + INTERVAL '7 days',
               must_change_password = TRUE,
               active = TRUE
           WHERE id = $2`,
          [tokenHash, userId]
        );
        activationToken = rawToken;
        activationUrl = `/login?invitationToken=${rawToken}`;
        action = 'invitation_token_refreshed';
      }
    } else {
      action = 'already_configured_preserved';
    }
  }

  // 4. Ensure intended Preview Administrator Roles are assigned
  const intendedRoles = ['admin', 'lh_security_admin'];
  for (const roleId of intendedRoles) {
    await db.query(
      `INSERT INTO user_roles (user_id, role_id, assigned_by)
       VALUES ($1, $2, 'Preview Administrator Bootstrap')
       ON CONFLICT (user_id, role_id) DO NOTHING`,
      [userId, roleId]
    );
  }

  return {
    success: true,
    email: adminEmail,
    action,
    roleAssignments: intendedRoles,
    activationToken,
    activationUrl,
  };
}
