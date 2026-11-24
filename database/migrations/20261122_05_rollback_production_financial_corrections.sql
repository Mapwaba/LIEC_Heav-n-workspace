-- LIEC Heav'n — Safe Rollback for Production Financial Corrections (Hardened Release Gate)
-- WORKSTREAM 1.2: Enforces Fail-Closed Guard, Prohibits Automatic Re-Validation,
-- and Protects Against Updates, Deletions, Replacement Records, and Metadata Tampering
--
-- RELEASE GATE HARDENING:
-- 1. Exact ID array verification ([3, 4, 5] for payments and receipts).
-- 2. NULL-safe attribute comparison (IS NOT DISTINCT FROM).
-- 3. Nullable payment_ref protection (cannot bypass subsequent payment detection).
-- 4. Unique migration audit execution identifier (v_marker_audit_id and v_migration_marker_time).
-- 5. Comprehensive Anaella zero-touch verification across all columns, metadata, and timestamps.
-- 6. Replacement detection immune to timestamp backdating and reused receipt numbers.

BEGIN;

DO $$
DECLARE
  v_marker_audit_id INT;
  v_migration_marker_time TIMESTAMPTZ;
  v_marker_count INT;
  
  -- Payment checks
  v_subsequent_payments INT;
  v_subsequent_updates INT;
  v_replacement_payments INT;
  v_baseline_payments INT;
  v_payment_ids INT[];
  v_anaella_payment_count INT;
  v_audit_post_migration_payments INT;
  
  -- Receipt checks
  v_baseline_receipts INT;
  v_receipt_ids INT[];
  v_receipt_replacements INT;
  v_receipt_amounts_mismatch INT;
  v_receipt_refs_mismatch INT;
  v_receipt_meta_tampered INT;
  v_anaella_receipt_count INT;
  v_anaella_receipt_tampered INT;

  -- Placeholder checks
  v_reentry_placeholders INT;
  v_reentry_modified INT;
