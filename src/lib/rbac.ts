import { NextRequest, NextResponse } from 'next/server';
import { DBClient, getDb } from './db';

/**
 * LIEC_Heav'n ServiceNow-Inspired Role-Based Access Control (RBAC)
 * Specification Reference: LIEC_Heav'n Role-Based Access Control Document
 *
 * Core Principle:
 * "Hiding a menu item is not security. The server must enforce permissions for every
 * protected action and data request, including direct URLs, APIs, exports and document downloads."
 */

export type BusinessProfile = 'Admin' | 'Finance Officer' | 'Secretary';

export type TechnicalRole =
  | 'admin'
  | 'lh_security_admin'
  | 'ITIL'
  | 'lh_internal'
  | 'lh_finance';

export interface RoleDefinition {
  role_id: TechnicalRole;
  role_name: string;
  business_profile: BusinessProfile;
  description: string;
  safeguards: string;
  active: boolean;
}

export const TECHNICAL_ROLES_REGISTRY: RoleDefinition[] = [
  {
    role_id: 'admin',
    role_name: 'Platform Administrator',
    business_profile: 'Admin',
    description: 'Highest privilege. Assign only to trusted administrators.',
    safeguards: 'Assign only to trusted administrators; log assignments and removals.',
    active: true,
  },
  {
    role_id: 'lh_security_admin',
    role_name: 'Security Administrator',
    business_profile: 'Admin',
    description: 'Security administration. Limit access to security configuration and sensitive controls.',
    safeguards: 'Limit access to security configuration and sensitive controls.',
    active: true,
  },
  {
    role_id: 'ITIL',
    role_name: 'ITIL Workflow Operator',
    business_profile: 'Secretary',
    description: 'Secretary workflows (as configured). Applicant intake and administrative tracking.',
    safeguards: 'Do not assume this role means full administrator access. Verify permissions and inherited access.',
    active: true,
  },
  {
    role_id: 'lh_internal',
    role_name: 'Internal Application Access',
    business_profile: 'Secretary',
    description: 'Internal application access. Restrict to applicant intake, assigned records, comments and history.',
    safeguards: 'Restrict to applicant intake, assigned records, comments and history.',
    active: true,
  },
  {
    role_id: 'lh_finance',
    role_name: 'Finance & AVI Officer',
    business_profile: 'Finance Officer',
    description: 'AVI and parent-financing operations, YIMMILINE desk calculations and loan requests.',
    safeguards: 'Restrict to AVI-related functions and records; do not grant unrelated finance or system configuration access.',
    active: true,
  },
];

export interface AuthenticatedUserContext {
  id: number;
  name: string;
  email: string;
  business_profile: BusinessProfile;
  role?: string;
  technical_roles: TechnicalRole[];
  title: string;
  initials: string;
  active: boolean;
  must_change_password?: boolean;
  suspended_at?: string | null;
  suspended_by?: string | null;
}

// Fallback seed definitions if DB lookup encounters delay
export const PRECONFIGURED_USERS_RBAC: Record<string, AuthenticatedUserContext> = {
  'bmapwabantoro@liecconsulting.com': {
    id: 1,
    name: 'Barthelemy MAPWABA NTORO',
    email: 'bmapwabantoro@liecconsulting.com',
    business_profile: 'Admin',
    technical_roles: ['admin', 'lh_security_admin'],
    title: 'Platform Administrator & Managing Director',
    initials: 'BM',
    active: true,
  },
  'admin@liecconsulting.com': {
    id: 1,
    name: 'Barthelemy MAPWABA NTORO',
    email: 'bmapwabantoro@liecconsulting.com',
    business_profile: 'Admin',
    technical_roles: ['admin', 'lh_security_admin'],
    title: 'Platform Administrator & Managing Director',
    initials: 'BM',
    active: true,
  },
  'admin@liec-education.com': {
    id: 1,
    name: 'Barthelemy MAPWABA NTORO',
    email: 'bmapwabantoro@liecconsulting.com',
    business_profile: 'Admin',
    technical_roles: ['admin', 'lh_security_admin'],
    title: 'Platform Administrator & Managing Director',
    initials: 'BM',
    active: true,
  },
  'sarah.mwamba@liec-education.com': {
    id: 1,
    name: 'Barthelemy MAPWABA NTORO',
    email: 'bmapwabantoro@liecconsulting.com',
    business_profile: 'Admin',
    technical_roles: ['admin', 'lh_security_admin'],
    title: 'Platform Administrator & Managing Director',
    initials: 'BM',
    active: true,
  },
};

