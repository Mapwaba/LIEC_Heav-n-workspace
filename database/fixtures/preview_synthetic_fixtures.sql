-- ============================================================================
-- LIEC Heav'n — Dedicated Preview Database Synthetic Fixtures
-- Option C: Schema-Only Preview Database with Zero-PII Synthetic Fixtures
-- ============================================================================
-- IMPORTANT NOTICE:
-- All records in this file are completely fictional and synthetic.
-- They contain NO personal identifiable information (PII) from live applicants,
-- students, parents, partners, or staff.
-- All financial records are marked explicitly as test simulations.
-- ============================================================================

-- 1. Ensure Technical Roles are Present
INSERT INTO roles (role_id, role_name, business_profile, description, safeguards, active) VALUES
  ('admin', 'Platform Administrator', 'Admin', 'Highest privilege. Test admin persona.', 'Assign only to trusted administrators.', TRUE),
  ('lh_security_admin', 'Security Administrator', 'Admin', 'Security administration persona.', 'Limit access to security configuration.', TRUE),
  ('secretary', 'Secretary (Admissions & Intake)', 'Secretary', 'Intake officer and applicant management.', 'Limit to applicant registration and admissions tracking.', TRUE),
  ('ITIL', 'ITIL Workflow Operator', 'Secretary', 'Administrative workflows and applicant tracking.', 'Verify permissions and inherited access.', TRUE),
  ('lh_internal', 'Internal Application Access', 'Secretary', 'Internal intake and assigned records access.', 'Restrict to intake, comments, and history.', TRUE),
  ('avi', 'Finance Officer (Blocked Account / AVI)', 'Finance Officer', 'Blocked account and loan verification operator.', 'Restrict to AVI desk operations.', TRUE),
  ('lh_finance', 'Finance & AVI Officer', 'Finance Officer', 'AVI, parent-financing, and desk calculation operations.', 'Restrict to finance and AVI workflows.', TRUE)
ON CONFLICT (role_id) DO NOTHING;

-- 2. Role Session Timeouts
INSERT INTO role_session_timeouts (role_id, role_name, business_profile, timeout_minutes, updated_by) VALUES
  ('admin', 'Platform Administrator', 'Admin', 15, 'Preview Fixture Initializer'),
  ('lh_security_admin', 'Security Administrator', 'Admin', 15, 'Preview Fixture Initializer'),
  ('secretary', 'Secretary (Admissions & Intake)', 'Secretary', 20, 'Preview Fixture Initializer'),
  ('ITIL', 'ITIL Workflow Operator', 'Secretary', 20, 'Preview Fixture Initializer'),
  ('lh_internal', 'Internal Application Access', 'Secretary', 20, 'Preview Fixture Initializer'),
  ('avi', 'Finance Officer (Blocked Account / AVI)', 'Finance Officer', 15, 'Preview Fixture Initializer'),
  ('lh_finance', 'Finance & AVI Officer', 'Finance Officer', 15, 'Preview Fixture Initializer')
ON CONFLICT (role_id) DO NOTHING;

-- 3. Synthetic Staff and Test Users
INSERT INTO users (name, first_name, last_name, user_id, email, business_profile, role, title, initials, active, password_hash, password_salt, must_change_password) VALUES
  ('Admin Test (Preview)', 'Admin', 'Preview', 'admin.preview', 'admin.preview@staging.liecconsulting.com', 'Admin', 'admin', 'Platform Administrator (Preview Test)', 'AP', TRUE, NULL, NULL, TRUE),
  ('Awa Diallo (Test Preview)', 'Awa', 'Diallo', 'awa.diallo.preview', 'secretaire.test@staging.liecconsulting.com', 'Secretary', 'secretary', 'Admissions Intake Officer (Test)', 'AD', TRUE, NULL, NULL, FALSE),
  ('Moussa Fofana (Test Preview)', 'Moussa', 'Fofana', 'moussa.fofana.preview', 'finance.test@staging.liecconsulting.com', 'Finance Officer', 'avi', 'Finance & AVI Desk Operator (Test)', 'MF', TRUE, NULL, NULL, FALSE),
  ('Jean-Luc Moreau (Test Preview)', 'Jean-Luc', 'Moreau', 'jeanluc.moreau.preview', 'conseiller.test@staging.liecconsulting.com', 'Secretary', 'ITIL', 'Academic Advisor & CRM Operator (Test)', 'JM', TRUE, NULL, NULL, FALSE),
  ('Christian Ndombe (Test Preview)', 'Christian', 'Ndombe', 'christian.ndombe.preview', 'etudiant.test@staging.liecconsulting.com', 'Student', 'student', 'Student / Candidate (Test)', 'CN', TRUE, NULL, NULL, FALSE),
  ('Honore Ndombe (Test Preview)', 'Honore', 'Ndombe', 'honore.ndombe.preview', 'parent.test@staging.liecconsulting.com', 'Parent', 'parent', 'Parent / Guarantor (Test)', 'HN', TRUE, NULL, NULL, FALSE)
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  user_id = EXCLUDED.user_id,
  business_profile = EXCLUDED.business_profile,
  role = EXCLUDED.role,
  title = EXCLUDED.title,
  initials = EXCLUDED.initials,
  active = TRUE;

