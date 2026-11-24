-- LIEC Heav'n — Rollback Script for Demonstration Profile Cleanup
-- WORKSTREAM 1.1: Documented Irreversible Cleanup
--
-- NOTICE:
-- Per explicit Project Owner directive, demonstration profile cleanup is an IRREVERSIBLE operation.
-- Deleted demo profiles, test dossiers, and test links are permanently removed from the database.
-- Synthetic placeholders are NOT recreated on rollback.
--
-- In the event of an authorized disaster recovery requirement:
-- 1. Full data restoration requires activating the pre-release Neon snapshot recovery point.
-- 2. Restoration must be authorized explicitly by the Project Owner.
--
-- This script logs the rollback execution event without corrupting database state.

BEGIN;

INSERT INTO audit_logs (actor, action, entity_ref, outcome, details, created_at)
VALUES (
  'operator@liecconsulting.com',
  'Rollback demo profile cleanup executed',
  '#DEM-2025-102, #DEM-2025-089',
  'Succès',
  'Documented non-recreating cleanup. Restoration requires Point-in-Time recovery snapshot.',
  NOW()
);

COMMIT;
