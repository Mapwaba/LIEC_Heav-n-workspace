-- ==============================================================================
-- LIEC Heav'n - Complete Production Migration Package (Unified & Idempotent)
-- Target: Neon PostgreSQL (Production) & Local PGLite
-- Date: 2026-11-06
-- Scope:
--   1. Student Document Retention Policy (11-Month Canonical Baseline & Safeguards)
--   2. Annual Academic Intake Programme Reporting (Snapshots & Cutoff Verification)
--   3. Prospects CRM 4-Stage Lifecycle & 3-Condition Qualification Workflow
--   4. Accommodation Reservations Manual Confirmation & Partner Access Tokens
--   5. Historical Record Data Reconciliation (Zero Assumption / Zero Backdating)
-- Safety: Fully Idempotent (IF NOT EXISTS).
-- STATUS: READY FOR REVIEW. DO NOT EXECUTE DIRECTLY WITHOUT EXPLICIT APPROVAL.
-- ==============================================================================

BEGIN;

-- ==============================================================================
-- SECTION 1: CANDIDATS TABLE ENHANCEMENTS
-- ==============================================================================

-- 1.1 Academic intake, procedure & visa fields
ALTER TABLE candidats ADD COLUMN IF NOT EXISTS application_year VARCHAR(30) DEFAULT '2027–2028';
ALTER TABLE candidats ADD COLUMN IF NOT EXISTS visa_status VARCHAR(40) DEFAULT 'NOT_APPLIED';
ALTER TABLE candidats ADD COLUMN IF NOT EXISTS visa_submission_date DATE;
ALTER TABLE candidats ADD COLUMN IF NOT EXISTS visa_decision_date DATE;
ALTER TABLE candidats ADD COLUMN IF NOT EXISTS visa_outcome_notes TEXT;

-- 1.2 Canonical qualification timestamp (governs the 11-month retention baseline)
ALTER TABLE candidats ADD COLUMN IF NOT EXISTS qualified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE candidats ADD COLUMN IF NOT EXISTS qualification_status VARCHAR(50) DEFAULT 'REQUIRES_REVIEW';

-- 1.3 Document retention purge tracking
ALTER TABLE candidats ADD COLUMN IF NOT EXISTS documents_purged BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE candidats ADD COLUMN IF NOT EXISTS documents_purged_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE candidats ADD COLUMN IF NOT EXISTS documents_purged_by VARCHAR(120);

-- 1.4 Registration & First instalment payment (Strict False defaults; no automatic assumptions)
ALTER TABLE candidats ADD COLUMN IF NOT EXISTS registration_completed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE candidats ADD COLUMN IF NOT EXISTS first_instalment_paid BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE candidats ADD COLUMN IF NOT EXISTS first_instalment_amount NUMERIC(10,2);
ALTER TABLE candidats ADD COLUMN IF NOT EXISTS first_instalment_ref VARCHAR(100);

-- ==============================================================================
-- SECTION 2: PROSPECTS CRM 4-STAGE LIFECYCLE EXTENSIONS
-- ==============================================================================

ALTER TABLE prospects ADD COLUMN IF NOT EXISTS lead_source VARCHAR(100) DEFAULT 'Site Web LIEC';

-- Stage 2: First Contact
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS first_contact_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS first_contact_method VARCHAR(50);
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS first_contact_outcome VARCHAR(100);
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS first_contact_notes TEXT;

-- Stage 3: Eligibility Diagnostic
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS eligibility_status VARCHAR(50) DEFAULT 'Pending Review';
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS eligibility_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS eligibility_assessed_by VARCHAR(150);
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS eligibility_notes TEXT;

-- Mandatory Qualification Pre-conditions
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS registration_completed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS registration_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS first_instalment_paid BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS first_instalment_amount NUMERIC(10,2);
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS first_instalment_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS first_instalment_ref VARCHAR(100);

-- Stage 4: Official Qualification
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS qualification_completed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS qualification_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS converted_candidate_ref VARCHAR(50);

-- ==============================================================================
-- SECTION 3: DEMANDES (RECEIVED APPLICATIONS) WORKFLOW EXTENSIONS
-- ==============================================================================

