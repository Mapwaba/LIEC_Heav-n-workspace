-- ==============================================================================
-- ROLLBACK SCRIPT: 20261122_01_rollback_optimistic_concurrency.sql
-- TARGET TABLES: candidats, demandes, payment_submissions
-- PURPOSE: Safely reverse optimistic concurrency columns added in 20261122_01.
--
-- OPERATIONAL IMPACT:
-- - Drops the 'version' column added to candidats, demandes, and payment_submissions.
-- - Drops 'updated_at' only if introduced by the migration.
-- - Note: Reverting this migration eliminates optimistic concurrency conflict detection
--   and returns the application to last-write-wins semantics.
-- - Maintenance window: None required for schema reversal, but application code
--   must be reverted first to avoid undefined column reference errors.
-- ==============================================================================

BEGIN;

-- 1. Remove version tracking from candidats
ALTER TABLE candidats 
  DROP COLUMN IF EXISTS version;

-- 2. Remove version tracking from demandes
ALTER TABLE demandes 
  DROP COLUMN IF EXISTS version;

-- 3. Remove version tracking from payment_submissions
ALTER TABLE payment_submissions 
  DROP COLUMN IF EXISTS version;

COMMIT;
