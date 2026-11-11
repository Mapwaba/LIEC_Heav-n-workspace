# LIEC Heav’n — Testing Strategy & Verification Suites Catalog

---

## 1. Automated Testing Architecture

The LIEC Heav’n verification suite employs Node.js native test runner (`node:test`, `node:assert/strict`) across unit, integration, and database-level validation layers.

### Test Environment Separation
- **Regression Suite**: Fully mockable and sandboxed; executes without external database credentials.
- **Neon Preview Suite**: Executes against live, dedicated cloud PostgreSQL engine (`ep-wispy-firefly-b9el08l7`).
- **Atomic Rollback Guarantee**: All tests running against live PostgreSQL wrap operations in `BEGIN ... ROLLBACK` transactions, verifying database row counts before and after execution to guarantee **Delta = 0**.

---

## 2. Test Suites Catalog

### A. User Import Sets Production-Readiness Suite
- **File**: [`tests/test_user_import_sets.mjs`](file:///C:/Users/barth/.gemini/antigravity/scratch/LIEC_Heav-n-workspace/tests/test_user_import_sets.mjs)
- **Execution**: `node tests/test_user_import_sets.mjs`
- **Assertions**: 15 Test Cases (100% Pass)
- **Coverage**:
  1. Maintained ExcelJS parsing of binary `.xlsx` workbooks.
  2. Multi-worksheet Excel workbook targeting.
  3. Macro-enabled workbook (`.xlsm`) security rejection.
  4. Duplicate / ambiguous column header rejection.
  5. File size and 500-row batch boundary enforcement.
  6. Formula injection neutralization in exported CSVs.
  7. Cryptographic invitation token generation (no plaintext passwords).
  8. Account activation and password establishment via tokens.
  9. Single-use token enforcement and replay attack prevention.
  10. Welcome email re-issuance and token revocation.
  11. Active execution lease locking with 2-minute heartbeat recovery.
  12. Administrator account immutability and anti-demotion guard.
  13. Privilege escalation block (admin role creation prohibited).
  14. Preservation of existing user IDs, hashes, and salts on update.
  15. Operational continuity of manual user creation workflows.

### B. PostgreSQL Staging Email Status Fix Verification
- **File**: [`tests/test_staging_email_status_fix.mjs`](file:///C:/Users/barth/.gemini/antigravity/scratch/LIEC_Heav-n-workspace/tests/test_staging_email_status_fix.mjs)
- **Execution**: `node --test tests/test_staging_email_status_fix.mjs`
- **Target**: Dedicated Neon Preview Project (`ep-wispy-firefly-b9el08l7`)
- **Assertions**: 6 Test Cases (100% Pass)
- **Coverage**:
  1. Independent Preview endpoint and strict TLS verification.
  2. `$3::VARCHAR` cast with `email_status = 'NOT_SENT'` (verifying `email_sent_at` is NULL).
  3. `$3::VARCHAR` cast with `email_status = 'SENT'` (verifying `email_sent_at` is set).
  4. Previous `$12::VARCHAR` user provisioning integrity confirmation.
  5. Transaction rollback guarantee on simulated failure (zero partial state).
  6. Zero unsolicited email dispatch enforcement.

### C. Workstream 1 Security Remediation, MFA & Rate Limiting Suite
- **File**: [`scripts/verify-workstream-1-remediation.mjs`](file:///C:/Users/barth/.gemini/antigravity/scratch/LIEC_Heav-n-workspace/scripts/verify-workstream-1-remediation.mjs)
- **Execution**: `node scripts/verify-workstream-1-remediation.mjs`
- **Target**: Dedicated Neon Preview Project (`ep-wispy-firefly-b9el08l7`)
- **Assertions**: 51 Comprehensive Test Cases (100% Pass: 51/51)
- **Coverage**:
  1. **Workstream 1 Baseline (Tests 01–17)**: PBKDF2 SHA-512 preservation, fallback credentials removal, DB-only authority, password complexity policy, anti-enumeration generic responses, SHA-256 password reset tokens (30 min expiry), single-use invalidation, session version bumping, administrator recovery, account/role preservation, URL fragment `#token=...`, audit logging, and invitation token security.
  2. **Cryptographically Signed Sessions (Tests 18–22)**: HMAC-SHA256 session token generation (`signSessionToken`), verification (`verifySessionToken`), immediate rejection of tampered signatures, stale `session_version` rejection (`SESSION_REVOKED`), and secure cookie name definition (`liec_session`).
  3. **Mandatory TOTP Multi-Factor Authentication (Tests 23–40)**: RFC 6238 6-digit TOTP generation/verification, 160-bit base32 secrets, AES-256-GCM encryption at rest with IV and auth tag, tampered ciphertext detection, missing key fail-closed behavior, replay attack protection via `mfa_last_timestep`, 8 single-use alphanumeric emergency recovery codes, SHA-256 recovery code hashing, atomic recovery code consumption, restricted `mfaPendingToken` lifecycle, rejection of MFA tokens by workspace verifiers, mandatory MFA configuration for all 3 roles (Admin, Secretary, Finance Officer), and standalone inline SVG QR code generation.
  4. **Distributed Password Recovery Rate Limiting (Tests 41–45)**: Keyed HMAC account privacy hashing, atomic 5 requests/15 minutes enforcement per IP and per account, 6th request 429 throttling, combined IP/account rate checks, and database table persistence (`rate_limit_buckets`).
  5. **Secondary Endpoints RBAC & Signed-Session Protection (Tests 46–51)**: Authentication enforcement on `prospects/calls`, `prospects/comments`, `notifications`, `tasks`, `users/tour`, and `email/test`; RBAC permission isolation across Admin, Secretary, and Finance Officer; user-scoped notification and tour state isolation; and 401 Unauthorized rejection for unauthenticated requests.

---

## 3. Live Production Acceptance Verification Protocol

The live acceptance protocol runs against the production URL (`https://workspace.liecconsulting.com`) and database (`ep-silent-recipe-b9ahkke2`):

1. **Pre-Test Audit**: Query baseline row counts for `users`, `demandes`, and `candidats`.
2. **Synthetic Batch Upload**: Ingest synthetic CSV with test email domain `@liecconsulting.com`.
3. **Column Auto-Mapping**: Validate field mapping logic.
4. **Execution**: Execute batch with `sendWelcomeEmails: false`.
5. **Database Audit**: Verify newly inserted synthetic users have SHA-256 tokens and staging rows have `email_status = 'NOT_SENT'` and `email_sent_at = NULL`.
6. **CSV Audit**: Confirm exported results CSV excludes temporary passwords.
7. **Duplicate Guard**: Re-run upload to verify duplicate detection skips existing accounts.
8. **Manual Workflow Audit**: Verify manual user creation API validation remains operational.
9. **Controlled Purge**: Atomically remove synthetic test accounts and import sets.
10. **Post-Test Audit**: Confirm exact match with pre-test baseline counts.
