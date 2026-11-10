-- ==============================================================================
-- LIEC Heav'n - Database Migration: User Import Sets & Transform Maps
-- Target: Neon PostgreSQL (Production) & Local PGLite
-- Date: 2026-11-06
-- Scope:
--   ServiceNow-style Import Sets staging architecture for bulk user registration:
--   1. user_import_sets (master container)
--   2. user_import_staging_rows (staging table for raw and mapped records)
--   3. Performance indexes
-- Safety: Fully idempotent (IF NOT EXISTS).
-- STATUS: PREPARED (DO NOT EXECUTE DIRECTLY WITHOUT EXPLICIT APPROVAL).
-- ==============================================================================

BEGIN;

-- 1. Import Sets master container
CREATE TABLE IF NOT EXISTS user_import_sets (
  id SERIAL PRIMARY KEY,
  set_number VARCHAR(50) UNIQUE NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER DEFAULT 0,
  file_type VARCHAR(20) DEFAULT 'csv',
  status VARCHAR(40) NOT NULL DEFAULT 'LOADED', -- 'LOADED' | 'MAPPED' | 'TRANSFORMING' | 'COMPLETED' | 'CANCELLED'
  total_rows INTEGER NOT NULL DEFAULT 0,
  valid_rows INTEGER NOT NULL DEFAULT 0,
  error_rows INTEGER NOT NULL DEFAULT 0,
  skipped_rows INTEGER NOT NULL DEFAULT 0,
  created_rows INTEGER NOT NULL DEFAULT 0,
  updated_rows INTEGER NOT NULL DEFAULT 0,
  transform_map_json TEXT DEFAULT '{}',
  execution_summary_json TEXT DEFAULT '{}',
  selected_sheet VARCHAR(120),
  sheets_available_json TEXT DEFAULT '[]',
  execution_lock_id VARCHAR(80),
  execution_started_at TIMESTAMP WITH TIME ZONE,
  created_by VARCHAR(120) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  executed_by VARCHAR(120),
  executed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_import_sets_status ON user_import_sets(status);
CREATE INDEX IF NOT EXISTS idx_import_sets_number ON user_import_sets(set_number);

ALTER TABLE user_import_sets ADD COLUMN IF NOT EXISTS selected_sheet VARCHAR(120);
ALTER TABLE user_import_sets ADD COLUMN IF NOT EXISTS sheets_available_json TEXT DEFAULT '[]';
ALTER TABLE user_import_sets ADD COLUMN IF NOT EXISTS execution_lock_id VARCHAR(80);
ALTER TABLE user_import_sets ADD COLUMN IF NOT EXISTS execution_started_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE user_import_sets ADD COLUMN IF NOT EXISTS execution_heartbeat_at TIMESTAMP WITH TIME ZONE;

-- 2. Staging rows for raw import records
CREATE TABLE IF NOT EXISTS user_import_staging_rows (
  id SERIAL PRIMARY KEY,
  import_set_id INTEGER NOT NULL REFERENCES user_import_sets(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  raw_data_json TEXT NOT NULL,
  mapped_data_json TEXT DEFAULT '{}',
  validation_status VARCHAR(40) NOT NULL DEFAULT 'PENDING', -- 'PENDING' | 'VALID' | 'INVALID' | 'SKIPPED' | 'DUPLICATE_EMAIL' | 'DUPLICATE_USER_ID'
  validation_errors_json TEXT DEFAULT '[]',
  transform_status VARCHAR(40) NOT NULL DEFAULT 'PENDING', -- 'PENDING' | 'PROVISIONED' | 'UPDATED' | 'SKIPPED' | 'FAILED' | 'EXCLUDED'
  provisioned_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  provisioned_user_identifier VARCHAR(60),
  email_status VARCHAR(40) DEFAULT 'NOT_SENT',
  email_error TEXT,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  execution_lock_id VARCHAR(80),
  error_message TEXT,
  is_excluded BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_staging_import_set ON user_import_staging_rows(import_set_id);
CREATE INDEX IF NOT EXISTS idx_staging_validation ON user_import_staging_rows(validation_status);
CREATE INDEX IF NOT EXISTS idx_staging_transform ON user_import_staging_rows(transform_status);

ALTER TABLE user_import_staging_rows ADD COLUMN IF NOT EXISTS email_status VARCHAR(40) DEFAULT 'NOT_SENT';
ALTER TABLE user_import_staging_rows ADD COLUMN IF NOT EXISTS email_error TEXT;
ALTER TABLE user_import_staging_rows ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE user_import_staging_rows ADD COLUMN IF NOT EXISTS execution_lock_id VARCHAR(80);

ALTER TABLE users ADD COLUMN IF NOT EXISTS invitation_token VARCHAR(120);
ALTER TABLE users ADD COLUMN IF NOT EXISTS invitation_token_expires_at TIMESTAMP WITH TIME ZONE;

COMMIT;
