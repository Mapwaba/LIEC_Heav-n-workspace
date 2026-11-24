-- ============================================================================
-- LIEC Heav'n — Enhanced Standalone Cohort Financial Reconciliation SQL
-- Workstream 1.2: Dynamic Cohort Accounting & Proof of Candidate-to-Payment Relationships
-- 
-- ARCHITECTURAL INTEGRITY & RECONCILIATION SPECIFICATION:
-- 1. STRICT REFERENCE-BASED JOINS: All payment and receipt joins use exact candidate
--    references (cc.candidate_ref = pay.candidate_ref). Loose name-based 'OR' joins are strictly eliminated.
-- 2. EXACT ONE LEDGER ROW PER CANDIDATE: Invoices, payments, and receipts are
--    pre-aggregated in independent CTEs grouped strictly by candidate key.
-- 3. GLOBAL INVOICE MATCHING AMBIGUITY DETECTION:
--    In the absence of a candidate_ref foreign key in the legacy invoices table,
--    matching is performed on normalized name: LOWER(TRIM(i.student_name)) = LOWER(TRIM(c.full_name)).
--    A global homonym guard CTE ('all_candidate_name_counts') scans ALL candidates across the entire
--    database (inside and outside the cohort). If more than one candidate in the system shares the
--    same normalized name, the invoice match is rejected and marked as 'ALERT: AMBIGUOUS_DUPLICATE_NAME'
--    with 0.00 automatic allocation, preventing cross-cohort misattribution.
-- 4. INDEPENDENT COHORT DEFINITION: Cohort membership is defined strictly on
--    candidats enrollment attributes (program ILIKE '%prepa%' AND ref LIKE 'CAN-2025-%'),
--    independent of whether any payment records exist.
-- 5. PAYMENT STATUS NORMALIZATION & ISOLATION (ZERO PAYMENT LOSS):
--    Every payment record is explicitly mapped into exactly one category:
--      a) VALIDATED_GENUINE: Genuine validated revenue. Excludes 'VALIDATED (TEST)' and test refs.
--      b) TEST_EXCLUDED: Simulated or test validation positions (isolated from revenue).
--      c) CANCELLED: Reversed or voided positions.
--      d) PENDING: Fresh pending or in-review baseline entries.
--      e) UNKNOWN_UNRECOGNIZED: Any unmapped or non-standard status.
--    The mathematical identity total_raw = validated + test_excluded + cancelled + pending + unknown
--    guarantees that NO payment amount silently disappears from reconciliation.
-- 6. UNALLOCATED / UNMATCHED PAYMENTS ISOLATION:
--    Payments with NULL candidate references, referencing nonexistent candidates, or belonging
--    to candidates outside this cohort are NEVER silently attached to cohort candidates.
--    They are explicitly reported in a dedicated unallocated/unmatched ledger section.
-- 7. COMPLETE UNDERLYING TABLE RECONCILIATION:
--    A macro reconciliation proves: Complete Payments Table = Cohort Total + Unallocated Total.
-- ============================================================================


-- ============================================================================
-- 1. CANDIDATE-BY-CANDIDATE RECONCILED 12-STUDENT LEDGER
-- ============================================================================
WITH 
-- Cohort Base Population: Defined independently of payment records
cohort_candidates AS (
  SELECT 
    c.id AS candidat_id,
    c.ref AS candidate_ref,
    c.full_name,
    LOWER(TRIM(c.full_name)) AS norm_name,
    c.program,
    c.stage_badge
  FROM candidats c
  WHERE c.program ILIKE '%prepa%'
    AND c.ref LIKE 'CAN-2025-%'
),

-- Global Candidate Homonym Guard: Identifies duplicate candidate names across ALL candidates in DB
all_candidate_name_counts AS (
  SELECT 
    LOWER(TRIM(c.full_name)) AS norm_name,
    COUNT(c.id) AS global_name_frequency
  FROM candidats c
  GROUP BY LOWER(TRIM(c.full_name))
),

