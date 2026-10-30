import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(req.url);
    const prospectId = searchParams.get('prospect_id');

    let query = `SELECT * FROM prospect_calls ORDER BY created_at DESC`;
    const params: any[] = [];

    if (prospectId) {
      query = `SELECT * FROM prospect_calls WHERE prospect_id = $1 ORDER BY created_at DESC`;
      params.push(Number(prospectId));
    }

    const res = await db.query(query, params);
    return NextResponse.json({ calls: res.rows });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = await getDb();
    const body = await req.json();

    const {
      prospect_id,
      scheduled_date,
      scheduled_time,
      subject,
      assigned_to,
      notes,
    } = body;

    if (!prospect_id || !scheduled_date || !scheduled_time || !assigned_to) {
      return NextResponse.json(
        { error: 'Champs requis manquants (prospect_id, date, heure, conseiller)' },
        { status: 400 }
      );
    }

    const callSubject = subject || 'Appel de diagnostic orientation';

    const insertRes = await db.query(
      `INSERT INTO prospect_calls (prospect_id, scheduled_date, scheduled_time, subject, assigned_to, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'Scheduled')
       RETURNING *`,
      [Number(prospect_id), scheduled_date, scheduled_time, callSubject, assigned_to, notes || '']
    );

    // Update prospect's meta_right to reflect the scheduled call on the card
    const displayLabel = `Call: ${scheduled_date} (${scheduled_time})`;
    await db.query(
      `UPDATE prospects 
       SET meta_right = $1, meta_right_tone = 'teal'
       WHERE id = $2`,
      [displayLabel, Number(prospect_id)]
    );

    // Audit log
    await db.query(
      `INSERT INTO audit_logs (actor, action, entity_ref, outcome)
       VALUES ($1, $2, $3, 'Succès')`,
      [assigned_to, `Planification appel prospect (${scheduled_date} à ${scheduled_time})`, `PROSPECT-${prospect_id}`]
    );

    return NextResponse.json({ call: insertRes.rows[0], ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const db = await getDb();
    const body = await req.json();
    const { id, status, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'Call ID requis' }, { status: 400 });
    }

    const updateRes = await db.query(
      `UPDATE prospect_calls 
       SET status = COALESCE($1, status), notes = COALESCE($2, notes)
       WHERE id = $3
       RETURNING *`,
      [status, notes, Number(id)]
    );

    return NextResponse.json({ call: updateRes.rows[0], ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
