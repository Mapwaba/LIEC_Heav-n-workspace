-- =============================================================================
-- LIEC Heav’n — Workstream 3 Database Migration
-- Phase 1: Foundational Payment Lifecycle Architecture
-- Target: Payment Submissions, Evidence Documents, and Immutable Event Trail
-- Baseline: v1.3.1-hotfix (Commit 33c826c)
-- Reference: W3_PAYMENT_WORKFLOW_ARCHITECTURE.md
-- =============================================================================

BEGIN;

-- 1. Table: payment_submissions
-- Captures payment submissions for applicants (Demandes, Prospects, Candidats)
-- across multiple instalments and payment methods (Rawbank & custom alternatives).
CREATE TABLE IF NOT EXISTS payment_submissions (
    id SERIAL PRIMARY KEY,
    submission_ref VARCHAR(50) NOT NULL UNIQUE,
    
    -- Target entity linkage
    entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('DEMANDE', 'PROSPECT', 'CANDIDAT')),
    entity_ref VARCHAR(60) NOT NULL,
    applicant_name VARCHAR(200) NOT NULL,
    applicant_email VARCHAR(200),
    
    -- Financial details
    instalment_number INTEGER NOT NULL DEFAULT 1 CHECK (instalment_number >= 1),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    payment_date DATE NOT NULL,
    
    -- Payment Channel & Details
    payment_method VARCHAR(50) NOT NULL,
    payment_method_custom VARCHAR(100),
    transaction_reference VARCHAR(120),
    
    -- Rawbank Official Channel Specifics
    rawbank_slip_number VARCHAR(6) CHECK (rawbank_slip_number IS NULL OR rawbank_slip_number ~ '^\d{6}$'),
    rawbank_operation_code VARCHAR(3) CHECK (rawbank_operation_code IS NULL OR rawbank_operation_code ~ '^\d{3}$'),
    
    -- Lifecycle Status
    status VARCHAR(40) NOT NULL DEFAULT 'PENDING_ADMIN_VALIDATION' CHECK (
        status IN ('PENDING_ADMIN_VALIDATION', 'VALIDATED', 'REJECTED', 'ADDITIONAL_EVIDENCE_REQUESTED')
    ),
    is_direct_admin_entry BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Submitter Information
    submitted_by VARCHAR(120) NOT NULL,
    submitted_by_name VARCHAR(150),
    submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Reviewer & Decision Information
    validated_by VARCHAR(120),
    validated_at TIMESTAMP WITH TIME ZONE,
    decision_reason TEXT,
    
    -- General Notes & Metadata
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Performance & Query Indexes
CREATE INDEX IF NOT EXISTS idx_payment_submissions_status ON payment_submissions(status);
CREATE INDEX IF NOT EXISTS idx_payment_submissions_entity ON payment_submissions(entity_type, entity_ref);
CREATE INDEX IF NOT EXISTS idx_payment_submissions_submitted_by ON payment_submissions(submitted_by);
CREATE INDEX IF NOT EXISTS idx_payment_submissions_created_at ON payment_submissions(created_at DESC);

-- Unique index to prevent duplicate Rawbank slip/op-code reuse across validated payments
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_submissions_rawbank_unique 
ON payment_submissions(rawbank_slip_number, rawbank_operation_code) 
WHERE rawbank_slip_number IS NOT NULL AND status = 'VALIDATED';

-- Concurrency guard: Only ONE active pending/in-review submission per entity and instalment
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_submissions_active_pending 
ON payment_submissions(entity_type, entity_ref, instalment_number) 
WHERE status IN ('PENDING_ADMIN_VALIDATION', 'ADDITIONAL_EVIDENCE_REQUESTED');


