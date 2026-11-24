-- LIEC Heav'n — Production Financial Corrections & Reconciliations
-- WORKSTREAM 1.2: Corrects Jovani Mokomba Matumele & Eduard Movomobe Mover
-- Target: Production Database (EXECUTED ONLY UPON EXPLICIT OPERATOR AUTHORIZATION)
--
-- ZERO-TOUCH INVARIANT:
-- Anaella Masiala Di-Ngoma (Payment ID 5, Receipt linking to Payment 5, Amount €1,364.95)
-- is EXCLUDED from all updates, notes changes, status alterations, and metadata modifications.

BEGIN;

-- 1. Reverse and cancel unverified entry for Jovani Mokomba Matumele (ID 4: €1,800.00)
-- Retains audit trail and reverses active balance to zero
UPDATE prepa_payments
SET status = 'CANCELLED',
    notes = COALESCE(notes, '') || ' [REVERSED: Unverified initial entry of €1,800.00 reversed to zero per Priority 2 Directive. Original record preserved for audit trail. Manual staff re-entry enabled.]',
    updated_at = NOW()
WHERE id = 4
  AND candidate_name = 'JOVANI MOKOMBA MATUMELE'
  AND amount = 1800.00;

-- 2. Reverse and cancel unverified entry for Eduard Movomobe Mover (ID 3: €1,500.00)
-- Retains audit trail and reverses active balance to zero
UPDATE prepa_payments
SET status = 'CANCELLED',
    notes = COALESCE(notes, '') || ' [REVERSED: Unverified initial entry of €1,500.00 reversed to zero per Priority 2 Directive. Original record preserved for audit trail. Manual staff re-entry enabled.]',
    updated_at = NOW()
WHERE id = 3
  AND candidate_name = 'EDUARD MOVOMOBE MOVER'
  AND amount = 1500.00;

-- 3. Mark any associated receipts as voided in metadata (strictly scoped to payments 3 and 4)
UPDATE prepa_receipts
SET metadata = COALESCE(metadata, '{}'::jsonb) || '{"voided": true, "void_reason": "Reversed unverified test entry per Priority 2 Directive"}'::jsonb
WHERE payment_id IN (3, 4);

-- 4. Insert clean pending baseline instalment 1 records allowing Admin manual entry
INSERT INTO prepa_payments (
  payment_ref, candidate_ref, candidate_name, instalment_number, instalment_label,
  instalment_percentage, amount, status, notes
) VALUES
(
  'PAY-2025-JOV-REENTRY', 'CAN-2025-004', 'JOVANI MOKOMBA MATUMELE', 1, 'Instalment 1',
  50.00, 0.00, 'PENDING', 'Fresh baseline entry ready for manual Finance Officer re-entry'
),
(
  'PAY-2025-EDU-REENTRY', 'CAN-2025-003', 'EDUARD MOVOMOBE MOVER', 1, 'Instalment 1',
  50.00, 0.00, 'PENDING', 'Fresh baseline entry ready for manual Finance Officer re-entry'
);

-- 5. Record authoritative audit entry (Execution Marker for Rollback Safety)
INSERT INTO audit_logs (actor, action, entity_ref, outcome, details, created_at)
VALUES (
  'operator@liecconsulting.com',
  'Financial reconciliation: Workstream 1.2',
  'PAY-2025-003, PAY-2025-004, PAY-2025-005',
  'Succès',
  'Financial reconciliation: Preserved Anaella Masiala Di-Ngoma (€1,364.95 zero-touch), reversed unverified positions for Jovani (€1,800) and Eduard (€1,500) to zero with audit trail.',
  NOW()
);

COMMIT;
