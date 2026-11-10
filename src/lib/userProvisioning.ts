import { DBClient } from './db';
import { generateSecureTemporaryPassword, hashPassword } from './passwordSecurity';
import { sendNewUserWelcomeEmail } from './emailService';

export interface ProvisionUserInput {
  firstName: string;
  lastName: string;
  name?: string;
  email: string;
  businessProfile?: 'Admin' | 'Secretary' | 'Finance Officer' | string;
  technicalRoles?: string[];
  title?: string;
  requestedUserId?: string;
  adminUser: {
    name: string;
    email?: string;
    business_profile?: string;
  };
  options?: {
    updateIfExists?: boolean;
    sendWelcomeEmail?: boolean;
    sourceBatch?: string; // e.g. 'ISET-2026-001' or 'MANUAL_ADMIN_CREATION'
  };
}

export interface ProvisionUserOutcome {
  success: boolean;
  action: 'PROVISIONED' | 'UPDATED' | 'SKIPPED' | 'FAILED';
  user?: any;
  userId?: string;
  temporaryPassword?: string;
  emailSent?: boolean;
  emailStatus?: 'SENT' | 'FAILED' | 'NOT_SENT';
  emailError?: string;
  error?: string;
  matchedExisting?: boolean;
}

/**
 * Shared Account Provisioning Service
 * Used identically by:
 * 1. Manual User Creation (Create User modal)
 * 2. Bulk User Registration (Import Sets & Transform Maps)
 *
 * Enforces identical business logic, credentials generation, security parameters,
 * role validation, email dispatch, and audit logging.
 */
