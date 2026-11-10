import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { enforceRbac } from '@/lib/rbac';
import { provisionUserAccount } from '@/lib/userProvisioning';

/**
 * Admin User-Management Workflow API (Enterprise RBAC)
 * Section 4: Create user, Assign roles, Retrieve roles, Suspend/Reactivate, Audit
 */

export async function GET(req: NextRequest) {
  const auth = await enforceRbac(req, 'users_roles_config', 'Inspect Users & Roles');
  if (!auth.allowed) return auth.response;

  const { db, user: adminUser } = auth;

  try {
    const usersRes = await db.query(
      `SELECT u.id, u.name, u.first_name, u.last_name, u.user_id, u.email, u.business_profile, u.role, u.title, u.initials,
              u.active, u.suspended_at, u.suspended_by, u.must_change_password, u.created_at,
              COALESCE(ARRAY_AGG(ur.role_id) FILTER (WHERE ur.role_id IS NOT NULL), ARRAY[]::VARCHAR[]) as technical_roles
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       GROUP BY u.id, u.name, u.first_name, u.last_name, u.user_id, u.email, u.business_profile, u.role, u.title, u.initials, u.active, u.suspended_at, u.suspended_by, u.must_change_password, u.created_at
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

    const outcome = await provisionUserAccount(db, {
      firstName: body.first_name || body.firstName,
      lastName: body.last_name || body.lastName,
      name: body.name,
      email: body.email,
      businessProfile: body.business_profile,
      technicalRoles: body.technical_roles,
      title: body.title,
      requestedUserId: body.user_id || body.userId,
      adminUser,
      options: {
        updateIfExists: false,
        sendWelcomeEmail: true,
        sourceBatch: 'MANUAL_ADMIN_CREATION',
      },
    });

    if (!outcome.success) {
      return NextResponse.json({ error: outcome.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      user: outcome.user,
      userId: outcome.userId,
      temporaryPassword: outcome.temporaryPassword,
      emailSent: outcome.emailSent,
      emailError: outcome.emailError,
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

      // Re-sync user_roles safely with foreign-key guarantee
      await db.query('DELETE FROM user_roles WHERE user_id = $1', [userId]);
      for (const rId of technicalRoles) {
        if (!rId) continue;
        await db.query(
          `INSERT INTO roles (role_id, role_name, business_profile, description, safeguards, active)
           VALUES ($1, $1, $2, 'Technical role', 'Enforce least privilege', TRUE)
           ON CONFLICT (role_id) DO NOTHING`,
          [rId, businessProfile]
        );
        await db.query(
          `INSERT INTO user_roles (user_id, role_id, assigned_by)
           VALUES ($1, $2, $3)
           ON CONFLICT (user_id, role_id) DO NOTHING`,
          [userId, rId, adminUser.name || 'Platform Administrator']
        );
      }

      // Re-fetch updated user record with technical_roles
      const updatedUserRes = await db.query(
        `SELECT u.id, u.name, u.email, u.business_profile, u.role, u.title, u.initials,
                u.active, u.suspended_at, u.suspended_by, u.created_at,
                COALESCE(ARRAY_AGG(ur.role_id) FILTER (WHERE ur.role_id IS NOT NULL), ARRAY[]::VARCHAR[]) as technical_roles
         FROM users u
         LEFT JOIN user_roles ur ON u.id = ur.user_id
         WHERE u.id = $1
         GROUP BY u.id, u.name, u.email, u.business_profile, u.role, u.title, u.initials, u.active, u.suspended_at, u.suspended_by, u.created_at`,
        [userId]
      );

      const updatedUser = updatedUserRes.rows[0];

      await db.query(
        `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
         VALUES ($1, 'ASSIGN_ROLES', $2, 'SUCCESS', $3)`,
        [
          adminUser.name,
          `USER-${userId}`,
          `Updated '${targetUser.name}' profile to '${businessProfile}', technical roles: [${technicalRoles.join(', ')}]. Assigned by ${adminUser.name}.`,
        ]
      );

      return NextResponse.json({
        success: true,
        user: updatedUser,
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
