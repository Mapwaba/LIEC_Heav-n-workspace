'use client';

import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  Printer,
  FileSpreadsheet,
  Archive,
  RefreshCw,
  Search,
  Filter,
  Eye,
  ShieldCheck,
  TrendingUp,
  FileText,
  UserCheck,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface CandidateJourney {
  ref: string;
  full_name: string;
  email: string;
  country: string;
  nationality: string;
  program: string;
  adviser: string;
  application_year: string;
  qualified_at: string | null;
  qualification_status: string;
  procedure_status: string;
  progress_pct: number;
  stage_badge: string;
  school_name: string;
  admission_status: string;
  visa_status: 'Not Applied' | 'In Preparation' | 'Submitted' | 'Obtained' | 'Refused' | 'Withdrawn';
  visa_submission_date?: string | null;
  visa_decision_date?: string | null;
  visa_outcome_notes?: string | null;
  documents_purged: boolean;
  retention_status: string;
  retention_deadline?: string | null;
  jalons: any[];
  timeline: Array<{
    timestamp: string;
    author: string;
    activity_type: string;
    details: string;
  }>;
}

interface ReportSummary {
  intake_year: string;
  mode: 'live' | 'finalised';
  cutoff_date: string | null;
  generated_at: string;
  generated_by: string;
  total_candidates: number;
  qualified_count: number;
  requires_review_count: number;
  admissions_admitted: number;
  admissions_pending: number;
  admissions_refused: number;
  admission_rate_pct: number;
  visa_obtained: number;
  visa_refused: number;
  visa_submitted_pending: number;
  visa_in_preparation: number;
  visa_not_applied: number;
  visa_withdrawn: number;
  visa_decided_count: number;
  visa_success_rate_pct: number;
  retention_purged_count: number;
  retention_active_count: number;
  retention_due_count: number;
  retention_review_count: number;
}