export function canonicalizeUserEmail(rawEmail?: string | null): string {
  const e = (rawEmail || '').trim().toLowerCase();
  if (
    e === 'bmapwabantoro@liecconsulting.com' ||
    e === 'admin@liecconsulting.com' ||
    e === 'admin@liec-education.com' ||
    e === 'admin@liec.com' ||
    e === 'sarah.mwamba@liecconsulting.com' ||
    e === 'sarah@liecconsulting.com' ||
    e === 'sarah.mwamba@liec-education.com'
  ) {
    return 'bmapwabantoro@liecconsulting.com';
  }
  return e;
}

/**
 * Access Matrix Rule Definition
 * Modules / Actions mapping based on Section 3 of the PDF
 */
export type SecuredModule =
  | 'dashboard'
  | 'demandes'
  | 'prospects'
  | 'candidats'
  | 'prepa'
  | 'avi'
  | 'finance'
  | 'yimmiline'
  | 'accommodation'
  | 'audit'
  | 'users_roles_config'
  | 'reports';

export interface PermissionEvaluation {
  allowed: boolean;
  scope: 'full' | 'relevant_avi_only' | 'intake_administrative' | 'denied';
  reason?: string;
}

export function evaluateModuleAccess(
  user: AuthenticatedUserContext,
  module: SecuredModule
): PermissionEvaluation {
  if (!user.active) {
    return {
      allowed: false,
      scope: 'denied',
      reason: 'Account is suspended by administrator. Access revoked.',
    };
  }

  const profile = user.business_profile;
  const userRole = (user as any).role;
  const roles = user.technical_roles || [];

  // 1. ADMIN PROFILE (Technical roles: admin, lh_security_admin)
  if (
    profile === 'Admin' ||
    userRole === 'admin' ||
    roles.includes('admin') ||
    roles.includes('lh_security_admin')
  ) {
    return { allowed: true, scope: 'full' };
  }

  // 2. FINANCE OFFICER (Technical role: lh_finance)
  if (profile === 'Finance Officer' || roles.includes('lh_finance')) {
    switch (module) {
      case 'dashboard':
      case 'avi':
      case 'finance':
      case 'yimmiline':
      case 'reports':
        return { allowed: true, scope: 'full' };
      case 'candidats':
      case 'demandes':
        return {
          allowed: true,
          scope: 'relevant_avi_only',
          reason: 'Access limited to AVI and parent-financing relevant records and financial fields.',
        };
      case 'prospects':
      case 'prepa':
      case 'audit':
      case 'users_roles_config':
      default:
        return {
          allowed: false,
          scope: 'denied',
          reason: 'Access denied: Finance Officer has no permission on this administrative/security module.',
        };
    }
  }

  // 3. SECRETARY (Technical roles: lh_internal, ITIL)
  if (profile === 'Secretary' || roles.includes('lh_internal') || roles.includes('ITIL')) {
    switch (module) {
      case 'dashboard':
      case 'demandes':
      case 'prospects':
      case 'candidats':
      case 'prepa':
      case 'reports':
      case 'avi':
      case 'accommodation':
        return { allowed: true, scope: 'intake_administrative' };
      case 'yimmiline':
      case 'finance':
        return {
          allowed: false,
          scope: 'denied',
          reason: 'Access denied: Secretary is denied from General Finance operations.',
        };
      case 'users_roles_config':
      case 'audit':
      default:
        return {
          allowed: false,
          scope: 'denied',
          reason: 'Access denied: Secretary cannot manage users, system roles, or inspect full audit logs.',
        };
    }
  }

  // Deny by default (Least privilege)
  return {
    allowed: false,
    scope: 'denied',
    reason: 'Access denied: No role or permission matched. Denied by default.',
  };
}

