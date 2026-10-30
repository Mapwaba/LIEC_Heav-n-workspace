import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

const COUNTRY_FLAGS: Record<string, string> = {
  RDC: '🇨🇩',
  'Congo-Brazzaville': '🇨🇬',
  Congo: '🇨🇬',
};

export async function POST(req: NextRequest) {
  try {
    const db = await getDb();
    const body = await req.json();

    const fullName = (body.full_name || 'Nouveau Prospect').trim();
    const stage = body.stage || 'nouveau';
    const country = body.country || 'RDC';
    const city =
      body.city || (country.includes('Brazza') || country === 'Congo' ? 'Brazzaville' : 'Kinshasa');
    const programTag = body.program_tag || 'MyDigitalSchool Lyon — UX/UI';
    const adviserName = body.adviser_name || 'Barthelemy MAPWABA NTORO';
    const estimatedValue = Number(body.estimated_value) || 1800;
    const isUrgent = Boolean(body.is_urgent);

    const flag = COUNTRY_FLAGS[country] || '🇨🇩';
    const initials = adviserName
      .split(/\s+/)
      .map((w: string) => w[0]?.toUpperCase() || '')
      .join('')
      .slice(0, 2);

    const res = await db.query(
      `INSERT INTO prospects (
        full_name, stage, badge_text, badge_tone, flag, country_city, program_tag,
        program_tag_tone, highlight_box, meta_left, meta_right, meta_right_tone,
        adviser_initials, adviser_name, adviser_color, estimated_value, is_urgent, is_prepa
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
      RETURNING *`,
      [
        fullName,
        stage,
        isUrgent ? '● < 24h' : 'Auj.',
        isUrgent ? 'urgent' : 'neutral',
        flag,
        `${country} (${city})`,
        programTag,
        'mint',
        null,
        "À l'instant",
        'Schedule a Call',
        'teal',
        initials || 'BM',
        adviserName,
        'navy',
        estimatedValue,
        isUrgent,
        true,
      ]
    );

    await db.query(
      `INSERT INTO audit_logs (actor, action, entity_ref, outcome)
       VALUES ('Barthelemy MAPWABA NTORO', $1, $2, 'Succès')`,
      [`Ajout prospect pipeline Lyon (${fullName})`, `PROSPECT-${res.rows[0]?.id}`]
    );

    return NextResponse.json({ prospect: res.rows[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const db = await getDb();
    const body = await req.json();
    const { id, stage } = body;

    if (!id || !stage) {
      return NextResponse.json({ error: 'ID et stade requis' }, { status: 400 });
    }

    await db.query(`UPDATE prospects SET stage = $1 WHERE id = $2`, [stage, id]);
    await db.query(
      `INSERT INTO audit_logs (actor, action, entity_ref, outcome)
       VALUES ('Barthelemy MAPWABA NTORO', $1, $2, 'Succès')`,
      [`Avancement pipeline prospect -> ${stage}`, `PROSPECT-${id}`]
    );

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const db = await getDb();
    const body = await req.json();
    const {
      id,
      full_name,
      stage,
      country_city,
      program_tag,
      adviser_name,
      estimated_value,
      is_urgent,
      meta_right,
      meta_left,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Prospect ID requis' }, { status: 400 });
    }

    let adviserInitials = undefined;
    if (adviser_name) {
      adviserInitials = adviser_name
        .split(/\s+/)
        .map((w: string) => w[0]?.toUpperCase() || '')
        .join('')
        .slice(0, 2);
    }

    const res = await db.query(
      `UPDATE prospects SET
        full_name = COALESCE($1, full_name),
        stage = COALESCE($2, stage),
        country_city = COALESCE($3, country_city),
        program_tag = COALESCE($4, program_tag),
        adviser_name = COALESCE($5, adviser_name),
        adviser_initials = COALESCE($6, adviser_initials),
        estimated_value = COALESCE($7, estimated_value),
        is_urgent = COALESCE($8, is_urgent),
        meta_right = COALESCE($9, meta_right),
        meta_left = COALESCE($10, meta_left)
      WHERE id = $11
      RETURNING *`,
      [
        full_name,
        stage,
        country_city,
        program_tag,
        adviser_name,
        adviserInitials,
        estimated_value !== undefined ? Number(estimated_value) : null,
        is_urgent !== undefined ? Boolean(is_urgent) : null,
        meta_right,
        meta_left,
        Number(id),
      ]
    );

    await db.query(
      `INSERT INTO audit_logs (actor, action, entity_ref, outcome)
       VALUES ('Barthelemy MAPWABA NTORO', $1, $2, 'Succès')`,
      [`Mise à jour fiche prospect (${res.rows[0]?.full_name || id})`, `PROSPECT-${id}`]
    );

    return NextResponse.json({ prospect: res.rows[0], ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Prospect ID requis' }, { status: 400 });
    }

    await db.query(`DELETE FROM prospects WHERE id = $1`, [Number(id)]);

    await db.query(
      `INSERT INTO audit_logs (actor, action, entity_ref, outcome)
       VALUES ('Barthelemy MAPWABA NTORO', $1, $2, 'Succès')`,
      [`Suppression prospect (${id})`, `PROSPECT-${id}`]
    );

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
