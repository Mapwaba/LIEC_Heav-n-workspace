import type { DBClient } from './db';

let presenceTableEnsured = false;

export async function ensureUserPresenceTable(db: DBClient): Promise<void> {
  if (presenceTableEnsured) return;
  await db.query(`
    CREATE TABLE IF NOT EXISTS user_presence (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(100) NOT NULL,
      session_id VARCHAR(100) NOT NULL,
      user_name VARCHAR(255) NOT NULL,
      user_role VARCHAR(100) NOT NULL,
      is_idle BOOLEAN DEFAULT FALSE,
      current_activity VARCHAR(255),
      active_record_type VARCHAR(100),
      active_record_ref VARCHAR(100),
      is_editing BOOLEAN DEFAULT FALSE,
      last_heartbeat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT uq_user_presence_session UNIQUE (user_id, session_id)
    );
  `);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_user_presence_heartbeat ON user_presence (last_heartbeat);`).catch(() => {});
  await db.query(`CREATE INDEX IF NOT EXISTS idx_user_presence_record ON user_presence (active_record_ref);`).catch(() => {});
  presenceTableEnsured = true;
}
