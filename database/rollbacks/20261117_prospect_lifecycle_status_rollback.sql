-- =====================================================================================
-- LIEC HEAV'N — WORKSTREAM PROSPECT CRM
-- ROLLBACK: 20261117_prospect_lifecycle_status_rollback.sql
-- TARGET ENVIRONMENT: Preview-3 (ep-wispy-firefly-b9el08l7)
-- OBJECTIVE: Rollback prospect lifecycle status columns and constraints
-- =====================================================================================

BEGIN;

DROP INDEX IF EXISTS idx_prospects_stage_lifecycle;
DROP INDEX IF EXISTS idx_prospects_lifecycle_status;

ALTER TABLE prospects
  DROP CONSTRAINT IF EXISTS chk_prospects_deactivation_reason,
  DROP CONSTRAINT IF EXISTS chk_prospects_lifecycle_status,
  DROP COLUMN IF EXISTS reactivated_at,
  DROP COLUMN IF EXISTS reactivated_by,
  DROP COLUMN IF EXISTS deactivated_at,
  DROP COLUMN IF EXISTS deactivated_by,
  DROP COLUMN IF EXISTS deactivation_comment,
  DROP COLUMN IF EXISTS deactivation_reason,
  DROP COLUMN IF EXISTS lifecycle_status;

COMMIT;
