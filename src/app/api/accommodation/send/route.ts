import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { authenticateServerRequest, canSendAccommodationRequest } from '@/lib/rbac';
import {
  sendAccommodationPartnerEmail,
  validateAccommodationMandatoryFields,
  getAccommodationPartnerEmail,
  AccommodationEmailPayload,
} from '@/lib/emailService';

export async function POST(req: NextRequest) {
  try {
    const db = await getDb();
    const auth = await authenticateServerRequest(req, db);
    if (!auth.success) return auth.response;

    const { user } = auth;

    // Strict Role Enforcement: Only Admin and Secretary are permitted
    if (!canSendAccommodationRequest(user)) {
      // Security violation audit log
      try {
        await db.query(
          `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
           VALUES ($1, '[SECURITY_VIOLATION] Unauthorized attempt to invoke Send Request', 'ACCOMMODATION_SEND', 'DENIED_403', $2)`,
          [
            `${user.name} (${user.business_profile})`,
            'AVI Officer or unauthorized role attempted to trigger partner email dispatch.',
          ]
        );
      } catch {}

      return NextResponse.json(
        {
          error:
            'Forbidden (403): You do not have permission to send accommodation requests. Only Admin and Secretary can dispatch partner emails.',
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const ref = (body.ref || '').trim();
    const confirmedResend = Boolean(body.confirmed_resend);

    if (!ref) {
      return NextResponse.json(
        { error: 'Accommodation request reference (ref) is required.' },
        { status: 400 }
      );
    }

    // 1. Validate that the accommodation request exists
    const cleanRef = ref.startsWith('#') ? ref : `#${ref}`;
    const accRes = await db.query(
      'SELECT * FROM accommodation_requests WHERE ref = $1 OR ref = $2 OR LOWER(ref) = LOWER($1)',
      [ref, cleanRef]
    );
    if (!accRes.rows || accRes.rows.length === 0) {
      return NextResponse.json(
        { error: `Accommodation request ${ref} does not exist.` },
        { status: 404 }
      );
    }
    const accRecord = accRes.rows[0];

    // Check for previous sent state and require explicit resend confirmation
    if (accRecord.status === 'Sent' && !confirmedResend) {
      return NextResponse.json(
        {
          error: 'Duplicate send protection: This request has already been successfully sent to the partner.',
          requiresConfirmation: true,
          message:
            'This accommodation request was already dispatched on ' +
            (accRecord.email_sent_at || 'a previous date') +
            '. Please explicitly confirm if you wish to resend.',
        },
        { status: 409 }
      );
    }

    // 2. Validate that it is linked to the correct Student Record
    const studentRef = accRecord.student_ref;
    const cleanStudentRef = studentRef && studentRef.startsWith('#') ? studentRef : `#${studentRef}`;
    const studentRes = await db.query(
      'SELECT * FROM candidats WHERE ref = $1 OR ref = $2 OR LOWER(ref) = LOWER($1)',
      [studentRef, cleanStudentRef]
    );
    if (!studentRes.rows || studentRes.rows.length === 0) {
      return NextResponse.json(
        {
          error: `Integrity error: Linked student record (${studentRef}) could not be found in the database.`,
        },
        { status: 400 }
      );
    }
    const student = studentRes.rows[0];

    // 3. Assemble and validate all mandatory fields
    const emailPayload: AccommodationEmailPayload = {
      requestRef: accRecord.ref,
      studentRef: student.ref,
      studentFullName: accRecord.student_name || student.full_name,
      studentEmail: accRecord.student_email || student.email,
      studentPhone: accRecord.student_phone || student.phone,
      studentNationality: accRecord.student_nationality || student.nationality || 'Congolese (DRC)',
      arrivalDate: accRecord.arrival_date,
      preferredLocation: accRecord.preferred_location,
      accommodationType: accRecord.accommodation_type,
      budget: accRecord.budget,
      specialRequirements: accRecord.special_requirements,
      partnerEmail: getAccommodationPartnerEmail(),
    };

    const validation = validateAccommodationMandatoryFields(emailPayload);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'Cannot submit request: Missing mandatory information required by the accommodation partner.',
          missingFields: validation.missingFields,
        },
        { status: 422 }
      );
    }

    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const history = JSON.parse(accRecord.history_json || '[]');

    // Mark as Sending temporarily
    try {
      // 4. Send email via secure server-side service
      const sendResult = await sendAccommodationPartnerEmail(emailPayload);

      // 5. Update submission status only after confirmation of successful outbound submission
      history.unshift({
        timestamp,
        author: `${user.name} (${user.business_profile})`,
        action: 'EMAIL_SENT',
        details: `Dispatched official partner email to ${sendResult.recipient} (Message ID: ${sendResult.messageId}).`,
        status: 'Sent',
      });

      await db.query(
        `UPDATE accommodation_requests SET
          status = 'Sent',
          email_sent_at = CURRENT_TIMESTAMP,
          email_sent_by = $1,
          email_recipient = $2,
          email_status = 'Sent',
          email_error = NULL,
          history_json = $3,
          updated_at = CURRENT_TIMESTAMP
         WHERE ref = $4`,
        [
          `${user.name} (${user.business_profile})`,
          sendResult.recipient,
          JSON.stringify(history),
          ref,
        ]
      );

      // Record in student activity history
      try {
        const studentHistory = JSON.parse(student.history_json || '[]');
        studentHistory.unshift({
          timestamp,
          author: `${user.name} (${user.business_profile})`,
          activity_type: 'ACCOMMODATION_SUBMITTED',
          details: `Accommodation request ${ref} successfully submitted by email to partner (${sendResult.recipient}).`,
        });
        await db.query('UPDATE candidats SET history_json = $1 WHERE ref = $2', [
          JSON.stringify(studentHistory),
          studentRef,
        ]);
      } catch (e) {
        console.warn('Could not update student history:', e);
      }

      // Record in global audit_logs
      await db.query(
        `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
         VALUES ($1, 'Send Accommodation Partner Email', $2, 'Success', $3)`,
        [
          `${user.name} (${user.business_profile})`,
          ref,
          `Successfully sent accommodation request to ${sendResult.recipient} for student ${student.full_name} (${student.ref}). Message ID: ${sendResult.messageId}`,
        ]
      );

      return NextResponse.json({
        success: true,
        status: 'Sent',
        recipient: sendResult.recipient,
        sentAt: sendResult.sentAt,
        messageId: sendResult.messageId,
        message: `Accommodation request ${ref} successfully sent to ${sendResult.recipient}.`,
      });
    } catch (sendError: any) {
      console.error('Email sending failed:', sendError);

      // Record failure without falsely marking as sent
      history.unshift({
        timestamp,
        author: `${user.name} (${user.business_profile})`,
        action: 'EMAIL_FAILED',
        details: `Failed to deliver email to partner: ${sendError?.message || sendError}. Remains retryable.`,
        status: 'Failed',
      });

      await db.query(
        `UPDATE accommodation_requests SET
          status = 'Failed',
          email_status = 'Failed',
          email_error = $1,
          history_json = $2,
          updated_at = CURRENT_TIMESTAMP
         WHERE ref = $3`,
        [sendError?.message || 'Unknown email transmission error', JSON.stringify(history), ref]
      );

      await db.query(
        `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
         VALUES ($1, 'Send Accommodation Partner Email', $2, 'Failed', $3)`,
        [
          `${user.name} (${user.business_profile})`,
          ref,
          `Failed to dispatch partner email: ${sendError?.message || sendError}`,
        ]
      );

      return NextResponse.json(
        {
          error: `Email transmission failed: ${sendError?.message || 'Could not send outbound email'}. The request status is set to Failed and can be safely retried.`,
          status: 'Failed',
          retryable: true,
        },
        { status: 502 }
      );
    }
  } catch (error: any) {
    console.error('Unhandled error in accommodation send route:', error);
    return NextResponse.json(
      { error: 'Internal server error processing send request', details: error?.message },
      { status: 500 }
    );
  }
}
