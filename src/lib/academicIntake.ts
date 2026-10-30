export interface AcademicIntakeOption {
  id: string;
  labelEn: string;
  labelFr: string;
  sessionGroup: '2026' | '2025' | 'all';
  isFullSession?: boolean;
}

export const ACADEMIC_INTAKE_OPTIONS: AcademicIntakeOption[] = [
  {
    id: 'all',
    labelEn: 'All Intakes',
    labelFr: 'Toutes les rentrées',
    sessionGroup: 'all',
  },
  {
    id: 'full_2026',
    labelEn: 'Full 2026 Session (Sept 2026 – Jan 2027)',
    labelFr: 'Session Complète 2026 (Sept 2026 – Janv 2027)',
    sessionGroup: '2026',
    isFullSession: true,
  },
  {
    id: 'sept_2026',
    labelEn: 'September 2026 Intake',
    labelFr: 'Rentrée Septembre 2026',
    sessionGroup: '2026',
  },
  {
    id: 'jan_2027',
    labelEn: 'January 2027 Intake',
    labelFr: 'Rentrée Janvier 2027',
    sessionGroup: '2026',
  },
  {
    id: 'full_2025',
    labelEn: 'Full 2025 Session (Sept 2025 – Jan 2026)',
    labelFr: 'Session Complète 2025 (Sept 2025 – Janv 2026)',
    sessionGroup: '2025',
    isFullSession: true,
  },
  {
    id: 'sept_2025',
    labelEn: 'September 2025 Intake',
    labelFr: 'Rentrée Septembre 2025',
    sessionGroup: '2025',
  },
  {
    id: 'jan_2025',
    labelEn: 'January 2025 Intake',
    labelFr: 'Rentrée Janvier 2025',
    sessionGroup: '2025',
  },
];

export function matchesAcademicIntake(record: any, selectedIntakeId: string): boolean {
  if (!selectedIntakeId || selectedIntakeId === 'all' || selectedIntakeId === 'All Intakes' || selectedIntakeId === 'All') {
    return true;
  }

  // Extract date/intake string indicators from the record
  const searchCorpus = [
    record.expected_start,
    record.academic_intake,
    record.academic_year,
    record.cohort,
    record.intake,
    record.program,
    record.badge_text,
    record.status_right,
    record.submitted_at,
    record.created_at ? new Date(record.created_at).toISOString() : '',
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const is2026Sept =
    (searchCorpus.includes('sept') || searchCorpus.includes('sep') || searchCorpus.includes('09')) &&
    searchCorpus.includes('2026');

  const is2027Jan =
    (searchCorpus.includes('jan') || searchCorpus.includes('01')) &&
    searchCorpus.includes('2027');

  const isGeneral2026Session =
    searchCorpus.includes('2026–2027') ||
    searchCorpus.includes('2026-2027') ||
    searchCorpus.includes('full 2026') ||
    is2026Sept ||
    is2027Jan;

  const is2025Sept =
    (searchCorpus.includes('sept') || searchCorpus.includes('sep') || searchCorpus.includes('09')) &&
    searchCorpus.includes('2025');

  const is2025Jan =
    (searchCorpus.includes('jan') || searchCorpus.includes('01')) &&
    (searchCorpus.includes('2025') || searchCorpus.includes('2026'));

  const isGeneral2025Session =
    searchCorpus.includes('2025–2026') ||
    searchCorpus.includes('2025-2026') ||
    searchCorpus.includes('full 2025') ||
    searchCorpus.includes('2025') ||
    is2025Sept ||
    is2025Jan;

  switch (selectedIntakeId) {
    case 'sept_2026':
    case 'September 2026 Intake':
      return is2026Sept;

    case 'jan_2027':
    case 'January 2027 Intake':
      return is2027Jan;

    case 'full_2026':
    case 'Full 2026 Session':
    case 'Full 2026 Session (Sept 2026 – Jan 2027)':
      return isGeneral2026Session;

    case 'sept_2025':
    case 'September 2025 Intake':
      // Matches records explicitly tagged for September 2025, or general 2025 records without Jan tag
      return is2025Sept || (!is2025Jan && isGeneral2025Session);

    case 'jan_2025':
    case 'January 2025 Intake':
    case 'January 2026 Intake':
      return is2025Jan;

    case 'full_2025':
    case 'Full 2025 Session':
    case 'Full 2025 Session (Sept 2025 – Jan 2026)':
    case '2025-2026 Intake':
      return isGeneral2025Session;

    default:
      // Fallback substring matching
      return searchCorpus.includes(selectedIntakeId.toLowerCase());
  }
}
