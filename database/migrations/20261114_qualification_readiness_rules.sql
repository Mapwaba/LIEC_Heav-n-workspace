-- =============================================================================
-- LIEC Heav’n — Qualification Readiness Validation Rules Migration
-- Reference: LIEC-QUALIFICATION-READINESS-VALIDATION-SPECIFICATION-001
-- Scope: Additive columns and indexes for Rawbank 6-digit slip, 3-digit op-code,
--        and reviewer audit metadata across Demandes and Prospects.
-- =============================================================================

-- 1. Demandes Additive Columns
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS rawbank_slip_number VARCHAR(6);
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS rawbank_operation_code VARCHAR(3);
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS first_instalment_verified_by VARCHAR(120);
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS first_instalment_notes TEXT;
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS registration_verified_by VARCHAR(120);
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS registration_notes TEXT;
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS eligibility_assessed_by VARCHAR(120);
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS eligibility_notes TEXT;

-- 2. Prospects Additive Columns
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS rawbank_slip_number VARCHAR(6);
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS rawbank_operation_code VARCHAR(3);
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS first_instalment_verified_by VARCHAR(120);
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS registration_verified_by VARCHAR(120);
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS registration_notes TEXT;

-- 3. Performance & Anti-Duplicate Lookup Indexes
CREATE INDEX IF NOT EXISTS idx_demandes_rawbank ON demandes(rawbank_slip_number, rawbank_operation_code)
  WHERE rawbank_slip_number IS NOT NULL AND rawbank_operation_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_prospects_rawbank ON prospects(rawbank_slip_number, rawbank_operation_code)
  WHERE rawbank_slip_number IS NOT NULL AND rawbank_operation_code IS NOT NULL;
