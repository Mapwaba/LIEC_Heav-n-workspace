-- Migration: Create User Presence & Active Collaboration Table

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

CREATE INDEX IF NOT EXISTS idx_user_presence_heartbeat ON user_presence (last_heartbeat);
CREATE INDEX IF NOT EXISTS idx_user_presence_record ON user_presence (active_record_ref);
