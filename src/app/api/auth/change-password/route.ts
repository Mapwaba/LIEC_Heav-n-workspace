import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyPassword, hashPassword, validatePasswordPolicy } from '@/lib/passwordSecurity';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = (body.email || '').trim().toLowerCase();
    const currentPassword = (body.currentPassword || '').trim();
    const newPassword = (body.newPassword || '').trim();
    const confirmPassword = (body.confirmPassword || '').trim();

    if (!email || !currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: 'All fields are required / Tous les champs sont obligatoires.' },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: 'New password and confirmation do not match / Les mots de passe ne correspondent pas.' },
        { status: 400 }
      );
    }

    // Validate Password Policy
    const policy = validatePasswordPolicy(newPassword, currentPassword);
    if (!policy.valid) {
      return NextResponse.json(
        {
          error: policy.errors[0] || 'Password does not meet complexity requirements.',
          errors: policy.errors,
          policyChecks: policy.checks,
        },
        { status: 400 }
      );
    }

    const db = await getDb();
    const userRes = await db.query(
      `SELECT u.id, u.name, u.email, u.business_profile, u.role, u.title, u.initials,
              u.active, u.password_hash, u.password_salt, u.must_change_password
       FROM users u
       WHERE LOWER(u.email) = $1`,
      [email]
    );

    if (userRes.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found / Utilisateur introuvable.' },
        { status: 404 }
      );
    }

    const user = userRes.rows[0];

    if (!user.active) {
      return NextResponse.json(
        { error: 'Account suspended / Compte suspendu.' },
        { status: 403 }
      );
    }

    // Verify current temporary password
    let passwordValid = false;
    if (user.password_hash && user.password_salt) {
      passwordValid = verifyPassword(currentPassword, user.password_hash, user.password_salt);
    }

    if (!passwordValid) {
      return NextResponse.json(
        { error: 'Invalid current/temporary password / Mot de passe temporaire incorrect.' },
        { status: 401 }
      );
    }

    // Hash new personal password
    const { hash: newHash, salt: newSalt } = hashPassword(newPassword);

    // Update in database
    await db.query(
      `UPDATE users
       SET password_hash = $1,
           password_salt = $2,
           must_change_password = FALSE,
           password_updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [newHash, newSalt, user.id]
    );

    // Audit log entry
    await db.query(
      `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
       VALUES ($1, 'FIRST_LOGIN_PASSWORD_CHANGED', $2, 'SUCCESS', $3)`,
      [
        user.name,
        `USER-${user.id}`,
        `User completed mandatory first-login password change and set their personal secure password.`,
      ]
    );

    const userPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      business_profile: user.business_profile,
      title: user.title,
      initials: user.initials,
      must_change_password: false,
    };

    const res = NextResponse.json({
      success: true,
      message: 'Password successfully updated. Access granted.',
      user: userPayload,
    });

    res.cookies.set({
      name: 'liec_user_email',
      value: user.email,
      path: '/',
      maxAge: 604800,
      sameSite: 'lax',
    });

    return res;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
