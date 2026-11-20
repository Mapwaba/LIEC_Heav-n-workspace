# LIEC Heav’n v1.4.1 — Rollback & Recovery Reference

**Target Release:** v1.4.1 (`e7aaf7298dca6046af765016d3252afe1d6e158b`)  
**Previous Stable Release:** v1.4.0  
**Previous Stable Commit:** `2fbe25349ec4ae3255b11b3b39bf989a0909a26e`  
**Previous Stable Git Tag:** `v1.4.0`  
**Previous Vercel Production Deployment:** `dpl_BFzG5uRyE4i6pTNzm3rUvTgC8Q1q` (`https://liec-heav-n-workspace-8gtaqn8x0-bmapwabantoro-7094.vercel.app`)  

---

## 1. Rollback Architecture & Principles

LIEC Heav'n strictly adheres to the principle of distinguishing **application-tier rollback** from **database-tier rollback**:

1. **Database Schema State:**
   - **Zero Database Migrations in v1.4.1:** The v1.4.1 security hotfix introduced **zero** database schema migrations, table alterations, column drops, or index changes to the Production Neon database (`hidden-tooth-17237467`).
   - The database schema is identical between v1.4.0 and v1.4.1.
   - **Database rollback is NOT necessary and must NOT be executed.**
2. **Application-Tier Rollback:**
   - Should an unexpected issue occur with v1.4.1 in Production, the application can be restored to v1.4.0 instantaneously without service disruption or data loss.

---

## 2. Emergency Rollback Procedures

### Option A: Instant Vercel Alias Promotion (Recommended / Zero Downtime)
Because Vercel maintains immutable build artifacts for all historical deployments, reverting to v1.4.0 requires no rebuild:

1. In the Vercel Dashboard, navigate to Project `liec-heav-n-workspace` -> Deployments.
2. Locate deployment `dpl_BFzG5uRyE4i6pTNzm3rUvTgC8Q1q` (Release commit `2fbe25349ec4ae3255b11b3b39bf989a0909a26e`).
3. Click **Promote to Production** (or re-assign domain alias `workspace.liecconsulting.com`).
4. *Alternatively, via Vercel CLI:*
   ```bash
   vercel alias set dpl_BFzG5uRyE4i6pTNzm3rUvTgC8Q1q workspace.liecconsulting.com
   ```
5. Verification: Confirm `https://workspace.liecconsulting.com` serves commit `2fbe253`.

---

### Option B: Git Revert (Standard Version Control Path)
If a code-level revert commit is required:

1. **Do NOT force-push or reset `main`:** Git history must remain strictly append-only.
2. Checkout a recovery branch from `main`:
   ```bash
   git checkout -b rollback/revert-to-v1.4.0 main
   ```
3. Revert the v1.4.1 merge commit:
   ```bash
   git revert -m 1 e7aaf7298dca6046af765016d3252afe1d6e158b -m "revert: rollback v1.4.1 to v1.4.0"
   ```
4. Merge back to `main` and push:
   ```bash
   git checkout main
   git merge rollback/revert-to-v1.4.0
   git push origin main
   ```

---

## 3. Preservation Notice

- Both annotated tags `v1.4.0` and `v1.4.1` are permanently recorded in remote git repository `origin`.
- Neither tag shall be deleted, moved, or rewritten.
- Deployment `dpl_BFzG5uRyE4i6pTNzm3rUvTgC8Q1q` is permanently retained in Vercel.
