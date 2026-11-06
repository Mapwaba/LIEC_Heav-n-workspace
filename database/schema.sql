-- ============================================================================
-- LIEC Education (LIEC One) - PostgreSQL Database Schema & Initial Seed Data
-- ============================================================================

-- 1. ROLES TABLE (Technical Roles & Business Profile Mappings)
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  role_id VARCHAR(50) UNIQUE NOT NULL,
  role_name VARCHAR(100) NOT NULL,
  business_profile VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  safeguards TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  timeout_minutes INTEGER NOT NULL DEFAULT 15 CHECK (timeout_minutes >= 10 AND timeout_minutes <= 30),
  suspended_at TIMESTAMP WITH TIME ZONE,
  suspended_by VARCHAR(120),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 1b. ROLE SESSION TIMEOUTS TABLE (Admin-Managed Session Policies: 10 to 30 min)
CREATE TABLE IF NOT EXISTS role_session_timeouts (
  id SERIAL PRIMARY KEY,
  role_id VARCHAR(50) UNIQUE NOT NULL,
  role_name VARCHAR(100) NOT NULL,
  business_profile VARCHAR(50) NOT NULL,
  timeout_minutes INTEGER NOT NULL DEFAULT 15 CHECK (timeout_minutes >= 10 AND timeout_minutes <= 30),
  updated_by VARCHAR(120) DEFAULT 'Platform Administrator',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO role_session_timeouts (role_id, role_name, business_profile, timeout_minutes, updated_by) VALUES
  ('admin', 'Platform Administrator (Admin / Self)', 'Admin', 15, 'System Initializer'),
  ('lh_security_admin', 'Security Administrator', 'Admin', 15, 'System Initializer'),
  ('secretary', 'Secretary (Admissions & Intake)', 'Secretary', 20, 'System Initializer'),
  ('ITIL', 'ITIL Workflow Operator', 'Secretary', 20, 'System Initializer'),
  ('lh_internal', 'Internal Application Access', 'Secretary', 20, 'System Initializer'),
  ('avi', 'Finance Officer (Blocked Account / AVI)', 'Finance Officer', 15, 'System Initializer'),
  ('lh_finance', 'Finance & AVI Officer', 'Finance Officer', 15, 'System Initializer')
ON CONFLICT (role_id) DO NOTHING;



CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) UNIQUE NOT NULL,
  business_profile VARCHAR(50) NOT NULL DEFAULT 'Secretary',
  role VARCHAR(50) NOT NULL DEFAULT 'secretary',
  title VARCHAR(100) NOT NULL DEFAULT 'Conseillère Senior',
  initials VARCHAR(10) NOT NULL DEFAULT 'SM',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  password_hash VARCHAR(255),
  password_salt VARCHAR(64),
  must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
  last_login TIMESTAMP WITH TIME ZONE,
  password_updated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_roles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id VARCHAR(50) NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
  assigned_by VARCHAR(120) NOT NULL DEFAULT 'System Admin',
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, role_id)
);

