-- LIEC Heav'n — Production Demonstration Profile Cleanup Script
-- WORKSTREAM 1.1: Removal of Record A & Record B
-- Target: Production Database (EXECUTED ONLY UPON EXPLICIT OPERATOR AUTHORIZATION)
--
-- Record A:
--   candidats.id = 27 (ref = 'CAN-2025-056', full_name = 'NOUVEAU CANDIDAT')
--   demandes.id = 42 (reference = 'DEM-2025-102', full_name = 'NOUVEAU CANDIDAT')
-- Record B:
--   candidats.id = 14 (ref = 'CAN-2025-043', full_name = 'JACKY NTORO MAPWABA')
--   demandes.id = 28 (reference = 'DEM-2025-089', full_name = 'JACKY NTORO MAPWABA')
--   parent_student_links.id IN (35, 36)

BEGIN;

-- 1. Remove parent-student links for Record B (Jacky Ntoto Mapwaba)
DELETE FROM parent_student_links
WHERE id IN (35, 36)
  AND (student_name ILIKE '%JACKY NTORO%' OR parent_name ILIKE '%JACKY NTORO%');

-- 2. Remove dependent application records for Record A & B
DELETE FROM demandes
WHERE id IN (42, 28)
  AND (full_name ILIKE '%NOUVEAU CANDIDAT%' OR full_name ILIKE '%JACKY NTORO%');

-- 3. Remove candidate records for Record A & B
DELETE FROM candidats
WHERE id IN (27, 14)
  AND (full_name ILIKE '%NOUVEAU CANDIDAT%' OR full_name ILIKE '%JACKY NTORO%');

-- Note: In accordance with explicit authorization, demo profile removal is performed
-- without residual audit logs for the two identified demo records.

COMMIT;