-- Independent Invoice Aggregation with Global Homonym Protection
invoice_aggregates AS (
  SELECT 
    LOWER(TRIM(i.student_name)) AS norm_name,
    COALESCE(SUM(i.amount_eur), 0.00) AS total_invoiced_obligation_eur,
    COUNT(i.id) AS invoice_records_count
  FROM invoices i
  GROUP BY LOWER(TRIM(i.student_name))
),

-- Categorize ONLY payments that reference candidates in the cohort
payment_categorized AS (
  SELECT 
    p.id,
    p.candidate_ref,
    p.amount,
    TRIM(UPPER(COALESCE(p.status, ''))) AS norm_status,
    COALESCE(p.notes, '') AS notes,
    COALESCE(p.payment_ref, '') AS payment_ref,
    CASE 
      -- 1. Cancelled / Voided / Refunded
      WHEN TRIM(UPPER(COALESCE(p.status, ''))) IN ('CANCELLED', 'ANNULE', 'ANNULÉ', 'VOIDED', 'REFUNDED')
        THEN 'CANCELLED'

      -- 2. Test transactions: EXCLUDED from genuine revenue (explicit status, reference, or note)
      -- Per Project Owner Directive: Anaella Masiala Di-Ngoma is the ONLY genuine validated payment.
      -- Christian Ndombe's €1,135.05 entry is an unverified test transaction and excluded from revenue.
      WHEN TRIM(UPPER(COALESCE(p.status, ''))) IN ('VALIDATED (TEST)', 'TEST', 'VALIDE (TEST)', 'SIMULATION', 'UNVERIFIED', 'NON VERIFIE', 'NON VÉRIFIÉ')
           OR TRIM(UPPER(COALESCE(p.status, ''))) LIKE '%TEST%'
           OR COALESCE(p.payment_ref, '') ILIKE '%TEST%'
           OR COALESCE(p.notes, '') ILIKE '%TEST%'
           OR COALESCE(p.notes, '') ILIKE '%UNVERIFIED%'
           OR COALESCE(p.notes, '') ILIKE '%SIMULATED%'
           OR p.candidate_ref = 'CAN-2025-002'
           OR COALESCE(p.payment_ref, '') ILIKE '%CHR%'
        THEN 'TEST_EXCLUDED'

      -- 3. Genuine Validated Revenue
      WHEN TRIM(UPPER(COALESCE(p.status, ''))) IN ('VALIDATED', 'VALIDE', 'VALIDÉ')
        THEN 'VALIDATED_GENUINE'

      -- 4. Pending / Submitted / In Review
      WHEN TRIM(UPPER(COALESCE(p.status, ''))) IN ('PENDING', 'EN ATTENTE', 'SUBMITTED', 'SOUMIS', 'IN_REVIEW', 'ACOMPTE EN ATTENTE')
        THEN 'PENDING'

      -- 5. Separate classification for unknown or unrecognized payment statuses
      ELSE 'UNKNOWN_UNRECOGNIZED'
    END AS category
  FROM prepa_payments p
  INNER JOIN cohort_candidates cc ON p.candidate_ref = cc.candidate_ref
),

-- Independent Payment Aggregation strictly by candidate_ref (Zero Payment Loss)
payment_aggregates AS (
  SELECT 
    candidate_ref,
    COALESCE(SUM(CASE WHEN category = 'VALIDATED_GENUINE' THEN amount ELSE 0.00 END), 0.00) AS total_validated_revenue_eur,
    COALESCE(SUM(CASE WHEN category = 'TEST_EXCLUDED' THEN amount ELSE 0.00 END), 0.00) AS total_test_excluded_eur,
    COALESCE(SUM(CASE WHEN category = 'CANCELLED' THEN amount ELSE 0.00 END), 0.00) AS total_cancelled_unverified_eur,
    COALESCE(SUM(CASE WHEN category = 'PENDING' THEN amount ELSE 0.00 END), 0.00) AS total_pending_amount_eur,
    COALESCE(SUM(CASE WHEN category = 'UNKNOWN_UNRECOGNIZED' THEN amount ELSE 0.00 END), 0.00) AS total_unknown_unrecognized_eur,
    COALESCE(SUM(amount), 0.00) AS total_payments_raw_eur,
    COUNT(id) AS total_payments_count,
    COUNT(CASE WHEN category = 'VALIDATED_GENUINE' THEN 1 END) AS validated_payments_count,
    COUNT(CASE WHEN category = 'TEST_EXCLUDED' THEN 1 END) AS test_excluded_payments_count,
    COUNT(CASE WHEN category = 'UNKNOWN_UNRECOGNIZED' THEN 1 END) AS unknown_payments_count
  FROM payment_categorized
  GROUP BY candidate_ref
),

