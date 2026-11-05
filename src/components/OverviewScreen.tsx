'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Plus,
  Inbox,
  MailCheck,
  Users,
  GraduationCap,
  Award,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Minus,
  Download,
  ArrowRight,
  Search,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Info,
  DollarSign,
  Layers,
  Sparkles,
  RotateCw,
  Filter,
  Globe,
  Loader2,
  BarChart2,
} from 'lucide-react';

import { Lang } from './ServicesAndOtherScreens';
import {
  ACADEMIC_INTAKE_OPTIONS,
  matchesAcademicIntake,
} from '@/lib/academicIntake';
import {
  ServiceBreakdownDetailModal,
  ServiceRecordItem,
} from './ServiceBreakdownDetailModal';
import {
  VolumeBreakdownDetailModal,
  VolumeRecordItem,
} from './VolumeBreakdownDetailModal';

interface OverviewScreenProps {
  demandes: any[];
  priorityTasks: any[];
  candidats?: any[];
  prospects?: any[];
  prepaCohorts?: any[];
  aviRequests?: any[];
  accommodationRequests?: any[];
  selectedIntake?: string;
  onSelectIntake?: (intake: string) => void;
  onNavigate: (tab: string) => void;
  onOpenNewDemande: () => void;
  onSelectDemande: (ref: string) => void;
  onToggleTask: (id: number) => void;
  onResetTasks: () => void;
  onNotify: (msg: string) => void;
  onRefresh?: () => void;
  lang?: Lang;
  userRole?: 'admin' | 'secretary' | 'avi';
  userName?: string;
  currentUser?: any;
}

