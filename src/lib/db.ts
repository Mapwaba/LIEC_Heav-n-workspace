import path from 'path';
import fs from 'fs';
import os from 'os';
import { Pool } from 'pg';
import { PGlite } from '@electric-sql/pglite';

interface QueryResult<T = any> {
  rows: T[];
  rowCount?: number | null;
}

export interface DBClient {
  query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;
  exec(sql: string): Promise<void>;
  engine: 'pg' | 'pglite';
}

declare global {
  // eslint-disable-next-line no-var
  var __liecDbClientV4: Promise<DBClient> | undefined;
}

export const PARTNER_SCHOOLS_LYON = [
  {
    id: 1,
    code: 'ISCOM',
    name: 'ISCOM Lyon',
    shortName: 'ISCOM',
    fields: 'Communication, advertising, marketing and events management.',
    campus: 'Lyon 7th (Jean Macé)',
    programs: [
      'Bachelor in Communication, Advertising & Events',
      'Master in Digital Marketing, Advertising & Brand Strategy',
    ],
  },
  {
    id: 2,
    code: 'MDS',
    name: 'MyDigitalSchool Lyon',
    shortName: 'MyDigitalSchool',
    fields: 'Web development, digital creation, webmarketing and UX/UI design.',
    campus: 'Lyon 3rd (Part-Dieu)',
    programs: [
      'Bachelor in Web Development & UX/UI Design',
      'MBA in Digital Creation & Webmarketing',
    ],
  },
  {
    id: 3,
    code: 'TUNON',
    name: 'École Internationale Tunon Lyon',
    shortName: 'École Internationale Tunon',
    fields: 'Tourism, hospitality, public relations and event planning.',
    campus: 'Lyon 6th (Foch)',
    programs: [
      'Bachelor in Tourism, Hospitality & Events',
      'MBA in Hospitality Management & Public Relations',
    ],
  },
  {
    id: 4,
    code: 'IHECF',
    name: 'IHECF Lyon',
    shortName: 'IHECF',
    fields: 'Accounting, auditing, finance and management control.',
    campus: 'Lyon 3rd (Campus Eduservices)',
    programs: [
      'DCG / Bachelor in Accounting & Corporate Finance',
      'DSCG / MBA in Auditing & Management Control',
    ],
  },
  {
    id: 5,
    code: 'IPAC',
    name: 'Ipac Bachelor Factory Lyon',
    shortName: 'Ipac Bachelor Factory',
    fields: 'Commerce, management, corporate finance, communication and logistics.',
    campus: 'Lyon 3rd (Part-Dieu)',
    programs: [
      'Bachelor in Business, Management & Logistics',
      'Bachelor in Finance, Communication & Marketing',
    ],
  },
  {
    id: 6,
    code: 'MBWAY',
    name: 'MBway Lyon',
    shortName: 'MBway',
    fields: 'Management, entrepreneurship, human resources, finance and international business.',
    campus: 'Lyon 3rd (Part-Dieu)',
    programs: [
      'MBA in Management, International Business & Entrepreneurship',
      'MBA in Human Resources & Financial Management',
    ],
  },
];

