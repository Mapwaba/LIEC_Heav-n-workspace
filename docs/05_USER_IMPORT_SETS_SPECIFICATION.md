# LIEC Heav’n — User Import Sets Module Specification

---

## 1. Module Overview & Purpose

The **User Import Sets** engine provides high-volume, secure, auditable bulk user onboarding for administrative staff. It replaces legacy ad-hoc user scripting with an enterprise two-phase import pattern:
1. **Load & Stage**: Upload `.xlsx` or `.csv` files, parse contents, validate schemas, detect duplicates, and preview mapped rows in staging tables.
2. **Execute & Transform**: Atomically provision accounts, assign roles, generate cryptographic invitation tokens, enforce administrator guards, and produce downloadable audit results.

---

## 2. Ingestion Pipeline & Security Safeguards

```
[ Upload File (.xlsx / .csv) ]
               │
               ▼
[ ExcelJS / fast-csv Security Filter ]
  ├─ Enforce max 500 rows limit
  ├─ Reject macro-enabled workbooks (.xlsm)
  ├─ Strip formula injection characters (=, +, -, @, \t, \r)
  └─ Sanitize headers & detect multi-sheet workbooks
               │
               ▼
[ Staging Table Insertion (`user_import_staging_rows`) ]
  ├─ Status: `PENDING` -> `VALIDATING` -> `VALID` / `ERROR`
  └─ Auto-map target fields (First Name, Last Name, Email, Role, etc.)
               │
               ▼
[ Admin Interactive Preview & Mapping Confirmation ]
               │
               ▼
[ Execution Phase (`action: 'execute'`) ]
  ├─ Acquire 2-minute Heartbeat Lease Lock
  ├─ Check RBAC (Strictly non-admin roles only)
  ├─ Insert user via `$12::VARCHAR` prepared statement
  ├─ Update staging row via `$3::VARCHAR` prepared statement
  └─ Generate Results CSV (Excluding plaintext passwords)
```

---

## 3. Database Schema Entities

### Table: `user_import_sets`
Tracks import batches and high-level execution metadata:
- `id`: Primary key (SERIAL).
- `set_number`: Unique human-readable code (e.g., `ISET-2026-002`).
- `file_name`: Uploaded filename.
- `file_size`: Size in bytes.
- `file_type`: Format (`csv` or `xlsx`).
- `total_rows`: Total data rows parsed.
- `valid_rows`: Count of rows passing schema validation.
- `error_rows`: Count of rows with mapping/data errors.
- `status`: Batch status (`UPLOADED`, `MAPPED`, `VALIDATED`, `PROCESSING`, `COMPLETED`, `FAILED`).
- `execution_lock_id`: Active worker lease lock identifier.
- `execution_lock_expires_at`: Heartbeat lease expiration timestamp.

### Table: `user_import_staging_rows`
Stores row-level staging records during validation and execution:
- `id`: Primary key (SERIAL).
- `import_set_id`: Foreign key referencing `user_import_sets(id)` ON DELETE CASCADE.
- `row_number`: Position in source file.
- `raw_data_json`: JSON snapshot of original file row.
- `mapped_data_json`: Transformed data matching target user attributes.
- `validation_status`: `VALID`, `INVALID`, or `SKIPPED`.
- `validation_errors_json`: Detailed array of validation error messages.
- `transform_status`: `PENDING`, `PROCESSING`, `PROVISIONED`, `UPDATED`, or `FAILED`.
- `provisioned_user_id`: Foreign key referencing `users(id)`.
- `provisioned_user_identifier`: Generated system User ID (e.g., `fadvisor`).
- `email_status`: `NOT_SENT`, `SENT`, or `FAILED`.
- `email_sent_at`: Timestamp when invitation was dispatched (strictly NULL if NOT_SENT).
- `error_message`: Error text if provisioning failed.

---

## 4. Concurrency & Execution Lease Locking

To prevent race conditions, duplicate account creation, or crashed worker deadlocks:
- **Active Lease Lock**: Before processing a batch, a worker sets `execution_lock_id` to a unique UUID and `execution_lock_expires_at` to `NOW() + INTERVAL '2 minutes'`.
- **Heartbeat Renewal**: Active transformations periodically touch the lease timestamp.
- **Auto-Recovery**: If a serverless function crashes mid-batch, subsequent execution attempts can claim the lease once the expiration timestamp has elapsed.

---

## 5. Security & RBAC Constraints

1. **Privileged Demotion Blocked**: Import Sets cannot update, demote, or modify existing `admin` accounts.
2. **Privilege Escalation Blocked**: Target role mapping restricts assignment to operational business profiles (`Secretary`, `Finance Officer`, `Advisor`, `Reception`). Setting `role = 'admin'` via bulk import is strictly rejected at the validation layer.
3. **Duplicate Handling**: If `updateExisting` is `false`, existing email matches are marked `SKIPPED` without error or database mutation.
4. **Credential Confidentiality**: Generated CSV result downloads display provisioned User IDs, roles, and status, but **never** display temporary passwords or raw invitation tokens.
