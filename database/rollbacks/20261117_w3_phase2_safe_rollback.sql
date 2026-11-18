-- =============================================================================
-- LIEC Heav’n — Workstream 3 Phase 2 Safe Rollback Procedure
-- Target: Phase 2 Financial Concurrency View and Audit Trigger
-- Safeguard: Reversible rollback that removes Phase 2 view and trigger without
-- touching underlying financial records, evidence files, or audit event logs.
-- =============================================================================

BEGIN;

-- 1. Remove audit immutability trigger
DROP TRIGGER IF EXISTS trg_prevent_payment_submission_events_tampering ON payment_submission_events;
DROP FUNCTION IF EXISTS prevent_payment_submission_events_tampering();

-- 2. Drop course balance view
DROP VIEW IF EXISTS view_applicant_total_course_balances CASCADE;

COMMIT;
