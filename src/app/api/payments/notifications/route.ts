import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { authenticateServerRequest } from '@/lib/rbac';
import { isMainAdmin } from '@/lib/paymentSubmissions';

/**
 * LIEC Heav'n — Workstream 3 Phase 3F
 * In-Platform Payment Notifications Feed
 *
 * Requirements:
 * 1. New submission for validation (Admin)
 * 2. Payment validated by Admin (Submitter / Staff): Exact text "Payment validated by the Admin"
 * 3. Payment rejected by Admin (Submitter / Staff)
 * 4. Additional evidence requested (Submitter / Staff)
 * 5. Additional evidence submitted (Admin)
 * 6. Idempotent notification IDs to prevent duplicates on retries.
 */

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const auth = await authenticateServerRequest(req, db);
    if (!auth.success) return auth.response;

    const user = auth.user;
    const userEmail = (user.email || '').toLowerCase().trim();
    const isAdmin = isMainAdmin(user);

    // Query recent payment events with submission context
    const eventsRes = await db.query(`
      SELECT 
        e.id as event_id,
        e.submission_id,
        e.event_type,
        e.actor_email,
        e.actor_name,
        e.actor_role,
        e.previous_status,
        e.new_status,
        e.decision_reason,
        e.created_at,
        s.submission_ref,
        s.entity_type,
        s.entity_ref,
        s.applicant_name,
        s.amount,
        s.currency,
        s.instalment_number,
        s.created_by_email,
        s.created_by_name
      FROM payment_submission_events e
      INNER JOIN payment_submissions s ON e.submission_id = s.id
      WHERE s.is_archived = FALSE
      ORDER BY e.id DESC
      LIMIT 100;
    `);

    // Fetch user's read notifications
    const readsRes = await db.query(
      `SELECT notification_id FROM user_notification_reads WHERE LOWER(user_email) = $1`,
      [userEmail]
    );
    const readIds = new Set(readsRes.rows.map((r: any) => r.notification_id));

    const notifications: any[] = [];

    for (const evt of eventsRes.rows) {
      const isSubmitter = (evt.created_by_email || '').toLowerCase() === userEmail;
      const isActor = (evt.actor_email || '').toLowerCase() === userEmail;

      let notifTitle = '';
      let notifDesc = '';
      let shouldDeliver = false;
      let category = 'PAYMENT_EVENT';

      const notifId = `payment-evt-${evt.event_id}`;

      switch (evt.event_type) {
        case 'SUBMITTED':
        case 'NEW_SUBMISSION':
          // Delivered to Admin and reviewers (unless they submitted it themselves)
          if (isAdmin) {
            shouldDeliver = true;
            notifTitle = `New Payment Submission (#${evt.submission_ref})`;
            notifDesc = `${evt.actor_name || evt.created_by_name || 'Staff'} submitted evidence for ${evt.applicant_name} (${evt.amount} ${evt.currency}, Instalment ${evt.instalment_number}) awaiting your validation.`;
            category = 'SUBMISSION_PENDING';
          }
          break;

        case 'VALIDATED':
        case 'DIRECT_VALIDATION':
          // Delivered to Submitter, Staff, and Admin
          // EXACT TEXT REQUIREMENT: "Payment validated by the Admin"
          shouldDeliver = true;
          notifTitle = 'Payment validated by the Admin';
          notifDesc = `Payment of ${evt.amount} ${evt.currency} for ${evt.applicant_name} (Instalment ${evt.instalment_number}, Ref: ${evt.submission_ref}) has been authoritatively validated.`;
          category = 'PAYMENT_VALIDATED';
          break;

        case 'REJECTED':
          // Delivered to Submitter and Staff
          shouldDeliver = isSubmitter || isAdmin;
          notifTitle = 'Payment Rejected by Admin';
          notifDesc = `Payment submission #${evt.submission_ref} for ${evt.applicant_name} was rejected. Reason: ${evt.decision_reason || 'Incomplete evidence or transaction mismatch.'}`;
          category = 'PAYMENT_REJECTED';
          break;

        case 'ADDITIONAL_EVIDENCE_REQUESTED':
        case 'EVIDENCE_REQUESTED':
          // Delivered to Submitter and Staff
          shouldDeliver = isSubmitter || isAdmin;
          notifTitle = 'Additional Payment Evidence Requested';
          notifDesc = `Additional evidence is required for ${evt.applicant_name} (${evt.amount} ${evt.currency}, Instalment ${evt.instalment_number}). Instructions: ${evt.decision_reason || 'Please provide clearer bank receipt / deposit slip.'}`;
          category = 'EVIDENCE_REQUESTED';
          break;

        case 'ADDITIONAL_EVIDENCE_SUBMITTED':
          // Delivered to Admin
          if (isAdmin) {
            shouldDeliver = true;
            notifTitle = `Additional Evidence Submitted (#${evt.submission_ref})`;
            notifDesc = `Additional evidence has been uploaded for ${evt.applicant_name} (${evt.submission_ref}) and is ready for validation.`;
            category = 'EVIDENCE_SUBMITTED';
          }
          break;

        default:
          break;
      }

      if (shouldDeliver) {
        notifications.push({
          id: notifId,
          event_id: evt.event_id,
          submission_id: evt.submission_id,
          submission_ref: evt.submission_ref,
          entity_ref: evt.entity_ref,
          applicant_name: evt.applicant_name,
          title: notifTitle,
          description: notifDesc,
          category,
          timestamp: evt.created_at,
          is_read: readIds.has(notifId),
          tab: 'services',
          recordRef: evt.entity_ref,
        });
      }
    }

    const unreadCount = notifications.filter((n) => !n.is_read).length;

    return NextResponse.json({
      success: true,
      notifications,
      total_count: notifications.length,
      unread_count: unreadCount,
      user_email: userEmail,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch payment notifications' }, { status: 500 });
  }
}
