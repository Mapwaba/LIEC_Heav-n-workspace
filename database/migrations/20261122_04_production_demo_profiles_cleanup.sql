-- LIEC Heav'n — Production Demonstration Profile Cleanup Script (Corrected)
-- WORKSTREAM 1.1: Complete Removal of Record A & Record B
-- Target: Production Database (EXECUTED ONLY UPON EXPLICIT OPERATOR AUTHORIZATION)
--
-- Target Record A:
--   candidats.id = 27 (ref = 'CAN-2025-056', full_name = 'NOUVEAU CANDIDAT', email = 'contact@exemple.com')
--   demandes.id = 42 (ref = 'DEM-2025-102', full_name = 'NOUVEAU CANDIDAT', email = 'contact@exemple.com')
-- Target Record B:
--   candidats.id = 14 (ref = 'CAN-2025-043', full_name = 'JACKY NTORO MAPWABA', email = 'lyonntoro33@gmail.com')
--   demandes.id = 28 (ref = 'DEM-2025-089', full_name = 'JACKY NTORO MAPWABA', email = 'lyonntoro33@gmail.com')
--   parent_student_links.id IN (35, 36)

BEGIN;

DO $$
DECLARE
  v_del_notes INT := 0;
  v_del_links INT := 0;
  v_del_demandes INT := 0;
  v_del_candidats INT := 0;
  
  -- Pre-check dependency counters
  v_dep_payments INT := 0;
  v_dep_receipts INT := 0;
  v_dep_invoices INT := 0;
  v_dep_avi INT := 0;
  v_dep_accommodation INT := 0;
  v_dep_prospects INT := 0;

  -- Post-deletion remaining counters
  v_remaining_candidats INT;
  v_remaining_demandes INT;
  v_remaining_notes INT;
  v_remaining_links INT;
