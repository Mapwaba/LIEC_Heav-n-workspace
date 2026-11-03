import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(req.url);
    const userEmail = (
      searchParams.get('email') ||
      searchParams.get('user_email') ||
      req.headers.get('x-user-email') ||
      ''
    )
      .toLowerCase()
      .trim();

    if (!userEmail) {
      return NextResponse.json({ readIds: [] });
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
      [userEmail]
    );

    const readIds = res.rows.map((r: any) => r.notification_id);
    return NextResponse.json({ readIds, count: readIds.length });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = await getDb();
    const body = await req.json();
    const userEmail = (
      body.email ||
      body.user_email ||
      body.userEmail ||
      req.headers.get('x-user-email') ||
      ''
    )
      .toLowerCase()
      .trim();
    const notificationId = String(body.notification_id || body.notificationId || '').trim();

    if (!userEmail || !notificationId) {
      return NextResponse.json(
        { error: 'Email and notification_id are required' },
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
      [userEmail, notificationId]
    );

    return NextResponse.json({ ok: true, read: true, notificationId, userEmail });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const db = await getDb();
    const body = await req.json();
    const userEmail = (
      body.email ||
      body.user_email ||
      body.userEmail ||
      req.headers.get('x-user-email') ||
      ''
    )
      .toLowerCase()
      .trim();
    const notificationIds: string[] = body.notification_ids || body.notificationIds || [];

    if (!userEmail) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
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
          [userEmail, String(notifId).trim()]
        );
      }
    }

    return NextResponse.json({ ok: true, count: notificationIds.length, userEmail });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
