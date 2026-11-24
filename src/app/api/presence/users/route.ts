import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifySessionToken } from '@/lib/session';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('session')?.value || req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ error: 'AUTHENTICATION_REQUIRED' }, { status: 401 });
  }

  const session = await verifySessionToken(token);
  if (!session.valid) {
    return NextResponse.json({ error: 'SESSION_INVALID' }, { status: 401 });
  }

  try {
    const db = await getDb();
    const role = (session.payload.businessProfile || (session.payload as any).business_profile || session.payload.role || '').toLowerCase();
    const isAdmin = role.includes('admin');

    // Only active presence within last 75 seconds
    const res = await db.query(`
      SELECT user_id, user_name, user_role, is_idle, current_activity,
             active_record_type, active_record_ref, is_editing, last_heartbeat
      FROM user_presence
      WHERE last_heartbeat >= NOW() - INTERVAL '75 seconds'
      ORDER BY last_heartbeat DESC
    `);

    // Map into connected users and active record collaborators
    const connectedUsers: Array<{
      name: string;
      role: string;
      status: 'online' | 'idle' | 'offline';
      activity?: string;
    }> = [];

    const recordCollaborators: Record<string, Array<{
      name: string;
      role: string;
      is_editing: boolean;
    }>> = {};

    const seenUsers = new Set<string>();

    for (const row of res.rows) {
      const uKey = `${row.user_id}`;
      const status = row.is_idle ? 'idle' : 'online';

      if (!seenUsers.has(uKey)) {
        seenUsers.add(uKey);
        // Visibility rule: Admin sees all; Staff sees all or general presence
        connectedUsers.push({
          name: row.user_name,
          role: row.user_role,
          status,
          activity: isAdmin || !row.current_activity?.includes('Secret') ? row.current_activity : undefined,
        });
      }

      if (row.active_record_ref) {
        if (!recordCollaborators[row.active_record_ref]) {
          recordCollaborators[row.active_record_ref] = [];
        }
        recordCollaborators[row.active_record_ref].push({
          name: row.user_name,
          role: row.user_role,
          is_editing: Boolean(row.is_editing),
        });
      }
    }

    return NextResponse.json({
      users: connectedUsers,
      collaborators: recordCollaborators,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
