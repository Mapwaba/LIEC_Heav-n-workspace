import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { authenticateServerRequest, canSendAccommodationRequest } from '@/lib/rbac';

export async function POST(req: NextRequest) {
  try {
    const db = await getDb();
    const auth = await authenticateServerRequest(req, db);
    if (!auth.success) return auth.response;

    const { user } = auth;

    // Strict Role Enforcement: Only Admin and Secretary/Advisors can revoke partner links
    if (!canSendAccommodationRequest(user)) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to revoke accommodation access links.' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const ref = (body.ref || '').trim();

    if (!ref) {
      return NextResponse.json(
        { error: 'Accommodation request reference (ref) is required.' },
        { status: 400 }
      );
    }

    const cleanRef = ref.startsWith('#') ? ref : `#${ref}`;

    // 1. Verify accommodation request exists
    const accRes = await db.query(
      `SELECT * FROM accommodation_requests WHERE ref = $1 OR ref = $2`,
      [ref, cleanRef]
    );

    if (!accRes.rows || accRes.rows.length === 0) {
      return NextResponse.json(
        { error: `Accommodation request ${ref} does not exist.` },
        { status: 404 }
      );
    }

    const accRecord = accRes.rows[0];

    // 2. Invalidate all active access tokens for this request
    const updateRes = await db.query(
      `UPDATE accommodation_access_tokens
       SET revoked = TRUE,
           revoked_at = CURRENT_TIMESTAMP,
           revoked_by = $1
       WHERE (request_ref = $2 OR request_ref = $3) AND revoked = FALSE
       RETURNING id, partner_id, partner_email`,
      [`${user.name} (${user.business_profile})`, ref, cleanRef]
    );

    const revokedCount = updateRes.rowCount || 0;
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const history = JSON.parse(accRecord.history_json || '[]');

    history.unshift({
      timestamp,
      author: `${user.name} (${user.business_profile})`,
      action: 'ACCESS_REVOKED',
      details: `Revoked ${revokedCount} active partner document download token(s) for this reservation request.`,
    });

    await db.query(
      `UPDATE accommodation_requests
       SET history_json = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE ref = $2`,
      [JSON.stringify(history), accRecord.ref]
    );

    // 3. Record in audit_logs
    await db.query(
      `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
       VALUES ($1, 'REVOKE_ACCOMMODATION_ACCESS', $2, 'Success', $3)`,
      [
        `${user.name} (${user.business_profile})`,
        accRecord.ref,
        `Revoked ${revokedCount} document access token(s) previously dispatched to partner. Immediate access termination effective.`,
      ]
    );

    return NextResponse.json({
      success: true,
      ref: accRecord.ref,
      revokedTokensCount: revokedCount,
      message: `Successfully revoked ${revokedCount} partner document access link(s) for ${accRecord.ref}.`,
    });
  } catch (error: any) {
    console.error('Error revoking accommodation access tokens:', error);
    return NextResponse.json(
      { error: 'Internal server error revoking access tokens', details: error?.message },
      { status: 500 }
    );
  }
}
