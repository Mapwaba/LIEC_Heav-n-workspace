export interface StaffAccount {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'secretary' | 'avi';
  title: string;
  initials: string;
  acceptedEmails: string[];
}

/**
 * Non-credential staff directory metadata.
 * Authentication must strictly use PostgreSQL database verification.
 * No passwords or credentials are stored or evaluated here.
 */
export const STAFF_ACCOUNTS: StaffAccount[] = [
  {
    id: 1,
    name: 'Barthelemy MAPWABA NTORO',
    email: 'bmapwabantoro@liecconsulting.com',
    role: 'admin',
    title: 'Platform Administrator & Managing Director',
    initials: 'BM',
    acceptedEmails: [
      'bmapwabantoro@liecconsulting.com',
      'admin@liecconsulting.com',
      'admin@liec-education.com',
      'admin@liec.com',
    ],
  },
];
