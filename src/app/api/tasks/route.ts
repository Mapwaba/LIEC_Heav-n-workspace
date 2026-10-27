import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const db = await getDb();
    const body = await req.json();

    if (body.action === 'toggle') {
      await db.query('UPDATE priority_tasks SET completed = NOT completed WHERE id = $1', [
        body.id,
      ]);
      return NextResponse.json({ ok: true });
    }

    if (body.action === 'reset_all') {
      await db.query('UPDATE priority_tasks SET completed = FALSE');
      return NextResponse.json({ ok: true });
    }

    const res = await db.query(
      `INSERT INTO priority_tasks (title, description, priority, action_label, target_module, completed, role_queue)
       VALUES ($1, $2, $3, $4, $5, FALSE, $6) RETURNING *`,
      [
        body.title || 'Nouvelle tâche conseil',
        body.description || 'Action de suivi assignée à l’équipe LIEC',
        body.priority || 'Urgent',
        body.action_label || 'Traiter maintenant',
        body.target_module || 'demandes',
        body.role_queue || 'all',
      ]
    );

    return NextResponse.json({ task: res.rows[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
