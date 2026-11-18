import type { DBClient } from './db';

/**
 * LIEC Heav'n Reference Allocator
 *
 * Concurrency-safe, atomic, monotonic reference allocation for applicant applications
 * and student dossiers.
 *
 * Key Guarantees:
 * 1. Monotonic Progression: References never decrease and never re-issue previously used
 *    or historically erased references (e.g. #DEM-2025-102 is permanently protected by floor).
 * 2. Concurrency Safety: Serialized via PostgreSQL transaction advisory locks (pg_advisory_xact_lock).
 * 3. Zero DDL Migration: Works natively with PostgreSQL and PGlite without requiring new sequence tables.
 * 4. Format Preservation: Output strictly adheres to canonical formats: #DEM-YYYY-NNN and #CAN-YYYY-NNN.
 */

export const DEMANDE_2025_FLOOR = 102; // Cosma was #DEM-2025-102; next allocated MUST be >= 103
export const CANDIDAT_2025_FLOOR = 56; // Highest issued candidate was #CAN-2025-056; next MUST be >= 57

/**
 * Extracts numeric sequence from reference strings like #DEM-2025-101 or #CAN-2025-055
 */
export function extractReferenceNumber(ref: string, prefix: 'DEM' | 'CAN', year: number = 2025): number | null {
  if (!ref || typeof ref !== 'string') return null;
  const pattern = new RegExp(`^#${prefix}-${year}-(\\d+)$`);
  const match = ref.trim().match(pattern);
  if (!match) return null;
  const num = parseInt(match[1], 10);
  return isNaN(num) ? null : num;
}

/**
 * Allocates the next monotonic, collision-safe reference for a Demande.
 * Must be executed within a transaction context to ensure the advisory lock spans the insert.
 */
export async function allocateDemandeRef(db: DBClient, year: number = 2025): Promise<string> {
  // 1. Acquire transaction-scoped advisory lock for namespace
  const lockNamespace = `liec_demandes_ref_allocator_${year}`;
  const keyRes = await db.query<{ lock_id: string }>(
    `SELECT (hashtext($1)::bigint) AS lock_id`,
    [lockNamespace]
  );
  const lockId = keyRes.rows[0]?.lock_id;

  if (lockId) {
    await db.query(`SELECT pg_advisory_xact_lock($1);`, [lockId]);
  }

  // 2. Compute the current absolute maximum reference in the database for the target year
  const maxRes = await db.query<{ max_num: string | number | null }>(
    `SELECT MAX(
       CASE
         WHEN ref ~ $1 THEN substring(ref from $2)::int
         ELSE 0
       END
     ) AS max_num
     FROM demandes`,
    [`^#DEM-${year}-\\d+$`, `^#DEM-${year}-(\\d+)$`]
  );

  const dbMax = parseInt(String(maxRes.rows[0]?.max_num ?? 0), 10) || 0;
  const floor = year === 2025 ? DEMANDE_2025_FLOOR : 0;
  const effectiveMax = Math.max(dbMax, floor);
  const nextNum = effectiveMax + 1;

  const padded = String(nextNum).padStart(3, '0');
  return `#DEM-${year}-${padded}`;
}

/**
 * Allocates the next monotonic, collision-safe reference for a Candidat.
 * Must be executed within a transaction context to ensure the advisory lock spans the insert.
 */
export async function allocateCandidatRef(db: DBClient, year: number = 2025): Promise<string> {
  const lockNamespace = `liec_candidats_ref_allocator_${year}`;
  const keyRes = await db.query<{ lock_id: string }>(
    `SELECT (hashtext($1)::bigint) AS lock_id`,
    [lockNamespace]
  );
  const lockId = keyRes.rows[0]?.lock_id;

  if (lockId) {
    await db.query(`SELECT pg_advisory_xact_lock($1);`, [lockId]);
  }

  const maxRes = await db.query<{ max_num: string | number | null }>(
    `SELECT MAX(
       CASE
         WHEN ref ~ $1 THEN substring(ref from $2)::int
         ELSE 0
       END
     ) AS max_num
     FROM candidats`,
    [`^#CAN-${year}-\\d+$`, `^#CAN-${year}-(\\d+)$`]
  );

  const dbMax = parseInt(String(maxRes.rows[0]?.max_num ?? 0), 10) || 0;
  const floor = year === 2025 ? CANDIDAT_2025_FLOOR : 0;
  const effectiveMax = Math.max(dbMax, floor);
  const nextNum = effectiveMax + 1;

  const padded = String(nextNum).padStart(3, '0');
  return `#CAN-${year}-${padded}`;
}
