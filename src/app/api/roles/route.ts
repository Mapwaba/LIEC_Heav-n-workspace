import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { TECHNICAL_ROLES_REGISTRY, authenticateServerRequest } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const auth = await authenticateServerRequest(req, db);

    if (!auth.success) {
      return auth.response;
    }

    try {
      const res = await db.query('SELECT * FROM roles ORDER BY id ASC');
      if (res.rows.length > 0) {
        return NextResponse.json({
          roles: res.rows,
          registry: TECHNICAL_ROLES_REGISTRY,
        });
      }
    } catch {}

    return NextResponse.json({
      roles: TECHNICAL_ROLES_REGISTRY,
      registry: TECHNICAL_ROLES_REGISTRY,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