BEGIN
  -- 1. PRE-CHECK: COMPREHENSIVE DEPENDENCY VERIFICATION ACROSS ALL TABLES
  -- Ensure that target demo profiles have zero active dependencies in financial, AVI, accommodation, or prospect tables.
  SELECT COUNT(*) INTO v_dep_payments
  FROM prepa_payments
  WHERE candidate_name ILIKE '%NOUVEAU CANDIDAT%' OR candidate_name ILIKE '%JACKY NTORO%'
     OR candidate_email IN ('contact@exemple.com', 'lyonntoro33@gmail.com');

  SELECT COUNT(*) INTO v_dep_receipts
  FROM prepa_receipts
  WHERE candidate_name ILIKE '%NOUVEAU CANDIDAT%' OR candidate_name ILIKE '%JACKY NTORO%';

  SELECT COUNT(*) INTO v_dep_invoices
  FROM invoices
  WHERE student_name ILIKE '%NOUVEAU CANDIDAT%' OR student_name ILIKE '%JACKY NTORO%';

  SELECT COUNT(*) INTO v_dep_avi
  FROM avi_requests
  WHERE student_name ILIKE '%NOUVEAU CANDIDAT%' OR student_name ILIKE '%JACKY NTORO%'
     OR parent_name ILIKE '%JACKY NTORO%';

  SELECT COUNT(*) INTO v_dep_accommodation
  FROM accommodation_requests
  WHERE student_name ILIKE '%NOUVEAU CANDIDAT%' OR student_name ILIKE '%JACKY NTORO%'
     OR student_email IN ('contact@exemple.com', 'lyonntoro33@gmail.com')
     OR parent_name ILIKE '%JACKY NTORO%';

  SELECT COUNT(*) INTO v_dep_prospects
  FROM prospects
  WHERE full_name ILIKE '%NOUVEAU CANDIDAT%' OR full_name ILIKE '%JACKY NTORO%';

  IF v_dep_payments > 0 OR v_dep_receipts > 0 OR v_dep_invoices > 0 OR v_dep_avi > 0 OR v_dep_accommodation > 0 OR v_dep_prospects > 0 THEN
    RAISE EXCEPTION 'CLEANUP ABORTED: Unexpected active dependencies detected for demo targets. Payments: %, Receipts: %, Invoices: %, AVI: %, Accommodation: %, Prospects: %',
      v_dep_payments, v_dep_receipts, v_dep_invoices, v_dep_avi, v_dep_accommodation, v_dep_prospects;
  END IF;

  -- 2. ORDERED DELETION OF EXCLUSIVELY ASSOCIATED RECORDS
  
  -- Step 2a: Delete exclusively associated demande_notes
  DELETE FROM demande_notes
  WHERE demande_ref IN ('DEM-2025-102', '#DEM-2025-102', 'DEM-2025-089', '#DEM-2025-089');
  GET DIAGNOSTICS v_del_notes = ROW_COUNT;

  -- Step 2b: Delete exclusively associated parent-student links
  DELETE FROM parent_student_links
  WHERE (id IN (35, 36) AND (student_name ILIKE '%JACKY NTORO%' OR parent_name ILIKE '%JACKY NTORO%'))
     OR (student_name ILIKE '%NOUVEAU CANDIDAT%' OR student_email = 'contact@exemple.com');
  GET DIAGNOSTICS v_del_links = ROW_COUNT;

  -- Step 2c: Delete dependent application records
  DELETE FROM demandes
  WHERE id IN (42, 28)
    AND (full_name ILIKE '%NOUVEAU CANDIDAT%' OR full_name ILIKE '%JACKY NTORO%' OR email IN ('contact@exemple.com', 'lyonntoro33@gmail.com'));
  GET DIAGNOSTICS v_del_demandes = ROW_COUNT;

  -- Step 2d: Delete candidate records
  DELETE FROM candidats
  WHERE id IN (27, 14)
    AND (full_name ILIKE '%NOUVEAU CANDIDAT%' OR full_name ILIKE '%JACKY NTORO%' OR email IN ('contact@exemple.com', 'lyonntoro33@gmail.com'));
  GET DIAGNOSTICS v_del_candidats = ROW_COUNT;

  -- 3. ASSERTIONS: VERIFY EXACT EXPECTED DELETION COUNTS
  IF v_del_candidats != 2 THEN
    RAISE EXCEPTION 'CLEANUP ABORTED: Expected exactly 2 candidats deleted, but % were deleted.', v_del_candidats;
  END IF;

  IF v_del_demandes != 2 THEN
    RAISE EXCEPTION 'CLEANUP ABORTED: Expected exactly 2 demandes deleted, but % were deleted.', v_del_demandes;
  END IF;

  IF v_del_links != 2 THEN
    RAISE EXCEPTION 'CLEANUP ABORTED: Expected exactly 2 parent_student_links deleted, but % were deleted.', v_del_links;
  END IF;

  -- 4. ASSERTIONS: VERIFY NO ORPHANED TARGET RECORDS REMAIN
  SELECT COUNT(*) INTO v_remaining_candidats FROM candidats WHERE id IN (27, 14);
  SELECT COUNT(*) INTO v_remaining_demandes FROM demandes WHERE id IN (42, 28);
  SELECT COUNT(*) INTO v_remaining_notes FROM demande_notes WHERE demande_ref IN ('DEM-2025-102', '#DEM-2025-102', 'DEM-2025-089', '#DEM-2025-089');
  SELECT COUNT(*) INTO v_remaining_links FROM parent_student_links WHERE id IN (35, 36) OR student_name ILIKE '%NOUVEAU CANDIDAT%' OR student_name ILIKE '%JACKY NTORO%';

  IF v_remaining_candidats > 0 OR v_remaining_demandes > 0 OR v_remaining_notes > 0 OR v_remaining_links > 0 THEN
    RAISE EXCEPTION 'CLEANUP ABORTED: Incomplete deletion. Remaining counts - Candidats: %, Demandes: %, Notes: %, Links: %',
      v_remaining_candidats, v_remaining_demandes, v_remaining_notes, v_remaining_links;
  END IF;

  -- 5. RECORD AUDIT EVENT
  INSERT INTO audit_logs (actor, action, entity_ref, outcome, details, created_at)
  VALUES (
    'operator@liecconsulting.com',
    'Production demo profile cleanup completed',
    '#DEM-2025-102, #DEM-2025-089',
    'Succès',
    format('Deleted %s notes, %s parent links, %s demandes, %s candidats.', v_del_notes, v_del_links, v_del_demandes, v_del_candidats),
    NOW()
  );

END $$;

COMMIT;
