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

const SEED_CANDIDATS = [
  {
    ref: '#CAN-2025-042',
    initials: 'DK',
    full_name: 'Dieudonné KABANGELE',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop&q=80',
    program: 'MBA Web Development & UX/UI — MyDigitalSchool',
    cities: 'Lyon (Part-Dieu Campus)',
    adviser: 'Sarah Mwamba',
    stage_badge: 'In Progress (Milestone 2)',
    stage_badge_tone: 'teal',
    progress_pct: 62,
    status_left: 'File at 65%',
    status_right: 'D-14 CF',
    email: 'd.kabangele@unikin.ac.cd',
    phone: '+243 81 552 1904',
    country: 'DRC (Kinshasa)',
    nationality: 'Congolese (DRC)',
    current_diploma: 'Bachelor in Computer Science (First Class Honours) - UNIKIN Kinshasa',
    tcf_score: 'Certified TCF B2 (540 pts)',
    garant_info: 'Uncle residing in Lyon (Villeurbanne) under permanent CDI contract (Verified income)',
    interview_date: 'November 04, 2025',
    jalons: [
      {
        num: 1,
        label: 'MILESTONE 1',
        title: 'Orientation & Targeting',
        status: 'APPROVED',
        tone: 'done',
        description:
          'Approved on Sep 12, 2025. Selection of 3 partner schools in Lyon (MyDigitalSchool, MBway, Ipac Bachelor Factory) confirmed.',
        footer: '3 Lyon partner schools',
      },
      {
        num: 2,
        label: 'MILESTONE 2',
        title: 'Academic Records',
        status: 'IN PROGRESS',
        tone: 'active',
        description:
          'Certified TCF B2 (540 pts). Certified transcripts received. Statement of purpose V2 for MyDigitalSchool Lyon under review with Sarah.',
        footer: '8 / 10 documents approved',
      },
      {
        num: 3,
        label: 'MILESTONE 3',
        title: 'Official Submission',
        status: 'UPCOMING',
        tone: 'upcoming',
        description:
          'Submission to Campus France DRC (Kinshasa) and Lyon partner school application portals.',
        footer: 'Deadline: December 15',
      },
      {
        num: 4,
        label: 'MILESTONE 4',
        title: 'Visa & Settlement',
        status: 'PENDING',
        tone: 'pending',
        description:
          'Financial guarantor, YimmiLine AVI bank certificate and student housing reservation in Lyon.',
        footer: 'Upon notice reception',
      },
    ],
    voeux: [
      {
        code: 'MDS',
        codeBg: 'navy',
        university: 'MyDigitalSchool Lyon',
        rankBadge: 'Choice #1',
        rankTone: 'mint',
        program: 'MBA in Web Development, Digital Creation, Webmarketing & UX/UI Design',
        location: 'Lyon Part-Dieu Campus',
        meta: 'LIEC Lyon Partner School',
        statusBadge: 'Ready File',
        statusTone: 'green',
        statusSub: 'Verified by Sarah M.',
      },
      {
        code: 'MBW',
        codeBg: 'teal',
        university: 'MBway Lyon',
        rankBadge: 'Choice #2',
        rankTone: 'neutral',
        program: 'MBA in Management, Entrepreneurship & International Business',
        location: 'Lyon Part-Dieu Campus',
        meta: 'Campus France & Direct Entrance',
        statusBadge: 'Reviewing SOP (V2)',
        statusTone: 'gold',
        statusSub: 'Scheduled for 10/28',
      },
      {
        code: 'IPAC',
        codeBg: 'amber',
        university: 'Ipac Bachelor Factory Lyon',
        rankBadge: 'Choice #3 (Pathway)',
        rankTone: 'neutral',
        program: 'Bachelor in Commerce, Management, Corporate Finance & Logistics',
        location: 'Lyon 3rd Campus',
        meta: 'Certified RNCP Degree',
        statusBadge: 'Prerequisites Pending',
        statusTone: 'slate',
        statusSub: 'Admission interview scheduled',
      },
    ],
    notes: [
      {
        author: 'Sarah Mwamba',
        date: '24 Oct, 14:15',
        text: 'Phone interview with Dieudonné (Kinshasa). Excellent progress on TCF B2 (540 points). Finalizing his UX/UI design portfolio for direct admission to MyDigitalSchool Lyon.',
      },
      {
        author: 'Alain Kanza (Visa Desk)',
        date: '18 Oct, 09:30',
        text: 'Guarantor in Lyon identified (uncle living in Villeurbanne with permanent CDI contract). Provisional housing file in Lyon initiated.',
      },
      {
        author: 'Campus France System',
        date: '12 Oct, 11:00',
        text: 'Etudes en France DRC account creation verified and approved for Lyon partner schools.',
      },
    ],
    pieces: [
      { name: 'Biometric Passport (DRC)', meta: 'Exp. 2028', status: 'valid' },
      { name: 'Certified TCF B2 (540 pts)', meta: 'France Éduc.', status: 'valid' },
      { name: 'Bachelor Degree in CS', meta: 'First Class', status: 'valid' },
      { name: 'Statement of Purpose MyDigitalSchool', meta: 'V2 in progress', status: 'pending' },
    ],
  },
  {
    ref: '#CAN-2025-039',
    initials: 'AB',
    full_name: 'Aïcha BOPILI',
    avatar_url: '',
    program: 'DCG / MBA in Accounting & Finance — IHECF Lyon',
    cities: 'Lyon (Part-Dieu Campus)',
    adviser: 'Sarah Mwamba',
    stage_badge: 'Milestone 1',
    stage_badge_tone: 'neutral',
    progress_pct: 38,
    status_left: 'Awaiting TCF',
    status_right: 'Sarah M.',
    email: 'bopili.a@orange.cg',
    phone: '+242 06 412 8890',
    country: 'Congo-Brazzaville (Brazzaville)',
    nationality: 'Congolese (Brazzaville)',
    current_diploma: 'BTS in Accounting & Management - Brazzaville',
    tcf_score: 'TCF Registered (Nov 2025 session)',
    garant_info: 'Family business in Brazzaville + YimmiLine Classic AVI prefinancing',
    interview_date: 'November 08, 2025',
    jalons: [
      {
        num: 1,
        label: 'MILESTONE 1',
        title: 'Orientation & Targeting',
        status: 'IN PROGRESS',
        tone: 'active',
        description: 'Selection of IHECF Lyon & Ipac Bachelor Factory Lyon confirmed.',
        footer: '2 schools targeted in Lyon',
      },
      {
        num: 2,
        label: 'MILESTONE 2',
        title: 'Academic Records',
        status: 'UPCOMING',
        tone: 'upcoming',
        description: 'Transcripts received. Awaiting certified TCF B2 score certificate.',
        footer: '5 / 10 documents approved',
      },
      {
        num: 3,
        label: 'MILESTONE 3',
        title: 'Official Submission',
        status: 'PENDING',
        tone: 'pending',
        description: 'Campus France Congo file to be submitted before December 20.',
        footer: 'Session Jan 2026',
      },
      {
        num: 4,
        label: 'MILESTONE 4',
        title: 'Visa & Settlement',
        status: 'PENDING',
        tone: 'pending',
        description: 'YimmiLine Classic AVI file pre-registered.',
        footer: 'Scheduled Q1 2026',
      },
    ],
    voeux: [
      {
        code: 'IHEC',
        codeBg: 'navy',
        university: 'IHECF Lyon',
        rankBadge: 'Choice #1',
        rankTone: 'mint',
        program: 'DCG / MBA in Accounting, Corporate Finance & Auditing',
        location: 'Lyon 3rd (Eduservices Campus)',
        meta: 'LIEC Lyon Partner School',
        statusBadge: 'Pre-selected',
        statusTone: 'green',
        statusSub: 'Transcripts accepted',
      },
      {
        code: 'IPAC',
        codeBg: 'teal',
        university: 'Ipac Bachelor Factory Lyon',
        rankBadge: 'Choice #2',
        rankTone: 'neutral',
        program: 'Bachelor in Commerce, Management, Corporate Finance & Logistics',
        location: 'Lyon 3rd Campus',
        meta: 'LIEC Lyon Partner School',
        statusBadge: 'Mock File Approved',
        statusTone: 'green',
        statusSub: 'Verified on 10/20',
      },
    ],
    notes: [
      {
        author: 'Sarah Mwamba',
        date: '22 Oct, 11:20',
        text: 'Aïcha (Brazzaville) submitted her year 1 and 2 transcripts with 14.4 GPA. Priority application for IHECF Lyon.',
      },
    ],
    pieces: [
      { name: 'Biometric Passport (Congo-Brazzaville)', meta: 'Exp. 2029', status: 'valid' },
      { name: 'Certified Transcripts Year 1 & 2', meta: 'Certified', status: 'valid' },
      { name: 'TCF Certificate Brazzaville', meta: 'Pending', status: 'pending' },
    ],
  },
  {
    ref: '#CAN-2025-031',
    initials: 'BM',
    full_name: 'Brice MAKOSSO',
    avatar_url: '',
    program: 'Bachelor in Communication & Events — ISCOM Lyon',
    cities: 'Lyon (Jean Macé Campus)',
    adviser: 'Sarah Mwamba',
    stage_badge: 'Milestone 3',
    stage_badge_tone: 'mint',
    progress_pct: 84,
    status_left: '3/3 Applied',
    status_right: 'Sarah M.',
    email: 'makosso.b@congo-post.cg',
    phone: '+242 06 614 88 20',
    country: 'Congo-Brazzaville (Pointe-Noire)',
    nationality: 'Congolese (Brazzaville)',
    current_diploma: 'Degree in Media & Communication - Pointe-Noire',
    tcf_score: 'Exempt / Certified B2',
    garant_info: 'YimmiLine Partial 1 AVI bank guarantee approved',
    interview_date: 'November 02, 2025',
    jalons: [
      {
        num: 1,
        label: 'MILESTONE 1',
        title: 'Orientation & Targeting',
        status: 'APPROVED',
        tone: 'done',
        description:
          'Targeting confirmed: ISCOM Lyon, École Internationale Tunon Lyon and Ipac Bachelor Factory Lyon.',
        footer: '3 Lyon partner schools',
      },
      {
        num: 2,
        label: 'MILESTONE 2',
        title: 'Academic Records',
        status: 'APPROVED',
        tone: 'done',
        description: '10/10 academic documents and creative portfolio approved for ISCOM Lyon.',
        footer: '10 / 10 documents approved',
      },
      {
        num: 3,
        label: 'MILESTONE 3',
        title: 'Official Submission',
        status: 'IN PROGRESS',
        tone: 'active',
        description:
          'Applications transmitted to ISCOM Lyon and École Internationale Tunon Lyon. Interview D-4.',
        footer: 'Interview D-4',
      },
      {
        num: 4,
        label: 'MILESTONE 4',
        title: 'Visa & Settlement',
        status: 'UPCOMING',
        tone: 'upcoming',
        description: 'AVI file pre-approved. Awaiting final unconditional acceptance letter from Lyon.',
        footer: 'Scheduled Jan 2026',
      },
    ],
    voeux: [
      {
        code: 'ISCO',
        codeBg: 'navy',
        university: 'ISCOM Lyon',
        rankBadge: 'Choice #1',
        rankTone: 'mint',
        program: 'Grande École Program — Communication, Advertising, Marketing & Events',
        location: 'Lyon 7th (Jean Macé)',
        meta: 'LIEC Lyon Partner School',
        statusBadge: 'File Submitted',
        statusTone: 'green',
        statusSub: 'Transmitted on 10/19',
      },
      {
        code: 'TUNO',
        codeBg: 'teal',
        university: 'École Internationale Tunon Lyon',
        rankBadge: 'Choice #2',
        rankTone: 'neutral',
        program: 'MBA in Tourism, Hospitality, Public Relations & Events',
        location: 'Lyon 6th (Foch)',
        meta: 'LIEC Lyon Partner School',
        statusBadge: 'Admissible',
        statusTone: 'green',
        statusSub: 'Interview passed',
      },
    ],
    notes: [
      {
        author: 'Sarah Mwamba',
        date: '23 Oct, 16:00',
        text: 'Full application file submitted to ISCOM Lyon and École Internationale Tunon Lyon.',
      },
    ],
    pieces: [
      { name: 'Biometric Passport (Congo-Brazzaville)', meta: 'Exp. 2028', status: 'valid' },
      { name: 'Communication Degree', meta: 'Honours', status: 'valid' },
      { name: 'ISCOM Lyon Admission File', meta: 'Approved', status: 'valid' },
    ],
  },
  {
    ref: '#CAN-2025-018',
    initials: 'EM',
    full_name: 'Esther MUTOMBO',
    avatar_url: '',
    program: 'Bachelor in Tourism, Hospitality & Events — École Tunon Lyon',
    cities: 'Lyon (Foch Campus)',
    adviser: 'Marcelle B.',
    stage_badge: 'PREPA + TUNON',
    stage_badge_tone: 'neutral',
    progress_pct: 92,
    status_left: 'Lyon Housing Secured',
    status_right: 'Marcelle B.',
    email: 'esther.mutombo@outlook.com',
    phone: '+243 82 910 33 41',
    country: 'DRC (Kinshasa)',
    nationality: 'Congolese (DRC)',
    current_diploma: 'State Diploma (With Honours) - Kinshasa',
    tcf_score: 'Validated B2 Certificate',
    garant_info: 'AVI Bank Guarantee + Studéa Lyon 7 Residence Lease',
    interview_date: 'Approved',
    jalons: [
      {
        num: 1,
        label: 'MILESTONE 1',
        title: 'Orientation & Targeting',
        status: 'APPROVED',
        tone: 'done',
        description: 'Admission confirmed at École Internationale Tunon Lyon.',
        footer: 'Certificate issued',
      },
      {
        num: 2,
        label: 'MILESTONE 2',
        title: 'Academic Records',
        status: 'APPROVED',
        tone: 'done',
        description: 'All academic and consular documents for DRC verified and approved.',
        footer: '10 / 10 documents approved',
      },
      {
        num: 3,
        label: 'MILESTONE 3',
        title: 'Official Submission',
        status: 'APPROVED',
        tone: 'done',
        description: 'Campus France Kinshasa interview passed with favorable opinion for Lyon.',
        footer: 'Approved on Oct 10',
      },
      {
        num: 4,
        label: 'MILESTONE 4',
        title: 'Visa & Settlement',
        status: 'IN PROGRESS',
        tone: 'active',
        description: 'Housing reserved in Lyon. Consular visa appointment in Kinshasa scheduled.',
        footer: 'Arrival: Lyon Intake',
      },
    ],
    voeux: [
      {
        code: 'TUNO',
        codeBg: 'teal',
        university: 'École Internationale Tunon Lyon',
        rankBadge: 'Choice #1',
        rankTone: 'mint',
        program: 'Bachelor in Tourism, Hospitality, Public Relations and Events',
        location: 'Lyon 6th (Foch)',
        meta: 'Admission confirmed',
        statusBadge: 'Enrolled',
        statusTone: 'green',
        statusSub: 'Deposit paid',
      },
    ],
    notes: [
      {
        author: 'Marcelle B.',
        date: '21 Oct, 10:30',
        text: 'Lyon accommodation certificate and AVI bank guarantee transmitted for the Kinshasa consulate.',
      },
    ],
    pieces: [
      { name: 'Biometric Passport (DRC)', meta: 'Exp. 2029', status: 'valid' },
      { name: 'Lyon Accommodation Certificate', meta: 'Certified', status: 'valid' },
      { name: 'YimmiLine AVI Certificate', meta: 'Issued', status: 'valid' },
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
      adviser VARCHAR(100) DEFAULT 'Sarah Mwamba',
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
      adviser VARCHAR(120) NOT NULL DEFAULT 'Sarah Mwamba',
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
      assigned_agent VARCHAR(120) NOT NULL DEFAULT 'Sarah Mwamba',
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

    -- Update existing users profiles
    UPDATE users SET business_profile = 'Admin', role = 'admin', active = TRUE WHERE LOWER(email) = 'sarah.mwamba@liec-education.com';
    UPDATE users SET business_profile = 'Secretary', role = 'secretary', active = TRUE WHERE LOWER(email) = 'marc.kouassi@liec-education.com';
    UPDATE users SET business_profile = 'Finance Officer', role = 'avi', active = TRUE WHERE LOWER(email) = 'alain.kanza@liec-education.com';
    UPDATE users SET business_profile = 'Secretary', role = 'secretary', active = TRUE WHERE LOWER(email) LIKE '%aicha%';

    -- Assign Technical Roles
    INSERT INTO user_roles (user_id, role_id, assigned_by)
    SELECT u.id, 'admin', 'System Initializer' FROM users u WHERE LOWER(u.email) = 'sarah.mwamba@liec-education.com'
    ON CONFLICT (user_id, role_id) DO NOTHING;

    INSERT INTO user_roles (user_id, role_id, assigned_by)
    SELECT u.id, 'lh_security_admin', 'System Initializer' FROM users u WHERE LOWER(u.email) = 'sarah.mwamba@liec-education.com'
    ON CONFLICT (user_id, role_id) DO NOTHING;

    INSERT INTO user_roles (user_id, role_id, assigned_by)
    SELECT u.id, 'lh_internal', 'Sarah Mwamba (Admin)' FROM users u WHERE LOWER(u.email) = 'marc.kouassi@liec-education.com'
    ON CONFLICT (user_id, role_id) DO NOTHING;

    INSERT INTO user_roles (user_id, role_id, assigned_by)
    SELECT u.id, 'ITIL', 'Sarah Mwamba (Admin)' FROM users u WHERE LOWER(u.email) = 'marc.kouassi@liec-education.com'
    ON CONFLICT (user_id, role_id) DO NOTHING;

    INSERT INTO user_roles (user_id, role_id, assigned_by)
    SELECT u.id, 'lh_finance', 'Sarah Mwamba (Admin)' FROM users u WHERE LOWER(u.email) = 'alain.kanza@liec-education.com'
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

    INSERT INTO parent_student_links (parent_name, parent_phone, student_name, student_email, student_program, source) VALUES
      ('Jean-Pierre Kabangele', '+243 81 900 12 34', 'Dieudonné Kabangele', 'd.kabangele@unikin.ac.cd', 'MyDigitalSchool Lyon — Web Dev & UX/UI Design', 'seed'),
      ('Jean-Pierre Kabangele', '+243 81 900 12 34', 'Sarah Kabangele', 'sarah.k@unikin.ac.cd', 'ISCOM Lyon — Communication, Publicité & Marketing', 'seed'),
      ('Pauline Makosso', '+242 06 611 22 33', 'Brice Makosso', 'b.makosso@escom.cg', 'ISCOM Lyon — Communication, Advertising & Marketing', 'seed'),
      ('Théophile Bopili', '+242 05 302 19 00', 'Aïcha Bopili', 'aicha.bopili@brazza-univ.cg', 'IHECF Lyon — Accounting, Audit & Finance', 'seed'),
      ('Jean-Claude Mutombo', '+243 82 491 0023', 'Gloire Mutombo', 'gloire.mutombo@gmail.com', 'MyDigitalSchool Lyon — Dév. Web & UX/UI', 'seed')
    ON CONFLICT (parent_name, student_name) DO NOTHING;
  `);

  // Ensure Admin profile and technical roles are ALWAYS preserved
  await client.exec(`
    UPDATE users SET business_profile = 'Admin', role = 'admin', active = TRUE
    WHERE LOWER(email) LIKE '%sarah%' OR LOWER(email) LIKE '%admin%';

    INSERT INTO user_roles (user_id, role_id, assigned_by)
    SELECT u.id, 'admin', 'System Initializer' FROM users u
    WHERE (LOWER(u.email) LIKE '%sarah%' OR LOWER(u.email) LIKE '%admin%')
    ON CONFLICT (user_id, role_id) DO NOTHING;

    INSERT INTO user_roles (user_id, role_id, assigned_by)
    SELECT u.id, 'lh_security_admin', 'System Initializer' FROM users u
    WHERE (LOWER(u.email) LIKE '%sarah%' OR LOWER(u.email) LIKE '%admin%')
    ON CONFLICT (user_id, role_id) DO NOTHING;
  `);

  // Ensure initial Accommodation sample exists
  try {
    const checkAcc = await client.query<{ count: string | number }>(
      `SELECT COUNT(*) as count FROM accommodation_requests`
    );
    if (Number(checkAcc.rows[0]?.count ?? 0) === 0) {
      await client.exec(`
        INSERT INTO accommodation_requests (
          ref, student_ref, student_name, student_email, student_phone, student_nationality, student_location,
          parent_name, parent_phone, parent_email, parent_relation, admission_status, procedure_status,
          preferred_location, accommodation_type, arrival_date, departure_date, budget, special_requirements,
          supporting_docs, status, assigned_agent, notes, history_json
        ) VALUES (
          '#ACC-2025-001',
          '#CAN-2025-042',
          'Dieudonné KABANGELE',
          'd.kabangele@unikin.ac.cd',
          '+243 81 552 1904',
          'Congolaise (RDC)',
          'RDC (Kinshasa)',
          'Jean-Pierre Kabangele',
          '+243 81 900 12 34',
          'jp.kabangele@gmail.com',
          'Father',
          'Admitted — MyDigitalSchool Lyon',
          'Milestone 2 — Academic Records',
          'Lyon 7e (Jean Macé / Guillotière)',
          'Studio Meublé (Résidence Étudiante)',
          '2025-09-01',
          '2026-06-30',
          '550 € / month',
          'High-speed WiFi for web development coursework, near Metro B or Tram T2, quiet environment.',
          'ID Passport DRC, Admission Attestation MDS Lyon, Garant Income Proof',
          'Draft',
          'Sarah Mwamba',
          'Initial draft prepared following Milestone 1 validation. Ready for partner dispatch upon final review.',
          '[{"timestamp":"2025-10-20 14:30:00","author":"Sarah Mwamba (Admin)","action":"CREATED","details":"Accommodation request initiated from Student Record #CAN-2025-042."}]'
        ) ON CONFLICT (ref) DO NOTHING;
      `);
    }
  } catch (err) {
    console.warn('Notice: accommodation seed check:', err);
  }

  // Check if V4 English seed is already applied
  const checkV4 = await client.query<{ count: string | number }>(
    `SELECT COUNT(*) as count FROM priority_tasks WHERE title LIKE '%unassigned%'`
  );
  const isV4Seeded = Number(checkV4.rows[0]?.count ?? 0) > 0;

  if (isV4Seeded) {
    return;
  }

  // Clear previous demo rows to populate 100% English seed data
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
    DELETE FROM users;
  `);

  // Seed Users
  await client.query(
    `INSERT INTO users (name, email, business_profile, role, title, initials) VALUES
      ('Sarah Mwamba', 'sarah.mwamba@liec-education.com', 'Admin', 'admin', 'Senior Lyon Advisor & Platform Admin', 'SM'),
      ('Marc Kouassi', 'marc.kouassi@liec-education.com', 'Secretary', 'secretary', 'DRC & Congo Admissions Secretary', 'MK'),
      ('Alain Kanza', 'alain.kanza@liec-education.com', 'Finance Officer', 'avi', 'Head of Lyon Visa & AVI Desk', 'AK'),
      ('Aïcha Diallo', 'aicha.diallo@liec-education.com', 'Secretary', 'secretary', 'Lyon Partner Schools Advisor', 'AD')`
  );

  // Re-assign Technical Roles
  await client.exec(`
    INSERT INTO user_roles (user_id, role_id, assigned_by)
    SELECT u.id, 'admin', 'System Initializer' FROM users u WHERE LOWER(u.email) LIKE '%sarah%' OR LOWER(u.email) LIKE '%admin%'
    ON CONFLICT (user_id, role_id) DO NOTHING;

    INSERT INTO user_roles (user_id, role_id, assigned_by)
    SELECT u.id, 'lh_security_admin', 'System Initializer' FROM users u WHERE LOWER(u.email) LIKE '%sarah%' OR LOWER(u.email) LIKE '%admin%'
    ON CONFLICT (user_id, role_id) DO NOTHING;

    INSERT INTO user_roles (user_id, role_id, assigned_by)
    SELECT u.id, 'lh_internal', 'Sarah Mwamba (Admin)' FROM users u WHERE LOWER(u.email) LIKE '%marc%' OR LOWER(u.email) LIKE '%secretary%'
    ON CONFLICT (user_id, role_id) DO NOTHING;

    INSERT INTO user_roles (user_id, role_id, assigned_by)
    SELECT u.id, 'ITIL', 'Sarah Mwamba (Admin)' FROM users u WHERE LOWER(u.email) LIKE '%marc%' OR LOWER(u.email) LIKE '%secretary%'
    ON CONFLICT (user_id, role_id) DO NOTHING;

    INSERT INTO user_roles (user_id, role_id, assigned_by)
    SELECT u.id, 'lh_finance', 'Sarah Mwamba (Admin)' FROM users u WHERE LOWER(u.email) LIKE '%alain%' OR LOWER(u.email) LIKE '%avi%'
    ON CONFLICT (user_id, role_id) DO NOTHING;
  `);

  // Seed Demandes: Exclusively DRC & Congo-Brazzaville, targeting the 6 Lyon partner schools
  const demandesSeed = [
    {
      ref: '#DEM-2025-089',
      initials: 'GM',
      full_name: 'Gloire Mutombo',
      email: 'gloire.mutombo@gmail.com',
      phone: '+243 82 491 0023',
      whatsapp_verified: true,
      country_code: 'CD',
      flag: '🇨🇩',
      country_name: 'DRC',
      city: 'Kinshasa, DRC',
      nationality: 'Congolese (DRC)',
      program: 'MyDigitalSchool Lyon — Web Dev & UX/UI',
      service_pole: 'PREPA / MyDigitalSchool Lyon',
      target_cities: 'Lyon (MyDigitalSchool, Ipac Bachelor Factory)',
      current_level: 'Bachelor Year 3 Computer Science - UNIKIN Kinshasa (Honours)',
      budget_range: '€8,500 – €10,000 / year',
      status: 'New',
      adviser: 'Sarah Mwamba',
      submitted_at: 'Submitted on Oct 25, 2025 at 4:42 PM',
      message:
        'Project to pursue Web development, digital creation, and UX/UI design at MyDigitalSchool Lyon.',
      is_dashboard_recent: false,
    },
    {
      ref: '#DEM-2025-088',
      initials: 'AM',
      full_name: 'Arsène Moukoko',
      email: 'arsene.moukoko@cg-tech.cg',
      phone: '+242 06 582 19 04',
      whatsapp_verified: true,
      country_code: 'CG',
      flag: '🇨🇬',
      country_name: 'Congo-Brazzaville',
      city: 'Brazzaville, Congo',
      nationality: 'Congolese (Brazzaville)',
      program: 'ISCOM Lyon — Communication & Marketing',
      service_pole: 'ISCOM Lyon Application',
      target_cities: 'Lyon (ISCOM, École Internationale Tunon)',
      current_level: 'Bachelor Year 2 Communication - Brazzaville',
      budget_range: '€9,000 – €11,500 / year',
      status: 'To Contact',
      adviser: 'Marc Kouassi',
      submitted_at: 'Submitted on Oct 25, 2025 at 2:15 PM',
      message:
        'Application for Communication, advertising, marketing and events management at ISCOM Lyon.',
      is_dashboard_recent: false,
    },
    {
      ref: '#DEM-2025-087',
      initials: 'CI',
      full_name: 'Christian Ilunga',
      email: 'c.ilunga@katanga-finance.cd',
      phone: '+243 99 710 44 12',
      whatsapp_verified: true,
      country_code: 'CD',
      flag: '🇨🇩',
      country_name: 'DRC',
      city: 'Lubumbashi, DRC',
      nationality: 'Congolese (DRC)',
      program: 'MBway Lyon — MBA Management & Finance',
      service_pole: 'Family Advisory / MBway Lyon',
      target_cities: 'Lyon (MBway, IHECF)',
      current_level: 'Degree in Economics - UNILU Lubumbashi',
      budget_range: '€10,000 – €13,000 / year',
      status: 'In Progress',
      adviser: 'Sarah Mwamba',
      submitted_at: 'Submitted on Oct 24, 2025 at 6:30 PM',
      message:
        'Targeting admission to MBway Lyon (Management, entrepreneurship, HR, finance & international business).',
      is_dashboard_recent: false,
    },
    {
      ref: '#DEM-2025-086',
      initials: 'CN',
      full_name: 'Clarisse Ngoma',
      email: 'clarisse.ngoma@yahoo.fr',
      phone: '+242 05 789 31 04',
      whatsapp_verified: true,
      country_code: 'CG',
      flag: '🇨🇬',
      country_name: 'Congo-Brazzaville',
      city: 'Pointe-Noire, Congo',
      nationality: 'Congolese (Brazzaville)',
      program: 'IHECF Lyon — Accounting & Audit',
      service_pole: 'IHECF Lyon Guidance',
      target_cities: 'Lyon (IHECF, Ipac Bachelor Factory)',
      current_level: 'BTS Accounting & Corporate Finance - Pointe-Noire',
      budget_range: '€8,000 – €9,500 / year',
      status: 'Qualified',
      adviser: 'Aïcha Diallo',
      submitted_at: 'Submitted on Oct 24, 2025 at 11:05 AM',
      message:
        'Targeting IHECF Lyon for accounting, corporate auditing, finance, and management control.',
      is_dashboard_recent: false,
    },
    {
      ref: '#DEM-2025-085',
      initials: 'BM',
      full_name: 'Brice Makosso',
      email: 'makosso.b@congo-post.cg',
      phone: '+242 06 614 88 20',
      whatsapp_verified: true,
      country_code: 'CG',
      flag: '🇨🇬',
      country_name: 'Congo-Brazzaville',
      city: 'Brazzaville, Congo',
      nationality: 'Congolese (Brazzaville)',
      program: 'Ipac Bachelor Factory Lyon — Commerce & Logistics',
      service_pole: 'PREPA / Ipac Lyon',
      target_cities: 'Lyon (Ipac Bachelor Factory, MBway)',
      current_level: 'Bachelor Year 2 Management & Logistics - Brazzaville',
      budget_range: '€8,500 – €10,000 / year',
      status: 'Awaiting Info',
      adviser: 'Sarah Mwamba',
      submitted_at: 'Submitted on Oct 23, 2025 at 3:40 PM',
      message:
        'Application to Ipac Bachelor Factory Lyon (Commerce, management, corporate finance & logistics).',
      is_dashboard_recent: false,
    },
    {
      ref: '#DEM-2025-084',
      initials: 'LM',
      full_name: 'Ornella Lunda',
      email: 'ornella.lunda@kin-tourisme.cd',
      phone: '+243 81 913 27 70',
      whatsapp_verified: true,
      country_code: 'CD',
      flag: '🇨🇩',
      country_name: 'DRC',
      city: 'Kinshasa, DRC',
      nationality: 'Congolese (DRC)',
      program: 'École Internationale Tunon Lyon — Tourism & Hospitality',
      service_pole: 'Tunon Lyon Application',
      target_cities: 'Lyon (École Internationale Tunon, ISCOM)',
      current_level: 'State Diploma & Bac+2 Hospitality - Kinshasa',
      budget_range: '€8,500 – €10,000 / year',
      status: 'Converted',
      adviser: 'Aïcha Diallo',
      submitted_at: 'Submitted on Oct 22, 2025 at 9:20 AM',
      message:
        'Qualified file for École Internationale Tunon Lyon (Tourism, hospitality, PR and events).',
      is_dashboard_recent: false,
    },
    {
      ref: '#DEM-2025-083',
      initials: 'PK',
      full_name: 'Patrick Kasongo',
      email: 'p.kasongo@goma-digital.cd',
      phone: '+243 97 102 55 19',
      whatsapp_verified: true,
      country_code: 'CD',
      flag: '🇨🇩',
      country_name: 'DRC',
      city: 'Goma, DRC',
      nationality: 'Congolese (DRC)',
      program: 'MyDigitalSchool Lyon — Webmarketing & UX/UI',
      service_pole: 'PREPA / MyDigitalSchool Lyon',
      target_cities: 'Lyon (MyDigitalSchool, ISCOM)',
      current_level: 'Degree in Multimedia & Computing - Goma',
      budget_range: '€9,000 – €11,000 / year',
      status: 'New',
      adviser: 'Sarah Mwamba',
      submitted_at: 'Submitted on Oct 22, 2025 at 8:10 AM',
      message: 'Enrollment desired for MyDigitalSchool Lyon with LIEC comprehensive coaching.',
      is_dashboard_recent: false,
    },
    // Top 4 recent requests (Dashboard view)
    {
      ref: '#DEM-2025-089-M',
      initials: 'MK',
      full_name: 'Marc Kabila',
      email: 'm.kabila@gmail.com',
      phone: '+243 81 300 45 11',
      whatsapp_verified: true,
      country_code: 'CD',
      flag: '🇨🇩',
      country_name: 'DRC',
      city: 'Kinshasa, DRC',
      nationality: 'Congolese (DRC)',
      program: 'IHECF Lyon — Accounting & Corporate Finance',
      service_pole: 'IHECF Lyon',
      target_cities: 'Lyon (IHECF, MBway)',
      current_level: 'Degree in Banking & Finance - UPC Kinshasa',
      budget_range: '€9,500 – €11,000 / year',
      status: 'New',
      adviser: 'Sarah Mwamba',
      submitted_at: 'Submitted 2h ago',
      message: 'Application for IHECF Lyon (Accounting, auditing, finance and control).',
      is_dashboard_recent: true,
    },
    {
      ref: '#DEM-2025-088-A',
      initials: 'AB',
      full_name: 'Aïcha Bopili',
      email: 'bopili.a@orange.cg',
      phone: '+242 05 441 92 10',
      whatsapp_verified: true,
      country_code: 'CG',
      flag: '🇨🇬',
      country_name: 'Congo-Brazzaville',
      city: 'Brazzaville, Congo',
      nationality: 'Congolese (Brazzaville)',
      program: 'ISCOM Lyon — Communication, Advertising & Marketing',
      service_pole: 'LIEC-France PREPA / ISCOM Lyon',
      target_cities: 'Lyon (ISCOM, Ipac Bachelor Factory)',
      current_level: 'High School Diploma / Bac+1 Communication - Brazzaville',
      budget_range: '€8,500 – €10,000 / year',
      status: 'In Progress',
      adviser: 'Sarah Mwamba',
      submitted_at: 'Submitted 3h ago',
      message: 'Registration in LIEC cohort heading to ISCOM Lyon.',
      is_dashboard_recent: true,
    },
    {
      ref: '#DEM-2025-087-D',
      initials: 'DM',
      full_name: 'David Mpassi',
      email: 'd.mpassi@yahoo.fr',
      phone: '+242 06 428 81 90',
      whatsapp_verified: true,
      country_code: 'CG',
      flag: '🇨🇬',
      country_name: 'Congo-Brazzaville',
      city: 'Pointe-Noire, Congo',
      nationality: 'Congolese (Brazzaville)',
      program: 'MyDigitalSchool Lyon — Web Dev & Digital Creation',
      service_pole: 'MyDigitalSchool Lyon',
      target_cities: 'Lyon (MyDigitalSchool)',
      current_level: 'L2 Computer Science - Brazzaville',
      budget_range: '€8,000 – €9,500 / year',
      status: 'To Contact',
      adviser: 'Marc Kouassi',
      submitted_at: 'Submitted 5h ago',
      message: 'Admission request for MyDigitalSchool Lyon.',
      is_dashboard_recent: true,
    },
    {
      ref: '#DEM-2025-086-E',
      initials: 'EM',
      full_name: 'Esther Mutombo',
      email: 'esther.mutombo@outlook.com',
      phone: '+243 82 910 33 41',
      whatsapp_verified: true,
      country_code: 'CD',
      flag: '🇨🇩',
      country_name: 'DRC',
      city: 'Kinshasa, DRC',
      nationality: 'Congolese (DRC)',
      program: 'École Internationale Tunon Lyon — Tourism & Hospitality',
      service_pole: 'École Internationale Tunon Lyon',
      target_cities: 'Lyon (École Internationale Tunon)',
      current_level: 'State Diploma - Kinshasa',
      budget_range: '€8,500 – €9,500 / year',
      status: 'Qualified',
      adviser: 'Sarah Mwamba',
      submitted_at: 'Submitted yesterday',
      message: 'Orientation guidance towards École Internationale Tunon in Lyon.',
      is_dashboard_recent: true,
    },
  ];

  for (const d of demandesSeed) {
    await client.query(
      `INSERT INTO demandes (
        ref, initials, full_name, email, phone, whatsapp_verified, country_code, flag,
        country_name, city, nationality, program, service_pole, target_cities, current_level,
        budget_range, status, adviser, submitted_at, message, is_dashboard_recent
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)`,
      [
        d.ref,
        d.initials,
        d.full_name,
        d.email,
        d.phone,
        d.whatsapp_verified,
        d.country_code,
        d.flag,
        d.country_name,
        d.city,
        d.nationality,
        d.program,
        d.service_pole,
        d.target_cities,
        d.current_level,
        d.budget_range,
        d.status,
        d.adviser,
        d.submitted_at,
        d.message,
        d.is_dashboard_recent,
      ]
    );
  }

  // Seed Demande Notes
  await client.query(
    `INSERT INTO demande_notes (demande_ref, author, timestamp_label, content) VALUES
      ('#DEM-2025-089', 'Sarah Mwamba (Advisor)', 'Today, 09:15', 'Initial call scheduled for 10/26 at 2:00 PM (Kinshasa). Highly motivated profile for MyDigitalSchool Lyon, 3-year bachelor transcripts ready with honours.'),
      ('#DEM-2025-089', 'LIEC Lyon System Portal', '25 Oct, 16:42', 'WhatsApp DRC contact details and Lyon campus eligibility verified automatically.')`
  );

  // Seed Prospects: Exclusively DRC & Congo-Brazzaville + 6 Lyon Partner Schools
  const prospectsSeed = [
    {
      full_name: 'Grace Mukendi',
      stage: 'nouveau',
      badge_text: '● - 4h',
      badge_tone: 'urgent',
      flag: '🇨🇩',
      country_city: 'DRC (Kinshasa)',
      program_tag: 'ISCOM Lyon — Communication',
      program_tag_tone: 'mint',
      highlight_box: null,
      meta_left: 'Yesterday at 6:15 PM',
      meta_right: '1st message',
      meta_right_tone: 'teal',
      adviser_initials: 'SM',
      adviser_name: 'S. Mwamba',
      adviser_color: 'navy',
      estimated_value: 1800,
      is_urgent: true,
      is_prepa: true,
    },
    {
      full_name: 'Famille Sassou-Ntsiba',
      stage: 'nouveau',
      badge_text: 'Today 10:10',
      badge_tone: 'neutral',
      flag: '🇨🇬',
      country_city: 'Congo-Brazzaville (Brazzaville)',
      program_tag: 'Ipac Bachelor Factory Lyon',
      program_tag_tone: 'blue',
      highlight_box: null,
      meta_left: 'Web Form',
      meta_right: 'Discovery call',
      meta_right_tone: 'ink',
      adviser_initials: 'MK',
      adviser_name: 'M. Kouassi',
      adviser_color: 'teal',
      estimated_value: 1650,
      is_urgent: false,
      is_prepa: false,
    },
    {
      full_name: 'Benoît Okombi',
      stage: 'premier_contact',
      badge_text: '⏱ 15:30',
      badge_tone: 'amber',
      flag: '🇨🇬',
      country_city: 'Congo-Brazzaville (Pointe-Noire)',
      program_tag: 'MyDigitalSchool Lyon — UX/UI',
      program_tag_tone: 'mint',
      highlight_box: null,
      meta_left: 'WhatsApp exchanged',
      meta_right: 'Scheduled video',
      meta_right_tone: 'teal',
      adviser_initials: 'SM',
      adviser_name: 'S. Mwamba',
      adviser_color: 'navy',
      estimated_value: 1950,
      is_urgent: true,
      is_prepa: true,
    },
    {
      full_name: 'Kadiatou Tshisekedi',
      stage: 'premier_contact',
      badge_text: 'Yesterday 16:30',
      badge_tone: 'neutral',
      flag: '🇨🇩',
      country_city: 'DRC (Lubumbashi)',
      program_tag: 'École Internationale Tunon Lyon',
      program_tag_tone: 'blue',
      highlight_box: null,
      meta_left: 'Call completed',
      meta_right: 'Awaiting grades',
      meta_right_tone: 'navy',
      adviser_initials: 'AD',
      adviser_name: 'A. Diallo',
      adviser_color: 'amber',
      estimated_value: 1500,
      is_urgent: false,
      is_prepa: false,
    },
    {
      full_name: 'Christian Kalala',
      stage: 'diagnostic',
      badge_text: 'Grades received',
      badge_tone: 'neutral',
      flag: '🇨🇩',
      country_city: 'DRC (Kinshasa)',
      program_tag: 'IHECF Lyon — Finance & Audit',
      program_tag_tone: 'mint',
      highlight_box: 'State Diploma (74%) • Budget verified',
      meta_left: 'Eligibility scorecard',
      meta_right: 'Parent report',
      meta_right_tone: 'ink',
      adviser_initials: 'SM',
      adviser_name: 'S. Mwamba',
      adviser_color: 'navy',
      estimated_value: 2100,
      is_urgent: false,
      is_prepa: true,
    },
    {
      full_name: 'Fatou Malonga',
      stage: 'diagnostic',
      badge_text: '● TCF Pending',
      badge_tone: 'urgent',
      flag: '🇨🇬',
      country_city: 'Congo-Brazzaville (Brazzaville)',
      program_tag: 'MBway Lyon — Int. Business',
      program_tag_tone: 'blue',
      highlight_box: null,
      meta_left: 'Deadline: Nov 12',
      meta_right: 'TCF reminder',
      meta_right_tone: 'navy',
      adviser_initials: 'MK',
      adviser_name: 'M. Kouassi',
      adviser_color: 'teal',
      estimated_value: 1750,
      is_urgent: true,
      is_prepa: false,
    },
    {
      full_name: 'David Lukoki',
      stage: 'qualifie',
      badge_text: 'Quote sent',
      badge_tone: 'gold',
      flag: '🇨🇩',
      country_city: 'DRC (Goma)',
      program_tag: 'MBway Lyon + PREPA Visa Pack',
      program_tag_tone: 'mint',
      highlight_box: null,
      meta_left: '€1,800 incl. tax',
      meta_right: 'Signature pending',
      meta_right_tone: 'teal',
      adviser_initials: 'SM',
      adviser_name: 'S. Mwamba',
      adviser_color: 'navy',
      estimated_value: 1800,
      is_urgent: false,
      is_prepa: true,
    },
    {
      full_name: 'Christelle Itoua',
      stage: 'qualifie',
      badge_text: 'Follow-up D+3',
      badge_tone: 'neutral',
      flag: '🇨🇬',
      country_city: 'Congo-Brazzaville (Pointe-Noire)',
      program_tag: 'ISCOM Lyon — Marketing & Comm',
      program_tag_tone: 'blue',
      highlight_box: null,
      meta_left: '€1,450 incl. tax',
      meta_right: 'Deposit processing',
      meta_right_tone: 'navy',
      adviser_initials: 'AD',
      adviser_name: 'A. Diallo',
      adviser_color: 'amber',
      estimated_value: 1450,
      is_urgent: false,
      is_prepa: false,
    },
  ];

  for (const p of prospectsSeed) {
    await client.query(
      `INSERT INTO prospects (
        full_name, stage, badge_text, badge_tone, flag, country_city, program_tag,
        program_tag_tone, highlight_box, meta_left, meta_right, meta_right_tone,
        adviser_initials, adviser_name, adviser_color, estimated_value, is_urgent, is_prepa
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
      [
        p.full_name,
        p.stage,
        p.badge_text,
        p.badge_tone,
        p.flag,
        p.country_city,
        p.program_tag,
        p.program_tag_tone,
        p.highlight_box,
        p.meta_left,
        p.meta_right,
        p.meta_right_tone,
        p.adviser_initials,
        p.adviser_name,
        p.adviser_color,
        p.estimated_value,
        p.is_urgent,
        p.is_prepa,
      ]
    );
  }

  // Seed Candidats
  for (const c of SEED_CANDIDATS) {
    await client.query(
      `INSERT INTO candidats (
        ref, initials, full_name, avatar_url, program, cities, adviser,
        stage_badge, stage_badge_tone, progress_pct, status_left, status_right,
        email, phone, country, nationality, current_diploma, tcf_score,
        garant_info, interview_date, jalons_json, voeux_json, notes_json, pieces_json
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)`,
      [
        c.ref,
        c.initials,
        c.full_name,
        c.avatar_url,
        c.program,
        c.cities,
        c.adviser,
        c.stage_badge,
        c.stage_badge_tone,
        c.progress_pct,
        c.status_left,
        c.status_right,
        c.email,
        c.phone,
        c.country,
        c.nationality,
        c.current_diploma,
        c.tcf_score,
        c.garant_info,
        c.interview_date,
        JSON.stringify(c.jalons),
        JSON.stringify(c.voeux),
        JSON.stringify(c.notes),
        JSON.stringify(c.pieces),
      ]
    );
  }

  // Seed Priority Tasks
  await client.query(
    `INSERT INTO priority_tasks (title, description, priority, action_label, target_module, completed, role_queue) VALUES
      ('3 unassigned DRC & Congo applications', 'Received via public web portal for Lyon partner schools 2h ago', 'Urgent', 'Assign to Advisors', 'demandes', FALSE, 'secretary'),
      ('Follow-up with M. Kabila (Kinshasa)', 'IHECF Lyon file — Corporate Finance (Interview at 2:00 PM)', 'Urgent', 'Open Contact File', 'demandes', FALSE, 'secretary'),
      ('Verify TCF certificate for Ms. Bopili (Brazzaville)', 'Score B2 required for IHECF & ISCOM Lyon admission', 'Moderate', 'Approve Documents', 'candidats', FALSE, 'adviser'),
      ('Approve PREPA Lyon Cohort Roster', 'Finalize last 6 student files from Kinshasa & Brazzaville', 'Moderate', 'Review Student Roster', 'prepa', FALSE, 'admin')`
  );

  // Seed AVI Requests (RDC & Congo-Brazzaville -> Lyon 6 Schools, Parent Borrower, OP/PO Passport ID, €150 LIEC Interest Recovery)
  await client.query(
    `INSERT INTO avi_requests (
      ref, parent_name, country, town, nationality, physical_address, occupation, phone, email,
      other_guarantor, guarantor_details, expected_start, student_name, student_program, student_id_doc,
      offer_key, offer_name, interest_rate, duration_months, principal_eur, principal_usd, principal_xaf,
      usd_eur_rate, usd_xaf_rate, total_interest_eur, liec_fee_usd, files_count, supporting_docs, status
    ) VALUES
      ('AVI-2025-001', 'Jean-Pierre Kabangele', 'DRC', 'Kinshasa', 'Congolese (DRC)', '42 Av. de la Gombe, Kinshasa', 'Senior Bank Executive (Salaried)', '+243 81 900 12 34', 'jp.kabangele@rawbank.cd', TRUE, 'Uncle in Lyon (Villeurbanne) — Permanent CDI Contract, N-1 Income > 4,000,000 XAF', '2025-09', 'Dieudonné Kabangele', 'MyDigitalSchool Lyon — Web Dev & UX/UI Design', 'OP482910384', 'classique', 'Classic', 12.00, 8, 2800.00, 3043.48, 1836680.00, 0.9200, 603.48, 336.00, 150.00, 4, 'Last 3 Payslips, Parent Passport, Guarantor ID France, Pre-enrollment Lyon', 'Approved YIMMILINE'),
      ('AVI-2025-002', 'Pauline Makosso', 'Congo-Brazzaville', 'Pointe-Noire', 'Congolese (Brazzaville)', '18 Rue Lumumba, Pointe-Noire', 'Logistics Company Director (Entrepreneur)', '+242 06 611 22 33', 'p.makosso@pnoire-logistique.cg', TRUE, 'Sister in France (Stains / Lyon) — Caution checks + Sworn statement provided', '2025-09', 'Brice Makosso', 'ISCOM Lyon — Communication, Advertising & Marketing', 'PO918273645', 'partiel1', 'Partial 1', 6.00, 3, 3800.00, 4130.43, 2492636.00, 0.9200, 603.48, 228.00, 150.00, 5, 'Company Balance Sheet, Bank History N-1, Last 3 Payslips, France Guarantor Checks', 'Partner Review'),
      ('AVI-2025-003', 'Théophile Bopili', 'Congo-Brazzaville', 'Brazzaville', 'Congolese (Brazzaville)', 'Quartier Bacongo, Brazzaville', 'Chartered Accountant (Salaried)', '+242 05 302 19 00', 't.bopili@brazza-fin.cg', TRUE, 'Brother in France (Lyon 3rd) — Security deposit checks & Sworn statement', '2025-09', 'Aïcha Bopili', 'IHECF Lyon — Accounting, Audit & Finance', 'OP736194825', 'partiel2', 'Partial 2', 12.00, 12, 4500.00, 4891.30, 2951806.00, 0.9200, 603.48, 540.00, 150.00, 4, 'Last 3 Payslips, Bank History N-1, Caution Checks, Sworn Statement', 'Quote Sent')`
  );

  // Seed PREPA Cohorts (Kinshasa, Brazzaville -> Lyon)
  await client.query(
    `INSERT INTO prepa_cohorts (code, name, campus, start_date, enrolled_count, capacity, lead_instructor, status) VALUES
      ('PREPA-LYON-C1', 'PREPA Digital, Tech & Communication (MyDigitalSchool & ISCOM Lyon)', 'Kinshasa, Brazzaville & Lyon', 'September 2025', 24, 30, 'Sarah Mwamba & Lyon Tech Team', 'Enrollments Open'),
      ('PREPA-LYON-C2', 'PREPA Finance, Accounting & Management (IHECF, Ipac & MBway Lyon)', 'Kinshasa & Lyon Part-Dieu', 'October 2025', 18, 25, 'Marc Kouassi & Lyon Finance Team', 'Active Session'),
      ('PREPA-LYON-C3', 'PREPA Tourism, Hospitality & Events (École Tunon & ISCOM Lyon)', 'Brazzaville & Lyon Foch', 'September 2025', 14, 20, 'Aïcha Diallo & Lyon Hospitality Team', 'Closing D-7')`
  );

  // Seed Invoices
  await client.query(
    `INSERT INTO invoices (ref, student_name, service_label, amount_eur, paid_eur, recipient, status, issued_date) VALUES
      ('INV-2025-104', 'Dieudonné Kabangele (DRC)', 'MyDigitalSchool Lyon Support + Campus France', 1450.00, 1450.00, 'LIEC Education Lyon', 'Paid', '15 Oct 2025'),
      ('INV-2025-105', 'David Lukoki (DRC)', 'Visa Premium Pack + MBway Lyon + PREPA', 1800.00, 900.00, 'LIEC Education Lyon', 'Deposit Received (50%)', '20 Oct 2025'),
      ('INV-2025-106', 'Brice Makosso (Congo-Brazzaville)', 'YIMMILINE AVI Processing Fee ($165 USD) — ISCOM Lyon', 151.80, 151.80, 'LIEC / YIMMILINE', 'Paid', '22 Oct 2025'),
      ('INV-2025-107', 'Christelle Itoua (Congo-Brazzaville)', 'ISCOM Lyon Support — Marketing & Comm', 1450.00, 600.00, 'LIEC Education Lyon', 'Partially Paid', '24 Oct 2025')`
  );

  // Seed Audit Logs
  await client.query(
    `INSERT INTO audit_logs (actor, action, entity_ref, outcome) VALUES
      ('Sarah Mwamba (Admin)', 'Milestone 1 approval for MyDigitalSchool Lyon & TCF B2 (540 pts)', '#CAN-2025-042', 'Success'),
      ('Public Web Portal', 'New application received from Kinshasa DRC (MyDigitalSchool Lyon)', '#DEM-2025-089', 'Success'),
      ('Alain Kanza (AVI Desk)', 'Simulation USD/EUR rate (0.92) & Classic offer 12%', 'AVI-2025-001', 'Success'),
      ('Marc Kouassi (Secretary)', 'Initial qualification of Brazzaville file (ISCOM Lyon)', '#DEM-2025-088', 'Success')`
  );
}

async function createDBClient(): Promise<DBClient> {
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl && process.env.FORCE_PGLITE !== 'true') {
    try {
      const isLocalhost = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1');
      const pool = new Pool({
        connectionString: dbUrl,
        connectionTimeoutMillis: 8000,
        ssl: isLocalhost ? false : { rejectUnauthorized: false },
      });
      await pool.query('SELECT 1');
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
      console.log('[DB] Successfully connected to external PostgreSQL server via DATABASE_URL.');
      return pgClient;
    } catch (err: any) {
      console.warn('[DB] Could not connect to external PostgreSQL via DATABASE_URL:', err?.message || err);
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
