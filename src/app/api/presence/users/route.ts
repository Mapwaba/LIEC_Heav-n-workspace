import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { authenticateServerRequest } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const auth = await authenticateServerRequest(req, db);
    if (!auth.success) {
      return NextResponse.json({ error: 'AUTHENTICATION_REQUIRED' }, { status: 401 });
    }

    const user = auth.user;
    const role = (user.business_profile || user.role || '').toLowerCase();
    const isAdmin = role.includes('admin');
    const currentUserId = String(user.id || user.email);

    // Only active presence within last 75 seconds
    const res = await db.query(`
      SELECT user_id, user_name, user_role, is_idle, current_activity,
             active_record_type, active_record_ref, is_editing, last_heartbeat
      FROM user_presence
      WHERE last_heartbeat >= NOW() - INTERVAL '75 seconds'
      ORDER BY last_heartbeat DESC
    `);

    // Deduplicate by user_id (most recent heartbeat wins)
    const seenUsers = new Set<string>();
    const connectedUsers: Array<{
      user_id: string;
      name: string;
      role: string;
      status: 'online' | 'idle' | 'offline';
      activity?: string;
    }> = [];

    const recordCollaborators: Record<
      string,
      Array<{
        user_id: string;
        name: string;
        role: string;
        is_editing: boolean;
      }>
    > = {};

    for (const row of res.rows) {
      const uid = String(row.user_id);
      if (!seenUsers.has(uid)) {
        seenUsers.add(uid);
        // Admin sees all connected staff; non-admin sees themselves + active collaborators
        connectedUsers.push({
          user_id: uid,
          name: row.user_name,
          role: row.user_role,
          status: row.is_idle ? 'idle' : 'online',
          activity: isAdmin ? row.current_activity || undefined : undefined,
        });
      }

      if (row.active_record_type && row.active_record_ref) {
        const key = `${row.active_record_type}:${row.active_record_ref}`;
        if (!recordCollaborators[key]) {
          recordCollaborators[key] = [];
        }
        // Exclude current user from collaborators list on their own screen so they see OTHER collaborators
        if (uid !== currentUserId) {
          const exists = recordCollaborators[key].some((c) => c.user_id === uid);
          if (!exists) {
            recordCollaborators[key].push({
              user_id: uid,
              name: row.user_name,
              role: row.user_role,
              is_editing: Boolean(row.is_editing),
            });
          }
        }
      }
    }

    return NextResponse.json({
      ok: true,
      users: connectedUsers,
      collaborators: recordCollaborators,
    });
  } catch (err) {
    console.error('[PRESENCE USERS] Error:', err);
    return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 });
  }
}
