import path from 'path';
import fs from 'fs';
import os from 'os';
import { Pool } from 'pg';
import { PGlite } from '@electric-sql/pglite';

interface QueryResult<T = any> {
  rows: T[];
  rowCount?: number | null;
}

export interface DBClient {
  query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;
  exec(sql: string): Promise<void>;
  engine: 'pg' | 'pglite';
}

declare global {
  // eslint-disable-next-line no-var
  var __liecDbClientV4: Promise<DBClient> | undefined;
}

export const PARTNER_SCHOOLS_LYON = [
  {
    id: 1,
    code: 'ISCOM',
    name: 'ISCOM Lyon',
    shortName: 'ISCOM',
    fields: 'Communication, advertising, marketing and events management.',
    campus: 'Lyon 7th (Jean Macé)',
    programs: [
      'Bachelor in Communication, Advertising & Events',
      'Master in Digital Marketing, Advertising & Brand Strategy',
    ],
  },
  {
    id: 2,
    code: 'MDS',
    name: 'MyDigitalSchool Lyon',
    shortName: 'MyDigitalSchool',
    fields: 'Web development, digital creation, webmarketing and UX/UI design.',
    campus: 'Lyon 3rd (Part-Dieu)',
    programs: [
      'Bachelor in Web Development & UX/UI Design',
      'MBA in Digital Creation & Webmarketing',
    ],
  },
  {
    id: 3,
    code: 'TUNON',
    name: 'École Internationale Tunon Lyon',
    shortName: 'École Internationale Tunon',
    fields: 'Tourism, hospitality, public relations and event planning.',
    campus: 'Lyon 6th (Foch)',
    programs: [
      'Bachelor in Tourism, Hospitality & Events',
      'MBA in Hospitality Management & Public Relations',
    ],
  },
  {
    id: 4,
    code: 'IHECF',
    name: 'IHECF Lyon',
    shortName: 'IHECF',
    fields: 'Accounting, auditing, finance and management control.',
    campus: 'Lyon 3rd (Campus Eduservices)',
    programs: [
      'DCG / Bachelor in Accounting & Corporate Finance',
      'DSCG / MBA in Auditing & Management Control',
    ],
  },
  {
    id: 5,
    code: 'IPAC',
    name: 'Ipac Bachelor Factory Lyon',
    shortName: 'Ipac Bachelor Factory',
    fields: 'Commerce, management, corporate finance, communication and logistics.',
    campus: 'Lyon 3rd (Part-Dieu)',
    programs: [
      'Bachelor in Business, Management & Logistics',
      'Bachelor in Finance, Communication & Marketing',
    ],
  },
  {
    id: 6,
    code: 'MBWAY',
    name: 'MBway Lyon',
    shortName: 'MBway',
    fields: 'Management, entrepreneurship, human resources, finance and international business.',
    campus: 'Lyon 3rd (Part-Dieu)',
    programs: [
      'MBA in Management, International Business & Entrepreneurship',
      'MBA in Human Resources & Financial Management',
    ],
  },
];

