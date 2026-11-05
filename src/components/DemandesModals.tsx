'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  UserPlus,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  RotateCw,
  Search,
  Check,
  Tag,
  Mail,
  User,
  ExternalLink,
  Printer,
  GraduationCap,
  Copy,
  Award,
} from 'lucide-react';

export interface AssignAdvisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedRefs: string[];
  selectedDemandes: any[];
  staffList: { name: string; email: string; title?: string; role?: string }[];
  currentUser?: any;
  onConfirm: (advisorName: string, adviserEmail: string, notes?: string) => Promise<void>;
  isEn?: boolean;
}

export function AssignAdvisorModal({
  isOpen,
  onClose,
  selectedRefs,
  selectedDemandes,
  staffList,
  currentUser,
  onConfirm,
  isEn = true,
}: AssignAdvisorModalProps) {
  const [search, setSearch] = useState('');
  const [selectedAdvisorEmail, setSelectedAdvisorEmail] = useState('');

  const currentEmail = (typeof currentUser === 'string' ? '' : currentUser?.email) || 'bmapwabantoro@liecconsulting.com';
  const currentName = (typeof currentUser === 'string' ? currentUser : currentUser?.name) || 'Barthelemy MAPWABA NTORO';

  const myAccount = useMemo(() => {
    return (
      staffList.find((s) => s.email.toLowerCase() === currentEmail.toLowerCase() || s.name.toLowerCase() === currentName.toLowerCase()) || {
        name: currentName,
        email: currentEmail,
        title: 'Platform Administrator & Managing Director',
      }
    );
  }, [staffList, currentEmail, currentName]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize selected advisor when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setError(null);
      setNotes('');
      if (staffList.length > 0 && !selectedAdvisorEmail) {
        setSelectedAdvisorEmail(staffList[0].email);
      }
    }
  }, [isOpen, staffList]);

  const filteredStaff = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return staffList;
    return staffList.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (s.title && s.title.toLowerCase().includes(q))
    );
  }, [staffList, search]);

  const selectedAdvisor = staffList.find((s) => s.email === selectedAdvisorEmail) || staffList[0];

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdvisor) {
      setError(isEn ? 'Please select an active advisor.' : 'Veuillez sélectionner un conseiller.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(selectedAdvisor.name, selectedAdvisor.email, notes.trim());
      onClose();
    } catch (err: any) {
      setError(err?.message || (isEn ? 'Assignment failed' : 'Échec de l’attribution'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-[#f8fafc]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#092342] text-white flex items-center justify-center shadow-xs">
              <UserPlus className="w-4 h-4 text-[#5eead4]" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#092342]">
                {isEn ? 'Assign Advisor' : 'Attribuer un Conseiller'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {isEn
                  ? `${selectedRefs.length} prospect lead${selectedRefs.length > 1 ? 's' : ''} selected`
                  : `${selectedRefs.length} dossier${selectedRefs.length > 1 ? 's' : ''} sélectionné${selectedRefs.length > 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3.5 flex items-center gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Selected Prospects Chips */}
          <div>
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-2">
              {isEn ? 'Selected Prospects' : 'Candidats Sélectionnés'} ({selectedRefs.length})
            </label>
            <div className="max-h-24 overflow-y-auto flex flex-wrap gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200">
              {selectedRefs.map((ref) => {
                const dem = selectedDemandes.find((d) => d && d.ref === ref);
                return (
                  <span
                    key={ref}
                    className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-[#092342] shadow-2xs"
                  >
                    <span>{ref}</span>
                    {dem?.full_name && (
                      <span className="text-slate-500 font-normal truncate max-w-[140px]">
                        • {dem.full_name}
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Searchable Advisor Directory */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                {isEn ? 'Choose Advisor (Active Staff Directory)' : 'Choisir le Conseiller (Annuaire Actif)'}
              </label>
              <span className="text-[11px] text-[#0c685a] font-bold">
                {staffList.length} {isEn ? 'available' : 'disponibles'}
              </span>
            </div>

            {/* Quick Auto-Assign to Myself Box */}
            {myAccount && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50/80 border border-indigo-200/90 mb-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#092342] text-white flex items-center justify-center font-bold text-xs shrink-0">
                    {myAccount.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold text-[#092342] truncate">
                      {myAccount.name} <span className="text-indigo-600 font-bold text-[10.5px]">({isEn ? 'Logged-in User / You' : 'Vous'})</span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {myAccount.email}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedAdvisorEmail(myAccount.email)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer ${
                    selectedAdvisorEmail.toLowerCase() === myAccount.email.toLowerCase()
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#092342] hover:bg-[#153a70] text-white'
                  }`}
                >
                  {selectedAdvisorEmail.toLowerCase() === myAccount.email.toLowerCase()
                    ? (isEn ? '✓ Selected' : '✓ Sélectionné')
                    : (isEn ? '⚡ Assign to Myself' : '⚡ M’attribuer')}
                </button>
              </div>
            )}

            {/* Search filter input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isEn ? 'Filter by advisor name or email...' : 'Filtrer par nom ou email...'}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#092342] transition"
              />
            </div>

            {/* Advisor List */}
            <div className="max-h-48 overflow-y-auto space-y-1.5 border border-slate-200 rounded-xl p-2 bg-slate-50/50">
              {filteredStaff.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  {isEn ? 'No staff member matches your query.' : 'Aucun conseiller ne correspond à la recherche.'}
                </div>
              ) : (
                filteredStaff.map((staff) => {
                  const isSelected = selectedAdvisorEmail === staff.email;
                  const initials = staff.name
                    ? staff.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()
                    : 'ST';
                  return (
                    <div
                      key={staff.email}
                      onClick={() => setSelectedAdvisorEmail(staff.email)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition cursor-pointer ${
                        isSelected
                          ? 'bg-white border-[#092342] shadow-xs'
                          : 'bg-white/60 border-slate-200/80 hover:bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-extrabold text-xs shrink-0 ${
                            isSelected ? 'bg-[#092342] text-white' : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-extrabold text-[#092342] truncate">
                            {staff.name}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate flex items-center gap-1.5">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{staff.email}</span>
                            {staff.title && (
                              <span className="text-slate-400">• {staff.title}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="pl-2 shrink-0">
                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                            isSelected
                              ? 'border-[#092342] bg-[#092342] text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Internal Assignment Notes */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
              {isEn ? 'Assignment Instructions / Notes (Optional)' : 'Instructions d’Attribution (Optionnel)'}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                isEn
                  ? 'Add instructions or reason for this assignment. Recorded in the prospect audit history.'
                  : 'Ajoutez une consigne pour le conseiller. Enregistrée dans l’historique d’audit.'
              }
              className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#092342] transition"
            />
          </div>

          {/* Notification Alert */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-800 flex items-start gap-2.5">
            <Mail className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-extrabold block mb-0.5">
                {isEn ? 'Automatic Email Notification' : 'Notification Email Automatique'}
              </span>
              <span className="text-slate-600 text-[11px]">
                {isEn
                  ? `An official assignment email will automatically be sent to ${selectedAdvisor?.email || 'the selected advisor'}.`
                  : `Un email d’attribution officiel sera automatiquement envoyé à ${selectedAdvisor?.email || 'ce conseiller'}.`}
              </span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              {isEn ? 'Cancel' : 'Annuler'}
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedAdvisor}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#092342] hover:bg-[#12365a] text-white text-xs font-extrabold shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin text-[#5eead4]" />
                  <span>{isEn ? 'Assigning...' : 'Attribution en cours...'}</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5 text-[#5eead4]" />
                  <span>{isEn ? 'Confirm Assignment' : 'Confirmer l’Attribution'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export interface ManualStatusOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedRefs: string[];
  selectedDemandes: any[];
  onConfirm: (newStatus: string, reason: string, notes?: string) => Promise<void>;
  isEn?: boolean;
}

const CRM_STATUS_OPTIONS = [
  { value: 'New', labelEn: 'New Application', labelFr: 'Nouvelle Demande', dot: 'bg-emerald-500' },
  { value: 'To Contact', labelEn: 'To Contact', labelFr: 'À contacter', dot: 'bg-amber-500' },
  { value: 'In Progress', labelEn: 'In Progress', labelFr: 'En cours', dot: 'bg-blue-600' },
  { value: 'Awaiting Info', labelEn: 'Awaiting Info', labelFr: 'Attente infos', dot: 'bg-rose-500' },
  { value: 'Qualified', labelEn: 'Qualified', labelFr: 'Qualifiée', dot: 'bg-teal-500' },
  { value: 'Converted', labelEn: 'Converted to Candidate', labelFr: 'Convertie en Candidat', dot: 'bg-indigo-600' },
  { value: 'Closed', labelEn: 'Closed / Discontinued', labelFr: 'Classée sans suite', dot: 'bg-slate-400' },
  { value: 'Archived', labelEn: 'Archived', labelFr: 'Archivée', dot: 'bg-slate-600' },
];

export function ManualStatusOverrideModal({
  isOpen,
  onClose,
  selectedRefs,
  selectedDemandes,
  onConfirm,
  isEn = true,
}: ManualStatusOverrideModalProps) {
  const [targetStatus, setTargetStatus] = useState('Qualified');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setError(null);
      setReason('');
      setNotes('');
      setConfirmed(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 5) {
      setError(
        isEn
          ? 'Mandatory justification required for manual status override (at least 5 characters).'
          : 'Motif obligatoire pour la dérogation manuelle (au moins 5 caractères).'
      );
      return;
    }
    if (!confirmed) {
      setError(
        isEn
          ? 'Please check the box to acknowledge this manual override.'
          : 'Veuillez cocher la case confirmant cette dérogation manuelle.'
      );
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(targetStatus, reason.trim(), notes.trim());
      onClose();
    } catch (err: any) {
      setError(err?.message || (isEn ? 'Override failed' : 'Échec de la dérogation'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-[#f8fafc]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Tag className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#092342]">
                {isEn ? 'Manual Status Override' : 'Dérogation Manuelle de Statut'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {isEn
                  ? `Exceptional status update for ${selectedRefs.length} lead${selectedRefs.length > 1 ? 's' : ''}`
                  : `Mise à jour exceptionnelle pour ${selectedRefs.length} dossier${selectedRefs.length > 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Warning Banner */}
        <div className="bg-amber-50 border-b border-amber-200/80 px-6 py-3 flex items-start gap-2.5 text-xs text-amber-900">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed font-semibold">
            {isEn
              ? 'This action manually overrides the normal prospect workflow. Please ensure that the change is justified and authorised.'
              : 'Cette action déroge au workflow automatisé standard. Veuillez vous assurer que ce changement exceptionnel est justifié et autorisé.'}
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3.5 flex items-center gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Current Status of Selected Records */}
          <div>
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-2">
              {isEn ? 'Target Records & Current Status' : 'Dossiers Cibles & Statut Actuel'} ({selectedRefs.length})
            </label>
            <div className="max-h-28 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200">
              {selectedRefs.map((ref) => {
                const dem = selectedDemandes.find((d) => d && d.ref === ref);
                return (
                  <div
                    key={ref}
                    className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-[#092342]">{ref}</span>
                      {dem?.full_name && (
                        <span className="text-slate-600 font-medium truncate max-w-[160px]">
                          {dem.full_name}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                      {dem?.status || 'New'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Target Status Selection */}
          <div className="space-y-2">
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
              {isEn ? 'New Override Status *' : 'Nouveau Statut de Dérogation *'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CRM_STATUS_OPTIONS.map((opt) => {
                const isSelected = targetStatus === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTargetStatus(opt.value)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer text-left ${
                      isSelected
                        ? 'border-[#092342] bg-[#f0f4f9] text-[#092342] shadow-2xs ring-1 ring-[#092342]'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${opt.dot} shrink-0`} />
                    <span className="truncate">{isEn ? opt.labelEn : opt.labelFr}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mandatory Reason */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700">
              {isEn ? 'Reason for Manual Override (Mandatory) *' : 'Motif de Dérogation Manuelle (Obligatoire) *'}
            </label>
            <textarea
              rows={2}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                isEn
                  ? 'E.g. Exceptional sponsorship waiver granted; candidate interview conducted directly with partner dean...'
                  : 'Ex : Dérogation spéciale accordée par la direction; entretien préalable réalisé directement...'
              }
              className="w-full p-3 rounded-xl border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#092342] transition"
            />
            <p className="text-[10.5px] text-slate-500">
              {isEn
                ? 'Minimum 5 characters. Stored immutably in internal audit log.'
                : 'Minimum 5 caractères. Enregistré de manière immuable dans l’historique d’audit.'}
            </p>
          </div>

          {/* Additional Notes */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
              {isEn ? 'Additional Internal Notes (Optional)' : 'Notes Internes Additionnelles (Optionnel)'}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isEn ? 'Follow-up instructions or context...' : 'Instructions de suivi ou contexte...'}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#092342] transition"
            />
          </div>

          {/* Explicit Confirmation Checkbox */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 flex items-start gap-2.5">
            <input
              type="checkbox"
              id="confirm-override"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#092342] focus:ring-[#092342] cursor-pointer"
            />
            <label htmlFor="confirm-override" className="text-xs text-slate-700 leading-snug cursor-pointer select-none">
              <span className="font-extrabold text-[#092342] block mb-0.5">
                {isEn ? 'Authorised Confirmation' : 'Confirmation d’Autorisation'}
              </span>
              <span>
                {isEn
                  ? 'I confirm that this manual status override is justified, authorized under internal policy, and should be recorded in the audit logs.'
                  : 'Je confirme que cette dérogation manuelle de statut est justifiée, autorisée et consignée dans l’audit.'}
              </span>
            </label>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              {isEn ? 'Cancel' : 'Annuler'}
            </button>
            <button
              type="submit"
              disabled={submitting || reason.trim().length < 5 || !confirmed}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold shadow-sm transition disabled:opacity-40 cursor-pointer"
            >
              {submitting ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin text-white" />
                  <span>{isEn ? 'Applying...' : 'Application...'}</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-white" />
                  <span>{isEn ? 'Apply Manual Override' : 'Appliquer la Dérogation'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


export interface FullStudentRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  demande: any;
  onOpenCandidatDossier: (dem: any) => void;
  isEn?: boolean;
}

export function FullStudentRecordModal({
  isOpen,
  onClose,
  demande,
  onOpenCandidatDossier,
  isEn = true,
}: FullStudentRecordModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !demande) return null;

  const handleCopyEmail = () => {
    if (demande.email && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(demande.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenInNewWindow = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=800,scrollbars=yes');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${demande.ref} - ${demande.full_name} | LIEC Heav'n Student Record</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #092342; background: #fff; line-height: 1.5; }
            .header { border-bottom: 2px solid #0c685a; padding-bottom: 15px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: center; }
            .badge { background: #6ee7b7; color: #064e3b; padding: 4px 10px; border-radius: 8px; font-weight: bold; font-size: 12px; }
            .ref { color: #092342; font-size: 20px; font-weight: 800; }
            .name { font-size: 24px; font-weight: 800; margin: 10px 0 5px 0; color: #092342; }
            .section { margin-bottom: 25px; padding: 15px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; }
            .section-title { font-size: 13px; font-weight: 800; color: #0c685a; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.5px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
            .field-label { font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; }
            .field-value { font-size: 14px; font-weight: 600; color: #092342; margin-top: 2px; }
            .print-btn { margin-top: 20px; padding: 10px 20px; background: #0c685a; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; }
            @media print { .print-btn { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <span class="badge">${demande.status || 'Active'}</span>
              <span class="ref" style="margin-left: 10px;">${demande.ref}</span>
            </div>
            <div style="font-size: 12px; color: #64748b; font-weight: bold;">LIEC Heav'n — Student Record Dossier</div>
          </div>
          <div class="name">${demande.full_name || 'Sans Nom'}</div>
          <div style="color: #64748b; font-size: 13px; margin-bottom: 20px;">${demande.country_name || demande.country_code || 'RDC'} • ${demande.submitted_at || 'Recently submitted'}</div>

          <div class="section">
            <div class="section-title">Verified Contact Details</div>
            <div class="grid">
              <div><div class="field-label">Phone / WhatsApp</div><div class="field-value">${demande.phone || '-'}</div></div>
              <div><div class="field-label">Email Address</div><div class="field-value">${demande.email || '-'}</div></div>
              <div><div class="field-label">Gender</div><div class="field-value">${demande.sexe || 'Male'}</div></div>
              <div><div class="field-label">Origin City / Country</div><div class="field-value">${demande.city || '-'}, ${demande.country_name || demande.country_code || 'RDC'}</div></div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Study Project & Financing</div>
            <div class="grid">
              <div><div class="field-label">Desired Program</div><div class="field-value">${demande.program || '-'}</div></div>
              <div><div class="field-label">Application Year</div><div class="field-value">${demande.application_year || demande.expected_start || '-'}</div></div>
              <div><div class="field-label">Target Cities / Campus</div><div class="field-value">${demande.target_cities || 'Lyon (Exclusivement)'}</div></div>
              <div><div class="field-label">Current Academic Level</div><div class="field-value">${demande.current_level || '-'}</div></div>
              <div><div class="field-label">Guaranteed Annual Budget</div><div class="field-value">${demande.budget_range || '-'} €</div></div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Parent Link & Academic Background</div>
            <div class="grid">
              <div><div class="field-label">Parent Full Name</div><div class="field-value">${demande.parent_full_name || '-'}</div></div>
              <div><div class="field-label">Parent Phone</div><div class="field-value">${demande.parent_phone || '-'}</div></div>
              <div><div class="field-label">Graduation Year</div><div class="field-value">${demande.graduation_year || '-'}</div></div>
              <div><div class="field-label">Current Activity</div><div class="field-value">${demande.current_activity || '-'}</div></div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Assigned Advisor</div>
            <div class="grid">
              <div><div class="field-label">Academic Advisor</div><div class="field-value">${demande.adviser || 'Barthelemy MAPWABA NTORO'}</div></div>
              <div><div class="field-label">Advisor Email</div><div class="field-value">${demande.adviser_email || 'bmapwabantoro@liecconsulting.com'}</div></div>
            </div>
          </div>

          <button class="print-btn" onclick="window.print()">Print Student Dossier</button>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#092342]/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Top Bar */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-slate-50">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-[#6ee7b7] px-3 py-1 text-xs font-extrabold text-[#064e3b]">
              {demande.status === 'New' || demande.status === 'Nouvelle' ? 'New Application' : (demande.status || 'Active')}
            </span>
            <span className="text-base font-extrabold text-[#092342]">
              {demande.ref}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenInNewWindow}
              title={isEn ? 'Open printable view in new window' : 'Ouvrir dans une nouvelle fenêtre'}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">{isEn ? 'New Window / Print' : 'Imprimer'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              title={isEn ? 'Close' : 'Fermer'}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Candidate Hero Card */}
          <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="w-14 h-14 rounded-2xl bg-[#092342] text-white flex items-center justify-center font-extrabold text-lg shadow-sm shrink-0">
              {demande.initials || '??'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-black text-[#092342]">{demande.full_name || 'Sans Nom'}</h3>
                <span className="text-xs text-slate-500 font-medium">
                  • {demande.country_name || demande.country_code || 'RDC'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isEn ? 'Application submitted on' : 'Demande enregistrée le'} {demande.submitted_at || 'récemment'}
              </p>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                  <Award className="w-3 h-3 text-emerald-600" />
                  <span>Qualified Candidate</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700 border border-indigo-200">
                  <GraduationCap className="w-3 h-3 text-indigo-600" />
                  <span>{demande.program?.split('—')[0]?.trim() || 'Programme Lyon'}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Section: Contact & Identity */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-[#0c685a] mb-3 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#0c685a]" />
              <span>{isEn ? 'Verified Contact & Identity' : 'Coordonnées & Identité Vérifiées'}</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl border border-slate-200 bg-white">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  {isEn ? 'Phone / WhatsApp' : 'Téléphone / WhatsApp'}
                </span>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#092342]">{demande.phone || '-'}</span>
                  <a
                    href={`https://wa.me/${(demande.phone || '').replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline inline-flex items-center gap-1"
                  >
                    <span>WhatsApp</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-white">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  {isEn ? 'Email Address' : 'Courriel professionnel'}
                </span>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#092342] truncate mr-2">{demande.email || '-'}</span>
                  <button
                    type="button"
                    onClick={handleCopyEmail}
                    className="text-[11px] font-bold text-slate-500 hover:text-[#092342] inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copied ? 'Copié !' : 'Copier'}</span>
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-white">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  {isEn ? 'Gender / Sexe' : 'Genre / Sexe'}
                </span>
                <span className="font-bold text-[#092342]">
                  {demande.sexe === 'Female' || demande.sexe === 'Féminin' ? (isEn ? 'Female' : 'Féminin') : (isEn ? 'Male' : 'Masculin')}
                </span>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-white">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  {isEn ? 'Origin City & Country' : 'Ville & Pays d\'origine'}
                </span>
                <span className="font-bold text-[#092342]">
                  {demande.city || '-'}, {demande.country_name || demande.country_code || 'RDC'}
                </span>
              </div>
            </div>
          </div>

          {/* Section: Academic Background & Study Project */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-[#0c685a] mb-3 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-[#0c685a]" />
              <span>{isEn ? 'Study Project & Academic Background' : 'Projet d\'Études & Parcours Académique'}</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl border border-slate-200 bg-white sm:col-span-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  {isEn ? 'Desired Program & Lyon Partner Campus' : 'Programme & Campus Partenaire Lyon'}
                </span>
                <span className="font-bold text-[#092342] text-sm block">{demande.program || '-'}</span>
                <span className="text-[11px] text-slate-500 mt-0.5 block">{demande.target_cities || 'Lyon (Exclusivement)'}</span>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-white">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  {isEn ? 'Application Year' : 'Année Académique'}
                </span>
                <span className="font-bold text-[#0c685a] text-sm">
                  {demande.application_year || demande.expected_start || '—'}
                </span>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-white">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  {isEn ? 'Current Academic Level' : 'Niveau d\'études actuel'}
                </span>
                <span className="font-bold text-[#092342]">{demande.current_level || '-'}</span>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-white">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  {isEn ? 'Guaranteed Annual Budget' : 'Budget annuel garanti'}
                </span>
                <span className="font-black text-[#0c685a] text-sm">{demande.budget_range || '-'} €</span>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-white">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  {isEn ? 'Graduation Year' : 'Année d\'obtention du diplôme'}
                </span>
                <span className="font-bold text-[#092342]">{demande.graduation_year || '-'}</span>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-white">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  {isEn ? 'Current Activity' : 'Activité courante'}
                </span>
                <span className="font-bold text-[#092342]">{demande.current_activity || '-'}</span>
              </div>
            </div>
          </div>

          {/* Section: Parent Link & Academic Guarantor */}
          {(demande.parent_full_name || demande.parent_phone) && (
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-[#0c685a] mb-3 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#0c685a]" />
                <span>{isEn ? 'Parent Link & Academic Guarantor' : 'Lien Parental & Garant Académique'}</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl border border-slate-200 bg-white">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    {isEn ? 'Parent Full Name' : 'Nom complet du parent'}
                  </span>
                  <span className="font-bold text-[#092342]">{demande.parent_full_name || '-'}</span>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 bg-white">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    {isEn ? 'Parent Phone Number' : 'Numéro du parent'}
                  </span>
                  <span className="font-bold text-[#092342]">{demande.parent_phone || '-'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Section: Assigned Advisor */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-[#0c685a] mb-3 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#0c685a]" />
              <span>{isEn ? 'Assigned Academic Advisor' : 'Conseiller Académique Attribué'}</span>
            </h4>
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#092342] text-white flex items-center justify-center font-bold text-xs">
                  {demande.adviser ? demande.adviser.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() : 'BM'}
                </div>
                <div>
                  <div className="font-extrabold text-[#092342]">{demande.adviser || 'Barthelemy MAPWABA NTORO'}</div>
                  <div className="text-[11px] text-slate-500">{demande.adviser_email || 'bmapwabantoro@liecconsulting.com'}</div>
                </div>
              </div>
              {demande.adviser_assigned_at && (
                <div className="text-[11px] text-slate-400">
                  {isEn ? 'Assigned on' : 'Attribué le'} {new Date(demande.adviser_assigned_at).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-white transition cursor-pointer"
          >
            {isEn ? 'Close Form' : 'Fermer'}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenInNewWindow}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>{isEn ? 'Open in New Window' : 'Nouvelle Fenêtre'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenCandidatDossier(demande);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0c685a] hover:bg-[#095247] text-white text-xs font-extrabold shadow-sm transition cursor-pointer"
            >
              <GraduationCap className="w-4 h-4 text-emerald-300" />
              <span>{isEn ? 'Open Candidate Dossier (Candidats)' : 'Ouvrir Dossier Candidat'}</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
