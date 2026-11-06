'use client';

import React, { useState, useMemo } from 'react';
import {
  Kanban,
  List,
  UserPlus,
  UserCheck,
  Contact,
  Bell,
  FileCheck2,
  ShieldCheck,
  Clock,
  Search,
  Compass,
  ArrowUpDown,
  Download,
  RotateCw,
  PlusCircle,
  CheckCircle2,
  Mail,
  MessageSquare,
  Sliders,
  Calendar,
  Video,
  Phone,
  FileText,
  Send,
  FileSignature,
  CreditCard,
  Edit3,
  MoreVertical,
} from 'lucide-react';

import { Lang } from './ServicesAndOtherScreens';
import { AssignAdvisorModal, ManualStatusOverrideModal } from './DemandesModals';
import { AlertTriangle, Tag } from 'lucide-react';
import {
  ScheduleCallModal,
  EditProspectModal,
  ProspectCommentsModal,
  ProspectProfileModal,
  RecordFirstContactModal,
  RecordEligibilityModal,
  QualifyProspectModal,
  ProspectItem,
} from './ProspectCardModals';

interface ProspectsScreenProps {
  prospects: any[];
  staffList?: { name: string; email?: string; title?: string }[];
  currentUser?: any;
  userRole?: string;
  onAddProspect: (data: any) => Promise<void>;
  onMoveProspect: (id: number, stage: string) => Promise<void>;
  onRefresh: () => void;
  onNotify: (msg: string) => void;
  lang?: Lang;
}

const STAGES = [
  {
    key: 'nouveau',
    label: 'New Lead',
    dot: 'bg-[#092342]',
    badgeBg: 'bg-[#dce7f5] text-[#092342]',
  },
  {
    key: 'premier_contact',
    label: 'First Contact',
    dot: 'bg-[#0c685a]',
    badgeBg: 'bg-[#ccf5e5] text-[#0c685a]',
  },
  {
    key: 'diagnostic',
    label: 'Eligibility Check',
    dot: 'bg-[#f59e0b]',
    badgeBg: 'bg-[#fde6b8] text-[#92400e]',
  },
  {
    key: 'qualifie',
    label: 'Qualified',
    dot: 'bg-[#092342]',
    badgeBg: 'bg-[#dce7f5] text-[#092342]',
  },
];


const formatProspectBadge = (badge: string) => {
  if (!badge) return badge;
  const trimmed = badge.trim();
  const lower = trimmed.toLowerCase();
  if (lower === 'nouveau web' || lower === 'nouveau' || lower === 'new web') return 'New Web';
  if (lower === "aujourd'hui" || lower === 'aujourd’hui' || lower === 'auj.' || lower === 'auj' || lower === 'today') return 'Today';
  return badge;
};

const formatProspectLocation = (loc: string) => {
  if (!loc) return loc;
  return loc.replace(/\bRDC\b/g, 'DRC').replace(/\bCongo \(RDC\)\b/g, 'Congo (DRC)');
};

const formatProspectTime = (meta: string) => {
  if (!meta) return meta;
  if (meta === "À l'instant" || meta === "A l'instant") return 'Just now';
  if (meta === "Aujourd'hui" || meta === "Aujourd’hui") return 'Today';
  return meta;
};

