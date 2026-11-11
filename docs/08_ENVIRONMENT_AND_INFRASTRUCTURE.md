# LIEC Heav’n — Environment Configuration & Infrastructure Isolation

---

## 1. Cloud Infrastructure Architecture

LIEC Heav’n operates across two strictly isolated environments:
1. **Production Environment**: High-availability, persistent academic database.
2. **Preview Environment**: Dedicated, isolated staging environment for pull requests and regression verification.

---

## 2. Environment Matrix & Endpoint Scoping

| Attribute | Production Environment | Preview Environment |
| :--- | :--- | :--- |
| **Vercel Project Scope** | `Production` | `Preview` |
| **Domain** | `workspace.liecconsulting.com` | `*.vercel.app` (branch preview) |
| **Neon Project Name** | `liec-heavn` (or production cluster) | `liec-heavn-preview` |
| **Neon Endpoint ID** | `ep-silent-recipe-b9ahkke2` | `ep-wispy-firefly-b9el08l7` |
| **Storage AWS Region** | `eu-central-1` (Frankfurt) | `eu-central-1` (Frankfurt) |
| **PostgreSQL Database** | `neondb` | `neondb` |
| **Neon Recovery Branch** | `backup-pre-user-import-sets-20261110` (`br-lively-hall-b9jmlhs7`)| N/A (Ephemeral fixtures) |
| **TLS Requirement** | `sslmode=require` / `verify-full` | `sslmode=require` / `verify-full` |
| **S3 Object Bucket** | Scoped Production Bucket | Scoped Preview Bucket |
| **Email Interception** | Resend Live Sending | Mocked / Intercepted (`NOT_SENT`) |

---

## 3. Environment Variables Specification

The following environment variables configure the application runtime. **Do not paste actual credentials into documentation or Git repositories.**

### Core Database Configuration
- `DATABASE_URL`: Direct connection string for schema migrations and transactional write operations (`sslmode=require`).
- `DATABASE_URL_POOLED`: Pooled connection string (PgBouncer port 6543) for stateless serverless API route handlers.

### Cryptographic Security & MFA Configuration
- `SESSION_SECRET`: 256-bit cryptographically secure secret (64 hex characters) used to sign and verify HMAC-SHA256 authentication session tokens (`liec_session`).
- `MFA_ENCRYPTION_KEY`: 256-bit AES-256-GCM encryption key (64 hex characters) used to encrypt and decrypt TOTP secrets at rest in PostgreSQL. Never committed to version control.

### Runtime Environment Signals
- `VERCEL_ENV`: Set automatically by Vercel (`production`, `preview`, or `development`).
- `NODE_ENV`: Set to `production` in all compiled deployments.

### Object Storage & Uploads
- `S3_BUCKET_NAME`: Target bucket for student dossiers, academic transcripts, and identity documents.
- `S3_REGION`: Storage region (`eu-central-1`).
- `S3_ACCESS_KEY_ID`: Cloud access key.
- `S3_SECRET_ACCESS_KEY`: Cloud secret key.

### Transactional Email (Resend)
- `RESEND_API_KEY`: API key for sending system invitations and status notifications.
- `SYSTEM_SENDER_EMAIL`: Default sender address (`noreply@liecconsulting.com` or `admissions@liecconsulting.com`).

---

## 4. Neon Recovery Branch Protection Policy

The recovery branch created prior to the User Import Sets deployment:
- **Branch Name**: `backup-pre-user-import-sets-20261110`
- **Branch ID**: `br-lively-hall-b9jmlhs7`
- **Policy**: This branch represents an immutable snapshot of the production database state before bulk import capabilities were introduced. **Under no circumstances should this recovery branch be deleted or overwritten.**
