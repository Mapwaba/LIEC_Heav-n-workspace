'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';

import { Lang } from './ServicesAndOtherScreens';

interface OverviewScreenProps {
  demandes: any[];
  priorityTasks: any[];
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
  const [resolvedUserName, setResolvedUserName] = useState<string>(userName || currentUser?.name || '');

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
  const [cohortLabel, setCohortLabel] = useState('September 2025 Intake');
  const [searchFilter, setSearchFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Use dashboard-specific recent entries first
  const dashboardDemandes = [
    ...demandes.filter((d) => d.is_dashboard_recent),
    ...demandes.filter((d) => !d.is_dashboard_recent),
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

  const extraAddedCount = Math.max(0, demandes.length - 11);
  const totalDemandesCount = 142 + extraAddedCount;
  const newDemandesCount = 14 + extraAddedCount;

  const formatDisplayRef = (ref: string) => ref.replace(/-[A-Z]$/, '');

  return (
    <div className="space-y-6">
      {/* Top Welcome / Hero Banner */}
      <div className="rounded-2xl border border-[#def2ec] bg-gradient-to-r from-[#eefaf6] via-[#f3faf9] to-[#eef6fc] p-6 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2.5 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#d8f6ea] px-2.5 py-0.5 font-semibold text-[#0c685a]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#10b981]" />
              Active Session
            </span>
            <span className="text-slate-400">Updated 8m ago</span>
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
            Monitor incoming applications, prospect pipeline, candidate files, and cohorts for the 2025–2026 academic year.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-2.5 shrink-0">
          <div className="relative">
            <select
              value={cohortLabel}
              onChange={(e) => setCohortLabel(e.target.value)}
              className="appearance-none rounded-xl border border-slate-200 bg-white pl-9 pr-9 py-2 text-xs font-semibold text-[#092342] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0c685a]/20 cursor-pointer"
            >
              <option>September 2025 Intake</option>
              <option>Fall 2025 Session</option>
              <option>January 2026 Intake</option>
            </select>
            <Calendar className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none">
              ▼
            </span>
          </div>

          {/* "+ New Application" button: Visible ONLY to admin and secretary roles (hidden for Officer AVI) */}
          {(userRole === 'admin' || userRole === 'secretary') && (
            <button
              onClick={onOpenNewDemande}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0c6358] hover:bg-[#094f46] text-white font-semibold text-xs px-5 py-2.5 shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              {isEn ? '+ Record New Student Application' : '+ Nouvelle Demande Candidat'}
            </button>
          )}
        </div>
      </div>

      {/* 6 KPI Stat Cards Row */}
      <div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
          {/* Card 1 */}
          <div
            onClick={() => onNavigate('demandes')}
            className="cursor-pointer rounded-2xl border border-[#e6eef6] bg-white p-4 shadow-card hover:border-slate-300 transition flex flex-col justify-between"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-[11.5px] font-medium text-slate-500 leading-snug">
                Received
                <br />
                Applications
              </span>
              <span className="h-8 w-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                <Inbox className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold text-[#092342]">{totalDemandesCount}</span>
              <span className="text-[11px] font-bold text-[#0c685a] inline-flex items-center">
                ↗ +18%
              </span>
            </div>
            <p className="mt-2 text-[11px] font-medium text-slate-500">2025 Cohort Total</p>
          </div>

          {/* Card 2 (Highlighted Green Top Border) */}
          <div
            onClick={() => onNavigate('demandes')}
            className="cursor-pointer rounded-2xl border border-[#ccece2] border-t-[3px] border-t-[#10b981] bg-white p-4 shadow-card hover:shadow-md transition flex flex-col justify-between"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-[11.5px] font-semibold text-[#0c685a] leading-snug">
                New
                <br />
                Applications
              </span>
              <span className="h-8 w-8 rounded-lg bg-[#e0f8ef] text-[#0c685a] flex items-center justify-center shrink-0">
                <MailCheck className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-2xl font-extrabold text-[#0c685a]">{newDemandesCount}</span>
              <span className="rounded-md bg-[#ccf5e5] px-2 py-0.5 text-[10px] font-bold text-[#0a6354]">
                Priority
              </span>
            </div>
            <p className="mt-2 text-[11px] font-semibold text-slate-600 leading-tight">
              Under 24h response time
            </p>
          </div>

          {/* Card 3 */}
          <div
            onClick={() => onNavigate('prospects')}
            className="cursor-pointer rounded-2xl border border-[#e6eef6] bg-white p-4 shadow-card hover:border-slate-300 transition flex flex-col justify-between"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-[11.5px] font-medium text-slate-500 leading-snug">
                Prospects to
                <br />
                Contact
              </span>
              <span className="h-8 w-8 rounded-lg bg-[#edf4fb] text-[#092342] flex items-center justify-center shrink-0">
                <Users className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold text-[#092342]">38</span>
              <span className="text-[10.5px] font-medium text-slate-500 leading-tight">
                Scheduled
                <br />
                Follow-ups
              </span>
            </div>
            <p className="mt-2 text-[11px] font-medium text-slate-500">Active CRM outreach</p>
          </div>

          {/* Card 4 */}
          <div
            onClick={() => onNavigate('candidats')}
            className="cursor-pointer rounded-2xl border border-[#e6eef6] bg-white p-4 shadow-card hover:border-slate-300 transition flex flex-col justify-between"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-[11.5px] font-medium text-slate-500 leading-snug">
                Active
                <br />
                Candidates
              </span>
              <span className="h-8 w-8 rounded-lg bg-[#edf4fb] text-[#092342] flex items-center justify-center shrink-0">
                <GraduationCap className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold text-[#092342]">56</span>
              <span className="text-[10.5px] font-bold text-[#0c685a] leading-tight">
                Campus
                <br />
                France
              </span>
            </div>
            <p className="mt-2 text-[11px] font-medium text-slate-500 leading-tight">
              University files
            </p>
          </div>

          {/* Card 5 */}
          <div
            onClick={() => onNavigate('prepa')}
            className="cursor-pointer rounded-2xl border border-[#e6eef6] bg-white p-4 shadow-card hover:border-slate-300 transition flex flex-col justify-between"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-[11.5px] font-medium text-slate-500 leading-snug">
                PREPA
                <br />
                Enrolments
              </span>
              <span className="h-8 w-8 rounded-lg bg-[#fef4d6] text-[#b87c08] flex items-center justify-center shrink-0">
                <Award className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-3 flex items-center gap-1.5">
              <span className="text-2xl font-extrabold text-[#092342]">24</span>
              <span className="rounded bg-[#fef4d6] px-1.5 py-0.5 text-[9.5px] font-bold text-[#b87c08] leading-tight">
                Kinshasa
                <br />& Lyon
              </span>
            </div>
            <p className="mt-2 text-[11px] font-medium text-slate-500">Capacity: 30 seats</p>
          </div>

          {/* Card 6 */}
          <div
            onClick={() => onNavigate('rapports')}
            className="cursor-pointer rounded-2xl border border-[#e6eef6] bg-white p-4 shadow-card hover:border-slate-300 transition flex flex-col justify-between"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-[11.5px] font-medium text-slate-500 leading-snug">
                Conversion
                <br />
                Rate
              </span>
              <span className="h-8 w-8 rounded-lg bg-[#e2f7ef] text-[#0c685a] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-2xl font-extrabold text-[#092342]">39.4%</span>
              <span className="text-[10.5px] font-bold text-[#0c685a]">↑ +3.2%</span>
            </div>
            <p className="mt-2 text-[11px] font-medium text-slate-500 leading-tight">
              vs previous cohort
            </p>
          </div>
        </div>

        <div className="mt-1.5 flex justify-end items-center gap-1 text-[10.5px] italic text-slate-400">
          <Info className="w-3 h-3" />
          <span>Illustrative metrics from demonstration environment</span>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Chart: Monthly Flow of Applications & Admissions */}
        <div className="lg:col-span-8 rounded-2xl border border-[#e6eef6] bg-white p-6 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-lg font-extrabold text-[#092342] leading-snug">
                    Monthly Inflow of Applications
                    <br className="hidden sm:inline" /> & Admissions
                  </h2>
                  <span className="rounded-lg bg-[#edf4fb] px-2.5 py-1 text-[10.5px] font-bold text-[#092342]">
                    6 Months
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Comparative volume between initial inquiries and confirmed admissions
                </p>
              </div>

              <div className="inline-flex rounded-xl bg-[#f1f6fb] p-1 self-start">
                <button
                  onClick={() => setChartPeriod('week')}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition ${
                    chartPeriod === 'week'
                      ? 'bg-white text-[#092342] shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Weekly View
                </button>
                <button
                  onClick={() => setChartPeriod('month')}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition ${
                    chartPeriod === 'month'
                      ? 'bg-white text-[#092342] shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Monthly View
                </button>
              </div>
            </div>

            {/* Legend */}
            <div className="mt-4 flex items-center gap-6 text-xs font-semibold">
              <div className="flex items-center gap-2 text-slate-700">
                <span className="h-2.5 w-2.5 rounded-full bg-[#0c685a]" />
                <span>Received Applications</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <span className="h-2.5 w-2.5 rounded-full bg-[#092342]" />
                <span>Admissions & Visas Approved</span>
              </div>
            </div>

            {/* SVG Dual Line & Area Chart */}
            <div className="mt-5 relative">
              <svg viewBox="0 0 640 220" className="w-full h-52 overflow-visible">
                <defs>
                  <linearGradient id="tealArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0c685a" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#0c685a" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="navyArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#092342" stopOpacity="0.14" />
                    <stop offset="100%" stopColor="#092342" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Grid Lines */}
                {[
                  { y: 25, label: '150' },
                  { y: 75, label: '100' },
                  { y: 125, label: '50' },
                  { y: 175, label: '0' },
                ].map((line) => (
                  <g key={line.label}>
                    <text
                      x="26"
                      y={line.y + 4}
                      textAnchor="end"
                      className="fill-slate-400 text-[10px]"
                    >
                      {line.label}
                    </text>
                    <line
                      x1="40"
                      y1={line.y}
                      x2="615"
                      y2={line.y}
                      stroke="#eef3f8"
                      strokeWidth="1"
                    />
                  </g>
                ))}

                {/* Area Fills */}
                <path
                  d={
                    chartPeriod === 'month'
                      ? 'M 60 144 C 120 132, 150 120, 170 116 C 220 100, 250 92, 280 84 C 330 74, 360 68, 390 62 C 440 50, 470 43, 500 38 C 550 32, 580 28, 600 26 L 600 175 L 60 175 Z'
                      : 'M 60 138 C 120 122, 150 112, 170 108 C 220 96, 250 88, 280 79 C 330 68, 360 62, 390 55 C 440 46, 470 39, 500 34 C 550 29, 580 25, 600 22 L 600 175 L 60 175 Z'
                  }
                  fill="url(#tealArea)"
                />
                <path
                  d="M 60 164 C 120 156, 150 150, 170 147 C 220 136, 250 130, 280 124 C 330 114, 360 108, 390 103 C 440 90, 470 84, 500 79 C 550 70, 580 65, 600 61 L 600 175 L 60 175 Z"
                  fill="url(#navyArea)"
                />

                {/* Teal Curve */}
                <path
                  d={
                    chartPeriod === 'month'
                      ? 'M 60 144 C 120 132, 150 120, 170 116 C 220 100, 250 92, 280 84 C 330 74, 360 68, 390 62 C 440 50, 470 43, 500 38 C 550 32, 580 28, 600 26'
                      : 'M 60 138 C 120 122, 150 112, 170 108 C 220 96, 250 88, 280 79 C 330 68, 360 62, 390 55 C 440 46, 470 39, 500 34 C 550 29, 580 25, 600 22'
                  }
                  fill="none"
                  stroke="#0c685a"
                  strokeWidth="2.6"
                />

                {/* Navy Curve */}
                <path
                  d="M 60 164 C 120 156, 150 150, 170 147 C 220 136, 250 130, 280 124 C 330 114, 360 108, 390 103 C 440 90, 470 84, 500 79 C 550 70, 580 65, 600 61"
                  fill="none"
                  stroke="#092342"
                  strokeWidth="2.4"
                />

                {/* Data Points */}
                {[
                  { x: 60, y1: 144, y2: 164, month: 'May' },
                  { x: 170, y1: 116, y2: 147, month: 'Jun' },
                  { x: 280, y1: 84, y2: 124, month: 'Jul' },
                  { x: 390, y1: 62, y2: 103, month: 'Aug' },
                  { x: 500, y1: 38, y2: 79, month: 'Sep' },
                  { x: 590, y1: 27, y2: 63, month: 'Oct', active: true },
                ].map((pt) => (
                  <g key={pt.month}>
                    <circle
                      cx={pt.x}
                      cy={pt.y1}
                      r={pt.active ? 5 : 4}
                      className="fill-[#0c685a] stroke-white stroke-2"
                    />
                    <circle
                      cx={pt.x}
                      cy={pt.y2}
                      r={pt.active ? 5 : 4}
                      className="fill-[#092342] stroke-white stroke-2"
                    />
                    <text
                      x={pt.x}
                      y="198"
                      textAnchor="middle"
                      className={`text-[11px] ${
                        pt.active ? 'fill-[#0c685a] font-bold' : 'fill-slate-500 font-medium'
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
              <span>Overall conversion rate steadily growing (+14.5% over the semester)</span>
            </div>
            <button
              onClick={() =>
                onNotify('Downloading eligibility audit report (LIEC-Audit-2025.xls)...')
              }
              className="inline-flex items-center gap-1.5 font-bold text-[#092342] hover:text-[#0c685a] transition"
            >
              <span>Download Eligibility Audit .XLS</span>
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right Chart: Breakdown by Service */}
        <div className="lg:col-span-4 rounded-2xl border border-[#e6eef6] bg-white p-6 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-[#092342] leading-snug">
                  Breakdown by
                  <br />
                  Service
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Total categorized inquiry volume
                </p>
              </div>
              <button
                onClick={() => onNavigate('services')}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>

            {/* SVG Donut Chart */}
            <div className="my-5 flex justify-center">
              <div className="relative w-44 h-44 flex items-center justify-center">
                <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                  {/* Track */}
                  <circle
                    cx="60"
                    cy="60"
                    r="44"
                    fill="none"
                    stroke="#f1f5f9"
                    strokeWidth="14"
                  />
                  {/* Segment 1: 35% Sky Blue (#0ea5e9) */}
                  <circle
                    cx="60"
                    cy="60"
                    r="44"
                    fill="none"
                    stroke="#0284c7"
                    strokeWidth="14"
                    strokeDasharray="96.7 276.4"
                    strokeDashoffset="0"
                  />
                  {/* Segment 2: 28% Deep Teal (#0b5d51) */}
                  <circle
                    cx="60"
                    cy="60"
                    r="44"
                    fill="none"
                    stroke="#0b5d51"
                    strokeWidth="14"
                    strokeDasharray="77.4 276.4"
                    strokeDashoffset="-96.7"
                  />
                  {/* Segment 3: 22% Emerald (#10b981) */}
                  <circle
                    cx="60"
                    cy="60"
                    r="44"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="14"
                    strokeDasharray="60.8 276.4"
                    strokeDashoffset="-174.1"
                  />
                  {/* Segment 4: 11% Amber Gold (#f4be37) */}
                  <circle
                    cx="60"
                    cy="60"
                    r="44"
                    fill="none"
                    stroke="#f4be37"
                    strokeWidth="14"
                    strokeDasharray="30.4 276.4"
                    strokeDashoffset="-234.9"
                  />
                  {/* Segment 5: 4% Slate (#cbd5e1) */}
                  <circle
                    cx="60"
                    cy="60"
                    r="44"
                    fill="none"
                    stroke="#cbd5e1"
                    strokeWidth="14"
                    strokeDasharray="11.1 276.4"
                    strokeDashoffset="-265.3"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">
                    TOTAL
                  </span>
                  <span className="text-2xl font-extrabold text-[#092342] leading-none my-0.5">
                    {totalDemandesCount}
                  </span>
                  <span className="text-[10px] font-bold text-[#0c685a]">100% processed</span>
                </div>
              </div>
            </div>

            {/* Breakdown List */}
            <div className="space-y-2.5 text-xs">
              {[
                { label: 'Academic Orientation & Guidance', pct: '35%', color: 'bg-[#0284c7]' },
                { label: 'University Application Support', pct: '28%', color: 'bg-[#0b5d51]' },
                { label: 'LIEC-France PREPA Training', pct: '22%', color: 'bg-[#10b981]' },
                { label: 'Family Consulting & Advisory', pct: '11%', color: 'bg-[#f4be37]' },
                { label: 'Other Inquiries & Visas', pct: '4%', color: 'bg-slate-300' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-slate-600">
                    <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                    <span>{item.label}</span>
                  </div>
                  <span className="font-extrabold text-[#092342]">{item.pct}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 text-center">
            <button
              onClick={() => onNavigate('ecoles')}
              className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#092342] hover:text-[#0c685a] transition"
            >
              <span>Explore Academic Partner Directory (Lyon)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 3 Highlight Info Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => onNavigate('candidats')}
          className="cursor-pointer rounded-2xl border border-[#e6eef6] bg-white p-3.5 shadow-card hover:border-slate-300 transition flex items-center gap-3.5"
        >
          <img
            src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=160&auto=format&fit=crop&q=80"
            alt="Campus France"
            className="h-14 w-14 rounded-xl object-cover shrink-0"
          />
          <div className="min-w-0">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#0c685a]">
              CAMPUS FRANCE
            </div>
            <h3 className="text-sm font-extrabold text-[#092342] truncate">
              Intake Session Open
            </h3>
            <p className="text-xs text-slate-500 truncate">
              Etudes en France pipeline synchronized
            </p>
          </div>
        </div>

        <div
          onClick={() => onNavigate('prepa')}
          className="cursor-pointer rounded-2xl border border-[#e6eef6] bg-white p-3.5 shadow-card hover:border-slate-300 transition flex items-center gap-3.5"
        >
          <img
            src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=160&auto=format&fit=crop&q=80"
            alt="PREPA Kinshasa"
            className="h-14 w-14 rounded-xl object-cover shrink-0"
          />
          <div className="min-w-0">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#092342]">
              PREPA KINSHASA & BRAZZAVILLE
            </div>
            <h3 className="text-sm font-extrabold text-[#092342] truncate">
              Oral Interviews D-4
            </h3>
            <p className="text-xs text-slate-500 truncate">
              18 candidates scheduled for Lyon entrance tests
            </p>
          </div>
        </div>

        <div
          onClick={() => onNavigate('avi')}
          className="cursor-pointer rounded-2xl border border-[#e6eef6] bg-white p-3.5 shadow-card hover:border-slate-300 transition flex items-center gap-3.5"
        >
          <img
            src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=160&auto=format&fit=crop&q=80"
            alt="Visa & AVI Desk"
            className="h-14 w-14 rounded-xl object-cover shrink-0"
          />
          <div className="min-w-0">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#d99b16]">
              VISA & AVI DESK (150€ LIEC)
            </div>
            <h3 className="text-sm font-extrabold text-[#092342] truncate">
              Visa Issuance: 100%
            </h3>
            <p className="text-xs text-slate-500 truncate">
              0 rejections across AVI-certified cohorts
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Row: Latest Received Applications + Priority Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Table Card: Latest Received Applications */}
        <div className="lg:col-span-8 rounded-2xl border border-[#e6eef6] bg-white p-6 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-extrabold text-[#092342]">Latest Received Applications</h2>
                <p className="text-xs text-slate-500">
                  Real-time CRM stream from student web forms and school partner channels
                </p>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => {
                    setSearchFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Filter by name, ref, country..."
                  className="w-full rounded-xl bg-[#f1f6fb] pl-8 pr-3 py-2 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0c685a]/20"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-y border-slate-100 bg-[#f8fafc] text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-3">REF</th>
                    <th className="py-3 px-3">CANDIDATE</th>
                    <th className="py-3 px-3">COUNTRY</th>
                    <th className="py-3 px-3">TARGET PROGRAM & SCHOOL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {visibleDemandes.map((dem, idx) => {
                    const badgePalette =
                      idx % 4 === 1
                        ? 'bg-[#6ee7b7]/40 text-[#095247]'
                        : idx % 4 === 2
                        ? 'bg-sky-100 text-sky-900'
                        : idx % 4 === 3
                        ? 'bg-blue-100 text-blue-900'
                        : 'bg-slate-200 text-[#092342]';

                    return (
                      <tr
                        key={dem.ref}
                        onClick={() => {
                          onSelectDemande(dem.ref);
                          onNavigate('demandes');
                        }}
                        className="hover:bg-[#f8fbff] cursor-pointer transition"
                      >
                        <td className="py-3.5 px-3 font-extrabold text-[#092342] leading-tight">
                          {formatDisplayRef(dem.ref)
                            .split('-')
                            .map((part: string, i: number) => (
                              <span key={i} className="block">
                                {i < 2 ? `${part}-` : part}
                              </span>
                            ))}
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-3">
                            <span
                              className={`h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-extrabold shrink-0 ${badgePalette}`}
                            >
                              {dem.initials}
                            </span>
                            <div className="min-w-0">
                              <div className="font-bold text-[#092342] truncate">
                                {dem.full_name}
                              </div>
                              <div className="text-[11px] text-slate-400 truncate">{dem.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="inline-flex items-center gap-1.5 text-slate-700 font-medium">
                            <span>{dem.flag}</span>
                            <span>{dem.country_name}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-slate-600 font-medium">{dem.program}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="mt-5 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
            <span>
              Showing 1 to {visibleDemandes.length} of {totalDemandesCount} entries
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              {[1, 2, 3].map((p) => (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  className={`h-7 w-7 rounded-lg text-xs font-bold transition ${
                    currentPage === p
                      ? 'bg-[#092342] text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {p}
                </button>
              ))}
              <span className="px-1 text-slate-400">...</span>
              <button
                onClick={() => setCurrentPage(1)}
                className="h-7 w-7 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                12
              </button>
              <button
                onClick={() => setCurrentPage((p) => (p < 3 ? p + 1 : 1))}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel: Priority Actions */}
        <div className="lg:col-span-4 rounded-2xl border border-[#e6eef6] bg-white p-6 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-600 shrink-0" />
                <h2 className="text-lg font-extrabold text-[#092342] leading-tight">
                  Priority
                  <br />
                  Actions
                </h2>
              </div>
              <span className="rounded-xl bg-[#fee2e2] px-2.5 py-1 text-[10.5px] font-extrabold text-red-700 leading-tight text-center">
                {urgentTasksCount}
                <br />
                urgent
              </span>
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              To be addressed within hours by the advisory team
            </p>

            <div className="mt-4 space-y-3">
              {priorityTasks.map((task) => (
                <div
                  key={task.id}
                  className={`rounded-xl border p-3.5 transition ${
                    task.completed
                      ? 'border-slate-200 bg-slate-50/70 opacity-65'
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
                        className="mt-2 inline-flex items-center gap-1 text-[11px] font-extrabold text-[#0c685a] hover:underline"
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
              className="font-extrabold text-[#0c685a] hover:underline text-[11.5px]"
            >
              Reset All Tasks
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
