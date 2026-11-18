-- =============================================================================
-- LIEC Heav’n — Workstream 3 Table Archival Procedure
-- Target: Foundational Payment Lifecycle Architecture
-- Purpose: Safely renames tables with timestamp suffix instead of dropping them,
-- preserving all financial records, attached evidence metadata, and audit events.
-- Reference: FIND-W3-002
-- =============================================================================

DO $$
DECLARE
    archive_suffix TEXT := to_char(CURRENT_TIMESTAMP, 'YYYYMMDD_HH24MISS');
BEGIN
    RAISE NOTICE '[+] Executing authorized financial table archival with suffix: %', archive_suffix;

    -- Drop view first
    EXECUTE 'DROP VIEW IF EXISTS view_applicant_instalment_balances CASCADE;';

    -- Safely archive tables by renaming
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_submission_events') THEN
        EXECUTE format('ALTER TABLE payment_submission_events RENAME TO payment_submission_events_archived_%s;', archive_suffix);
        RAISE NOTICE '[+] payment_submission_events renamed to payment_submission_events_archived_%', archive_suffix;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_submission_evidence') THEN
        EXECUTE format('ALTER TABLE payment_submission_evidence RENAME TO payment_submission_evidence_archived_%s;', archive_suffix);
        RAISE NOTICE '[+] payment_submission_evidence renamed to payment_submission_evidence_archived_%', archive_suffix;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_submissions') THEN
        EXECUTE format('ALTER TABLE payment_submissions RENAME TO payment_submissions_archived_%s;', archive_suffix);
        RAISE NOTICE '[+] payment_submissions renamed to payment_submissions_archived_%', archive_suffix;
    END IF;

    RAISE NOTICE '[OK] Financial tables successfully archived without data loss.';
END $$;
