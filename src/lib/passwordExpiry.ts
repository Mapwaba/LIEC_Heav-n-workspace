/**
 * LIEC Heav’n — Password Expiry Policy A Domain Logic
 * Workstream 2 (W2)
 *
 * Policy Specification:
 * - Validity period: Exactly 90 days from last password change
 * - Expiration: password_updated_at + INTERVAL '90 days' (exact UTC millisecond calculation)
 * - Zero grace period: Access blocked immediately upon reaching expiry
 * - Fallback for NULL password_updated_at: created_at, with one-time 14-day transition if >90 days old
 * - Milestone Notifications: Day 76 (14d), Day 83 (7d), Day 89 (1d), Day 90+ (Expired)
 */

export const PASSWORD_VALIDITY_DAYS = 90;
export const PASSWORD_VALIDITY_MS = PASSWORD_VALIDITY_DAYS * 24 * 60 * 60 * 1000;
export const TRANSITION_PERIOD_DAYS = 14;
export const TRANSITION_PERIOD_MS = TRANSITION_PERIOD_DAYS * 24 * 60 * 60 * 1000;

export type PasswordExpiryMilestone =
  | 'day_76_warning'
  | 'day_83_warning'
  | 'day_89_warning'
  | 'day_90_expired';

export interface PasswordExpiryInfo {
  isExpired: boolean;
  expiresAt: Date;
  referenceDate: Date;
  msRemaining: number;
  daysRemaining: number;
  currentMilestone: PasswordExpiryMilestone | null;
  status: 'valid' | 'expiring_soon' | 'expired';
  isTransitionPeriod: boolean;
}

export interface UserPasswordRecord {
  password_updated_at?: string | Date | null;
  created_at?: string | Date | null;
  password_expiry_transition_deadline?: string | Date | null;
}

/**
 * Resolves the immutable notification cycle reference timestamp for a user.
 * Requirement SEC-W2-002:
 * COALESCE(users.password_updated_at, users.password_expiry_transition_deadline, users.created_at)
 * Strictly guarantees that NULL is never used in the unique constraint.
 */
export function getNotificationCycleReference(user: UserPasswordRecord): Date {
  if (user.password_updated_at) {
    return new Date(user.password_updated_at);
  }
  if (user.password_expiry_transition_deadline) {
    return new Date(user.password_expiry_transition_deadline);
  }
  if (user.created_at) {
    return new Date(user.created_at);
  }
  return new Date('1970-01-01T00:00:00.000Z');
}

/**
 * Calculates exact password expiration status and days remaining.
 * Strictly adheres to UTC timestamp calculation (no midnight rounding).
 */
export function calculatePasswordExpiry(
  user: UserPasswordRecord,
  currentDate: Date = new Date()
): PasswordExpiryInfo {
  const now = currentDate.getTime();
  let referenceDate: Date;
  let expiresAt: Date;
  let isTransitionPeriod = false;

  if (user.password_updated_at) {
    // 1. Authoritative: Use recorded password_updated_at
    referenceDate = new Date(user.password_updated_at);
    expiresAt = new Date(referenceDate.getTime() + PASSWORD_VALIDITY_MS);
  } else {
    // 2. Fallback: Use created_at
    referenceDate = user.created_at ? new Date(user.created_at) : new Date(currentDate);

    if (user.password_expiry_transition_deadline) {
      // Use existing persisted one-time transition deadline
      expiresAt = new Date(user.password_expiry_transition_deadline);
      isTransitionPeriod = true;
    } else {
      const standardExpiry = new Date(referenceDate.getTime() + PASSWORD_VALIDITY_MS);
      if (standardExpiry.getTime() <= now) {
        // Account is older than 90 days: grant one-time 14-day transition period
        expiresAt = new Date(now + TRANSITION_PERIOD_MS);
        isTransitionPeriod = true;
      } else {
        expiresAt = standardExpiry;
      }
    }
  }

  const msRemaining = expiresAt.getTime() - now;
  const isExpired = msRemaining <= 0;
  // Calculate full calendar days remaining (ceiling so partial days show full countdown)
  const daysRemaining = isExpired ? 0 : Math.ceil(msRemaining / (24 * 60 * 60 * 1000));

  let currentMilestone: PasswordExpiryMilestone | null = null;
  if (isExpired) {
    currentMilestone = 'day_90_expired';
  } else if (daysRemaining <= 1) {
    currentMilestone = 'day_89_warning';
  } else if (daysRemaining <= 7) {
    currentMilestone = 'day_83_warning';
  } else if (daysRemaining <= 14) {
    currentMilestone = 'day_76_warning';
  }

  const status: 'valid' | 'expiring_soon' | 'expired' = isExpired
    ? 'expired'
    : daysRemaining <= 14
    ? 'expiring_soon'
    : 'valid';

  return {
    isExpired,
    expiresAt,
    referenceDate,
    msRemaining,
    daysRemaining,
    currentMilestone,
    status,
    isTransitionPeriod,
  };
}

/**
 * Returns human-readable notification subject and message for milestones
 */
export function getMilestoneEmailContent(
  milestone: PasswordExpiryMilestone,
  daysRemaining: number,
  expiresAt: Date
): { subject: string; heading: string; alertType: 'warning' | 'urgent' | 'critical' } {
  const formattedDate = expiresAt.toISOString().replace('T', ' ').substring(0, 16) + ' UTC';

  switch (milestone) {
    case 'day_76_warning':
      return {
        subject: `[LIEC Heav’n] Password Expiry Notice: 14 days remaining`,
        heading: `Your workspace password will expire in 14 days (on ${formattedDate}).`,
        alertType: 'warning',
      };
    case 'day_83_warning':
      return {
        subject: `[LIEC Heav’n] Urgent: Password expires in 7 days`,
        heading: `Your workspace password will expire in 7 days (on ${formattedDate}). Please renew it soon to prevent access disruption.`,
        alertType: 'urgent',
      };
    case 'day_89_warning':
      return {
        subject: `[LIEC Heav’n] Final Notice: Password expires tomorrow`,
        heading: `Your workspace password expires tomorrow (on ${formattedDate}). Immediate action required.`,
        alertType: 'critical',
      };
    case 'day_90_expired':
    default:
      return {
        subject: `[LIEC Heav’n] Account Alert: Password has expired`,
        heading: `Your workspace password expired on ${formattedDate}. You must renew your password to access the LIEC Heav’n workspace.`,
        alertType: 'critical',
      };
  }
}
