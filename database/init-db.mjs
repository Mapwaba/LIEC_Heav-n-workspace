import fs from 'fs';
import path from 'path';
import { PGlite } from '@electric-sql/pglite';

async function main() {
  const schemaPath = path.join(process.cwd(), 'database', 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

  const dataDir = path.join(process.cwd(), 'database', '.pgdata');
  fs.mkdirSync(dataDir, { recursive: true });

  const db = new PGlite(dataDir);
  await db.waitReady;
  await db.exec(schemaSql);
  console.log('✓ Schéma PostgreSQL LIEC Heav’n initialisé avec succès dans', dataDir);
}

main().catch((err) => {
  console.error('Erreur initialisation DB:', err);
  process.exit(1);
});