-- 4. User Role Assignments
INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT u.id, r.role_id, 'Preview Fixture Initializer'
FROM (
  VALUES
    ('admin.preview@staging.liecconsulting.com', 'admin'),
    ('admin.preview@staging.liecconsulting.com', 'lh_security_admin'),
    ('secretaire.test@staging.liecconsulting.com', 'secretary'),
    ('secretaire.test@staging.liecconsulting.com', 'ITIL'),
    ('secretaire.test@staging.liecconsulting.com', 'lh_internal'),
    ('finance.test@staging.liecconsulting.com', 'avi'),
    ('finance.test@staging.liecconsulting.com', 'lh_finance'),
    ('conseiller.test@staging.liecconsulting.com', 'ITIL'),
    ('conseiller.test@staging.liecconsulting.com', 'lh_internal')
) AS r(email, role_id)
JOIN users u ON LOWER(u.email) = LOWER(r.email)
ON CONFLICT (user_id, role_id) DO NOTHING;

-- 5. Synthetic Prepa Cohort
INSERT INTO prepa_cohorts (code, name, campus, start_date, enrolled_count, capacity, lead_instructor, status)
VALUES
  ('PREPA-PARIS-TEST-2026', 'Cohorte PREPA Test Preview Paris', 'Campus Paris (Simulation)', '01 Octobre 2026', 1, 30, 'Professeur Simulation (Test)', 'Inscriptions ouvertes')
ON CONFLICT (code) DO NOTHING;

