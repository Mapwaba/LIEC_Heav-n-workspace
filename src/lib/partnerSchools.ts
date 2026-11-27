export interface PartnerSchoolInfo {
  num: number;
  id: string;
  name: string;
  descEn: string;
  descFr: string;
  badge: string;
}

export interface EsmesProgramOption {
  value: string;
  labelEn: string;
  labelFr: string;
  level: 'bachelor' | 'master';
  format: string;
}

export const PARTNER_SCHOOLS_LYON: PartnerSchoolInfo[] = [
  {
    num: 1,
    id: 'ISCOM',
    name: 'ISCOM',
    descEn: 'Communication, advertising, marketing and events management.',
    descFr: 'Communication, publicité, marketing et événementiel.',
    badge: 'Lyon Campus',
  },
  {
    num: 2,
    id: 'MyDigitalSchool',
    name: 'MyDigitalSchool',
    descEn: 'Web development, digital creation, webmarketing and UX/UI design.',
    descFr: 'Développement web, création numérique, webmarketing et UX/UI design.',
    badge: 'Lyon Campus',
  },
  {
    num: 3,
    id: 'Tunon',
    name: 'École Internationale Tunon',
    descEn: 'Tourism, hospitality, public relations and events management.',
    descFr: 'Tourisme, hôtellerie, relations publiques et événementiel.',
    badge: 'Lyon Campus',
  },
  {
    num: 4,
    id: 'IHECF',
    name: 'IHECF',
    descEn: 'Accounting, chartered accountancy, finance and management control.',
    descFr: 'Comptabilité, expertise comptable, finance et contrôle de gestion.',
    badge: 'Lyon Campus',
  },
  {
    num: 5,
    id: 'Ipac',
    name: 'Ipac Bachelor Factory',
    descEn: 'Business, management, finance, communication and logistics.',
    descFr: 'Commerce, gestion, finance, communication et logistique.',
    badge: 'Lyon Campus',
  },
  {
    num: 6,
    id: 'MBway',
    name: 'MBway',
    descEn: 'Management, entrepreneurship, human resources, finance and international trade.',
    descFr: 'Management, entrepreneuriat, ressources humaines, finance et commerce international.',
    badge: 'Lyon Campus',
  },
  {
    num: 7,
    id: 'ESMES',
    name: 'ESMES Business School',
    descEn: 'Management, social entrepreneurship, HR, finance, digital marketing, IT and healthcare management (work-study / alternance).',
    descFr: 'Management, entrepreneuriat social, RH, finance, marketing digital, informatique et management de la santé (alternance).',
    badge: 'Lyon Campus',
  },
];