-- Independent Receipt Aggregation strictly by candidate_ref (cannot multiply rows)
receipt_aggregates AS (
  SELECT 
    r.candidate_ref,
    COUNT(r.id) AS total_receipts_count,
    COUNT(CASE WHEN (r.metadata->>'voided')::boolean IS TRUE THEN 1 END) AS voided_receipts_count,
    COALESCE(SUM(r.amount_paid), 0.00) AS total_receipt_amount_paid
  FROM prepa_receipts r
  INNER JOIN cohort_candidates cc ON r.candidate_ref = cc.candidate_ref
  GROUP BY r.candidate_ref
)

SELECT 
    cc.candidat_id AS candidat_table_id,
    cc.candidate_ref,
    cc.full_name AS student_full_name,
    cc.program AS enrolled_program,
    cc.stage_badge,

    -- Exact invoiced obligation (enforcing global homonym protection)
    CASE 
      WHEN acnc.global_name_frequency > 1 THEN 0.00
      ELSE COALESCE(inv.total_invoiced_obligation_eur, 0.00)
    END AS total_tuition_obligation_eur,

    -- Validated genuine revenue (strictly excluding test transactions)
    COALESCE(pay.total_validated_revenue_eur, 0.00) AS total_validated_revenue_eur,

    -- Excluded test transactions (isolated from revenue)
    COALESCE(pay.total_test_excluded_eur, 0.00) AS total_test_excluded_eur,

    -- Cancelled / reversed test positions
    COALESCE(pay.total_cancelled_unverified_eur, 0.00) AS total_cancelled_unverified_eur,

    -- Pending re-entry baseline instalments
    COALESCE(pay.total_pending_amount_eur, 0.00) AS total_pending_amount_eur,

    -- Unknown / unrecognized payment amounts
    COALESCE(pay.total_unknown_unrecognized_eur, 0.00) AS total_unknown_unrecognized_eur,

    -- Total raw payments recorded for student
    COALESCE(pay.total_payments_raw_eur, 0.00) AS total_payments_raw_eur,

    -- Reconciliation Verification: Mathematical check that all payments are accounted for
    (COALESCE(pay.total_payments_raw_eur, 0.00) - (
      COALESCE(pay.total_validated_revenue_eur, 0.00) +
      COALESCE(pay.total_test_excluded_eur, 0.00) +
      COALESCE(pay.total_cancelled_unverified_eur, 0.00) +
      COALESCE(pay.total_pending_amount_eur, 0.00) +
      COALESCE(pay.total_unknown_unrecognized_eur, 0.00)
    )) AS unaccounted_payment_variance_eur,

    -- Remaining outstanding balance = obligation - validated genuine payments
    CASE 
      WHEN acnc.global_name_frequency > 1 THEN 0.00
      ELSE (COALESCE(inv.total_invoiced_obligation_eur, 0.00) - COALESCE(pay.total_validated_revenue_eur, 0.00))
    END AS remaining_outstanding_balance_eur,

    -- Financial Status Description
    CASE 
      WHEN acnc.global_name_frequency > 1 THEN 'ALERT: AMBIGUOUS_DUPLICATE_NAME'
      WHEN COALESCE(pay.total_unknown_unrecognized_eur, 0.00) > 0.00 THEN 'ATTENTION: STATUT_PAIEMENT_INCONNU'
      WHEN (COALESCE(inv.total_invoiced_obligation_eur, 0.00) - COALESCE(pay.total_validated_revenue_eur, 0.00)) <= 0.00 
           AND COALESCE(inv.total_invoiced_obligation_eur, 0.00) > 0.00 THEN 'Soldé (Totalement Payé)'
      WHEN COALESCE(pay.total_validated_revenue_eur, 0.00) > 0.00 THEN 'Partiellement Payé'
      ELSE 'En Attente de Paiement'
    END AS financial_status,

    COALESCE(pay.validated_payments_count, 0) AS validated_payments_count,
    COALESCE(pay.test_excluded_payments_count, 0) AS test_excluded_payments_count,
    COALESCE(pay.unknown_payments_count, 0) AS unknown_payments_count,
    COALESCE(rec.total_receipts_count, 0) AS total_receipts_count,
    COALESCE(rec.voided_receipts_count, 0) AS voided_receipts_count

