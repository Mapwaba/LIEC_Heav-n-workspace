# LIEC Heav’n — Next Workstream Baseline (Post-v1.4.1)

**Baseline Date:** 2026-11-20  
**Current Production Version:** `v1.4.1`  
**Current Production Commit:** `e7aaf7298dca6046af765016d3252afe1d6e158b`  
**Production Git Branch:** `main` (Synchronized with `origin/main`)  
**Production URL:** [https://workspace.liecconsulting.com](https://workspace.liecconsulting.com)  
**Production Deployment:** `dpl_2FcTWqQhNdPiXPdGaPwAiiKVfuVX` (Vercel)  
**Production Neon Project:** `hidden-tooth-17237467` (`ep-silent-recipe-b9ahkke2`, branch `main`)  

---

## 1. Environment & Infrastructure Baseline

| Dimension | Production Baseline | Dedicated Preview Baseline |
| :--- | :--- | :--- |
| **Release / Branch** | `main` @ `e7aaf7298dca6046af765016d3252afe1d6e158b` | `hotfix/v1.4.1-security-intake` (fully merged to `main`) |
| **Vercel Project** | `liec-heav-n-workspace` (Production Target) | `liec-heav-n-workspace` (Preview Target: `dpl_gj2PvXJKzzMDjymccW9UZmuKKSpR`) |
| **Database Host** | `ep-silent-recipe-b9ahkke2.c-7.eu-central-1.aws.neon.tech` | `ep-wispy-firefly-b9el08l7.c-7.eu-central-1.aws.neon.tech` |
| **Neon Project** | `hidden-tooth-17237467` | `solitary-butterfly-39908560` (`liec-heavn-preview`) |
| **Neon Branch** | `br-delicate-glitter-b9g66zzx` (`main`) | `br-spring-mode-b9w80djh` |
| **Isolation Status** | Fully Protected (Zero unauthorized connections) | 100% physically isolated; credential locally managed in `.env.preview.local` |

---

## 2. Test Suites & Quality Verification Baseline

The following regression and verification test suites are established and passing at baseline:

| Test Suite | Location | Verification Status | Target Environment |
| :--- | :--- | :---: | :--- |
| **v1.4.1 Security & Intake Suite** | `tests/test_v141_security_and_intake.mjs` | **12/12 PASS (100%)** | Local PGlite / Parity Engine |
| **Database Isolation & Governance** | `tests/test_database_isolation_and_governance.mjs` | **16/16 PASS (100%)** | Local PGlite / Governance Engine |
| **Controlled Deletion & Payment RBAC** | `tests/test_controlled_deletion_and_payment_rbac.mjs` | **5/5 PASS (100%)** | Local Storage & S3 Harness |
| **Qualification Readiness Rules** | `tests/test_qualification_readiness_rules.mjs` | **20/20 PASS (100%)** | Local Rule Verification Engine |
| **Remote Preview Neon Verification** | `tests/test_v141_preview_neon_verification.mjs` | **13/13 PASS (100%)** | Remote Dedicated Neon Preview (`ep-wispy-firefly-b9el08l7`) |
| **Production Post-Deployment Smoke Test** | `scripts/production-v141-smoke-test.mjs` | **14/14 PASS (100%)** | Live Production (`https://workspace.liecconsulting.com`) |
| **Next.js Production Build** | `npm run build` | **PASS (Code 0)** | 43/43 routes generated successfully |

---

## 3. Workstream Status & Operational Principles

### 3.1 Workstream Status Matrix
- **W1 (User Roles & Session Security):** **COMPLETED & DEPLOYED** (v1.3.x).
- **W2 (Qualification Readiness & Rules Engine):** **COMPLETED & DEPLOYED** in v1.4.0 (`2fbe253`). Ready for subsequent phase assessment after thorough inspection and analysis, without excessive preview churn.
- **W3 (Payment Lifecycle & Evidence Storage):** Foundation & Phase 1 implemented; Phase 2 & 3 tested in Preview-3. Dedicated isolated preview environments must be re-verified prior to kickoff.
- **W4 (Parent Portal & Real-Time Sync):** Planned. Must establish dedicated Preview environment and isolate from Production prior to kickoff meeting.

### 3.2 Strict Execution Guardrails for Future Workstreams
1. **Isolated Preview Environments:** W3 and W4 must establish dedicated, physically isolated Preview database branches (`solitary-butterfly-39908560` or dedicated workstream branches) before their kickoff meetings.
2. **Never Use Production Credentials:** Under no circumstances may Production database credentials (`hidden-tooth-17237467` / `ep-silent-recipe-b9ahkke2`) or Production storage buckets be utilized in preview testing, test scripts, or local testing.
3. **Explicit Scoped Approval:** All Production modifications, migrations, or data transformations require explicit, scoped operator authorization following read-only preflight inspections.
4. **W2 Pragmatic Progression:** W2 should proceed toward deployment after thorough inspection and analysis, without excessive Preview configuration delays.

---

## 4. Known Technical Debt & Monitoring Focus

1. **`AccommodationScreen.tsx` Type Mismatches:** String union literals bypassed by Next.js `ignoreBuildErrors: true`. Runtime functionality verified; code cleanup deferred to next UI refactoring sprint.
2. **Reference Allocation Monitoring:** Monitor production intake to confirm all new student demandes continue sequentially from `#DEM-2025-103+` and candidates from `#CAN-2025-057+`.
3. **Audit Log Monitoring:** Regular inspection of `audit_logs` table for any unauthorized access attempts (`AUTHENTICATION_REQUIRED` or `SECURITY_VIOLATION`).
