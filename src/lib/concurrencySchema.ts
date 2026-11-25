import type { DBClient } from './db';

let concurrencyColumnsEnsured = false;

export async function ensureOptimisticConcurrencyColumns(db: DBClient): Promise<void> {
  if (concurrencyColumnsEnsured) return;
  await db.query(`ALTER TABLE candidats ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;`);
  await db.query(`ALTER TABLE demandes ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;`);
  await db.query(`ALTER TABLE payment_submissions ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;`).catch(() => {});
  concurrencyColumnsEnsured = true;
}