export default function OverviewScreen({
  demandes,
  priorityTasks,
  candidats = [],
  prospects = [],
  prepaCohorts = [],
  aviRequests = [],
  accommodationRequests = [],
  selectedIntake = 'full_2026',
  onSelectIntake,
  onNavigate,
  onOpenNewDemande,
  onSelectDemande,
  onToggleTask,
  onResetTasks,
  onNotify,
  onRefresh = () => {},
  lang = 'en',
  userRole,
  userName,
  currentUser,
}: OverviewScreenProps) {
  const isEn = lang === 'en';
  const [resolvedUserName, setResolvedUserName] = useState<string>(
    userName || currentUser?.name || ''
  );
  const [resolvedFirstName, setResolvedFirstName] = useState<string>(() => {
    if (currentUser?.first_name) return currentUser.first_name;
    if (currentUser?.firstName) return currentUser.firstName;
    const fallbackName = userName || currentUser?.name || '';
    return fallbackName ? fallbackName.trim().split(/\s+/)[0] : '';
  });

  useEffect(() => {
    let fn = currentUser?.first_name || currentUser?.firstName || '';
    let nm = userName || currentUser?.name || '';
    if (!fn && !nm && typeof window !== 'undefined') {
      try {
        const savedUserStr = localStorage.getItem('liec_user');
        if (savedUserStr) {
          const u = JSON.parse(savedUserStr);
          fn = u?.first_name || u?.firstName || '';
          nm = u?.name || '';
        }
      } catch {}
    }
    if (fn) {
      setResolvedFirstName(fn);
    } else if (nm) {
      setResolvedFirstName(nm.trim().split(/\s+/)[0]);
    }
    if (nm) {
      setResolvedUserName(nm);
    }
  }, [userName, currentUser]);

  const [chartPeriod, setChartPeriod] = useState<'week' | 'month'>('month');
  const [cohortLabel, setCohortLabel] = useState<string>(selectedIntake || 'full_2026');
  const [searchFilter, setSearchFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Sync cohortLabel with selectedIntake if changed externally
  useEffect(() => {
    if (selectedIntake && selectedIntake !== cohortLabel) {
      setCohortLabel(selectedIntake);
    }
  }, [selectedIntake]);

  // Donut chart hover & modal states
  const [hoveredSegment, setHoveredSegment] = useState<number | null>(null);
  const [selectedBreakdownService, setSelectedBreakdownService] = useState<{
    name: string;
    color: string;
    records: ServiceRecordItem[];
    pct: number;
    valueEur: number;
  } | null>(null);

  // 1. Filter records according to the selected academic intake
  const intakeFilteredDemandes = useMemo(() => {
    return demandes.filter((d) => matchesAcademicIntake(d, cohortLabel));
  }, [demandes, cohortLabel]);

  const intakeFilteredCandidats = useMemo(() => {
    return candidats.filter((c) => matchesAcademicIntake(c, cohortLabel));
  }, [candidats, cohortLabel]);

  const intakeFilteredProspects = useMemo(() => {
    return prospects.filter((p) => matchesAcademicIntake(p, cohortLabel));
  }, [prospects, cohortLabel]);

  const intakeFilteredAvi = useMemo(() => {
    return aviRequests.filter((a) => matchesAcademicIntake(a, cohortLabel));
  }, [aviRequests, cohortLabel]);

  const intakeFilteredAccommodation = useMemo(() => {
    return accommodationRequests.filter((acc) => matchesAcademicIntake(acc, cohortLabel));
  }, [accommodationRequests, cohortLabel]);

  // Dashboard Demandes with priority to dashboard recent
  const dashboardDemandes = [
    ...intakeFilteredDemandes.filter((d) => d.is_dashboard_recent),
    ...intakeFilteredDemandes.filter((d) => !d.is_dashboard_recent),
  ];

  const filteredDemandes = dashboardDemandes.filter((d) => {
    const q = searchFilter.toLowerCase().trim();
    if (!q) return true;
    return (
      d.ref.toLowerCase().includes(q) ||
      d.full_name.toLowerCase().includes(q) ||
      d.email.toLowerCase().includes(q) ||
      d.country_name.toLowerCase().includes(q) ||
      d.program.toLowerCase().includes(q)
    );
  });

  const visibleDemandes = filteredDemandes.slice((currentPage - 1) * 4, currentPage * 4);
  const completedTasksCount = priorityTasks.filter((t) => t.completed).length;
  const urgentTasksCount = priorityTasks.filter((t) => !t.completed).length;

  const totalDemandesCount = intakeFilteredDemandes.length;
  const newDemandesCount = intakeFilteredDemandes.filter((d) => {
    const s = (d.status || '').toLowerCase();
    return s.includes('nouv') || s.includes('new');
  }).length;
  const prospectsCount = intakeFilteredProspects.length;
  const candidatsCount = intakeFilteredCandidats.length;
  const prepaCount =
    prepaCohorts.reduce((acc: number, c: any) => acc + (c.enrolled_count || 0), 0) ||
    prepaCohorts.length;

  // 2. Compute dynamic breakdown by service using actual records
  const serviceCategories = useMemo(() => {
    const orientationItems: ServiceRecordItem[] = [];
    const admissionItems: ServiceRecordItem[] = [];
    const prepaItems: ServiceRecordItem[] = [];
    const housingItems: ServiceRecordItem[] = [];
    const aviItems: ServiceRecordItem[] = [];

    // Categorize intake-filtered demandes
    intakeFilteredDemandes.forEach((d) => {
      const prog = (d.program || '').toLowerCase();
      const pole = (d.service_pole || '').toLowerCase();

      if (prog.includes('prepa') || prog.includes('prépa') || pole.includes('prepa')) {
        prepaItems.push({
          id: d.id,
          ref: d.ref || `DEM-${d.id}`,
          fullName: d.full_name,
          serviceType: 'LIEC-France PREPA',
          program: d.program,
          status: d.status || 'Nouvelle',
          date: d.submitted_at || 'Recent',
          academicIntake: d.expected_start || '2026–2027',
          sourceModule: 'demandes',
          valueEur: 2800,
        });
      } else if (
        pole.includes('candidat') ||
        pole.includes('admiss') ||
        prog.includes('iscom') ||
        prog.includes('mydigital') ||
        prog.includes('tunon') ||
        prog.includes('ihecf') ||
        prog.includes('ipac') ||
        prog.includes('mbway')
      ) {
        admissionItems.push({
          id: d.id,
          ref: d.ref || `DEM-${d.id}`,
          fullName: d.full_name,
          serviceType: 'University Application Support',
          program: d.program,
          status: d.status || 'Nouvelle',
          date: d.submitted_at || 'Recent',
          academicIntake: d.expected_start || '2026–2027',
          sourceModule: 'demandes',
          valueEur: 1800,
        });
      } else {
        orientationItems.push({
          id: d.id,
          ref: d.ref || `DEM-${d.id}`,
          fullName: d.full_name,
          serviceType: 'Academic Orientation & Guidance',
          program: d.program,
          status: d.status || 'Nouvelle',
          date: d.submitted_at || 'Recent',
          academicIntake: d.expected_start || '2026–2027',
          sourceModule: 'demandes',
          valueEur: 500,
        });
      }
    });

    // Categorize intake-filtered candidats
    intakeFilteredCandidats.forEach((c) => {
      admissionItems.push({
        id: c.id,
        ref: c.ref || `CAN-${c.id}`,
        fullName: c.full_name,
        serviceType: 'University Application Support',
        program: c.program,
        status: c.procedure_status || c.admission_status || 'En cours',
        date: c.created_at ? new Date(c.created_at).toLocaleDateString() : 'Active',
        academicIntake: c.academic_year || '2026–2027',
        sourceModule: 'candidats',
        valueEur: 2800,
      });
    });

    // Categorize intake-filtered accommodation
    intakeFilteredAccommodation.forEach((acc: any) => {
      housingItems.push({
        id: acc.id,
        ref: acc.ref || `ACC-${acc.id}`,
        fullName: acc.student_name,
        serviceType: 'Student Accommodation & Housing',
        program: `Logement Lyon (${acc.accommodation_type || 'Studio'})`,
        status: acc.status || 'Draft',
        date: acc.arrival_date || 'Septembre 2026',
        academicIntake: '2026–2027',
        sourceModule: 'accommodation',
        valueEur: 500,
      });
    });

    // Categorize intake-filtered AVI requests
    intakeFilteredAvi.forEach((avi: any) => {
      aviItems.push({
        id: avi.id,
        ref: avi.ref || `AVI-${avi.id}`,
        fullName: avi.student_name,
        serviceType: 'Blocked Account & AVI Prefinancing',
        program: `AVI YIMMILINE (${avi.offer_name || 'Classique'})`,
        status: avi.status || 'Submitted',
        date: avi.expected_start || 'Septembre 2026',
        academicIntake: '2026–2027',
        sourceModule: 'avi',
        valueEur: Number(avi.principal_eur || 2800),
      });
    });

    const groups = [
      {
        label: isEn ? 'Academic Orientation & Guidance' : 'Orientation & Bilan Académique',
        color: '#0284c7',
        items: orientationItems,
      },
      {
        label: isEn ? 'University Application Support' : 'Accompagnement Candidatures & Écoles',
        color: '#0b5d51',
        items: admissionItems,
      },
      {
        label: isEn ? 'LIEC-France PREPA Training' : 'Programme Préparatoire PREPA',
        color: '#10b981',
        items: prepaItems,
      },
      {
        label: isEn ? 'Student Accommodation & Housing' : 'Réservation Logement Étudiant',
        color: '#f4be37',
        items: housingItems,
      },
      {
        label: isEn ? 'Blocked Account & AVI Prefinancing' : 'Caution Bancaire AVI & Financement',
        color: '#64748b',
        items: aviItems,
      },
    ];

    const totalCount = groups.reduce((acc, g) => acc + g.items.length, 0);

    return groups.map((g) => {
      const pct = totalCount > 0 ? Math.round((g.items.length / totalCount) * 100) : 0;
      const valueEur = g.items.reduce((acc, it) => acc + (it.valueEur || 0), 0);
      return {
        ...g,
        count: g.items.length,
        pct,
        valueEur,
      };
    });
  }, [
    intakeFilteredDemandes,
    intakeFilteredCandidats,
    intakeFilteredAccommodation,
    intakeFilteredAvi,
    isEn,
  ]);

  const totalBreakdownCount = serviceCategories.reduce((acc, c) => acc + c.count, 0);
  const activeHoverCategory =
    hoveredSegment !== null ? serviceCategories[hoveredSegment] : null;

  const circumference = 2 * Math.PI * 44; // ~276.46
  let cumulativePct = 0;

  // Applications & Inquiry Volume Dashboard States
  const [selectedHub, setSelectedHub] = useState<'all' | 'cd' | 'cg'>('all');
  const [hoveredVolumeIndex, setHoveredVolumeIndex] = useState<number | null>(null);
  const [selectedVolumeBucket, setSelectedVolumeBucket] = useState<any | null>(null);
  const [isExportingAudit, setIsExportingAudit] = useState(false);
  const [isRefreshingVolume, setIsRefreshingVolume] = useState(false);

  // Helper: detect recruitment hub
  const getRecordHub = (item: any): 'cd' | 'cg' | 'other' => {
    if (!item) return 'other';
    const code = String(item.country_code || item.country || '').toUpperCase().trim();
    const name = String(item.country_name || item.country || item.city || '').toLowerCase();
    if (
      code === 'CD' ||
      name.includes('rdc') ||
      name.includes('drc') ||
      name.includes('kinshasa') ||
      name.includes('lubumbashi') ||
      name.includes('goma')
    ) {
      return 'cd';
    }
    if (
      code === 'CG' ||
      name.includes('congo-brazzaville') ||
      name.includes('brazzaville') ||
      name.includes('pointe-noire')
    ) {
      return 'cg';
    }
    return 'other';
  };

  // Helper: parse record creation/submission date
  const parseItemDate = (item: any): Date | null => {
    if (!item) return null;
    const raw = item.submitted_at || item.created_at || item.date || item.submission_date;
    if (!raw) return null;
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  };

  // 3. Unified & Deduplicated Volume Dataset
  const unifiedVolumeRecords = useMemo(() => {
    const list: any[] = [];
    const registeredEmails = new Set<string>();

    // 1. Formal Applications (demandes)
    (demandes || []).forEach((d) => {
      if (!d) return;
      const emailNorm = String(d.email || '').toLowerCase().trim();
      if (emailNorm) registeredEmails.add(emailNorm);

      const hub = getRecordHub(d);
      list.push({
        id: d.id,
        ref: d.ref || `DEM-${d.id}`,
        fullName: d.full_name || 'Candidate',
        email: d.email || '',
        phone: d.phone || '',
        type: 'application' as const,
        countryHub:
          hub === 'cd'
            ? 'Democratic Republic of Congo'
            : hub === 'cg'
            ? 'Republic of Congo'
            : d.country_name || 'Other',
        flag: hub === 'cd' ? '🇨🇩' : hub === 'cg' ? '🇨🇬' : d.flag || '🌍',
        program: d.program || 'MBway Lyon — Management & Commerce',
        status: d.status || 'New',
        date: d.submitted_at || (d.created_at ? new Date(d.created_at).toLocaleDateString() : 'Recent'),
        adviser: d.adviser || 'Barthelemy MAPWABA NTORO',
        sourceModule: 'demandes' as const,
        _raw: d,
        _hub: hub,
        _date: parseItemDate(d),
      });
    });

    // 2. Qualified Candidates (candidats) - deduplicate against demandes
    (candidats || []).forEach((c) => {
      if (!c) return;
      const emailNorm = String(c.email || '').toLowerCase().trim();
      if (emailNorm && registeredEmails.has(emailNorm)) return;
      if (emailNorm) registeredEmails.add(emailNorm);

      const hub = getRecordHub(c);
      list.push({
        id: c.id,
        ref: c.ref || `CAN-${c.id}`,
        fullName: c.full_name || 'Qualified Candidate',
        email: c.email || '',
        phone: c.phone || '',
        type: 'candidat' as const,
        countryHub:
          hub === 'cd'
            ? 'Democratic Republic of Congo'
            : hub === 'cg'
            ? 'Republic of Congo'
            : c.country_name || 'Other',
        flag: hub === 'cd' ? '🇨🇩' : hub === 'cg' ? '🇨🇬' : c.flag || '🌍',
        program: c.program || c.formation || 'Admission Lyon',
        status: c.status || 'Qualified',
        date: c.created_at ? new Date(c.created_at).toLocaleDateString() : c.date || 'Recent',
        adviser: c.adviser || 'Barthelemy MAPWABA NTORO',
        sourceModule: 'candidats' as const,
        _raw: c,
        _hub: hub,
        _date: parseItemDate(c),
      });
    });

    // 3. Inquiries / Leads (prospects) - deduplicate against formal applications
    (prospects || []).forEach((p) => {
      if (!p) return;
      const emailNorm = String(p.email || '').toLowerCase().trim();
      if (emailNorm && registeredEmails.has(emailNorm)) return;

      const hub = getRecordHub(p);
      list.push({
        id: p.id,
        ref: p.ref || `PROS-${p.id}`,
        fullName: p.full_name || 'Prospective Student',
        email: p.email || '',
        phone: p.phone || '',
        type: 'enquiry' as const,
        countryHub:
          hub === 'cd'
            ? 'Democratic Republic of Congo'
            : hub === 'cg'
            ? 'Republic of Congo'
            : p.country || 'Other',
        flag: hub === 'cd' ? '🇨🇩' : hub === 'cg' ? '🇨🇬' : '🌍',
        program: p.program || p.service_interest || 'General Inquiry',
        status: p.status || p.stage || 'New Inquiry',
        date: p.created_at ? new Date(p.created_at).toLocaleDateString() : p.date || 'Recent',
        adviser: p.adviser || 'Unassigned',
        sourceModule: 'prospects' as const,
        _raw: p,
        _hub: hub,
        _date: parseItemDate(p),
      });
    });

    return list;
  }, [demandes, candidats, prospects]);

  // 4. Volume records filtered by active intake and selected recruitment hub
  const filteredVolumeRecords = useMemo(() => {
    return unifiedVolumeRecords.filter((rec) => {
      if (!matchesAcademicIntake(rec._raw, cohortLabel)) {
        return false;
      }
      if (selectedHub !== 'all' && rec._hub !== selectedHub) {
        return false;
      }
      return true;
    });
  }, [unifiedVolumeRecords, cohortLabel, selectedHub]);

  // 5. Volume Buckets grouped by Weekly or Monthly
  const volumeBuckets = useMemo(() => {
    if (chartPeriod === 'month') {
      let monthDefs: { key: string; label: string; short: string }[] = [];

      if (cohortLabel === 'full_2026') {
        monthDefs = [
          { key: '2026-09', label: 'Sep 2026', short: 'Sep' },
          { key: '2026-10', label: 'Oct 2026', short: 'Oct' },
          { key: '2026-11', label: 'Nov 2026', short: 'Nov' },
          { key: '2026-12', label: 'Dec 2026', short: 'Dec' },
          { key: '2027-01', label: 'Jan 2027', short: 'Jan' },
        ];
      } else if (cohortLabel === 'sept_2026') {
        monthDefs = [
          { key: '2026-05', label: 'May 2026', short: 'May' },
          { key: '2026-06', label: 'Jun 2026', short: 'Jun' },
          { key: '2026-07', label: 'Jul 2026', short: 'Jul' },
          { key: '2026-08', label: 'Aug 2026', short: 'Aug' },
          { key: '2026-09', label: 'Sep 2026', short: 'Sep' },
        ];
      } else if (cohortLabel === 'jan_2027') {
        monthDefs = [
          { key: '2026-09', label: 'Sep 2026', short: 'Sep' },
          { key: '2026-10', label: 'Oct 2026', short: 'Oct' },
          { key: '2026-11', label: 'Nov 2026', short: 'Nov' },
          { key: '2026-12', label: 'Dec 2026', short: 'Dec' },
          { key: '2027-01', label: 'Jan 2027', short: 'Jan' },
        ];
      } else if (cohortLabel === 'full_2025') {
        monthDefs = [
          { key: '2025-09', label: 'Sep 2025', short: 'Sep' },
          { key: '2025-10', label: 'Oct 2025', short: 'Oct' },
          { key: '2025-11', label: 'Nov 2025', short: 'Nov' },
          { key: '2025-12', label: 'Dec 2025', short: 'Dec' },
          { key: '2026-01', label: 'Jan 2026', short: 'Jan' },
        ];
      } else if (cohortLabel === 'sept_2025') {
        monthDefs = [
          { key: '2025-05', label: 'May 2025', short: 'May' },
          { key: '2025-06', label: 'Jun 2025', short: 'Jun' },
          { key: '2025-07', label: 'Jul 2025', short: 'Jul' },
          { key: '2025-08', label: 'Aug 2025', short: 'Aug' },
          { key: '2025-09', label: 'Sep 2025', short: 'Sep' },
        ];
      } else if (cohortLabel === 'jan_2025') {
        monthDefs = [
          { key: '2024-09', label: 'Sep 2024', short: 'Sep' },
          { key: '2024-10', label: 'Oct 2024', short: 'Oct' },
          { key: '2024-11', label: 'Nov 2024', short: 'Nov' },
          { key: '2024-12', label: 'Dec 2024', short: 'Dec' },
          { key: '2025-01', label: 'Jan 2025', short: 'Jan' },
        ];
      } else {
        monthDefs = [
          { key: '2026-05', label: 'May 2026', short: 'May' },
          { key: '2026-06', label: 'Jun 2026', short: 'Jun' },
          { key: '2026-07', label: 'Jul 2026', short: 'Jul' },
          { key: '2026-08', label: 'Aug 2026', short: 'Aug' },
          { key: '2026-09', label: 'Sep 2026', short: 'Sep' },
          { key: '2026-10', label: 'Oct 2026', short: 'Oct' },
          { key: '2026-11', label: 'Nov 2026', short: 'Nov' },
          { key: '2027-01', label: 'Jan 2027', short: 'Jan' },
        ];
      }

      const map = new Map<string, any[]>();
      monthDefs.forEach((m) => map.set(m.key, []));

      filteredVolumeRecords.forEach((item: any) => {
        let matchedKey: string | null = null;
        if (item._date) {
          const y = item._date.getFullYear();
          const m = String(item._date.getMonth() + 1).padStart(2, '0');
          const k = `${y}-${m}`;
          if (map.has(k)) {
            matchedKey = k;
          }
        }

        if (!matchedKey) {
          const text = `${item.program} ${item.date} ${item.status}`.toLowerCase();
          if (text.includes('oct') && map.has(monthDefs.find((m) => m.short === 'Oct')?.key || '')) {
            matchedKey = monthDefs.find((m) => m.short === 'Oct')!.key;
          } else if (text.includes('nov') && map.has(monthDefs.find((m) => m.short === 'Nov')?.key || '')) {
            matchedKey = monthDefs.find((m) => m.short === 'Nov')!.key;
          } else if (text.includes('dec') && map.has(monthDefs.find((m) => m.short === 'Dec')?.key || '')) {
            matchedKey = monthDefs.find((m) => m.short === 'Dec')!.key;
          } else if (text.includes('jan') && map.has(monthDefs.find((m) => m.short === 'Jan')?.key || '')) {
            matchedKey = monthDefs.find((m) => m.short === 'Jan')!.key;
          } else {
            matchedKey = monthDefs[0].key;
          }
        }

        if (matchedKey && map.has(matchedKey)) {
          map.get(matchedKey)!.push(item);
        }
      });

      return monthDefs.map((def) => {
        const records = map.get(def.key) || [];
        return {
          key: def.key,
          label: def.label,
          shortLabel: def.short,
          records,
          applicationsCount: records.filter((r) => r.type === 'application').length,
          enquiriesCount: records.filter((r) => r.type === 'enquiry').length,
          candidatsCount: records.filter((r) => r.type === 'candidat').length,
          totalVolume: records.length,
        };
      });
    } else {
      const baseYear = cohortLabel.includes('2025') ? '2025' : '2026';
      const weekDefs = [
        { key: 'w1', label: `Week 1 (Sep 1–7, ${baseYear})`, short: 'W1 (Sep 1)' },
        { key: 'w2', label: `Week 2 (Sep 8–14, ${baseYear})`, short: 'W2 (Sep 8)' },
        { key: 'w3', label: `Week 3 (Sep 15–21, ${baseYear})`, short: 'W3 (Sep 15)' },
        { key: 'w4', label: `Week 4 (Sep 22–28, ${baseYear})`, short: 'W4 (Sep 22)' },
        { key: 'w5', label: `Week 5 (Sep 29–Oct 5, ${baseYear})`, short: 'W5 (Sep 29)' },
        { key: 'w6', label: `Week 6 (Oct 6–12, ${baseYear})`, short: 'W6 (Oct 6)' },
      ];

      const map = new Map<string, any[]>();
      weekDefs.forEach((w) => map.set(w.key, []));

      filteredVolumeRecords.forEach((item: any, idx: number) => {
        let matchedKey: string | null = null;
        if (item._date) {
          const d = item._date.getDate();
          if (d <= 7) matchedKey = 'w1';
          else if (d <= 14) matchedKey = 'w2';
          else if (d <= 21) matchedKey = 'w3';
          else if (d <= 28) matchedKey = 'w4';
          else matchedKey = 'w5';
        }
        if (!matchedKey) {
          const bucketIndex = idx % weekDefs.length;
          matchedKey = weekDefs[bucketIndex].key;
        }
        map.get(matchedKey)!.push(item);
      });

      return weekDefs.map((def) => {
        const records = map.get(def.key) || [];
        return {
          key: def.key,
          label: def.label,
          shortLabel: def.short,
          records,
          applicationsCount: records.filter((r) => r.type === 'application').length,
          enquiriesCount: records.filter((r) => r.type === 'enquiry').length,
          candidatsCount: records.filter((r) => r.type === 'candidat').length,
          totalVolume: records.length,
        };
      });
    }
  }, [chartPeriod, cohortLabel, filteredVolumeRecords]);

  // 6. SVG Trendline Coordinate Calculations (Enhanced high-visibility dimensions)
  const maxVolumeVal = Math.max(...volumeBuckets.map((b) => b.totalVolume), 1);
  const niceVolumeMax = Math.max(Math.ceil(maxVolumeVal / 5) * 5, 5);

  const xStart = 50;
  const xEnd = 570;
  const yTop = 35;
  const yBottom = 195;

  const pointsWithCoords = useMemo(() => {
    return volumeBuckets.map((b, i) => {
      const cx =
        volumeBuckets.length > 1
          ? xStart + (i / (volumeBuckets.length - 1)) * (xEnd - xStart)
          : 310;
      const cy = yBottom - (b.totalVolume / niceVolumeMax) * (yBottom - yTop);
      return { ...b, cx, cy, index: i };
    });
  }, [volumeBuckets, niceVolumeMax]);

  const polylinePoints = pointsWithCoords
    .map((p) => `${p.cx.toFixed(1)},${p.cy.toFixed(1)}`)
    .join(' ');
  const polygonPoints = `${xStart},${yBottom} ${polylinePoints} ${xEnd},${yBottom}`;

  // 7. Dynamic Session Growth Calculation
  const growthCalculation = useMemo(() => {
    if (pointsWithCoords.length < 2) {
      return {
        status: 'active' as const,
        text: `Tracking active — ${filteredVolumeRecords.length} records recorded`,
        diffPct: 0,
      };
    }
    const lastPoint = pointsWithCoords[pointsWithCoords.length - 1];
    const prevPoint = pointsWithCoords[pointsWithCoords.length - 2];

    if (prevPoint.totalVolume === 0 && lastPoint.totalVolume === 0) {
      return {
        status: 'stable' as const,
        text: isEn
          ? 'Volume stable (0.0% variance) across recruitment hubs'
          : 'Volume stable (0,0% de variation) sur les pôles',
        diffPct: 0,
      };
    }

    if (prevPoint.totalVolume === 0) {
      return {
        status: 'growing' as const,
        text: isEn
          ? `Session growth tracking on target across all academic intakes (+${lastPoint.totalVolume} new entries)`
          : `Croissance sur la cible dans toutes les rentrées (+${lastPoint.totalVolume} nouvelles entrées)`,
        diffPct: 100,
      };
    }

    const diff = lastPoint.totalVolume - prevPoint.totalVolume;
    const pct = (diff / prevPoint.totalVolume) * 100;

    if (pct > 0) {
      return {
        status: 'growing' as const,
        text: isEn
          ? `Session growth tracking on target across recruitment hubs (+${pct.toFixed(1)}%)`
          : `Croissance de session sur la cible dans les pôles (+${pct.toFixed(1)}%)`,
        diffPct: pct,
      };
    } else if (pct < 0) {
      return {
        status: 'declining' as const,
        text: isEn
          ? `Volume contracted ${pct.toFixed(1)}% vs previous period across hubs`
          : `Volume en contraction de ${pct.toFixed(1)}% par rapport à la période précédente`,
        diffPct: pct,
      };
    } else {
      return {
        status: 'stable' as const,
        text: isEn
          ? 'Volume stable (0.0% variance) across recruitment hubs'
          : 'Volume stable (0,0% de variation) sur les pôles',
        diffPct: 0,
      };
    }
  }, [pointsWithCoords, filteredVolumeRecords.length, isEn]);

  // 8. Download Intake Audit CSV Generator
  const handleDownloadIntakeAudit = () => {
    setIsExportingAudit(true);
    try {
      const intakeOption = ACADEMIC_INTAKE_OPTIONS.find((o) => o.id === cohortLabel);
      const intakeLabel = (isEn ? intakeOption?.labelEn : intakeOption?.labelFr) || cohortLabel;
      const hubName =
        selectedHub === 'cd'
          ? 'DRC_Kinshasa'
          : selectedHub === 'cg'
          ? 'Congo_Brazzaville'
          : 'All_Hubs';

      const headers = [
        'Reference',
        'Full Name',
        'Email',
        'Phone',
        'Record Type',
        'Recruitment Hub',
        'Academic Intake',
        'Program / Service',
        'Status',
        'Submission Date',
        'Assigned Advisor',
      ];

      const rows = filteredVolumeRecords.map((r: any) => [
        `"${r.ref || ''}"`,
        `"${(r.fullName || '').replace(/"/g, '""')}"`,
        `"${r.email || ''}"`,
        `"${r.phone || ''}"`,
        `"${
          r.type === 'application'
            ? 'Formal Application'
            : r.type === 'enquiry'
            ? 'Inquiry / Lead'
            : 'Qualified Candidate'
        }"`,
        `"${r.countryHub || ''}"`,
        `"${intakeLabel}"`,
        `"${(r.program || '').replace(/"/g, '""')}"`,
        `"${r.status || ''}"`,
        `"${r.date || ''}"`,
        `"${(r.adviser || '').replace(/"/g, '""')}"`,
      ]);

      const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `LIEC_Intake_Audit_${cohortLabel}_${hubName}_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      onNotify(
        isEn
          ? `Downloaded intake audit (${filteredVolumeRecords.length} records exported).`
          : `Audit d'admission téléchargé (${filteredVolumeRecords.length} dossiers exportés).`
      );
    } catch (err: any) {
      onNotify('Failed to export intake audit: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsExportingAudit(false);
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshingVolume(true);
    try {
      if (onRefresh) await onRefresh();
      onNotify(isEn ? 'Applications & inquiry volume refreshed.' : 'Volume des demandes et candidatures actualisé.');
    } catch {
      onNotify('Refreshed data view.');
    } finally {
      setTimeout(() => setIsRefreshingVolume(false), 500);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Welcome / Hero Banner */}
      <div className="rounded-2xl border border-[#def2ec] bg-gradient-to-r from-[#eefaf6] via-[#f3faf9] to-[#eef6fc] p-4 sm:p-5 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2.5 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#d8f6ea] px-2.5 py-0.5 font-semibold text-[#0c685a]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#10b981]" />
              Active Subproduction Session
            </span>
            <span className="text-slate-400">Updated in real-time</span>
          </div>
          <h1 className="text-2xl sm:text-[28px] lg:text-[30px] font-bold tracking-tight text-[#092342] leading-snug">
            {isEn ? (
              <>
                Hi <span className="font-extrabold text-[#0c685a]">{resolvedFirstName || 'there'}</span>, welcome back to your LIEC Heav’n workspace!
              </>
            ) : (
              <>
                Bonjour <span className="font-extrabold text-[#0c685a]">{resolvedFirstName || 'à vous'}</span>, bienvenue dans votre espace LIEC Heav’n !
              </>
            )}
          </h1>
          <p className="text-sm sm:text-[14.5px] font-normal text-slate-600 leading-relaxed max-w-2xl">
            {isEn
              ? 'Monitor incoming applications, prospect pipeline, candidate files, and cohorts for the 2027–2028 academic sessions.'
              : 'Suivez les dossiers de candidature, le pipeline de prospects et les cohortes pour les sessions académiques 2027–2028.'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-2.5 shrink-0">
          {/* Functional Academic Intake Selector */}
          <div className="relative">
            <select
              value={cohortLabel}
              onChange={(e) => {
                const val = e.target.value;
                setCohortLabel(val);
                if (onSelectIntake) onSelectIntake(val);
              }}
              className="appearance-none rounded-xl border border-slate-200 bg-white pl-9 pr-9 py-2 text-xs font-bold text-[#092342] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0c685a]/20 cursor-pointer"
            >
              {ACADEMIC_INTAKE_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {isEn ? opt.labelEn : opt.labelFr}
                </option>
              ))}
            </select>
            <Calendar className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none">
              ▼
            </span>
          </div>

          {/* "+ New Application" button */}
          {(userRole === 'admin' || userRole === 'secretary') && (
            <button
              onClick={onOpenNewDemande}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0c6358] hover:bg-[#094f46] text-white font-semibold text-xs px-5 py-2.5 shadow-sm transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {isEn ? '+ Record New Student Application' : '+ Nouvelle Demande Candidat'}
            </button>
          )}
        </div>
      </div>

      {/* 6 KPI Stat Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Stat 1: Total Received */}
        <div className="rounded-2xl border border-[#e6eef6] bg-white p-4 shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Applications
            </span>
            <Inbox className="w-4 h-4 text-[#0c685a]" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold tracking-tight text-[#092342]">{totalDemandesCount}</div>
            <p className="text-[11px] font-semibold text-[#0c685a] mt-0.5">
              {newDemandesCount} new received
            </p>
          </div>
        </div>

        {/* Stat 2: Prospects CRM */}
        <div className="rounded-2xl border border-[#e6eef6] bg-white p-4 shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Prospects
            </span>
            <Users className="w-4 h-4 text-[#0284c7]" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold tracking-tight text-[#092342]">{prospectsCount}</div>
            <p className="text-[11px] font-semibold text-[#0284c7] mt-0.5">
              In active pipeline
            </p>
          </div>
        </div>

        {/* Stat 3: Enrolled Candidates */}
        <div className="rounded-2xl border border-[#e6eef6] bg-white p-4 shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Candidates
            </span>
            <GraduationCap className="w-4 h-4 text-[#10b981]" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold tracking-tight text-[#092342]">{candidatsCount}</div>
            <p className="text-[11px] font-semibold text-[#10b981] mt-0.5">
              CF Tracked files
            </p>
          </div>
        </div>

        {/* Stat 4: PREPA Enrolled */}
        <div className="rounded-2xl border border-[#e6eef6] bg-white p-4 shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              PREPA
            </span>
            <Award className="w-4 h-4 text-[#f4be37]" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold tracking-tight text-[#092342]">{prepaCount}</div>
            <p className="text-[11px] font-semibold text-[#b45309] mt-0.5">
              Active scholars
            </p>
          </div>
        </div>

        {/* Stat 5: Blocked Account AVI */}
        <div className="rounded-2xl border border-[#e6eef6] bg-white p-4 shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              AVI Desk
            </span>
            <DollarSign className="w-4 h-4 text-[#64748b]" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold tracking-tight text-[#092342]">{intakeFilteredAvi.length}</div>
            <p className="text-[11px] font-semibold text-slate-600 mt-0.5">
              YIMMILINE files
            </p>
          </div>
        </div>

        {/* Stat 6: Urgent Tasks */}
        <div className="rounded-2xl border border-[#e6eef6] bg-white p-4 shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Action Queue
            </span>
            <CheckCircle2 className="w-4 h-4 text-red-600" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold tracking-tight text-[#092342]">{urgentTasksCount}</div>
            <p className="text-[11px] font-semibold text-red-600 mt-0.5">
              Pending reviews
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Trend Chart + Right Interactive Donut Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Inquiry Trends */}
        <div className="lg:col-span-8 rounded-2xl border border-[#e6eef6] bg-white p-6 shadow-card flex flex-col justify-between relative">
          <div>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-[#092342] leading-snug">
                    {isEn ? 'Applications & Inquiry Volume' : 'Volume des Demandes & Candidatures'}
                  </h2>
                  <span className="rounded-full bg-[#eefaf6] text-[#0c685a] border border-[#ccece2] px-2 py-0.5 text-[10.5px] font-bold">
                    {filteredVolumeRecords.length} {isEn ? 'total' : 'au total'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isEn
                    ? 'Dynamic volume tracked across DRC & Congo-Brazzaville recruitment hubs'
                    : 'Volume dynamique suivi sur les pôles de recrutement RDC et Congo-Brazzaville'}
                </p>
              </div>

              {/* Hub & Period Action Controls */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Recruitment Hub Selector */}
                <div className="inline-flex rounded-xl border border-slate-200 bg-[#f1f6fb] p-1 text-xs font-bold text-slate-600">
                  <button
                    type="button"
                    onClick={() => setSelectedHub('all')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer text-[11px] ${
                      selectedHub === 'all'
                        ? 'bg-white text-[#092342] shadow-xs'
                        : 'hover:text-[#092342]'
                    }`}
                  >
                    {isEn ? 'All Hubs' : 'Tous les pôles'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedHub('cd')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer text-[11px] flex items-center gap-1 ${
                      selectedHub === 'cd'
                        ? 'bg-white text-[#092342] shadow-xs'
                        : 'hover:text-[#092342]'
                    }`}
                  >
                    <span>🇨🇩</span>
                    <span>DRC</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedHub('cg')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer text-[11px] flex items-center gap-1 ${
                      selectedHub === 'cg'
                        ? 'bg-white text-[#092342] shadow-xs'
                        : 'hover:text-[#092342]'
                    }`}
                  >
                    <span>🇨🇬</span>
                    <span>Congo</span>
                  </button>
                </div>

                {/* Weekly / Monthly Toggle */}
                <div className="inline-flex rounded-xl border border-slate-200 bg-[#f1f6fb] p-1 text-xs font-bold text-slate-600">
                  <button
                    type="button"
                    onClick={() => setChartPeriod('week')}
                    className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                      chartPeriod === 'week'
                        ? 'bg-white text-[#092342] shadow-xs'
                        : 'hover:text-[#092342]'
                    }`}
                  >
                    {isEn ? 'Weekly' : 'Hebdo'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartPeriod('month')}
                    className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                      chartPeriod === 'month'
                        ? 'bg-white text-[#092342] shadow-xs'
                        : 'hover:text-[#092342]'
                    }`}
                  >
                    {isEn ? 'Monthly' : 'Mensuel'}
                  </button>
                </div>

                {/* Manual Refresh Button */}
                <button
                  type="button"
                  onClick={handleManualRefresh}
                  disabled={isRefreshingVolume}
                  title={isEn ? 'Refresh Volume Dataset' : 'Actualiser les données de volume'}
                  className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-[#092342] shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  <RotateCw
                    className={`w-3.5 h-3.5 ${isRefreshingVolume ? 'animate-spin text-[#0c685a]' : ''}`}
                  />
                </button>
              </div>
            </div>

            {/* SVG Trend Line Visual & Dynamic Chart (High Visibility Enhanced Sizing) */}
            <div className="my-6 relative">
              {filteredVolumeRecords.length === 0 ? (
                <div className="h-56 sm:h-64 lg:h-72 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center text-center p-6">
                  <BarChart2 className="w-10 h-10 text-slate-300 mb-2" />
                  <p className="text-sm font-bold text-slate-700">
                    {isEn ? 'No records match this selection' : 'Aucun dossier ne correspond à cette sélection'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">
                    {isEn
                      ? 'Try switching recruitment hubs or selecting another academic intake.'
                      : 'Essayez de changer de pôle de recrutement ou de choisir une autre rentrée.'}
                  </p>
                </div>
              ) : (
                <div className="relative">
                  <svg viewBox="0 0 600 240" className="w-full h-56 sm:h-64 lg:h-72 overflow-visible">
                    <defs>
                      <linearGradient id="trendGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#0c685a" stopOpacity="0.28" />
                        <stop offset="100%" stopColor="#0c685a" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal Scale Gridlines */}
                    <line
                      x1={xStart}
                      y1={yTop}
                      x2={xEnd}
                      y2={yTop}
                      stroke="#f1f5f9"
                      strokeDasharray="4 4"
                    />
                    <line
                      x1={xStart}
                      y1={yTop + (yBottom - yTop) * 0.33}
                      x2={xEnd}
                      y2={yTop + (yBottom - yTop) * 0.33}
                      stroke="#f1f5f9"
                      strokeDasharray="4 4"
                    />
                    <line
                      x1={xStart}
                      y1={yTop + (yBottom - yTop) * 0.67}
                      x2={xEnd}
                      y2={yTop + (yBottom - yTop) * 0.67}
                      stroke="#f1f5f9"
                      strokeDasharray="4 4"
                    />
                    <line
                      x1={xStart}
                      y1={yBottom}
                      x2={xEnd}
                      y2={yBottom}
                      stroke="#e2e8f0"
                      strokeWidth="1.5"
                    />

                    {/* Y-axis Scale Labels */}
                    <text
                      x={xStart - 12}
                      y={yTop + 4}
                      textAnchor="end"
                      className="text-[10px] fill-slate-400 font-bold select-none"
                    >
                      {niceVolumeMax}
                    </text>
                    <text
                      x={xStart - 12}
                      y={yTop + (yBottom - yTop) * 0.33 + 4}
                      textAnchor="end"
                      className="text-[10px] fill-slate-400 font-bold select-none"
                    >
                      {Math.round(niceVolumeMax * 0.67)}
                    </text>
                    <text
                      x={xStart - 12}
                      y={yTop + (yBottom - yTop) * 0.67 + 4}
                      textAnchor="end"
                      className="text-[10px] fill-slate-400 font-bold select-none"
                    >
                      {Math.round(niceVolumeMax * 0.33)}
                    </text>
                    <text
                      x={xStart - 12}
                      y={yBottom + 4}
                      textAnchor="end"
                      className="text-[10px] fill-slate-400 font-bold select-none"
                    >
                      0
                    </text>

                    {/* Area under curve */}
                    <polygon points={polygonPoints} fill="url(#trendGrad)" />

                    {/* Curve line */}
                    <polyline
                      points={polylinePoints}
                      fill="none"
                      stroke="#0c685a"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Dynamic Interactive Data Point Markers */}
                    {pointsWithCoords.map((pt) => {
                      const isHovered = hoveredVolumeIndex === pt.index;
                      const hasData = pt.totalVolume > 0;

                      return (
                        <g key={pt.key} className="transition-all duration-150">
                          {/* Hover Halo */}
                          {isHovered && (
                            <circle
                              cx={pt.cx}
                              cy={pt.cy}
                              r={11}
                              className="fill-[#0c685a]/25 animate-pulse"
                            />
                          )}

                          {/* Data Marker */}
                          <circle
                            cx={pt.cx}
                            cy={pt.cy}
                            r={isHovered ? 7 : hasData ? 5.5 : 4.5}
                            className={
                              hasData || isHovered
                                ? 'fill-[#0c685a] stroke-white stroke-2 cursor-pointer'
                                : 'fill-[#092342] cursor-pointer'
                            }
                          />

                          {/* Volume Counter Tag above active point */}
                          {(hasData || isHovered) && (
                            <text
                              x={pt.cx}
                              y={pt.cy - 10}
                              textAnchor="middle"
                              className="text-[11.5px] font-black fill-[#092342] select-none pointer-events-none"
                            >
                              {pt.totalVolume}
                            </text>
                          )}

                          {/* X-axis Label */}
                          <text
                            x={pt.cx}
                            y="222"
                            textAnchor="middle"
                            className={`text-[11px] select-none cursor-pointer ${
                              isHovered || hasData
                                ? 'fill-[#0c685a] font-extrabold'
                                : 'fill-slate-500 font-semibold'
                            }`}
                          >
                            {pt.shortLabel}
                          </text>

                          {/* Wide hit area for hover and click interaction */}
                          <circle
                            cx={pt.cx}
                            cy={pt.cy}
                            r={24}
                            fill="transparent"
                            className="cursor-pointer"
                            onMouseEnter={() => setHoveredVolumeIndex(pt.index)}
                            onMouseLeave={() => setHoveredVolumeIndex(null)}
                            onClick={() => setSelectedVolumeBucket(pt)}
                          />
                        </g>
                      );
                    })}
                  </svg>

                  {/* Interactive Floating Tooltip */}
                  {hoveredVolumeIndex !== null && pointsWithCoords[hoveredVolumeIndex] && (
                    <div
                      style={{
                        left: `${(pointsWithCoords[hoveredVolumeIndex].cx / 600) * 100}%`,
                        top: '-18px',
                        transform: 'translateX(-50%)',
                      }}
                      className="absolute z-20 pointer-events-none bg-[#092342] text-white rounded-xl px-3.5 py-2.5 shadow-2xl text-xs min-w-[220px] border border-slate-700 animate-in fade-in zoom-in-95 duration-100"
                    >
                      <div className="flex items-center justify-between border-b border-white/10 pb-1.5 mb-1.5">
                        <span className="font-extrabold text-white text-[11px]">
                          {pointsWithCoords[hoveredVolumeIndex].label}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#0c685a] text-white">
                          {pointsWithCoords[hoveredVolumeIndex].totalVolume} Total
                        </span>
                      </div>
                      <div className="space-y-1 text-[11px]">
                        <div className="flex items-center justify-between text-slate-300">
                          <span>{isEn ? 'Applications:' : 'Candidatures :'}</span>
                          <span className="font-bold text-white">
                            {pointsWithCoords[hoveredVolumeIndex].applicationsCount}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-slate-300">
                          <span>{isEn ? 'New Enquiries:' : 'Nouvelles demandes :'}</span>
                          <span className="font-bold text-white">
                            {pointsWithCoords[hoveredVolumeIndex].enquiriesCount}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-slate-300">
                          <span>{isEn ? 'Qualified Candidates:' : 'Candidats qualifiés :'}</span>
                          <span className="font-bold text-white">
                            {pointsWithCoords[hoveredVolumeIndex].candidatsCount}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 pt-1.5 border-t border-white/10 text-[10px] text-emerald-400 font-semibold flex items-center justify-between">
                        <span>
                          {selectedHub === 'cd'
                            ? '🇨🇩 DRC Hub'
                            : selectedHub === 'cg'
                            ? '🇨🇬 Congo Hub'
                            : '🇨🇩 & 🇨🇬 All Hubs'}
                        </span>
                        <span className="text-[9.5px] text-slate-300 underline font-medium">
                          {isEn ? 'Click to inspect records' : 'Cliquer pour inspecter'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Card Summary & Download Intake Audit Action */}
          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div
              className={`font-bold flex items-center gap-1.5 ${
                growthCalculation.status === 'declining'
                  ? 'text-amber-700'
                  : 'text-[#0c685a]'
              }`}
            >
              {growthCalculation.status === 'declining' ? (
                <TrendingDown className="w-3.5 h-3.5" />
              ) : growthCalculation.status === 'stable' ? (
                <Minus className="w-3.5 h-3.5" />
              ) : (
                <TrendingUp className="w-3.5 h-3.5" />
              )}
              <span>{growthCalculation.text}</span>
            </div>

            <button
              type="button"
              onClick={handleDownloadIntakeAudit}
              disabled={isExportingAudit || filteredVolumeRecords.length === 0}
              className="inline-flex items-center gap-1.5 font-bold text-[#092342] hover:text-[#0c685a] transition cursor-pointer disabled:opacity-50"
            >
              <span>
                {isExportingAudit
                  ? (isEn ? 'Generating CSV...' : 'Génération CSV...')
                  : (isEn ? 'Download Intake Audit' : "Télécharger l'audit d'admission")}
              </span>
              {isExportingAudit ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Interactive Breakdown by Service Donut Chart */}
        <div className="lg:col-span-4 rounded-2xl border border-[#e6eef6] bg-white p-6 shadow-card flex flex-col justify-between relative overflow-hidden">
          <div>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#092342] leading-snug">
                  Breakdown by
                  <br />
                  Service
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Interactive categorized volume & audit
                </p>
              </div>
              <button
                onClick={() => onNavigate('rapports')}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
                title="View full reports"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>

            {/* SVG Interactive Donut Chart */}
            <div className="my-4 flex flex-col items-center">
              <div className="relative w-52 h-52 flex items-center justify-center">
                <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                  {/* Background Track */}
                  <circle
                    cx="60"
                    cy="60"
                    r="44"
                    fill="none"
                    stroke="#f1f5f9"
                    strokeWidth="13"
                  />

                  {/* Dynamic Segments */}
                  {totalBreakdownCount === 0 ? (
                    <circle
                      cx="60"
                      cy="60"
                      r="44"
                      fill="none"
                      stroke="#e2e8f0"
                      strokeWidth="13"
                    />
                  ) : (
                    serviceCategories.map((cat, idx) => {
                      const dashLength = (cat.pct / 100) * circumference;
                      const offset = -(cumulativePct / 100) * circumference;
                      cumulativePct += cat.pct;

                      const isHovered = hoveredSegment === idx;

                      return (
                        <circle
                          key={cat.label}
                          cx="60"
                          cy="60"
                          r="44"
                          fill="none"
                          stroke={cat.color}
                          strokeWidth={isHovered ? 16 : 13}
                          strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                          strokeDashoffset={offset}
                          opacity={
                            hoveredSegment === null || hoveredSegment === idx ? 1 : 0.5
                          }
                          onMouseEnter={() => setHoveredSegment(idx)}
                          onMouseLeave={() => setHoveredSegment(null)}
                          onClick={() =>
                            setSelectedBreakdownService({
                              name: cat.label,
                              color: cat.color,
                              records: cat.items,
                              pct: cat.pct,
                              valueEur: cat.valueEur,
                            })
                          }
                          className="cursor-pointer transition-all duration-200"
                        />
                      );
                    })
                  )}
                </svg>

                {/* Center Content / Tooltip Display */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2 pointer-events-none">
                  {activeHoverCategory ? (
                    <div className="animate-in fade-in zoom-in-95 duration-100 max-w-[105px] px-1">
                      <span
                        className="text-[8.5px] font-extrabold uppercase tracking-wider block truncate"
                        style={{ color: activeHoverCategory.color }}
                      >
                        {activeHoverCategory.label}
                      </span>
                      <span className="text-xl font-extrabold text-[#092342] leading-tight my-0.5 block">
                        {activeHoverCategory.count} {isEn ? 'files' : 'dossiers'}
                      </span>
                      <span className="text-[9px] font-bold text-[#0c685a] block truncate">
                        {activeHoverCategory.pct}% (€{activeHoverCategory.valueEur.toLocaleString()})
                      </span>
                    </div>
                  ) : (
                    <div className="max-w-[96px] px-1 flex flex-col items-center justify-center">
                      <span className="text-[8.5px] font-bold uppercase tracking-wider text-slate-400 block">
                        {isEn ? 'TOTAL VOLUME' : 'VOLUME TOTAL'}
                      </span>
                      <span className="text-2xl font-extrabold text-[#092342] leading-none my-0.5 block">
                        {totalBreakdownCount}
                      </span>
                      <span className="text-[8px] font-semibold text-[#0c685a] block leading-tight max-w-[85px] mx-auto">
                        {isEn ? 'Hover or click to audit' : 'Survoler ou cliquer'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Clickable Legend List */}
            <div className="space-y-2 text-xs">
              {serviceCategories.map((item, idx) => (
                <div
                  key={item.label}
                  onMouseEnter={() => setHoveredSegment(idx)}
                  onMouseLeave={() => setHoveredSegment(null)}
                  onClick={() =>
                    setSelectedBreakdownService({
                      name: item.label,
                      color: item.color,
                      records: item.items,
                      pct: item.pct,
                      valueEur: item.valueEur,
                    })
                  }
                  className={`flex items-center justify-between p-1.5 rounded-xl cursor-pointer transition ${
                    hoveredSegment === idx ? 'bg-slate-100' : 'hover:bg-slate-50'
                  }`}
                  title={isEn ? 'Click to inspect detailed records' : 'Cliquer pour voir les dossiers'}
                >
                  <div className="flex items-center gap-2 text-slate-700 min-w-0">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="truncate max-w-[170px] font-medium">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-slate-400 text-[11px]">({item.count})</span>
                    <span className="font-extrabold text-[#092342]">{item.pct}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <button
              onClick={() => onNavigate('ecoles')}
              className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#092342] hover:text-[#0c685a] transition cursor-pointer"
            >
              <span>Explore Academic Partner Directory (Lyon)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Detail Modal for Clicked Donut Segment */}
      {selectedBreakdownService && (
        <ServiceBreakdownDetailModal
          serviceName={selectedBreakdownService.name}
          serviceColor={selectedBreakdownService.color}
          records={selectedBreakdownService.records}
          totalRecordsCount={totalBreakdownCount}
          percentage={selectedBreakdownService.pct}
          totalValueEur={selectedBreakdownService.valueEur}
          isEn={isEn}
          onClose={() => setSelectedBreakdownService(null)}
          onOpenRecord={(record) => {
            setSelectedBreakdownService(null);
            if (record.sourceModule === 'demandes') {
              onSelectDemande(record.ref);
              onNavigate('demandes');
            } else if (record.sourceModule === 'candidats') {
              onNavigate('candidats');
            } else if (record.sourceModule === 'avi') {
              onNavigate('avi');
            } else if (record.sourceModule === 'accommodation') {
              onNavigate('accommodation');
            }
          }}
        />
      )}

      {/* Detail Modal for Clicked Volume Data Point */}
      {selectedVolumeBucket && (
        <VolumeBreakdownDetailModal
          isOpen={Boolean(selectedVolumeBucket)}
          periodLabel={selectedVolumeBucket.label}
          intakeLabel={
            (isEn
              ? ACADEMIC_INTAKE_OPTIONS.find((o) => o.id === cohortLabel)?.labelEn
              : ACADEMIC_INTAKE_OPTIONS.find((o) => o.id === cohortLabel)?.labelFr) || cohortLabel
          }
          hubLabel={
            selectedHub === 'cd'
              ? '🇨🇩 Democratic Republic of Congo (DRC Hub)'
              : selectedHub === 'cg'
              ? '🇨🇬 Republic of Congo (Congo-Brazzaville Hub)'
              : '🇨🇩 & 🇨🇬 All Recruitment Hubs (DRC & Congo)'
          }
          records={selectedVolumeBucket.records}
          isEn={isEn}
          onClose={() => setSelectedVolumeBucket(null)}
          onOpenRecord={(record) => {
            setSelectedVolumeBucket(null);
            if (record.sourceModule === 'demandes') {
              onSelectDemande(record.ref);
              onNavigate('demandes');
            } else if (record.sourceModule === 'candidats') {
              onNavigate('candidats');
            } else if (record.sourceModule === 'prospects') {
              onNavigate('prospects');
            }
          }}
        />
      )}

      {/* Priority Action Tasks and Filtered Application Records Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Applications Feed */}
        <div className="lg:col-span-8 rounded-2xl border border-[#e6eef6] bg-white p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#092342]">
                Incoming Student Applications
              </h2>
              <p className="text-xs text-slate-500">
                Filtered by intake: <strong>{cohortLabel}</strong>
              </p>
            </div>
            <div className="relative w-48">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search dossiers..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:bg-white"
              />
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {visibleDemandes.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No application records found matching intake: {cohortLabel}
              </div>
            ) : (
              visibleDemandes.map((d) => (
                <div
                  key={d.id}
                  onClick={() => onSelectDemande(d.ref)}
                  className="py-3 flex items-center justify-between hover:bg-slate-50 px-2 rounded-xl cursor-pointer transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{d.flag || '🇨🇩'}</span>
                    <div>
                      <div className="text-xs font-bold text-[#092342] flex items-center gap-2">
                        <span>{d.full_name}</span>
                        <span className="font-mono text-[10px] text-slate-400 font-normal">
                          {d.ref}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">{d.program}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <span className="rounded-full bg-[#f1f6fb] px-2.5 py-0.5 text-[10.5px] font-bold text-[#0c685a]">
                      {d.status}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                      {d.expected_start || d.submitted_at || '2026'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Priority Action Tasks Column */}
        <div className="lg:col-span-4 rounded-2xl border border-[#e6eef6] bg-white p-6 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-lg font-bold text-[#092342]">Priority Tasks</h2>
              <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700">
                {urgentTasksCount} Pending
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {priorityTasks.slice(0, 4).map((task) => (
                <div
                  key={task.id}
                  className={`p-3 rounded-xl border transition ${
                    task.completed
                      ? 'border-slate-100 bg-slate-50 opacity-60'
                      : 'border-[#e4edf7] bg-[#f4f8fc]'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      checked={Boolean(task.completed)}
                      onChange={() => onToggleTask(task.id)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#0c685a] focus:ring-[#0c685a] cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3
                          className={`text-xs font-extrabold text-[#092342] leading-snug ${
                            task.completed ? 'line-through text-slate-400' : ''
                          }`}
                        >
                          {task.title}
                        </h3>
                        <span
                          className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                            task.priority === 'Urgent'
                              ? 'bg-[#fee2e2] text-red-700'
                              : 'bg-[#e0ecff] text-[#1e40af]'
                          }`}
                        >
                          {task.priority}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                        {task.description}
                      </p>
                      <button
                        onClick={() => onNavigate(task.target_module || 'demandes')}
                        className="mt-2 inline-flex items-center gap-1 text-[11px] font-extrabold text-[#0c685a] hover:underline cursor-pointer"
                      >
                        <span>{task.action_label}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-500">
              {completedTasksCount} / {priorityTasks.length} tasks completed
            </span>
            <button
              onClick={onResetTasks}
              className="font-extrabold text-[#0c685a] hover:underline text-[11.5px] cursor-pointer"
            >
              Reset All Tasks
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