async function initSchemaAndSeed(client: DBClient) {
  const schemaPath = path.join(process.cwd(), 'database', 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    try {
      const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
      await client.exec(schemaSql);
    } catch (e) {
      console.warn('Notice: Could not execute database/schema.sql file:', e);
    }
  }

  // Ensure all base tables exist (vital for serverless deployments like Vercel/Lambda)
  await client.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(160) UNIQUE NOT NULL,
      business_profile VARCHAR(50) NOT NULL DEFAULT 'Secretary',
      role VARCHAR(50) NOT NULL DEFAULT 'secretary',
      title VARCHAR(100) NOT NULL DEFAULT 'Conseillère Senior',
      initials VARCHAR(10) NOT NULL DEFAULT 'SM',
      active BOOLEAN NOT NULL DEFAULT TRUE,
      password_hash VARCHAR(255),
      password_salt VARCHAR(64),
      must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
      last_login TIMESTAMP WITH TIME ZONE,
      password_updated_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS demandes (
      id SERIAL PRIMARY KEY,
      ref VARCHAR(50) UNIQUE NOT NULL,
      initials VARCHAR(10) NOT NULL,
      full_name VARCHAR(150) NOT NULL,
      email VARCHAR(160) NOT NULL,
      phone VARCHAR(60) NOT NULL,
      parent_full_name VARCHAR(150),
      parent_phone VARCHAR(30),
      graduation_year VARCHAR(10),
      current_activity VARCHAR(25),
      final_year_university VARCHAR(10),
      whatsapp_verified BOOLEAN DEFAULT TRUE,
      country_code VARCHAR(10) DEFAULT 'CD',
      flag VARCHAR(10) DEFAULT '🇨🇩',
      country_name VARCHAR(100) DEFAULT 'RDC',
      city VARCHAR(120) DEFAULT 'Kinshasa',
      nationality VARCHAR(100) DEFAULT 'Congolaise (RDC)',
      program VARCHAR(180) NOT NULL,
      service_pole VARCHAR(120) NOT NULL,
      target_cities VARCHAR(150) DEFAULT 'Lyon',
      current_level VARCHAR(100) DEFAULT 'Licence',
      budget_range VARCHAR(100) DEFAULT '8 500 € – 10 000 € / an',
      status VARCHAR(60) DEFAULT 'Nouvelle',
      adviser VARCHAR(100) DEFAULT 'Barthelemy MAPWABA NTORO',
      expected_start VARCHAR(60) DEFAULT 'Septembre 2025',
      message TEXT,
      submitted_at VARCHAR(60) DEFAULT 'Just now',
      is_dashboard_recent BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS demande_notes (
      id SERIAL PRIMARY KEY,
      demande_ref VARCHAR(50) NOT NULL,
      author VARCHAR(100) NOT NULL,
      timestamp_label VARCHAR(60) DEFAULT 'Today',
      content TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS prospects (
      id SERIAL PRIMARY KEY,
      ref VARCHAR(50) UNIQUE NOT NULL,
      full_name VARCHAR(150) NOT NULL,
      initials VARCHAR(10) NOT NULL,
      program VARCHAR(180) NOT NULL,
      stage VARCHAR(50) NOT NULL DEFAULT 'lead',
      email VARCHAR(160),
      phone VARCHAR(60),
      country VARCHAR(100) DEFAULT 'RDC',
      city VARCHAR(100) DEFAULT 'Kinshasa',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS candidats (
      id SERIAL PRIMARY KEY,
      ref VARCHAR(50) UNIQUE NOT NULL,
      initials VARCHAR(10) NOT NULL,
      full_name VARCHAR(160) NOT NULL,
      avatar_url VARCHAR(255),
      program VARCHAR(180) NOT NULL,
      cities VARCHAR(140) NOT NULL,
      adviser VARCHAR(120) NOT NULL DEFAULT 'Barthelemy MAPWABA NTORO',
      stage_badge VARCHAR(60) NOT NULL DEFAULT 'Jalon 1',
      stage_badge_tone VARCHAR(30) NOT NULL DEFAULT 'teal',
      progress_pct INTEGER NOT NULL DEFAULT 25,
      status_left VARCHAR(80) NOT NULL DEFAULT 'Dossier à 25%',
      status_right VARCHAR(80) NOT NULL DEFAULT 'J-30 CF',
      email VARCHAR(160) DEFAULT 'candidat@liec.edu',
      phone VARCHAR(60) DEFAULT '+243 81 000 0000',
      parent_full_name VARCHAR(150),
      parent_phone VARCHAR(30),
      graduation_year VARCHAR(10),
      current_activity VARCHAR(25),
      final_year_university VARCHAR(10),
      country VARCHAR(100) DEFAULT 'RDC (Kinshasa)',
      nationality VARCHAR(100) DEFAULT 'Congolaise (RDC)',
      current_diploma VARCHAR(180) DEFAULT 'Licence',
      tcf_score VARCHAR(100) DEFAULT 'TCF B2',
      garant_info VARCHAR(220) DEFAULT 'Dossier AVI',
      interview_date VARCHAR(100) DEFAULT '15 Novembre 2025',
      jalons_json TEXT DEFAULT '[]',
      voeux_json TEXT DEFAULT '[]',
      notes_json TEXT DEFAULT '[]',
      pieces_json TEXT DEFAULT '[]',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS priority_tasks (
      id SERIAL PRIMARY KEY,
      title VARCHAR(160) NOT NULL,
      description TEXT NOT NULL,
      priority VARCHAR(40) NOT NULL DEFAULT 'Moderate',
      action_label VARCHAR(80) NOT NULL DEFAULT 'Open',
      target_module VARCHAR(60) NOT NULL DEFAULT 'demandes',
      completed BOOLEAN NOT NULL DEFAULT FALSE,
      role_queue VARCHAR(50) NOT NULL DEFAULT 'adviser',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS avi_requests (
      id SERIAL PRIMARY KEY,
      ref VARCHAR(50) UNIQUE NOT NULL,
      parent_name VARCHAR(150) NOT NULL,
      student_name VARCHAR(150) NOT NULL,
      country VARCHAR(80) NOT NULL,
      amount NUMERIC(12,2) NOT NULL,
      status VARCHAR(60) NOT NULL DEFAULT 'pending',
      physical_address VARCHAR(220) DEFAULT 'Avenue de la Gombe, Kinshasa',
      other_guarantor BOOLEAN NOT NULL DEFAULT FALSE,
      guarantor_details TEXT DEFAULT '',
      principal_eur NUMERIC(12,2) NOT NULL DEFAULT 2800.00,
      principal_xaf NUMERIC(14,2) NOT NULL DEFAULT 1836680.00,
      total_interest_eur NUMERIC(10,2) NOT NULL DEFAULT 336.00,
      supporting_docs TEXT DEFAULT '',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS prepa_cohorts (
      id SERIAL PRIMARY KEY,
      code VARCHAR(50) UNIQUE NOT NULL,
      title VARCHAR(150) NOT NULL,
      student_count INTEGER NOT NULL DEFAULT 0,
      target_school VARCHAR(150) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'active',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id SERIAL PRIMARY KEY,
      ref VARCHAR(50) UNIQUE NOT NULL,
      client_name VARCHAR(150) NOT NULL,
      amount NUMERIC(12,2) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'unpaid',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      actor VARCHAR(150) NOT NULL,
      action VARCHAR(255) NOT NULL,
      entity_ref VARCHAR(100),
      outcome VARCHAR(50) NOT NULL DEFAULT 'Succès',
      details TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS accommodation_requests (
      id SERIAL PRIMARY KEY,
      ref VARCHAR(50) UNIQUE NOT NULL,
      student_ref VARCHAR(50) NOT NULL,
      student_name VARCHAR(150) NOT NULL,
      student_email VARCHAR(160),
      student_phone VARCHAR(60),
      student_nationality VARCHAR(100),
      student_location VARCHAR(120),
      parent_name VARCHAR(150),
      parent_phone VARCHAR(60),
      parent_email VARCHAR(160),
      parent_relation VARCHAR(60) DEFAULT 'Parent / Tuteur',
      admission_status VARCHAR(100) DEFAULT 'Admitted — Partner School Lyon',
      procedure_status VARCHAR(100) DEFAULT 'Milestone 2 — Academic Records',
      preferred_location VARCHAR(150) NOT NULL,
      accommodation_type VARCHAR(100) NOT NULL,
      arrival_date VARCHAR(40) NOT NULL,
      departure_date VARCHAR(40),
      budget VARCHAR(80) NOT NULL,
      special_requirements TEXT,
      supporting_docs TEXT DEFAULT '',
      status VARCHAR(50) NOT NULL DEFAULT 'Draft',
      assigned_agent VARCHAR(120) NOT NULL DEFAULT 'Barthelemy MAPWABA NTORO',
      notes TEXT,
      history_json TEXT NOT NULL DEFAULT '[]',
      email_sent_at TIMESTAMP WITH TIME ZONE,
      email_sent_by VARCHAR(120),
      email_recipient VARCHAR(160),
      email_status VARCHAR(50),
      email_error TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS prepa_payments (
      id SERIAL PRIMARY KEY,
      payment_ref VARCHAR(80) UNIQUE NOT NULL,
      candidate_ref VARCHAR(80) NOT NULL,
      candidate_name VARCHAR(150) NOT NULL,
      candidate_email VARCHAR(160),
      academic_intake VARCHAR(80) DEFAULT '2025–2026',
      program VARCHAR(100) DEFAULT 'LIEC-France PREPA',
      instalment_number INT NOT NULL,
      instalment_label VARCHAR(50) NOT NULL,
      instalment_percentage NUMERIC(5,2) NOT NULL,
      amount NUMERIC(10,2) NOT NULL,
      payment_method VARCHAR(80) DEFAULT 'Bank Wire (Virement)',
      transaction_ref VARCHAR(100),
      proof_file_url TEXT,
      proof_filename VARCHAR(255),
      status VARCHAR(50) NOT NULL DEFAULT 'Pending',
      validated_by VARCHAR(150),
      validated_at TIMESTAMP WITH TIME ZONE,
      expected_next_date TIMESTAMP WITH TIME ZONE,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS prepa_receipts (
      id SERIAL PRIMARY KEY,
      receipt_number VARCHAR(80) UNIQUE NOT NULL,
      payment_id INT REFERENCES prepa_payments(id),
      payment_ref VARCHAR(80) NOT NULL,
      candidate_ref VARCHAR(80) NOT NULL,
      candidate_name VARCHAR(150) NOT NULL,
      instalment_number INT NOT NULL,
      amount_paid NUMERIC(10,2) NOT NULL,
      cumulative_paid NUMERIC(10,2) NOT NULL,
      outstanding_balance NUMERIC(10,2) NOT NULL,
      issue_date_paris VARCHAR(30) NOT NULL,
      issue_time_paris VARCHAR(30) NOT NULL,
      timezone VARCHAR(30) DEFAULT 'Europe/Paris',
      verification_ref VARCHAR(100) UNIQUE NOT NULL,
      is_reissue BOOLEAN DEFAULT FALSE,
      reissue_count INT DEFAULT 0,
      generated_by VARCHAR(150) NOT NULL,
      generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      receipt_pdf_url TEXT,
      metadata JSONB DEFAULT '{}'::jsonb
    );
  `);

  // Ensure RBAC schema columns and tables exist
  await client.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      id SERIAL PRIMARY KEY,
      role_id VARCHAR(50) UNIQUE NOT NULL,
      role_name VARCHAR(100) NOT NULL,
      business_profile VARCHAR(50) NOT NULL,
      description TEXT NOT NULL,
      safeguards TEXT NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      password_hash VARCHAR(255),
      password_salt VARCHAR(64),
      must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
      last_login TIMESTAMP WITH TIME ZONE,
      password_updated_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_roles (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role_id VARCHAR(50) NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
      assigned_by VARCHAR(120) NOT NULL DEFAULT 'System Admin',
      assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, role_id)
    );

    CREATE TABLE IF NOT EXISTS staff_2fa (
      id SERIAL PRIMARY KEY,
      user_email VARCHAR(160) UNIQUE NOT NULL,
      secret VARCHAR(80) NOT NULL,
      is_activated BOOLEAN NOT NULL DEFAULT FALSE,
      activated_at TIMESTAMP WITH TIME ZONE,
      last_verified_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    ALTER TABLE users ADD COLUMN IF NOT EXISTS business_profile VARCHAR(50) DEFAULT 'Secretary';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP WITH TIME ZONE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_by VARCHAR(120);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS password_salt VARCHAR(64);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS password_updated_at TIMESTAMP WITH TIME ZONE;
    ALTER TABLE demande_notes ADD COLUMN IF NOT EXISTS timestamp_label VARCHAR(60) DEFAULT 'Today';

    -- Seed Technical Roles from RBAC Specification if empty
    INSERT INTO roles (role_id, role_name, business_profile, description, safeguards, active) VALUES
      ('admin', 'Platform Administrator', 'Admin', 'Highest privilege. Assign only to trusted administrators.', 'Assign only to trusted administrators; log assignments and removals.', TRUE),
      ('lh_security_admin', 'Security Administrator', 'Admin', 'Security administration. Limit access to security configuration and sensitive controls.', 'Limit access to security configuration and sensitive controls.', TRUE),
      ('ITIL', 'ITIL Workflow Operator', 'Secretary', 'Secretary workflows (as configured). Applicant intake and administrative tracking.', 'Do not assume this role means full administrator access. Verify permissions and inherited access.', TRUE),
      ('lh_internal', 'Internal Application Access', 'Secretary', 'Internal application access. Restrict to applicant intake, assigned records, comments and history.', 'Restrict to applicant intake, assigned records, comments and history.', TRUE),
      ('lh_finance', 'Finance & AVI Officer', 'Finance Officer', 'AVI and parent-financing operations, YIMMILINE desk calculations and loan requests.', 'Restrict to AVI-related functions and records; do not grant unrelated finance or system configuration access.', TRUE)
    ON CONFLICT (role_id) DO NOTHING;

    -- Ensure only Admin exists
    DELETE FROM user_roles;
    DELETE FROM users;

    INSERT INTO users (id, name, email, business_profile, role, title, initials, active)
    VALUES (1, 'Barthelemy MAPWABA NTORO', 'bmapwabantoro@liecconsulting.com', 'Admin', 'admin', 'Platform Administrator & Managing Director', 'BM', TRUE)
    ON CONFLICT (email) DO UPDATE SET
      name = 'Barthelemy MAPWABA NTORO',
      business_profile = 'Admin',
      role = 'admin',
      title = 'Platform Administrator & Managing Director',
      initials = 'BM',
      active = TRUE;

    INSERT INTO user_roles (user_id, role_id, assigned_by)
    SELECT u.id, 'admin', 'System Initializer' FROM users u WHERE LOWER(u.email) = 'bmapwabantoro@liecconsulting.com'
    ON CONFLICT (user_id, role_id) DO NOTHING;

    INSERT INTO user_roles (user_id, role_id, assigned_by)
    SELECT u.id, 'lh_security_admin', 'System Initializer' FROM users u WHERE LOWER(u.email) = 'bmapwabantoro@liecconsulting.com'
    ON CONFLICT (user_id, role_id) DO NOTHING;
  `);
// Ensure new AVI columns exist on existing database tables
  await client.exec(`
    ALTER TABLE avi_requests ADD COLUMN IF NOT EXISTS physical_address VARCHAR(220) DEFAULT 'Avenue de la Gombe, Kinshasa';
    ALTER TABLE avi_requests ADD COLUMN IF NOT EXISTS other_guarantor BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE avi_requests ADD COLUMN IF NOT EXISTS guarantor_details TEXT DEFAULT '';
    ALTER TABLE avi_requests ADD COLUMN IF NOT EXISTS principal_eur NUMERIC(12,2) NOT NULL DEFAULT 2800.00;
    ALTER TABLE avi_requests ADD COLUMN IF NOT EXISTS principal_xaf NUMERIC(14,2) NOT NULL DEFAULT 1836680.00;
    ALTER TABLE avi_requests ADD COLUMN IF NOT EXISTS total_interest_eur NUMERIC(10,2) NOT NULL DEFAULT 336.00;
    ALTER TABLE avi_requests ADD COLUMN IF NOT EXISTS supporting_docs TEXT DEFAULT '';
  `);

  // Ensure new Student Application and Parent Linking columns and tables exist
  await client.exec(`
    ALTER TABLE demandes ADD COLUMN IF NOT EXISTS parent_full_name VARCHAR(150);
    ALTER TABLE demandes ADD COLUMN IF NOT EXISTS parent_phone VARCHAR(30);
    ALTER TABLE demandes ADD COLUMN IF NOT EXISTS graduation_year VARCHAR(10);
    ALTER TABLE demandes ADD COLUMN IF NOT EXISTS current_activity VARCHAR(25);
    ALTER TABLE demandes ADD COLUMN IF NOT EXISTS final_year_university VARCHAR(10);

    ALTER TABLE candidats ADD COLUMN IF NOT EXISTS parent_full_name VARCHAR(150);
    ALTER TABLE candidats ADD COLUMN IF NOT EXISTS parent_phone VARCHAR(30);
    ALTER TABLE candidats ADD COLUMN IF NOT EXISTS graduation_year VARCHAR(10);
    ALTER TABLE candidats ADD COLUMN IF NOT EXISTS current_activity VARCHAR(25);
    ALTER TABLE candidats ADD COLUMN IF NOT EXISTS final_year_university VARCHAR(10);
    ALTER TABLE candidats ADD COLUMN IF NOT EXISTS parent_email VARCHAR(160);
    ALTER TABLE candidats ADD COLUMN IF NOT EXISTS parent_relation VARCHAR(60) DEFAULT 'Parent';
    ALTER TABLE candidats ADD COLUMN IF NOT EXISTS admission_status VARCHAR(100) DEFAULT 'Admitted - Partner School Lyon';
    ALTER TABLE candidats ADD COLUMN IF NOT EXISTS procedure_status VARCHAR(100) DEFAULT 'In Progress (Milestone 2)';
    ALTER TABLE candidats ADD COLUMN IF NOT EXISTS description TEXT;
    ALTER TABLE candidats ADD COLUMN IF NOT EXISTS comments TEXT;
    ALTER TABLE candidats ADD COLUMN IF NOT EXISTS history_json TEXT DEFAULT '[]';

    ALTER TABLE avi_requests ADD COLUMN IF NOT EXISTS student_ref VARCHAR(50);
    UPDATE avi_requests SET student_ref = '#CAN-2025-042' WHERE student_name ILIKE '%Kabangele%' AND (student_ref IS NULL OR student_ref = '');

    CREATE TABLE IF NOT EXISTS parent_student_links (
      id SERIAL PRIMARY KEY,
      parent_name VARCHAR(150) NOT NULL,
      parent_phone VARCHAR(30),
      student_name VARCHAR(150) NOT NULL,
      student_email VARCHAR(160),
      student_program VARCHAR(180),
      source VARCHAR(50) DEFAULT 'application',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(parent_name, student_name)
    );

    -- No demo parent_student_links
  `);

  // Ensure Admin profile and technical roles are ALWAYS preserved
  await client.exec(`
    UPDATE users SET business_profile = 'Admin', role = 'admin', active = TRUE
    WHERE LOWER(email) = 'bmapwabantoro@liecconsulting.com';

    INSERT INTO user_roles (user_id, role_id, assigned_by)
    SELECT u.id, 'admin', 'System Initializer' FROM users u
    WHERE LOWER(u.email) = 'bmapwabantoro@liecconsulting.com'
    ON CONFLICT (user_id, role_id) DO NOTHING;

    INSERT INTO user_roles (user_id, role_id, assigned_by)
    SELECT u.id, 'lh_security_admin', 'System Initializer' FROM users u
    WHERE LOWER(u.email) = 'bmapwabantoro@liecconsulting.com'
    ON CONFLICT (user_id, role_id) DO NOTHING;
  `);

  // Ensure initial Accommodation sample exists
  try {
    const checkAcc = await client.query<{ count: string | number }>(
      `SELECT COUNT(*) as count FROM accommodation_requests`
    );
    if (Number(checkAcc.rows[0]?.count ?? 0) === 0) {
      await client.exec(`
        -- No demo accommodation_requests
      `);
    }
  } catch (err) {
    console.warn('Notice: accommodation seed check:', err);
  }

  // Reset all demo data so tables remain clean and ready for live testing
  await client.exec(`
    DELETE FROM demande_notes;
    DELETE FROM demandes;
    DELETE FROM prospects;
    DELETE FROM candidats;
    DELETE FROM priority_tasks;
    DELETE FROM avi_requests;
    DELETE FROM prepa_cohorts;
    DELETE FROM invoices;
    DELETE FROM audit_logs;
    DELETE FROM accommodation_requests;
    DELETE FROM parent_student_links;

    -- Ensure Admin user
    DELETE FROM user_roles WHERE user_id NOT IN (SELECT id FROM users WHERE LOWER(email) = 'bmapwabantoro@liecconsulting.com');
    DELETE FROM users WHERE LOWER(email) != 'bmapwabantoro@liecconsulting.com';

    INSERT INTO users (id, name, email, business_profile, role, title, initials, active)
    VALUES (1, 'Barthelemy MAPWABA NTORO', 'bmapwabantoro@liecconsulting.com', 'Admin', 'admin', 'Platform Administrator & Managing Director', 'BM', TRUE)
    ON CONFLICT (email) DO UPDATE SET
      name = 'Barthelemy MAPWABA NTORO',
      business_profile = 'Admin',
      role = 'admin',
      title = 'Platform Administrator & Managing Director',
      initials = 'BM',
      active = TRUE;

    INSERT INTO user_roles (user_id, role_id, assigned_by)
    SELECT u.id, 'admin', 'System Initializer' FROM users u WHERE LOWER(u.email) = 'bmapwabantoro@liecconsulting.com'
    ON CONFLICT (user_id, role_id) DO NOTHING;

    INSERT INTO user_roles (user_id, role_id, assigned_by)
    SELECT u.id, 'lh_security_admin', 'System Initializer' FROM users u WHERE LOWER(u.email) = 'bmapwabantoro@liecconsulting.com'
    ON CONFLICT (user_id, role_id) DO NOTHING;
  `);
}
function getSafeDbInfo(rawUrl: string): { host: string; database: string } {
  try {
    const u = new URL(rawUrl);
    return { host: u.host, database: u.pathname.replace(/^\//, '') || 'neondb' };
  } catch {
    return { host: 'unknown-host', database: 'unknown-db' };
  }
}

async function createDBClient(): Promise<DBClient> {
  const directUrl = process.env.DATABASE_URL;
  const pooledUrl = process.env.DATABASE_URL_POOLED;
  const queryUrl = pooledUrl || directUrl;

  if (queryUrl && process.env.FORCE_PGLITE !== 'true') {
    try {
      const isLocalhost = queryUrl.includes('localhost') || queryUrl.includes('127.0.0.1');
      const safeInfo = getSafeDbInfo(queryUrl);
      const isPooled = Boolean(pooledUrl && queryUrl === pooledUrl);

      const pool = new Pool({
        connectionString: queryUrl,
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 30000,
        max: process.env.DB_POOL_MAX ? Number(process.env.DB_POOL_MAX) : 10,
        ssl: isLocalhost ? false : { rejectUnauthorized: false },
      });

      await pool.query('SELECT 1');
      console.log(`[DB] Successfully connected to Neon PostgreSQL host: ${safeInfo.host} (database: ${safeInfo.database}) [mode: ${isPooled ? 'pooled' : 'direct'}]`);

      const pgClient: DBClient = {
        engine: 'pg',
        async query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
          const res = await pool.query(sql, params);
          const rowCount =
            typeof res.rowCount === 'number'
              ? res.rowCount
              : (res.rows && res.rows.length > 0 ? res.rows.length : 0);
          return { rows: res.rows as T[], rowCount };
        },
        async exec(sql: string): Promise<void> {
          await pool.query(sql);
        },
      };

      await initSchemaAndSeed(pgClient);
      return pgClient;
    } catch (err: any) {
      console.warn('[DB] Could not connect to external Neon PostgreSQL server:', err?.message || err);
      console.warn('[DB] Falling back to embedded PGlite instance.');
    }
  }

  // Resolve dataDir with full support for Serverless environments (AWS Lambda, Vercel, read-only /var/task)
  let pglite: any;
  const isServerless =
    Boolean(process.env.VERCEL) ||
    Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
    Boolean(process.env.LAMBDA_TASK_ROOT) ||
    process.cwd().startsWith('/var/task');

  const candidateDirs = isServerless
    ? [path.join(os.tmpdir(), '.pgdata'), '/tmp/.pgdata']
    : [
        path.join(process.cwd(), 'database', '.pgdata'),
        path.join(os.tmpdir(), '.pgdata'),
        '/tmp/.pgdata',
      ];

  for (const dir of candidateDirs) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      pglite = new PGlite(dir);
      await pglite.waitReady;
      break;
    } catch (e) {
      console.warn(`Could not initialize PGlite at "${dir}":`, e);
    }
  }

  // Fallback to in-memory PGlite if all filesystem attempts fail
  if (!pglite) {
    console.warn('Falling back to in-memory PGlite instance.');
    pglite = new PGlite();
    await pglite.waitReady;
  }

  const pgliteClient: DBClient = {
    engine: 'pglite',
    async query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
      const res = await (pglite as any).query(sql, params);
      const rowCount =
        res.rows && res.rows.length > 0
          ? res.rows.length
          : (typeof res.affectedRows === 'number' ? res.affectedRows : 0);
      return { rows: res.rows as T[], rowCount };
    },
    async exec(sql: string): Promise<void> {
      await pglite.exec(sql);
    },
  };

  await initSchemaAndSeed(pgliteClient);
  return pgliteClient;
}

export async function getDb(): Promise<DBClient> {
  if (!global.__liecDbClientV4) {
    global.__liecDbClientV4 = createDBClient();
  }
  return global.__liecDbClientV4;
}