export async function provisionUserAccount(
  db: DBClient,
  input: ProvisionUserInput
): Promise<ProvisionUserOutcome> {
  let firstName = (input.firstName || '').trim();
  let lastName = (input.lastName || '').trim();
  let name = (input.name || '').trim();

  // If first and last name were provided in a single field
  if ((!firstName || !lastName) && name) {
    const parts = name.split(/\s+/);
    if (!firstName) firstName = parts[0] || '';
    if (!lastName) lastName = parts.slice(1).join(' ') || parts[0] || '';
  }

  if (!name && (firstName || lastName)) {
    name = `${firstName} ${lastName}`.trim();
  }

  const email = (input.email || '').trim().toLowerCase();
  const businessProfile = (input.businessProfile || 'Secretary').trim();
  const title = (input.title || `${businessProfile} Staff`).trim();
  const sourceBatch = input.options?.sourceBatch || 'MANUAL_ADMIN_CREATION';

  // 1. Required field validation
  if (!firstName || !lastName || !email) {
    return {
      success: false,
      action: 'FAILED',
      error: 'First name, last name, and professional email are required.',
    };
  }

  // 2. Email domain validation
  if (!email.includes('@') || !email.endsWith('@liecconsulting.com')) {
    return {
      success: false,
      action: 'FAILED',
      error: 'Professional email must end with @liecconsulting.com',
    };
  }

  // 3. Role mapping compatibility helper
  let legacyRole = 'secretary';
  if (businessProfile === 'Admin') legacyRole = 'admin';
  else if (businessProfile === 'Finance Officer') legacyRole = 'avi';

  // 4. Default technical roles based on business profile if not specified
  let technicalRoles: string[] = [];
  if (Array.isArray(input.technicalRoles) && input.technicalRoles.length > 0) {
    technicalRoles = input.technicalRoles;
  } else {
    if (businessProfile === 'Admin') technicalRoles = ['admin', 'lh_security_admin'];
    else if (businessProfile === 'Finance Officer') technicalRoles = ['lh_finance'];
    else technicalRoles = ['lh_internal', 'ITIL'];
  }

  // 4b. Restrict roles to authoritative LIEC registry
  const AUTHORITATIVE_LIEC_ROLES = ['admin', 'lh_security_admin', 'ITIL', 'lh_internal', 'lh_finance'];
  technicalRoles = technicalRoles.filter((r) => AUTHORITATIVE_LIEC_ROLES.includes(r));

  // 4c. SECURITY GUARD: Bulk import batches cannot grant Administrator privileges
  if (sourceBatch !== 'MANUAL_ADMIN_CREATION') {
    if (businessProfile === 'Admin' || technicalRoles.some((r) => ['admin', 'lh_security_admin'].includes(r))) {
      return {
        success: false,
        action: 'FAILED',
        error: 'Administrative privileges (Admin profile, admin / lh_security_admin roles) cannot be granted via bulk import batches.',
      };
    }
  }

  // 5. Initials generation
  const initials =
    ((firstName ? firstName[0] : '') + (lastName ? lastName[0] : '')).toUpperCase().slice(0, 3) ||
    name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 3) ||
    'CU';

  // 6. Check if email already exists
  const emailCheck = await db.query(
    'SELECT id, name, first_name, last_name, user_id, email, business_profile, role, title, active FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
    [email]
  );
  const existingUser = emailCheck.rows && emailCheck.rows.length > 0 ? emailCheck.rows[0] : null;

  // If user exists and update is not explicitly allowed, default to SKIPPING
  if (existingUser) {
    // 6a. PRIVILEGED ACCOUNT PROTECTION: Primary Administrator and Admin users cannot be altered by bulk imports
    const isProtectedAdmin =
      existingUser.business_profile === 'Admin' ||
      existingUser.role === 'admin' ||
      existingUser.id === 1 ||
      existingUser.email === 'bmapwabantoro@liecconsulting.com';

    if (isProtectedAdmin && sourceBatch !== 'MANUAL_ADMIN_CREATION') {
      return {
        success: true,
        action: 'SKIPPED',
        user: existingUser,
        userId: existingUser.user_id,
        matchedExisting: true,
        error: 'Protected Administrator account cannot be modified via bulk import.',
      };
    }

    if (!input.options?.updateIfExists) {
      return {
        success: true,
        action: 'SKIPPED',
        user: existingUser,
        userId: existingUser.user_id,
        matchedExisting: true,
        error: `User with email ${email} already exists in LIEC Heav'n. Skipped to prevent overwriting.`,
      };
    }

    // UPDATE EXISTING USER (Explicit Administrator Selection)
    // PRESERVE: password_hash, password_salt, must_change_password, active, and user_id are NOT touched
    await db.query(
      `UPDATE users
       SET name = $1,
           first_name = $2,
           last_name = $3,
           business_profile = $4,
           role = $5,
           title = $6,
           initials = $7
       WHERE id = $8`,
      [name, firstName, lastName, businessProfile, legacyRole, title, initials, existingUser.id]
    );

    // Update technical roles
    for (const rId of technicalRoles) {
      await db.query(
        `INSERT INTO user_roles (user_id, role_id, assigned_by)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, role_id) DO NOTHING`,
        [existingUser.id, rId, input.adminUser.name]
      );
    }

    // Audit log entry for update
    await db.query(
      `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
       VALUES ($1, 'UPDATE_USER', $2, 'SUCCESS', $3)`,
      [
        input.adminUser.name,
        `USER-${existingUser.id}`,
        `Updated existing user '${name}' (${email}, User ID: ${existingUser.user_id}) from batch '${sourceBatch}'. Assigned roles: [${technicalRoles.join(', ')}].`,
      ]
    );

    return {
      success: true,
      action: 'UPDATED',
      user: { ...existingUser, name, first_name: firstName, last_name: lastName, business_profile: businessProfile, role: legacyRole, title },
      userId: existingUser.user_id,
      matchedExisting: true,
    };
  }

  // 7. Automatic User ID Generation: first_initial + last_name (normalized, lowercase, no accents or spaces)
  const cleanFirst = firstName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  const cleanLast = lastName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  const baseUserId = (cleanFirst ? cleanFirst[0] : '') + cleanLast || 'user';
  const requestedUserId = (input.requestedUserId || '').trim().toLowerCase();
  const targetUserId = requestedUserId || baseUserId;

  // Validate uniqueness before creating account and resolve predictable suffix if taken
  let candidateUserId = targetUserId;
  let suffixCounter = 1;
  while (true) {
    const existing = await db.query(
      'SELECT id FROM users WHERE LOWER(user_id) = LOWER($1) LIMIT 1',
      [candidateUserId]
    );
    if (!existing.rows || existing.rows.length === 0) {
      break;
    }
    suffixCounter++;
    candidateUserId = `${baseUserId}${suffixCounter}`;
  }
  const finalUserId = candidateUserId;

  // 8. Credentials Strategy:
  // - MANUAL_ADMIN_CREATION: Preserves existing temporary password & one-time admin confirmation modal
  // - BULK IMPORT SETS: Password-free invitation workflow (32-byte cryptographic token, SHA-256 hash in DB, 24h expiry)
  const isBulkImport = sourceBatch !== 'MANUAL_ADMIN_CREATION';
  let temporaryPassword: string | undefined;
  let passwordHash: string;
  let passwordSalt: string;
  let rawInvitationToken: string | undefined;
  let hashedInvitationToken: string | null = null;

  if (isBulkImport) {
    // Generate high-entropy 32-byte raw invitation token
    const crypto = await import('crypto');
    rawInvitationToken = crypto.randomBytes(32).toString('hex');
    hashedInvitationToken = crypto.createHash('sha256').update(rawInvitationToken).digest('hex');

    // Locked initial random hash until the user activates their account
    const lockedCredentials = hashPassword(crypto.randomBytes(32).toString('hex'));
    passwordHash = lockedCredentials.hash;
    passwordSalt = lockedCredentials.salt;
  } else {
    // Manual Create User: generate temporary password
    temporaryPassword = generateSecureTemporaryPassword();
    const creds = hashPassword(temporaryPassword);
    passwordHash = creds.hash;
    passwordSalt = creds.salt;
  }

  // 9. Insert user record with secure hash, User ID, and mandatory first-login status
  const insertRes = await db.query(
    `INSERT INTO users (
      name, first_name, last_name, user_id, email, business_profile, role, title, initials, active,
      password_hash, password_salt, must_change_password, invitation_token, invitation_token_expires_at
    )
     VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, $10, $11, TRUE,
       $12::VARCHAR, CASE WHEN ($12::VARCHAR) IS NOT NULL THEN CURRENT_TIMESTAMP + INTERVAL '24 hours' ELSE NULL END
     )
     RETURNING id, name, first_name, last_name, user_id, email, business_profile, role, title, initials, active, must_change_password`,
    [
      name,
      firstName,
      lastName,
      finalUserId,
      email,
      businessProfile,
      legacyRole,
      title,
      initials,
      passwordHash,
      passwordSalt,
      hashedInvitationToken,
    ]
  );

  const newUser = insertRes.rows[0];

  // 10. Assign technical roles in user_roles table
  for (const rId of technicalRoles) {
    await db.query(
      `INSERT INTO user_roles (user_id, role_id, assigned_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, role_id) DO NOTHING`,
      [newUser.id, rId, input.adminUser.name]
    );
  }

  // 11. Send account welcome notification via Resend
  let emailSent = false;
  let emailError: string | undefined;
  if (input.options?.sendWelcomeEmail !== false) {
    try {
      const invitationUrl = rawInvitationToken
        ? `https://workspace.liecconsulting.com/login?invite_token=${rawInvitationToken}`
        : undefined;

      const mailRes = await sendNewUserWelcomeEmail({
        firstName,
        lastName,
        userId: finalUserId,
        email,
        role: legacyRole,
        businessProfile,
        temporaryPassword,
        invitationUrl,
      });
      emailSent = mailRes.success;
    } catch (err: any) {
      console.warn('Notice: New user welcome email notification could not be dispatched:', err?.message);
      emailError = err?.message;
    }
  }

  // 12. Audit log entry (NEVER log the plain-text password or raw token)
  await db.query(
    `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
     VALUES ($1, 'CREATE_USER', $2, 'SUCCESS', $3)`,
    [
      input.adminUser.name,
      `USER-${newUser.id}`,
      `Created user '${name}' (User ID: ${finalUserId}) with profile '${businessProfile}' via ${sourceBatch}. ${
        isBulkImport ? 'Single-use 24h invitation token issued.' : 'One-time temporary password generated.'
      } Email dispatch: ${emailSent ? 'Sent' : 'Deferred (' + (emailError || 'pending') + ')'}.`,
    ]
  );

  return {
    success: true,
    action: 'PROVISIONED',
    user: newUser,
    userId: finalUserId,
    temporaryPassword, // Provided only for MANUAL_ADMIN_CREATION
    emailSent,
    emailStatus: emailSent ? 'SENT' : emailError ? 'FAILED' : 'NOT_SENT',
    emailError,
  };
}