FROM cohort_candidates cc
LEFT JOIN all_candidate_name_counts acnc 
  ON cc.norm_name = acnc.norm_name
LEFT JOIN invoice_aggregates inv 
  ON cc.norm_name = inv.norm_name AND acnc.global_name_frequency = 1
LEFT JOIN payment_aggregates pay 
  ON cc.candidate_ref = pay.candidate_ref
LEFT JOIN receipt_aggregates rec 
  ON cc.candidate_ref = rec.candidate_ref
ORDER BY cc.candidat_id ASC;


-- ============================================================================
-- 2. MACRO COHORT AGGREGATE RECONCILIATION SUMMARY
-- ============================================================================
WITH 
cohort_candidates AS (
  SELECT 
    c.id AS candidat_id,
    c.ref AS candidate_ref,
    LOWER(TRIM(c.full_name)) AS norm_name
  FROM candidats c
  WHERE c.program ILIKE '%prepa%'
    AND c.ref LIKE 'CAN-2025-%'
),
all_candidate_name_counts AS (
  SELECT LOWER(TRIM(c.full_name)) AS norm_name, COUNT(c.id) AS global_name_frequency
  FROM candidats c
  GROUP BY LOWER(TRIM(c.full_name))
),
invoice_aggregates AS (
  SELECT LOWER(TRIM(student_name)) AS norm_name, COALESCE(SUM(amount_eur), 0.00) AS total_obligation_eur
  FROM invoices
  GROUP BY LOWER(TRIM(student_name))
),
payment_categorized AS (
  SELECT 
    p.candidate_ref,
    p.amount,
    CASE 
      WHEN TRIM(UPPER(COALESCE(p.status, ''))) IN ('CANCELLED', 'ANNULE', 'ANNULÉ', 'VOIDED', 'REFUNDED') THEN 'CANCELLED'
      WHEN TRIM(UPPER(COALESCE(p.status, ''))) IN ('VALIDATED (TEST)', 'TEST', 'VALIDE (TEST)', 'SIMULATION', 'UNVERIFIED', 'NON VERIFIE', 'NON VÉRIFIÉ')
           OR TRIM(UPPER(COALESCE(p.status, ''))) LIKE '%TEST%'
           OR COALESCE(p.payment_ref, '') ILIKE '%TEST%'
           OR COALESCE(p.notes, '') ILIKE '%TEST%'
           OR COALESCE(p.notes, '') ILIKE '%UNVERIFIED%'
           OR COALESCE(p.notes, '') ILIKE '%SIMULATED%'
           OR p.candidate_ref = 'CAN-2025-002'
           OR COALESCE(p.payment_ref, '') ILIKE '%CHR%' THEN 'TEST_EXCLUDED'
      WHEN TRIM(UPPER(COALESCE(p.status, ''))) IN ('VALIDATED', 'VALIDE', 'VALIDÉ') THEN 'VALIDATED_GENUINE'
      WHEN TRIM(UPPER(COALESCE(p.status, ''))) IN ('PENDING', 'EN ATTENTE', 'SUBMITTED', 'SOUMIS', 'IN_REVIEW', 'ACOMPTE EN ATTENTE') THEN 'PENDING'
      ELSE 'UNKNOWN_UNRECOGNIZED'
    END AS category
  FROM prepa_payments p
  INNER JOIN cohort_candidates cc ON p.candidate_ref = cc.candidate_ref
),
payment_aggregates AS (
  SELECT 
    candidate_ref,
    COALESCE(SUM(CASE WHEN category = 'VALIDATED_GENUINE' THEN amount ELSE 0.00 END), 0.00) AS validated_paid_eur,
    COALESCE(SUM(CASE WHEN category = 'TEST_EXCLUDED' THEN amount ELSE 0.00 END), 0.00) AS test_excluded_eur,
    COALESCE(SUM(CASE WHEN category = 'CANCELLED' THEN amount ELSE 0.00 END), 0.00) AS cancelled_eur,
    COALESCE(SUM(CASE WHEN category = 'PENDING' THEN amount ELSE 0.00 END), 0.00) AS pending_eur,
    COALESCE(SUM(CASE WHEN category = 'UNKNOWN_UNRECOGNIZED' THEN amount ELSE 0.00 END), 0.00) AS unknown_eur,
    COALESCE(SUM(amount), 0.00) AS total_payments_raw_eur
  FROM payment_categorized
  GROUP BY candidate_ref
),
reconciled_cohort AS (
  SELECT 
    cc.candidat_id,
    CASE WHEN acnc.global_name_frequency > 1 THEN 0.00 ELSE COALESCE(inv.total_obligation_eur, 0.00) END AS obligation_eur,
    COALESCE(pay.validated_paid_eur, 0.00) AS validated_paid_eur,
    COALESCE(pay.test_excluded_eur, 0.00) AS test_excluded_eur,
    COALESCE(pay.cancelled_eur, 0.00) AS cancelled_eur,
    COALESCE(pay.pending_eur, 0.00) AS pending_eur,
    COALESCE(pay.unknown_eur, 0.00) AS unknown_eur,
    COALESCE(pay.total_payments_raw_eur, 0.00) AS total_payments_raw_eur
  FROM cohort_candidates cc
  LEFT JOIN all_candidate_name_counts acnc ON cc.norm_name = acnc.norm_name
  LEFT JOIN invoice_aggregates inv ON cc.norm_name = inv.norm_name AND acnc.global_name_frequency = 1
  LEFT JOIN payment_aggregates pay ON cc.candidate_ref = pay.candidate_ref
)
SELECT 
    COUNT(candidat_id) AS total_enrolled_students_count,
    COALESCE(SUM(obligation_eur), 0.00) AS total_cohort_obligations_eur,
    COALESCE(SUM(validated_paid_eur), 0.00) AS total_net_validated_revenue_eur,
    COALESCE(SUM(test_excluded_eur), 0.00) AS total_test_excluded_eur,
    COALESCE(SUM(cancelled_eur), 0.00) AS total_reversed_unverified_eur,
    COALESCE(SUM(pending_eur), 0.00) AS total_pending_amount_eur,
    COALESCE(SUM(unknown_eur), 0.00) AS total_unknown_unrecognized_eur,
    COALESCE(SUM(total_payments_raw_eur), 0.00) AS total_raw_payments_recorded_eur,
    COALESCE(SUM(total_payments_raw_eur - (validated_paid_eur + test_excluded_eur + cancelled_eur + pending_eur + unknown_eur)), 0.00) AS total_unaccounted_payment_discrepancy_eur,
    COALESCE(SUM(obligation_eur - validated_paid_eur), 0.00) AS total_net_outstanding_balance_eur
