-- =============================================================================
-- LIEC Heav’n — Workstream 3 Database Migration Rollback
-- Phase 1: Foundational Payment Lifecycle Architecture Rollback
-- Target: Drop payment_submission_events, payment_submission_evidence, payment_submissions
-- Reference: W3_PAYMENT_WORKFLOW_ARCHITECTURE.md
-- =============================================================================

BEGIN;

DROP TABLE IF EXISTS payment_submission_events CASCADE;
DROP TABLE IF EXISTS payment_submission_evidence CASCADE;
DROP TABLE IF EXISTS payment_submissions CASCADE;

COMMIT;
