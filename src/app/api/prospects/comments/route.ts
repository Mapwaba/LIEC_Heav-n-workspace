import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(req.url);
    const prospectId = searchParams.get('prospect_id');

    let query = `SELECT * FROM prospect_notes ORDER BY created_at ASC`;
    const params: any[] = [];

    if (prospectId) {
      query = `SELECT * FROM prospect_notes WHERE prospect_id = $1 ORDER BY created_at ASC`;
      params.push(Number(prospectId));
    }

    const res = await db.query(query, params);
    return NextResponse.json({ comments: res.rows });
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
      author_name,
      author_email,
      author_role,
      content,
    } = body;

    if (!prospect_id || !content?.trim()) {
      return NextResponse.json(
        { error: 'prospect_id et content requis' },
        { status: 400 }
      );
    }

    const author = author_name || 'Staff LIEC';

    const insertRes = await db.query(
      `INSERT INTO prospect_notes (prospect_id, author_name, author_email, author_role, content)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        Number(prospect_id),
        author,
        author_email || null,
        author_role || 'Staff',
        content.trim(),
      ]
    );

    // Audit log
    await db.query(
      `INSERT INTO audit_logs (actor, action, entity_ref, outcome)
       VALUES ($1, $2, $3, 'Succès')`,
      [author, `Ajout commentaire sur prospect`, `PROSPECT-${prospect_id}`]
    );

    return NextResponse.json({ comment: insertRes.rows[0], ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