export default function ProgrammeReportsScreen({
  currentUser,
}: {
  currentUser?: { name: string; email: string; business_profile: string } | null;
}) {
  const [intakeYear, setIntakeYear] = useState('2027–2028');
  const [mode, setMode] = useState<'live' | 'finalised'>('live');
  const [cutoffDate, setCutoffDate] = useState('2026-09-30');
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [journeys, setJourneys] = useState<CandidateJourney[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [visaFilter, setVisaFilter] = useState('ALL');
  const [selectedStudent, setSelectedStudent] = useState<CandidateJourney | null>(null);

  // Snapshot modal
  const [archivedSnapshots, setArchivedSnapshots] = useState<any[]>([]);
  const [showSnapshotsModal, setShowSnapshotsModal] = useState(false);
  const [savingSnapshot, setSavingSnapshot] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    setSaveSuccessMsg(null);
    try {
      const params = new URLSearchParams({
        intake: intakeYear,
        mode,
      });
      if (mode === 'finalised' && cutoffDate) {
        params.append('cutoff_date', cutoffDate);
      }
      const res = await fetch(`/api/programme-reports?${params.toString()}`, {
        headers: {
          'x-user-email': currentUser?.email || 'bmapwabantoro@liecconsulting.com',
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate programme report.');
      }
      setSummary(data.summary);
      setJourneys(data.studentJourneys || []);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Error generating report.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSnapshots = async () => {
    try {
      const res = await fetch('/api/programme-reports?snapshots=true', {
        headers: {
          'x-user-email': currentUser?.email || 'bmapwabantoro@liecconsulting.com',
        },
      });
      const data = await res.json();
      if (res.ok && data.snapshots) {
        setArchivedSnapshots(data.snapshots);
      }
    } catch (e) {
      console.error('Error fetching snapshots:', e);
    }
  };

  useEffect(() => {
    fetchReport();
    fetchSnapshots();
  }, [intakeYear, mode, cutoffDate]);

  const handleSaveSnapshot = async () => {
    if (!summary) return;
    setSavingSnapshot(true);
    try {
      const res = await fetch('/api/programme-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': currentUser?.email || 'bmapwabantoro@liecconsulting.com',
        },
        body: JSON.stringify({
          intake_year: intakeYear,
          cutoff_date: cutoffDate,
          mode: 'finalised',
          summary,
          student_count: journeys.length,
          report_title: `LIEC Heav'n — Academic Intake ${intakeYear} Report (Cutoff: ${cutoffDate})`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save snapshot');
      setSaveSuccessMsg(`Report successfully archived (Snapshot #${data.snapshot_id})`);
      fetchSnapshots();
    } catch (err: any) {
      alert(err.message || 'Error archiving snapshot');
    } finally {
      setSavingSnapshot(false);
    }
  };

  // Export to Excel / CSV
  const handleExportCSV = () => {
    if (!journeys.length) return;
    const headers = [
      'Ref',
      'Student Full Name',
      'Country',
      'Nationality',
      'Academic Program',
      'Target School',
      'Intake Year',
      'Qualified At',
      'Qualification Status',
      'Admission Status',
      'Visa Status',
      'Visa Submission Date',
      'Visa Decision Date',
      'Visa Outcome Notes',
      'Retention Status',
      'Documents Purged',
    ];

    const rows = journeys.map((j) => [
      `"${j.ref}"`,
      `"${j.full_name}"`,
      `"${j.country}"`,
      `"${j.nationality}"`,
      `"${j.program}"`,
      `"${j.school_name}"`,
      `"${j.application_year}"`,
      `"${j.qualified_at || 'REQUIRES_REVIEW'}"`,
      `"${j.qualification_status}"`,
      `"${j.admission_status}"`,
      `"${j.visa_status}"`,
      `"${j.visa_submission_date || ''}"`,
      `"${j.visa_decision_date || ''}"`,
      `"${(j.visa_outcome_notes || '').replace(/"/g, '""')}"`,
      `"${j.retention_status}"`,
      `"${j.documents_purged ? 'YES' : 'NO'}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `LIEC_Academic_Intake_${intakeYear}_Report_${mode}_${new Date().toISOString().substring(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Journeys
  const filteredJourneys = journeys.filter((j) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      j.full_name.toLowerCase().includes(q) ||
      j.ref.toLowerCase().includes(q) ||
      j.email.toLowerCase().includes(q) ||
      j.program.toLowerCase().includes(q);

    const matchesVisa =
      visaFilter === 'ALL' ||
      (visaFilter === 'OBTAINED' && j.visa_status === 'Obtained') ||
      (visaFilter === 'REFUSED' && j.visa_status === 'Refused') ||
      (visaFilter === 'PENDING' && (j.visa_status === 'Submitted' || j.visa_status === 'In Preparation')) ||
      (visaFilter === 'NOT_APPLIED' && j.visa_status === 'Not Applied');

    return matchesSearch && matchesVisa;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-800">
      {/* Top Banner & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-900 text-white rounded-xl shadow-md">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                Academic Intake Programme Reports
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 uppercase tracking-wider">
                  Admissions & Visas
                </span>
              </h1>
              <p className="text-sm text-slate-500">
                Official institutional reporting on academic recruitment, qualification, admissions, and visa outcomes.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons: Export & Snapshot */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-sm transition"
            title="Executive PDF Print View"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            Print / PDF
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-sm transition"
            title="Download full candidate dataset as CSV/Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Export Excel (.csv)
          </button>
          {archivedSnapshots.length > 0 && (
            <button
              onClick={() => setShowSnapshotsModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-sm transition"
            >
              <Archive className="w-4 h-4 text-purple-600" />
              Snapshots ({archivedSnapshots.length})
            </button>
          )}
          <button
            onClick={fetchReport}
            className="p-2 text-slate-600 hover:text-blue-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Control Bar: Intake Selector & Mode Switcher */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Intake Selector */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold uppercase text-slate-500 tracking-wider">
            Academic Intake:
          </label>
          <select
            value={intakeYear}
            onChange={(e) => setIntakeYear(e.target.value)}
            className="text-sm font-semibold text-blue-950 bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-600 focus:outline-none"
          >
            <option value="2027–2028">Intake 2027–2028 (Active Academic Year)</option>
            <option value="2026–2027">Intake 2026–2027</option>
            <option value="2025–2026">Intake 2025–2026</option>
            <option value="ALL">All Recorded Intakes</option>
          </select>
        </div>

        {/* Dual Mode Switcher */}
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-medium">
            <button
              onClick={() => setMode('live')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
                mode === 'live'
                  ? 'bg-white text-blue-900 font-semibold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-blue-700" />
              Live Progress Monitoring
            </button>
            <button
              onClick={() => setMode('finalised')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
                mode === 'finalised'
                  ? 'bg-white text-blue-900 font-semibold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-amber-700" />
              Finalised Cutoff Report
            </button>
          </div>

          {mode === 'finalised' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Cutoff:</span>
              <input
                type="date"
                value={cutoffDate}
                onChange={(e) => setCutoffDate(e.target.value)}
                className="text-xs font-medium border border-slate-300 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
              <button
                onClick={handleSaveSnapshot}
                disabled={savingSnapshot}
                className="text-xs font-medium px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-md shadow-sm transition disabled:opacity-50"
              >
                {savingSnapshot ? 'Archiving...' : 'Archive Snapshot'}
              </button>
            </div>
          )}
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{saveSuccessMsg}</span>
          </div>
          <button
            onClick={() => setSaveSuccessMsg(null)}
            className="text-xs font-semibold text-emerald-700 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Mode Banner */}
      {mode === 'live' ? (
        <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Live Progress Mode Active:</span> Provides continuous, on-demand intake tracking throughout the academic recruitment campaign. Pending visa submissions are actively monitored as in-flight cases, rather than treated as premature negative outcomes.
          </div>
        </div>
      ) : (
        <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-950 flex items-start gap-2.5">
          <Calendar className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Finalised Cutoff Mode Active:</span> Locks candidate procedure milestones and visa outcomes strictly as of <span className="font-bold">{cutoffDate}</span>. Archiving stores an immutable audit-backed snapshot for annual regulatory compliance and institutional records.
          </div>
        </div>
      )}

      {/* Executive KPI Scorecard */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Cohort Volume & Qualification */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">
                Total Intake Cohort
              </span>
              <UserCheck className="w-5 h-5 text-blue-600" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900">
                {summary.total_candidates}
              </span>
              <span className="text-xs text-slate-500">students</span>
            </div>
            <div className="mt-2 text-xs text-slate-600 flex flex-col gap-1 border-t border-slate-100 pt-2">
              <div className="flex justify-between">
                <span>Qualified Students:</span>
                <span className="font-semibold text-emerald-700">{summary.qualified_count}</span>
              </div>
              {summary.requires_review_count > 0 && (
                <div className="flex justify-between text-amber-700" title="Historical records requiring qualification audit">
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Requires Review:
                  </span>
                  <span className="font-semibold">{summary.requires_review_count}</span>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Partner School Admissions */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">
                School Admissions
              </span>
              <GraduationCap className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-indigo-950">
                {summary.admissions_admitted}
              </span>
              <span className="text-xs text-slate-500">
                / {summary.admissions_admitted + summary.admissions_pending + summary.admissions_refused} evaluated
              </span>
            </div>
            <div className="mt-2 text-xs text-slate-600 flex flex-col gap-1 border-t border-slate-100 pt-2">
              <div className="flex justify-between">
                <span>Admission Rate:</span>
                <span className="font-semibold text-indigo-700">{summary.admission_rate_pct}%</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>In Evaluation / Pending:</span>
                <span>{summary.admissions_pending}</span>
              </div>
            </div>
          </div>

          {/* Card 3: Visa Outcomes Breakdown */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">
                Consular Visa Decisions
              </span>
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-emerald-700">
                {summary.visa_obtained}
              </span>
              <span className="text-xs text-slate-500">visas granted</span>
            </div>
            <div className="mt-2 text-xs text-slate-600 flex flex-col gap-1 border-t border-slate-100 pt-2">
              <div className="flex justify-between">
                <span>Refused:</span>
                <span className="font-semibold text-red-600">{summary.visa_refused}</span>
              </div>
              <div className="flex justify-between text-amber-700">
                <span>Submitted (Pending):</span>
                <span className="font-semibold">{summary.visa_submitted_pending}</span>
              </div>
            </div>
          </div>

          {/* Card 4: Strict Visa Success Rate KPI */}
          <div className="bg-gradient-to-br from-blue-900 to-slate-900 rounded-xl p-5 text-white shadow-md relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-blue-200 tracking-wider">
                Visa Success Rate
              </span>
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-4xl font-black text-emerald-400">
                {summary.visa_decided_count > 0 ? `${summary.visa_success_rate_pct}%` : 'N/A'}
              </span>
            </div>
            <div className="mt-2 text-[11px] text-blue-200 border-t border-blue-800/80 pt-2">
              <div className="font-mono text-[10px] text-blue-300">
                Obtained / (Obtained + Refused)
              </div>
              <div className="mt-0.5 text-slate-300">
                {summary.visa_decided_count > 0
                  ? `${summary.visa_obtained} of ${summary.visa_decided_count} decided cases (${summary.visa_submitted_pending} in-flight pending)`
                  : `0 decided applications (${summary.visa_submitted_pending} in-flight pending)`}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Funnel Progress Steps */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
        <h3 className="text-xs font-semibold uppercase text-slate-500 tracking-wider mb-4">
          Cohort Milestones Pipeline
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="text-[11px] font-semibold text-slate-500 uppercase">Jalon 1</div>
            <div className="text-sm font-bold text-slate-900 mt-1">Orientation & Dossier</div>
            <div className="text-xs text-slate-600 mt-2 flex justify-between">
              <span>Completed / In Progress:</span>
              <span className="font-semibold text-blue-900">{summary?.total_candidates || 0}</span>
            </div>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="text-[11px] font-semibold text-slate-500 uppercase">Jalon 2</div>
            <div className="text-sm font-bold text-slate-900 mt-1">Pièces & TCF</div>
            <div className="text-xs text-slate-600 mt-2 flex justify-between">
              <span>Verified Documents:</span>
              <span className="font-semibold text-indigo-900">{summary?.qualified_count || 0}</span>
            </div>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="text-[11px] font-semibold text-slate-500 uppercase">Jalon 3</div>
            <div className="text-sm font-bold text-slate-900 mt-1">Campus France & Écoles</div>
            <div className="text-xs text-slate-600 mt-2 flex justify-between">
              <span>Admissions Received:</span>
              <span className="font-semibold text-emerald-700">{summary?.admissions_admitted || 0}</span>
            </div>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="text-[11px] font-semibold text-slate-500 uppercase">Jalon 4</div>
            <div className="text-sm font-bold text-slate-900 mt-1">Visa & Hébergement</div>
            <div className="text-xs text-slate-600 mt-2 flex justify-between">
              <span>Visas Obtained:</span>
              <span className="font-semibold text-emerald-700">{summary?.visa_obtained || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Student Journey Master Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Controls */}
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search student name, ref, program..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Filter className="w-3.5 h-3.5" />
              <span>Visa Outcome:</span>
            </div>
            <select
              value={visaFilter}
              onChange={(e) => setVisaFilter(e.target.value)}
              className="text-xs font-medium border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="ALL">All Outcomes</option>
              <option value="OBTAINED">Visa Obtained</option>
              <option value="REFUSED">Visa Refused</option>
              <option value="PENDING">Pending Consular Decision</option>
              <option value="NOT_APPLIED">Not Applied</option>
            </select>
          </div>
        </div>

        {/* Master Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/70 text-slate-600 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Program & School</th>
                <th className="py-3 px-4">Qualified At</th>
                <th className="py-3 px-4">Admission</th>
                <th className="py-3 px-4">Visa Status</th>
                <th className="py-3 px-4">Decision Date</th>
                <th className="py-3 px-4">Document Retention</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredJourneys.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No student records found matching current criteria.
                  </td>
                </tr>
              ) : (
                filteredJourneys.map((student) => {
                  return (
                    <tr key={student.ref} className="hover:bg-slate-50/70 transition">
                      {/* Student */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{student.full_name}</div>
                        <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                          <span>{student.ref}</span>
                          <span>•</span>
                          <span>{student.country}</span>
                        </div>
                      </td>

                      {/* Program */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800 truncate max-w-[220px]" title={student.program}>
                          {student.school_name}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[220px]">
                          {student.program}
                        </div>
                      </td>

                      {/* Qualified At */}
                      <td className="py-3 px-4">
                        {student.qualified_at ? (
                          <div>
                            <div className="font-medium text-slate-800">
                              {new Date(student.qualified_at).toLocaleDateString()}
                            </div>
                            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-semibold">
                              Verified
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded font-semibold">
                              Requires Review
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Admission */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            student.admission_status === 'Admitted'
                              ? 'bg-emerald-100 text-emerald-800'
                              : student.admission_status === 'Refused'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {student.admission_status}
                        </span>
                      </td>

                      {/* Visa Status */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            student.visa_status === 'Obtained'
                              ? 'bg-emerald-100 text-emerald-800'
                              : student.visa_status === 'Refused'
                              ? 'bg-red-100 text-red-800'
                              : student.visa_status === 'Submitted'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {student.visa_status === 'Obtained' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                          {student.visa_status === 'Refused' && <XCircle className="w-3 h-3 text-red-600" />}
                          {student.visa_status === 'Submitted' && <Clock className="w-3 h-3 text-amber-600" />}
                          {student.visa_status}
                        </span>
                      </td>

                      {/* Decision Date */}
                      <td className="py-3 px-4 text-slate-600 font-medium">
                        {student.visa_decision_date || student.visa_submission_date || '—'}
                      </td>

                      {/* Document Retention */}
                      <td className="py-3 px-4">
                        {student.documents_purged ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
                            <ShieldCheck className="w-3 h-3 text-slate-400" />
                            Purged
                          </span>
                        ) : student.visa_status === 'Obtained' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">
                            Eligible Early Purge
                          </span>
                        ) : student.retention_status.includes('days') ? (
                          <span className="text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full font-medium">
                            {student.retention_status}
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-medium">
                            {student.retention_status}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedStudent(student)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-md transition"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-700" />
                          View Journey
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Chronological Journey Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-blue-950 to-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-xs uppercase tracking-wider text-blue-300 font-semibold">
                  Chronological Student Journey
                </span>
                <h3 className="text-xl font-bold mt-0.5">{selectedStudent.full_name}</h3>
                <div className="text-xs text-blue-200 font-mono mt-0.5">
                  Ref: {selectedStudent.ref} • {selectedStudent.country} ({selectedStudent.nationality})
                </div>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="p-1 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-sm">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase">Academic Program</div>
                  <div className="font-semibold text-slate-900 mt-0.5">{selectedStudent.school_name}</div>
                  <div className="text-xs text-slate-600 truncate">{selectedStudent.program}</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase">Visa Outcome</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        selectedStudent.visa_status === 'Obtained'
                          ? 'bg-emerald-100 text-emerald-800'
                          : selectedStudent.visa_status === 'Refused'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {selectedStudent.visa_status}
                    </span>
                  </div>
                  {selectedStudent.visa_decision_date && (
                    <div className="text-xs text-slate-500 mt-1">
                      Decision: {selectedStudent.visa_decision_date}
                    </div>
                  )}
                </div>
              </div>

              {/* Document Retention & Qualification Box */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="text-xs font-bold text-slate-700 uppercase flex items-center justify-between">
                  <span>Document Retention Compliance</span>
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500">Qualification Date: </span>
                    <span className="font-semibold text-slate-800">
                      {selectedStudent.qualified_at ? new Date(selectedStudent.qualified_at).toLocaleDateString() : 'Unverified (Review Required)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Purge Status: </span>
                    <span className="font-semibold text-slate-800">
                      {selectedStudent.documents_purged ? 'Permanently Purged' : 'Active / Retention Period'}
                    </span>
                  </div>
                </div>
                {selectedStudent.retention_deadline && !selectedStudent.documents_purged && (
                  <div className="text-xs text-slate-600 pt-1 border-t border-slate-200">
                    11-Month Deadline: <span className="font-semibold">{new Date(selectedStudent.retention_deadline).toLocaleDateString()}</span> ({selectedStudent.retention_status})
                  </div>
                )}
              </div>

              {/* Chronological Timeline */}
              <div>
                <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-3">
                  Chronological Event Stream
                </h4>
                <div className="border-l-2 border-slate-200 ml-3 space-y-4">
                  {selectedStudent.timeline.length === 0 ? (
                    <div className="text-xs text-slate-400 pl-4 py-2">No historical events recorded.</div>
                  ) : (
                    selectedStudent.timeline.map((event, idx) => (
                      <div key={idx} className="relative pl-5">
                        <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-blue-900 border-2 border-white shadow-sm" />
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs font-bold text-slate-800">{event.activity_type}</span>
                          <span className="text-[11px] text-slate-400">{event.timestamp}</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">{event.details}</p>
                        <div className="text-[10px] text-slate-400 mt-0.5">Author: {event.author}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedStudent(null)}
                className="px-4 py-2 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition"
              >
                Close Journey
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Snapshots Archive Modal */}
      {showSnapshotsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-5 bg-gradient-to-r from-purple-950 to-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Archived Programme Report Snapshots</h3>
                <p className="text-xs text-purple-200">Permanent, immutable report snapshots archived by LIEC Administration.</p>
              </div>
              <button
                onClick={() => setShowSnapshotsModal(false)}
                className="p-1 text-slate-300 hover:text-white rounded-lg hover:bg-white/10"
              >
                ✕
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-3">
              {archivedSnapshots.map((snap) => (
                <div key={snap.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{snap.report_title}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Intake: {snap.intake_year} • Cutoff: {snap.cutoff_date || 'N/A'} • Finalised: {new Date(snap.finalised_at).toLocaleString()}
                    </div>
                    <div className="text-xs text-slate-600 mt-1 flex items-center gap-3">
                      <span>Students: {snap.total_candidates}</span>
                      <span>Visas: {snap.visa_obtained} granted / {snap.visa_refused} refused</span>
                      <span className="font-semibold text-emerald-700">Success Rate: {snap.visa_success_rate_pct}%</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200">
                    Archived
                  </span>
                </div>
              ))}
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowSnapshotsModal(false)}
                className="px-4 py-2 text-xs font-medium bg-slate-900 text-white rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
