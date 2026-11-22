-- ==============================================================================
-- ROLLBACK SCRIPT: 20261122_03_rollback_trustavi_catalog_and_checklist.sql
-- TARGET TABLES: avi_partners, avi_commercial_offers, avi_requests
-- PURPOSE: Controlled rollback of TrustAVI catalog integration.
--
-- DATA SAFETY & INTEGRITY SAFEGUARDS:
-- 1. YIMMILINE partner data and historical AVI records are strictly preserved.
-- 2. Foreign-key safety check: If legitimate TrustAVI requests exist in avi_requests,
--    records are NOT hard-deleted. Instead, TrustAVI is soft-deactivated to preserve
--    financial snapshots, payment audit trails, and applicant documents.
-- 3. If zero TrustAVI requests exist, the seeded commercial offers are cleaned up cleanly.
-- 4. Reversible DDL columns on avi_requests are preserved by default to prevent data loss.
--    Full column dropping requires a maintenance window after offline archival.
-- ==============================================================================

BEGIN;

-- 1. Soft-deactivate TrustAVI partner (prevents new requests while preserving historical links)
UPDATE avi_partners 
SET active = FALSE 
WHERE id = 'trustavi';

-- 2. Soft-deactivate TrustAVI commercial offers
UPDATE avi_commercial_offers 
SET active = FALSE 
WHERE partner_id = 'trustavi';

-- 3. If NO live requests reference TrustAVI, safely remove seeded offers
DELETE FROM avi_commercial_offers 
WHERE partner_id = 'trustavi'
  AND NOT EXISTS (
    SELECT 1 FROM avi_requests WHERE partner_id = 'trustavi'
  );

-- 4. If NO live requests reference TrustAVI, safely remove the partner record
DELETE FROM avi_partners 
WHERE id = 'trustavi'
  AND NOT EXISTS (
    SELECT 1 FROM avi_requests WHERE partner_id = 'trustavi'
  );

-- ==============================================================================
-- FULL DDL REVERSAL (REQUIRES SCHEDULED MAINTENANCE WINDOW & ARCHIVAL)
-- UNCOMMENT ONLY IF ZERO TRUSTAVI PRODUCTION RECORDS EXIST AND CLEAN RESET IS REQUIRED:
--
-- ALTER TABLE avi_requests
--   DROP COLUMN IF EXISTS responsible_staff,
--   DROP COLUMN IF EXISTS deposit_payment_evidence_key,
--   DROP COLUMN IF EXISTS deposit_payment_date,
--   DROP COLUMN IF EXISTS deposit_reference,
--   DROP COLUMN IF EXISTS trustavi_checklist_json,
--   DROP COLUMN IF EXISTS financial_snapshot_json,
--   DROP COLUMN IF EXISTS offer_version,
--   DROP COLUMN IF EXISTS partner_id;
--
-- DROP TABLE IF EXISTS avi_commercial_offers CASCADE;
-- DROP TABLE IF EXISTS avi_partners CASCADE;
-- ==============================================================================

COMMIT;
