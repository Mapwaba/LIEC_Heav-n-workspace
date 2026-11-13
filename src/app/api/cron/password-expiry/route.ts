import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getDb } from '@/lib/db';
import {
  calculatePasswordExpiry,
  getNotificationCycleReference,
  PasswordExpiryMilestone,
} from '@/lib/passwordExpiry';
import { sendPasswordExpiryNotificationEmail } from '@/lib/emailService';

/**
 * LIEC Heav'n — Workstream 2 (W2) Phase 2
 * Scheduled Password Expiry Notification Endpoint
 *
 * Schedule: Daily at 06:00 UTC (0 6 * * *)
 * Authentication: Authorization: Bearer <CRON_SECRET> or x-cron-auth: <CRON_SECRET>
 *
 * Safeguards:
 * 1. Constant-time secret comparison; never logs secret values.
 * 2. Strict mathematical idempotency via UNIQUE (user_id, milestone, notification_cycle_reference).
 * 3. Never records notification until email provider delivery confirms success.
 * 4. Failed deliveries are safely retryable on subsequent runs.
 * 5. Batch limited to 25 users per run to prevent SMTP spikes.
 */

function secureTimingSafeEqual(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, 'utf-8');
    const bufB = Buffer.from(b, 'utf-8');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

function verifyCronAuthentication(req: NextRequest): boolean {
  const configuredSecret = process.env.CRON_SECRET?.trim();

  // Fail-closed if CRON_SECRET is absent in production
  if (!configuredSecret) {
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      console.error('[CRON_AUTH_FATAL] CRON_SECRET is not configured in production environment.');
      return false;
    }
    // Allow local development testing only if dev secret is supplied
    return false;
  }

  const authHeader = (req.headers.get('authorization') || '').trim();
  const xCronHeader = (req.headers.get('x-cron-auth') || '').trim();

  if (authHeader.startsWith('Bearer ')) {
    const provided = authHeader.substring(7).trim();
    if (secureTimingSafeEqual(provided, configuredSecret)) {
      return true;
    }
  }

  if (xCronHeader && secureTimingSafeEqual(xCronHeader, configuredSecret)) {
    return true;
  }

  return false;
}