CREATE TABLE IF NOT EXISTS demandes (
  id SERIAL PRIMARY KEY,
  ref VARCHAR(40) UNIQUE NOT NULL,
  initials VARCHAR(10) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(160) NOT NULL,
  phone VARCHAR(60) NOT NULL,
  parent_full_name VARCHAR(150),
  parent_phone VARCHAR(30),
  graduation_year VARCHAR(10),
  current_activity VARCHAR(25),
  final_year_university VARCHAR(10),
  whatsapp_verified BOOLEAN NOT NULL DEFAULT TRUE,
  country_code VARCHAR(10) NOT NULL DEFAULT 'CD',
  flag VARCHAR(16) NOT NULL DEFAULT '🇨🇩',
  country_name VARCHAR(100) NOT NULL,
  city VARCHAR(100) NOT NULL,
  nationality VARCHAR(100) DEFAULT 'Congolaise (RDC)',
  sexe VARCHAR(30) DEFAULT 'Male',
  program VARCHAR(255) NOT NULL,
  service_pole VARCHAR(120) NOT NULL,
  target_cities VARCHAR(200) DEFAULT 'Lyon (Exclusif)',
  current_level VARCHAR(200) DEFAULT 'Licence 3 - Mention Bien',
  budget_range VARCHAR(120) DEFAULT '8 500 € – 10 000 € / an',
  status VARCHAR(50) NOT NULL DEFAULT 'Nouvelle',
  adviser VARCHAR(120) DEFAULT 'Barthelemy MAPWABA NTORO',
  expected_start VARCHAR(50) DEFAULT 'Septembre 2025',
  message TEXT,
  submitted_at VARCHAR(100) NOT NULL DEFAULT 'Soumis le 25 Octobre 2025 à 16:42',
  is_dashboard_recent BOOLEAN NOT NULL DEFAULT FALSE,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS demande_notes (
  id SERIAL PRIMARY KEY,
  demande_ref VARCHAR(40) NOT NULL,
  author VARCHAR(120) NOT NULL,
  timestamp_label VARCHAR(80) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS prospects (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  stage VARCHAR(50) NOT NULL DEFAULT 'nouveau', -- 'nouveau', 'premier_contact', 'diagnostic', 'qualifie'
  badge_text VARCHAR(60) NOT NULL,
  badge_tone VARCHAR(30) NOT NULL DEFAULT 'neutral', -- 'urgent', 'amber', 'neutral', 'gold'
  flag VARCHAR(16) NOT NULL DEFAULT '🇨🇩',
  country_city VARCHAR(120) NOT NULL,
  program_tag VARCHAR(140) NOT NULL,
  program_tag_tone VARCHAR(30) NOT NULL DEFAULT 'mint', -- 'mint', 'blue'
  highlight_box VARCHAR(180),
  meta_left VARCHAR(120) NOT NULL,
  meta_right VARCHAR(120) NOT NULL,
  meta_right_tone VARCHAR(30) DEFAULT 'teal',
  adviser_initials VARCHAR(10) NOT NULL DEFAULT 'BM',
  adviser_name VARCHAR(100) NOT NULL DEFAULT 'Barthelemy MAPWABA NTORO',
  adviser_color VARCHAR(30) NOT NULL DEFAULT 'navy',
  estimated_value INTEGER NOT NULL DEFAULT 1800,
  is_urgent BOOLEAN NOT NULL DEFAULT FALSE,
  is_prepa BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS candidats (
  id SERIAL PRIMARY KEY,
  ref VARCHAR(40) UNIQUE NOT NULL,
  initials VARCHAR(10) NOT NULL,
  full_name VARCHAR(160) NOT NULL,
  avatar_url VARCHAR(255),
  program VARCHAR(255) NOT NULL,
  cities VARCHAR(140) NOT NULL,
  sexe VARCHAR(30) DEFAULT 'Male',
  adviser VARCHAR(120) NOT NULL DEFAULT 'Barthelemy MAPWABA NTORO',
  stage_badge VARCHAR(60) NOT NULL DEFAULT 'En cours (Jalon 2)',
  stage_badge_tone VARCHAR(30) NOT NULL DEFAULT 'teal',
  progress_pct INTEGER NOT NULL DEFAULT 65,
  status_left VARCHAR(80) NOT NULL DEFAULT 'Dossier à 65%',
  status_right VARCHAR(80) NOT NULL DEFAULT 'J-14 CF',
  email VARCHAR(160) DEFAULT 'd.kabangele@unikin.ac.cd',
  phone VARCHAR(60) DEFAULT '+243 81 552 1904',
  parent_full_name VARCHAR(150),
  parent_phone VARCHAR(30),
  graduation_year VARCHAR(10),
  current_activity VARCHAR(25),
  final_year_university VARCHAR(10),
  country VARCHAR(100) DEFAULT 'RDC (Kinshasa)',
  nationality VARCHAR(100) DEFAULT 'Congolaise (RDC)',
  current_diploma VARCHAR(180) DEFAULT 'Licence Informatique (Mention TB) - UNIKIN',
  tcf_score VARCHAR(100) DEFAULT 'TCF B2 (540 pts) certifié',
  garant_info VARCHAR(220) DEFAULT 'Oncle résidant à Villeurbanne en CDI (Revenus vérifiés)',
  interview_date VARCHAR(120) DEFAULT '04 Novembre 2025',
  jalons_json TEXT NOT NULL,
  voeux_json TEXT NOT NULL,
  notes_json TEXT NOT NULL,
  pieces_json TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS parent_student_links (
  id SERIAL PRIMARY KEY,
  parent_name VARCHAR(150) NOT NULL,
  parent_phone VARCHAR(30),
  student_name VARCHAR(150) NOT NULL,
  student_email VARCHAR(160),
  student_program VARCHAR(180),
  source VARCHAR(50) DEFAULT 'application',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(parent_name, student_name)
);

CREATE TABLE IF NOT EXISTS priority_tasks (
  id SERIAL PRIMARY KEY,
  title VARCHAR(160) NOT NULL,
  description TEXT NOT NULL,
  priority VARCHAR(30) NOT NULL DEFAULT 'Urgent', -- 'Urgent', 'Modéré'
  action_label VARCHAR(120) NOT NULL,
  target_module VARCHAR(60) NOT NULL DEFAULT 'demandes',
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  role_queue VARCHAR(50) NOT NULL DEFAULT 'all',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS avi_requests (
  id SERIAL PRIMARY KEY,
  ref VARCHAR(40) UNIQUE NOT NULL,
  parent_name VARCHAR(150) NOT NULL,
  country VARCHAR(100) NOT NULL,
  town VARCHAR(100) NOT NULL,
  nationality VARCHAR(100) NOT NULL,
  physical_address VARCHAR(220) DEFAULT 'Avenue de la Gombe, Kinshasa',
  occupation VARCHAR(160) NOT NULL,
  phone VARCHAR(60) NOT NULL,
  email VARCHAR(160) NOT NULL,
  other_guarantor BOOLEAN NOT NULL DEFAULT FALSE,
  guarantor_details TEXT DEFAULT '',
  expected_start VARCHAR(40) NOT NULL,
  student_name VARCHAR(150) NOT NULL,
  student_program VARCHAR(160) NOT NULL,
  student_id_doc VARCHAR(100) NOT NULL,
  offer_key VARCHAR(40) NOT NULL DEFAULT 'classique',
  offer_name VARCHAR(80) NOT NULL DEFAULT 'Classique',
  interest_rate NUMERIC(5,2) NOT NULL DEFAULT 12.00,
  duration_months INTEGER NOT NULL DEFAULT 8,
  principal_eur NUMERIC(12,2) NOT NULL DEFAULT 2800.00,
  principal_usd NUMERIC(12,2) NOT NULL DEFAULT 3043.48,
  principal_xaf NUMERIC(14,2) NOT NULL DEFAULT 1836680.00,
  usd_eur_rate NUMERIC(10,4) NOT NULL DEFAULT 0.9200,
  usd_xaf_rate NUMERIC(10,2) NOT NULL DEFAULT 603.48,
  total_interest_eur NUMERIC(10,2) NOT NULL DEFAULT 336.00,
  liec_fee_usd NUMERIC(10,2) NOT NULL DEFAULT 150.00,
  files_count INTEGER NOT NULL DEFAULT 3,
  supporting_docs TEXT DEFAULT '',
  status VARCHAR(60) NOT NULL DEFAULT 'Submitted to YIMMILINE',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS prepa_cohorts (
  id SERIAL PRIMARY KEY,
  code VARCHAR(40) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL,
  campus VARCHAR(100) NOT NULL,
  start_date VARCHAR(80) NOT NULL,
  enrolled_count INTEGER NOT NULL DEFAULT 24,
  capacity INTEGER NOT NULL DEFAULT 30,
  lead_instructor VARCHAR(120) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Inscriptions ouvertes'
);

CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  ref VARCHAR(40) UNIQUE NOT NULL,
  student_name VARCHAR(150) NOT NULL,
  service_label VARCHAR(160) NOT NULL,
  amount_eur NUMERIC(10,2) NOT NULL,
  paid_eur NUMERIC(10,2) NOT NULL,
  recipient VARCHAR(80) NOT NULL DEFAULT 'LIEC Education',
  status VARCHAR(50) NOT NULL DEFAULT 'Partiellement payé',
  issued_date VARCHAR(60) NOT NULL
);

CREATE TABLE IF NOT EXISTS accommodation_requests (
  id SERIAL PRIMARY KEY,
  ref VARCHAR(50) UNIQUE NOT NULL,
  student_ref VARCHAR(50) NOT NULL,
  student_name VARCHAR(150) NOT NULL,
  student_email VARCHAR(160),
  student_phone VARCHAR(60),
  student_nationality VARCHAR(100),
  student_location VARCHAR(120),
  parent_name VARCHAR(150),
  parent_phone VARCHAR(60),
  parent_email VARCHAR(160),
  parent_relation VARCHAR(60) DEFAULT 'Parent / Tuteur',
  admission_status VARCHAR(100) DEFAULT 'Admitted — Partner School Lyon',
  procedure_status VARCHAR(100) DEFAULT 'Milestone 2 — Academic Records',
  preferred_location VARCHAR(150) NOT NULL,
  accommodation_type VARCHAR(100) NOT NULL,
  arrival_date VARCHAR(40) NOT NULL,
  departure_date VARCHAR(40),
  budget VARCHAR(80) NOT NULL,
  special_requirements TEXT,
  supporting_docs TEXT DEFAULT '',
  status VARCHAR(50) NOT NULL DEFAULT 'Draft',
  assigned_agent VARCHAR(120) NOT NULL DEFAULT 'Barthelemy MAPWABA NTORO',
  partner_name VARCHAR(120),
  attachments_json TEXT DEFAULT '[]',
  notes TEXT,
  history_json TEXT NOT NULL DEFAULT '[]',
  email_sent_at TIMESTAMP WITH TIME ZONE,
  email_sent_by VARCHAR(120),
  email_recipient VARCHAR(160),
  email_status VARCHAR(50),
  email_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS accommodation_access_tokens (
  id SERIAL PRIMARY KEY,
  token_hash VARCHAR(64) UNIQUE NOT NULL,
  request_ref VARCHAR(50) NOT NULL,
  partner_id VARCHAR(50) NOT NULL,
  partner_email VARCHAR(160) NOT NULL,
  document_ids TEXT NOT NULL DEFAULT '[]',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoked_by VARCHAR(120),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_acc_tokens_hash ON accommodation_access_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_acc_tokens_ref ON accommodation_access_tokens(request_ref);

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  actor VARCHAR(120) NOT NULL,
  action VARCHAR(160) NOT NULL,
  entity_ref VARCHAR(80) NOT NULL,
  outcome VARCHAR(50) NOT NULL DEFAULT 'Succès',
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS staff_2fa (
  id SERIAL PRIMARY KEY,
  user_email VARCHAR(160) UNIQUE NOT NULL,
  secret VARCHAR(80) NOT NULL,
  is_activated BOOLEAN NOT NULL DEFAULT FALSE,
  activated_at TIMESTAMP WITH TIME ZONE,
  last_verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(60);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(60);
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_id VARCHAR(60);
CREATE UNIQUE INDEX IF NOT EXISTS users_user_id_unique_idx ON users (LOWER(user_id));

ALTER TABLE users ADD COLUMN IF NOT EXISTS business_profile VARCHAR(50) DEFAULT 'Secretary';
ALTER TABLE users ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_by VARCHAR(120);
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_salt VARCHAR(64);
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_updated_at TIMESTAMP WITH TIME ZONE;

-- Seed Technical Roles
INSERT INTO roles (role_id, role_name, business_profile, description, safeguards, active) VALUES
  ('admin', 'Platform Administrator', 'Admin', 'Highest privilege. Assign only to trusted administrators.', 'Assign only to trusted administrators; log assignments and removals.', TRUE),
  ('lh_security_admin', 'Security Administrator', 'Admin', 'Security administration. Limit access to security configuration and sensitive controls.', 'Limit access to security configuration and sensitive controls.', TRUE),
  ('ITIL', 'ITIL Workflow Operator', 'Secretary', 'Secretary workflows (as configured). Applicant intake and administrative tracking.', 'Do not assume this role means full administrator access. Verify permissions and inherited access.', TRUE),
  ('lh_internal', 'Internal Application Access', 'Secretary', 'Internal application access. Restrict to applicant intake, assigned records, comments and history.', 'Restrict to applicant intake, assigned records, comments and history.', TRUE),
  ('lh_finance', 'Finance & AVI Officer', 'Finance Officer', 'AVI and parent-financing operations, YIMMILINE desk calculations and loan requests.', 'Restrict to AVI-related functions and records; do not grant unrelated finance or system configuration access.', TRUE)
ON CONFLICT (role_id) DO NOTHING;

-- Seed Initial Users with Business Profiles (Admin only)
INSERT INTO users (name, email, business_profile, role, title, initials, active) VALUES
  ('Barthelemy MAPWABA NTORO', 'bmapwabantoro@liecconsulting.com', 'Admin', 'admin', 'Platform Administrator', 'BM', TRUE)
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  business_profile = EXCLUDED.business_profile,
  role = EXCLUDED.role,
  title = EXCLUDED.title,
  initials = EXCLUDED.initials,
  active = TRUE;

-- Seed Technical Role Assignments
INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT u.id, 'admin', 'System Initializer' FROM users u WHERE LOWER(u.email) = 'bmapwabantoro@liecconsulting.com'
ON CONFLICT (user_id, role_id) DO NOTHING;

INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT u.id, 'lh_security_admin', 'System Initializer' FROM users u WHERE LOWER(u.email) = 'bmapwabantoro@liecconsulting.com'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Schema Alterations for ServiceNow Student Record and Accommodation Link
ALTER TABLE candidats ADD COLUMN IF NOT EXISTS parent_email VARCHAR(160);
ALTER TABLE candidats ADD COLUMN IF NOT EXISTS parent_relation VARCHAR(60) DEFAULT 'Parent';
ALTER TABLE candidats ADD COLUMN IF NOT EXISTS admission_status VARCHAR(100) DEFAULT 'Admitted - Partner School Lyon';
ALTER TABLE candidats ADD COLUMN IF NOT EXISTS procedure_status VARCHAR(100) DEFAULT 'In Progress (Milestone 2)';
ALTER TABLE candidats ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE candidats ADD COLUMN IF NOT EXISTS comments TEXT;
ALTER TABLE candidats ADD COLUMN IF NOT EXISTS history_json TEXT DEFAULT '[]';

ALTER TABLE avi_requests ADD COLUMN IF NOT EXISTS student_ref VARCHAR(50);
UPDATE avi_requests SET student_ref = '#CAN-2025-042' WHERE student_name ILIKE '%Kabangele%' AND (student_ref IS NULL OR student_ref = '');

-- Enhancements: Guided tour tracking per user
ALTER TABLE users ADD COLUMN IF NOT EXISTS tour_completed BOOLEAN NOT NULL DEFAULT FALSE;

-- Enhancements: Prospect Calls (Schedule a Call)
CREATE TABLE IF NOT EXISTS prospect_calls (
  id SERIAL PRIMARY KEY,
  prospect_id INTEGER NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  scheduled_date VARCHAR(40) NOT NULL,
  scheduled_time VARCHAR(20) NOT NULL,
  subject VARCHAR(180) NOT NULL,
  assigned_to VARCHAR(120) NOT NULL,
  notes TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'Scheduled',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enhancements: Prospect Comments & Internal Notes
CREATE TABLE IF NOT EXISTS prospect_notes (
  id SERIAL PRIMARY KEY,
  prospect_id INTEGER NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  author_name VARCHAR(120) NOT NULL,
  author_email VARCHAR(160),
  author_role VARCHAR(60) DEFAULT 'Staff',
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enhancements: User Notification Read Tracking
CREATE TABLE IF NOT EXISTS user_notification_reads (
  id SERIAL PRIMARY KEY,
  user_email VARCHAR(160) NOT NULL,
  notification_id VARCHAR(100) NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_email, notification_id)
);

-- Enhancements: Student Document Retention & Annual Programme Reporting
ALTER TABLE candidats ADD COLUMN IF NOT EXISTS application_year VARCHAR(30) DEFAULT '2027–2028';
ALTER TABLE candidats ADD COLUMN IF NOT EXISTS qualified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE candidats ADD COLUMN IF NOT EXISTS qualification_status VARCHAR(50) DEFAULT 'REQUIRES_REVIEW';
ALTER TABLE candidats ADD COLUMN IF NOT EXISTS visa_status VARCHAR(40) DEFAULT 'NOT_APPLIED';
ALTER TABLE candidats ADD COLUMN IF NOT EXISTS visa_submission_date DATE;
ALTER TABLE candidats ADD COLUMN IF NOT EXISTS visa_decision_date DATE;
ALTER TABLE candidats ADD COLUMN IF NOT EXISTS visa_outcome_notes TEXT;
ALTER TABLE candidats ADD COLUMN IF NOT EXISTS documents_purged BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE candidats ADD COLUMN IF NOT EXISTS documents_purged_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE candidats ADD COLUMN IF NOT EXISTS documents_purged_by VARCHAR(120);

CREATE INDEX IF NOT EXISTS idx_candidats_intake ON candidats(application_year);
CREATE INDEX IF NOT EXISTS idx_candidats_qualified_at ON candidats(qualified_at);
CREATE INDEX IF NOT EXISTS idx_candidats_visa_status ON candidats(visa_status);
CREATE INDEX IF NOT EXISTS idx_candidats_docs_purged ON candidats(documents_purged);

CREATE TABLE IF NOT EXISTS document_retention_logs (
  id SERIAL PRIMARY KEY,
  student_ref VARCHAR(50) NOT NULL,
  trigger_type VARCHAR(50) NOT NULL,
  initiated_by VARCHAR(120) NOT NULL,
  purged_documents_count INTEGER NOT NULL DEFAULT 0,
  purged_files_summary TEXT,
  storage_deletion_verified BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  purged_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_retention_student ON document_retention_logs(student_ref);

CREATE TABLE IF NOT EXISTS programme_report_snapshots (
  id SERIAL PRIMARY KEY,
  intake_year VARCHAR(30) NOT NULL,
  report_mode VARCHAR(30) NOT NULL DEFAULT 'FINALISED_CUTOFF',
  cutoff_date DATE,
  snapshot_title VARCHAR(200) NOT NULL,
  summary_json TEXT NOT NULL DEFAULT '{}',
  students_json TEXT NOT NULL DEFAULT '[]',
  created_by VARCHAR(120) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_snapshots_intake ON programme_report_snapshots(intake_year);
CREATE INDEX IF NOT EXISTS idx_snapshots_cutoff ON programme_report_snapshots(cutoff_date);

-- ============================================================================
-- PROSPECTS CRM 4-STAGE LIFECYCLE & 3-CONDITION QUALIFICATION EXTENSIONS
-- ============================================================================
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS lead_source VARCHAR(100) DEFAULT 'Site Web LIEC';
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS first_contact_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS first_contact_method VARCHAR(50);
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS first_contact_outcome VARCHAR(100);
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS first_contact_notes TEXT;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS eligibility_status VARCHAR(50) DEFAULT 'Pending Review';
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS eligibility_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS eligibility_assessed_by VARCHAR(150);
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS eligibility_notes TEXT;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS registration_completed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS registration_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS first_instalment_paid BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS first_instalment_amount NUMERIC(10,2);
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS first_instalment_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS first_instalment_ref VARCHAR(100);
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS qualification_completed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS qualification_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS converted_candidate_ref VARCHAR(50);

-- Demandes qualification status & locks
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS eligibility_status VARCHAR(50) DEFAULT 'Pending Review';
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS registration_completed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS registration_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS first_instalment_paid BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS first_instalment_amount NUMERIC(10,2);
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS first_instalment_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS first_instalment_ref VARCHAR(100);
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS converted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS converted_candidate_ref VARCHAR(50);

-- Candidats qualification metrics
ALTER TABLE candidats ADD COLUMN IF NOT EXISTS registration_completed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE candidats ADD COLUMN IF NOT EXISTS first_instalment_paid BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE candidats ADD COLUMN IF NOT EXISTS first_instalment_amount NUMERIC(10,2);
ALTER TABLE candidats ADD COLUMN IF NOT EXISTS first_instalment_ref VARCHAR(100);

-- Accommodation manual reservation confirmation
ALTER TABLE accommodation_requests ADD COLUMN IF NOT EXISTS confirmation_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE accommodation_requests ADD COLUMN IF NOT EXISTS confirmation_reference VARCHAR(100);
ALTER TABLE accommodation_requests ADD COLUMN IF NOT EXISTS confirmation_agent VARCHAR(150);
ALTER TABLE accommodation_requests ADD COLUMN IF NOT EXISTS confirmation_notes TEXT;
ALTER TABLE accommodation_requests ADD COLUMN IF NOT EXISTS confirmation_doc_name VARCHAR(255);
ALTER TABLE accommodation_requests ADD COLUMN IF NOT EXISTS decline_reason TEXT;
ALTER TABLE accommodation_requests ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;




-- ============================================================================
-- USER IMPORT SETS & TRANSFORM MAPS (SERVICENOW STAGING ARCHITECTURE)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_import_sets (
  id SERIAL PRIMARY KEY,
  set_number VARCHAR(50) UNIQUE NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER DEFAULT 0,
  file_type VARCHAR(20) DEFAULT 'csv',
  status VARCHAR(40) NOT NULL DEFAULT 'LOADED',
  total_rows INTEGER NOT NULL DEFAULT 0,
  valid_rows INTEGER NOT NULL DEFAULT 0,
  error_rows INTEGER NOT NULL DEFAULT 0,
  skipped_rows INTEGER NOT NULL DEFAULT 0,
  created_rows INTEGER NOT NULL DEFAULT 0,
  updated_rows INTEGER NOT NULL DEFAULT 0,
  transform_map_json TEXT DEFAULT '{}',
  execution_summary_json TEXT DEFAULT '{}',
  selected_sheet VARCHAR(120),
  sheets_available_json TEXT DEFAULT '[]',
  execution_lock_id VARCHAR(80),
  execution_started_at TIMESTAMP WITH TIME ZONE,
  execution_heartbeat_at TIMESTAMP WITH TIME ZONE,
  created_by VARCHAR(120) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  executed_by VARCHAR(120),
  executed_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS idx_import_sets_status ON user_import_sets(status);
CREATE INDEX IF NOT EXISTS idx_import_sets_number ON user_import_sets(set_number);

CREATE TABLE IF NOT EXISTS user_import_staging_rows (
  id SERIAL PRIMARY KEY,
  import_set_id INTEGER NOT NULL REFERENCES user_import_sets(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  raw_data_json TEXT NOT NULL,
  mapped_data_json TEXT DEFAULT '{}',
  validation_status VARCHAR(40) NOT NULL DEFAULT 'PENDING',
  validation_errors_json TEXT DEFAULT '[]',
  transform_status VARCHAR(40) NOT NULL DEFAULT 'PENDING',
  provisioned_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  provisioned_user_identifier VARCHAR(60),
  email_status VARCHAR(40) DEFAULT 'NOT_SENT',
  email_error TEXT,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  execution_lock_id VARCHAR(80),
  error_message TEXT,
  is_excluded BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_staging_import_set ON user_import_staging_rows(import_set_id);
CREATE INDEX IF NOT EXISTS idx_staging_validation ON user_import_staging_rows(validation_status);
CREATE INDEX IF NOT EXISTS idx_staging_transform ON user_import_staging_rows(transform_status);
