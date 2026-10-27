'use client';

import React, { useState } from 'react';
import {
  Kanban,
  List,
  UserPlus,
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

interface ProspectsScreenProps {
  prospects: any[];
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
    defaultCount: 14,
    totalVal: '€25.2k',
  },
  {
    key: 'premier_contact',
    label: 'First Contact',
    dot: 'bg-[#0c685a]',
    badgeBg: 'bg-[#ccf5e5] text-[#0c685a]',
    defaultCount: 18,
    totalVal: '€32.4k',
  },
  {
    key: 'diagnostic',
    label: 'Eligibility Check',
    dot: 'bg-[#f59e0b]',
    badgeBg: 'bg-[#fde6b8] text-[#92400e]',
    defaultCount: 16,
    totalVal: '€28.8k',
  },
  {
    key: 'qualifie',
    label: 'Qualified',
    dot: 'bg-[#092342]',
    badgeBg: 'bg-[#dce7f5] text-[#092342]',
    defaultCount: 18,
    totalVal: '€32.4k',
  },
];

export default function ProspectsScreen({
  prospects,
  onAddProspect,
  onMoveProspect,
  onRefresh,
  onNotify,
}: ProspectsScreenProps) {
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [adviserFilter, setAdviserFilter] = useState('All (Sarah, Marc, Aïcha)');
  const [quickFilter, setQuickFilter] = useState<'all' | 'urgent' | 'prepa'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProspectStage, setNewProspectStage] = useState('nouveau');
  const [formName, setFormName] = useState('');
  const [formCountry, setFormCountry] = useState('RDC');
  const [formCity, setFormCity] = useState('Kinshasa');
  const [formProgram, setFormProgram] = useState('MyDigitalSchool Lyon — Dév. Web & UX/UI');
  const [formAdviser, setFormAdviser] = useState('S. Mwamba');
  const [formUrgent, setFormUrgent] = useState(false);

  const filteredProspects = prospects.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      p.full_name.toLowerCase().includes(q) ||
      p.country_city.toLowerCase().includes(q) ||
      p.program_tag.toLowerCase().includes(q);

    const matchAdviser =
      adviserFilter === 'All (Sarah, Marc, Aïcha)' ||
      p.adviser_name.toLowerCase().includes(adviserFilter.toLowerCase());

    const matchQuick =
      quickFilter === 'all' ||
      (quickFilter === 'urgent' && p.is_urgent) ||
      (quickFilter === 'prepa' && p.is_prepa);

    return matchSearch && matchAdviser && matchQuick;
  });

  const handleCreateProspect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;
    await onAddProspect({
      full_name: formName.trim(),
      stage: newProspectStage,
      flag: formCountry === 'RDC' ? '🇨🇩' : '🇨🇬',
      country_city: `${formCountry} (${formCity})`,
      program_tag: formProgram,
      adviser_name: formAdviser,
      is_urgent: formUrgent,
      is_prepa: formProgram.includes('PREPA') || formProgram.includes('ISCOM'),
    });
    setFormName('');
    setShowAddModal(false);
  };

  const getNextStage = (current: string) => {
    const order = ['nouveau', 'premier_contact', 'diagnostic', 'qualifie'];
    const idx = order.indexOf(current);
    return order[Math.min(order.length - 1, idx + 1)];
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs mb-1">
            <span className="rounded-full bg-[#d8f6ea] px-2.5 py-0.5 font-extrabold text-[#0c685a] uppercase">
              ACQUISITION & MENTORSHIP
            </span>
            <span className="text-slate-500 font-medium">• Fall 2025 Session</span>
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
            className="inline-flex items-center gap-2 rounded-xl bg-[#f4be37] hover:bg-[#e5ae28] px-5 py-2.5 text-xs font-extrabold text-[#092342] shadow-sm transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ New Prospect</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Cards with Progress Bars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
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
                  {78 + Math.max(0, prospects.length - 8)}
                </span>
                <span className="text-xs font-bold text-[#0c685a]">↗ +12%</span>
              </div>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-[#e6eef9] text-[#092342] flex items-center justify-center shrink-0">
              <Contact className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between text-[11px] mb-1.5">
              <span className="text-slate-500 font-medium">Monthly Target: 95</span>
              <span className="font-extrabold text-[#092342]">82% achieved</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full w-[82%] rounded-full bg-[#092342]" />
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
                <span className="text-3xl font-extrabold text-[#452702]">19</span>
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
                7 Direct Leads
                <br />
                WhatsApp
              </span>
              <span className="font-extrabold text-red-600 text-right leading-tight">
                High
                <br />
                Urgency
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full w-[65%] rounded-full bg-[#f4be37]" />
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
                <span className="text-3xl font-extrabold text-[#0c685a]">35</span>
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
                Grades &amp;
                <br />
                Budget Check
              </span>
              <span className="font-extrabold text-[#0c685a] text-right leading-tight">
                Avg. Turnaround
                <br />
                48h
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full w-[48%] rounded-full bg-[#0c685a]" />
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
                <span className="text-3xl font-extrabold text-[#092342]">24</span>
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
                Potential Pipeline:
                <br />
                €43,200
              </span>
              <span className="font-extrabold text-[#092342] text-right leading-tight">
                Conv. Rate
                <br />
                38%
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full w-[38%] rounded-full bg-[#092342]" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="rounded-2xl border border-[#e6eef6] bg-white p-4 shadow-card flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="space-y-2.5 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by name, country, program..."
                className="w-full rounded-xl bg-[#f1f6fb] pl-9 pr-3 py-2 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0c685a]/20"
              />
            </div>

            <div className="inline-flex items-center gap-2 rounded-xl bg-[#f1f6fb] px-3 py-2 text-xs text-slate-600">
              <Compass className="w-3.5 h-3.5 text-[#0c685a]" />
              <span>Advisor:</span>
              <select
                value={adviserFilter}
                onChange={(e) => setAdviserFilter(e.target.value)}
                className="bg-transparent font-extrabold text-[#092342] focus:outline-none cursor-pointer"
              >
                <option value="All (Sarah, Marc, Aïcha)">All (Sarah, Marc, Aïcha)</option>
                <option value="Mwamba">S. Mwamba</option>
                <option value="Kouassi">M. Kouassi</option>
                <option value="Diallo">A. Diallo</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setQuickFilter('all')}
              className={`rounded-full px-3 py-1 text-[11px] font-extrabold transition ${
                quickFilter === 'all'
                  ? 'bg-[#092342] text-white'
                  : 'bg-[#f1f6fb] text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              All ({78 + Math.max(0, prospects.length - 8)})
            </button>
            <button
              onClick={() => setQuickFilter('urgent')}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-extrabold transition ${
                quickFilter === 'urgent'
                  ? 'bg-[#092342] text-white'
                  : 'bg-[#f1f6fb] text-[#092342] hover:bg-slate-200/70'
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-red-600" />
              <span>Urgent &lt;24h (19)</span>
            </button>
            <button
              onClick={() => setQuickFilter('prepa')}
              className={`rounded-full px-3 py-1 text-[11px] font-extrabold transition ${
                quickFilter === 'prepa'
                  ? 'bg-[#092342] text-white'
                  : 'bg-[#f1f6fb] text-[#092342] hover:bg-slate-200/70'
              }`}
            >
              PREPA 2025 (32)
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end lg:self-center text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[11px]">
              Sort
              <br />
              by:
            </span>
            <span className="font-extrabold text-[#092342] leading-tight">
              Last
              <br />
              Activity
            </span>
          </div>
          <button
            onClick={() => onNotify('CRM Pipeline report exported.')}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-600"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={onRefresh}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-600"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Kanban Board or Table View */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {STAGES.map((stage) => {
            const stageCards = filteredProspects.filter((p) => p.stage === stage.key);
            return (
              <div
                key={stage.key}
                className="rounded-2xl bg-[#f1f6fb]/90 border border-[#e3edf7] p-3 space-y-3"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between px-1 pt-0.5">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${stage.dot}`} />
                    <h3 className="text-xs font-extrabold text-[#092342]">{stage.label}</h3>
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10.5px] font-extrabold ${stage.badgeBg}`}
                    >
                      {stage.defaultCount + Math.max(0, stageCards.length - 2)}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-slate-500">{stage.totalVal}</span>
                </div>

                {/* Cards */}
                <div className="space-y-3">
                  {stageCards.map((card, cardIdx) => {
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

                    return (
                      <div
                        key={card.id}
                        className={`rounded-2xl border border-[#e3edf7] ${topBorderClass} bg-white p-3.5 shadow-sm hover:shadow-md transition space-y-2.5`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-[13px] font-extrabold text-[#092342] leading-snug">
                            {card.full_name}
                          </h4>
                          <span
                            className={`shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-extrabold leading-tight ${badgeClass}`}
                          >
                            {card.badge_text}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <span>{card.flag}</span>
                          <span>{card.country_city}</span>
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

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px]">
                          <span className="text-slate-600 font-medium inline-flex items-center gap-1">
                            {card.meta_left.includes('Formulaire') || card.meta_left.includes('Web') ? (
                              <Mail className="w-3 h-3 text-slate-400" />
                            ) : card.meta_left.includes('WhatsApp') ? (
                              <MessageSquare className="w-3 h-3 text-slate-400" />
                            ) : card.meta_left.includes('Appel') || card.meta_left.includes('Call') ? (
                              <CheckCircle2 className="w-3 h-3 text-slate-400" />
                            ) : card.meta_left.includes('Grille') || card.meta_left.includes('Eligibility') ? (
                              <Sliders className="w-3 h-3 text-slate-400" />
                            ) : card.meta_left.includes('Échéance') || card.meta_left.includes('Deadline') ? (
                              <Calendar className="w-3 h-3 text-slate-400" />
                            ) : (
                              <Clock className="w-3 h-3 text-slate-400" />
                            )}
                            <span>{card.meta_left}</span>
                          </span>

                          <span
                            className={`font-extrabold inline-flex items-center gap-1 ${
                              card.meta_right_tone === 'teal'
                                ? 'text-[#0c685a]'
                                : 'text-[#092342]'
                            }`}
                          >
                            {card.meta_right.includes('Visio') || card.meta_right.includes('Video') ? (
                              <Video className="w-3 h-3" />
                            ) : card.meta_right.includes('Appel') ||
                              card.meta_right.includes('Call') ||
                              card.meta_right.includes('Reminder') ? (
                              <Phone className="w-3 h-3" />
                            ) : card.meta_right.includes('Attente') || card.meta_right.includes('Awaiting') ? (
                              <FileText className="w-3 h-3" />
                            ) : card.meta_right.includes('Rapport') || card.meta_right.includes('Report') ? (
                              <Send className="w-3 h-3" />
                            ) : card.meta_right.includes('Signature') ? (
                              <FileSignature className="w-3 h-3" />
                            ) : card.meta_right.includes('Acompte') || card.meta_right.includes('Deposit') ? (
                              <CreditCard className="w-3 h-3" />
                            ) : (
                              <MessageSquare className="w-3 h-3" />
                            )}
                            <span>{card.meta_right}</span>
                          </span>
                        </div>

                        {/* Card Footer */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-extrabold ${adviserBadgeClass}`}
                            >
                              {card.adviser_initials}
                            </span>
                            <span className="text-[11px] font-bold text-[#092342]">
                              {card.adviser_name}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 text-slate-400">
                            <button
                              onClick={() =>
                                onMoveProspect(card.id, getNextStage(card.stage))
                              }
                              title="Advance to next stage"
                              className="p-1 rounded hover:bg-slate-100 hover:text-[#092342]"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() =>
                                onNotify(`Message sent to ${card.full_name}.`)
                              }
                              className="p-1 rounded hover:bg-slate-100 hover:text-[#0c685a]"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() =>
                                onMoveProspect(card.id, getNextStage(card.stage))
                              }
                              className="p-1 rounded hover:bg-slate-100 hover:text-[#092342]"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Add to stage button */}
                <button
                  onClick={() => {
                    setNewProspectStage(stage.key);
                    setShowAddModal(true);
                  }}
                  className="w-full rounded-xl border border-dashed border-slate-300 hover:border-[#092342] py-2.5 text-xs font-bold text-slate-500 hover:text-[#092342] flex items-center justify-center gap-1.5 transition"
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
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-4">PROSPECT / FAMILY</th>
                <th className="py-3.5 px-4">COUNTRY & CITY</th>
                <th className="py-3.5 px-4">TARGET PROGRAM</th>
                <th className="py-3.5 px-4">PIPELINE STAGE</th>
                <th className="py-3.5 px-4">ADVISOR</th>
                <th className="py-3.5 px-4">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProspects.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="py-3.5 px-4 font-extrabold text-[#092342]">{p.full_name}</td>
                  <td className="py-3.5 px-4">
                    {p.flag} {p.country_city}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-[#0c685a]">{p.program_tag}</td>
                  <td className="py-3.5 px-4">
                    <span className="rounded-full bg-[#eef4fb] px-2.5 py-1 text-[10.5px] font-bold text-[#092342] uppercase">
                      {p.stage.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-700">{p.adviser_name}</td>
                  <td className="py-3.5 px-4">
                    <button
                      onClick={() => onMoveProspect(p.id, getNextStage(p.stage))}
                      className="rounded-lg bg-[#092342] text-white px-3 py-1 text-[11px] font-bold hover:bg-[#12365a]"
                    >
                      Advance stage →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Add Prospect */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-elevated border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-[#092342]">
                Add Prospect to Pipeline
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
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
                  <label className="block font-bold text-slate-700 mb-1">City</label>
                  <select
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                  >
                    {formCountry === 'RDC' ? (
                      <>
                        <option value="Kinshasa">Kinshasa</option>
                        <option value="Lubumbashi">Lubumbashi</option>
                        <option value="Goma">Goma</option>
                      </>
                    ) : (
                      <>
                        <option value="Brazzaville">Brazzaville</option>
                        <option value="Pointe-Noire">Pointe-Noire</option>
                      </>
                    )}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Partner School in Lyon *</label>
                  <select
                    value={formProgram}
                    onChange={(e) => setFormProgram(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                  >
                    <option value="ISCOM Lyon — Communication & Marketing">1. ISCOM Lyon</option>
                    <option value="MyDigitalSchool Lyon — Dév. Web & UX/UI">2. MyDigitalSchool Lyon</option>
                    <option value="École Internationale Tunon Lyon">3. École Internationale Tunon Lyon</option>
                    <option value="IHECF Lyon — Comptabilité & Finance">4. IHECF Lyon</option>
                    <option value="Ipac Bachelor Factory Lyon">5. Ipac Bachelor Factory Lyon</option>
                    <option value="MBway Lyon — Management & Commerce Int.">6. MBway Lyon</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Initial Stage</label>
                  <select
                    value={newProspectStage}
                    onChange={(e) => setNewProspectStage(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                  >
                    <option value="nouveau">New Lead</option>
                    <option value="premier_contact">First Contact</option>
                    <option value="diagnostic">Eligibility Check</option>
                    <option value="qualifie">Qualified</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <label className="inline-flex items-center gap-2 font-semibold text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formUrgent}
                    onChange={(e) => setFormUrgent(e.target.checked)}
                    className="rounded border-slate-300 text-[#0c685a]"
                  />
                  <span>High Priority (&lt; 24h)</span>
                </label>
                <select
                  value={formAdviser}
                  onChange={(e) => setFormAdviser(e.target.value)}
                  className="rounded-lg border border-slate-200 px-2.5 py-1.5 font-bold text-[#092342]"
                >
                  <option>S. Mwamba</option>
                  <option>M. Kouassi</option>
                  <option>A. Diallo</option>
                </select>
              </div>
              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#092342] text-white px-5 py-2 font-extrabold"
                >
                  Save Prospect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
