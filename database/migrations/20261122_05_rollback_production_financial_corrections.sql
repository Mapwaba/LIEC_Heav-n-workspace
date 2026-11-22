-- LIEC Heav'n — Rollback Script for Production Financial Corrections
-- WORKSTREAM 1.2: Restores previous states if necessary

BEGIN;

-- 1. Remove re-entry records
DELETE FROM prepa_payments
WHERE payment_ref IN ('PAY-2025-JOV-REENTRY', 'PAY-2025-EDU-REENTRY');

-- 2. Restore Jovani previous status
UPDATE prepa_payments
SET status = 'VALIDATED',
    updated_at = NOW()
WHERE id = 4
  AND candidate_name = 'JOVANI MOKOMBA MATUMELE';

-- 3. Restore Eduard previous status
UPDATE prepa_payments
SET status = 'VALIDATED',
    updated_at = NOW()
WHERE id = 3
  AND candidate_name = 'EDUARD MOVOMOBE MOVER';

-- 4. Restore receipt metadata if voided
UPDATE prepa_receipts
SET metadata = metadata - 'voided' - 'void_reason'
WHERE payment_id IN (3, 4);

-- 5. Record audit entry
INSERT INTO security_audit_logs (user_email, user_role, action, ip_address, created_at)
VALUES (
  'operator@liecconsulting.com',
  'admin',
  'Rollback financial reconciliation: Restored previous states for Jovani and Eduard',
  '127.0.0.1',
  NOW()
);

COMMIT;
