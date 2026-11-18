-- =============================================================================
-- LIEC Heav’n — Workstream 3 Safe Rollback Procedure
-- Target: Foundational Payment Lifecycle Architecture
-- Safeguard: Strictly prevents destructive drop if financial records exist
-- Reference: FIND-W3-002
-- =============================================================================

DO $$
DECLARE
    sub_count INTEGER := 0;
    evi_count INTEGER := 0;
    evt_count INTEGER := 0;
BEGIN
    -- Check if payment_submissions table exists and count rows
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_submissions') THEN
        SELECT count(*) INTO sub_count FROM payment_submissions;
    END IF;

    -- Check if payment_submission_evidence table exists and count rows
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_submission_evidence') THEN
        SELECT count(*) INTO evi_count FROM payment_submission_evidence;
    END IF;

    -- Check if payment_submission_events table exists and count rows
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_submission_events') THEN
        SELECT count(*) INTO evt_count FROM payment_submission_events;
    END IF;

    -- Safeguard assertion: Refuse rollback if any financial submissions, evidence, or audit events exist
    IF sub_count > 0 OR evi_count > 0 OR evt_count > 0 THEN
        RAISE EXCEPTION 
            '[-] ROLLBACK REFUSED (FIND-W3-002 SAFEGUARD): Tables contain active financial records (Submissions: %, Evidence: %, Events: %). Destructive DROP TABLE is strictly prohibited to prevent loss of financial audit history. If authorized by operator, execute the dedicated archival procedure instead.',
            sub_count, evi_count, evt_count;
    END IF;

    -- Only if completely empty (zero financial records), proceed with drop
    RAISE NOTICE '[+] All tables verified empty. Safe rollback permitted.';
    
    EXECUTE 'DROP VIEW IF EXISTS view_applicant_instalment_balances CASCADE;';
    EXECUTE 'DROP TABLE IF EXISTS payment_submission_events CASCADE;';
    EXECUTE 'DROP TABLE IF EXISTS payment_submission_evidence CASCADE;';
    EXECUTE 'DROP TABLE IF EXISTS payment_submissions CASCADE;';

    RAISE NOTICE '[+] Empty W3 tables safely removed.';
END $$;
