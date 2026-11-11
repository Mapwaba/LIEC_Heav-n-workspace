# LIEC Heav’n — Architecture & Technology Stack Specification

---

## 1. System Architecture Topology

LIEC Heav’n is architected as a modern serverless full-stack web application designed for high security, predictable latency, and academic compliance.

```
                    +------------------------------------+
                    |        End Users / Clients         |
                    | (Students, Advisors, Admins, Sec.) |
                    +------------------------------------+
                                      |
                                      v HTTPS / Strict TLS
                    +------------------------------------+
                    |       Cloudflare / Vercel Edge     |
                    | (workspace.liecconsulting.com)    |
                    +------------------------------------+
                                      |
                   +------------------+------------------+
                   |                                     |
                   v App Router                          v Route Handlers
        +-----------------------+             +-----------------------+
        |   Next.js 15 UI SSR   |             |   Next.js 15 API      |
        |  (React 19, Tailwind) |             | (Edge / Node Runtimes)|
        +-----------------------+             +-----------------------+
                   |                                     |
                   |                                     v
                   |                         +-----------------------+
                   |                         |  Business Logic Libs  |
                   |                         | - userProvisioning.ts |
                   |                         | - importSets.ts       |
                   |                         | - emailService.ts     |
                   |                         | - auth.ts / db.ts     |
                   |                         +-----------------------+
                   |                                     |
                   +------------------+------------------+
                                      |
                   +------------------+------------------+
                   |                                     |
                   v SQL Connection Pooling              v REST API (Zero Log)
        +-----------------------+             +-----------------------+
        | Neon PostgreSQL 18.6  |             |      Resend API       |
        |   (AWS eu-central-1)  |             | (Transactional Mail)  |
        +-----------------------+             +-----------------------+
```

---

## 2. Technology Stack Breakdown

| Layer | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Framework** | Next.js | 15.5.x | App Router, Server Components, API Route Handlers |
| **UI Library** | React | 19.x | Component lifecycle, interactive screens, forms |
| **Language** | TypeScript | 5.8.x | Strict type safety across client, server, and SQL entities |
| **Styling** | Tailwind CSS | 3.4.x | Utility-first CSS using tokens defined in `DESIGN.md` |
| **Database** | PostgreSQL | 18.6 | Relational store, constraints, foreign keys, indexes |
| **DB Driver** | `pg` (node-postgres) | 8.23.1 | Direct SQL connection with TLS `rejectUnauthorized = true` |
| **Spreadsheet Parsing**| ExcelJS | 4.4.x | Binary `.xlsx` parsing, multi-sheet inspection, formula stripping |
| **CSV Parsing** | fast-csv | 4.3.x | RFC 4180-compliant CSV streaming and transformation |
| **Cryptography** | Node.js `crypto` | Built-in | PBKDF2 password derivation, SHA-256 token hashing, CSPRNG |
| **Hosting Platform** | Vercel | Production | Automated CI/CD, preview branch environments, SSL edge |
| **Storage Engine** | Neon Serverless | Cloud | Serverless autoscaling Postgres with compute branch isolation |

---

## 3. Directory Structure & Key Code Modules

```text
LIEC_Heav-n-workspace/
├── database/
│   ├── schema.sql                 # Authoritative DDL schema definition
│   └── fixtures/
│       └── preview_synthetic_fixtures.sql # Isolated preview seed data
├── docs/                          # Comprehensive consolidation documentation
│   ├── 01_PROJECT_HANDOVER.md
│   ├── 02_ARCHITECTURE_AND_STACK.md
│   └── ... (9 handover files)
├── public/                        # Static assets, logos, and stamps
├── src/
│   ├── app/
│   │   ├── api/                   # Serverless REST endpoints
│   │   │   ├── auth/              # Authentication, login, session validation
│   │   │   ├── users/             # User creation, query, and Import Sets
│   │   │   └── workspace/         # Workspace state and summary metrics
│   │   ├── layout.tsx             # Root layout with fonts and providers
│   │   └── page.tsx               # Primary dashboard interface
│   ├── components/                # Modular React UI components
│   │   ├── CandidatsScreen.tsx    # Candidate management interface
│   │   ├── DemandesScreen.tsx     # Student visa applications interface
│   │   ├── ProspectsScreen.tsx    # Prospective student CRM qualification
│   │   └── UserImportSetsModal.tsx# Bulk user onboarding wizard
│   └── lib/                       # Core backend business logic
│       ├── auth.ts                # Password hashing, PBKDF2, session tokens
│       ├── db.ts                  # PostgreSQL connection pool management
│       ├── emailService.ts        # Resend transactional email client
│       ├── environment.ts         # Environment safety guards and detection
│       ├── importSets.ts          # User Import Sets processing pipeline
│       └── userProvisioning.ts    # Secure user creation and token management
└── tests/                         # Automated test suites
    ├── test_postgres_bulk_insert_fix.mjs
    ├── test_staging_email_status_fix.mjs
    └── test_user_import_sets.mjs
```

---

## 4. Architectural Invariants & Security Boundaries

1. **Zero Plaintext Credentials in Logs or DB**:
   - Password hashes use PBKDF2 with 100,000 iterations and cryptographic salts (`salt:hash`).
   - Invitation tokens are never stored plaintext; only SHA-256 hashes reside in `users.invitation_token`.
2. **Strict Environment Precedence**:
   - `VERCEL_ENV=production` strictly overrides all client and preview flags.
   - Preview runs are prohibited from accessing the production database (`ep-silent-recipe-b9ahkke2`).
3. **Database Guardrails**:
   - Zero runtime DDL operations during request processing.
   - Non-production tests must execute in isolated transactions with atomic `ROLLBACK`.
