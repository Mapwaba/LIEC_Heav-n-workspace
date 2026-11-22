-- Migration: Add Optimistic Concurrency Columns
-- Target tables: candidats, demandes, payment_submissions

ALTER TABLE candidats 
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1 NOT NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE demandes 
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1 NOT NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE payment_submissions 
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1 NOT NULL;
