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
    name: 'Barthelemy MAPWABA NTORO',
    email: 'bmapwabantoro@liecconsulting.com',
    role: 'admin',
    title: 'Platform Administrator & Managing Director',
    initials: 'BM',
    password: 'Admin@LIEC2026!',
    acceptedEmails: [
      'bmapwabantoro@liecconsulting.com',
      'admin@liecconsulting.com',
      'admin@liec-education.com',
      'admin@liec.com',
    ],
  },
];
