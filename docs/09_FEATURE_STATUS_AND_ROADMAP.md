# LIEC Heav’n — Feature Status Inventory & Development Roadmap

---

## 1. Feature Status Classification

This document categorizes all capabilities of the LIEC Heav’n platform across four distinct lifecycle stages:
1. **Implemented & Live in Production**: Deployed and operational on commit `061caf9`.
2. **Tested & Verified**: Covered by automated test suites in Neon Preview / Regression harnesses.
3. **Planned & Architected**: High-priority features with architectural consensus scheduled for next releases.
4. **Outstanding Backlog**: Long-term strategic capabilities awaiting specification or external dependency resolution.

---

## 2. Feature Inventory Matrix

### A. Implemented & Live in Production (Commit `061caf9`)

| Feature / Module | Scope | Status | Acceptance Date |
| :--- | :--- | :---: | :---: |
| **Workspace Navigation** | Unified dashboard, active session indicators, role routing | **LIVE** | 2026-11-10 |
| **User Import Sets Engine** | Multi-sheet ExcelJS & CSV bulk intake, auto-column mapping, interactive preview | **LIVE** | 2026-11-10 |
| **Dual PostgreSQL Fixes** | Explicit parameter casting (`$12::VARCHAR` and `$3::VARCHAR`) in prepared statements | **LIVE** | 2026-11-10 |
| **Cryptographic Invitations** | SHA-256 invitation token generation, 24-hour expiration, no plaintext passwords | **LIVE** | 2026-11-10 |
| **Active Lease Locking** | 2-minute heartbeat concurrency protection against race conditions | **LIVE** | 2026-11-10 |
| **Results CSV Export** | Export provisioning outcomes, User IDs, roles, sanitized of passwords | **LIVE** | 2026-11-10 |
| **Duplicate User Guard** | Email uniqueness detection with non-destructive `SKIPPED` handling | **LIVE** | 2026-11-10 |
| **Manual User Management** | Individual user creation, validation, temporary password issuance | **LIVE** | 2026-11-10 |
| **Candidate Management** | Demandes (12 records) & Candidats (12 records) tracking screens | **LIVE** | 2026-11-10 |
| **Role-Based Guards** | Administrator anti-demotion guard, restriction against bulk admin creation | **LIVE** | 2026-11-10 |

---

### B. Tested & Verified in Non-Production Environments

| Test Harness / Suite | Scope & Coverage | Verdict | Test Suite File |
| :--- | :--- | :---: | :--- |
| **User Import Sets Test** | 15 comprehensive unit & integration tests covering ExcelJS, tokens, RBAC | **15/15 PASS** | `tests/test_user_import_sets.mjs` |
| **PostgreSQL Staging Test**| 6 isolated rollback tests on Neon Preview (`ep-wispy-firefly-b9el08l7`) | **6/6 PASS** | `tests/test_staging_email_status_fix.mjs` |
| **Security Isolation Test** | Preview environment isolation, S3 bucket segregation, email intercept guards | **108/108 PASS**| `tests/test_step4_3_preview_isolation_and_security.mjs` |
| **Live Acceptance Script** | Controlled synthetic import on live domain with zero DB mutation | **100% PASS** | `scratch/run_full_e2e_acceptance.mjs` |

---

### C. Planned & Architected (Immediate Next Milestones)

| Feature | Target Release | Architectural Design Notes |
| :--- | :---: | :--- |
| **Self-Service Password Reset** | v1.1.0 | Email-based reset tokens using existing cryptographic token lifecycle (`invitation_token`). |
| **Bulk User Email Dispatch** | v1.1.0 | Toggle `sendWelcomeEmails: true` with batch throttling (max 10 emails/sec via Resend). |
| **Audit Log Visualizer** | v1.2.0 | Administrative UI for searching and filtering `audit_logs` entries by actor and target entity. |
| **Enhanced Candidate Dossier** | v1.2.0 | Multi-document upload (passport, baccalauréat, relevés de notes) directly to S3 with pre-signed URLs. |
| **Automated AVI Status Tracker**| v1.3.0 | Status workflow for Attestation de Virement Irrévocable with finance officer sign-off. |

---

### D. Outstanding Backlog (Strategic Roadmap)

| Capability | Category | Description | Dependencies |
| :--- | :--- | :--- | :--- |
| **Campus France Sync** | Integration | Bi-directional API synchronization with Campus France pastel files | External API specs |
| **Multi-Tenancy Scoping** | Architecture | Partitioning data for branch offices (Kinshasa, Lubumbashi, Brazzaville) | DB schema partitioning |
| **Two-Factor Auth (2FA)** | Security | TOTP authenticator app support (RFC 6238) for administrative roles | Authenticator library |
| **Automated Visa Interview Bot**| AI / Automation | Interactive mock visa interview simulator for candidates | LLM / Audio processing |
| **Real-Time WebSockets** | Realtime | Real-time notification banners for document reviews and visa milestones | Serverless WebSocket layer |