/**
 * Secure Administrator Action to Retry Welcome Email
 * Re-dispatches credentials using single-use 24-hour invitation token
 * NEVER exposes or returns plaintext passwords in API responses or logs
 */
export async function retryUserWelcomeEmail(
  db: DBClient,
  userId: number,
  adminName: string
): Promise<{ success: boolean; email?: string; error?: string }> {
  const userRes = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
  const user = userRes.rows[0];
  if (!user) throw new Error('User account not found');
  if (!user.active) throw new Error('Cannot send credentials to a suspended account');

  // Generate fresh 32-byte raw token and SHA-256 hash
  const crypto = await import('crypto');
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  // Invalidate any previous invitation token by overwriting it
  await db.query(
    `UPDATE users
     SET invitation_token = $1,
         invitation_token_expires_at = CURRENT_TIMESTAMP + INTERVAL '24 hours'
     WHERE id = $2`,
    [tokenHash, userId]
  );

  let emailSent = false;
  let emailError: string | undefined;

  try {
    const parts = (user.name || '').trim().split(/\s+/);
    const firstName = user.first_name || parts[0] || 'Collaborateur';
    const lastName = user.last_name || parts.slice(1).join(' ') || '';

    const mailRes = await sendNewUserWelcomeEmail({
      firstName,
      lastName,
      userId: user.user_id,
      email: user.email,
      role: user.role,
      businessProfile: user.business_profile,
      invitationUrl: `https://workspace.liecconsulting.com/login?invite_token=${rawToken}`,
    });
    emailSent = mailRes.success;
    if (!mailRes.success) emailError = mailRes.error || 'Mail delivery was rejected by the provider';
  } catch (err: any) {
    emailError = err.message;
  }

  // Immutable audit entry (raw token is NEVER logged)
  await db.query(
    `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
     VALUES ($1, 'RETRY_WELCOME_EMAIL', $2, $3, $4)`,
    [
      adminName,
      `USER-${userId}`,
      emailSent ? 'SUCCESS' : 'FAILED',
      `Administrator retried welcome invitation for '${user.name}' (${user.email}). Single-use 24h invitation token re-issued. Result: ${
        emailSent ? 'Sent' : 'Failed: ' + emailError
      }`,
    ]
  );

  return {
    success: emailSent,
    email: user.email,
    error: emailError,
  };
}
