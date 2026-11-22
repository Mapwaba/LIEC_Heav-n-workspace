-- LIEC Heav'n — Rollback Script for Demonstration Profile Cleanup
-- WORKSTREAM 1.1: Restores Record A & Record B if necessary

BEGIN;

-- 1. Restore candidats
INSERT INTO candidats (
  id, ref, initials, full_name, program, cities, civility, manager,
  statut, color, progression, label, tcf_status, email, phone,
  pays_origine, nationalite, diplome_obtenu, certif_langue, garants,
  date_admission, admission_status, notes, pieces_jointes, voeux,
  annee_universitaire, version, updated_at
) VALUES 
(
  27, 'CAN-2025-056', 'NC', 'NOUVEAU CANDIDAT', 'Master en Management International', 'Lyon', 'Monsieur', 'Admin LIEC',
  'En cours', 'blue', 30, 'Dossier en cours', 'Non requis', 'candidat.demo@liecconsulting.com', '+243 81 000 0056',
  'RDC', 'Congolaise (RDC)', 'Licence', 'B2', 'Parent',
  NOW(), 'Admis', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
  '2025-2026', 1, NOW()
),
(
  14, 'CAN-2025-043', 'JN', 'JACKY NTORO MAPWABA', 'Licence en Informatique Appliquée', 'Lyon', 'Madame', 'Admin LIEC',
  'En cours', 'green', 50, 'Dossier complet', 'B2', 'jacky.demo@liecconsulting.com', '+243 81 000 0043',
  'RDC', 'Congolaise (RDC)', 'Baccalauréat', 'B2', 'Parent',
  NOW(), 'Admis', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
  '2025-2026', 1, NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 2. Restore demandes
INSERT INTO demandes (
  id, reference, full_name, email, phone, country, town,
  program, expected_start, status, created_at
) VALUES
(
  42, 'DEM-2025-102', 'NOUVEAU CANDIDAT', 'candidat.demo@liecconsulting.com', '+243 81 000 0056', 'RDC', 'Kinshasa',
  'Master en Management International', '2025-09-01', 'PROCESSED', NOW()
),
(
  28, 'DEM-2025-089', 'JACKY NTORO MAPWABA', 'jacky.demo@liecconsulting.com', '+243 81 000 0043', 'RDC', 'Kinshasa',
  'Licence en Informatique Appliquée', '2025-09-01', 'PROCESSED', NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 3. Restore parent-student links for Record B
INSERT INTO parent_student_links (
  id, parent_name, student_name, student_program, student_email, parent_phone, created_at
) VALUES
(
  35, 'JACKY NTORO MAPWABA (PARENT)', 'JACKY NTORO MAPWABA', 'Licence en Informatique Appliquée', 'jacky.demo@liecconsulting.com', '+243 81 000 0043', NOW()
),
(
  36, 'JACKY NTORO MAPWABA (PARENT 2)', 'JACKY NTORO MAPWABA', 'Licence en Informatique Appliquée', 'jacky.demo@liecconsulting.com', '+243 81 000 0043', NOW()
)
ON CONFLICT (id) DO NOTHING;

COMMIT;
