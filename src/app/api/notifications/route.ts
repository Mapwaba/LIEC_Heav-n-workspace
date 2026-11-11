import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { authenticateServerRequest } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const auth = await authenticateServerRequest(req, db);
    if (!auth.success) return auth.response;

    const { searchParams } = new URL(req.url);
    const requestedEmail = (searchParams.get('email') || searchParams.get('user_email') || '').toLowerCase().trim();

    // Normal staff can only read their own notifications; Admin can view any
    let effectiveEmail = auth.user.email.toLowerCase().trim();
    if (requestedEmail && auth.user.role === 'admin') {
      effectiveEmail = requestedEmail;
    }

    // Ensure table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_notification_reads (
        id SERIAL PRIMARY KEY,
        user_email VARCHAR(160) NOT NULL,
        notification_id VARCHAR(100) NOT NULL,
        read_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_email, notification_id)
      )
    `);

    const res = await db.query(
      `SELECT notification_id FROM user_notification_reads WHERE LOWER(user_email) = $1`,
      [effectiveEmail]
    );

    const readIds = res.rows.map((r: any) => r.notification_id);
    return NextResponse.json({ readIds, count: readIds.length, userEmail: effectiveEmail });
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
    const requestedEmail = (body.email || body.user_email || body.userEmail || '').toLowerCase().trim();
    const notificationId = String(body.notification_id || body.notificationId || '').trim();

    let effectiveEmail = auth.user.email.toLowerCase().trim();
    if (requestedEmail && auth.user.role === 'admin') {
      effectiveEmail = requestedEmail;
    }

    if (!notificationId) {
      return NextResponse.json(
        { error: 'notification_id is required' },
        { status: 400 }
      );
    }

    // Ensure table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_notification_reads (
        id SERIAL PRIMARY KEY,
        user_email VARCHAR(160) NOT NULL,
        notification_id VARCHAR(100) NOT NULL,
        read_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_email, notification_id)
      )
    `);

    await db.query(
      `INSERT INTO user_notification_reads (user_email, notification_id)
       VALUES ($1, $2)
       ON CONFLICT (user_email, notification_id) DO NOTHING`,
      [effectiveEmail, notificationId]
    );

    return NextResponse.json({ ok: true, read: true, notificationId, userEmail: effectiveEmail });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const db = await getDb();
    const auth = await authenticateServerRequest(req, db);
    if (!auth.success) return auth.response;

    const body = await req.json();
    const requestedEmail = (body.email || body.user_email || body.userEmail || '').toLowerCase().trim();
    const notificationIds: string[] = body.notification_ids || body.notificationIds || [];

    let effectiveEmail = auth.user.email.toLowerCase().trim();
    if (requestedEmail && auth.user.role === 'admin') {
      effectiveEmail = requestedEmail;
    }

    // Ensure table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_notification_reads (
        id SERIAL PRIMARY KEY,
        user_email VARCHAR(160) NOT NULL,
        notification_id VARCHAR(100) NOT NULL,
        read_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_email, notification_id)
      )
    `);

    for (const notifId of notificationIds) {
      if (notifId) {
        await db.query(
          `INSERT INTO user_notification_reads (user_email, notification_id)
           VALUES ($1, $2)
           ON CONFLICT (user_email, notification_id) DO NOTHING`,
          [effectiveEmail, String(notifId).trim()]
        );
      }
    }

    return NextResponse.json({ ok: true, count: notificationIds.length, userEmail: effectiveEmail });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
