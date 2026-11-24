import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifySessionToken } from '@/lib/session';

export async function POST(req: NextRequest) {
  const token = req.cookies.get('session')?.value || req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ error: 'AUTHENTICATION_REQUIRED' }, { status: 401 });
  }

  const session = await verifySessionToken(token);
  if (!session.valid) {
    return NextResponse.json({ error: 'SESSION_INVALID' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { is_idle = false, current_activity = '', active_record_type = null, active_record_ref = null, is_editing = false } = body;

    const db = await getDb();
    const userId = String(session.payload.userId || (session.payload as any).id || session.payload.email);
    const sessionId = String(session.payload.jti || 'default_session');
    const userName = String((session.payload as any).name || session.payload.email);
    const userRole = String(session.payload.businessProfile || (session.payload as any).business_profile || session.payload.role || 'Staff');

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

    // Opportunistic cleanup of stale heartbeats older than 10 minutes (preserves 5m idle states safely)
    await db.query(`DELETE FROM user_presence WHERE last_heartbeat < NOW() - INTERVAL '10 minutes'`).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
