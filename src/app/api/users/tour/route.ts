import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(req.url);
    const email = (searchParams.get('email') || '').toLowerCase().trim();

    if (!email) {
      return NextResponse.json({ tour_completed: false });
    }

    const res = await db.query(
      `SELECT tour_completed FROM users WHERE LOWER(email) = $1`,
      [email]
    );

    const completed = res.rows.length > 0 ? Boolean(res.rows[0]?.tour_completed) : false;
    return NextResponse.json({ tour_completed: completed });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = await getDb();
    const body = await req.json();
    const email = (body.email || '').toLowerCase().trim();
    const completed = body.completed !== undefined ? Boolean(body.completed) : true;

    if (!email) {
      return NextResponse.json({ error: 'email requis' }, { status: 400 });
    }

    await db.query(
      `UPDATE users SET tour_completed = $1 WHERE LOWER(email) = $2`,
      [completed, email]
    );

    return NextResponse.json({ ok: true, tour_completed: completed });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