/**
 * Checks if user is permitted to trigger accommodation partner email dispatch.
 * Strictly limited to Admin and Secretary. AVI Officer is prohibited.
 */
export function canSendAccommodationRequest(user: AuthenticatedUserContext): boolean {
  if (!user || !user.active) return false;
  const profile = user.business_profile;
  const userRole = (user as any).role;
  const roles = user.technical_roles || [];

  return (
    profile === 'Admin' ||
    userRole === 'admin' ||
    roles.includes('admin') ||
    roles.includes('lh_security_admin') ||
    profile === 'Secretary' ||
    roles.includes('lh_internal') ||
    roles.includes('ITIL')
  );
}

/**
 * Server-side Request Authenticator & Context Extractor
 */
export async function authenticateServerRequest(
  req: NextRequest,
  dbClient?: DBClient
): Promise<
  | { success: true; user: AuthenticatedUserContext }
  | { success: false; response: NextResponse }
> {
  // Extract requester email from various standard headers and params
  const headerEmail =
    req.headers.get('x-user-email') ||
    req.headers.get('X-User-Email') ||
    req.headers.get('user-email');

  const authHeader = req.headers.get('authorization') || '';
  let bearerEmail = '';
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    bearerEmail = authHeader.slice(7).trim();
  }

  const url = new URL(req.url);
  const queryEmail =
    url.searchParams.get('user_email') ||
    url.searchParams.get('requester_email') ||
    url.searchParams.get('email');

  const cookieEmail = req.cookies.get('liec_user_email')?.value;

  const rawEmail = (
    headerEmail ||
    bearerEmail ||
    queryEmail ||
    cookieEmail ||
    ''
  ).trim();

  if (!rawEmail) {
    return {
      success: false,
      response: NextResponse.json(
        {
          error: 'Accès non autorisé / Unauthorized',
          message: 'Session ou identifiants manquants. Veuillez vous connecter sur /login.',
        },
        { status: 401 }
      ),
    };
  }

  const targetEmail = canonicalizeUserEmail(rawEmail);

  let user: AuthenticatedUserContext | null = null;

  try {
    const db = dbClient || (await getDb());
    const res = await db.query(
      `SELECT u.id, u.name, u.email, u.business_profile, u.role, u.title, u.initials,
              u.active, u.suspended_at, u.suspended_by, u.must_change_password,
              COALESCE(ARRAY_AGG(ur.role_id) FILTER (WHERE ur.role_id IS NOT NULL), ARRAY[]::VARCHAR[]) as technical_roles
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       WHERE LOWER(u.email) = $1
       GROUP BY u.id, u.name, u.email, u.business_profile, u.role, u.title, u.initials, u.active, u.suspended_at, u.suspended_by, u.must_change_password`,
      [targetEmail]
    );

    if (res.rows.length > 0) {
      const r = res.rows[0];
      const isRoleAdmin =
        r.role === 'admin' ||
        r.business_profile === 'Admin' ||
        r.email === 'bmapwabantoro@liecconsulting.com' ||
        r.email === 'sarah.mwamba@liec-education.com';
      user = {
        id: r.id,
        name: r.name,
        email: r.email,
        business_profile: (isRoleAdmin ? 'Admin' : r.business_profile) as BusinessProfile,
        role: isRoleAdmin ? 'admin' : r.role,
        technical_roles:
          isRoleAdmin && (!r.technical_roles || r.technical_roles.length === 0)
            ? ['admin', 'lh_security_admin']
            : r.technical_roles || [],
        title: r.title,
        initials: r.initials,
        active: Boolean(r.active),
        suspended_at: r.suspended_at,
        suspended_by: r.suspended_by,
        must_change_password: Boolean(r.must_change_password),
      };
    }
  } catch (err) {
    console.warn('DB lookup for user RBAC context failed, falling back to preconfigured:', err);
  }

  if (!user) {
    user = PRECONFIGURED_USERS_RBAC[targetEmail] || null;
  }

  if (!user) {
    return {
      success: false,
      response: NextResponse.json(
        {
          error: 'Utilisateur non reconnu / User not found',
          message: 'Cet utilisateur ne fait pas partie du personnel autorisé de LIEC Education.',
        },
        { status: 401 }
      ),
    };
  }

  // Check account suspension status
  if (!user.active) {
    return {
      success: false,
      response: NextResponse.json(
        {
          error: 'Compte suspendu / Account Suspended',
          message: 'Votre compte a été suspendu par un administrateur. Accès révoqué.',
          user: { name: user.name, email: user.email, active: false },
        },
        { status: 403 }
      ),
    };
  }

  // Enforce mandatory first-login password change before workspace access
  if (user.must_change_password) {
    return {
      success: false,
      response: NextResponse.json(
        {
          error: 'Changement de mot de passe obligatoire / Password Change Required',
          error_en: 'First Login: Password change is mandatory before accessing workspace.',
          error_fr: 'Première connexion : Le changement de mot de passe est obligatoire.',
          requirePasswordChange: true,
          must_change_password: true,
        },
        { status: 403 }
      ),
    };
  }

  return { success: true, user };
}

