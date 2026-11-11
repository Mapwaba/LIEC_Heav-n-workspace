import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { authenticateServerRequest } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const auth = await authenticateServerRequest(req, db);
    if (!auth.success) return auth.response;

    const { searchParams } = new URL(req.url);
    const requestedEmail = (searchParams.get('email') || '').toLowerCase().trim();

    let targetEmail = auth.user.email.toLowerCase().trim();
    if (requestedEmail && (auth.user.role === 'admin' || auth.user.business_profile === 'Admin')) {
      targetEmail = requestedEmail;
    }

    const res = await db.query(
      `SELECT tour_completed FROM users WHERE LOWER(email) = $1`,
      [targetEmail]
    );

    const completed = res.rows.length > 0 ? Boolean(res.rows[0]?.tour_completed) : false;
    return NextResponse.json({ tour_completed: completed, email: targetEmail });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = await getDb();
    const auth = await authenticateServerRequest(req, db);
    if (!auth.success) return auth.response;

    const body = await req.json();
    const completed = body.completed !== undefined ? Boolean(body.completed) : true;
    const requestedEmail = (body.email || '').toLowerCase().trim();

    let targetId = auth.user.id;
    let targetEmail = auth.user.email;

    if (requestedEmail && (auth.user.role === 'admin' || auth.user.business_profile === 'Admin')) {
      const uRes = await db.query(`SELECT id, email FROM users WHERE LOWER(email) = $1`, [requestedEmail]);
      if (uRes.rows.length > 0) {
        targetId = uRes.rows[0].id;
        targetEmail = uRes.rows[0].email;
      }
    }

    await db.query(
      `UPDATE users SET tour_completed = $1 WHERE id = $2`,
      [completed, targetId]
    );

    return NextResponse.json({ ok: true, tour_completed: completed, email: targetEmail });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
