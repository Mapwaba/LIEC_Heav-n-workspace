# LIEC Heav’n v1.4.1 Release Archive

**Release Target:** LIEC Heav'n v1.4.1  
**Release Type:** Security Hotfix & Public Intake Hardening  
**Release Date:** 2026-11-20  
**Release Commit:** `e7aaf7298dca6046af765016d3252afe1d6e158b`  
**Base Commit (v1.4.0):** `2fbe25349ec4ae3255b11b3b39bf989a0909a26e`  
**Git Tag:** `v1.4.1`  
**Production Deployment ID:** `dpl_2FcTWqQhNdPiXPdGaPwAiiKVfuVX`  
**Production URL:** [https://workspace.liecconsulting.com](https://workspace.liecconsulting.com)  

---

## 1. Overview & Core Security Improvements

LIEC Heav'n v1.4.1 remediates two critical P0 security and data validation vulnerabilities discovered during post-v1.4.0 smoke testing:

1. **Candidate API Authentication & RBAC Enforcement (`src/app/api/candidats/route.ts`):**
   - Eliminates anonymous unauthenticated access across all 5 HTTP methods (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`), enforcing `HTTP 401 Unauthorized` (`AUTHENTICATION_REQUIRED`) with zero personal data leakage.
   - Enforces module-level RBAC (`HTTP 403 Forbidden`).
   - Scopes Finance Officer access: Finance Officers may only access candidates linked to active financial records (AVI, instalment balances, tuition fees); pedagogical notes, internal documents, and attachments are masked via `applyFieldLevelAcl`. All write operations (`POST`, `PUT`, `PATCH`, `DELETE`) by Finance Officers are strictly blocked (`403`).
   - Secretary users have operational read/write access but are forbidden from candidate `DELETE` (`403`).
   - Eliminates hardcoded or anonymous fallback actor attribution in audit logs.

2. **Public Intake Hardening & Atomicity (`src/app/api/demandes/route.ts`, `src/app/api/prospects/route.ts`):**
   - Preserves public intake for legitimate prospective student applicants.
   - Strictly rejects empty payloads (`{}`) and placeholder inputs (`"Nouveau Candidat"`, `"Nouveau Prospect"`, dummy emails and phones) with `HTTP 400 Bad Request` (`VALIDATION_ERROR`).
   - Wraps multi-table insertions (`demandes`, `candidats`, `events`, `audit_logs`) in `withTransaction` for automatic atomic rollback on failure.
   - Implements advisory-locked monotonic reference allocation (`src/lib/referenceAllocator.ts`) using `pg_advisory_xact_lock`, ensuring zero duplicate reference numbers under high concurrency.
   - Enforces historical floors (`DEMANDE_2025_FLOOR = 102`, `CANDIDAT_2025_FLOOR = 56`), guaranteeing the erased `#DEM-2025-102` reference is permanently protected from reuse.

---

## 2. Validation & Quality Assurance Summary

- **Local Security & Intake Suite (`tests/test_v141_security_and_intake.mjs`):** 12/12 PASS (100%)
- **Database Governance & Security Suite (`tests/test_database_isolation_and_governance.mjs`):** 16/16 PASS (100%)
- **Payment RBAC & Controlled Deletion (`tests/test_controlled_deletion_and_payment_rbac.mjs`):** 5/5 PASS (100%)
- **Qualification Readiness Rules (`tests/test_qualification_readiness_rules.mjs`):** 20/20 PASS (100%)
- **Dedicated Remote Neon Preview Suite (`tests/test_v141_preview_neon_verification.mjs`):** 13/13 PASS (100% on Neon project `solitary-butterfly-39908560` / `ep-wispy-firefly-b9el08l7`)
- **Next.js Production Build (`npm run build`):** 43/43 static and dynamic routes compiled with 0 errors.
- **Live Production Post-Deployment Smoke Test:** 14/14 PASS on `https://workspace.liecconsulting.com`.

---

## 3. Archived Release Reports

The detailed execution reports for v1.4.1 are preserved in this directory:

- [LIEC_HEAVN_v1.4.1_PRODUCTION_READINESS_REVIEW.md](file:///C:/Users/barth/.gemini/antigravity/scratch/LIEC_Heav-n-workspace/docs/releases/v1.4.1/LIEC_HEAVN_v1.4.1_PRODUCTION_READINESS_REVIEW.md): Complete implementation review, test matrices, and GO recommendation.
- [GATE_10_FINAL_REMOTE_VERIFICATION_REPORT.md](file:///C:/Users/barth/.gemini/antigravity/scratch/LIEC_Heav-n-workspace/docs/releases/v1.4.1/GATE_10_FINAL_REMOTE_VERIFICATION_REPORT.md): Remote Neon Preview PostgreSQL testing (8-connection concurrency, transaction rollback, synthetic cleanup).
- [LIEC_HEAVN_v1.4.1_PRODUCTION_DEPLOYMENT_REPORT.md](file:///C:/Users/barth/.gemini/antigravity/scratch/LIEC_Heav-n-workspace/docs/releases/v1.4.1/LIEC_HEAVN_v1.4.1_PRODUCTION_DEPLOYMENT_REPORT.md): Gate 11 execution, atomic git push, Vercel build details, and live production smoke tests.
