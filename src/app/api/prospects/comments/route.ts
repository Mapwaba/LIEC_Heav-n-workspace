import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { authenticateServerRequest, evaluateModuleAccess } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const auth = await authenticateServerRequest(req, db);
    if (!auth.success) return auth.response;

    const access = evaluateModuleAccess(auth.user, 'prospects');
    if (!access.allowed) {
      return NextResponse.json(
        { error: 'Access Denied / 403 Forbidden: Insufficient permissions for Prospects module.' },
        { status: 403 }
      );
    }

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
    const auth = await authenticateServerRequest(req, db);
    if (!auth.success) return auth.response;

    const access = evaluateModuleAccess(auth.user, 'prospects');
    if (!access.allowed) {
      return NextResponse.json(
        { error: 'Access Denied / 403 Forbidden: Insufficient permissions for Prospects module.' },
        { status: 403 }
      );
    }

    const body = await req.json();

    const {
      prospect_id,
      content,
    } = body;

    if (!prospect_id || !content?.trim()) {
      return NextResponse.json(
        { error: 'prospect_id et content requis' },
        { status: 400 }
      );
    }

    const authorName = body.author_name || auth.user.name;
    const authorEmail = auth.user.email;
    const authorRole = auth.user.business_profile || auth.user.role || 'Staff';

    const insertRes = await db.query(
      `INSERT INTO prospect_notes (prospect_id, author_name, author_email, author_role, content)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        Number(prospect_id),
        authorName,
        authorEmail,
        authorRole,
        content.trim(),
      ]
    );

    // Audit log
    await db.query(
      `INSERT INTO audit_logs (actor, action, entity_ref, outcome)
       VALUES ($1, $2, $3, 'Succès')`,
      [authorName, `Ajout commentaire sur prospect`, `PROSPECT-${prospect_id}`]
    );

    return NextResponse.json({ comment: insertRes.rows[0], ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
