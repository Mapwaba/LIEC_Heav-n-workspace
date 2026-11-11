# LIEC Heav’n — PostgreSQL Parameter Typing Fixes Technical Deep-Dive

---

## 1. Problem Context: PostgreSQL Prepared Statements

In Node.js applications using `node-postgres` (`pg`), SQL queries with parameter substitution (`$1, $2, ...`) are sent to PostgreSQL as prepared statements without explicit OID type markers when parameters are untyped JavaScript primitives.

PostgreSQL's query planner deduces parameter data types from context. When an untyped parameter is used across multiple contexts—especially when combining a column assignment with a conditional expression (`CASE WHEN $x ...`)—the planner cannot unambiguously reconcile the inferred types, leading to runtime SQL exceptions.

---

## 2. Issue 1: Parameter `$12` in `userProvisioning.ts`

### Location
[`src/lib/userProvisioning.ts`](file:///C:/Users/barth/.gemini/antigravity/scratch/LIEC_Heav-n-workspace/src/lib/userProvisioning.ts#L265-L285)

### Original Defect
```sql
INSERT INTO users (
  name, first_name, last_name, user_id, email, business_profile, role, title, initials, active,
  password_hash, password_salt, must_change_password, invitation_token, invitation_token_expires_at
)
VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, $10, $11, TRUE,
  $12, CASE WHEN $12 IS NOT NULL THEN CURRENT_TIMESTAMP + INTERVAL '24 hours' ELSE NULL END
)
RETURNING id, name, user_id, email;
```

### Failure Mode
When `$12` was passed as `null` or a string, the query planner failed with:
`could not determine data type of parameter $12` or `inconsistent types deduced for parameter $12`.

### Applied Resolution (Commit `bbc140a`)
```sql
  $12::VARCHAR, CASE WHEN ($12::VARCHAR) IS NOT NULL THEN CURRENT_TIMESTAMP + INTERVAL '24 hours' ELSE NULL END
```
By explicitly casting `$12::VARCHAR` in both the value slot for column `invitation_token` (which is `VARCHAR(255)`) and within the `CASE` conditional, PostgreSQL is provided an explicit type OID.

---

## 3. Issue 2: Parameter `$3` in `importSets.ts`

### Location
[`src/lib/importSets.ts`](file:///C:/Users/barth/.gemini/antigravity/scratch/LIEC_Heav-n-workspace/src/lib/importSets.ts#L715-L725)

### Original Defect
```sql
UPDATE user_import_staging_rows
SET transform_status = 'PROVISIONED',
    provisioned_user_id = $1,
    provisioned_user_identifier = $2,
    email_status = $3,
    email_error = $4,
    email_sent_at = CASE WHEN $3 = 'SENT' THEN CURRENT_TIMESTAMP ELSE NULL END,
    error_message = $5,
    execution_lock_id = NULL
WHERE id = $6 AND execution_lock_id = $7
```

### Failure Mode
During bulk user import execution, every row failed at the post-provisioning staging row update step with:
`inconsistent types deduced for parameter $3`.
Although the user account was inserted into `users`, the staging row could not record the result, causing the batch to report failure.

### Applied Resolution (Commit `f759125`)
```sql
UPDATE user_import_staging_rows
SET transform_status = 'PROVISIONED',
    provisioned_user_id = $1,
    provisioned_user_identifier = $2,
    email_status = $3::VARCHAR,
    email_error = $4,
    email_sent_at = CASE WHEN ($3::VARCHAR) = 'SENT' THEN CURRENT_TIMESTAMP ELSE NULL END,
    error_message = $5,
    execution_lock_id = NULL
WHERE id = $6 AND execution_lock_id = $7
```
Column `email_status` is defined as `VARCHAR(30)`. Explicitly casting `$3::VARCHAR` in the assignment and the `CASE` condition allows PostgreSQL to compile the statement correctly.

---

## 4. Codebase Audit for Similar Patterns

An exhaustive search across `src/` for prepared statement queries containing `CASE WHEN` parameter evaluations confirmed that:
1. `userProvisioning.ts:278` (`$12::VARCHAR`)
2. `importSets.ts:720` (`$3::VARCHAR`)

were the **only two occurrences** in the entire LIEC Heav’n codebase. No additional uncast conditional parameters exist.

---

## 5. Verification Matrix

| Test Scenario | Input Data | Expected Behavior | Observed Result |
| :--- | :--- | :--- | :---: |
| `$12` is NULL | `invitationToken = null` | Account created; `invitation_token_expires_at = null` | **PASS** |
| `$12` is Token Hash | `invitationToken = sha256(...)` | Account created; `expires_at = now() + 24h` | **PASS** |
| `$3` is `'NOT_SENT'` | `emailStatus = 'NOT_SENT'` | Row updated to `PROVISIONED`; `email_sent_at = null` | **PASS** |
| `$3` is `'SENT'` | `emailStatus = 'SENT'` | Row updated to `PROVISIONED`; `email_sent_at = now()` | **PASS** |
| `$3` is `'FAILED'` | `emailStatus = 'FAILED'` | Row updated; `email_error` saved; `sent_at = null` | **PASS** |
