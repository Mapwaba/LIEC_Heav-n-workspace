-- ==============================================================================
-- ROLLBACK SCRIPT: 20261122_02_rollback_user_presence.sql
-- TARGET TABLE: user_presence
-- PURPOSE: Drop real-time user presence tracking table and indexes created in 20261122_02.
--
-- OPERATIONAL IMPACT:
-- - Drops table 'user_presence' and associated indexes (idx_user_presence_heartbeat, idx_user_presence_record).
-- - Safety: user_presence stores exclusively ephemeral in-memory session heartbeat state.
--   Zero permanent student, academic, or financial records are affected.
-- - Maintenance window: None required. Application falls back gracefully if presence endpoint
--   is disabled or returns empty lists.
-- ==============================================================================

BEGIN;

DROP INDEX IF EXISTS idx_user_presence_record;
DROP INDEX IF EXISTS idx_user_presence_heartbeat;

DROP TABLE IF EXISTS user_presence CASCADE;

COMMIT;
