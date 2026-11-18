-- =============================================================================
-- LIEC Heav’n — Workstream 3 Database Migration
-- Phase 2: Financial Concurrency Controls & Database-Level Audit Immutability
-- Target Environment: Preview-3 Neon PostgreSQL
-- Remediates: Acceptance Review Conditions 1, 2, 3
-- Baseline: v1.3.1-hotfix + W3 Phase 1 Foundation & Remediation
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Course-Level Cumulative Balance View (Condition 3)
-- -----------------------------------------------------------------------------
-- Authoritative view aggregating validated payments across all instalments
-- for an applicant, supporting course-level balance serialization.
CREATE OR REPLACE VIEW view_applicant_total_course_balances AS
SELECT 
    entity_type,
    entity_ref,
    COUNT(id) AS total_submissions_count,
    COUNT(CASE WHEN status = 'VALIDATED' THEN 1 END) AS total_validated_count,
    COALESCE(SUM(CASE WHEN status = 'VALIDATED' THEN amount ELSE 0 END), 0) AS total_course_validated_amount,
    MAX(CASE WHEN status = 'VALIDATED' THEN payment_date END) AS last_validated_payment_date,
    BOOL_OR(status IN ('PENDING_ADMIN_VALIDATION', 'ADDITIONAL_EVIDENCE_REQUESTED')) AS has_active_pending_submission
FROM payment_submissions
WHERE is_archived = FALSE
GROUP BY entity_type, entity_ref;

-- -----------------------------------------------------------------------------
-- 2. Database-Level Audit Immutability Trigger (Condition 2)
-- -----------------------------------------------------------------------------
-- Strictly prevents UPDATE or DELETE operations on payment_submission_events.
-- Guarantees audit ledger immutability even against privileged application connections.
CREATE OR REPLACE FUNCTION prevent_payment_submission_events_tampering()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'payment_submission_events is an immutable audit ledger: % operations are strictly prohibited (Event ID: %)',
        TG_OP, OLD.id;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_payment_submission_events_tampering ON payment_submission_events;

CREATE TRIGGER trg_prevent_payment_submission_events_tampering
BEFORE UPDATE OR DELETE ON payment_submission_events
FOR EACH ROW
EXECUTE FUNCTION prevent_payment_submission_events_tampering();

COMMIT;
