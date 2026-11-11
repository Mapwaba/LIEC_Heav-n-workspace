# LIEC Heav’n — Documentation Index

Welcome to the authoritative engineering and architecture documentation suite for **LIEC Heav’n**.

This suite was created during the project consolidation into **`LIEC_Heav-n-main`** following the successful Production release and acceptance of the User Import Sets engine and PostgreSQL parameter typing fixes (Commit `061caf9954c8f504206718a64347c5fa737b162e`).

---

## 📚 Documentation Catalog

1. **[01. Project Handover & Transition Guide](01_PROJECT_HANDOVER.md)**  
   Executive handover, session consolidation analysis, repository metadata, and developer onboarding instructions.

2. **[02. Architecture & Technology Stack](02_ARCHITECTURE_AND_STACK.md)**  
   Full-stack system architecture, technology inventory (Next.js 15, React 19, Neon PostgreSQL 18.6), directory layout, and architectural invariants.

3. **[03. Production Release Lineage & Deployments](03_PRODUCTION_RELEASE_LINEAGE.md)**  
   Authoritative Git history, merge commit `061caf9`, Vercel deployment `HtEAaFT9E8UzHRDWUo6M1CpGg6RF`, and chronological milestone changelog.

4. **[04. PostgreSQL Parameter Typing Fixes Deep-Dive](04_POSTGRESQL_FIXES_ANALYSIS.md)**  
   Root-cause analysis, SQL diffs, and verification matrix for prepared-statement parameter typing fixes (`$12::VARCHAR` and `$3::VARCHAR`).

5. **[05. User Import Sets Module Specification](05_USER_IMPORT_SETS_SPECIFICATION.md)**  
   Detailed engine design, ExcelJS parsing safeguards, staging lifecycle, execution lease locking, and transformation pipelines.

6. **[06. Security, Authentication & Role-Based Access Control](06_SECURITY_AUTHENTICATION_RBAC.md)**  
   PBKDF2 password derivation, SHA-256 invitation tokens, RBAC permissions matrix, and administrator protection invariants.

7. **[07. Testing Strategy & Verification Suites Catalog](07_TESTING_AND_VERIFICATION_SUITE.md)**  
   Catalog of test suites (`tests/`), isolated Neon Preview rollback guarantees, and live production acceptance protocols.

8. **[08. Environment Configuration & Infrastructure Isolation](08_ENVIRONMENT_AND_INFRASTRUCTURE.md)**  
   Neon cloud database configuration, pooled vs direct connections, Vercel environment detection, and recovery branch protection.

9. **[09. Feature Status Inventory & Development Roadmap](09_FEATURE_STATUS_AND_ROADMAP.md)**  
   Categorization of system features across **Implemented & Live**, **Tested & Verified**, **Planned**, and **Outstanding Backlog**.

---

*Preserve credential hygiene: Never commit plain secrets, tokens, or passwords to version control.*
