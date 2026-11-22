-- Migration: TrustAVI Multi-Partner Catalog & Document Checklist

CREATE TABLE IF NOT EXISTS avi_partners (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO avi_partners (id, name, active)
VALUES 
  ('yimmiline', 'YIMMILINE', true),
  ('trustavi', 'TrustAVI SAS', true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, active = EXCLUDED.active;

CREATE TABLE IF NOT EXISTS avi_commercial_offers (
  id SERIAL PRIMARY KEY,
  partner_id VARCHAR(50) NOT NULL REFERENCES avi_partners(id),
  offer_key VARCHAR(100) NOT NULL,
  offer_name VARCHAR(255) NOT NULL,
  version VARCHAR(50) NOT NULL DEFAULT 'v1',
  partner_total_eur NUMERIC(12,2) NOT NULL,
  blocked_amount_eur NUMERIC(12,2),
  student_contribution_eur NUMERIC(12,2),
  production_fees_eur NUMERIC(12,2),
  transfer_fees_eur NUMERIC(12,2),
  prefinancing_fees_eur NUMERIC(12,2),
  liec_commission_eur NUMERIC(12,2) NOT NULL,
  parent_deposit_eur NUMERIC(12,2) NOT NULL,
  net_payable_to_partner_eur NUMERIC(12,2) NOT NULL,
  subline_fees_specified BOOLEAN DEFAULT TRUE,
  commercial_rules_json JSONB,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_partner_offer_ver UNIQUE (partner_id, offer_key, version)
);

-- Seed TrustAVI Commercial Offers
INSERT INTO avi_commercial_offers (
  partner_id, offer_key, offer_name, version,
  partner_total_eur, blocked_amount_eur, student_contribution_eur,
  production_fees_eur, transfer_fees_eur, prefinancing_fees_eur,
  liec_commission_eur, parent_deposit_eur, net_payable_to_partner_eur,
  subline_fees_specified, commercial_rules_json
) VALUES
  (
    'trustavi', 'normal_avi', 'Normal AVI', 'v1',
    11260.00, 10800.00, 0.00,
    460.00, 0.00, 0.00,
    115.00, 11260.00, 11145.00,
    true,
    '{"drc_guarantor_accepted": true, "stipend_limit_specified": false}'::jsonb
  ),
  (
    'trustavi', 'prefinancing_with_contribution', 'Pre-financing with student contribution', 'v1',
    4185.00, NULL, 2700.00,
    460.00, 293.00, 732.00,
    300.00, 4185.00, 3885.00,
    true,
    '{"drc_guarantor_accepted": true, "stipend_limit_specified": false}'::jsonb
  ),
  (
    'trustavi', 'prefinancing_without_contribution', 'Pre-financing without student contribution', 'v1',
    1500.00, NULL, 0.00,
    NULL, NULL, NULL,
    300.00, 1500.00, 1200.00,
    false,
    '{"drc_guarantor_accepted": true, "stipend_limit_specified": false, "fee_breakdown": "NOT_SPECIFIED_BY_PARTNER"}'::jsonb
  )
ON CONFLICT (partner_id, offer_key, version) DO UPDATE SET
  partner_total_eur = EXCLUDED.partner_total_eur,
  net_payable_to_partner_eur = EXCLUDED.net_payable_to_partner_eur,
  liec_commission_eur = EXCLUDED.liec_commission_eur;

-- Extend avi_requests with multi-partner snapshot and checklist support
ALTER TABLE avi_requests
  ADD COLUMN IF NOT EXISTS partner_id VARCHAR(50) DEFAULT 'yimmiline',
  ADD COLUMN IF NOT EXISTS offer_version VARCHAR(50) DEFAULT 'v1',
  ADD COLUMN IF NOT EXISTS financial_snapshot_json JSONB,
  ADD COLUMN IF NOT EXISTS trustavi_checklist_json JSONB,
  ADD COLUMN IF NOT EXISTS deposit_reference VARCHAR(100),
  ADD COLUMN IF NOT EXISTS deposit_payment_date DATE,
  ADD COLUMN IF NOT EXISTS deposit_payment_evidence_key VARCHAR(255),
  ADD COLUMN IF NOT EXISTS responsible_staff VARCHAR(100);
