-- LIEC Heav'n Standalone Migration (Corrected)
-- Date: 2026-11-06
-- Modules: Prospects CRM 4-Stage Lifecycle, 3-Condition Qualification & Accommodation Manual Confirmation
-- Target: Neon PostgreSQL & Local PGLite
-- Safety Note: Prepared for review. DO NOT EXECUTE DIRECTLY AGAINST PRODUCTION WITHOUT EXPLICIT APPROVAL.

-- ============================================================================
-- 1. PROSPECTS CRM EXTENSIONS
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

-- Registration must NEVER default to TRUE; requires verified administrative file
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS registration_completed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS registration_date TIMESTAMP WITH TIME ZONE;

-- First instalment must NEVER default to TRUE; requires verified financial records
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS first_instalment_paid BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS first_instalment_amount NUMERIC(10,2);
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS first_instalment_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS first_instalment_ref VARCHAR(100);

ALTER TABLE prospects ADD COLUMN IF NOT EXISTS qualification_completed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS qualification_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS converted_candidate_ref VARCHAR(50);

-- ============================================================================
-- 2. DEMANDES (RECEIVED APPLICATIONS) QUALIFICATION WORKFLOW EXTENSIONS
-- ============================================================================

ALTER TABLE demandes ADD COLUMN IF NOT EXISTS eligibility_status VARCHAR(50) DEFAULT 'Pending Review';
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS registration_completed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS registration_date TIMESTAMP WITH TIME ZONE;

ALTER TABLE demandes ADD COLUMN IF NOT EXISTS first_instalment_paid BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS first_instalment_amount NUMERIC(10,2);
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS first_instalment_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS first_instalment_ref VARCHAR(100);

ALTER TABLE demandes ADD COLUMN IF NOT EXISTS converted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS converted_candidate_ref VARCHAR(50);

-- ============================================================================
-- 3. CANDIDATS RECORD QUALIFICATION & RETENTION CANONICAL TIMESTAMPS
-- ============================================================================

-- Strict Safeguard: NEVER default historical students to registered or paid
ALTER TABLE candidats ADD COLUMN IF NOT EXISTS registration_completed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE candidats ADD COLUMN IF NOT EXISTS first_instalment_paid BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE candidats ADD COLUMN IF NOT EXISTS first_instalment_amount NUMERIC(10,2);
ALTER TABLE candidats ADD COLUMN IF NOT EXISTS first_instalment_ref VARCHAR(100);

-- Canonical qualification timestamp (governs the 11-month retention baseline)
ALTER TABLE candidats ADD COLUMN IF NOT EXISTS qualified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE candidats ADD COLUMN IF NOT EXISTS qualification_status VARCHAR(50) DEFAULT 'REQUIRES_REVIEW';

-- Safe historical data reconciliation (Zero backdating / Zero assumption of payment)
UPDATE candidats SET qualification_status = 'REQUIRES_REVIEW' WHERE qualified_at IS NULL;
UPDATE candidats SET first_instalment_paid = FALSE WHERE first_instalment_ref IS NULL;
UPDATE candidats SET registration_completed = FALSE WHERE registration_completed IS NULL;

-- ============================================================================
-- 4. ACCOMMODATION RESERVATIONS MANUAL CONFIRMATION EXTENSIONS
-- ============================================================================

ALTER TABLE accommodation_requests ADD COLUMN IF NOT EXISTS confirmation_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE accommodation_requests ADD COLUMN IF NOT EXISTS confirmation_reference VARCHAR(100);
ALTER TABLE accommodation_requests ADD COLUMN IF NOT EXISTS confirmation_agent VARCHAR(150);
ALTER TABLE accommodation_requests ADD COLUMN IF NOT EXISTS confirmation_notes TEXT;
ALTER TABLE accommodation_requests ADD COLUMN IF NOT EXISTS confirmation_doc_name VARCHAR(255);
ALTER TABLE accommodation_requests ADD COLUMN IF NOT EXISTS decline_reason TEXT;
ALTER TABLE accommodation_requests ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- ============================================================================
-- 5. PERFORMANCE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_prospects_stage ON prospects (stage);
CREATE INDEX IF NOT EXISTS idx_demandes_converted_ref ON demandes (converted_candidate_ref);
CREATE INDEX IF NOT EXISTS idx_accommodation_status ON accommodation_requests (status);
CREATE INDEX IF NOT EXISTS idx_candidats_qualified_at ON candidats (qualified_at);
CREATE INDEX IF NOT EXISTS idx_candidats_first_instalment ON candidats (first_instalment_paid);
