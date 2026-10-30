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
  lang = 'en',
  userRole,
  userName,
  currentUser,
}: OverviewScreenProps) {
  const isEn = lang === 'en';
  const [resolvedUserName, setResolvedUserName] = useState<string>(
    userName || currentUser?.name || ''
  );

  useEffect(() => {
    if (userName) {
      setResolvedUserName(userName);
    } else if (currentUser?.name) {
      setResolvedUserName(currentUser.name);
    } else if (typeof window !== 'undefined') {
      try {
        const savedUserStr = localStorage.getItem('liec_user');
        if (savedUserStr) {
          const u = JSON.parse(savedUserStr);
          if (u?.name) setResolvedUserName(u.name);
        }
      } catch {}
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

  return (
    <div className="space-y-6">
      {/* Top Welcome / Hero Banner */}
      <div className="rounded-2xl border border-[#def2ec] bg-gradient-to-r from-[#eefaf6] via-[#f3faf9] to-[#eef6fc] p-6 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2.5 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#d8f6ea] px-2.5 py-0.5 font-semibold text-[#0c685a]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#10b981]" />
              Active Subproduction Session
            </span>
            <span className="text-slate-400">Updated in real-time</span>
          </div>
          <h1 className="text-[28px] sm:text-[31px] font-extrabold tracking-tight text-[#092342] leading-[1.18]">
            {resolvedUserName ? (
              <>
                {resolvedUserName}, {isEn ? 'welcome back to your' : 'bienvenue dans votre'}
                <br />
                {isEn ? 'LIEC Workspace!' : 'espace LIEC !'}
              </>
            ) : (
              <>
                {isEn ? 'Welcome back to your' : 'Bienvenue dans votre'}
                <br />
                {isEn ? 'LIEC Workspace!' : 'espace LIEC !'}
              </>
            )}
          </h1>
          <p className="text-[13.5px] text-slate-600 leading-relaxed">
            Monitor incoming applications, prospect pipeline, candidate files, and cohorts for the 2026–2027 academic sessions.
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
            <div className="text-2xl font-extrabold text-[#092342]">{totalDemandesCount}</div>
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
            <div className="text-2xl font-extrabold text-[#092342]">{prospectsCount}</div>
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
            <div className="text-2xl font-extrabold text-[#092342]">{candidatsCount}</div>
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
            <div className="text-2xl font-extrabold text-[#092342]">{prepaCount}</div>
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
            <div className="text-2xl font-extrabold text-[#092342]">{intakeFilteredAvi.length}</div>
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
            <div className="text-2xl font-extrabold text-[#092342]">{urgentTasksCount}</div>
            <p className="text-[11px] font-semibold text-red-600 mt-0.5">
              Pending reviews
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Trend Chart + Right Interactive Donut Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Inquiry Trends */}
        <div className="lg:col-span-8 rounded-2xl border border-[#e6eef6] bg-white p-6 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-extrabold text-[#092342] leading-snug">
                  Applications & Inquiry Volume
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Dynamic volume tracked across DRC & Congo-Brazzaville recruitment hubs
                </p>
              </div>

              <div className="inline-flex rounded-xl border border-slate-200 bg-[#f1f6fb] p-1 text-xs font-bold text-slate-600">
                <button
                  onClick={() => setChartPeriod('week')}
                  className={`px-3 py-1 rounded-lg transition ${
                    chartPeriod === 'week' ? 'bg-white text-[#092342] shadow-xs' : 'hover:text-[#092342]'
                  }`}
                >
                  Weekly
                </button>
                <button
                  onClick={() => setChartPeriod('month')}
                  className={`px-3 py-1 rounded-lg transition ${
                    chartPeriod === 'month' ? 'bg-white text-[#092342] shadow-xs' : 'hover:text-[#092342]'
                  }`}
                >
                  Monthly
                </button>
              </div>
            </div>

            {/* SVG Trend Line Visual */}
            <div className="my-6">
              <svg viewBox="0 0 500 160" className="w-full h-36 overflow-visible">
                <defs>
                  <linearGradient id="trendGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#0c685a" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#0c685a" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Gridlines */}
                <line x1="0" y1="40" x2="500" y2="40" stroke="#f1f5f9" strokeDasharray="3 3" />
                <line x1="0" y1="80" x2="500" y2="80" stroke="#f1f5f9" strokeDasharray="3 3" />
                <line x1="0" y1="120" x2="500" y2="120" stroke="#f1f5f9" strokeDasharray="3 3" />

                {/* Area under curve */}
                <polygon
                  points="20,130 90,110 160,85 230,95 300,55 370,40 440,30 480,20 480,140 20,140"
                  fill="url(#trendGrad)"
                />

                {/* Curve line */}
                <polyline
                  points="20,130 90,110 160,85 230,95 300,55 370,40 440,30 480,20"
                  fill="none"
                  stroke="#0c685a"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Markers */}
                {[
                  { cx: 20, cy: 130, month: 'May' },
                  { cx: 90, cy: 110, month: 'Jun' },
                  { cx: 160, cy: 85, month: 'Jul' },
                  { cx: 230, cy: 95, month: 'Aug' },
                  { cx: 300, cy: 55, month: 'Sep' },
                  { cx: 370, cy: 40, month: 'Oct' },
                  { cx: 440, cy: 30, month: 'Nov' },
                  { cx: 480, cy: 20, month: 'Jan', active: true },
                ].map((pt, idx) => (
                  <g key={idx}>
                    <circle
                      cx={pt.cx}
                      cy={pt.cy}
                      r={pt.active ? 5 : 3.5}
                      className={pt.active ? 'fill-[#0c685a] stroke-white stroke-2' : 'fill-[#092342]'}
                    />
                    <text
                      x={pt.cx}
                      y="155"
                      textAnchor="middle"
                      className={`text-[10px] ${
                        pt.active ? 'fill-[#0c685a] font-bold' : 'fill-slate-400 font-medium'
                      }`}
                    >
                      {pt.month}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="font-bold text-[#0c685a] flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Session growth tracking on target across all academic intakes</span>
            </div>
            <button
              onClick={() => onNotify('Exporting session intake summary...')}
              className="inline-flex items-center gap-1.5 font-bold text-[#092342] hover:text-[#0c685a] transition cursor-pointer"
            >
              <span>Download Intake Audit</span>
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right Column: Interactive Breakdown by Service Donut Chart */}
        <div className="lg:col-span-4 rounded-2xl border border-[#e6eef6] bg-white p-6 shadow-card flex flex-col justify-between relative overflow-hidden">
          <div>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-[#092342] leading-snug">
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
            <div className="my-5 flex flex-col items-center">
              <div className="relative w-48 h-48 flex items-center justify-center">
                <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                  {/* Background Track */}
                  <circle
                    cx="60"
                    cy="60"
                    r="44"
                    fill="none"
                    stroke="#f1f5f9"
                    strokeWidth="14"
                  />

                  {/* Dynamic Segments */}
                  {totalBreakdownCount === 0 ? (
                    <circle
                      cx="60"
                      cy="60"
                      r="44"
                      fill="none"
                      stroke="#e2e8f0"
                      strokeWidth="14"
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
                          strokeWidth={isHovered ? 18 : 14}
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
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-3 pointer-events-none">
                  {activeHoverCategory ? (
                    <div className="animate-in fade-in zoom-in-95 duration-100">
                      <span
                        className="text-[9px] font-extrabold uppercase tracking-wider block truncate max-w-[110px]"
                        style={{ color: activeHoverCategory.color }}
                      >
                        {activeHoverCategory.label}
                      </span>
                      <span className="text-xl font-extrabold text-[#092342] leading-tight my-0.5 block">
                        {activeHoverCategory.count} files
                      </span>
                      <span className="text-[10px] font-bold text-[#0c685a] block">
                        {activeHoverCategory.pct}% (€{activeHoverCategory.valueEur.toLocaleString()})
                      </span>
                    </div>
                  ) : (
                    <div>
                      <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">
                        TOTAL VOLUME
                      </span>
                      <span className="text-2xl font-extrabold text-[#092342] leading-none my-0.5 block">
                        {totalBreakdownCount}
                      </span>
                      <span className="text-[10px] font-bold text-[#0c685a]">
                        Hover or Click to Audit
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

      {/* Priority Action Tasks and Filtered Application Records Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Applications Feed */}
        <div className="lg:col-span-8 rounded-2xl border border-[#e6eef6] bg-white p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-[#092342]">
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
              <h2 className="text-lg font-extrabold text-[#092342]">Priority Tasks</h2>
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