-- 6. Synthetic Candidate / Student Record (#CAN-2026-001)
INSERT INTO candidats (
  ref, initials, full_name, avatar_url, program, cities, sexe, adviser, stage_badge, stage_badge_tone,
  progress_pct, status_left, status_right, email, phone, parent_full_name, parent_phone, parent_email,
  parent_relation, graduation_year, current_activity, final_year_university, country, nationality,
  current_diploma, tcf_score, application_year, qualification_status, visa_status, registration_completed,
  first_instalment_paid, first_instalment_amount, first_instalment_ref, admission_status, procedure_status,
  description, comments, jalons_json, voeux_json, notes_json, pieces_json
) VALUES (
  '#CAN-2026-001', 'CN', 'Christian Ndombe (Test Preview)', NULL, 'LIEC-France PREPA', 'Paris, Lyon', 'Male',
  'Jean-Luc Moreau (Test Preview)', 'Inscrit (Test)', 'teal', 80, 'Dossier à 80%', 'Campus France Validé',
  'etudiant.test@staging.liecconsulting.com', '+33 6 00 00 00 01', 'Honore Ndombe (Test Preview)',
  '+33 6 00 00 00 02', 'parent.test@staging.liecconsulting.com', 'Parent', '2025', 'Étudiant Test',
  'UNIKIN', 'France (Test Preview)', 'Congolaise (RDC)', 'Licence Informatique (Simulation)',
  'TCF B2 (540 pts) certifié test', '2026–2027', 'QUALIFIED', 'CAMPUS_FRANCE_SUBMITTED', TRUE,
  TRUE, 500.00, 'TEST-INST-2026-001', 'Admis — École Partenaire Paris (Test)', 'Jalon 3 — Logement & Visa',
  'Fictional synthetic candidate profile prepared for isolated Vercel Preview testing.',
  'Dossier de test synthétique - Aucune donnée réelle.',
  '[]', '[]', '[]', '[]'
)
ON CONFLICT (ref) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  parent_full_name = EXCLUDED.parent_full_name,
  parent_email = EXCLUDED.parent_email,
  registration_completed = TRUE,
  qualification_status = 'QUALIFIED';

-- 7. Synthetic Demande / New Applicant (#DEM-2026-001)
INSERT INTO demandes (
  ref, initials, full_name, email, phone, parent_full_name, parent_phone, graduation_year,
  current_activity, final_year_university, whatsapp_verified, country_code, flag, country_name,
  city, nationality, sexe, program, service_pole, target_cities, current_level, budget_range,
  status, adviser, expected_start, message, submitted_at, is_dashboard_recent, is_archived,
  eligibility_status, registration_completed
) VALUES (
  '#DEM-2026-001', 'SC', 'Synthetique Candidat (Test Preview)', 'candidat.test@staging.liecconsulting.com',
  '+33 6 00 00 00 03', 'Parent Candidat (Test)', '+33 6 00 00 00 04', '2025', 'Étudiant Licence 3',
  'UCAD', TRUE, 'SN', '🇸🇳', 'Sénégal', 'Dakar', 'Sénégalaise', 'Male',
  'Master Management International', 'Enseignement Supérieur', 'Paris, Lyon', 'Licence 3 - Mention Bien',
  '8 500 € – 10 000 € / an', 'Nouvelle', 'Jean-Luc Moreau (Test Preview)', 'Septembre 2026',
  'Demande synthétique d''admission soumise en environnement de prévisualisation sécurisé.',
  'Soumis le 01 Novembre 2026 à 10:00 (Simulation)', TRUE, FALSE, 'ELIGIBLE', FALSE
)
ON CONFLICT (ref) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  status = EXCLUDED.status,
  eligibility_status = 'ELIGIBLE';

-- 8. Synthetic CRM Prospect (#PRO-2026-001)
INSERT INTO prospects (
  full_name, stage, badge_text, badge_tone, flag, country_city, program_tag, program_tag_tone,
  highlight_box, meta_left, meta_right, meta_right_tone, adviser_initials, adviser_name, adviser_color,
  estimated_value, is_urgent, is_prepa, lead_source, eligibility_status, qualification_completed
)
SELECT
  'Synthetique Prospect (Test Preview)', 'qualifie', 'Lead CRM Qualifié (Test)', 'neutral', '🇨🇮',
  'Abidjan, Côte d''Ivoire', 'Bachelor Informatique', 'blue', 'Simulation Prospect CRM',
  'Entrant Web (Simulation)', 'Test Preview', 'teal', 'JM', 'Jean-Luc Moreau (Test Preview)',
  'navy', 1800, FALSE, TRUE, 'TEST_PREVIEW_FORM', 'ELIGIBLE', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM prospects WHERE full_name = 'Synthetique Prospect (Test Preview)'
);

-- 9. Parent-Student Link
INSERT INTO parent_student_links (parent_name, parent_phone, student_name, student_email, student_program, source)
VALUES (
  'Honore Ndombe (Test Preview)', '+33 6 00 00 00 02', 'Christian Ndombe (Test Preview)',
  'etudiant.test@staging.liecconsulting.com', 'LIEC-France PREPA', 'preview_synthetic_fixture'
)
ON CONFLICT (parent_name, student_name) DO NOTHING;

-- 10. Synthetic Accommodation Request (#ACC-2026-001)
INSERT INTO accommodation_requests (
  ref, student_ref, student_name, student_email, student_phone, student_nationality, student_location,
  parent_name, parent_phone, parent_email, parent_relation, preferred_location, accommodation_type,
  arrival_date, departure_date, budget, special_requirements, status, assigned_agent, partner_name,
  attachments_json, notes, history_json
) VALUES (
  '#ACC-2026-001', '#CAN-2026-001', 'Christian Ndombe (Test Preview)', 'etudiant.test@staging.liecconsulting.com',
  '+33 6 00 00 00 01', 'Congolaise (RDC)', 'Paris', 'Honore Ndombe (Test Preview)', '+33 6 00 00 00 02',
  'parent.test@staging.liecconsulting.com', 'Père', 'Paris 13e (Proximité Métro)', 'Studio meublé',
  '2026-09-01', '2027-06-30', '750 € / mois (TEST DATA)', 'Proche bibliothèque universitaire et transports.',
  'Partenaire contacté (Test)', 'Jean-Luc Moreau (Test Preview)', 'Adele Logement Étudiant (Test Preview)',
  '[]', 'Dossier logement synthétique pour les tests de prévisualisation.',
  '[{"event":"FIXTURE_CREATED","at":"2026-11-01T10:00:00Z","by":"Preview Fixture Initializer"}]'
)
ON CONFLICT (ref) DO UPDATE SET
  student_name = EXCLUDED.student_name,
  status = EXCLUDED.status;

-- 11. Synthetic AVI Request (#AVI-2026-001)
INSERT INTO avi_requests (
  ref, parent_name, country, town, nationality, occupation, phone, email, other_guarantor,
  expected_start, student_name, student_program, student_id_doc, student_ref, principal_eur,
  principal_usd, principal_xaf, interest_rate, duration_months, total_interest_eur, liec_fee_usd,
  files_count, supporting_docs, status
) VALUES (
  '#AVI-2026-001', 'Honore Ndombe (Test Preview)', 'France (Simulation)', 'Paris', 'Congolaise (RDC)',
  'Cadre Administratif (Test)', '+33 6 00 00 00 02', 'parent.test@staging.liecconsulting.com', FALSE,
  'Septembre 2026', 'Christian Ndombe (Test Preview)', 'LIEC-France PREPA', 'PASSPORT-TEST-001',
  '#CAN-2026-001', 7380.00, 8021.74, 4841000.00, 12.00, 8, 885.60, 150.00, 3,
  'TEST-SIMULATED-DOCUMENTS', 'Dossier Conforme (TEST SIMULATION)'
)
ON CONFLICT (ref) DO UPDATE SET
  student_name = EXCLUDED.student_name,
  status = EXCLUDED.status;

-- 12. Synthetic Financial Records (Invoices, Prepa Payments, Receipts)
INSERT INTO invoices (ref, student_name, service_label, amount_eur, paid_eur, recipient, status, issued_date)
VALUES
  ('INV-TEST-2026-001', 'Christian Ndombe (Test Preview)', 'Frais d''inscription PREPA (TEST DATA)', 500.00, 500.00, 'LIEC Education', 'Payé (TEST)', '01/11/2026')
ON CONFLICT (ref) DO NOTHING;

INSERT INTO prepa_payments (
  payment_ref, candidate_ref, candidate_name, candidate_email, academic_intake, program,
  instalment_number, instalment_label, instalment_percentage, amount, payment_method,
  transaction_ref, status, validated_by, validated_at, notes
) VALUES (
  'TEST-PAY-2026-001', '#CAN-2026-001', 'Christian Ndombe (Test Preview)', 'etudiant.test@staging.liecconsulting.com',
  '2026–2027', 'LIEC-France PREPA', 1, 'Acompte 10% (TEST SIMULATION)', 10.00, 500.00,
  'Bank Wire (Virement Test)', 'TEST-WIRE-REF-001', 'Validated (TEST)', 'Moussa Fofana (Test Preview)',
  CURRENT_TIMESTAMP, 'SIMULATED TEST PAYMENT - NO ACTUAL FINANCIAL TRANSACTION OCCURRED'
)
ON CONFLICT (payment_ref) DO NOTHING;

INSERT INTO prepa_receipts (
  receipt_number, payment_ref, candidate_ref, candidate_name, instalment_number, amount_paid,
  cumulative_paid, outstanding_balance, issue_date_paris, issue_time_paris, timezone,
  verification_ref, generated_by, metadata
) VALUES (
  'TEST-REC-2026-001', 'TEST-PAY-2026-001', '#CAN-2026-001', 'Christian Ndombe (Test Preview)',
  1, 500.00, 500.00, 4500.00, '01/11/2026', '12:00:00', 'Europe/Paris',
  'TEST-VERIF-TOKEN-2026-001', 'Preview Fixture Initializer', '{"fixture": true, "environment": "preview"}'::jsonb
)
ON CONFLICT (receipt_number) DO NOTHING;

-- 13. Synthetic Priority Task
INSERT INTO priority_tasks (title, description, priority, action_label, target_module, completed, role_queue)
SELECT
  'Vérification admission dossier #DEM-2026-001 (TEST)',
  'Contrôle de conformité académique pour le candidat synthétique en prévisualisation.',
  'Modéré', 'Examiner la demande', 'demandes', FALSE, 'Secretary'
WHERE NOT EXISTS (
  SELECT 1 FROM priority_tasks WHERE title = 'Vérification admission dossier #DEM-2026-001 (TEST)'
);
