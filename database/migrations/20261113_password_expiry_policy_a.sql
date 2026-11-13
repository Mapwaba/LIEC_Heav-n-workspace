-- =============================================================================
-- LIEC Heav’n — Workstream 2 Database Migration
-- Policy: Password Expiry — Policy A (90-Day Lifecycle & Notification Milestones)
-- Baseline: v1.2.0-ws1 (Commit 37541b5)
-- Reference: LIEC-W2-PASSWORD-EXPIRY-INITIAL-DISCOVERY-001
-- =============================================================================

-- 1. Persisted Transition Metadata for Legacy Accounts (§1.5)
-- Records one-time 14-calendar-day transition deadline for accounts older than 90 days.
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_expiry_transition_deadline TIMESTAMP WITH TIME ZONE;

-- Seed one-time transition deadline for any pre-existing accounts older than 90 days
-- with no recorded password_updated_at. Ensures deadline is immutable and never restarts.
UPDATE users
SET password_expiry_transition_deadline = CURRENT_TIMESTAMP + INTERVAL '14 days'
WHERE password_updated_at IS NULL
  AND created_at < CURRENT_TIMESTAMP - INTERVAL '90 days'
  AND password_expiry_transition_deadline IS NULL;

-- 2. Milestone Notification Tracking Table (§2 & §3)
-- Tracks milestone dispatches: Day 76 (14d), Day 83 (7d), Day 89 (1d), Day 90 (Expired).
-- Composite UNIQUE constraint guarantees strict mathematical idempotency per password cycle.
CREATE TABLE IF NOT EXISTS password_expiry_notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  milestone VARCHAR(30) NOT NULL, -- 'day_76_warning', 'day_83_warning', 'day_89_warning', 'day_90_expired'
  password_updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  recipient_email VARCHAR(160) NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  provider_message_id VARCHAR(100),
  CONSTRAINT uq_pwd_notif_cycle UNIQUE (user_id, milestone, password_updated_at)
);

CREATE INDEX IF NOT EXISTS idx_pwd_notif_user ON password_expiry_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_pwd_notif_cycle ON password_expiry_notifications(user_id, password_updated_at);