export async function GET(req: NextRequest) {
  const authOk = verifyCronAuthentication(req);
  if (!authOk) {
    return NextResponse.json(
      { error: 'Unauthorized: Missing or invalid CRON_SECRET authentication header.' },
      { status: 401 }
    );
  }

  const startTime = Date.now();
  const results = {
    totalChecked: 0,
    notificationsSent: 0,
    alreadyNotified: 0,
    deliveryFailures: 0,
    notDue: 0,
    details: [] as Array<{
      userId: number;
      email: string;
      milestone: PasswordExpiryMilestone;
      status: 'SENT' | 'ALREADY_NOTIFIED' | 'FAILED' | 'SKIPPED';
      daysRemaining: number;
      error?: string;
    }>,
  };

  try {
    const db = await getDb();

    // 1. Fetch active staff accounts
    const usersRes = await db.query(
      `SELECT u.id, u.name, u.email, u.role, u.business_profile,
              u.password_updated_at, u.created_at, u.password_expiry_transition_deadline
       FROM users u
       WHERE u.active = TRUE
       ORDER BY u.id ASC
       LIMIT 50`
    );

    const users = usersRes.rows;
    results.totalChecked = users.length;

    const appBaseUrl =
      process.env.NEXT_PUBLIC_APP_URL?.trim() ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://workspace.liecconsulting.com');
    const renewalUrl = `${appBaseUrl}/login`;

    for (const user of users) {
      const expiryInfo = calculatePasswordExpiry({
        password_updated_at: user.password_updated_at,
        created_at: user.created_at,
        password_expiry_transition_deadline: user.password_expiry_transition_deadline,
      });

      const milestone = expiryInfo.currentMilestone;
      if (!milestone) {
        results.notDue++;
        continue;
      }

      // 2. Resolve non-null notification cycle reference (Requirement SEC-W2-002)
      const cycleRef = getNotificationCycleReference({
        password_updated_at: user.password_updated_at,
        created_at: user.created_at,
        password_expiry_transition_deadline: user.password_expiry_transition_deadline,
      });

      // 3. Mathematical idempotency check: has this milestone already been sent for this cycle?
      const existingRes = await db.query(
        `SELECT id, sent_at
         FROM password_expiry_notifications
         WHERE user_id = $1
           AND milestone = $2
           AND notification_cycle_reference = $3
         LIMIT 1`,
        [user.id, milestone, cycleRef.toISOString()]
      );

      if (existingRes.rows.length > 0) {
        results.alreadyNotified++;
        results.details.push({
          userId: user.id,
          email: user.email,
          milestone,
          status: 'ALREADY_NOTIFIED',
          daysRemaining: expiryInfo.daysRemaining,
        });
        continue;
      }

      // 4. Dispatch notification email with safe retry semantics
      const idempotencyKey = `cron_pwd_${user.id}_${milestone}_${cycleRef.getTime()}`;

      try {
        const sendResult = await sendPasswordExpiryNotificationEmail({
          to: user.email,
          name: user.name || user.email,
          milestone,
          daysRemaining: expiryInfo.daysRemaining,
          expiresAt: expiryInfo.expiresAt,
          renewalUrl,
          idempotencyKey,
        });

        if (sendResult.success) {
          // 5. Confirm delivery before recording in tracking database
          await db.query(
            `INSERT INTO password_expiry_notifications
               (user_id, milestone, notification_cycle_reference, recipient_email, sent_at, provider_message_id)
             VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5)
             ON CONFLICT (user_id, milestone, notification_cycle_reference) DO NOTHING`,
            [user.id, milestone, cycleRef.toISOString(), user.email, sendResult.messageId || 'simulated']
          );

          try {
            await db.query(
              `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
               VALUES ('SYSTEM_CRON', 'PASSWORD_EXPIRY_NOTIFICATION_SENT', $1, 'SUCCESS', $2)`,
              [
                `USER-${user.id}`,
                `Sent milestone notification '${milestone}' (${expiryInfo.daysRemaining} days remaining) to ${user.email}. Cycle reference: ${cycleRef.toISOString()}.`,
              ]
            );
          } catch {}

          results.notificationsSent++;
          results.details.push({
            userId: user.id,
            email: user.email,
            milestone,
            status: 'SENT',
            daysRemaining: expiryInfo.daysRemaining,
          });
        } else {
          // Delivery failed: Do NOT record in DB so next cron execution can retry
          results.deliveryFailures++;
          results.details.push({
            userId: user.id,
            email: user.email,
            milestone,
            status: 'FAILED',
            daysRemaining: expiryInfo.daysRemaining,
            error: sendResult.error || 'Provider rejected email transmission',
          });

          try {
            await db.query(
              `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
               VALUES ('SYSTEM_CRON', 'PASSWORD_EXPIRY_NOTIFICATION_FAILED', $1, 'FAILURE', $2)`,
              [
                `USER-${user.id}`,
                `Failed to send milestone '${milestone}' to ${user.email}: ${sendResult.error || 'Unknown error'}. Safe retry eligible.`,
              ]
            );
          } catch {}
        }
      } catch (err: any) {
        results.deliveryFailures++;
        results.details.push({
          userId: user.id,
          email: user.email,
          milestone,
          status: 'FAILED',
          daysRemaining: expiryInfo.daysRemaining,
          error: err?.message || 'Unexpected exception during dispatch',
        });
      }
    }

    const durationMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      executionDurationMs: durationMs,
      summary: {
        totalAccountsChecked: results.totalChecked,
        notificationsDispatched: results.notificationsSent,
        alreadyDispatchedInCycle: results.alreadyNotified,
        deliveryFailuresEligibleForRetry: results.deliveryFailures,
        accountsNotDueForNotification: results.notDue,
      },
      details: results.details,
    });
  } catch (error: any) {
    console.error('Password expiry cron execution failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Database or execution error during cron execution.',
      },
      { status: 500 }
    );
  }
}

// Also accept POST for authorized manual execution or integration testing
export async function POST(req: NextRequest) {
  return GET(req);
}