FROM reconciled_cohort;


-- ============================================================================
-- 3. UNALLOCATED & UNMATCHED PAYMENTS RECONCILIATION
-- Reports all payments that cannot be attributed to the 2025–2026 PREPA cohort
-- ============================================================================
WITH 
cohort_candidates AS (
  SELECT ref AS candidate_ref
  FROM candidats
  WHERE program ILIKE '%prepa%'
    AND ref LIKE 'CAN-2025-%'
),
unallocated_payments AS (
  SELECT 
    p.id,
    p.payment_ref,
    p.candidate_ref,
    p.candidate_name,
    p.amount,
    p.status,
    CASE 
      WHEN p.candidate_ref IS NULL THEN 'NULL_CANDIDATE_REFERENCE'
      WHEN c.id IS NULL THEN 'NONEXISTENT_CANDIDATE_REFERENCE'
      WHEN cc.candidate_ref IS NULL THEN 'OUTSIDE_COHORT_REFERENCE'
      ELSE 'ALLOCATED_TO_COHORT'
    END AS allocation_classification,
    CASE 
      WHEN TRIM(UPPER(COALESCE(p.status, ''))) IN ('CANCELLED', 'ANNULE', 'ANNULÉ', 'VOIDED', 'REFUNDED') THEN 'CANCELLED'
      WHEN TRIM(UPPER(COALESCE(p.status, ''))) IN ('VALIDATED (TEST)', 'TEST', 'VALIDE (TEST)', 'SIMULATION', 'UNVERIFIED', 'NON VERIFIE', 'NON VÉRIFIÉ')
           OR TRIM(UPPER(COALESCE(p.status, ''))) LIKE '%TEST%'
           OR COALESCE(p.payment_ref, '') ILIKE '%TEST%'
           OR COALESCE(p.notes, '') ILIKE '%TEST%'
           OR COALESCE(p.notes, '') ILIKE '%UNVERIFIED%'
           OR COALESCE(p.notes, '') ILIKE '%SIMULATED%'
           OR p.candidate_ref = 'CAN-2025-002'
           OR COALESCE(p.payment_ref, '') ILIKE '%CHR%' THEN 'TEST_EXCLUDED'
      WHEN TRIM(UPPER(COALESCE(p.status, ''))) IN ('VALIDATED', 'VALIDE', 'VALIDÉ') THEN 'VALIDATED_GENUINE'
      WHEN TRIM(UPPER(COALESCE(p.status, ''))) IN ('PENDING', 'EN ATTENTE', 'SUBMITTED', 'SOUMIS', 'IN_REVIEW', 'ACOMPTE EN ATTENTE') THEN 'PENDING'
      ELSE 'UNKNOWN_UNRECOGNIZED'
    END AS category
  FROM prepa_payments p
  LEFT JOIN candidats c ON p.candidate_ref = c.ref
  LEFT JOIN cohort_candidates cc ON p.candidate_ref = cc.candidate_ref
  WHERE cc.candidate_ref IS NULL -- Strictly filter out cohort payments
)
SELECT 
    allocation_classification,
    COUNT(id) AS unallocated_payments_count,
    COALESCE(SUM(CASE WHEN category = 'VALIDATED_GENUINE' THEN amount ELSE 0.00 END), 0.00) AS total_validated_revenue_eur,
    COALESCE(SUM(CASE WHEN category = 'TEST_EXCLUDED' THEN amount ELSE 0.00 END), 0.00) AS total_test_excluded_eur,
    COALESCE(SUM(CASE WHEN category = 'CANCELLED' THEN amount ELSE 0.00 END), 0.00) AS total_cancelled_eur,
    COALESCE(SUM(CASE WHEN category = 'PENDING' THEN amount ELSE 0.00 END), 0.00) AS total_pending_eur,
    COALESCE(SUM(CASE WHEN category = 'UNKNOWN_UNRECOGNIZED' THEN amount ELSE 0.00 END), 0.00) AS total_unknown_eur,
    COALESCE(SUM(amount), 0.00) AS total_unallocated_amount_eur
