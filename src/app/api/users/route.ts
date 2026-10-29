import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { enforceRbac } from '@/lib/rbac';
import { generateSecureTemporaryPassword, hashPassword } from '@/lib/passwordSecurity';

/**
 * Admin User-Management Workflow API (ServiceNow-Inspired RBAC)
 * Section 4: Create user, Assign roles, Retrieve roles, Suspend/Reactivate, Audit
 */

export async function GET(req: NextRequest) {
  const auth = await enforceRbac(req, 'users_roles_config', 'Inspect Users & Roles');
  if (!auth.allowed) return auth.response;

  const { db, user: adminUser } = auth;

  try {
    const usersRes = await db.query(
      `SELECT u.id, u.name, u.email, u.business_profile, u.role, u.title, u.initials,
              u.active, u.suspended_at, u.suspended_by, u.must_change_password, u.created_at,
              COALESCE(ARRAY_AGG(ur.role_id) FILTER (WHERE ur.role_id IS NOT NULL), ARRAY[]::VARCHAR[]) as technical_roles
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       GROUP BY u.id, u.name, u.email, u.business_profile, u.role, u.title, u.initials, u.active, u.suspended_at, u.suspended_by, u.must_change_password, u.created_at
       ORDER BY u.id ASC`
    );

    const rolesRes = await db.query('SELECT * FROM roles ORDER BY id ASC');

    const assignmentsRes = await db.query(
      `SELECT ur.id, ur.user_id, ur.role_id, ur.assigned_by, ur.assigned_at, u.name as user_name, r.role_name
       FROM user_roles ur
       JOIN users u ON ur.user_id = u.id
       JOIN roles r ON ur.role_id = r.role_id
       ORDER BY ur.assigned_at DESC`
    );

    return NextResponse.json({
      users: usersRes.rows,
      roles: rolesRes.rows,
      assignments: assignmentsRes.rows,
      currentUser: adminUser,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await enforceRbac(req, 'users_roles_config', 'Create User');
  if (!auth.allowed) return auth.response;

  const { db, user: adminUser } = auth;

  try {
    const body = await req.json();
    const name = (body.name || '').trim();
    const email = (body.email || '').trim().toLowerCase();
    const businessProfile = body.business_profile || 'Secretary';
    const technicalRoles: string[] = Array.isArray(body.technical_roles) ? body.technical_roles : [];
    const title = body.title || `${businessProfile} Staff`;
    const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 3) || 'CU';

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    if (!email.endsWith('@liecconsulting.com')) {
      return NextResponse.json(
        { error: 'Professional email must end with @liecconsulting.com' },
        { status: 400 }
      );
    }

    // Role mapping compatibility helper
    let legacyRole = 'secretary';
    if (businessProfile === 'Admin') legacyRole = 'admin';
    else if (businessProfile === 'Finance Officer') legacyRole = 'avi';

    // Generate cryptographically strong temporary password & hash
    const temporaryPassword = generateSecureTemporaryPassword();
    const { hash: passwordHash, salt: passwordSalt } = hashPassword(temporaryPassword);

    // Insert user with secure hash and mandatory first-login password change
    const insertRes = await db.query(
      `INSERT INTO users (name, email, business_profile, role, title, initials, active, password_hash, password_salt, must_change_password)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7, $8, TRUE)
       RETURNING id, name, email, business_profile, role, title, initials, active, must_change_password`,
      [name, email, businessProfile, legacyRole, title, initials, passwordHash, passwordSalt]
    );

    const newUser = insertRes.rows[0];

    // Assign technical roles
    for (const rId of technicalRoles) {
      await db.query(
        `INSERT INTO user_roles (user_id, role_id, assigned_by)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, role_id) DO NOTHING`,
        [newUser.id, rId, adminUser.name]
      );
    }

    // Audit log entry (NEVER log the plain-text password)
    await db.query(
      `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
       VALUES ($1, 'CREATE_USER', $2, 'SUCCESS', $3)`,
      [
        adminUser.name,
        `USER-${newUser.id}`,
        `Created user '${name}' with profile '${businessProfile}' and roles [${technicalRoles.join(', ')}]. One-time temporary password generated with mandatory first-login change.`,
      ]
    );

    return NextResponse.json({
      success: true,
      user: newUser,
      temporaryPassword,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await enforceRbac(req, 'users_roles_config', 'Modify User / Roles');
  if (!auth.allowed) return auth.response;

  const { db, user: adminUser } = auth;

  try {
    const body = await req.json();
    const userId = Number(body.userId);
    const action = body.action; // 'toggle_status' | 'update_roles'

    if (!userId) {
      return NextResponse.json({ error: 'Valid userId is required' }, { status: 400 });
    }

    const userCheck = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    const targetUser = userCheck.rows[0];
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (action === 'toggle_status') {
      const newActive = Boolean(body.active);
      await db.query(
        `UPDATE users
         SET active = $1,
             suspended_at = CASE WHEN $1 = FALSE THEN CURRENT_TIMESTAMP ELSE NULL END,
             suspended_by = CASE WHEN $1 = FALSE THEN $2 ELSE NULL END
         WHERE id = $3`,
        [newActive, adminUser.name, userId]
      );

      await db.query(
        `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
         VALUES ($1, $2, $3, 'SUCCESS', $4)`,
        [
          adminUser.name,
          newActive ? 'REACTIVATE_USER' : 'SUSPEND_USER',
          `USER-${userId}`,
          `Account for '${targetUser.name}' was ${newActive ? 'reactivated' : 'suspended'} by ${adminUser.name}`,
        ]
      );

      return NextResponse.json({ success: true, userId, active: newActive });
    }

    if (action === 'update_roles') {
      const businessProfile = body.business_profile || targetUser.business_profile;
      const technicalRoles: string[] = Array.isArray(body.technical_roles) ? body.technical_roles : [];

      let legacyRole = targetUser.role;
      if (businessProfile === 'Admin') legacyRole = 'admin';
      else if (businessProfile === 'Finance Officer') legacyRole = 'avi';
      else if (businessProfile === 'Secretary') legacyRole = 'secretary';

      await db.query(
        `UPDATE users SET business_profile = $1, role = $2 WHERE id = $3`,
        [businessProfile, legacyRole, userId]
      );

      // Re-sync user_roles
      await db.query('DELETE FROM user_roles WHERE user_id = $1', [userId]);
      for (const rId of technicalRoles) {
        await db.query(
          `INSERT INTO user_roles (user_id, role_id, assigned_by)
           VALUES ($1, $2, $3)`,
          [userId, rId, adminUser.name]
        );
      }

      await db.query(
        `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
         VALUES ($1, 'ASSIGN_ROLES', $2, 'SUCCESS', $3)`,
        [
          adminUser.name,
          `USER-${userId}`,
          `Updated '${targetUser.name}' profile to '${businessProfile}', technical roles: [${technicalRoles.join(', ')}]`,
        ]
      );

      return NextResponse.json({
        success: true,
        userId,
        businessProfile,
        technicalRoles,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await enforceRbac(req, 'users_roles_config', 'Delete User');
  if (!auth.allowed) return auth.response;

  const { db, user: adminUser } = auth;

  try {
    const userId = Number(req.nextUrl.searchParams.get('userId'));
    if (!userId) {
      return NextResponse.json({ error: 'Valid userId is required' }, { status: 400 });
    }

    const userCheck = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    const targetUser = userCheck.rows[0];
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (
      targetUser.email === adminUser.email ||
      targetUser.email === 'bmapwabantoro@liecconsulting.com' ||
      targetUser.business_profile === 'Admin'
    ) {
      return NextResponse.json({ error: 'Cannot delete the primary administrator' }, { status: 400 });
    }

    await db.query('DELETE FROM user_roles WHERE user_id = $1', [userId]);
    await db.query('DELETE FROM users WHERE id = $1', [userId]);

    await db.query(
      `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
       VALUES ($1, 'DELETE_USER', $2, 'SUCCESS', $3)`,
      [
        adminUser.name,
        `USER-${userId}`,
        `Deleted user account '${targetUser.name}' (${targetUser.email})`,
      ]
    );

    return NextResponse.json({ success: true, deletedUserId: userId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
