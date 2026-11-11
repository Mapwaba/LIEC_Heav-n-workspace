# LIEC Heav’n — Security, Authentication & Role-Based Access Control

---

## 1. Authentication Architecture

LIEC Heav’n employs a defense-in-depth security model ensuring user authentication, session integrity, multi-factor authentication, and credential confidentiality.

### Password Derivation (PBKDF2)
- **Algorithm**: PBKDF2 (`crypto.pbkdf2Sync`).
- **Digest**: SHA-512.
- **Iterations**: 100,000 iterations.
- **Salt**: 16 bytes CSPRNG (`crypto.randomBytes(16)`).
- **Storage Format**: Stored in `users.password_hash` and `users.password_salt`.
- **Enforcement**: Plaintext passwords are never persisted to disk, database, or serverless execution logs.
- **Backward Compatibility**: Fully preserved from initial architecture; zero breaking hash format changes.

### Cryptographically Signed Authentication Sessions
To eliminate unsigned client cookie tampering vulnerabilities:
1. **Central Session Authority**: Centralized in `src/lib/session.ts` and validated server-side by `src/lib/rbac.ts`.
2. **Signature Algorithm**: HMAC-SHA256 signed using high-entropy `SESSION_SECRET`.
3. **Cookie Configuration**:
   - Cookie Name: `liec_session`.
   - Flags: `HttpOnly`, `SameSite=Lax`, `Secure` (in production/preview environments), `Path=/`.
   - Lifespan: 7 days (`maxAge = 604800`).
4. **Session Payload**:
   - `userId`: Authoritative database user integer ID.
   - `email`: Canonical user email address.
   - `role`: Technical role (`admin`, `secretary`, `avi`).
   - `businessProfile`: Business profile (`Admin`, `Secretary`, `Finance Officer`).
   - `sessionVersion`: Monotonically incremented integer tracking session validity.
   - `issuedAt` & `expiresAt`: UNIX timestamps in seconds.
5. **Database-Backed Session Revocation**: Every authenticated request validates `sessionVersion` against `users.session_version`. Incrementing this counter atomically invalidates all existing sessions (e.g. upon password reset or renewal). Unsigned or tampered cookies are rejected immediately with HTTP 401.

### Mandatory Multi-Factor Authentication (MFA)
Multi-factor authentication is mandatory for all user accounts across all three business profiles: **Admin**, **Secretary**, and **Finance Officer**.

#### Authentication Sequence
$$\text{Email \& Password} \longrightarrow \text{MFA Verification (TOTP / Recovery)} \longrightarrow \text{Signed Session Issued} \longrightarrow \text{RBAC Validation}$$

**Invariant**: Under no circumstances is a workspace session token or session cookie issued prior to successful TOTP verification or consumption of a valid recovery code.

#### MFA Specifications
- **Protocol**: RFC 6238 Time-Based One-Time Password (TOTP) algorithm.
- **Parameters**: 6-digit numerical codes, 30-second time-step window, HMAC-SHA1 digest.
- **Compatibility**: Standard Google Authenticator, Microsoft Authenticator, and RFC 6238 authenticator clients.
- **Secret Generation**: 160-bit cryptographically secure random base32 secrets (`src/lib/totp.ts`).
- **Secret Encryption at Rest**: Encrypted using AES-256-GCM (`src/lib/mfa.ts`) with a 96-bit random IV and 128-bit authentication tag before storage in `users.mfa_secret_encrypted`. If `MFA_ENCRYPTION_KEY` is missing, operations fail closed.
- **Replay Protection**: The last successfully authenticated 30-second timestep is tracked in `users.mfa_last_timestep`. Subsequent attempts within the same timestep window are rejected.
- **Emergency Recovery Codes**:
  - 8 unique alphanumeric single-use recovery codes generated upon initial MFA enrollment.
  - Formatted as `XXXXX-XXXXX` for readability.
  - Stored strictly as SHA-256 hashes in `user_mfa_recovery_codes`.
  - Atomically marked `used_at = CURRENT_TIMESTAMP` upon consumption; cannot be reused.
- **Enrollment Workflow**:
  - Newly imported or un-enrolled users receive a restricted 5-minute `mfaPendingToken` on password verification.
  - The login interface renders an inline SVG QR code and manual key.
  - User submits first valid TOTP code; MFA is activated (`mfa_enrolled = TRUE`), 8 recovery codes are displayed once, and signed session is issued.