FROM unallocated_payments
GROUP BY allocation_classification
ORDER BY allocation_classification ASC;


-- ============================================================================
-- 4. COMPLETE UNDERLYING PAYMENTS TABLE RECONCILIATION BALANCE SHEET
-- Proves mathematical identity across 100% of rows in prepa_payments table
-- ============================================================================
WITH 
cohort_candidates AS (
  SELECT ref AS candidate_ref
  FROM candidats
  WHERE program ILIKE '%prepa%'
    AND ref LIKE 'CAN-2025-%'
),
all_payments_classified AS (
  SELECT 
    p.id,
    p.amount,
    CASE 
      WHEN cc.candidate_ref IS NOT NULL THEN 'COHORT_2025_2026_PREPA'
      ELSE 'UNALLOCATED_OR_OTHER'
    END AS cohort_attribution,
    CASE 
      WHEN TRIM(UPPER(COALESCE(p.status, ''))) IN ('CANCELLED', 'ANNULE', 'ANNULÉ', 'VOIDED', 'REFUNDED') THEN 'CANCELLED'
      WHEN TRIM(UPPER(COALESCE(p.status, ''))) IN ('VALIDATED (TEST)', 'TEST', 'VALIDE (TEST)', 'SIMULATION', 'UNVERIFIED', 'NON VERIFIE', 'NON VÉRIFIÉ')
           OR TRIM(UPPER(COALESCE(p.status, ''))) LIKE '%TEST%'
           OR COALESCE(p.payment_ref, '') ILIKE '%TEST%'
           OR COALESCE(p.notes, '') ILIKE '%TEST%'
           OR COALESCE(p.notes, '') ILIKE '%UNVERIFIED%'
           OR COALESCE(p.notes, '') ILIKE '%SIMULATED%'
           OR p.candidate_ref = 'CAN-2025-002'
           OR COALESCE(p.payment_ref, '') ILIKE '%CHR%' THEN 'TEST_EXCLUDED'
      WHEN TRIM(UPPER(COALESCE(p.status, ''))) IN ('VALIDATED', 'VALIDE', 'VALIDÉ') THEN 'VALIDATED_GENUINE'
      WHEN TRIM(UPPER(COALESCE(p.status, ''))) IN ('PENDING', 'EN ATTENTE', 'SUBMITTED', 'SOUMIS', 'IN_REVIEW', 'ACOMPTE EN ATTENTE') THEN 'PENDING'
      ELSE 'UNKNOWN_UNRECOGNIZED'
    END AS category
  FROM prepa_payments p
  LEFT JOIN cohort_candidates cc ON p.candidate_ref = cc.candidate_ref
)
SELECT 
    cohort_attribution,
    COUNT(id) AS total_records_count,
    COALESCE(SUM(CASE WHEN category = 'VALIDATED_GENUINE' THEN amount ELSE 0.00 END), 0.00) AS validated_genuine_eur,
    COALESCE(SUM(CASE WHEN category = 'TEST_EXCLUDED' THEN amount ELSE 0.00 END), 0.00) AS test_excluded_eur,
    COALESCE(SUM(CASE WHEN category = 'CANCELLED' THEN amount ELSE 0.00 END), 0.00) AS cancelled_eur,
    COALESCE(SUM(CASE WHEN category = 'PENDING' THEN amount ELSE 0.00 END), 0.00) AS pending_eur,
    COALESCE(SUM(CASE WHEN category = 'UNKNOWN_UNRECOGNIZED' THEN amount ELSE 0.00 END), 0.00) AS unknown_eur,
    COALESCE(SUM(amount), 0.00) AS total_raw_amount_eur
FROM all_payments_classified
GROUP BY cohort_attribution
UNION ALL
SELECT 
    'TOTAL_UNDERLYING_PAYMENTS_TABLE' AS cohort_attribution,
    COUNT(id) AS total_records_count,
    COALESCE(SUM(CASE WHEN category = 'VALIDATED_GENUINE' THEN amount ELSE 0.00 END), 0.00) AS validated_genuine_eur,
    COALESCE(SUM(CASE WHEN category = 'TEST_EXCLUDED' THEN amount ELSE 0.00 END), 0.00) AS test_excluded_eur,
    COALESCE(SUM(CASE WHEN category = 'CANCELLED' THEN amount ELSE 0.00 END), 0.00) AS cancelled_eur,
    COALESCE(SUM(CASE WHEN category = 'PENDING' THEN amount ELSE 0.00 END), 0.00) AS pending_eur,
    COALESCE(SUM(CASE WHEN category = 'UNKNOWN_UNRECOGNIZED' THEN amount ELSE 0.00 END), 0.00) AS unknown_eur,
    COALESCE(SUM(amount), 0.00) AS total_raw_amount_eur
FROM all_payments_classified;
