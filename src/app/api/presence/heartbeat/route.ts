import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { authenticateServerRequest } from '@/lib/rbac';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/session';
import { ensureUserPresenceTable } from '@/lib/presenceSchema';

export async function POST(req: NextRequest) {
  try {
    const db = await getDb();
    const auth = await authenticateServerRequest(req, db);
    if (!auth.success) {
      return NextResponse.json({ error: 'AUTHENTICATION_REQUIRED' }, { status: 401 });
    }

    await ensureUserPresenceTable(db);

    const rawToken =
      req.cookies.get(SESSION_COOKIE_NAME)?.value ||
      req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
      '';
    const verified = rawToken ? verifySessionToken(rawToken) : null;
    const sessionJti = verified && verified.valid && verified.payload.jti ? String(verified.payload.jti) : null;

    const user = auth.user;
    const body = await req.json().catch(() => ({}));
    const {
      is_idle = false,
      current_activity = '',
      active_record_type = null,
      active_record_ref = null,
      is_editing = false,
    } = body;

    const userId = String(user.id || user.email);
    const sessionId = sessionJti || `sess_${userId}`;
    const userName = String(user.name || user.email);
    const userRole = String(user.business_profile || user.role || 'Staff');

    await db.query(
      `INSERT INTO user_presence (
        user_id, session_id, user_name, user_role, is_idle, current_activity,
        active_record_type, active_record_ref, is_editing, last_heartbeat, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      ON CONFLICT (user_id, session_id) DO UPDATE SET
        user_name = EXCLUDED.user_name,
        user_role = EXCLUDED.user_role,
        is_idle = EXCLUDED.is_idle,
        current_activity = EXCLUDED.current_activity,
        active_record_type = EXCLUDED.active_record_type,
        active_record_ref = EXCLUDED.active_record_ref,
        is_editing = EXCLUDED.is_editing,
        last_heartbeat = NOW(),
        updated_at = NOW()`,
      [
        userId,
        sessionId,
        userName,
        userRole,
        Boolean(is_idle),
        current_activity ? String(current_activity).slice(0, 255) : null,
        active_record_type ? String(active_record_type).slice(0, 100) : null,
        active_record_ref ? String(active_record_ref).slice(0, 100) : null,
        Boolean(is_editing),
      ]
    );

    // Clean up stale presence older than 10 minutes
    await db
      .query(`DELETE FROM user_presence WHERE last_heartbeat < NOW() - INTERVAL '10 minutes'`)
      .catch(() => {});

    return NextResponse.json({ ok: true, user_id: userId, session_id: sessionId, user: userName, role: userRole });
  } catch (err) {
    console.error('[PRESENCE HEARTBEAT] Error:', err);
    return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 });
  }
}
