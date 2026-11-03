'use client';

import React, { useState } from 'react';
import {
  X,
  Search,
  ExternalLink,
  Download,
  GraduationCap,
  Calendar,
  User,
  ShieldCheck,
  CheckCircle2,
  FileText,
  TrendingUp,
} from 'lucide-react';

export interface VolumeRecordItem {
  id: string | number;
  ref: string;
  fullName: string;
  email: string;
  type: 'application' | 'enquiry' | 'candidat';
  countryHub: string;
  flag: string;
  program: string;
  status: string;
  date: string;
  adviser: string;
  sourceModule: 'demandes' | 'prospects' | 'candidats';
}

interface VolumeBreakdownDetailModalProps {
  isOpen: boolean;
  periodLabel: string;
  intakeLabel: string;
  hubLabel: string;
  records: VolumeRecordItem[];
  isEn?: boolean;
  onClose: () => void;
  onOpenRecord: (record: VolumeRecordItem) => void;
}

export function VolumeBreakdownDetailModal({
  isOpen,
  periodLabel,
  intakeLabel,
  hubLabel,
  records,
  isEn = true,
  onClose,
  onOpenRecord,
}: VolumeBreakdownDetailModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'application' | 'enquiry' | 'candidat'>('all');

  if (!isOpen) return null;

  const applicationsCount = records.filter((r) => r.type === 'application').length;
  const enquiriesCount = records.filter((r) => r.type === 'enquiry').length;
  const candidatsCount = records.filter((r) => r.type === 'candidat').length;

  const filteredRecords = records.filter((r) => {
    if (typeFilter !== 'all' && r.type !== typeFilter) return false;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (r.ref || '').toLowerCase().includes(q) ||
      (r.fullName || '').toLowerCase().includes(q) ||
      (r.email || '').toLowerCase().includes(q) ||
      (r.countryHub || '').toLowerCase().includes(q) ||
      (r.program || '').toLowerCase().includes(q) ||
      (r.status || '').toLowerCase().includes(q) ||
      (r.adviser || '').toLowerCase().includes(q)
    );
  });

  const handleExportCsv = () => {
    if (records.length === 0) return;
    const headers = [
      'Reference',
      'Candidate Full Name',
      'Email Address',
      'Recruitment Hub / Country',
      'Record Type',
      'Target Program',
      'Status',
      'Submission / Registration Date',
      'Assigned Advisor',
    ];

    const rows = filteredRecords.map((r) => [
      `"${r.ref}"`,
      `"${r.fullName}"`,
      `"${r.email || '-'}"`,
      `"${r.countryHub}"`,
      `"${r.type === 'application' ? 'Application' : r.type === 'enquiry' ? 'Enquiry / Lead' : 'Qualified Candidate'}"`,
      `"${r.program || '-'}"`,
      `"${r.status || '-'}"`,
      `"${r.date || '-'}"`,
      `"${r.adviser || '-'}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `LIEC_Heavn_Volume_Breakdown_${periodLabel.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#092342]/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-slate-50 via-white to-slate-50">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="rounded-xl bg-[#0c685a] px-3 py-1 text-xs font-extrabold text-white">
                {periodLabel}
              </span>
              <span className="rounded-xl bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                {intakeLabel}
              </span>
              <span className="rounded-xl bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
                {hubLabel}
              </span>
            </div>
            <h3 className="text-lg font-black text-[#092342] mt-2">
              {isEn ? 'Activity & Intake Records Breakdown' : 'Détail des Enregistrements & Candidatures'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEn
                ? `${records.length} individual candidate & enquiry records contributing to this period`
                : `${records.length} dossiers et prospects réels enregistrés pour cette période`}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Metric Summary Badges */}
        <div className="px-6 py-3 bg-[#f8fafc] border-b border-slate-100 grid grid-cols-3 gap-3 text-xs">
          <div className="rounded-xl bg-white border border-slate-200 p-2.5 flex items-center justify-between shadow-2xs">
            <div>
              <span className="text-[10.5px] font-bold uppercase text-slate-500 block">
                {isEn ? 'Applications' : 'Candidatures'}
              </span>
              <span className="text-base font-black text-[#0c685a]">{applicationsCount}</span>
            </div>
            <FileText className="w-4 h-4 text-[#0c685a]" />
          </div>

          <div className="rounded-xl bg-white border border-slate-200 p-2.5 flex items-center justify-between shadow-2xs">
            <div>
              <span className="text-[10.5px] font-bold uppercase text-slate-500 block">
                {isEn ? 'Enquiries / Leads' : 'Demandes d’info'}
              </span>
              <span className="text-base font-black text-indigo-700">{enquiriesCount}</span>
            </div>
            <User className="w-4 h-4 text-indigo-600" />
          </div>

          <div className="rounded-xl bg-white border border-slate-200 p-2.5 flex items-center justify-between shadow-2xs">
            <div>
              <span className="text-[10.5px] font-bold uppercase text-slate-500 block">
                {isEn ? 'Qualified Candidates' : 'Candidats Qualifiés'}
              </span>
              <span className="text-base font-black text-emerald-600">{candidatsCount}</span>
            </div>
            <GraduationCap className="w-4 h-4 text-emerald-600" />
          </div>
        </div>

        {/* Filter Bar */}
        <div className="px-6 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs bg-white">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isEn ? 'Search by name, ref, program, status...' : 'Rechercher par nom, réf, programme...'}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-1 focus:ring-[#0c685a] focus:border-[#0c685a]"
            />
          </div>

          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-0.5 text-xs font-bold text-slate-600">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition ${typeFilter === 'all' ? 'bg-white text-[#092342] shadow-xs' : 'hover:text-[#092342]'}`}
            >
              {isEn ? `All (${records.length})` : `Tous (${records.length})`}
            </button>
            <button
              onClick={() => setTypeFilter('application')}
              className={`px-2.5 py-1 rounded-lg transition ${typeFilter === 'application' ? 'bg-white text-[#0c685a] shadow-xs' : 'hover:text-[#092342]'}`}
            >
              {isEn ? `Applications (${applicationsCount})` : `Dossiers (${applicationsCount})`}
            </button>
            <button
              onClick={() => setTypeFilter('enquiry')}
              className={`px-2.5 py-1 rounded-lg transition ${typeFilter === 'enquiry' ? 'bg-white text-indigo-700 shadow-xs' : 'hover:text-[#092342]'}`}
            >
              {isEn ? `Enquiries (${enquiriesCount})` : `Prospects (${enquiriesCount})`}
            </button>
            {candidatsCount > 0 && (
              <button
                onClick={() => setTypeFilter('candidat')}
                className={`px-2.5 py-1 rounded-lg transition ${typeFilter === 'candidat' ? 'bg-white text-emerald-700 shadow-xs' : 'hover:text-[#092342]'}`}
              >
                {isEn ? `Qualified (${candidatsCount})` : `Qualifiés (${candidatsCount})`}
              </button>
            )}
          </div>
        </div>

        {/* Records Table */}
        <div className="overflow-y-auto flex-1 p-6">
          {filteredRecords.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-slate-600">
                {isEn ? 'No records found matching filters.' : 'Aucun dossier ne correspond à vos filtres.'}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#f8fafc] border-b border-slate-200 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-3">Reference</th>
                    <th className="py-3 px-3">Candidate / Contact</th>
                    <th className="py-3 px-3">Hub</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3">Program / School</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.map((r, i) => (
                    <tr key={r.ref || i} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-3 font-mono font-bold text-[#092342] text-[11px]">
                        {r.ref}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-[#092342]">{r.fullName}</div>
                        {r.email && <div className="text-[10.5px] text-slate-400 truncate max-w-[150px]">{r.email}</div>}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-700 text-[11px]">
                          <span>{r.flag}</span>
                          <span>{r.countryHub.split('(')[0].trim()}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`rounded-lg px-2 py-0.5 text-[10.5px] font-bold ${
                            r.type === 'application'
                              ? 'bg-[#d8f6ea] text-[#0c685a]'
                              : r.type === 'enquiry'
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {r.type === 'application'
                            ? (isEn ? 'Application' : 'Dossier')
                            : r.type === 'enquiry'
                            ? (isEn ? 'Enquiry' : 'Prospect')
                            : (isEn ? 'Qualified' : 'Qualifié')}
                        </span>
                      </td>
                      <td className="py-3 px-3 max-w-[180px] truncate text-slate-600 text-[11px]" title={r.program}>
                        {r.program || '-'}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-medium text-slate-600 text-[11px]">
                          {r.status || 'Active'}
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap text-slate-500 text-[10.5px]">
                        {r.date}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onOpenRecord(r);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-slate-100 hover:bg-[#0c685a] hover:text-white px-2 py-1 text-[11px] font-bold text-slate-700 transition cursor-pointer"
                        >
                          <span>{isEn ? 'Inspect' : 'Consulter'}</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 text-xs">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-bold text-slate-700 shadow-2xs transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>{isEn ? 'Export Period CSV' : 'Exporter les dossiers (CSV)'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#092342] hover:bg-[#12365a] text-white font-extrabold shadow-sm transition cursor-pointer"
          >
            {isEn ? 'Close' : 'Fermer'}
          </button>
        </div>
      </div>
    </div>
  );
}
