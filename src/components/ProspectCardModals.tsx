'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Phone,
  Calendar,
  Clock,
  User,
  MessageSquare,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Send,
  Edit3,
  Building,
  GraduationCap,
  ShieldCheck,
  Tag,
} from 'lucide-react';

export interface ProspectItem {
  id: number;
  full_name: string;
  stage: string;
  badge_text: string;
  badge_tone: string;
  flag: string;
  country_city: string;
  program_tag: string;
  program_tag_tone?: string;
  highlight_box?: string | null;
  meta_left: string;
  meta_right: string;
  meta_right_tone?: string;
  adviser_initials: string;
  adviser_name: string;
  adviser_color?: string;
  estimated_value: number;
  is_urgent: boolean;
  is_prepa?: boolean;
  created_at?: string;
}

// ============================================================================
// 1. SCHEDULE A CALL MODAL
// ============================================================================
export function ScheduleCallModal({
  prospect,
  staffList = [],
  currentUser = 'Barthelemy MAPWABA NTORO',
  isEn = true,
  onClose,
  onSaved,
}: {
  prospect: ProspectItem;
  staffList: { name: string; email?: string; title?: string }[];
  currentUser?: string;
  isEn?: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [date, setDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [time, setTime] = useState('14:30');
  const [subject, setSubject] = useState(
    isEn ? 'Initial Orientation & Profile Diagnostic' : 'Entretien Initial d’Orientation & Diagnostic'
  );
  const [assignedTo, setAssignedTo] = useState(
    staffList.find((s) => s.name === prospect.adviser_name)?.name ||
      staffList[0]?.name ||
      currentUser
  );
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/prospects/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospect_id: prospect.id,
          scheduled_date: date,
          scheduled_time: time,
          subject,
          assigned_to: assignedTo,
          notes,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to schedule call');
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de la planification');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-[#f1f6fb] to-white">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#092342] text-[#5eead4] flex items-center justify-center">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-[#092342]">
                {isEn ? 'Schedule a Call' : 'Planifier un Appel'}
              </h3>
              <p className="text-xs text-slate-500">
                {isEn ? 'With prospect:' : 'Avec le prospect :'} <strong>{prospect.full_name}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isEn ? 'Date' : 'Date'}
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0c685a]/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isEn ? 'Time Slot' : 'Créneau horaire'}
              </label>
              <select
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0c685a]/20"
              >
                <option value="09:00">09:00 (Paris / Kinshasa)</option>
                <option value="10:00">10:00 (Paris / Kinshasa)</option>
                <option value="11:30">11:30 (Paris / Kinshasa)</option>
                <option value="14:00">14:00 (Paris / Kinshasa)</option>
                <option value="14:30">14:30 (Paris / Kinshasa)</option>
                <option value="15:30">15:30 (Paris / Kinshasa)</option>
                <option value="16:30">16:30 (Paris / Kinshasa)</option>
                <option value="17:30">17:30 (Paris / Kinshasa)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isEn ? 'Call Subject / Purpose' : 'Objet de l’appel'}
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0c685a]/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isEn ? 'Assigned Advisor (Active Staff)' : 'Conseiller assigné (Équipe active)'}
            </label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-[#092342] focus:outline-none focus:ring-2 focus:ring-[#0c685a]/20"
            >
              {staffList.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name} {s.title ? `— ${s.title}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isEn ? 'Agenda & Notes (Optional)' : 'Ordre du jour & Notes (Optionnel)'}
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                isEn
                  ? 'Key questions regarding university choices, budget, or PREPA intake...'
                  : 'Points à aborder : choix de filière, budget familial, rentrée PREPA...'
              }
              className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0c685a]/20"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
            >
              {isEn ? 'Cancel' : 'Annuler'}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-[#092342] hover:bg-[#153a70] text-white text-xs font-extrabold shadow-sm transition disabled:opacity-50 flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-[#5eead4]" />
              <span>{submitting ? (isEn ? 'Saving...' : 'Enregistrement...') : isEn ? 'Save Scheduled Call' : 'Enregistrer l’appel'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// 2. EDIT PROSPECT MODAL
// ============================================================================
export function EditProspectModal({
  prospect,
  staffList = [],
  isEn = true,
  onClose,
  onSaved,
}: {
  prospect: ProspectItem;
  staffList: { name: string; email?: string; title?: string }[];
  isEn?: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [fullName, setFullName] = useState(prospect.full_name);
  const [stage, setStage] = useState(prospect.stage);
  const [countryCity, setCountryCity] = useState(prospect.country_city);
  const [programTag, setProgramTag] = useState(prospect.program_tag);
  const [adviserName, setAdviserName] = useState(prospect.adviser_name);
  const [estimatedValue, setEstimatedValue] = useState(String(prospect.estimated_value || 1800));
  const [isUrgent, setIsUrgent] = useState(Boolean(prospect.is_urgent));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/prospects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: prospect.id,
          full_name: fullName.trim(),
          stage,
          country_city: countryCity.trim(),
          program_tag: programTag.trim(),
          adviser_name: adviserName,
          estimated_value: Number(estimatedValue),
          is_urgent: isUrgent,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update prospect');
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de la mise à jour');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-[#f1f6fb] to-white">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#092342] text-white flex items-center justify-center">
              <Edit3 className="w-5 h-5 text-[#f4be37]" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-[#092342]">
                {isEn ? 'Edit Prospect Record' : 'Modifier la Fiche Prospect'}
              </h3>
              <p className="text-xs text-slate-500">
                ID #{prospect.id} — {prospect.full_name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isEn ? 'Full Name' : 'Nom Complet'}
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0c685a]/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isEn ? 'Pipeline Stage' : 'Étape du Pipeline'}
              </label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-[#092342] focus:outline-none focus:ring-2 focus:ring-[#0c685a]/20"
              >
                <option value="nouveau">1. Nouveau</option>
                <option value="premier_contact">2. Premier Contact</option>
                <option value="diagnostic">3. Diagnostic / Grille</option>
                <option value="qualifie">4. Qualifié</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isEn ? 'Location / Country & City' : 'Localisation (Pays & Ville)'}
              </label>
              <input
                type="text"
                value={countryCity}
                onChange={(e) => setCountryCity(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0c685a]/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isEn ? 'Target Program / Tag' : 'Programme Cible / École'}
            </label>
            <input
              type="text"
              value={programTag}
              onChange={(e) => setProgramTag(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0c685a]/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isEn ? 'Assigned Advisor' : 'Conseiller Assigné'}
              </label>
              <select
                value={adviserName}
                onChange={(e) => setAdviserName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-[#092342] focus:outline-none focus:ring-2 focus:ring-[#0c685a]/20"
              >
                {staffList.map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isEn ? 'Estimated Value (€)' : 'Valeur Estimée (€)'}
              </label>
              <input
                type="number"
                value={estimatedValue}
                onChange={(e) => setEstimatedValue(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-extrabold text-[#0c685a] focus:outline-none focus:ring-2 focus:ring-[#0c685a]/20"
              />
            </div>
          </div>

          <div className="pt-1">
            <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
              <input
                type="checkbox"
                checked={isUrgent}
                onChange={(e) => setIsUrgent(e.target.checked)}
                className="rounded text-red-600 focus:ring-red-500 w-4 h-4"
              />
              <span className="text-red-700">
                {isEn ? 'Flag as High Priority (< 24h follow-up)' : 'Marquer comme Haute Priorité (< 24h)'}
              </span>
            </label>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
            >
              {isEn ? 'Cancel' : 'Annuler'}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-[#092342] hover:bg-[#153a70] text-white text-xs font-extrabold shadow-sm transition disabled:opacity-50 flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-[#5eead4]" />
              <span>{submitting ? (isEn ? 'Saving...' : 'Enregistrement...') : isEn ? 'Save Changes' : 'Enregistrer les modifications'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// 3. PROSPECT COMMENTS & INTERNAL NOTES MODAL
// ============================================================================
export function ProspectCommentsModal({
  prospect,
  currentUser = 'Barthelemy MAPWABA NTORO',
  currentUserRole = 'Admin',
  isEn = true,
  onClose,
}: {
  prospect: ProspectItem;
  currentUser?: string;
  currentUserRole?: string;
  isEn?: boolean;
  onClose: () => void;
}) {
  const [comments, setComments] = useState<any[]>([]);
  const [newContent, setNewContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/prospects/comments?prospect_id=${prospect.id}`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      }
    } catch (e) {
      console.warn('Could not fetch comments:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [prospect.id]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/prospects/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospect_id: prospect.id,
          author_name: currentUser,
          author_role: currentUserRole,
          content: newContent.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to post note');
      }

      setNewContent('');
      await fetchComments();
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de la publication');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-100 flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-[#f1f6fb] to-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#092342] text-white flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-[#5eead4]" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-[#092342]">
                {isEn ? 'Internal Notes & Comments' : 'Notes Internes & Commentaires'}
              </h3>
              <p className="text-xs text-slate-500">
                {isEn ? 'Candidate:' : 'Candidat :'} <strong>{prospect.full_name}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comments History */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-[#fafcff]">
          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400">
              {isEn ? 'Loading comments...' : 'Chargement des notes...'}
            </div>
          ) : comments.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 space-y-1">
              <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-600">
                {isEn ? 'No internal notes recorded yet' : 'Aucune note interne pour le moment'}
              </p>
              <p className="text-slate-400 text-[11px]">
                {isEn
                  ? 'Add your diagnostic notes, call summaries, or parent remarks below.'
                  : 'Ajoutez ci-dessous vos remarques de diagnostic, bilans d’appels ou échanges parents.'}
              </p>
            </div>
          ) : (
            comments.map((c) => (
              <div
                key={c.id}
                className="p-3.5 rounded-xl border border-slate-200/80 bg-white shadow-xs space-y-1.5"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#092342]">{c.author_name}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.2 text-[9.5px] font-semibold text-slate-500">
                      {c.author_role || 'Staff'}
                    </span>
                  </div>
                  <span className="text-slate-400 text-[10.5px]">
                    {c.created_at ? new Date(c.created_at).toLocaleString() : ''}
                  </span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed font-normal whitespace-pre-wrap">
                  {c.content}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Input Form */}
        <form onSubmit={handleAddComment} className="p-4 border-t border-slate-100 bg-white shrink-0 space-y-3">
          {error && (
            <div className="p-2.5 rounded-lg bg-red-50 text-red-700 text-xs font-semibold">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <textarea
              rows={2}
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder={
                isEn
                  ? 'Add an internal note visible to authorized staff...'
                  : 'Ajouter une note interne visible par l’équipe...'
              }
              className="flex-1 rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0c685a]/20 resize-none"
            />
            <button
              type="submit"
              disabled={submitting || !newContent.trim()}
              className="px-4 rounded-xl bg-[#092342] hover:bg-[#153a70] text-white text-xs font-bold transition disabled:opacity-40 flex items-center justify-center shrink-0 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// 4. PROSPECT PROFILE DETAIL MODAL
// ============================================================================
export function ProspectProfileModal({
  prospect,
  isEn = true,
  onClose,
  onScheduleCall,
  onEdit,
  onOpenComments,
  onAdvanceStage,
}: {
  prospect: ProspectItem;
  isEn?: boolean;
  onClose: () => void;
  onScheduleCall: () => void;
  onEdit: () => void;
  onOpenComments: () => void;
  onAdvanceStage?: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-100 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-[#f1f6fb] to-white">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-[#092342] text-white font-extrabold text-base flex items-center justify-center shadow-md">
              {prospect.full_name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold text-[#092342]">{prospect.full_name}</h3>
                <span className="text-base">{prospect.flag}</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {prospect.country_city} • {prospect.program_tag}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {/* Key Metric Badges */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">
                {isEn ? 'Pipeline Stage' : 'Étape Pipeline'}
              </span>
              <span className="text-xs font-extrabold text-[#092342] mt-1 block capitalize">
                {prospect.stage.replace('_', ' ')}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">
                {isEn ? 'Assigned Advisor' : 'Conseiller'}
              </span>
              <span className="text-xs font-extrabold text-[#092342] mt-1 block truncate">
                {prospect.adviser_name}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">
                {isEn ? 'Potential Value' : 'Valeur Estimée'}
              </span>
              <span className="text-xs font-extrabold text-[#0c685a] mt-1 block">
                €{(prospect.estimated_value || 1800).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Details Card */}
          <div className="p-4 rounded-xl border border-slate-200/80 bg-white space-y-2 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-slate-500">{isEn ? 'Current Action' : 'Action en cours'}</span>
              <span className="font-bold text-[#0c685a]">{prospect.meta_right}</span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-slate-500">{isEn ? 'Channel / Ingestion' : 'Canal d’acquisition'}</span>
              <span className="font-bold text-slate-800">{prospect.meta_left}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">{isEn ? 'Priority Flag' : 'Niveau d’urgence'}</span>
              <span
                className={`font-bold ${
                  prospect.is_urgent ? 'text-red-600' : 'text-slate-600'
                }`}
              >
                {prospect.is_urgent ? '● Urgent (< 24h)' : 'Normal'}
              </span>
            </div>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onScheduleCall();
              }}
              className="px-3.5 py-2 rounded-xl bg-[#0c685a] hover:bg-[#094f46] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>{isEn ? 'Schedule Call' : 'Planifier un appel'}</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onOpenComments();
              }}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
              <span>{isEn ? 'Notes' : 'Notes'}</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onEdit();
              }}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-slate-500" />
              <span>{isEn ? 'Edit' : 'Modifier'}</span>
            </button>
          </div>

          {onAdvanceStage && (
            <button
              onClick={() => {
                onClose();
                onAdvanceStage();
              }}
              className="px-4 py-2 rounded-xl bg-[#092342] hover:bg-[#153a70] text-white text-xs font-extrabold transition cursor-pointer"
            >
              {isEn ? 'Advance Stage →' : 'Avancer d’étape →'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
