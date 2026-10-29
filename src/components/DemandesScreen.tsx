'use client';

import React, { useState } from 'react';
import {
  SlidersHorizontal,
  Download,
  Plus,
  Inbox,
  Hourglass,
  TrendingUp,
  Clock,
  Search,
  Globe,
  Share2,
  Calendar,
  RotateCw,
  UserPlus,
  Tag,
  Trash2,
  ExternalLink,
  X,
  CheckCircle2,
  MessageSquare,
  Send,
  Mail,
  Copy,
  ShieldCheck,
  Archive,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import { Lang } from './ServicesAndOtherScreens';

interface DemandesScreenProps {
  demandes?: any[];
  demandeNotes?: any[];
  selectedRef?: string;
  onSelectRef?: (ref: string) => void;
  onOpenNewDemande?: () => void;
  onAddNote?: (ref: string, content: string) => Promise<void>;
  onUpdateStatus?: (ref: string, status: string, adviser?: string) => Promise<void>;
  onConvertCandidat?: (ref: string) => Promise<void>;
  onArchiveDemande?: (ref: string) => Promise<void>;
  onRefresh?: () => void;
  onNotify?: (msg: string) => void;
  lang?: Lang;
}

export default function DemandesScreen({
  demandes = [],
  demandeNotes = [],
  selectedRef = '',
  onSelectRef = () => {},
  onOpenNewDemande = () => {},
  onAddNote = async () => {},
  onUpdateStatus = async () => {},
  onConvertCandidat = async () => {},
  onArchiveDemande = async () => {},
  onRefresh = () => {},
  onNotify = () => {},
  lang = 'en',
}: DemandesScreenProps) {
  const isEn = lang === 'en';
  const [searchQuery, setSearchQuery] = useState('');
  const [countryFilter, setCountryFilter] = useState('All (DRC & Congo-Brazzaville)');
  const [serviceFilter, setServiceFilter] = useState('All 6 Lyon Partner Schools');
  const [statusFilter, setStatusFilter] = useState('All');
  const [checkedRefs, setCheckedRefs] = useState<string[]>([]);
  const [noteInput, setNoteInput] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);
  const [converting, setConverting] = useState(false);
  const [page, setPage] = useState(1);

  // Safe normalization of dataset
  const safeDemandes = Array.isArray(demandes) ? demandes.filter(Boolean) : [];
  const safeNotes = Array.isArray(demandeNotes) ? demandeNotes.filter(Boolean) : [];

  // Main Demandes queue
  const orderedDemandes = [
    ...safeDemandes.filter((d) => !d.is_dashboard_recent || String(d.submitted_at || '').includes('Just now')),
    ...safeDemandes.filter((d) => d.is_dashboard_recent && !String(d.submitted_at || '').includes('Just now')),
  ];

  const filteredList = orderedDemandes.filter((d) => {
    if (!d) return false;
    const q = searchQuery.toLowerCase().trim();
    const refStr = String(d.ref || '').toLowerCase();
    const nameStr = String(d.full_name || '').toLowerCase();
    const emailStr = String(d.email || '').toLowerCase();
    const phoneStr = String(d.phone || '').toLowerCase();

    const matchSearch =
      !q ||
      refStr.includes(q) ||
      nameStr.includes(q) ||
      emailStr.includes(q) ||
      phoneStr.includes(q);

    const countryCode = String(d.country_code || '');
    const countryName = String(d.country_name || '');
    const matchCountry =
      countryFilter === 'All (DRC & Congo-Brazzaville)' ||
      (countryFilter === 'DRC' && (countryCode === 'CD' || countryName.includes('RDC') || countryName.includes('DRC'))) ||
      (countryFilter === 'Congo' && (countryCode === 'CG' || countryName.includes('Congo')));

    const progStr = String(d.program || '').toLowerCase();
    const poleStr = String(d.service_pole || '').toLowerCase();
    const sFilter = serviceFilter.toLowerCase();
    const matchService =
      serviceFilter === 'All 6 Lyon Partner Schools' ||
      progStr.includes(sFilter) ||
      poleStr.includes(sFilter);

    const dStatus = String(d.status || '');
    const matchStatus =
      statusFilter === 'All' ||
      statusFilter === 'Toutes' ||
      dStatus === statusFilter ||
      (statusFilter === 'New' && (dStatus === 'New' || dStatus === 'Nouvelle')) ||
      (statusFilter === 'To Contact' && (dStatus === 'To Contact' || dStatus === 'À contacter')) ||
      (statusFilter === 'In Progress' && (dStatus === 'In Progress' || dStatus === 'En cours')) ||
      (statusFilter === 'Awaiting Info' && (dStatus === 'Awaiting Info' || dStatus === 'Attente infos')) ||
      (statusFilter === 'Qualified' && (dStatus === 'Qualified' || dStatus === 'Qualifiée')) ||
      (statusFilter === 'Converted' && (dStatus === 'Converted' || dStatus === 'Convertie'));

    return matchSearch && matchCountry && matchService && matchStatus;
  });

  const selectedDemande =
    orderedDemandes.find((d) => d && d.ref === selectedRef) ||
    filteredList[0] ||
    orderedDemandes[0] ||
    null;

  const selectedNotes = safeNotes.filter(
    (n) => n && selectedDemande && n.demande_ref === selectedDemande.ref
  );

  const toggleCheckbox = (ref: string) => {
    setCheckedRefs((prev) =>
      prev.includes(ref) ? prev.filter((r) => r !== ref) : [...prev, ref]
    );
  };

  const handleSendNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteInput.trim() || !selectedDemande) return;
    setSubmittingNote(true);
    try {
      await onAddNote(selectedDemande.ref, noteInput.trim());
      setNoteInput('');
      onNotify('Internal note added to candidate history.');
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleConvert = async () => {
    if (!selectedDemande) return;
    setConverting(true);
    try {
      await onConvertCandidat(selectedDemande.ref);
    } finally {
      setConverting(false);
    }
  };

  const handleExportCsv = () => {
    const headers = ['Reference,Name,Email,Phone,City,Program,ServicePole,Status'];
    const rows = filteredList.map(
      (d) =>
        `"${d?.ref || ''}","${d?.full_name || ''}","${d?.email || ''}","${d?.phone || ''}","${d?.city || ''}","${d?.program || ''}","${d?.service_pole || ''}","${d?.status || ''}"`
    );
    const blob = new Blob([headers.concat(rows).join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'LIEC-Received-Applications-2025.csv';
    a.click();
    URL.revokeObjectURL(url);
    onNotify('CSV export generated successfully.');
  };

  const getStatusBadge = (status: string) => {
    const s = String(status || '');
    switch (s) {
      case 'New':
      case 'Nouvelle':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#dcfce7] px-2.5 py-1 text-[10.5px] font-bold text-[#0c685a]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#10b981]" />
            New
          </span>
        );
      case 'To Contact':
      case 'À contacter':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fef3c7] px-2.5 py-1 text-[10.5px] font-bold text-[#b45309]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#f59e0b]" />
            To Contact
          </span>
        );
      case 'In Progress':
      case 'En cours':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e0ecff] px-2.5 py-1 text-[10.5px] font-bold text-[#1e40af]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#1e40af]" />
            In Progress
          </span>
        );
      case 'Qualified':
      case 'Qualifiée':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#d1fae5] px-2.5 py-1 text-[10.5px] font-bold text-[#065f46]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#10b981]" />
            Qualified
          </span>
        );
      case 'Awaiting Info':
      case 'Attente infos':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fee2e2] px-2.5 py-1 text-[10.5px] font-bold text-[#b91c1c]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#ef4444]" />
            Awaiting Info
          </span>
        );
      case 'Converted':
      case 'Convertie':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#d8f6ea] px-2.5 py-1 text-[10.5px] font-bold text-[#0c685a]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#0c685a]" />
            Converted
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[10.5px] font-bold text-slate-600">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            {s || 'Inconnu'}
          </span>
        );
    }
  };

  const totalCount = 90 + Math.max(0, safeDemandes.length - 11);
  const newCount = 14 + Math.max(0, safeDemandes.length - 11);

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[28px] font-extrabold tracking-tight text-[#092342]">
              {isEn ? 'Received Applications' : 'Demandes reçues'}
            </h1>
            <span className="rounded-full bg-[#e6f0fa] px-3 py-1 text-xs font-extrabold text-[#092342]">
              {totalCount} Total
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500 max-w-2xl">
            {isEn
              ? 'Centralize, qualify, and process university applications submitted via the public LIEC website.'
              : 'Centralisez, qualifiez et traitez les candidatures universitaires soumises via le site public LIEC.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onNotify('2 active filters: Central Africa & West • Last 30 Days')}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-[#092342] shadow-sm hover:bg-slate-50"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
            <span>Advanced Filters</span>
            <span className="h-5 w-5 rounded-full bg-[#6ee7b7] text-[#064e3b] flex items-center justify-center text-[10px] font-extrabold">
              2
            </span>
          </button>

          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-[#092342] shadow-sm hover:bg-slate-50"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={onOpenNewDemande}
            className="inline-flex items-center gap-2 rounded-xl bg-[#f4be37] hover:bg-[#e5ae28] px-5 py-2.5 text-xs font-extrabold text-[#092342] shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Application</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-[#e6eef6] bg-white p-4 shadow-card flex items-center justify-between">
          <div>
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
              NEW IN 24H
            </span>
            <div className="mt-1 text-2xl font-extrabold text-[#092342]">{newCount}</div>
          </div>
          <span className="h-11 w-11 rounded-xl bg-[#d8f6ea] text-[#0c685a] flex items-center justify-center">
            <Inbox className="w-5 h-5" />
          </span>
        </div>

        <div className="rounded-2xl border border-[#e6eef6] bg-white p-4 shadow-card flex items-center justify-between">
          <div>
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
              TO QUALIFY
            </span>
            <div className="mt-1 text-2xl font-extrabold text-[#784e06]">12</div>
          </div>
          <span className="h-11 w-11 rounded-xl bg-[#fef3c7] text-[#b45309] flex items-center justify-center">
            <Hourglass className="w-5 h-5" />
          </span>
        </div>

        <div className="rounded-2xl border border-[#e6eef6] bg-white p-4 shadow-card flex items-center justify-between">
          <div>
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
              ELIGIBILITY RATE
            </span>
            <div className="mt-1 text-2xl font-extrabold text-[#0c685a]">78.4%</div>
          </div>
          <span className="h-11 w-11 rounded-xl bg-[#eefaf6] text-[#0c685a] flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </span>
        </div>

        <div className="rounded-2xl border border-[#e6eef6] bg-white p-4 shadow-card flex items-center justify-between">
          <div>
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
              AVG RESPONSE TIME
            </span>
            <div className="mt-1 text-2xl font-extrabold text-[#092342]">2h 15m</div>
          </div>
          <span className="h-11 w-11 rounded-xl bg-[#e6effa] text-[#092342] flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </span>
        </div>
      </div>

      {/* Filter Bar & Status Pills */}
      <div className="rounded-2xl border border-[#e6eef6] bg-white p-4 shadow-card space-y-3.5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[230px] max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isEn ? 'Search by name, email, phone number...' : 'Rechercher par nom, email, téléphone...'}
              className="w-full rounded-xl bg-[#f1f6fb] pl-10 pr-4 py-2.5 text-xs font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0c685a]/20"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-xl bg-[#f1f6fb] px-3 py-2 text-xs text-slate-600">
              <Globe className="w-3.5 h-3.5 text-[#0c685a]" />
              <span>Country:</span>
              <select
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
                className="bg-transparent font-extrabold text-[#092342] focus:outline-none cursor-pointer"
              >
                <option value="All (DRC & Congo-Brazzaville)">
                  All (DRC &amp; Congo-Brazzaville)
                </option>
                <option value="DRC">🇨🇩 DRC (Kinshasa / Lubumbashi / Goma)</option>
                <option value="Congo">🇨🇬 Congo-Brazzaville (Brazzaville / Pointe-Noire)</option>
              </select>
            </div>

            <div className="inline-flex items-center gap-2 rounded-xl bg-[#f1f6fb] px-3 py-2 text-xs text-slate-600">
              <Share2 className="w-3.5 h-3.5 text-[#0c685a]" />
              <span>Lyon School:</span>
              <select
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
                className="bg-transparent font-extrabold text-[#092342] focus:outline-none cursor-pointer"
              >
                <option value="All 6 Lyon Partner Schools">All 6 Lyon Partner Schools</option>
                <option value="ISCOM">1. ISCOM Lyon</option>
                <option value="MyDigitalSchool">2. MyDigitalSchool Lyon</option>
                <option value="Tunon">3. École Internationale Tunon Lyon</option>
                <option value="IHECF">4. IHECF Lyon</option>
                <option value="Ipac">5. Ipac Bachelor Factory Lyon</option>
                <option value="MBway">6. MBway Lyon</option>
              </select>
            </div>

            <div className="inline-flex items-center gap-2 rounded-xl bg-[#f1f6fb] px-3 py-2 text-xs text-slate-600">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>Period:</span>
              <span className="font-extrabold text-[#092342]">Last 30 Days ▾</span>
            </div>

            <button
              onClick={() => {
                setSearchQuery('');
                setCountryFilter('All (DRC & Congo-Brazzaville)');
                setServiceFilter('All 6 Lyon Partner Schools');
                setStatusFilter('All');
                onRefresh();
              }}
              title="Refresh"
              className="h-9 w-9 rounded-xl bg-[#f1f6fb] hover:bg-slate-200/70 text-slate-600 flex items-center justify-center transition"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { label: 'All', count: totalCount, dot: '' },
            {
              label: 'New',
              count: newCount,
              dot: 'bg-[#0c685a]',
            },
            { label: 'To Contact', count: 12, dot: 'bg-[#f59e0b]' },
            { label: 'In Progress', count: 19, dot: 'bg-[#092342]' },
            { label: 'Awaiting Info', count: 8, dot: 'bg-red-600' },
            { label: 'Qualified', count: 22, dot: 'bg-[#2dd4bf]' },
            { label: 'Converted', count: 15, dot: 'bg-[#0c685a]' },
            { label: 'Closed', count: null, dot: '' },
          ].map((pill) => {
            const active = statusFilter === pill.label;
            return (
              <button
                key={pill.label}
                onClick={() => setStatusFilter(pill.label)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold whitespace-nowrap transition ${
                  active
                    ? 'bg-[#092342] text-white shadow-sm'
                    : 'bg-[#f1f6fb] text-slate-700 hover:bg-slate-200/70'
                }`}
              >
                {pill.dot && <span className={`h-2 w-2 rounded-full ${pill.dot}`} />}
                <span>{pill.label}</span>
                {pill.count !== null && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10.5px] font-extrabold ${
                      active ? 'bg-white/20 text-white' : 'text-[#0c685a]'
                    }`}
                  >
                    {pill.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Master-Detail Split Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Left Master Table (7 cols on XL) */}
        <div className="xl:col-span-7 rounded-2xl border border-[#e6eef6] bg-white shadow-card overflow-hidden">
          {/* Selection Action Bar */}
          <div className="px-4 py-3 bg-[#f3f8fd] border-b border-[#e6eef6] flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                checked={checkedRefs.length > 0}
                onChange={() =>
                  setCheckedRefs(checkedRefs.length > 0 ? [] : (selectedDemande?.ref ? [selectedDemande.ref] : []))
                }
                className="h-4 w-4 rounded border-slate-300 text-[#092342] focus:ring-[#092342] cursor-pointer"
              />
              <span className="font-extrabold text-[#092342]">
                {checkedRefs.length} selected
              </span>
              <span className="text-slate-500">of {totalCount} leads</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (selectedDemande) {
                    onUpdateStatus(selectedDemande.ref, selectedDemande.status || 'New', 'Barthelemy MAPWABA NTORO');
                    onNotify(`Advisor Barthelemy MAPWABA NTORO assigned to ${selectedDemande.ref}.`);
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-[#092342] hover:bg-slate-50"
              >
                <UserPlus className="w-3.5 h-3.5 text-slate-500" />
                <span>Assign Advisor</span>
              </button>

              <button
                onClick={() => {
                  if (selectedDemande) {
                    const nextStatus =
                      selectedDemande.status === 'New' || selectedDemande.status === 'Nouvelle'
                        ? 'Qualified'
                        : 'In Progress';
                    onUpdateStatus(selectedDemande.ref, nextStatus);
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-[#092342] hover:bg-slate-50"
              >
                <Tag className="w-3.5 h-3.5 text-slate-500" />
                <span>Change Status</span>
              </button>

              <button
                onClick={() => {
                  if (selectedDemande) onArchiveDemande(selectedDemande.ref);
                }}
                title="Archive"
                className="p-1.5 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 bg-white">
                  <th className="py-3.5 pl-4 pr-2 w-8" />
                  <th className="py-3.5 px-2.5">REFERENCE</th>
                  <th className="py-3.5 px-2.5">CANDIDATE &amp; CONTACT</th>
                  <th className="py-3.5 px-2.5">COUNTRY</th>
                  <th className="py-3.5 px-2.5">
                    LEVEL /
                    <br />
                    SERVICE
                  </th>
                  <th className="py-3.5 px-3">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredList.slice(0, 7).map((dem, i) => {
                  if (!dem) return null;
                  const isSelected = selectedDemande?.ref === dem.ref;
                  const isChecked = checkedRefs.includes(dem.ref);

                  const avatarColors = [
                    'bg-[#d8e6f8] text-[#092342]',
                    'bg-[#b9f5e1] text-[#065f46]',
                    'bg-[#dce9f9] text-[#092342]',
                    'bg-[#fde6b8] text-[#784e06]',
                    'bg-[#dce8f6] text-[#092342]',
                    'bg-[#bbf7d0] text-[#065f46]',
                    'bg-[#dbeafe] text-[#1e3a8a]',
                  ];

                  const refParts = String(dem.ref || '')
                    .replace(/-[A-Z]$/, '')
                    .split('-');

                  return (
                    <tr
                      key={dem.ref || `demande-${i}`}
                      onClick={() => onSelectRef(dem.ref)}
                      className={`cursor-pointer transition ${
                        isSelected ? 'bg-[#f1f7fd]' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td
                        className="py-4 pl-4 pr-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCheckbox(dem.ref);
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="h-4 w-4 rounded border-slate-300 text-[#092342] focus:ring-[#092342] cursor-pointer"
                        />
                      </td>
                      <td className="py-4 px-2.5 font-extrabold text-[#092342] text-[11px] leading-tight">
                        {refParts.map((p: string, idx: number) => (
                          <span key={idx} className="block">
                            {idx < 2 ? `${p}-` : p}
                          </span>
                        ))}
                      </td>
                      <td className="py-4 px-2.5">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 ${
                              avatarColors[i % avatarColors.length]
                            }`}
                          >
                            {dem.initials || '??'}
                          </span>
                          <div className="min-w-0">
                            <div className="font-extrabold text-[#092342] truncate">
                              {dem.full_name || 'Sans nom'}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">{dem.email || '-'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-extrabold text-slate-500">
                            {dem.country_code || 'CD'}
                          </span>
                          <span className="text-[11.5px] text-slate-600 leading-tight">
                            {dem.city || '-'}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-2.5">
                        <div className="font-extrabold text-[#092342] leading-tight">
                          {dem.program || '-'}
                        </div>
                        <div className="mt-0.5 text-[11px] font-bold text-[#0c685a]">
                          {dem.service_pole || '-'}
                        </div>
                      </td>
                      <td className="py-4 px-3">{getStatusBadge(dem.status)}</td>
                    </tr>
                  );
                })}

                {filteredList.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                      {isEn ? 'No applications match your filter criteria' : 'Aucune demande ne correspond à vos critères'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer Pagination */}
          <div className="px-4 py-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing <strong className="text-[#092342]">1–{Math.min(7, filteredList.length)}</strong> of{' '}
              <strong className="text-[#092342]">{totalCount}</strong> applications
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-7 w-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              {[1, 2, 3].map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`h-7 w-7 rounded-lg text-xs font-bold transition ${
                    page === p
                      ? 'bg-[#092342] text-white'
                      : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {p}
                </button>
              ))}
              <span className="px-1">...</span>
              <button className="h-7 w-7 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50">
                13
              </button>
              <button
                onClick={() => setPage((p) => (p < 3 ? p + 1 : 1))}
                className="h-7 w-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Detail Inspector Drawer (5 cols on XL) */}
        {selectedDemande ? (
          <div className="xl:col-span-5 rounded-2xl border border-[#e6eef6] bg-white p-5 shadow-card space-y-5">
            {/* Top Drawer Header */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="rounded-xl bg-[#6ee7b7] px-3 py-1 text-[11px] font-extrabold text-[#064e3b] leading-tight">
                  {selectedDemande.status === 'New' || selectedDemande.status === 'Nouvelle'
                    ? 'New Application'
                    : selectedDemande.status || 'Active'}
                </span>
                <span className="text-xs font-extrabold text-[#092342]">
                  {String(selectedDemande.ref || '').replace(/-[A-Z]$/, '')}
                </span>
              </div>
              <div className="flex items-center gap-1 text-slate-400">
                <button
                  onClick={() => onNotify(`Full dossier ${selectedDemande.ref} opened.`)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 hover:text-slate-600"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
                <button className="p-1.5 rounded-lg hover:bg-slate-100 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Candidate Identity Card */}
            <div className="rounded-2xl bg-[#f3f7fc] p-4 flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-[#092342] text-white flex items-center justify-center text-lg font-extrabold shrink-0">
                {selectedDemande.initials || '??'}
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-extrabold text-[#092342] truncate">
                  {selectedDemande.full_name || 'Sans nom'}
                </h2>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-[#0c685a]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Qualified Candidate ({selectedDemande.country_name || selectedDemande.country_code || 'RDC'})</span>
                </div>
                <p className="mt-1 text-[11px] text-slate-400">{selectedDemande.submitted_at || 'Récemment'}</p>
              </div>
            </div>

            {/* Verified Contact Info */}
            <div className="space-y-2.5">
              <h3 className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">
                VERIFIED CONTACT DETAILS
              </h3>

              <div className="rounded-xl bg-[#f4f8fc] p-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="h-8 w-8 rounded-lg bg-white text-[#0c685a] flex items-center justify-center shadow-sm shrink-0">
                    <MessageSquare className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold text-[#092342]">
                      {selectedDemande.phone || '-'}
                    </div>
                    <div className="text-[10.5px] font-semibold text-[#0c685a]">
                      Active Verified WhatsApp
                    </div>
                  </div>
                </div>
                <button
                  onClick={() =>
                    onNotify(`Opening WhatsApp chat with ${selectedDemande.full_name || 'candidate'}...`)
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#0c6358] hover:bg-[#094e45] px-3 py-1.5 text-[11px] font-bold text-white shrink-0 transition"
                >
                  <span>Contact</span>
                  <Send className="w-3 h-3" />
                </button>
              </div>

              <div className="rounded-xl bg-[#f4f8fc] p-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="h-8 w-8 rounded-lg bg-white text-[#092342] flex items-center justify-center shadow-sm shrink-0">
                    <Mail className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold text-[#092342] truncate">
                      {selectedDemande.email || '-'}
                    </div>
                    <div className="text-[10.5px] text-slate-400">{selectedDemande.city || '-'}</div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (selectedDemande.email && typeof navigator !== 'undefined' && navigator.clipboard) {
                      navigator.clipboard.writeText(selectedDemande.email).catch(() => {});
                      onNotify('Email address copied to clipboard.');
                    }
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-white hover:text-slate-700"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Study Project & Financing */}
            <div className="space-y-2.5">
              <h3 className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">
                STUDY PROJECT &amp; FINANCING
              </h3>

              <div className="rounded-2xl bg-[#f3f7fc] p-4 space-y-2.5 text-xs">
                <div className="grid grid-cols-12 gap-2">
                  <span className="col-span-4 text-slate-400 font-medium">Desired Program</span>
                  <span className="col-span-8 font-extrabold text-[#092342]">
                    {selectedDemande.program || '-'}
                  </span>
                </div>
                <div className="grid grid-cols-12 gap-2">
                  <span className="col-span-4 text-slate-400 font-medium">Target Cities</span>
                  <span className="col-span-8 font-semibold text-slate-700">
                    {selectedDemande.target_cities || 'Lyon (Exclusivement)'}
                  </span>
                </div>
                <div className="grid grid-cols-12 gap-2">
                  <span className="col-span-4 text-slate-400 font-medium">Current Level</span>
                  <span className="col-span-8 font-semibold text-slate-700">
                    {selectedDemande.current_level || '-'}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-600">
                    Guaranteed
                    <br />
                    Annual Budget
                  </span>
                  <span className="text-sm font-extrabold text-[#0c685a]">
                    {selectedDemande.budget_range || '-'}
                  </span>
                </div>
              </div>
            </div>

            {/* Parent & Academic Background (Linked Records) */}
            {(selectedDemande.parent_full_name || selectedDemande.graduation_year || selectedDemande.current_activity) && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10.5px] font-extrabold uppercase tracking-wider text-[#0c685a]">
                    PARENT LINK &amp; ACADEMIC BACKGROUND
                  </h3>
                  <span className="text-[10px] font-extrabold text-[#0c685a] bg-[#eefaf6] px-2 py-0.5 rounded-md border border-[#ccece2]">
                    Linked
                  </span>
                </div>

                <div className="rounded-2xl bg-[#f3f7fc] p-4 space-y-2 text-xs">
                  {selectedDemande.parent_full_name && (
                    <div className="grid grid-cols-12 gap-2">
                      <span className="col-span-5 text-slate-400 font-medium">Parent Full Name</span>
                      <span className="col-span-7 font-extrabold text-[#092342]">
                        {selectedDemande.parent_full_name}
                      </span>
                    </div>
                  )}
                  {selectedDemande.parent_phone && (
                    <div className="grid grid-cols-12 gap-2">
                      <span className="col-span-5 text-slate-400 font-medium">Parent Phone</span>
                      <span className="col-span-7 font-semibold text-slate-700">
                        {selectedDemande.parent_phone}
                      </span>
                    </div>
                  )}
                  {selectedDemande.graduation_year && (
                    <div className="grid grid-cols-12 gap-2">
                      <span className="col-span-5 text-slate-400 font-medium">Graduation Year</span>
                      <span className="col-span-7 font-bold text-[#092342]">
                        {selectedDemande.graduation_year}
                      </span>
                    </div>
                  )}
                  {selectedDemande.current_activity && (
                    <div className="grid grid-cols-12 gap-2">
                      <span className="col-span-5 text-slate-400 font-medium">Current Activity</span>
                      <span className="col-span-7 font-semibold text-slate-700">
                        {selectedDemande.current_activity}
                      </span>
                    </div>
                  )}
                  {selectedDemande.final_year_university && (
                    <div className="grid grid-cols-12 gap-2">
                      <span className="col-span-5 text-slate-400 font-medium">Final Year Univ.</span>
                      <span className="col-span-7 font-semibold text-slate-700">
                        {selectedDemande.final_year_university}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Internal Audit Log & Notes */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">
                  INTERNAL AUDIT LOG &amp; NOTES
                </h3>
                <span className="text-[11px] font-extrabold text-[#092342]">
                  {selectedNotes.length} notes
                </span>
              </div>

              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {selectedNotes.map((note, idx) => (
                  <div key={note.id || `note-${idx}`} className="rounded-xl bg-[#f3f7fc] p-3 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-extrabold text-[#092342] text-[11px]">
                        {note.author || 'Conseiller'}
                      </span>
                      <span className="text-[10px] text-slate-400">{note.timestamp_label || 'Aujourd’hui'}</span>
                    </div>
                    <p className="mt-1.5 text-[11.5px] text-slate-600 leading-relaxed">
                      {note.content}
                    </p>
                  </div>
                ))}

                {selectedNotes.length === 0 && (
                  <div className="rounded-xl bg-[#f3f7fc] p-3 text-center text-slate-400 text-xs">
                    {isEn ? 'No notes for this application' : 'Aucune note pour cette demande'}
                  </div>
                )}
              </div>

              <form onSubmit={handleSendNote} className="relative">
                <input
                  type="text"
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder={isEn ? 'Add internal follow-up note...' : 'Ajouter une note de suivi interne...'}
                  className="w-full rounded-xl bg-[#f1f6fb] pl-3.5 pr-10 py-2.5 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#092342]/20"
                />
                <button
                  type="submit"
                  disabled={submittingNote}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#092342] hover:text-[#0c685a]"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>

            {/* Bottom CTAs */}
            <div className="space-y-2.5 pt-1">
              <button
                onClick={handleConvert}
                disabled={converting}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#f4be37] hover:bg-[#e5ae28] py-3 px-4 text-xs font-extrabold text-[#092342] shadow-sm transition disabled:opacity-60"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>
                  {converting
                    ? 'Qualifying and converting...'
                    : 'Qualify and Convert to Candidate'}
                </span>
              </button>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() =>
                    onNotify(
                      `Orientation meeting scheduled with ${selectedDemande.full_name || 'candidate'}.`
                    )
                  }
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#f1f6fb] hover:bg-slate-200/70 py-2.5 px-3 text-xs font-bold text-[#092342] transition"
                >
                  <Calendar className="w-3.5 h-3.5 text-[#0c685a]" />
                  <span>Schedule Meeting</span>
                </button>
                <button
                  onClick={() => onArchiveDemande(selectedDemande.ref)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#f1f6fb] hover:bg-slate-200/70 py-2.5 px-3 text-xs font-bold text-[#092342] transition"
                >
                  <Archive className="w-3.5 h-3.5 text-slate-500" />
                  <span>Archive</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="xl:col-span-5 rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-400 text-xs">
            {isEn ? 'Select an application from the table to inspect details' : 'Sélectionnez une demande dans la liste pour afficher ses détails'}
          </div>
        )}
      </div>
    </div>
  );
}