export default function ProspectsScreen({
  prospects,
  staffList = [],
  currentUser = 'Barthelemy MAPWABA NTORO',
  userRole = 'admin',
  onAddProspect,
  onMoveProspect,
  onRefresh,
  onNotify,
  lang = 'en',
}: ProspectsScreenProps) {
  const isEn = lang === 'en';

  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [adviserFilter, setAdviserFilter] = useState('all');
  const [quickFilter, setQuickFilter] = useState<'all' | 'urgent' | 'prepa'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProspectStage, setNewProspectStage] = useState('nouveau');
  const [formName, setFormName] = useState('');
  const [formCountry, setFormCountry] = useState('RDC');
  const [formCity, setFormCity] = useState('Kinshasa');
  const [formProgram, setFormProgram] = useState('MyDigitalSchool Lyon — Dév. Web & UX/UI');
  const [formAdviser, setFormAdviser] = useState(
    staffList[0]?.name || 'Barthelemy MAPWABA NTORO'
  );
  const [formUrgent, setFormUrgent] = useState(false);

  // Modal interaction states for prospect cards
  const [selectedProspectForProfile, setSelectedProspectForProfile] =
    useState<ProspectItem | null>(null);
  const [selectedProspectForCall, setSelectedProspectForCall] =
    useState<ProspectItem | null>(null);
  const [selectedProspectForEdit, setSelectedProspectForEdit] =
    useState<ProspectItem | null>(null);
  const [selectedProspectForComments, setSelectedProspectForComments] =
    useState<ProspectItem | null>(null);
  const [selectedProspectForContact, setSelectedProspectForContact] =
    useState<any | null>(null);
  const [selectedProspectForEligibility, setSelectedProspectForEligibility] =
    useState<any | null>(null);
  const [selectedProspectForQualify, setSelectedProspectForQualify] =
    useState<any | null>(null);
  const [checkedIds, setCheckedIds] = useState<number[]>([]);
  const [isRefreshingPipeline, setIsRefreshingPipeline] = useState(false);

  const handleAdvanceCard = (card: any) => {
    if (card.stage === 'nouveau') {
      setSelectedProspectForContact(card);
    } else if (card.stage === 'premier_contact') {
      setSelectedProspectForEligibility(card);
    } else if (card.stage === 'diagnostic') {
      setSelectedProspectForQualify(card);
    } else {
      onNotify(isEn ? 'Prospect is already qualified!' : 'Prospect déjà qualifié !');
    }
  };

  const handleRefreshPipeline = async () => {
    if (isRefreshingPipeline) return;
    setIsRefreshingPipeline(true);
    try {
      if (onRefresh) {
        await onRefresh();
      }
      if (onNotify) {
        onNotify(
          isEn
            ? 'Prospects CRM pipeline refreshed from database.'
            : 'Pipeline CRM actualisé depuis la base de données.'
        );
      }
    } catch {
      if (onNotify) {
        onNotify(
          isEn ? 'Failed to refresh CRM pipeline.' : "Erreur lors de l'actualisation du pipeline CRM."
        );
      }
    } finally {
      setTimeout(() => setIsRefreshingPipeline(false), 500);
    }
  };

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isOverriding, setIsOverriding] = useState(false);

  const canOverride = (userRole || '').toLowerCase() === 'admin';

  // Active advisors resolved from staff directory
  const formattedStaffList = (staffList.length > 0
    ? staffList
    : [{ name: 'Barthelemy MAPWABA NTORO', email: 'bmapwabantoro@liecconsulting.com', title: 'Managing Director' }]
  ).map((s) => ({
    name: s.name,
    email: s.email || `${s.name.toLowerCase().replace(/\s+/g, '.')}@liecconsulting.com`,
    title: s.title || 'Admissions Advisor',
  }));

  const activeAdvisors = formattedStaffList;

  const currentUserName =
    (typeof currentUser === 'string' ? currentUser : currentUser?.name) || 'Barthelemy MAPWABA NTORO';
  const currentUserEmail =
    (typeof currentUser === 'string' ? '' : currentUser?.email) || 'bmapwabantoro@liecconsulting.com';

  // Safe normalization of prospects list
  const safeProspects = Array.isArray(prospects) ? prospects.filter(Boolean) : [];

  // Filtered prospects computed with useMemo BEFORE being referenced
  const filteredProspects = useMemo(() => {
    return safeProspects.filter((p) => {
      if (!p) return false;
      const q = (searchQuery || '').toLowerCase().trim();
      const matchSearch =
        !q ||
        (p.full_name && p.full_name.toLowerCase().includes(q)) ||
        (p.country_city && p.country_city.toLowerCase().includes(q)) ||
        (p.program_tag && p.program_tag.toLowerCase().includes(q));

      const matchAdviser =
        adviserFilter === 'all' ||
        (p.adviser_name && p.adviser_name.toLowerCase().includes(adviserFilter.toLowerCase()));

      const matchQuick =
        quickFilter === 'all' ||
        (quickFilter === 'urgent' && p.is_urgent) ||
        (quickFilter === 'prepa' && p.is_prepa);

      return matchSearch && matchAdviser && matchQuick;
    });
  }, [safeProspects, searchQuery, adviserFilter, quickFilter]);

  const toggleSelectProspect = (id: number) => {
    setCheckedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const allFilteredChecked =
    filteredProspects.length > 0 && filteredProspects.every((p) => checkedIds.includes(p.id));

  const toggleSelectAll = () => {
    if (allFilteredChecked) {
      setCheckedIds([]);
    } else {
      setCheckedIds(filteredProspects.map((p) => p.id));
    }
  };

  const handleBulkAssign = async (advisorName: string, adviserEmail: string, notes?: string) => {
    if (checkedIds.length === 0) return;
    setIsAssigning(true);
    try {
      const res = await fetch('/api/prospects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign_advisor',
          ids: checkedIds,
          adviserName,
          adviserEmail,
          notes,
          actor: currentUserName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Assignment failed');
      let notifyMsg = isEn ? `Assigned ${data.assignedCount} prospect(s) to ${advisorName}.` : `${data.assignedCount} prospect(s) attribué(s) à ${advisorName}.`;
      if (data.emailSent) {
        notifyMsg += isEn ? ` Official notification sent via ${data.emailProvider || 'Resend'}.` : ` Notification envoyée via ${data.emailProvider || 'Resend'}.`;
      } else if (data.emailError) {
        notifyMsg += isEn ? ` Warning: email delivery failed (${data.emailError}).` : ` Attention : échec d'envoi d'email (${data.emailError}).`;
      }
      onNotify(notifyMsg);
      setCheckedIds([]);
      onRefresh();
    } finally {
      setIsAssigning(false);
    }
  };

  const handleAssignToMyself = async () => {
    if (checkedIds.length === 0) return;
    await handleBulkAssign(currentUserName, currentUserEmail, isEn ? 'Auto-assigned to myself from CRM toolbar' : 'Auto-attribué depuis la barre d’actions CRM');
  };

  const handleBulkOverride = async (newStatus: string, reason: string, notes?: string) => {
    if (checkedIds.length === 0) return;
    setIsOverriding(true);
    try {
      const res = await fetch('/api/prospects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'manual_status_override',
          ids: checkedIds,
          stage: newStatus,
          reason,
          notes,
          actor: currentUserName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Override failed');
      onNotify(isEn ? `Status override applied to ${data.count} prospect(s).` : `Dérogation de statut appliquée à ${data.count} prospect(s).`);
      setCheckedIds([]);
      onRefresh();
    } finally {
      setIsOverriding(false);
    }
  };

  const handleCreateProspect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;
    await onAddProspect({
      full_name: formName.trim(),
      stage: newProspectStage,
      flag: formCountry === 'RDC' ? '🇨🇩' : '🇨🇬',
      country_city: `${formCountry} (${formCity})`,
      program_tag: formProgram,
      adviser_name: formAdviser || activeAdvisors[0]?.name,
      is_urgent: formUrgent,
      is_prepa: formProgram.includes('PREPA') || formProgram.includes('ISCOM'),
    });
    setFormName('');
    setShowAddModal(false);
    onRefresh();
  };

  const getNextStage = (current: string) => {
    const order = ['nouveau', 'premier_contact', 'diagnostic', 'qualifie'];
    const idx = order.indexOf(current);
    return order[Math.min(order.length - 1, idx + 1)];
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs mb-1">
            <span className="rounded-full bg-[#d8f6ea] px-2.5 py-0.5 font-extrabold text-[#0c685a] uppercase">
              ACQUISITION & MENTORSHIP
            </span>
            <span className="text-slate-500 font-medium">• Academic Session 2026–2027</span>
          </div>
          <h1 className="text-[28px] sm:text-[32px] font-extrabold tracking-tight text-[#092342] leading-[1.15]">
            Prospects & CRM
            <br />
            Pipeline
          </h1>
          <p className="mt-2 text-sm text-slate-500 max-w-xl">
            Track student and family advisory workflows from initial discovery contact through to contract signing.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-xl border border-slate-200 bg-[#f1f6fb] p-1">
            <button
              onClick={() => setViewMode('kanban')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-extrabold transition ${
                viewMode === 'kanban'
                  ? 'bg-white text-[#092342] shadow-sm'
                  : 'text-slate-600 hover:text-[#092342]'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Pipeline Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-extrabold transition ${
                viewMode === 'table'
                  ? 'bg-white text-[#092342] shadow-sm'
                  : 'text-slate-600 hover:text-[#092342]'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Table View</span>
            </button>
          </div>

          <button
            onClick={() => {
              setNewProspectStage('nouveau');
              setShowAddModal(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-[#092342] hover:bg-[#153a70] text-white px-5 py-2.5 text-xs font-extrabold shadow-sm transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-[#5eead4]" />
            <span>+ Add Prospect to Pipeline</span>
          </button>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="rounded-2xl border border-[#e6eef6] bg-white p-4 shadow-card relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-600 leading-tight block">
                TOTAL ACTIVE
                <br />
                PROSPECTS
              </span>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-[#092342]">
                  {prospects.length}
                </span>
                <span className="text-xs font-bold text-[#0c685a]">CRM Live</span>
              </div>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-[#e6eef9] text-[#092342] flex items-center justify-center shrink-0">
              <Contact className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between text-[11px] mb-1.5">
              <span className="text-slate-500 font-medium">Active Pipeline</span>
              <span className="font-extrabold text-[#092342]">{activeAdvisors.length} Advisors</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#092342]"
                style={{ width: `${Math.min(100, prospects.length > 0 ? (prospects.length / 50) * 100 : 0)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="rounded-2xl border border-[#e6eef6] bg-white p-4 shadow-card relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-[#6b4604] leading-tight block">
                PRIORITY
                <br />
                OUTREACH
              </span>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-[#452702]">
                  {prospects.filter((p) => p.is_urgent).length}
                </span>
                <span className="text-xs font-bold text-red-600 inline-flex items-center gap-0.5">
                  <Clock className="w-3 h-3" /> &lt; 24h
                </span>
              </div>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-[#fde9bd] text-[#92400e] flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between text-[11px] mb-1.5">
              <span className="text-slate-500 font-medium leading-tight">
                Urgent Follow-ups
              </span>
              <span className="font-extrabold text-red-600 text-right leading-tight">
                High Priority
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#f4be37]"
                style={{
                  width: `${prospects.length > 0 ? Math.min(100, (prospects.filter((p) => p.is_urgent).length / prospects.length) * 100) : 0}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Card 3 */}
        <div className="rounded-2xl border border-[#e6eef6] bg-white p-4 shadow-card relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-600 leading-tight block">
                ACTIVE DIAGNOSTICS
              </span>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-[#0c685a]">
                  {prospects.filter((p) => p.stage === 'diagnostic').length}
                </span>
                <span className="text-xs font-bold text-[#0c685a]">🔍 In Review</span>
              </div>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-[#99f6e4] text-[#0c685a] flex items-center justify-center shrink-0">
              <FileCheck2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between text-[11px] mb-1.5">
              <span className="text-slate-500 font-medium leading-tight">
                Grades &amp; Budget Check
              </span>
              <span className="font-extrabold text-[#0c685a] text-right leading-tight">
                Eligibility
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#0c685a]"
                style={{
                  width: `${prospects.length > 0 ? Math.min(100, (prospects.filter((p) => p.stage === 'diagnostic').length / prospects.length) * 100) : 0}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Card 4 */}
        <div className="rounded-2xl border border-[#e6eef6] bg-white p-4 shadow-card relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-600 leading-tight block">
                QUALIFIED
                <br />
                PREPA &amp; APPLICATION
              </span>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-[#092342]">
                  {prospects.filter((p) => p.stage === 'qualifie').length}
                </span>
                <span className="text-xs font-bold text-[#092342]">☆ Ready</span>
              </div>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-[#092342] text-white flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between text-[11px] mb-1.5">
              <span className="text-slate-500 font-medium leading-tight">
                Potential Value:
              </span>
              <span className="font-extrabold text-[#092342] text-right leading-tight">
                €{(prospects.filter((p) => p.stage === 'qualifie').length * 2800).toLocaleString()}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#092342]"
                style={{
                  width: `${prospects.length > 0 ? Math.min(100, (prospects.filter((p) => p.stage === 'qualifie').length / prospects.length) * 100) : 0}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar: Search + Dynamic Advisors + Filters */}
      <div className="rounded-2xl border border-[#e6eef6] bg-white p-4 shadow-card flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by name, country, city, program..."
              className="w-full rounded-xl border border-slate-200 bg-[#fbfcfd] pl-9 pr-4 py-2 text-xs font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0c685a]/20"
            />
          </div>

          {/* Dynamic Advisor Dropdown populated from Staff Table */}
          <div className="inline-flex items-center gap-2 rounded-xl bg-[#f1f6fb] px-3 py-2 text-xs text-slate-600">
            <Compass className="w-3.5 h-3.5 text-[#0c685a]" />
            <span>Advisor:</span>
            <select
              value={adviserFilter}
              onChange={(e) => setAdviserFilter(e.target.value)}
              className="bg-transparent font-extrabold text-[#092342] focus:outline-none cursor-pointer max-w-[200px] truncate"
            >
              <option value="all">
                All Active Advisors ({activeAdvisors.length})
              </option>
              {activeAdvisors.map((staff) => (
                <option key={staff.name} value={staff.name}>
                  {staff.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setQuickFilter('all')}
            className={`rounded-xl px-3.5 py-2 text-xs font-extrabold transition cursor-pointer ${
              quickFilter === 'all'
                ? 'bg-[#092342] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Leads ({prospects.length})
          </button>
          <button
            onClick={() => setQuickFilter('urgent')}
            className={`rounded-xl px-3.5 py-2 text-xs font-extrabold transition cursor-pointer ${
              quickFilter === 'urgent'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-red-50 text-red-700 hover:bg-red-100'
            }`}
          >
            Urgent (&lt; 24h)
          </button>
          <button
            onClick={() => setQuickFilter('prepa')}
            className={`rounded-xl px-3.5 py-2 text-xs font-extrabold transition cursor-pointer ${
              quickFilter === 'prepa'
                ? 'bg-[#0c685a] text-white shadow-xs'
                : 'bg-[#d8f6ea] text-[#0c685a] hover:bg-[#bcf0dc]'
            }`}
          >
            LIEC-France PREPA
          </button>
          <button
            type="button"
            disabled={isRefreshingPipeline}
            onClick={handleRefreshPipeline}
            className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition cursor-pointer disabled:opacity-50"
            title={isEn ? "Refresh Pipeline" : "Actualiser le pipeline"}
          >
            <RotateCw className={`w-4 h-4 ${isRefreshingPipeline ? 'animate-spin text-[#0c685a]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main View: Kanban or Table */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {STAGES.map((stage) => {
            const stageCards = filteredProspects.filter((p) => p.stage === stage.key);
            return (
              <div
                key={stage.key}
                className="rounded-2xl border border-[#e6eef6] bg-[#fbfcfd] p-3 flex flex-col space-y-3"
              >
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${stage.dot}`} />
                    <h3 className="text-xs font-extrabold text-[#092342] uppercase tracking-wider">
                      {stage.label}
                    </h3>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${stage.badgeBg}`}
                  >
                    {stageCards.length}
                  </span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto max-h-[70vh]">
                  {stageCards.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
                      No prospects in this stage
                    </div>
                  ) : (
                    stageCards.map((card, cardIdx) => {
                      const topBorderClass =
                        stage.key === 'nouveau' || stage.key === 'qualifie'
                          ? 'border-t-[3px] border-t-[#092342]'
                          : stage.key === 'premier_contact' && cardIdx === 0
                          ? 'border-t-[3px] border-t-[#10b981]'
                          : stage.key === 'premier_contact'
                          ? 'border-t-[3px] border-t-[#092342]'
                          : 'border-t-[3px] border-t-[#f4be37]';

                      const badgeClass =
                        card.badge_tone === 'urgent'
                          ? 'bg-[#fee2e2] text-red-700'
                          : card.badge_tone === 'amber'
                          ? 'bg-[#fde6b8] text-[#784e06]'
                          : card.badge_tone === 'gold'
                          ? 'bg-[#f8dca0] text-[#5c3a04]'
                          : 'bg-[#eaf1f9] text-[#092342]';

                      const adviserBadgeClass =
                        card.adviser_color === 'teal'
                          ? 'bg-[#0c685a] text-white'
                          : card.adviser_color === 'amber'
                          ? 'bg-[#784e06] text-white'
                          : 'bg-[#092342] text-white';

                      const isCallScheduled = card.meta_right && card.meta_right.includes('Call:');

                      return (
                        <div
                          key={card.id}
                          className={`rounded-2xl border border-[#e3edf7] ${topBorderClass} bg-white p-3.5 shadow-sm hover:shadow-md transition space-y-2.5`}
                        >
                          {/* Card Header: Clickable Name to open profile */}
                          <div className="flex items-start justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedProspectForProfile(card)}
                              className="text-[13px] font-extrabold text-[#092342] hover:text-[#0c685a] hover:underline text-left leading-snug cursor-pointer transition"
                              title="Click to view full prospect profile"
                            >
                              {card.full_name}
                            </button>
                            <span
                              className={`shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-extrabold leading-tight ${badgeClass}`}
                            >
                              {formatProspectBadge(card.badge_text)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <span>{card.flag}</span>
                            <span>{formatProspectLocation(card.country_city)}</span>
                          </div>

                          <div>
                            <span
                              className={`inline-block rounded-md px-2.5 py-0.5 text-[10.5px] font-extrabold ${
                                card.program_tag_tone === 'mint'
                                  ? 'bg-[#d8f6ea] text-[#0c685a]'
                                  : 'bg-[#edf3fb] text-[#092342]'
                              }`}
                            >
                              {card.program_tag}
                            </span>
                          </div>

                          {card.highlight_box && (
                            <div className="rounded-lg bg-[#f1f6fb] px-2.5 py-1.5 flex items-center gap-1.5 text-[11px] font-bold text-[#092342]">
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#0c685a] shrink-0" />
                              <span>{card.highlight_box}</span>
                            </div>
                          )}

                          {/* Middle row: Ingestion + Schedule a Call */}
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px]">
                            <span className="text-slate-600 font-medium inline-flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>{formatProspectTime(card.meta_left)}</span>
                            </span>

                            {/* Actionable Call Button (translated and functional) */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedProspectForCall(card);
                              }}
                              className={`inline-flex items-center gap-1 font-extrabold px-2 py-0.5 rounded-lg transition cursor-pointer ${
                                isCallScheduled
                                  ? 'bg-[#d8f6ea] text-[#0c685a] hover:bg-[#bcf0dc]'
                                  : 'bg-slate-100 text-[#092342] hover:bg-[#092342] hover:text-white'
                              }`}
                              title="Click to schedule or view call appointment"
                            >
                              <Phone className="w-3 h-3" />
                              <span className="truncate max-w-[130px]">
                                {isCallScheduled ? card.meta_right : 'Schedule a Call'}
                              </span>
                            </button>
                          </div>

                          {/* Card Footer: Advisor Info & Action Icons */}
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span
                                className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-extrabold ${adviserBadgeClass}`}
                              >
                                {card.adviser_initials}
                              </span>
                              <span className="text-[11px] font-bold text-[#092342] truncate max-w-[100px]">
                                {card.adviser_name}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 text-slate-400">
                              {/* Edit Pen Icon: Opens Edit Modal */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedProspectForEdit(card);
                                }}
                                title="Edit prospect record"
                                className="p-1 rounded hover:bg-slate-100 hover:text-[#092342] transition cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                              </button>

                              {/* Comment Icon: Opens Comments & Notes Modal */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedProspectForComments(card);
                                }}
                                title="Open & enter team comments"
                                className="p-1 rounded hover:bg-slate-100 hover:text-[#0c685a] transition cursor-pointer"
                              >
                                <MessageSquare className="w-3.5 h-3.5 text-slate-600" />
                              </button>

                              {/* Advance Stage / Milestone Action Icon */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAdvanceCard(card);
                                }}
                                title={
                                  card.stage === 'nouveau'
                                    ? (isEn ? 'Record First Contact Event' : 'Enregistrer le premier contact')
                                    : card.stage === 'premier_contact'
                                    ? (isEn ? 'Record Diagnostic Eligibility' : 'Enregistrer le diagnostic d’éligibilité')
                                    : card.stage === 'diagnostic'
                                    ? (isEn ? 'Verify 3 Conditions & Qualify' : 'Vérifier 3 conditions & Qualifier')
                                    : (isEn ? 'Qualified Candidate' : 'Candidat qualifié')
                                }
                                className="p-1 rounded hover:bg-slate-100 hover:text-[#092342] transition cursor-pointer"
                              >
                                {card.stage === 'qualifie' ? (
                                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                ) : card.stage === 'diagnostic' ? (
                                  <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                                ) : (
                                  <MoreVertical className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Add to stage button */}
                <button
                  onClick={() => {
                    setNewProspectStage(stage.key);
                    setShowAddModal(true);
                  }}
                  className="w-full rounded-xl border border-dashed border-slate-300 hover:border-[#092342] py-2 text-xs font-bold text-slate-500 hover:text-[#092342] flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>+ Add to this stage</span>
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View Mode */
        <div className="rounded-2xl border border-[#e6eef6] bg-white shadow-card overflow-hidden">
          {/* Bulk Action Toolbar */}
          <div className="px-4 py-3 bg-[#f3f8fd] border-b border-[#e6eef6] flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                checked={allFilteredChecked}
                onChange={toggleSelectAll}
                className="h-4 w-4 rounded border-slate-300 text-[#092342] focus:ring-[#092342] cursor-pointer"
              />
              <span className="font-extrabold text-[#092342]">
                {checkedIds.length} selected
              </span>
              <span className="text-slate-500">of {filteredProspects.length} prospects</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={checkedIds.length === 0 || isAssigning}
                onClick={() => setShowAssignModal(true)}
                title={
                  checkedIds.length === 0
                    ? (isEn ? 'Select at least one prospect to assign advisor' : 'Sélectionnez au moins un prospect')
                    : (isEn ? 'Assign advisor to selected prospects' : 'Attribuer un conseiller aux prospects sélectionnés')
                }
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition ${
                  checkedIds.length > 0
                    ? 'border-slate-200 bg-white text-[#092342] hover:bg-slate-50 shadow-2xs cursor-pointer'
                    : 'border-slate-200/60 bg-slate-50 text-slate-400 opacity-50 cursor-not-allowed'
                }`}
              >
                {isAssigning ? (
                  <RotateCw className="w-3.5 h-3.5 animate-spin text-[#0c685a]" />
                ) : (
                  <UserPlus className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span>+ Assign Advisor</span>
              </button>

              <button
                type="button"
                disabled={checkedIds.length === 0 || isAssigning}
                onClick={handleAssignToMyself}
                title={
                  checkedIds.length === 0
                    ? (isEn ? 'Select at least one prospect to auto-assign' : 'Sélectionnez au moins un prospect')
                    : (isEn ? 'Directly assign selected prospects to yourself' : 'M’attribuer directement les prospects sélectionnés')
                }
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition ${
                  checkedIds.length > 0
                    ? 'border-indigo-200 bg-indigo-50/80 text-indigo-900 hover:bg-indigo-100 shadow-2xs cursor-pointer'
                    : 'border-slate-200/60 bg-slate-50 text-slate-400 opacity-50 cursor-not-allowed'
                }`}
              >
                {isAssigning ? (
                  <RotateCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                ) : (
                  <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                )}
                <span>{isEn ? '⚡ Assign to Me' : '⚡ M’attribuer'}</span>
              </button>

              <button
                type="button"
                disabled={checkedIds.length === 0 || isOverriding}
                onClick={() => {
                  if (!canOverride) {
                    onNotify(isEn ? 'Manual status override requires Platform Administrator privileges.' : 'La dérogation de statut requiert les privilèges Administrateur.');
                    return;
                  }
                  setShowOverrideModal(true);
                }}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition ${
                  checkedIds.length > 0
                    ? 'border-slate-200 bg-white text-[#092342] hover:bg-slate-50 shadow-2xs cursor-pointer'
                    : 'border-slate-200/60 bg-slate-50 text-slate-400 opacity-50 cursor-not-allowed'
                }`}
              >
                {isOverriding ? (
                  <RotateCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
                ) : (
                  <Tag className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span>Change Status</span>
              </button>
            </div>
          </div>

          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 pl-4 pr-2 w-10">
                  <span className="sr-only">Select</span>
                </th>
                <th className="py-3.5 px-4">PROSPECT / FAMILY</th>
                <th className="py-3.5 px-4">COUNTRY & CITY</th>
                <th className="py-3.5 px-4">TARGET PROGRAM</th>
                <th className="py-3.5 px-4">PIPELINE STAGE</th>
                <th className="py-3.5 px-4">ADVISOR</th>
                <th className="py-3.5 px-4">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProspects.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                    No prospects found. Click &apos;+ New Prospect&apos; to create an advisory lead.
                  </td>
                </tr>
              ) : (
                filteredProspects.map((p) => (
                  <tr key={p.id} className={`transition ${checkedIds.includes(p.id) ? 'bg-[#f1f7fd]' : 'hover:bg-slate-50'}`}>
                    <td className="py-3.5 pl-4 pr-2">
                      <input
                        type="checkbox"
                        checked={checkedIds.includes(p.id)}
                        onChange={() => toggleSelectProspect(p.id)}
                        className="h-4 w-4 rounded border-slate-300 text-[#092342] focus:ring-[#092342] cursor-pointer"
                      />
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => setSelectedProspectForProfile(p)}
                        className="font-extrabold text-[#092342] hover:text-[#0c685a] hover:underline cursor-pointer text-left"
                      >
                        {p.full_name}
                      </button>
                    </td>
                    <td className="py-3.5 px-4">
                      {p.flag} {formatProspectLocation(p.country_city)}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-[#0c685a]">{p.program_tag}</td>
                    <td className="py-3.5 px-4">
                      <span className="rounded-full bg-[#eef4fb] px-2.5 py-1 text-[10.5px] font-bold text-[#092342] uppercase">
                        {p.stage.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-700">{p.adviser_name}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedProspectForCall(p)}
                          className="rounded-lg bg-slate-100 hover:bg-slate-200 px-2.5 py-1 text-[11px] font-bold text-[#092342] flex items-center gap-1 cursor-pointer"
                        >
                          <Phone className="w-3 h-3 text-[#0c685a]" />
                          <span>Schedule</span>
                        </button>
                        <button
                          onClick={() => setSelectedProspectForComments(p)}
                          className="p-1 rounded hover:bg-slate-100 text-slate-600 cursor-pointer"
                          title="Notes"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setSelectedProspectForEdit(p)}
                          className="p-1 rounded hover:bg-slate-100 text-slate-600 cursor-pointer"
                          title="Edit"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleAdvanceCard(p)}
                          className="rounded-lg bg-[#092342] text-white px-2.5 py-1 text-[11px] font-bold hover:bg-[#12365a] cursor-pointer"
                        >
                          {p.stage === 'diagnostic' ? (isEn ? 'Qualify (3/3) →' : 'Qualifier (3/3) →') : isEn ? 'Advance →' : 'Avancer →'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Add Prospect to Pipeline */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-elevated border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-[#092342]">
                Add Prospect to Pipeline
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateProspect} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Student or Family Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Chloé Mbuyi"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0c685a]/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Recruitment Country *</label>
                  <select
                    value={formCountry}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormCountry(val);
                      setFormCity(val === 'RDC' ? 'Kinshasa' : 'Brazzaville');
                    }}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                  >
                    <option value="RDC">🇨🇩 DRC</option>
                    <option value="Congo-Brazzaville">🇨🇬 Congo-Brazzaville</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Program or School *</label>
                <select
                  value={formProgram}
                  onChange={(e) => setFormProgram(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                >
                  <option>LIEC-France PREPA (2026–2027 Cohort)</option>
                  <option>MyDigitalSchool Lyon — Dév. Web & UX/UI</option>
                  <option>ISCOM Lyon — Com & Marketing</option>
                  <option>École Internationale Tunon — Tourisme & Hôtellerie</option>
                  <option>IHECF Lyon — Audit & Expertise Comptable</option>
                  <option>MBway Lyon — Management & Affaires Internationales</option>
                </select>
              </div>

              {/* Dynamic Advisor Select from Staff Directory */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Assigned Staff Advisor *
                </label>
                <select
                  value={formAdviser}
                  onChange={(e) => setFormAdviser(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 font-bold text-[#092342]"
                >
                  {activeAdvisors.map((staff) => (
                    <option key={staff.name} value={staff.name}>
                      {staff.name} {staff.title ? `(${staff.title})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-1">
                <label className="inline-flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={formUrgent}
                    onChange={(e) => setFormUrgent(e.target.checked)}
                    className="rounded text-red-600 focus:ring-red-500"
                  />
                  <span>High Priority (&lt; 24h follow-up)</span>
                </label>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-600 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#092342] text-white px-5 py-2 font-extrabold cursor-pointer"
                >
                  Save Prospect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modals: Bulk Advisor Assignment & Status Override */}
      <AssignAdvisorModal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        selectedRefs={checkedIds.map((id) => `PROSPECT-${id}`)}
        selectedDemandes={filteredProspects.filter((p) => checkedIds.includes(p.id)).map((p) => ({ ref: `PROSPECT-${p.id}`, full_name: p.full_name }))}
        staffList={formattedStaffList}
        currentUser={currentUser}
        onConfirm={handleBulkAssign}
        isEn={isEn}
      />

      <ManualStatusOverrideModal
        isOpen={showOverrideModal}
        onClose={() => setShowOverrideModal(false)}
        selectedRefs={checkedIds.map((id) => `PROSPECT-${id}`)}
        selectedDemandes={filteredProspects.filter((p) => checkedIds.includes(p.id)).map((p) => ({ ref: `PROSPECT-${p.id}`, full_name: p.full_name, status: p.stage }))}
        onConfirm={handleBulkOverride}
        isEn={isEn}
      />

      {/* Interactive Modals */}
      {selectedProspectForCall && (
        <ScheduleCallModal
          prospect={selectedProspectForCall}
          staffList={activeAdvisors}
          currentUser={currentUserName}
          isEn={isEn}
          onClose={() => setSelectedProspectForCall(null)}
          onSaved={() => {
            onRefresh();
            onNotify(`Call scheduled for ${selectedProspectForCall.full_name}`);
          }}
        />
      )}

      {selectedProspectForEdit && (
        <EditProspectModal
          prospect={selectedProspectForEdit}
          staffList={activeAdvisors}
          isEn={isEn}
          onClose={() => setSelectedProspectForEdit(null)}
          onSaved={() => {
            onRefresh();
            onNotify(`Prospect ${selectedProspectForEdit.full_name} updated successfully.`);
          }}
        />
      )}

      {selectedProspectForComments && (
        <ProspectCommentsModal
          prospect={selectedProspectForComments}
          currentUser={currentUserName}
          isEn={isEn}
          onClose={() => setSelectedProspectForComments(null)}
        />
      )}

      {selectedProspectForProfile && (
        <ProspectProfileModal
          prospect={selectedProspectForProfile}
          isEn={isEn}
          onClose={() => setSelectedProspectForProfile(null)}
          onScheduleCall={() => setSelectedProspectForCall(selectedProspectForProfile)}
          onEdit={() => setSelectedProspectForEdit(selectedProspectForProfile)}
          onOpenComments={() => setSelectedProspectForComments(selectedProspectForProfile)}
          onAdvanceStage={() => {
            const target = selectedProspectForProfile;
            setSelectedProspectForProfile(null);
            handleAdvanceCard(target);
          }}
        />
      )}

      {/* Stage 2 Modal: Record First Contact */}
      {selectedProspectForContact && (
        <RecordFirstContactModal
          prospect={selectedProspectForContact}
          currentUser={currentUserName}
          isEn={isEn}
          onClose={() => setSelectedProspectForContact(null)}
          onSaved={() => {
            onRefresh();
            onNotify(
              isEn
                ? `First contact recorded for ${selectedProspectForContact.full_name}. Moved to First Contact.`
                : `Premier contact enregistré pour ${selectedProspectForContact.full_name}. Étape mise à jour.`
            );
          }}
        />
      )}

      {/* Stage 3 Modal: Record Eligibility Diagnostic */}
      {selectedProspectForEligibility && (
        <RecordEligibilityModal
          prospect={selectedProspectForEligibility}
          currentUser={currentUserName}
          isEn={isEn}
          onClose={() => setSelectedProspectForEligibility(null)}
          onSaved={() => {
            onRefresh();
            onNotify(
              isEn
                ? `Eligibility diagnostic assessment saved for ${selectedProspectForEligibility.full_name}.`
                : `Diagnostic d'éligibilité enregistré pour ${selectedProspectForEligibility.full_name}.`
            );
          }}
        />
      )}

      {/* Stage 4 Modal: 3-Condition Qualification Milestone */}
      {selectedProspectForQualify && (
        <QualifyProspectModal
          prospect={selectedProspectForQualify}
          currentUser={currentUserName}
          isEn={isEn}
          onClose={() => setSelectedProspectForQualify(null)}
          onSaved={() => {
            onRefresh();
          }}
          onNotify={onNotify}
        />
      )}
    </div>
  );
}