export async function initSchemaDDL(client: DBClient): Promise<void> {
  // Ensure all base tables, constraints and indexes exist (pure DDL)
  await client.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      first_name VARCHAR(60),
      last_name VARCHAR(60),
      user_id VARCHAR(60),
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
    CREATE UNIQUE INDEX IF NOT EXISTS users_user_id_unique_idx ON users (LOWER(user_id));

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
      stage VARCHAR(50) NOT NULL DEFAULT 'nouveau',
      badge_text VARCHAR(60) NOT NULL,
      badge_tone VARCHAR(30) NOT NULL DEFAULT 'neutral',
      flag VARCHAR(16) NOT NULL DEFAULT '🇨🇩',
      country_city VARCHAR(120) NOT NULL,
      program_tag VARCHAR(140) NOT NULL,
      program_tag_tone VARCHAR(30) NOT NULL DEFAULT 'mint',
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
      jalons_json TEXT NOT NULL DEFAULT '[]',
      voeux_json TEXT NOT NULL DEFAULT '[]',
      notes_json TEXT NOT NULL DEFAULT '[]',
      pieces_json TEXT NOT NULL DEFAULT '[]',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS priority_tasks (
      id SERIAL PRIMARY KEY,
      title VARCHAR(160) NOT NULL,
      description TEXT NOT NULL,
      priority VARCHAR(30) NOT NULL DEFAULT 'Urgent',
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

    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      actor VARCHAR(150) NOT NULL,
      action VARCHAR(255) NOT NULL,
      entity_ref VARCHAR(100),
      outcome VARCHAR(50) NOT NULL DEFAULT 'Succès',
      details TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
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

    CREATE TABLE IF NOT EXISTS prepa_payments (
      id SERIAL PRIMARY KEY,
      payment_ref VARCHAR(80) UNIQUE NOT NULL,
      candidate_ref VARCHAR(80) NOT NULL,
      candidate_name VARCHAR(150) NOT NULL,
      candidate_email VARCHAR(160),
      academic_intake VARCHAR(80) DEFAULT '2025–2026',
      program VARCHAR(100) DEFAULT 'LIEC-France PREPA',
      instalment_number INT NOT NULL,
      instalment_label VARCHAR(50) NOT NULL,
      instalment_percentage NUMERIC(5,2) NOT NULL,
      amount NUMERIC(10,2) NOT NULL,
      payment_method VARCHAR(80) DEFAULT 'Bank Wire (Virement)',
      transaction_ref VARCHAR(100),
      proof_file_url TEXT,
      proof_filename VARCHAR(255),
      status VARCHAR(50) NOT NULL DEFAULT 'Pending',
      validated_by VARCHAR(150),
      validated_at TIMESTAMP WITH TIME ZONE,
      expected_next_date TIMESTAMP WITH TIME ZONE,
      payment_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      is_settled_totally BOOLEAN DEFAULT TRUE,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS prepa_receipts (
      id SERIAL PRIMARY KEY,
      receipt_number VARCHAR(80) UNIQUE NOT NULL,
      payment_id INT REFERENCES prepa_payments(id),
      payment_ref VARCHAR(80) NOT NULL,
      candidate_ref VARCHAR(80) NOT NULL,
      candidate_name VARCHAR(150) NOT NULL,
      instalment_number INT NOT NULL,
      amount_paid NUMERIC(10,2) NOT NULL,
      cumulative_paid NUMERIC(10,2) NOT NULL,
      outstanding_balance NUMERIC(10,2) NOT NULL,
      issue_date_paris VARCHAR(30) NOT NULL,
      issue_time_paris VARCHAR(30) NOT NULL,
      timezone VARCHAR(30) DEFAULT 'Europe/Paris',
      verification_ref VARCHAR(100) UNIQUE NOT NULL,
      is_reissue BOOLEAN DEFAULT FALSE,
      reissue_count INT DEFAULT 0,
      generated_by VARCHAR(150) NOT NULL,
      generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      receipt_pdf_url TEXT,
      metadata JSONB DEFAULT '{}'::jsonb
    );
  `);

  // Ensure RBAC schema columns and tables exist
  await client.exec(`
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

    CREATE TABLE IF NOT EXISTS user_roles (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role_id VARCHAR(50) NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
      assigned_by VARCHAR(120) NOT NULL DEFAULT 'System Admin',
      assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, role_id)
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

    CREATE TABLE IF NOT EXISTS role_session_timeouts (
      id SERIAL PRIMARY KEY,
      role_id VARCHAR(50) UNIQUE NOT NULL,
      role_name VARCHAR(100) NOT NULL,
      business_profile VARCHAR(50) NOT NULL,
      timeout_minutes INTEGER NOT NULL DEFAULT 15 CHECK (timeout_minutes >= 10 AND timeout_minutes <= 30),
      updated_by VARCHAR(120) DEFAULT 'Platform Administrator',
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_notification_reads (
      id SERIAL PRIMARY KEY,
      user_email VARCHAR(160) NOT NULL,
      notification_id VARCHAR(100) NOT NULL,
      read_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_email, notification_id)
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

    ALTER TABLE roles ADD COLUMN IF NOT EXISTS timeout_minutes INTEGER DEFAULT 15;

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
    ALTER TABLE demande_notes ADD COLUMN IF NOT EXISTS timestamp_label VARCHAR(60) DEFAULT 'Today';
    ALTER TABLE demandes ADD COLUMN IF NOT EXISTS application_year VARCHAR(20);

    -- Ensure new AVI columns exist on existing database tables
    ALTER TABLE avi_requests ADD COLUMN IF NOT EXISTS physical_address VARCHAR(220) DEFAULT 'Avenue de la Gombe, Kinshasa';
    ALTER TABLE avi_requests ADD COLUMN IF NOT EXISTS other_guarantor BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE avi_requests ADD COLUMN IF NOT EXISTS guarantor_details TEXT DEFAULT '';
    ALTER TABLE avi_requests ADD COLUMN IF NOT EXISTS principal_eur NUMERIC(12,2) NOT NULL DEFAULT 2800.00;
    ALTER TABLE avi_requests ADD COLUMN IF NOT EXISTS principal_xaf NUMERIC(14,2) NOT NULL DEFAULT 1836680.00;
    ALTER TABLE avi_requests ADD COLUMN IF NOT EXISTS total_interest_eur NUMERIC(10,2) NOT NULL DEFAULT 336.00;
    ALTER TABLE avi_requests ADD COLUMN IF NOT EXISTS supporting_docs TEXT DEFAULT '';
    ALTER TABLE accommodation_requests ADD COLUMN IF NOT EXISTS partner_name VARCHAR(120);
    ALTER TABLE accommodation_requests ADD COLUMN IF NOT EXISTS attachments_json TEXT DEFAULT '[]';
  `);

  // Ensure new Student Application and Parent Linking columns and tables exist
  await client.exec(`
    ALTER TABLE demandes ADD COLUMN IF NOT EXISTS parent_full_name VARCHAR(150);
    ALTER TABLE demandes ADD COLUMN IF NOT EXISTS parent_phone VARCHAR(30);
    ALTER TABLE demandes ADD COLUMN IF NOT EXISTS graduation_year VARCHAR(10);
    ALTER TABLE demandes ADD COLUMN IF NOT EXISTS current_activity VARCHAR(25);
    ALTER TABLE demandes ADD COLUMN IF NOT EXISTS final_year_university VARCHAR(10);
    ALTER TABLE demandes ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
    ALTER TABLE demandes ADD COLUMN IF NOT EXISTS adviser_email VARCHAR(160);
    ALTER TABLE demandes ADD COLUMN IF NOT EXISTS adviser_assigned_at TIMESTAMP WITH TIME ZONE;
    ALTER TABLE demandes ADD COLUMN IF NOT EXISTS adviser_assigned_by VARCHAR(150);
    ALTER TABLE demandes ADD COLUMN IF NOT EXISTS assignment_history_json TEXT DEFAULT '[]';
    ALTER TABLE demandes ADD COLUMN IF NOT EXISTS is_manual_override BOOLEAN DEFAULT FALSE;
    ALTER TABLE demandes ADD COLUMN IF NOT EXISTS override_reason TEXT;
    ALTER TABLE demandes ADD COLUMN IF NOT EXISTS override_notes TEXT;
    ALTER TABLE demandes ADD COLUMN IF NOT EXISTS override_by VARCHAR(150);
    ALTER TABLE demandes ADD COLUMN IF NOT EXISTS override_at TIMESTAMP WITH TIME ZONE;
    ALTER TABLE demandes ADD COLUMN IF NOT EXISTS previous_status VARCHAR(60);
    ALTER TABLE demandes ADD COLUMN IF NOT EXISTS status_history_json TEXT DEFAULT '[]';

    ALTER TABLE prospects ADD COLUMN IF NOT EXISTS adviser_email VARCHAR(160);
    ALTER TABLE prospects ADD COLUMN IF NOT EXISTS adviser_assigned_at TIMESTAMP WITH TIME ZONE;
    ALTER TABLE prospects ADD COLUMN IF NOT EXISTS adviser_assigned_by VARCHAR(150);
    ALTER TABLE prospects ADD COLUMN IF NOT EXISTS assignment_history_json TEXT DEFAULT '[]';
    ALTER TABLE prospects ADD COLUMN IF NOT EXISTS is_manual_override BOOLEAN DEFAULT FALSE;
    ALTER TABLE prospects ADD COLUMN IF NOT EXISTS override_reason TEXT;
    ALTER TABLE prospects ADD COLUMN IF NOT EXISTS override_notes TEXT;
    ALTER TABLE prospects ADD COLUMN IF NOT EXISTS override_by VARCHAR(150);
    ALTER TABLE prospects ADD COLUMN IF NOT EXISTS override_at TIMESTAMP WITH TIME ZONE;
    ALTER TABLE prospects ADD COLUMN IF NOT EXISTS previous_stage VARCHAR(60);
    ALTER TABLE prospects ADD COLUMN IF NOT EXISTS status_history_json TEXT DEFAULT '[]';

    ALTER TABLE candidats ADD COLUMN IF NOT EXISTS parent_full_name VARCHAR(150);
    ALTER TABLE candidats ADD COLUMN IF NOT EXISTS parent_phone VARCHAR(30);
    ALTER TABLE candidats ADD COLUMN IF NOT EXISTS graduation_year VARCHAR(10);
    ALTER TABLE candidats ADD COLUMN IF NOT EXISTS current_activity VARCHAR(25);
    ALTER TABLE candidats ADD COLUMN IF NOT EXISTS final_year_university VARCHAR(10);
    ALTER TABLE candidats ADD COLUMN IF NOT EXISTS parent_email VARCHAR(160);
    ALTER TABLE candidats ADD COLUMN IF NOT EXISTS parent_relation VARCHAR(60) DEFAULT 'Parent';
    ALTER TABLE candidats ADD COLUMN IF NOT EXISTS admission_status VARCHAR(100) DEFAULT 'Admitted - Partner School Lyon';
    ALTER TABLE candidats ADD COLUMN IF NOT EXISTS procedure_status VARCHAR(100) DEFAULT 'In Progress (Milestone 2)';
    ALTER TABLE candidats ADD COLUMN IF NOT EXISTS description TEXT;
    ALTER TABLE candidats ADD COLUMN IF NOT EXISTS comments TEXT;
    ALTER TABLE candidats ADD COLUMN IF NOT EXISTS history_json TEXT DEFAULT '[]';

    ALTER TABLE avi_requests ADD COLUMN IF NOT EXISTS student_ref VARCHAR(50);

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

    -- No demo parent_student_links

    ALTER TABLE users ADD COLUMN IF NOT EXISTS tour_completed BOOLEAN NOT NULL DEFAULT FALSE;

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

    CREATE TABLE IF NOT EXISTS prospect_notes (
      id SERIAL PRIMARY KEY,
      prospect_id INTEGER NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
      author_name VARCHAR(120) NOT NULL,
      author_email VARCHAR(160),
      author_role VARCHAR(60) DEFAULT 'Staff',
      content TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

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

    -- Prospects CRM 4-Stage Lifecycle & 3-Condition Qualification
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

    -- User Import Sets & Transform Maps (ServiceNow Staging Architecture)
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
      created_by VARCHAR(120) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      executed_by VARCHAR(120),
      executed_at TIMESTAMP WITH TIME ZONE
    );
    CREATE INDEX IF NOT EXISTS idx_import_sets_status ON user_import_sets(status);
    CREATE INDEX IF NOT EXISTS idx_import_sets_number ON user_import_sets(set_number);

    ALTER TABLE user_import_sets ADD COLUMN IF NOT EXISTS selected_sheet VARCHAR(120);
    ALTER TABLE user_import_sets ADD COLUMN IF NOT EXISTS sheets_available_json TEXT DEFAULT '[]';
    ALTER TABLE user_import_sets ADD COLUMN IF NOT EXISTS execution_lock_id VARCHAR(80);
    ALTER TABLE user_import_sets ADD COLUMN IF NOT EXISTS execution_started_at TIMESTAMP WITH TIME ZONE;
    ALTER TABLE user_import_sets ADD COLUMN IF NOT EXISTS execution_heartbeat_at TIMESTAMP WITH TIME ZONE;

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
      error_message TEXT,
      is_excluded BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_staging_import_set ON user_import_staging_rows(import_set_id);
    CREATE INDEX IF NOT EXISTS idx_staging_validation ON user_import_staging_rows(validation_status);
    CREATE INDEX IF NOT EXISTS idx_staging_transform ON user_import_staging_rows(transform_status);

    ALTER TABLE user_import_staging_rows ADD COLUMN IF NOT EXISTS email_status VARCHAR(40) DEFAULT 'NOT_SENT';
    ALTER TABLE user_import_staging_rows ADD COLUMN IF NOT EXISTS email_error TEXT;
    ALTER TABLE user_import_staging_rows ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMP WITH TIME ZONE;
    ALTER TABLE user_import_staging_rows ADD COLUMN IF NOT EXISTS execution_lock_id VARCHAR(80);

    ALTER TABLE users ADD COLUMN IF NOT EXISTS invitation_token VARCHAR(120);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS invitation_token_expires_at TIMESTAMP WITH TIME ZONE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 1;

    CREATE TABLE IF NOT EXISTS password_resets (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash VARCHAR(64) NOT NULL UNIQUE,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      used_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_password_resets_token_hash ON password_resets(token_hash);
    CREATE INDEX IF NOT EXISTS idx_password_resets_user_id ON password_resets(user_id);

    ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enrolled BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_secret_encrypted TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enrolled_at TIMESTAMP WITH TIME ZONE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_last_timestep BIGINT DEFAULT 0;

    CREATE TABLE IF NOT EXISTS user_mfa_recovery_codes (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      code_hash VARCHAR(64) NOT NULL,
      used_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_mfa_recovery_codes_user ON user_mfa_recovery_codes(user_id);
    CREATE INDEX IF NOT EXISTS idx_mfa_recovery_codes_hash ON user_mfa_recovery_codes(code_hash);

    CREATE TABLE IF NOT EXISTS rate_limit_buckets (
      key VARCHAR(128) PRIMARY KEY,
      count INTEGER NOT NULL DEFAULT 1,
      reset_at TIMESTAMP WITH TIME ZONE NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_rate_limit_reset ON rate_limit_buckets(reset_at);

    CREATE TABLE IF NOT EXISTS mfa_enrollment_authorizations (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash VARCHAR(64) NOT NULL UNIQUE,
      created_by INTEGER REFERENCES users(id),
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      used_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_mfa_auth_user ON mfa_enrollment_authorizations(user_id);
    CREATE INDEX IF NOT EXISTS idx_mfa_auth_hash ON mfa_enrollment_authorizations(token_hash);

    CREATE TABLE IF NOT EXISTS user_sessions (
      id SERIAL PRIMARY KEY,
      jti VARCHAR(64) NOT NULL UNIQUE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role VARCHAR(40) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_active_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      revoked BOOLEAN NOT NULL DEFAULT FALSE,
      revoked_at TIMESTAMP WITH TIME ZONE
    );
    CREATE INDEX IF NOT EXISTS idx_user_sessions_jti ON user_sessions(jti);
    CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);
  `);
}

/**
 * Seed initial reference data, technical RBAC roles, timeouts, and ensure default administrator.
 * Only contains DML statements (INSERT, UPDATE) and never executes DDL.
 */
export async function seedInitialData(client: DBClient): Promise<void> {
  // Seed Technical Roles from RBAC Specification if empty
  await client.exec(`
    INSERT INTO roles (role_id, role_name, business_profile, description, safeguards, active) VALUES
      ('admin', 'Platform Administrator', 'Admin', 'Highest privilege. Assign only to trusted administrators.', 'Assign only to trusted administrators; log assignments and removals.', TRUE),
      ('lh_security_admin', 'Security Administrator', 'Admin', 'Security administration. Limit access to security configuration and sensitive controls.', 'Limit access to security configuration and sensitive controls.', TRUE),
      ('ITIL', 'ITIL Workflow Operator', 'Secretary', 'Secretary workflows (as configured). Applicant intake and administrative tracking.', 'Do not assume this role means full administrator access. Verify permissions and inherited access.', TRUE),
      ('lh_internal', 'Internal Application Access', 'Secretary', 'Internal application access. Restrict to applicant intake, assigned records, comments and history.', 'Restrict to applicant intake, assigned records, comments and history.', TRUE),
      ('lh_finance', 'Finance & AVI Officer', 'Finance Officer', 'AVI and parent-financing operations, YIMMILINE desk calculations and loan requests.', 'Restrict to AVI-related functions and records; do not grant unrelated finance or system configuration access.', TRUE),
      ('secretary', 'Secretary (Intake & Admissions)', 'Secretary', 'Intake officer and applicant management operations.', 'Limit to applicant registration and admissions tracking.', TRUE),
      ('avi', 'Finance Officer (Blocked Account / AVI)', 'Finance Officer', 'Guichet AVI and loan verification operator.', 'Restrict to AVI desk operations.', TRUE)
    ON CONFLICT (role_id) DO NOTHING;

    INSERT INTO role_session_timeouts (role_id, role_name, business_profile, timeout_minutes, updated_by) VALUES
      ('admin', 'Platform Administrator (Admin / Self)', 'Admin', 15, 'System Initializer'),
      ('lh_security_admin', 'Security Administrator', 'Admin', 15, 'System Initializer'),
      ('secretary', 'Secretary (Admissions & Intake)', 'Secretary', 20, 'System Initializer'),
      ('ITIL', 'ITIL Workflow Operator', 'Secretary', 20, 'System Initializer'),
      ('lh_internal', 'Internal Application Access', 'Secretary', 20, 'System Initializer'),
      ('avi', 'Finance Officer (Blocked Account / AVI)', 'Finance Officer', 15, 'System Initializer'),
      ('lh_finance', 'Finance & AVI Officer', 'Finance Officer', 15, 'System Initializer')
    ON CONFLICT (role_id) DO NOTHING;

    -- Ensure default administrator account and initial role assignments are created ONLY IF IT DOES NOT ALREADY EXIST.
    -- Routine initialisation must NEVER restore privileges or grant roles to existing administrator records.
    WITH new_admin AS (
      INSERT INTO users (name, first_name, last_name, user_id, email, business_profile, role, title, initials, active)
      VALUES ('Barthelemy MAPWABA NTORO', 'Barthelemy', 'MAPWABA NTORO', 'bmapwaba', 'bmapwabantoro@liecconsulting.com', 'Admin', 'admin', 'Platform Administrator & Managing Director', 'BM', TRUE)
      ON CONFLICT (email) DO NOTHING
      RETURNING id
    )
    INSERT INTO user_roles (user_id, role_id, assigned_by)
    SELECT id, 'admin', 'System Initializer' FROM new_admin
    UNION ALL
    SELECT id, 'lh_security_admin', 'System Initializer' FROM new_admin;

    UPDATE avi_requests SET student_ref = '#CAN-2025-042' WHERE student_name ILIKE '%Kabangele%' AND (student_ref IS NULL OR student_ref = '');
  `);
}

/**
 * Fail-closed runtime DDL guard.
 * Strictly checks the actual client engine identity:
 * Only embedded PGlite (client.engine === 'pglite') may execute runtime DDL.
 * External PostgreSQL (client.engine === 'pg') is strictly blocked from runtime DDL.
 * FORCE_PGLITE=true or any override environment variable must NEVER enable DDL on an external PostgreSQL client.
 * Schema changes in production/external environments are exclusively migration-driven.
 */
export function shouldExecuteRuntimeDDL(client: DBClient): boolean {
  return client.engine === 'pglite';
}

/**
 * Fail-closed runtime Seeding guard.
 * Strictly checks the actual client engine identity:
 * Only embedded PGlite (client.engine === 'pglite') may execute runtime seeding.
 * External PostgreSQL (client.engine === 'pg') is strictly blocked from runtime data seeding.
 * FORCE_PGLITE=true or any override environment variable must NEVER enable seeding on an external PostgreSQL client.
 */
export function shouldExecuteRuntimeSeeding(client: DBClient): boolean {
  return client.engine === 'pglite';
}

/**
 * Backward-compatible initialisation orchestrator applying fail-closed guards.
 */
export async function initSchemaAndSeed(client: DBClient): Promise<void> {
  if (shouldExecuteRuntimeDDL(client)) {
    await initSchemaDDL(client);
  } else {
    console.warn('[DB-SECURITY] External PostgreSQL detected: Runtime DDL initialization is disabled (Fail-Closed). DDL statements skipped.');
  }

  if (shouldExecuteRuntimeSeeding(client)) {
    await seedInitialData(client);
  } else {
    console.warn('[DB-SECURITY] External PostgreSQL detected: Runtime data seeding is disabled (Fail-Closed). Seeding statements skipped.');
  }
}
function getSafeDbInfo(rawUrl: string): { host: string; database: string } {
  try {
    const u = new URL(rawUrl);
    return { host: u.host, database: u.pathname.replace(/^\//, '') || 'neondb' };
  } catch {
    return { host: 'unknown-host', database: 'unknown-db' };
  }
}

async function createDBClient(): Promise<DBClient> {
  const directUrl = process.env.DATABASE_URL;
  const pooledUrl = process.env.DATABASE_URL_POOLED;
  const queryUrl = pooledUrl || directUrl;

  if (queryUrl && process.env.FORCE_PGLITE !== 'true') {
    try {
      const isLocalhost = queryUrl.includes('localhost') || queryUrl.includes('127.0.0.1');
      const safeInfo = getSafeDbInfo(queryUrl);
      const isPooled = Boolean(pooledUrl && queryUrl === pooledUrl);

      const pool = new Pool({
        connectionString: queryUrl,
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 30000,
        max: process.env.DB_POOL_MAX ? Number(process.env.DB_POOL_MAX) : 10,
        ssl: isLocalhost ? false : { rejectUnauthorized: false },
      });

      await pool.query('SELECT 1');
      console.log(`[DB] Successfully connected to Neon PostgreSQL host: ${safeInfo.host} (database: ${safeInfo.database}) [mode: ${isPooled ? 'pooled' : 'direct'}]`);

      const pgClient: DBClient = {
        engine: 'pg',
        async query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
          const res = await pool.query(sql, params);
          const rowCount =
            typeof res.rowCount === 'number'
              ? res.rowCount
              : (res.rows && res.rows.length > 0 ? res.rows.length : 0);
          return { rows: res.rows as T[], rowCount };
        },
        async exec(sql: string): Promise<void> {
          await pool.query(sql);
        },
      };

      if (shouldExecuteRuntimeDDL(pgClient)) {
        await initSchemaDDL(pgClient);
      } else {
        console.warn('[DB-SECURITY] External PostgreSQL detected: Runtime DDL initialization is disabled (Fail-Closed). DDL statements skipped.');
      }

      if (shouldExecuteRuntimeSeeding(pgClient)) {
        await seedInitialData(pgClient);
      } else {
        console.warn('[DB-SECURITY] External PostgreSQL detected: Runtime data seeding is disabled (Fail-Closed). Seeding statements skipped.');
      }

      return pgClient;
    } catch (err: any) {
      console.warn('[DB] Could not connect to external Neon PostgreSQL server:', err?.message || err);
      console.warn('[DB] Falling back to embedded PGlite instance.');
    }
  }

  // Resolve dataDir with full support for Serverless environments (AWS Lambda, Vercel, read-only /var/task)
  let pglite: any;
  const isServerless =
    Boolean(process.env.VERCEL) ||
    Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
    Boolean(process.env.LAMBDA_TASK_ROOT) ||
    process.cwd().startsWith('/var/task');

  const candidateDirs = isServerless
    ? [path.join(os.tmpdir(), '.pgdata'), '/tmp/.pgdata']
    : [
        path.join(process.cwd(), 'database', '.pgdata'),
        path.join(os.tmpdir(), '.pgdata'),
        '/tmp/.pgdata',
      ];

  for (const dir of candidateDirs) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      pglite = new PGlite(dir);
      await pglite.waitReady;
      break;
    } catch (e) {
      console.warn(`Could not initialize PGlite at "${dir}":`, e);
    }
  }

  // Fallback to in-memory PGlite if all filesystem attempts fail
  if (!pglite) {
    console.warn('Falling back to in-memory PGlite instance.');
    pglite = new PGlite();
    await pglite.waitReady;
  }

  const pgliteClient: DBClient = {
    engine: 'pglite',
    async query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
      const res = await (pglite as any).query(sql, params);
      const rowCount =
        res.rows && res.rows.length > 0
          ? res.rows.length
          : (typeof res.affectedRows === 'number' ? res.affectedRows : 0);
      return { rows: res.rows as T[], rowCount };
    },
    async exec(sql: string): Promise<void> {
      await pglite.exec(sql);
    },
  };

  if (shouldExecuteRuntimeDDL(pgliteClient)) {
    await initSchemaDDL(pgliteClient);
  }
  if (shouldExecuteRuntimeSeeding(pgliteClient)) {
    await seedInitialData(pgliteClient);
  }
  return pgliteClient;
}

export async function getDb(): Promise<DBClient> {
  if (!global.__liecDbClientV4) {
    global.__liecDbClientV4 = createDBClient();
  }
  return global.__liecDbClientV4;
}
