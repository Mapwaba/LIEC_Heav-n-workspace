# LIEC Heav’n — Production Release Lineage & Deployment History

---

## 1. Current Production Release State

| Parameter | Authoritative Value |
| :--- | :--- |
| **Active Production Commit** | `061caf9954c8f504206718a64347c5fa737b162e` |
| **Commit Type** | Merge Commit (`Merge branch 'fix/staging-email-status-param-type' into main`) |
| **Base Commit** | `3808c6e3b1621514024e4dd60dc44cbdbebbe347` |
| **Vercel Deployment ID** | `HtEAaFT9E8UzHRDWUo6M1CpGg6RF` |
| **Vercel Deployment State**| `success` (Ready) |
| **Live Domain** | [https://workspace.liecconsulting.com](https://workspace.liecconsulting.com) |
| **Release Timestamp** | 2026-11-10T20:32:12Z (21:32:12 CET) |

---

## 2. Git Lineage & Commit Graph

```text
*   061caf9 (HEAD -> main, origin/main) Merge branch 'fix/staging-email-status-param-type' into main
|\  
| * f759125 (fix/staging-email-status-param-type) fix(import-sets): cast email_status parameter ($3::VARCHAR)
|/  
*   3808c6e fix(provisioning): cast invitation_token parameter in PostgreSQL prepared statement (::VARCHAR)
|\  
| * 3a7ebfc test(preview): refine password hash assertions and headless test harness
| * 2b03d46 feat(preview): support headless .env.preview and non-interactive execution
| * 7654858 test(preview): add robust direct runner and stdin handler for preview verification
| * 125e915 test(preview): configure independent preview verification for postgres bulk insert fix
| * bbc140a (fix/postgresql-bulk-insert-param-type) fix(provisioning): cast invitation_token parameter
|/  
*   da2815e Merge branch 'feature/user-import-sets' into main (Production Release v1.0.0)
```

---

## 3. Chronological Release Milestones

### Milestone 1: User Import Sets Initial Production Release
- **Merge Commit**: `da2815eeda1052ca640b792add185cdb2ff1f3b3`
- **Vercel Deployment**: `3cUathA98EoshtZE1QanDeXgHzKr`
- **Scope**: Introduction of User Import Sets API, staging table lifecycle, ExcelJS parser, and admin UI modal.
- **Identified Post-Release Finding**: PostgreSQL prepared-statement parameter typing error on `$12` in `userProvisioning.ts`.

### Milestone 2: PostgreSQL User Provisioning Fix (`$12::VARCHAR`)
- **Fix Commit**: `bbc140ab72eb22b5464fa41b84fcc2187a1df968`
- **Merge Commit**: `3808c6e3b1621514024e4dd60dc44cbdbebbe347`
- **Vercel Deployment**: `8fb1FiJyyFZkQ41XRzoiBG3Gu7Xn`
- **Scope**: Explicit cast `$12::VARCHAR` in bulk account insertion prepared statement.
- **Identified Acceptance Finding**: Staging row update in `importSets.ts:720` failed with `inconsistent types deduced for parameter $3`.

### Milestone 3: PostgreSQL Staging Email Status Fix (`$3::VARCHAR`) & Final Acceptance
- **Fix Commit**: `f759125fcb5c155254689a4860d945bddd884123`
- **Merge Commit**: `061caf9954c8f504206718a64347c5fa737b162e`
- **Vercel Deployment**: `HtEAaFT9E8UzHRDWUo6M1CpGg6RF`
- **Scope**: Explicit cast `$3::VARCHAR` in both column assignment and CASE expression in `importSets.ts:718-720`.
- **Outcome**: 100% Production acceptance passed. Both synthetic accounts provisioned, staging updated to `PROVISIONED` with `NOT_SENT` and NULL timestamp, 0 emails sent, 0 database mutation on cleanup.

---

## 4. Verification of Deployed Code Diff

The exact delta introduced between `3808c6e` and current `main` (`061caf9`):

```diff
diff --git a/src/lib/importSets.ts b/src/lib/importSets.ts
index 0e1cab3..13f4ca9 100644
--- a/src/lib/importSets.ts
+++ b/src/lib/importSets.ts
@@ -715,9 +715,9 @@ export async function executeTransform(
            SET transform_status = 'PROVISIONED',
                provisioned_user_id = $1,
                provisioned_user_identifier = $2,
-               email_status = $3,
+               email_status = $3::VARCHAR,
                email_error = $4,
-               email_sent_at = CASE WHEN $3 = 'SENT' THEN CURRENT_TIMESTAMP ELSE NULL END,
+               email_sent_at = CASE WHEN ($3::VARCHAR) = 'SENT' THEN CURRENT_TIMESTAMP ELSE NULL END,
                error_message = $5,
                execution_lock_id = NULL
            WHERE id = $6 AND execution_lock_id = $7`,
```