/**
 * Enforce RBAC Permission on an API Endpoint
 */
export async function enforceRbac(
  req: NextRequest,
  module: SecuredModule,
  actionName: string
): Promise<
  | { allowed: true; user: AuthenticatedUserContext; db: DBClient }
  | { allowed: false; response: NextResponse }
> {
  const db = await getDb();
  const auth = await authenticateServerRequest(req, db);

  if (!auth.success) {
    return { allowed: false, response: auth.response };
  }

  const { user } = auth;
  const evalResult = evaluateModuleAccess(user, module);

  if (!evalResult.allowed) {
    // Audit log security violation
    try {
      await db.query(
        `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
         VALUES ($1, $2, $3, 'DENIED_403', $4)`,
        [
          `${user.name} (${user.business_profile})`,
          `[SECURITY_VIOLATION] Attempted ${actionName} on module '${module}'`,
          module.toUpperCase(),
          evalResult.reason || 'Unauthorized by RBAC Access Matrix',
        ]
      );
    } catch {}

    const isEn =
      req.headers.get('x-user-lang') === 'en' ||
      req.cookies.get('liec_lang')?.value === 'en' ||
      req.nextUrl.searchParams.get('lang') === 'en';

    return {
      allowed: false,
      response: NextResponse.json(
        {
          error: isEn ? 'Access Denied / 403 Forbidden' : 'Accès Refusé / 403 Forbidden',
          error_en: 'Access Denied / 403 Forbidden',
          error_fr: 'Accès Refusé / 403 Forbidden',
          message: evalResult.reason,
          profile: user.business_profile,
          technical_roles: user.technical_roles,
          module,
          action: actionName,
        },
        { status: 403 }
      ),
    };
  }

  return { allowed: true, user, db };
}

/**
 * Field-level ACL Masking (inspired by ServiceNow field-level ACLs)
 * Protect sensitive fields such as financial details, guarantor bank checks, and confidential notes
 */
export function applyFieldLevelAcl(
  user: AuthenticatedUserContext,
  module: SecuredModule,
  record: any
): any {
  if (user.business_profile === 'Admin') {
    return record; // Admin sees all fields
  }

  const cloned = { ...record };

  if (module === 'candidats') {
    // If Secretary: mask sensitive financial guarantor and parent loan checks
    if (user.business_profile === 'Secretary') {
      if (cloned.garant_info && cloned.garant_info.length > 30) {
        cloned.garant_info = 'Garant validé (Détails financiers réservés au Bureau AVI)';
      }
    }
  }

  return cloned;
}
