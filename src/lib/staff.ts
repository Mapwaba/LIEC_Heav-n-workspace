export interface StaffAccount {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'secretary' | 'avi';
  title: string;
  initials: string;
  password: string;
  acceptedEmails: string[];
}

export const STAFF_ACCOUNTS: StaffAccount[] = [
  {
    id: 1,
    name: 'Sarah Mwamba',
    email: 'sarah.mwamba@liec-education.com',
    role: 'admin',
    title: 'Senior Lyon Advisor & Platform Admin',
    initials: 'SM',
    password: 'Admin@LIEC2026!',
    acceptedEmails: [
      'sarah.mwamba@liec-education.com',
      'admin@liec-education.com',
      'admin@liec.com',
      'admin@liecconsulting.com',
      'sarah.mwamba@liecconsulting.com',
      'sarah@liecconsulting.com',
    ],
  },
  {
    id: 2,
    name: 'Marc Kouassi',
    email: 'marc.kouassi@liec-education.com',
    role: 'secretary',
    title: 'DRC Admissions Secretary',
    initials: 'MK',
    password: 'Secretary@LIEC2026!',
    acceptedEmails: [
      'marc.kouassi@liec-education.com',
      'secretary@liec-education.com',
      'secretaire@liec-education.com',
      'secretary@liecconsulting.com',
      'marc.kouassi@liecconsulting.com',
    ],
  },
  {
    id: 3,
    name: 'Alain Kanza',
    email: 'alain.kanza@liec-education.com',
    role: 'avi',
    title: 'Officier Financement AVI',
    initials: 'AK',
    password: 'AviOfficer@LIEC2026!',
    acceptedEmails: [
      'alain.kanza@liec-education.com',
      'avi@liec-education.com',
      'officer.avi@liec-education.com',
      'finance@liec-education.com',
      'avi@liecconsulting.com',
      'alain.kanza@liecconsulting.com',
    ],
  },
];