BEGIN
  -- 1. IDENTIFY EXACT UNIQUE MIGRATION EXECUTION IDENTIFIER
  -- Enforces strict uniqueness: exactly one migration marker must exist in audit_logs
  SELECT COUNT(*) INTO v_marker_count
  FROM audit_logs
  WHERE action = 'Financial reconciliation: Workstream 1.2'
    AND entity_ref = 'PAY-2025-003, PAY-2025-004, PAY-2025-005'
    AND outcome = 'Succès'
    AND details ILIKE '%Preserved Anaella Masiala Di-Ngoma%';

  IF v_marker_count = 0 THEN
    RAISE EXCEPTION 'ROLLBACK HALTED (FAIL-CLOSED): Could not find original migration 05 unique execution identifier in audit_logs. Zero records match unique signature. Manual reconciliation required.';
  ELSIF v_marker_count > 1 THEN
    RAISE EXCEPTION 'ROLLBACK HALTED (FAIL-CLOSED): Ambiguous migration marker detected in audit_logs. Found % matching records (expected exactly 1). Automated rollback aborted to prevent corrupted audit trail.',
      v_marker_count;
  END IF;

  SELECT id, created_at INTO v_marker_audit_id, v_migration_marker_time
  FROM audit_logs
  WHERE action = 'Financial reconciliation: Workstream 1.2'
    AND entity_ref = 'PAY-2025-003, PAY-2025-004, PAY-2025-005'
    AND outcome = 'Succès'
    AND details ILIKE '%Preserved Anaella Masiala Di-Ngoma%';

  -- 2. DETECT SUBSEQUENT NEW PAYMENTS RECORDED AFTER MIGRATION
  -- NULL-SAFE: Explicitly handles cases where payment_ref is NULL to prevent bypass
  SELECT COUNT(*) INTO v_subsequent_payments
  FROM prepa_payments
  WHERE id NOT IN (3, 4, 5)
    AND (payment_ref IS NULL OR payment_ref NOT IN ('PAY-2025-JOV-REENTRY', 'PAY-2025-EDU-REENTRY'))
    AND created_at >= v_migration_marker_time;

  IF v_subsequent_payments > 0 THEN
    RAISE EXCEPTION 'ROLLBACK HALTED (FAIL-CLOSED): Detected % subsequent legitimate payment record(s) created at or after migration marker (Log ID %, % UTC). Automated rollback aborted.',
      v_subsequent_payments, v_marker_audit_id, v_migration_marker_time;
  END IF;

  -- 3. DETECT REPLACEMENT PAYMENT RECORDS (IDs 3, 4, 5 re-created post-migration)
  SELECT COUNT(*) INTO v_replacement_payments
  FROM prepa_payments
  WHERE id IN (3, 4, 5)
    AND created_at >= v_migration_marker_time;

  IF v_replacement_payments > 0 THEN
    RAISE EXCEPTION 'ROLLBACK HALTED (FAIL-CLOSED): Detected % replacement baseline payment record(s) created at or after migration. Original baseline compromised.',
      v_replacement_payments;
  END IF;

  -- 4. VERIFY EXACT BASELINE PAYMENT IDS (Not only counts)
  SELECT COUNT(*), ARRAY_AGG(id ORDER BY id) 
  INTO v_baseline_payments, v_payment_ids
  FROM prepa_payments
  WHERE id IN (3, 4, 5);

  IF v_baseline_payments != 3 OR v_payment_ids IS DISTINCT FROM ARRAY[3, 4, 5] THEN
    RAISE EXCEPTION 'ROLLBACK HALTED (FAIL-CLOSED): Expected exact baseline payment IDs [3, 4, 5], but found % with IDs %. Financial records may have been deleted or altered.',
      v_baseline_payments, v_payment_ids;
  END IF;

  -- 5. DETECT SUBSEQUENT UPDATES TO EXISTING FINANCIAL RECORDS (Timestamp & Attribute Integrity)
  -- 5a: Detect updated_at timestamp advancing past marker (NULL-safe for payment_ref)
  SELECT COUNT(*) INTO v_subsequent_updates
  FROM prepa_payments
  WHERE (payment_ref IS NULL OR payment_ref NOT IN ('PAY-2025-JOV-REENTRY', 'PAY-2025-EDU-REENTRY'))
    AND updated_at > v_migration_marker_time;

  IF v_subsequent_updates > 0 THEN
    RAISE EXCEPTION 'ROLLBACK HALTED (FAIL-CLOSED): Detected % existing payment record(s) with updated_at timestamp advancing past migration.',
      v_subsequent_updates;
  END IF;

  -- 5b: Immutable Audit Trail Protection (Catches backdated payment updates)
  SELECT COUNT(*) INTO v_audit_post_migration_payments
  FROM audit_logs
  WHERE id > v_marker_audit_id
    AND (action ILIKE '%payment%' OR entity_ref ILIKE '%PAY%' OR details ILIKE '%payment%');

  IF v_audit_post_migration_payments > 0 THEN
    RAISE EXCEPTION 'ROLLBACK HALTED (FAIL-CLOSED): Detected % post-migration payment modification event(s) in audit trail (Audit ID > %). Rollback aborted to protect ledger.',
      v_audit_post_migration_payments, v_marker_audit_id;
  END IF;

  -- 5c: Stable Identity & Exact Baseline Verification for Anaella (Payment ID 5)
  SELECT COUNT(*) INTO v_anaella_payment_count
  FROM prepa_payments
  WHERE id = 5 OR payment_ref = 'PAY-2025-005';

  IF v_anaella_payment_count = 0 THEN
    RAISE EXCEPTION 'ROLLBACK HALTED (FAIL-CLOSED): Anaella Masiala Di-Ngoma payment is missing or deleted (expected exactly 1). Baseline compromised.';
  ELSIF v_anaella_payment_count > 1 THEN
    RAISE EXCEPTION 'ROLLBACK HALTED (FAIL-CLOSED): Duplicate Anaella Masiala Di-Ngoma payment detected (% records match ID 5 or PAY-2025-005).',
      v_anaella_payment_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM prepa_payments 
    WHERE (id = 5 OR payment_ref = 'PAY-2025-005')
      AND id IS NOT DISTINCT FROM 5
      AND candidate_ref IS NOT DISTINCT FROM 'CAN-2025-001'
      AND candidate_name IS NOT DISTINCT FROM 'ANAELLA MASIALA DI-NGOMA'
      AND amount IS NOT DISTINCT FROM 1364.95
      AND status IS NOT DISTINCT FROM 'VALIDATED'
      AND payment_ref IS NOT DISTINCT FROM 'PAY-2025-005'
      AND instalment_number IS NOT DISTINCT FROM 1
      AND instalment_label IS NOT DISTINCT FROM 'Instalment 1'
      AND instalment_percentage IS NOT DISTINCT FROM 50.00
      AND notes NOT ILIKE '%REVERSED%'
      AND created_at IS NOT DISTINCT FROM '2026-11-21 13:38:14.475+00'::timestamptz
  ) THEN
    RAISE EXCEPTION 'ROLLBACK HALTED (FAIL-CLOSED): Anaella Masiala Di-Ngoma payment (ID 5) attributes or timestamps have been modified. Rollback aborted to protect ledger.';
  END IF;

  -- 5d: Full Trusted Row Baseline Comparison for Jovani (4) and Eduard (3)
  -- Catches modifications EVEN IF updated_at was backdated to or before migration marker
  IF NOT EXISTS (
    SELECT 1 FROM prepa_payments 
    WHERE id = 4 
      AND candidate_ref IS NOT DISTINCT FROM 'CAN-2025-004'
      AND candidate_name IS NOT DISTINCT FROM 'JOVANI MOKOMBA MATUMELE' 
      AND amount IS NOT DISTINCT FROM 1800.00 
      AND payment_ref IS NOT DISTINCT FROM 'PAY-2025-004'
      AND status IS NOT DISTINCT FROM 'CANCELLED'
      AND notes ILIKE '%REVERSED: Unverified initial entry of €1,800.00 reversed to zero%'
  ) OR NOT EXISTS (
    SELECT 1 FROM prepa_payments 
    WHERE id = 3 
      AND candidate_ref IS NOT DISTINCT FROM 'CAN-2025-003'
      AND candidate_name IS NOT DISTINCT FROM 'EDUARD MOVOMOBE MOVER' 
      AND amount IS NOT DISTINCT FROM 1500.00 
      AND payment_ref IS NOT DISTINCT FROM 'PAY-2025-003'
      AND status IS NOT DISTINCT FROM 'CANCELLED'
      AND notes ILIKE '%REVERSED: Unverified initial entry of €1,500.00 reversed to zero%'
  ) THEN
    RAISE EXCEPTION 'ROLLBACK HALTED (FAIL-CLOSED): Baseline payment attributes, status, or reversal notes for Jovani (ID 4) or Eduard (ID 3) have been modified or backdated.';
  END IF;

  -- 6. RECEIPT INTEGRITY & REPLACEMENT PROTECTIONS
  -- 6a: Verify exact baseline receipt IDs (Not only counts)
  SELECT COUNT(*), ARRAY_AGG(id ORDER BY id) 
  INTO v_baseline_receipts, v_receipt_ids
  FROM prepa_receipts
  WHERE payment_id IN (3, 4, 5);

  IF v_baseline_receipts != 3 OR v_receipt_ids IS DISTINCT FROM ARRAY[3, 4, 5] THEN
    RAISE EXCEPTION 'ROLLBACK HALTED (FAIL-CLOSED): Expected exact baseline receipt IDs [3, 4, 5] linked to payments 3, 4, 5, but found % with IDs %.',
      v_baseline_receipts, v_receipt_ids;
  END IF;

  -- 6b: Detect replacement receipts (Inserted post-migration or mismatching exact baseline mapping)
  SELECT COUNT(*) INTO v_receipt_replacements
  FROM prepa_receipts
  WHERE payment_id IN (3, 4, 5)
    AND (
      (payment_id = 3 AND (id IS DISTINCT FROM 3 OR receipt_number IS DISTINCT FROM 'REC-2025-003' OR candidate_ref IS DISTINCT FROM 'CAN-2025-003')) OR
      (payment_id = 4 AND (id IS DISTINCT FROM 4 OR receipt_number IS DISTINCT FROM 'REC-2025-004' OR candidate_ref IS DISTINCT FROM 'CAN-2025-004')) OR
      (payment_id = 5 AND (id IS DISTINCT FROM 5 OR receipt_number IS DISTINCT FROM 'REC-2025-005' OR candidate_ref IS DISTINCT FROM 'CAN-2025-001')) OR
      generated_at >= v_migration_marker_time
    );

  IF v_receipt_replacements > 0 THEN
    RAISE EXCEPTION 'ROLLBACK HALTED (FAIL-CLOSED): Detected % replacement or post-migration receipt record(s). Original receipts compromised.',
      v_receipt_replacements;
  END IF;

  -- 6c: Detect receipt amount alterations (NULL-safe)
  SELECT COUNT(*) INTO v_receipt_amounts_mismatch
  FROM prepa_receipts
  WHERE (payment_id = 3 AND amount_paid IS DISTINCT FROM 1500.00)
     OR (payment_id = 4 AND amount_paid IS DISTINCT FROM 1800.00)
     OR (payment_id = 5 AND amount_paid IS DISTINCT FROM 1364.95);

  IF v_receipt_amounts_mismatch > 0 THEN
    RAISE EXCEPTION 'ROLLBACK HALTED (FAIL-CLOSED): Receipt amount_paid altered for baseline receipts. Rollback aborted.';
  END IF;

  -- 6d: Detect receipt reference alterations (NULL-safe)
  SELECT COUNT(*) INTO v_receipt_refs_mismatch
  FROM prepa_receipts
  WHERE (payment_id = 3 AND verification_ref IS DISTINCT FROM 'VERIF-003')
     OR (payment_id = 4 AND verification_ref IS DISTINCT FROM 'VERIF-004')
     OR (payment_id = 5 AND verification_ref IS DISTINCT FROM 'VERIF-005');

  IF v_receipt_refs_mismatch > 0 THEN
    RAISE EXCEPTION 'ROLLBACK HALTED (FAIL-CLOSED): Receipt verification_ref altered for baseline receipts. Rollback aborted.';
  END IF;

  -- 6e: Detect receipt metadata alteration or removal on payments 3 & 4
  SELECT COUNT(*) INTO v_receipt_meta_tampered
  FROM prepa_receipts
  WHERE payment_id IN (3, 4)
    AND (
      (metadata->>'voided')::boolean IS DISTINCT FROM TRUE
      OR metadata->>'void_reason' IS DISTINCT FROM 'Reversed unverified test entry per Priority 2 Directive'
    );

  IF v_receipt_meta_tampered > 0 THEN
    RAISE EXCEPTION 'ROLLBACK HALTED (FAIL-CLOSED): Receipt void metadata for payments 3 or 4 was removed or altered by external process.';
  END IF;

  -- 6f-1: Locate Anaella's receipt using stable identities (Primary Key ID 5 and Receipt Number REC-2025-005)
  -- Requires exactly one original receipt to exist (independent of payment_id or candidate_ref)
  SELECT COUNT(*) INTO v_anaella_receipt_count
  FROM prepa_receipts
  WHERE id = 5 OR receipt_number = 'REC-2025-005';

  IF v_anaella_receipt_count = 0 THEN
    RAISE EXCEPTION 'ROLLBACK HALTED (FAIL-CLOSED): Anaella Masiala Di-Ngoma receipt is missing or deleted (expected exactly 1). Baseline compromised.';
  ELSIF v_anaella_receipt_count > 1 THEN
    RAISE EXCEPTION 'ROLLBACK HALTED (FAIL-CLOSED): Duplicate Anaella Masiala Di-Ngoma receipt detected (% records match ID 5 or REC-2025-005). Baseline compromised.',
      v_anaella_receipt_count;
  END IF;

  -- 6f-2: Complete NULL-Safe attribute protection for Anaella's receipt
  -- Compares EVERY protected field against exact baseline, including exact original generated_at timestamp
  SELECT COUNT(*) INTO v_anaella_receipt_tampered
  FROM prepa_receipts
  WHERE (id = 5 OR receipt_number = 'REC-2025-005')
    AND (
      id IS DISTINCT FROM 5
      OR receipt_number IS DISTINCT FROM 'REC-2025-005'
      OR payment_id IS DISTINCT FROM 5
      OR payment_ref IS DISTINCT FROM 'PAY-2025-005'
      OR candidate_ref IS DISTINCT FROM 'CAN-2025-001'
      OR candidate_name IS DISTINCT FROM 'ANAELLA MASIALA DI-NGOMA'
      OR instalment_number IS DISTINCT FROM 1
      OR amount_paid IS DISTINCT FROM 1364.95
      OR cumulative_paid IS DISTINCT FROM 1364.95
      OR outstanding_balance IS DISTINCT FROM 3635.05
      OR verification_ref IS DISTINCT FROM 'VERIF-005'
      OR metadata IS DISTINCT FROM '{}'::jsonb
      OR (metadata->>'voided')::boolean IS TRUE
      OR generated_at IS DISTINCT FROM '2026-11-21 13:38:14.475+00'::timestamptz
    );

  IF v_anaella_receipt_tampered > 0 THEN
    RAISE EXCEPTION 'ROLLBACK HALTED (FAIL-CLOSED): Anaella Masiala Di-Ngoma receipt (ID 5 / REC-2025-005) attributes or timestamps have been tampered with. Baseline compromised.';
  END IF;

  -- 7. RE-ENTRY PLACEHOLDER INTEGRITY GUARDS
  SELECT COUNT(*) INTO v_reentry_placeholders
  FROM prepa_payments
  WHERE payment_ref IN ('PAY-2025-JOV-REENTRY', 'PAY-2025-EDU-REENTRY');

  IF v_reentry_placeholders != 2 THEN
    RAISE EXCEPTION 'ROLLBACK HALTED (FAIL-CLOSED): Expected 2 re-entry placeholders, but found %. Placeholders may have been deleted.',
      v_reentry_placeholders;
  END IF;

  SELECT COUNT(*) INTO v_reentry_modified
  FROM prepa_payments
  WHERE payment_ref IN ('PAY-2025-JOV-REENTRY', 'PAY-2025-EDU-REENTRY')
    AND (status IS DISTINCT FROM 'PENDING' OR amount IS DISTINCT FROM 0.00 OR notes IS DISTINCT FROM 'Fresh baseline entry ready for manual Finance Officer re-entry');

  IF v_reentry_modified > 0 THEN
    RAISE EXCEPTION 'ROLLBACK HALTED (FAIL-CLOSED): Re-entry placeholder(s) have been modified or processed by Finance. Cannot delete active financial records.';
  END IF;

  -- 8. SAFELY REMOVE UNMODIFIED PENDING RE-ENTRY PLACEHOLDERS
  DELETE FROM prepa_payments
  WHERE payment_ref IN ('PAY-2025-JOV-REENTRY', 'PAY-2025-EDU-REENTRY')
    AND status = 'PENDING'
    AND amount = 0.00;

  -- 9. REVERSE RECEIPT METADATA VOID REASON
  UPDATE prepa_receipts
  SET metadata = metadata - 'voided' - 'void_reason'
  WHERE payment_id IN (3, 4)
    AND metadata->>'void_reason' = 'Reversed unverified test entry per Priority 2 Directive';

  -- NOTE ON PAYMENTS 3 & 4:
  -- Eduard (3) and Jovani (4) remain in CANCELLED status.
  -- They are NEVER automatically re-validated back into active revenue.
  -- An authorized Finance Officer must validate any legitimate payment via the application UI.

  -- 10. RECORD ROLLBACK AUDIT EVENT (EXACT 6 COLUMNS MATCHING 6 VALUES)
  INSERT INTO audit_logs (actor, action, entity_ref, outcome, details, created_at)
  VALUES (
    'operator@liecconsulting.com',
    'Rollback financial reconciliation executed',
    'PAY-2025-003, PAY-2025-004',
    'Succès',
    'Cleaned unmodified placeholders; unverified entries 3 and 4 maintained in CANCELLED status awaiting manual staff review.',
    NOW()
  );

END $$;

COMMIT;
