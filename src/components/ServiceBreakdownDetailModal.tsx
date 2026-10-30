'use client';

import React, { useState } from 'react';
import {
  X,
  Search,
  ExternalLink,
  Layers,
  GraduationCap,
  Calendar,
  DollarSign,
  ChevronRight,
  ShieldCheck,
  User,
} from 'lucide-react';

export interface ServiceRecordItem {
  id: string | number;
  ref: string;
  fullName: string;
  serviceType: string;
  program: string;
  status: string;
  date: string;
  academicIntake: string;
  sourceModule: 'demandes' | 'candidats' | 'avi' | 'accommodation';
  valueEur?: number;
}

export function ServiceBreakdownDetailModal({
  serviceName,
  serviceColor,
  records,
  totalRecordsCount,
  percentage,
  totalValueEur,
  isEn = true,
  onClose,
  onOpenRecord,
}: {
  serviceName: string;
  serviceColor: string;
  records: ServiceRecordItem[];
  totalRecordsCount: number;
  percentage: number;
  totalValueEur: number;
  isEn?: boolean;
  onClose: () => void;
  onOpenRecord: (record: ServiceRecordItem) => void;
}) {
  const [filterQuery, setFilterQuery] = useState('');

  const filteredRecords = records.filter((r) => {
    const q = filterQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      r.ref.toLowerCase().includes(q) ||
      r.fullName.toLowerCase().includes(q) ||
      r.program.toLowerCase().includes(q) ||
      r.status.toLowerCase().includes(q) ||
      r.academicIntake.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <span
              className="h-4 w-4 rounded-full shrink-0 shadow-sm"
              style={{ backgroundColor: serviceColor }}
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-extrabold text-[#092342]">{serviceName}</h3>
                <span className="rounded-full bg-[#f1f6fb] px-2.5 py-0.5 text-xs font-bold text-[#0c685a]">
                  {percentage}% {isEn ? 'of total volume' : 'du volume total'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isEn
                  ? `Detailed audit trail of records represented in this service category`
                  : `Détail complet des dossiers enregistrés sous cette catégorie de service`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3 Summary KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-6 bg-[#fcfdfe] border-b border-slate-100">
          <div className="p-3.5 rounded-xl border border-slate-200/80 bg-white">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              {isEn ? 'REPRESENTED RECORDS' : 'DOSSIERS COMPTABILISÉS'}
            </span>
            <div className="text-2xl font-extrabold text-[#092342] mt-1">
              {records.length}
              <span className="text-xs font-normal text-slate-500 ml-1.5">
                / {totalRecordsCount} {isEn ? 'total' : 'total'}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200/80 bg-white">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              {isEn ? 'ESTIMATED / RECORDED VALUE' : 'VALEUR ESTIMÉE / ENREGISTRÉE'}
            </span>
            <div className="text-2xl font-extrabold text-[#0c685a] mt-1">
              €{totalValueEur.toLocaleString()}
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200/80 bg-white">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              {isEn ? 'DATA VALIDATION' : 'VALIDATION DES DONNÉES'}
            </span>
            <div className="flex items-center gap-1.5 mt-1 text-sm font-bold text-[#092342]">
              <ShieldCheck className="w-4 h-4 text-[#10b981]" />
              <span>Neon PostgreSQL Live</span>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-100 bg-white flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder={
                isEn
                  ? 'Search by name, ref (#DEM, #CAN), status, intake...'
                  : 'Filtrer par nom, référence, statut, session...'
              }
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0c685a]/20 bg-[#fbfcfd]"
            />
          </div>
          <span className="text-xs text-slate-500 font-medium shrink-0">
            {filteredRecords.length} {isEn ? 'entries found' : 'enregistrements trouvés'}
          </span>
        </div>

        {/* Records Table */}
        <div className="overflow-y-auto flex-1 p-6 space-y-2">
          {filteredRecords.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-slate-600">
                {isEn ? 'No records found for this filter' : 'Aucun dossier correspondant à ce filtre'}
              </p>
              <p className="text-slate-400 text-[11px] mt-1">
                {isEn ? 'Try adjusting your search query' : 'Modifiez les termes de recherche'}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
              <div className="grid grid-cols-12 bg-slate-50 px-4 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <div className="col-span-2">Ref</div>
                <div className="col-span-4">{isEn ? 'Candidate / Student' : 'Candidat / Étudiant'}</div>
                <div className="col-span-3">{isEn ? 'Program / Service' : 'Programme / Service'}</div>
                <div className="col-span-2">{isEn ? 'Status' : 'Statut'}</div>
                <div className="col-span-1 text-right">{isEn ? 'Action' : 'Action'}</div>
              </div>

              {filteredRecords.map((item) => (
                <div
                  key={`${item.sourceModule}-${item.id}`}
                  className="grid grid-cols-12 items-center px-4 py-3 hover:bg-slate-50 transition text-xs"
                >
                  <div className="col-span-2 font-mono font-bold text-[#092342] text-[11.5px]">
                    {item.ref}
                  </div>
                  <div className="col-span-4">
                    <div className="font-extrabold text-[#092342]">{item.fullName}</div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>{item.academicIntake || item.date}</span>
                    </div>
                  </div>
                  <div className="col-span-3 text-slate-600 pr-2 truncate" title={item.program}>
                    {item.program}
                  </div>
                  <div className="col-span-2">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-[#f1f6fb] text-[#092342] border border-slate-200">
                      {item.status}
                    </span>
                  </div>
                  <div className="col-span-1 text-right">
                    <button
                      onClick={() => onOpenRecord(item)}
                      className="p-1.5 rounded-lg text-[#0c685a] hover:bg-[#d8f6ea] transition cursor-pointer inline-flex items-center gap-1 font-bold text-[11px]"
                      title={isEn ? 'Open full record' : 'Consulter le dossier'}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>
            {isEn ? 'Displaying real subproduction records' : 'Affichage des données réelles de sous-production'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold transition cursor-pointer"
          >
            {isEn ? 'Close' : 'Fermer'}
          </button>
        </div>
      </div>
    </div>
  );
}
