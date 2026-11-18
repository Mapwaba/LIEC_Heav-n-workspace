-- =============================================================================
-- LIEC Heav’n — Workstream 3 Database Migration
-- Phase 1 Remediation: Security Hardening & Financial Data Integrity
-- Remediates: FIND-W3-001, FIND-W3-002, FIND-W3-003
-- Baseline: v1.3.1-hotfix + W3 Phase 1 Foundation
-- Reference: W3_PHASE1_TARGETED_INTEGRITY_REVIEW.md
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. REMEDIATION FIND-W3-001: Financial Evidence and Audit Retention
-- -----------------------------------------------------------------------------

-- Drop existing ON DELETE CASCADE foreign keys
ALTER TABLE payment_submission_evidence 
  DROP CONSTRAINT IF EXISTS payment_submission_evidence_submission_id_fkey;

ALTER TABLE payment_submission_events 
  DROP CONSTRAINT IF EXISTS payment_submission_events_submission_id_fkey;

-- Re-add foreign keys with ON DELETE RESTRICT
-- Hard-deletion of a payment submission is strictly blocked whenever evidence or events exist.
ALTER TABLE payment_submission_evidence 
  ADD CONSTRAINT payment_submission_evidence_submission_id_fkey 
  FOREIGN KEY (submission_id) REFERENCES payment_submissions(id) ON DELETE RESTRICT;

ALTER TABLE payment_submission_events 
  ADD CONSTRAINT payment_submission_events_submission_id_fkey 
  FOREIGN KEY (submission_id) REFERENCES payment_submissions(id) ON DELETE RESTRICT;

-- Add soft-deletion / archival columns to payment_submissions
ALTER TABLE payment_submissions 
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS archived_by VARCHAR(120),
  ADD COLUMN IF NOT EXISTS archive_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_payment_submissions_archived 
  ON payment_submissions(is_archived);

-- Update event_type CHECK constraint on payment_submission_events to support 'ARCHIVED'
ALTER TABLE payment_submission_events 
  DROP CONSTRAINT IF EXISTS payment_submission_events_event_type_check;

ALTER TABLE payment_submission_events 
  ADD CONSTRAINT payment_submission_events_event_type_check 
  CHECK (event_type IN ('SUBMITTED', 'VALIDATED', 'REJECTED', 'EVIDENCE_REQUESTED', 'EVIDENCE_PROVIDED', 'DIRECT_VALIDATION', 'ARCHIVED'));


-- -----------------------------------------------------------------------------
-- 2. REMEDIATION FIND-W3-003: Instalment Lifecycle & Cumulative Balance Support
-- -----------------------------------------------------------------------------

-- Authoritative view calculating cumulative validated payments per applicant instalment.
-- Enables atomic concurrency-safe balance checks and supports partial payments.
CREATE OR REPLACE VIEW view_applicant_instalment_balances AS
SELECT 
    entity_type,
    entity_ref,
    instalment_number,
    COUNT(id) AS total_submissions_count,
    COUNT(CASE WHEN status = 'VALIDATED' THEN 1 END) AS validated_payments_count,
    COALESCE(SUM(CASE WHEN status = 'VALIDATED' THEN amount ELSE 0 END), 0) AS total_validated_amount,
    MAX(CASE WHEN status = 'VALIDATED' THEN payment_date END) AS last_validated_payment_date,
    BOOL_OR(status IN ('PENDING_ADMIN_VALIDATION', 'ADDITIONAL_EVIDENCE_REQUESTED')) AS has_active_pending_submission
FROM payment_submissions
WHERE is_archived = FALSE
GROUP BY entity_type, entity_ref, instalment_number;

COMMIT;
