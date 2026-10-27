import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import {
  authenticateServerRequest,
  evaluateModuleAccess,
  canSendAccommodationRequest,
} from '@/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const auth = await authenticateServerRequest(req, db);
    if (!auth.success) return auth.response;

    const { user } = auth;
    const access = evaluateModuleAccess(user, 'accommodation');
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.reason || 'Forbidden: Access denied to accommodation module.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const studentRef = searchParams.get('student_ref');

    let query = 'SELECT * FROM accommodation_requests';
    const params: any[] = [];
    if (studentRef) {
      query += ' WHERE student_ref = $1';
      params.push(studentRef);
    }
    query += ' ORDER BY id DESC';

    const res = await db.query(query, params);
    const parsed = res.rows.map((row: any) => ({
      ...row,
      history: JSON.parse(row.history_json || '[]'),
    }));

    return NextResponse.json({
      accommodationRequests: parsed,
    });
  } catch (error: any) {
    console.error('Error fetching accommodation requests:', error);
    return NextResponse.json(
      { error: 'Internal server error fetching accommodation requests', details: error?.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = await getDb();
    const auth = await authenticateServerRequest(req, db);
    if (!auth.success) return auth.response;

    const { user } = auth;
    if (!canSendAccommodationRequest(user)) {
      return NextResponse.json(
        { error: 'Forbidden: Only Admin and Secretary can create accommodation requests.' },
        { status: 403 }
      );
    }

    const body = await req.json();

    const studentRef = (body.student_ref || '').trim();
    if (!studentRef) {
      return NextResponse.json(
        { error: 'Student reference (student_ref) is required.' },
        { status: 400 }
      );
    }

    // Retrieve linked student record
    const candRes = await db.query('SELECT * FROM candidats WHERE ref = $1', [studentRef]);
    const student = candRes.rows[0];

    const studentName = (body.student_name || student?.full_name || '').trim();
    const studentEmail = (body.student_email || student?.email || '').trim();
    const studentPhone = (body.student_phone || student?.phone || '').trim();
    const studentNationality = (body.student_nationality || student?.nationality || 'Congolaise (RDC)').trim();
    const studentLocation = (body.student_location || student?.country || 'RDC (Kinshasa)').trim();

    const parentName = (body.parent_name || student?.parent_full_name || '').trim();
    const parentPhone = (body.parent_phone || student?.parent_phone || '').trim();
    const parentEmail = (body.parent_email || student?.parent_email || '').trim();
    const parentRelation = (body.parent_relation || student?.parent_relation || 'Parent / Tuteur').trim();

    const admissionStatus = (body.admission_status || student?.admission_status || 'Admitted — Partner School Lyon').trim();
    const procedureStatus = (body.procedure_status || student?.stage_badge || 'Milestone 2 — Academic Records').trim();

    const preferredLocation = (body.preferred_location || 'Lyon 7e (Jean Macé)').trim();
    const accommodationType = (body.accommodation_type || 'Studio Meublé').trim();
    const arrivalDate = (body.arrival_date || '').trim();
    const departureDate = (body.departure_date || '').trim();
    const budget = (body.budget || '550 € / month').trim();
    const specialRequirements = (body.special_requirements || '').trim();
    const supportingDocs = (body.supporting_docs || '').trim();
    const assignedAgent = (body.assigned_agent || user.name).trim();
    const notes = (body.notes || '').trim();

    if (!arrivalDate) {
      return NextResponse.json(
        { error: 'Intended arrival date is required.' },
        { status: 400 }
      );
    }

    // Generate unique reference #ACC-YYYY-XXX
    const year = new Date().getFullYear();
    const countRes = await db.query<{ count: string | number }>(
      'SELECT COUNT(*) as count FROM accommodation_requests'
    );
    let nextNum = 1 + Number(countRes.rows[0]?.count ?? 0);
    let ref = `#ACC-${year}-${String(nextNum).padStart(3, '0')}`;
    while (true) {
      const existing = await db.query('SELECT 1 FROM accommodation_requests WHERE ref = $1', [ref]);
      if (!existing.rows || existing.rows.length === 0) break;
      nextNum++;
      ref = `#ACC-${year}-${String(nextNum).padStart(3, '0')}`;
    }

    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const initialHistory = [
      {
        timestamp,
        author: `${user.name} (${user.business_profile})`,
        action: 'CREATED',
        details: `Accommodation request created for ${studentName} (${studentRef}).`,
        status: 'Draft',
      },
    ];

    await db.query(
      `INSERT INTO accommodation_requests (
        ref, student_ref, student_name, student_email, student_phone, student_nationality, student_location,
        parent_name, parent_phone, parent_email, parent_relation, admission_status, procedure_status,
        preferred_location, accommodation_type, arrival_date, departure_date, budget, special_requirements,
        supporting_docs, status, assigned_agent, notes, history_json
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)`,
      [
        ref,
        studentRef,
        studentName,
        studentEmail,
        studentPhone,
        studentNationality,
        studentLocation,
        parentName,
        parentPhone,
        parentEmail,
        parentRelation,
        admissionStatus,
        procedureStatus,
        preferredLocation,
        accommodationType,
        arrivalDate,
        departureDate,
        budget,
        specialRequirements,
        supportingDocs,
        'Draft',
        assignedAgent,
        notes,
        JSON.stringify(initialHistory),
      ]
    );

    // Also append activity to Student Record history
    if (student) {
      try {
        const studentHistory = JSON.parse(student.history_json || '[]');
        studentHistory.unshift({
          timestamp,
          author: `${user.name} (${user.business_profile})`,
          activity_type: 'REQUEST_CREATED',
          details: `Accommodation reservation request ${ref} created (${accommodationType}, ${preferredLocation}).`,
        });
        await db.query('UPDATE candidats SET history_json = $1 WHERE ref = $2', [
          JSON.stringify(studentHistory),
          studentRef,
        ]);
      } catch (e) {
        console.warn('Could not update student history:', e);
      }
    }

    // Log to audit_logs
    await db.query(
      `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
       VALUES ($1, $2, $3, 'Success', $4)`,
      [
        `${user.name} (${user.business_profile})`,
        'Create Accommodation Request',
        ref,
        `Created accommodation request linked to student ${studentRef} (${studentName}).`,
      ]
    );

    const createdRes = await db.query('SELECT * FROM accommodation_requests WHERE ref = $1', [ref]);
    return NextResponse.json({
      success: true,
      accommodationRequest: {
        ...createdRes.rows[0],
        history: initialHistory,
      },
    });
  } catch (error: any) {
    console.error('Error creating accommodation request:', error);
    return NextResponse.json(
      { error: 'Failed to create accommodation request', details: error?.message },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const db = await getDb();
    const auth = await authenticateServerRequest(req, db);
    if (!auth.success) return auth.response;

    const { user } = auth;
    if (!canSendAccommodationRequest(user)) {
      return NextResponse.json(
        { error: 'Forbidden: Only Admin and Secretary can update accommodation requests.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const ref = (body.ref || '').trim();
    if (!ref) {
      return NextResponse.json({ error: 'Request reference (ref) is required.' }, { status: 400 });
    }

    const cleanRef = ref.startsWith('#') ? ref : `#${ref}`;
    const existingRes = await db.query(
      'SELECT * FROM accommodation_requests WHERE ref = $1 OR ref = $2 OR LOWER(ref) = LOWER($1)',
      [ref, cleanRef]
    );
    if (!existingRes.rows || existingRes.rows.length === 0) {
      return NextResponse.json({ error: `Request ${ref} not found.` }, { status: 404 });
    }
    const existing = existingRes.rows[0];

    const preferredLocation = body.preferred_location !== undefined ? body.preferred_location : existing.preferred_location;
    const accommodationType = body.accommodation_type !== undefined ? body.accommodation_type : existing.accommodation_type;
    const arrivalDate = body.arrival_date !== undefined ? body.arrival_date : existing.arrival_date;
    const departureDate = body.departure_date !== undefined ? body.departure_date : existing.departure_date;
    const budget = body.budget !== undefined ? body.budget : existing.budget;
    const specialRequirements = body.special_requirements !== undefined ? body.special_requirements : existing.special_requirements;
    const supportingDocs = body.supporting_docs !== undefined ? body.supporting_docs : existing.supporting_docs;
    const status = body.status !== undefined ? body.status : existing.status;
    const assignedAgent = body.assigned_agent !== undefined ? body.assigned_agent : existing.assigned_agent;
    const notes = body.notes !== undefined ? body.notes : existing.notes;

    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const history = JSON.parse(existing.history_json || '[]');
    const changeDetails: string[] = [];

    if (body.status && body.status !== existing.status) {
      changeDetails.push(`Status changed from '${existing.status}' to '${body.status}'`);
    }
    if (body.notes && body.notes !== existing.notes) {
      changeDetails.push(`Comment added/updated`);
    }
    if (body.preferred_location && body.preferred_location !== existing.preferred_location) {
      changeDetails.push(`Location updated to ${body.preferred_location}`);
    }

    history.unshift({
      timestamp,
      author: `${user.name} (${user.business_profile})`,
      action: 'UPDATED',
      details: changeDetails.join(', ') || 'Accommodation details modified.',
      status,
    });

    await db.query(
      `UPDATE accommodation_requests SET
        preferred_location = $1,
        accommodation_type = $2,
        arrival_date = $3,
        departure_date = $4,
        budget = $5,
        special_requirements = $6,
        supporting_docs = $7,
        status = $8,
        assigned_agent = $9,
        notes = $10,
        history_json = $11,
        updated_at = CURRENT_TIMESTAMP
       WHERE ref = $12`,
      [
        preferredLocation,
        accommodationType,
        arrivalDate,
        departureDate,
        budget,
        specialRequirements,
        supportingDocs,
        status,
        assignedAgent,
        notes,
        JSON.stringify(history),
        ref,
      ]
    );

    // Log to audit
    await db.query(
      `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
       VALUES ($1, $2, $3, 'Success', $4)`,
      [
        `${user.name} (${user.business_profile})`,
        'Update Accommodation Request',
        ref,
        changeDetails.join(', ') || 'Record updated.',
      ]
    );

    const updatedRes = await db.query('SELECT * FROM accommodation_requests WHERE ref = $1', [ref]);
    return NextResponse.json({
      success: true,
      accommodationRequest: {
        ...updatedRes.rows[0],
        history,
      },
    });
  } catch (error: any) {
    console.error('Error updating accommodation request:', error);
    return NextResponse.json(
      { error: 'Failed to update accommodation request', details: error?.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const db = await getDb();
    const auth = await authenticateServerRequest(req, db);
    if (!auth.success) return auth.response;

    const { user } = auth;
    const profile = user.business_profile;
    const userRole = (user as any).role;
    const roles = user.technical_roles || [];
    const isAdmin =
      profile === 'Admin' ||
      userRole === 'admin' ||
      roles.includes('admin') ||
      roles.includes('lh_security_admin');

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Only Administrators can delete accommodation requests.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const ref = searchParams.get('ref');
    if (!ref) {
      return NextResponse.json({ error: 'Request reference is required.' }, { status: 400 });
    }

    const cleanRef = ref.startsWith('#') ? ref : `#${ref}`;
    const check = await db.query(
      'SELECT * FROM accommodation_requests WHERE ref = $1 OR ref = $2 OR LOWER(ref) = LOWER($1)',
      [ref, cleanRef]
    );
    if (!check.rows || check.rows.length === 0) {
      return NextResponse.json({ error: `Request ${ref} not found.` }, { status: 404 });
    }

    await db.query('DELETE FROM accommodation_requests WHERE ref = $1', [ref]);
    await db.query(
      `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
       VALUES ($1, $2, $3, 'Success', $4)`,
      [
        `${user.name} (${user.business_profile})`,
        'Delete Accommodation Request',
        ref,
        `Accommodation request ${ref} deleted by Admin.`,
      ]
    );

    return NextResponse.json({ success: true, message: `Request ${ref} deleted.` });
  } catch (error: any) {
    console.error('Error deleting accommodation request:', error);
    return NextResponse.json(
      { error: 'Failed to delete accommodation request', details: error?.message },
      { status: 500 }
    );
  }
}