ALTER TABLE demandes ADD COLUMN IF NOT EXISTS eligibility_status VARCHAR(50) DEFAULT 'Pending Review';
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS registration_completed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS registration_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS first_instalment_paid BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS first_instalment_amount NUMERIC(10,2);
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS first_instalment_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS first_instalment_ref VARCHAR(100);
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS converted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS converted_candidate_ref VARCHAR(50);

-- ==============================================================================
-- SECTION 4: ACCOMMODATION RESERVATIONS WORKFLOW EXTENSIONS
-- ==============================================================================

ALTER TABLE accommodation_requests ADD COLUMN IF NOT EXISTS confirmation_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE accommodation_requests ADD COLUMN IF NOT EXISTS confirmation_reference VARCHAR(100);
ALTER TABLE accommodation_requests ADD COLUMN IF NOT EXISTS confirmation_agent VARCHAR(150);
ALTER TABLE accommodation_requests ADD COLUMN IF NOT EXISTS confirmation_notes TEXT;
ALTER TABLE accommodation_requests ADD COLUMN IF NOT EXISTS confirmation_doc_name VARCHAR(255);
ALTER TABLE accommodation_requests ADD COLUMN IF NOT EXISTS decline_reason TEXT;
ALTER TABLE accommodation_requests ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- ==============================================================================
-- SECTION 5: DEDICATED TABLES FOR TOKENS, RETENTION LOGS & REPORT SNAPSHOTS
-- ==============================================================================

-- 5.1 Time-limited, revokable partner accommodation access tokens
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

-- 5.2 Immutable document retention audit logs
CREATE TABLE IF NOT EXISTS document_retention_logs (
  id SERIAL PRIMARY KEY,
  student_ref VARCHAR(50) NOT NULL,
  student_name VARCHAR(150),
  trigger_reason VARCHAR(60) NOT NULL,
  trigger_type VARCHAR(50),
  purged_by VARCHAR(120) NOT NULL,
  initiated_by VARCHAR(120),
  files_count INTEGER NOT NULL DEFAULT 0,
  purged_documents_count INTEGER DEFAULT 0,
  files_detail_json TEXT,
  purged_files_summary TEXT,
  storage_verification VARCHAR(60) DEFAULT 'SUCCESS_DELETED_FROM_S3',
  storage_deletion_verified BOOLEAN DEFAULT TRUE,
  status VARCHAR(40) DEFAULT 'PURGED',
  notes TEXT,
  purged_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5.3 Dedicated table for finalized annual intake report snapshots
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

-- ==============================================================================
-- SECTION 6: PERFORMANCE INDEXES
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_candidats_intake ON candidats(application_year);
CREATE INDEX IF NOT EXISTS idx_candidats_qualified_at ON candidats(qualified_at);
CREATE INDEX IF NOT EXISTS idx_candidats_visa_status ON candidats(visa_status);
CREATE INDEX IF NOT EXISTS idx_candidats_docs_purged ON candidats(documents_purged);
CREATE INDEX IF NOT EXISTS idx_candidats_first_instalment ON candidats(first_instalment_paid);

CREATE INDEX IF NOT EXISTS idx_prospects_stage ON prospects(stage);
CREATE INDEX IF NOT EXISTS idx_demandes_converted_ref ON demandes(converted_candidate_ref);
CREATE INDEX IF NOT EXISTS idx_accommodation_status ON accommodation_requests(status);

CREATE INDEX IF NOT EXISTS idx_acc_tokens_hash ON accommodation_access_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_acc_tokens_ref ON accommodation_access_tokens(request_ref);
CREATE INDEX IF NOT EXISTS idx_retention_student ON document_retention_logs(student_ref);
CREATE INDEX IF NOT EXISTS idx_snapshots_intake ON programme_report_snapshots(intake_year);
CREATE INDEX IF NOT EXISTS idx_snapshots_cutoff ON programme_report_snapshots(cutoff_date);

-- ==============================================================================
-- SECTION 7: HISTORICAL DATA RECONCILIATION SAFEGUARDS (ZERO BACKDATING)
-- ==============================================================================

-- Unqualified historical candidates flagged for review; never invent dates
UPDATE candidats SET qualification_status = 'REQUIRES_REVIEW' WHERE qualified_at IS NULL;

-- Never assume payment without verified financial reference
UPDATE candidats SET first_instalment_paid = FALSE WHERE first_instalment_ref IS NULL;
UPDATE candidats SET registration_completed = FALSE WHERE registration_completed IS NULL;

COMMIT;
