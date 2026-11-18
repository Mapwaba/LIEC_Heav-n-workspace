-- =====================================================================================
-- LIEC HEAV'N — WORKSTREAM PROSPECT CRM
-- MIGRATION: 20261117_prospect_lifecycle_status.sql
-- TARGET ENVIRONMENT: Preview-3 (ep-wispy-firefly-b9el08l7)
-- OBJECTIVE: Add independent lifecycle status (ACTIVE / INACTIVE) to prospects table
-- =====================================================================================

BEGIN;

-- 1. Add lifecycle columns to prospects table
ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS lifecycle_status VARCHAR(20) DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS deactivation_reason VARCHAR(50),
  ADD COLUMN IF NOT EXISTS deactivation_comment TEXT,
  ADD COLUMN IF NOT EXISTS deactivated_by VARCHAR(120),
  ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reactivated_by VARCHAR(120),
  ADD COLUMN IF NOT EXISTS reactivated_at TIMESTAMPTZ;

-- 2. Backfill existing records to ensure ACTIVE status
UPDATE prospects
  SET lifecycle_status = 'ACTIVE'
  WHERE lifecycle_status IS NULL;

-- 3. Add constraint for valid lifecycle statuses if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_prospects_lifecycle_status'
  ) THEN
    ALTER TABLE prospects
      ADD CONSTRAINT chk_prospects_lifecycle_status
      CHECK (lifecycle_status IN ('ACTIVE', 'INACTIVE'));
  END IF;
END $$;

-- 4. Add constraint for valid deactivation reasons if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_prospects_deactivation_reason'
  ) THEN
    ALTER TABLE prospects
      ADD CONSTRAINT chk_prospects_deactivation_reason
      CHECK (deactivation_reason IS NULL OR deactivation_reason IN ('Dropped Programme', 'Not Pursuing'));
  END IF;
END $$;

-- 5. Create index on lifecycle_status for optimal filter performance
CREATE INDEX IF NOT EXISTS idx_prospects_lifecycle_status ON prospects (lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_prospects_stage_lifecycle ON prospects (stage, lifecycle_status);

COMMIT;
