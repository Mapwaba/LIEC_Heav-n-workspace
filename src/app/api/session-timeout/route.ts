import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { authenticateServerRequest } from '@/lib/rbac';

export interface RoleSessionTimeoutItem {
  id?: number;
  role_id: string;
  role_name: string;
  business_profile: string;
  timeout_minutes: number;
  updated_by?: string;
  updated_at?: string;
}

const DEFAULT_TIMEOUTS: RoleSessionTimeoutItem[] = [
  { role_id: 'admin', role_name: 'Platform Administrator (Admin / Self)', business_profile: 'Admin', timeout_minutes: 15 },
  { role_id: 'lh_security_admin', role_name: 'Security Administrator', business_profile: 'Admin', timeout_minutes: 15 },
  { role_id: 'secretary', role_name: 'Secretary (Admissions & Intake)', business_profile: 'Secretary', timeout_minutes: 20 },
  { role_id: 'ITIL', role_name: 'ITIL Workflow Operator', business_profile: 'Secretary', timeout_minutes: 20 },
  { role_id: 'lh_internal', role_name: 'Internal Application Access', business_profile: 'Secretary', timeout_minutes: 20 },
  { role_id: 'avi', role_name: 'Finance Officer (Blocked Account / AVI)', business_profile: 'Finance Officer', timeout_minutes: 15 },
  { role_id: 'lh_finance', role_name: 'Finance & AVI Officer', business_profile: 'Finance Officer', timeout_minutes: 15 },
];

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const auth = await authenticateServerRequest(req, db);

    if (!auth.success) {
      return auth.response;
    }

    const { user } = auth;
    let timeouts: RoleSessionTimeoutItem[] = [];

    try {
      const res = await db.query('SELECT * FROM role_session_timeouts ORDER BY id ASC');
      if (res.rows && res.rows.length > 0) {
        timeouts = res.rows;
      } else {
        timeouts = DEFAULT_TIMEOUTS;
      }
    } catch {
      timeouts = DEFAULT_TIMEOUTS;
    }

    // Determine current user's active session timeout in minutes
    let userTimeout = 15;
    const userRole = (user.role || '').toLowerCase();
    const userProfile = (user.business_profile || '').toLowerCase();
    const technicalRoles = (user.technical_roles || []).map((r) => r.toLowerCase());

    const directMatch = timeouts.find(
      (t) =>
        t.role_id.toLowerCase() === userRole ||
        technicalRoles.includes(t.role_id.toLowerCase())
    );

    if (directMatch) {
      userTimeout = directMatch.timeout_minutes;
    } else {
      const profileMatch = timeouts.find(
        (t) => t.business_profile.toLowerCase() === userProfile
      );
      if (profileMatch) {
        userTimeout = profileMatch.timeout_minutes;
      }
    }

    // Strict boundary enforcement: 10 to 30 min
    userTimeout = Math.min(30, Math.max(10, userTimeout));

    const isAdmin =
      user.business_profile === 'Admin' ||
      user.technical_roles?.includes('admin') ||
      user.role === 'admin';

    return NextResponse.json({
      success: true,
      isAdmin,
      userTimeout,
      timeouts,
    });
  } catch (error: any) {
    console.error('Error fetching session timeouts:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve session timeouts', details: error?.message },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const db = await getDb();
    const auth = await authenticateServerRequest(req, db);

    if (!auth.success) {
      return auth.response;
    }

    const { user } = auth;
    const isAdmin =
      user.business_profile === 'Admin' ||
      user.technical_roles?.includes('admin') ||
      user.role === 'admin';

    // Strict authorization: Only Admins can modify session timeouts
    if (!isAdmin) {
      return NextResponse.json(
        {
          error: 'Accès refusé. Seul un administrateur peut modifier la politique de délai de session.',
          error_en: 'Access denied. Only Platform Administrators can configure session timeout policies.',
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const updates: Array<{ role_id: string; timeout_minutes: number; role_name?: string; business_profile?: string }> =
      Array.isArray(body.updates)
        ? body.updates
        : body.role_id && body.timeout_minutes !== undefined
        ? [{ role_id: body.role_id, timeout_minutes: body.timeout_minutes, role_name: body.role_name, business_profile: body.business_profile }]
        : [];

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'Aucune mise à jour fournie (role_id et timeout_minutes requis).' },
        { status: 400 }
      );
    }

    // Validate each update against the 10 - 30 minutes rule
    for (const item of updates) {
      const minutes = Number(item.timeout_minutes);
      if (!Number.isInteger(minutes) || minutes < 10 || minutes > 30) {
        return NextResponse.json(
          {
            error: `Le délai de session pour le rôle '${item.role_id}' doit être compris strictement entre 10 et 30 minutes (reçu: ${item.timeout_minutes}).`,
            error_en: `Session timeout for role '${item.role_id}' must be an integer between 10 and 30 minutes (received: ${item.timeout_minutes}).`,
          },
          { status: 400 }
        );
      }
    }

    // Execute updates
    for (const item of updates) {
      const minutes = Number(item.timeout_minutes);
      const roleId = item.role_id.trim();

      await db.query(
        `INSERT INTO role_session_timeouts (role_id, role_name, business_profile, timeout_minutes, updated_by, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (role_id) DO UPDATE SET
           timeout_minutes = EXCLUDED.timeout_minutes,
           updated_by = EXCLUDED.updated_by,
           updated_at = NOW()`,
        [
          roleId,
          item.role_name || roleId,
          item.business_profile || (roleId.includes('admin') ? 'Admin' : roleId.includes('finance') || roleId === 'avi' ? 'Finance Officer' : 'Secretary'),
          minutes,
          user.name || 'Platform Administrator',
        ]
      );

      // Sync to roles table if exists
      try {
        await db.query(
          `UPDATE roles SET timeout_minutes = $1 WHERE role_id = $2`,
          [minutes, roleId]
        );
      } catch {}

      // Log in audit trail
      try {
        await db.query(
          `INSERT INTO audit_logs (actor, action, entity_ref, outcome)
           VALUES ($1, 'Mise à jour politique délai session (' || $2 || ' -> ' || $3 || ' min)', 'SECURITY-SESSION-POLICY', 'Succès')`,
          [user.name || 'Platform Administrator', roleId, minutes]
        );
      } catch (logErr) {
        console.warn('Audit logging warning:', logErr);
      }
    }

    const updatedRes = await db.query('SELECT * FROM role_session_timeouts ORDER BY id ASC');

    return NextResponse.json({
      success: true,
      message: 'Politique de délai de session mise à jour avec succès (plage 10-30 min respectée).',
      message_en: 'Session timeout policy successfully updated (10-30 min range enforced).',
      timeouts: updatedRes.rows,
    });
  } catch (error: any) {
    console.error('Error updating session timeouts:', error);
    return NextResponse.json(
      { error: 'Failed to update session timeouts', details: error?.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return PATCH(req);
}
