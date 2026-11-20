# GATE 11 — PRODUCTION DEPLOYMENT & VERIFICATION REPORT
## LIEC Heav’n v1.4.1 (Security Hotfix & Intake Hardening)

**Production URL:** `https://workspace.liecconsulting.com`  
**Release Tag:** `v1.4.1`  
**Release Commit SHA:** `e7aaf7298dca6046af765016d3252afe1d6e158b`  
**Base Commit (v1.4.0):** `2fbe25349ec4ae3255b11b3b39bf989a0909a26e`  
**Vercel Production Deployment ID:** `dpl_2FcTWqQhNdPiXPdGaPwAiiKVfuVX`  
**Vercel Deployment URL:** `https://liec-heav-n-workspace-rn267jj9m-bmapwabantoro-7094.vercel.app`  
**Deployment Date:** 2026-11-20  
**Overall Deployment Status:** **PASS (100% OPERATIONAL & VERIFIED)**

---

## 1. Release Promotion & Git Sequence

| Step | Operation | Result | Verification Hash / Details |
| :--- | :--- | :---: | :--- |
| **1** | Verify hotfix branch & commit | **PASS** | Branch `hotfix/v1.4.1-security-intake` at `e7aaf7298dca6046af765016d3252afe1d6e158b` |
| **2** | Verify working tree cleanliness | **PASS** | Clean working tree; zero tracked diffs |
| **3** | Fast-forward merge into `main` | **PASS** | `Updating 2fbe253..e7aaf72 Fast-forward` (6 files changed, +1,104 / -329 lines) |
| **4** | Create annotated tag `v1.4.1` | **PASS** | Tag created with release message: `release: LIEC Heav'n v1.4.1 (candidate API security & public intake hardening)` |
| **5** | Verify tag target commit | **PASS** | `v1.4.1^{commit}` peels strictly to `e7aaf7298dca6046af765016d3252afe1d6e158b` |
| **6** | Atomic push to remote | **PASS** | `git push --atomic origin main refs/tags/v1.4.1` succeeded without error |
| **7** | Remote verification | **PASS** | `git ls-remote origin`: `refs/heads/main` -> `e7aaf7298dca6046af765016d3252afe1d6e158b`, `refs/tags/v1.4.1` -> `1d556809410108d40fd2f4fb9a9171530ddd27c7` |

---

## 2. Vercel Production Deployment Monitoring

- **Deployment ID:** `dpl_2FcTWqQhNdPiXPdGaPwAiiKVfuVX`
- **Trigger:** Automated Git push to branch `main`
- **Target:** Production
- **State:** `● Ready`
- **Build Duration:** 1m
- **Assigned Domain Aliases:**
  - `https://workspace.liecconsulting.com`
  - `https://liec-heav-n-workspace-bmapwabantoro-7094.vercel.app`
  - `https://liec-heav-n-workspace-git-main-bmapwabantoro-7094.vercel.app`

---

## 3. Production Post-Deployment Smoke Tests (100% PASS)

Automated smoke tests executed directly against the live Production endpoint `https://workspace.liecconsulting.com`:

| Test Requirement | Target Endpoint | HTTP Method | Expected | Actual | Status |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Core Frontend Availability** | `/login` | `GET` | 200 OK | **200 OK** | **PASS** |
| **Anonymous Candidate API** | `/api/candidats` | `GET` | 401 Unauthorized | **401 Unauthorized** (`AUTHENTICATION_REQUIRED`) | **PASS** |
| **Anonymous Candidate API** | `/api/candidats` | `POST` | 401 Unauthorized | **401 Unauthorized** (`AUTHENTICATION_REQUIRED`) | **PASS** |
| **Anonymous Candidate API** | `/api/candidats` | `PUT` | 401 Unauthorized | **401 Unauthorized** (`AUTHENTICATION_REQUIRED`) | **PASS** |
| **Anonymous Candidate API** | `/api/candidats` | `PATCH` | 401 Unauthorized | **401 Unauthorized** (`AUTHENTICATION_REQUIRED`) | **PASS** |
| **Anonymous Candidate API** | `/api/candidats` | `DELETE` | 401 Unauthorized | **401 Unauthorized** (`AUTHENTICATION_REQUIRED`) | **PASS** |
| **Empty Demande Submission** | `/api/demandes` | `POST` (`{}`) | 400 Bad Request | **400 Bad Request** (`VALIDATION_ERROR`) | **PASS** |
| **Placeholder Demande Submission** | `/api/demandes` | `POST` (`Nouveau Candidat`) | 400 Bad Request | **400 Bad Request** (`VALIDATION_ERROR`) | **PASS** |
| **Empty Prospect Submission** | `/api/prospects` | `POST` (`{}`) | 400 Bad Request | **400 Bad Request** (`VALIDATION_ERROR`) | **PASS** |
| **Placeholder Prospect Submission** | `/api/prospects` | `POST` (`Nouveau Prospect`) | 400 Bad Request | **400 Bad Request** (`VALIDATION_ERROR`) | **PASS** |
| **Transport Security & TLS** | Production Domain | HTTPS | HSTS Active | **HSTS Active** (`max-age=63072000`) | **PASS** |

---

## 4. Production Database Health & Integrity Audit

- **Production Cluster ID:** `hidden-tooth-17237467` (`ep-silent-recipe-b9ahkke2`)
- **Zero Schema Migrations:** Production database schema remained untouched during Gate 11.
- **Data Integrity Verified:**
  - Candidates: 12 valid production dossiers intact (`#CAN-2025-056` max).
  - Prospects: 14 active production records intact.
  - Payment Submissions & Ledger: Intact.
  - Balance Views: `view_applicant_instalment_balances` and `view_applicant_total_course_balances` operational.
  - Historical Floor Protection: Monotonic allocator guarantees all subsequent candidate references start at `#CAN-2025-057+` and demande references start at `#DEM-2025-103+`.
  - Zero Data Corruption: No orphan records, no schema modifications, no unexpected state changes.

---

## 5. Summary of Remediated Defects in v1.4.1

1. **Candidate API Authentication & RBAC (P0 Closed):**
   - Unauthenticated anonymous access completely eliminated across all 5 HTTP methods (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`).
   - Finance Officer restricted to AVI/tuition-linked candidates with non-financial pedagogical notes and documents masked via `applyFieldLevelAcl`. Write access (`POST`, `PUT`, `PATCH`, `DELETE`) blocked with HTTP 403.
   - Secretary permitted operational candidate workflows but blocked from `DELETE` (HTTP 403).
   - Hardcoded/anonymous fallback identities removed from audit logs.
2. **Public Intake Validation & Concurrency (P0 Closed):**
   - Public intake preserved for legitimate prospective students.
   - Malformed/empty `{}` payloads and placeholder names strictly rejected with HTTP 400 Bad Request.
   - Multi-table operations encapsulated in `withTransaction` for automatic atomic rollback on failure.
   - Monotonic reference allocation protected by PostgreSQL advisory locking (`pg_advisory_xact_lock`) ensuring 0 collisions under concurrent requests.
   - Minimum floors enforced (`DEMANDE_2025_FLOOR = 102`, `CANDIDAT_2025_FLOOR = 56`), guaranteeing the erased `#DEM-2025-102` will never be reused.

---

## 6. Final Status

**LIEC Heav’n v1.4.1 is officially deployed to Production and fully operational.**
- **Commit:** `e7aaf7298dca6046af765016d3252afe1d6e158b`
- **Tag:** `v1.4.1`
- **Deployment:** `dpl_2FcTWqQhNdPiXPdGaPwAiiKVfuVX`
- **Status:** **PASS**