### Distributed Password Recovery Rate Limiting
To prevent automated credential stuffing and resource exhaustion:
1. **Target**: `POST /api/auth/forgot-password`.
2. **Threshold**: 5 password recovery requests per 15 minutes per IP address AND per account identifier.
3. **Database-Backed**: Managed via the atomic PostgreSQL table `rate_limit_buckets (key, count, reset_at)`.
4. **Anti-Enumeration Privacy**: Account identifiers are hashed with a keyed HMAC (`hashRateLimitKey`), preventing plain email addresses from being exposed in bucket tables.
5. **Contract Preservation**: Uniform generic responses are preserved regardless of account existence.

---

## 2. Protected API Endpoints & RBAC Matrix

All application endpoints are protected by `authenticateServerRequest` and evaluate permissions using `evaluateModuleAccess`:

| Endpoint Route | HTTP Methods | RBAC Access Policy | Enforced Permissions |
| :--- | :--- | :--- | :--- |
| `/api/auth` | `POST` | Public / Rate Limited | Password verification $\rightarrow$ MFA dispatch |
| `/api/auth/verify-2fa` | `POST` | Restricted (`mfaPendingToken`) | Validates TOTP / recovery code $\rightarrow$ Issues signed `liec_session` |
| `/api/auth/forgot-password` | `POST` | Public / Rate Limited | 5 req/15 min limit $\rightarrow$ Generic response |
| `/api/auth/reset-password` | `POST` | Public / Single-Use Token | 30 min expiry $\rightarrow$ SHA-256 token validation |
| `/api/auth/logout` | `POST` | Public / Authenticated | Clears `liec_session` and legacy cookies |
| `/api/prospects` | `GET`, `POST`, `PUT`, `DELETE` | Authenticated | Admin & Secretary: Full \| Finance: Denied |
| `/api/prospects/calls` | `GET`, `POST`, `PUT` | Authenticated | Admin & Secretary: Full \| Finance: Denied |
| `/api/prospects/comments` | `GET`, `POST` | Authenticated | Admin & Secretary: Full \| Finance: Denied |
| `/api/candidats` | `GET`, `POST`, `PUT`, `DELETE` | Authenticated | Admin: Full \| Secretary: Intake \| Finance: AVI Fields |
| `/api/demandes` | `GET`, `POST`, `PUT` | Authenticated | Admin & Secretary: Full \| Finance: AVI Only |
| `/api/avi` | `GET`, `POST`, `PUT` | Authenticated | Admin & Finance: Full \| Secretary: Read-Only Intake |
| `/api/tasks` | `POST` | Authenticated | Admin & Secretary: Allowed \| Finance: Denied (Reset All: Admin Only) |
| `/api/notifications` | `GET`, `POST`, `PUT` | Authenticated | User-isolated by authenticated email \| Admin: Cross-User |
| `/api/users/tour` | `GET`, `POST` | Authenticated | User-isolated by authenticated user ID \| Admin: Cross-User |
| `/api/email/test` | `GET` | Authenticated | Platform Administrator Only (`role === 'admin'`) |
| `/api/roles` | `GET`, `POST` | Authenticated | Platform Administrator Only |
| `/api/users/import-sets` | `GET`, `POST` | Authenticated | Platform Administrator Only |

---

## 3. Administrative Protection Invariants

1. **Immutable Administrator Protection**:
   - Query filters explicitly guard account ID 1 (`bmapwabantoro@liecconsulting.com`) from automated batch updates.
   - Bulk import workflows throw validation errors if an uploaded row targets an existing administrative identifier.
2. **Account Disablement**:
   - Accounts can be deactivated via `active = FALSE`.
   - Inactive accounts are blocked at the authentication handler before credential verification.
3. **Zero Static Credentials**:
   - Zero hardcoded fallback credentials exist in client bundles (`login/page.tsx`) or server route handlers (`auth/route.ts`).
   - PostgreSQL is the single authoritative source for authentication.

---

## 4. Credential Hygiene & Environment Isolation

- **Connection Secrets**: Connection strings (`DATABASE_URL`, `DATABASE_URL_POOLED`) are strictly injected at runtime via Vercel encrypted environment variables.
- **Session & MFA Secrets**: `SESSION_SECRET` (HMAC signing) and `MFA_ENCRYPTION_KEY` (AES-256-GCM) are 256-bit cryptographically secure keys managed exclusively in production/preview configuration.
- **TLS Configuration**: All PostgreSQL pool instances enforce `rejectUnauthorized = true` (`sslmode=require` / `verify-full`).
