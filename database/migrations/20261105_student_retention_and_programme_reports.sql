-- ==============================================================================
-- Migration: Student Retention Policy & Annual Intake Programme Reporting
-- Target: Neon PostgreSQL / LIEC Heav'n Workspace
-- Authorisation: Technical Implementation & Review Only (Do NOT execute in prod without approval)
-- ==============================================================================

-- 1. Extend candidats table with academic intake, qualification, visa and retention lifecycle fields
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

-- 2. Performance indexes for intake reporting and retention deadline checks
CREATE INDEX IF NOT EXISTS idx_candidats_intake ON candidats(application_year);
CREATE INDEX IF NOT EXISTS idx_candidats_qualified_at ON candidats(qualified_at);
CREATE INDEX IF NOT EXISTS idx_candidats_visa_status ON candidats(visa_status);
CREATE INDEX IF NOT EXISTS idx_candidats_docs_purged ON candidats(documents_purged);

-- 3. Dedicated audit table for document retention compliance
CREATE TABLE IF NOT EXISTS document_retention_logs (
  id SERIAL PRIMARY KEY,
  student_ref VARCHAR(50) NOT NULL,
  trigger_type VARCHAR(50) NOT NULL, -- 'VISA_OBTAINED_EARLY' | '11_MONTH_DEADLINE' | 'MANUAL_AUTHORISED'
  initiated_by VARCHAR(120) NOT NULL,
  purged_documents_count INTEGER NOT NULL DEFAULT 0,
  purged_files_summary TEXT,
  storage_deletion_verified BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  purged_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_retention_student ON document_retention_logs(student_ref);

-- 4. Dedicated table for finalized annual intake report snapshots
CREATE TABLE IF NOT EXISTS programme_report_snapshots (
  id SERIAL PRIMARY KEY,
  intake_year VARCHAR(30) NOT NULL,
  report_mode VARCHAR(30) NOT NULL DEFAULT 'FINALISED_CUTOFF', -- 'LIVE_PROGRESS' | 'FINALISED_CUTOFF'
  cutoff_date DATE,
  snapshot_title VARCHAR(200) NOT NULL,
  summary_json TEXT NOT NULL DEFAULT '{}',
  students_json TEXT NOT NULL DEFAULT '[]',
  created_by VARCHAR(120) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_snapshots_intake ON programme_report_snapshots(intake_year);
CREATE INDEX IF NOT EXISTS idx_snapshots_cutoff ON programme_report_snapshots(cutoff_date);