-- 2. Table: payment_submission_evidence
-- Stores attached evidence files (PDF, JPG, PNG) stored in private S3 bucket.
CREATE TABLE IF NOT EXISTS payment_submission_evidence (
    id SERIAL PRIMARY KEY,
    submission_id INTEGER NOT NULL REFERENCES payment_submissions(id) ON DELETE CASCADE,
    
    -- Storage details
    file_key VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes INTEGER NOT NULL CHECK (file_size_bytes > 0),
    mime_type VARCHAR(100) NOT NULL CHECK (mime_type IN ('application/pdf', 'image/jpeg', 'image/png')),
    storage_bucket VARCHAR(100) NOT NULL,
    
    -- Audit trail
    uploaded_by VARCHAR(120) NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_submission_evidence_sub_id ON payment_submission_evidence(submission_id);


-- 3. Table: payment_submission_events
-- Immutable audit log of all submission actions, reviews, decisions and status changes.
CREATE TABLE IF NOT EXISTS payment_submission_events (
    id SERIAL PRIMARY KEY,
    submission_id INTEGER NOT NULL REFERENCES payment_submissions(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL CHECK (
        event_type IN ('SUBMITTED', 'VALIDATED', 'REJECTED', 'EVIDENCE_REQUESTED', 'EVIDENCE_PROVIDED', 'DIRECT_VALIDATION')
    ),
    actor_email VARCHAR(120) NOT NULL,
    actor_name VARCHAR(150),
    actor_role VARCHAR(50) NOT NULL,
    previous_status VARCHAR(40),
    new_status VARCHAR(40) NOT NULL,
    decision_reason TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_submission_events_sub_id ON payment_submission_events(submission_id);
CREATE INDEX IF NOT EXISTS idx_submission_events_created_at ON payment_submission_events(created_at DESC);


-- 4. Historical Backfill for existing validated Demandes
INSERT INTO payment_submissions (
    submission_ref,
    entity_type,
    entity_ref,
    applicant_name,
    applicant_email,
    instalment_number,
    amount,
    currency,
    payment_date,
    payment_method,
    rawbank_slip_number,
    rawbank_operation_code,
    status,
    is_direct_admin_entry,
    submitted_by,
    submitted_by_name,
    validated_by,
    validated_at,
    notes,
    created_at,
    updated_at
)
SELECT 
    'SUB-HIST-DEM-' || d.id,
    'DEMANDE',
    d.ref,
    d.full_name,
    d.email,
    1,
    COALESCE(d.first_instalment_amount, 1800.00),
    'USD',
    COALESCE(d.first_instalment_date::date, CURRENT_DATE),
    'Rawbank Deposit',
    d.rawbank_slip_number,
    d.rawbank_operation_code,
    'VALIDATED',
    TRUE,
    COALESCE(d.first_instalment_verified_by, 'bmapwabantoro@liecconsulting.com'),
    'Historical Administrator',
    COALESCE(d.first_instalment_verified_by, 'bmapwabantoro@liecconsulting.com'),
    COALESCE(d.first_instalment_date, CURRENT_TIMESTAMP),
    COALESCE(d.first_instalment_notes, 'Historical backfill from v1.3.1-hotfix'),
    COALESCE(d.created_at, CURRENT_TIMESTAMP),
    COALESCE(d.first_instalment_date, CURRENT_TIMESTAMP)
FROM demandes d
WHERE d.first_instalment_paid = TRUE
ON CONFLICT (submission_ref) DO NOTHING;


-- 5. Historical Backfill for existing validated Prospects (standalone)
INSERT INTO payment_submissions (
    submission_ref,
    entity_type,
    entity_ref,
    applicant_name,
    applicant_email,
    instalment_number,
    amount,
    currency,
    payment_date,
    payment_method,
    rawbank_slip_number,
    rawbank_operation_code,
    status,
    is_direct_admin_entry,
    submitted_by,
    submitted_by_name,
    validated_by,
    validated_at,
    notes,
    created_at,
    updated_at
)
SELECT 
    'SUB-HIST-PROSP-' || p.id,
    'PROSPECT',
    p.id::text,
    p.full_name,
    NULL, -- prospects table does not store applicant email
    1,
    COALESCE(p.first_instalment_amount, 1800.00),
    'USD',
    COALESCE(p.first_instalment_date::date, CURRENT_DATE),
    'Rawbank Deposit',
    p.rawbank_slip_number,
    p.rawbank_operation_code,
    'VALIDATED',
    TRUE,
    COALESCE(p.first_instalment_verified_by, 'bmapwabantoro@liecconsulting.com'),
    'Historical Administrator',
    COALESCE(p.first_instalment_verified_by, 'bmapwabantoro@liecconsulting.com'),
    COALESCE(p.first_instalment_date, CURRENT_TIMESTAMP),
    COALESCE(p.first_instalment_notes, 'Historical backfill from v1.3.1-hotfix'),
    COALESCE(p.created_at, CURRENT_TIMESTAMP),
    COALESCE(p.first_instalment_date, CURRENT_TIMESTAMP)
FROM prospects p
WHERE p.first_instalment_paid = TRUE
  AND (p.rawbank_slip_number IS NULL OR NOT EXISTS (
      SELECT 1 FROM payment_submissions ps 
      WHERE ps.rawbank_slip_number = p.rawbank_slip_number 
        AND ps.rawbank_operation_code = p.rawbank_operation_code
  ))
ON CONFLICT (submission_ref) DO NOTHING;


-- 6. Historical Backfill Events
INSERT INTO payment_submission_events (
    submission_id,
    event_type,
    actor_email,
    actor_name,
    actor_role,
    previous_status,
    new_status,
    decision_reason,
    created_at
)
SELECT 
    ps.id,
    'DIRECT_VALIDATION',
    ps.validated_by,
    'System Migration',
    'Admin',
    NULL,
    'VALIDATED',
    'Historical payment backfilled from v1.3.1-hotfix qualification records',
    ps.created_at
FROM payment_submissions ps
WHERE ps.submission_ref LIKE 'SUB-HIST-%'
  AND NOT EXISTS (
    SELECT 1 FROM payment_submission_events pse WHERE pse.submission_id = ps.id
  );

COMMIT;