export const ESMES_BACHELOR_PROGRAMS: EsmesProgramOption[] = [
  {
    value: 'ESMES Business School — Bachelor Management des Ressources Humaines',
    labelEn: 'ESMES — Bachelor Human Resources Management (Bac +3 • Alternance)',
    labelFr: 'ESMES — Bachelor Management des Ressources Humaines (Bac +3 • Alternance)',
    level: 'bachelor',
    format: 'Alternance',
  },
  {
    value: 'ESMES Business School — Bachelor Business International',
    labelEn: 'ESMES — Bachelor International Business (Bac +3 • Alternance)',
    labelFr: 'ESMES — Bachelor Business International (Bac +3 • Alternance)',
    level: 'bachelor',
    format: 'Alternance',
  },
  {
    value: 'ESMES Business School — Bachelor Marketing Digital et Communication',
    labelEn: 'ESMES — Bachelor Digital Marketing & Communication (Bac +3 • Alternance)',
    labelFr: 'ESMES — Bachelor Marketing Digital et Communication (Bac +3 • Alternance)',
    level: 'bachelor',
    format: 'Alternance',
  },
  {
    value: 'ESMES Business School — Bachelor Comptabilité et Finance',
    labelEn: 'ESMES — Bachelor Accounting & Finance (Bac +3 • Alternance)',
    labelFr: 'ESMES — Bachelor Comptabilité et Finance (Bac +3 • Alternance)',
    level: 'bachelor',
    format: 'Alternance',
  },
  {
    value: 'ESMES Business School — Bachelor Négociation et Relation Client',
    labelEn: 'ESMES — Bachelor Negotiation & Customer Relations (Bac +3 • Alternance)',
    labelFr: 'ESMES — Bachelor Négociation et Relation Client (Bac +3 • Alternance)',
    level: 'bachelor',
    format: 'Alternance',
  },
  {
    value: 'ESMES Business School — Bachelor Informatique',
    labelEn: 'ESMES — Bachelor Computer Science & IT (Bac +3 • Alternance)',
    labelFr: 'ESMES — Bachelor Informatique (Bac +3 • Alternance)',
    level: 'bachelor',
    format: 'Alternance',
  },
  {
    value: 'ESMES Business School — Bachelor Start-up Management',
    labelEn: 'ESMES — Bachelor Start-up Management (Bac +3 • Alternance)',
    labelFr: 'ESMES — Bachelor Start-up Management (Bac +3 • Alternance)',
    level: 'bachelor',
    format: 'Alternance',
  },
  {
    value: 'ESMES Business School — Bachelor Entrepreneuriat Social',
    labelEn: 'ESMES — Bachelor Social Entrepreneurship (Bac +3 • Alternance)',
    labelFr: 'ESMES — Bachelor Entrepreneuriat Social (Bac +3 • Alternance)',
    level: 'bachelor',
    format: 'Alternance',
  },
];

export const ESMES_MASTER_PROGRAMS: EsmesProgramOption[] = [
  {
    value: 'ESMES Business School — Master Management, Commerce et Entrepreneuriat',
    labelEn: 'ESMES — Master Management, Commerce & Entrepreneurship (Alternance)',
    labelFr: 'ESMES — Master Management, Commerce et Entrepreneuriat (Alternance)',
    level: 'master',
    format: 'Alternance',
  },
  {
    value: 'ESMES Business School — Master Management des Ressources Humaines',
    labelEn: 'ESMES — Master Human Resources Management (Alternance)',
    labelFr: 'ESMES — Master Management des Ressources Humaines (Alternance)',
    level: 'master',
    format: 'Alternance',
  },
  {
    value: 'ESMES Business School — Master Responsabilité Sociale des Entreprises',
    labelEn: 'ESMES — Master Corporate Social Responsibility (CSR • Alternance)',
    labelFr: 'ESMES — Master Responsabilité Sociale des Entreprises (RSE • Alternance)',
    level: 'master',
    format: 'Alternance',
  },
  {
    value: 'ESMES Business School — Master Finance Conseil',
    labelEn: 'ESMES — Master Financial Advisory (Finance Conseil • Alternance)',
    labelFr: 'ESMES — Master Finance Conseil (Alternance)',
    level: 'master',
    format: 'Alternance',
  },
  {
    value: 'ESMES Business School — Master Gestion de la Supply Chain',
    labelEn: 'ESMES — Master Supply Chain Management (Alternance)',
    labelFr: 'ESMES — Master Gestion de la Supply Chain (Alternance)',
    level: 'master',
    format: 'Alternance',
  },
  {
    value: 'ESMES Business School — Master Développement Fullstack',
    labelEn: 'ESMES — Master Fullstack Development (Alternance)',
    labelFr: 'ESMES — Master Développement Fullstack (Alternance)',
    level: 'master',
    format: 'Alternance',
  },
  {
    value: 'ESMES Business School — Master Management de la Santé',
    labelEn: 'ESMES — Master Healthcare Management (Alternance)',
    labelFr: 'ESMES — Master Management de la Santé (Alternance)',
    level: 'master',
    format: 'Alternance',
  },
  {
    value: 'ESMES Business School — Master Comptabilité',
    labelEn: 'ESMES — Master Accounting (Comptabilité • Alternance)',
    labelFr: 'ESMES — Master Comptabilité (Alternance)',
    level: 'master',
    format: 'Alternance',
  },
];
