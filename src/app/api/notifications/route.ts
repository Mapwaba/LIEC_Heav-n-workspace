import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(req.url);
    const userEmail = (searchParams.get('email') || '').toLowerCase().trim();

    if (!userEmail) {
      return NextResponse.json({ readIds: [] });
    }

    const res = await db.query(
      `SELECT notification_id FROM user_notification_reads WHERE LOWER(user_email) = $1`,
      [userEmail]
    );

    const readIds = res.rows.map((r: any) => r.notification_id);
    return NextResponse.json({ readIds });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = await getDb();
    const body = await req.json();
    const userEmail = (body.email || '').toLowerCase().trim();
    const notificationId = String(body.notification_id || '').trim();

    if (!userEmail || !notificationId) {
      return NextResponse.json({ error: 'email et notification_id requis' }, { status: 400 });
    }

    await db.query(
      `INSERT INTO user_notification_reads (user_email, notification_id)
       VALUES ($1, $2)
       ON CONFLICT (user_email, notification_id) DO NOTHING`,
      [userEmail, notificationId]
    );

    return NextResponse.json({ ok: true, read: true, notificationId });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const db = await getDb();
    const body = await req.json();
    const userEmail = (body.email || '').toLowerCase().trim();
    const notificationIds: string[] = body.notification_ids || [];

    if (!userEmail) {
      return NextResponse.json({ error: 'email requis' }, { status: 400 });
    }

    for (const notifId of notificationIds) {
      if (notifId) {
        await db.query(
          `INSERT INTO user_notification_reads (user_email, notification_id)
           VALUES ($1, $2)
           ON CONFLICT (user_email, notification_id) DO NOTHING`,
          [userEmail, notifId]
        );
      }
    }

    return NextResponse.json({ ok: true, count: notificationIds.length });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
