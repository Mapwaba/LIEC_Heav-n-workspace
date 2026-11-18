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
  UserX,
  UserCheck,
  RotateCcw,
  AlertCircle,
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
  lifecycle_status?: 'ACTIVE' | 'INACTIVE';
  deactivation_reason?: string;
  deactivation_comment?: string;
  deactivated_by?: string;
  deactivated_at?: string;
  reactivated_by?: string;
  reactivated_at?: string;
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
  actor = 'Barthelemy MAPWABA NTORO',
  onClose,
  onSaved,
}: {
  prospect: ProspectItem;
  staffList: { name: string; email?: string; title?: string }[];
  isEn?: boolean;
  actor?: string;
  onClose: () => void;
  onSaved: (msg?: string) => void;
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
      const selectedAdvisor = staffList.find((s) => s.name === adviserName);
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
          adviser_email: selectedAdvisor?.email,
          estimated_value: Number(estimatedValue),
          is_urgent: isUrgent,
          actor,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update prospect');
      }

      let outcomeMsg = isEn ? `Prospect ${fullName.trim()} updated.` : `Prospect ${fullName.trim()} mis à jour.`;
      if (data.emailSent) {
        outcomeMsg += isEn
          ? ` Notification email sent via ${data.emailProvider || 'Resend'}.`
          : ` Notification email envoyée via ${data.emailProvider || 'Resend'}.`;
      } else if (data.emailError) {
        outcomeMsg += isEn
          ? ` Warning: email delivery failed (${data.emailError}).`
          : ` Attention : échec de transmission email (${data.emailError}).`;
      }

      onSaved(outcomeMsg);
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
  onDeactivate,
  onReactivate,
}: {
  prospect: ProspectItem;
  isEn?: boolean;
  onClose: () => void;
  onScheduleCall: () => void;
  onEdit: () => void;
  onOpenComments: () => void;
  onAdvanceStage?: () => void;
  onDeactivate?: () => void;
  onReactivate?: () => void;
}) {
  const isInactive = prospect.lifecycle_status === 'INACTIVE';
  const canDeactivate = !isInactive && ['nouveau', 'premier_contact', 'diagnostic'].includes(prospect.stage);

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
                {isInactive ? (
                  <span className="rounded-md bg-slate-200 text-slate-700 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide border border-slate-300">
                    {isEn ? 'INACTIVE' : 'INACTIF'}
                  </span>
                ) : (
                  <span className="rounded-md bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide border border-emerald-200">
                    {isEn ? 'ACTIVE' : 'ACTIF'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {(prospect.country_city || '').replace(/\bRDC\b/g, 'DRC')} • {prospect.program_tag}
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
          {/* Inactive Banner */}
          {isInactive && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1.5">
              <div className="flex items-center justify-between font-bold text-amber-800">
                <span className="flex items-center gap-1.5">
                  <UserX className="w-4 h-4 text-amber-600" />
                  <span>{isEn ? 'Prospect Marked Inactive' : 'Prospect Noté Inactif'}</span>
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-200/80 text-amber-900 font-extrabold text-[10.5px]">
                  {prospect.deactivation_reason || 'Dropped Programme'}
                </span>
              </div>
              {prospect.deactivated_by && (
                <p className="text-[11px] text-amber-800">
                  {isEn ? 'By:' : 'Par :'} {prospect.deactivated_by}{' '}
                  {prospect.deactivated_at && `• ${new Date(prospect.deactivated_at).toLocaleDateString()}`}
                </p>
              )}
              {prospect.deactivation_comment && (
                <p className="text-[11px] italic text-slate-600 bg-white/70 p-2 rounded-lg border border-amber-100">
                  &ldquo;{prospect.deactivation_comment}&rdquo;
                </p>
              )}
            </div>
          )}

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
              <span className="text-slate-500">{isEn ? 'Lifecycle Status' : 'Statut de cycle de vie'}</span>
              <span className={`font-bold ${isInactive ? 'text-slate-600' : 'text-emerald-700'}`}>
                {isInactive ? (isEn ? 'INACTIVE' : 'INACTIF') : (isEn ? 'ACTIVE' : 'ACTIF')}
              </span>
            </div>
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

          <div className="flex items-center gap-2">
            {isInactive ? (
              onReactivate && (
                <button
                  onClick={() => {
                    onClose();
                    onReactivate();
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Reactivate Prospect' : 'Réactiver'}</span>
                </button>
              )
            ) : (
              <>
                {canDeactivate && onDeactivate && (
                  <button
                    onClick={() => {
                      onClose();
                      onDeactivate();
                    }}
                    className="px-3 py-2 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-red-600 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    title={isEn ? 'Deactivate prospect' : 'Désactiver le prospect'}
                  >
                    <UserX className="w-3.5 h-3.5" />
                    <span>{isEn ? 'Deactivate' : 'Désactiver'}</span>
                  </button>
                )}

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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 5. RECORD FIRST CONTACT MODAL (STAGE 2)
// ============================================================================
export function RecordFirstContactModal({
  prospect,
  currentUser = 'Barthelemy MAPWABA NTORO',
  isEn = true,
  onClose,
  onSaved,
}: {
  prospect: any;
  currentUser?: string;
  isEn?: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [method, setMethod] = useState('Telephone');
  const [outcome, setOutcome] = useState('Connected — Highly Interested');
  const [contactDate, setContactDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/prospects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: prospect.id,
          action: 'record_first_contact',
          contact_method: method,
          contact_outcome: outcome,
          contact_date: contactDate,
          notes,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to record first contact');
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error recording contact event');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-100 flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-[#f1f6fb] to-white">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#0c685a] text-white flex items-center justify-center shadow-sm">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#092342]">
                {isEn ? 'Record First Contact Event' : 'Enregistrer le Premier Contact'}
              </h3>
              <p className="text-xs text-slate-500">{prospect.full_name} ({prospect.country_city})</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isEn ? 'Contact Method' : 'Canal de contact'}
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#092342]/20"
              >
                <option value="Telephone">Telephone / Phone Call</option>
                <option value="WhatsApp">WhatsApp Message / Call</option>
                <option value="Email">Email Outreach</option>
                <option value="In-Person Meeting">In-Person Meeting (Kinshasa Office)</option>
                <option value="Video Conference">Google Meet / Video</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isEn ? 'Contact Date' : 'Date du contact'}
              </label>
              <input
                type="date"
                value={contactDate}
                onChange={(e) => setContactDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#092342]/20"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isEn ? 'Contact Outcome' : 'Résultat du contact'}
            </label>
            <select
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#092342]/20"
            >
              <option value="Connected — Highly Interested">Connected — Highly Interested in Lyon Programmes</option>
              <option value="Connected — Follow-up Needed">Connected — Follow-up Diagnostic Call Needed</option>
              <option value="No Answer / Voicemail Left">No Answer / Left Voicemail & WhatsApp Note</option>
              <option value="Awaiting Documents">Contacted — Awaiting Transcripts / BAC Certificate</option>
              <option value="Unreachable / Invalid Details">Unreachable / Invalid Contact Details</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isEn ? 'Conversation Notes & Summary' : 'Notes et synthèse de l’échange'}
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isEn ? 'Discussed academic aspirations, proposed schools, requested BAC records...' : 'Projet d’études abordé, orientation vers nos écoles partenaires...'}
              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#092342]/20"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              {isEn ? 'Cancel' : 'Annuler'}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-bold text-white bg-[#0c685a] hover:bg-[#094f46] rounded-xl shadow-sm transition cursor-pointer disabled:opacity-50"
            >
              {submitting ? (isEn ? 'Saving...' : 'Enregistrement...') : (isEn ? 'Save & Advance to First Contact' : 'Enregistrer le contact')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// 6. RECORD ELIGIBILITY DIAGNOSTIC MODAL (STAGE 3)
// ============================================================================
export function RecordEligibilityModal({
  prospect,
  currentUser = 'Barthelemy MAPWABA NTORO',
  isEn = true,
  onClose,
  onSaved,
}: {
  prospect: any;
  currentUser?: string;
  isEn?: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [eligibilityStatus, setEligibilityStatus] = useState('Eligible');
  const [assessedBy, setAssessedBy] = useState(currentUser);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/prospects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: prospect.id,
          action: 'record_eligibility',
          eligibility_status: eligibilityStatus,
          assessed_by: assessedBy,
          notes,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to record eligibility assessment');
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error recording eligibility');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-100 flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-[#f1f6fb] to-white">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#f59e0b] text-white flex items-center justify-center shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#092342]">
                {isEn ? 'Eligibility Diagnostic Assessment' : 'Diagnostic d’Éligibilité Académique'}
              </h3>
              <p className="text-xs text-slate-500">{prospect.full_name} • {prospect.program_tag}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isEn ? 'Admission & Programme Eligibility Outcome' : 'Décision d’éligibilité'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <label
                className={`p-3 rounded-xl border text-center cursor-pointer transition ${
                  eligibilityStatus === 'Eligible'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <input
                  type="radio"
                  name="eligibility"
                  value="Eligible"
                  checked={eligibilityStatus === 'Eligible'}
                  onChange={() => setEligibilityStatus('Eligible')}
                  className="sr-only"
                />
                <span className="text-xs block">✓ {isEn ? 'Eligible' : 'Éligible'}</span>
              </label>

              <label
                className={`p-3 rounded-xl border text-center cursor-pointer transition ${
                  eligibilityStatus === 'Pending Review'
                    ? 'border-amber-500 bg-amber-50 text-amber-800 font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <input
                  type="radio"
                  name="eligibility"
                  value="Pending Review"
                  checked={eligibilityStatus === 'Pending Review'}
                  onChange={() => setEligibilityStatus('Pending Review')}
                  className="sr-only"
                />
                <span className="text-xs block">⚠ {isEn ? 'Pending Review' : 'En examen'}</span>
              </label>

              <label
                className={`p-3 rounded-xl border text-center cursor-pointer transition ${
                  eligibilityStatus === 'Not Eligible'
                    ? 'border-red-500 bg-red-50 text-red-800 font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <input
                  type="radio"
                  name="eligibility"
                  value="Not Eligible"
                  checked={eligibilityStatus === 'Not Eligible'}
                  onChange={() => setEligibilityStatus('Not Eligible')}
                  className="sr-only"
                />
                <span className="text-xs block">✗ {isEn ? 'Ineligible' : 'Inéligible'}</span>
              </label>
            </div>
            {eligibilityStatus === 'Not Eligible' && (
              <p className="mt-1 text-[11px] text-red-600 font-semibold">
                {isEn
                  ? 'Note: Marking prospect as Ineligible will prevent progression to Qualification.'
                  : 'Attention : Un prospect inéligible ne peut pas progresser vers l’étape Qualifié.'}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isEn ? 'Assessed By (Admissions Officer)' : 'Évaluateur'}
            </label>
            <input
              type="text"
              value={assessedBy}
              onChange={(e) => setAssessedBy(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#092342]/20"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isEn ? 'Evaluation Notes & Admission Rationale' : 'Observations & Motivation de la décision'}
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isEn ? 'Candidate holds UNIKIN Licence Mention TB, TCF score B2 certified, aligns with Bachelor/Master entry criteria...' : 'Relevés académiques conformes, profil linguistique B2 validé...'}
              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#092342]/20"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              {isEn ? 'Cancel' : 'Annuler'}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-bold text-white bg-[#092342] hover:bg-[#12365a] rounded-xl shadow-sm transition cursor-pointer disabled:opacity-50"
            >
              {submitting ? (isEn ? 'Saving...' : 'Enregistrement...') : (isEn ? 'Confirm Diagnostic Evaluation' : 'Valider le diagnostic')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// 7. QUALIFY PROSPECT MODAL (STAGE 4: 3-CONDITION CHECKLIST)
// ============================================================================
export function QualifyProspectModal({
  prospect,
  currentUser = 'Barthelemy MAPWABA NTORO',
  isEn = true,
  onClose,
  onSaved,
  onNotify,
}: {
  prospect: any;
  currentUser?: string;
  isEn?: boolean;
  onClose: () => void;
  onSaved: () => void;
  onNotify: (msg: string) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [completingReg, setCompletingReg] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [rawbankSlipNumber, setRawbankSlipNumber] = useState(prospect.rawbank_slip_number || '');
  const [rawbankOperationCode, setRawbankOperationCode] = useState(prospect.rawbank_operation_code || '');
  const [paymentAmount, setPaymentAmount] = useState<number>(prospect.first_instalment_amount || 1800);

  const isEligible = prospect.eligibility_status === 'Eligible';
  const isRegistered = Boolean(prospect.registration_completed);
  const isFirstInstalmentPaid = Boolean(prospect.first_instalment_paid);
  const isReady = isEligible && isRegistered && isFirstInstalmentPaid;

  const handleCompleteRegistration = async () => {
    setCompletingReg(true);
    try {
      const res = await fetch('/api/prospects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: prospect.id, action: 'complete_registration' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to complete registration');
      onNotify(isEn ? 'Registration marked as completed.' : 'Inscription marquée comme complétée.');
      onSaved();
    } catch (err: any) {
      setError(err?.message);
    } finally {
      setCompletingReg(false);
    }
  };

  const handleVerifyPayment = async () => {
    setError(null);
    const slip = rawbankSlipNumber.trim();
    if (!/^\d{6}$/.test(slip)) {
      setError(isEn ? 'Rawbank slip number must be exactly 6 numerical digits.' : 'Le bordereau Rawbank doit comporter exactement 6 chiffres numériques.');
      return;
    }
    const opCode = rawbankOperationCode.trim();
    if (!/^\d{3}$/.test(opCode)) {
      setError(isEn ? 'Rawbank operation code must be exactly 3 numerical digits.' : 'Le code opération Rawbank doit comporter exactement 3 chiffres numériques.');
      return;
    }

    setVerifyingPayment(true);
    try {
      const res = await fetch('/api/prospects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: prospect.id,
          action: 'verify_first_instalment',
          rawbank_slip_number: slip,
          rawbank_operation_code: opCode,
          amount: paymentAmount,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to verify payment');
      onNotify(data.message || (isEn ? 'First instalment verified with Rawbank slip.' : 'Premier versement vérifié avec bordereau Rawbank.'));
      setShowPaymentForm(false);
      onSaved();
    } catch (err: any) {
      setError(err?.message);
    } finally {
      setVerifyingPayment(false);
    }
  };

  const handleConfirmQualify = async () => {
    if (!isReady) {
      setError(isEn ? 'All 3 conditions must be satisfied before qualification.' : 'Les 3 conditions doivent être remplies.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/prospects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: prospect.id, stage: 'qualifie' }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to advance prospect to Qualified');
      }

      onNotify(
        isEn
          ? `Prospect ${prospect.full_name} officially qualified and candidate record linked!`
          : `Prospect ${prospect.full_name} qualifié avec succès et lié au dossier étudiant !`
      );
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-100 flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-[#f1f6fb] to-white">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#092342] text-white flex items-center justify-center shadow-sm">
              <ShieldCheck className="w-5 h-5 text-[#f4be37]" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#092342]">
                {isEn ? 'Prospect Qualification Milestone' : 'Jalon de Qualification Prospect'}
              </h3>
              <p className="text-xs text-slate-500">{prospect.full_name} • {prospect.country_city}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <p className="text-slate-600">
            {isEn
              ? 'Qualification is a formal milestone that starts the 11-month sensitive document retention timeline. All 3 conditions must be verified before proceeding:'
              : 'La qualification est un jalon officiel déclenchant la période de conformité de rétention de 11 mois. Les 3 conditions doivent être validées :'}
          </p>

          <div className="space-y-2.5">
            {/* Condition 1 */}
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {isEligible ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                )}
                <div>
                  <span className="font-bold text-slate-800 block">
                    {isEn ? '1. Admission & Programme Eligibility' : '1. Éligibilité Admission'}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {isEn ? 'Status:' : 'Statut :'} <strong>{prospect.eligibility_status || 'Pending Review'}</strong>
                  </span>
                </div>
              </div>
              {isEligible ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  {isEn ? 'Eligible' : 'Éligible'}
                </span>
              ) : (
                <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                  {isEn ? 'Pending Review' : 'En examen'}
                </span>
              )}
            </div>

            {/* Condition 2 */}
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {isRegistered ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                )}
                <div>
                  <span className="font-bold text-slate-800 block">
                    {isEn ? '2. Administrative Registration File' : '2. Inscription Administrative'}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {isRegistered ? (isEn ? 'Registration file completed' : 'Dossier d’inscription complété') : (isEn ? 'Not completed' : 'Non complété')}
                  </span>
                </div>
              </div>
              {isRegistered ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  {isEn ? 'Completed' : 'Complétée'}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleCompleteRegistration}
                  disabled={completingReg}
                  className="px-2.5 py-1 text-[11px] font-bold text-white bg-[#092342] hover:bg-[#12365a] rounded-lg cursor-pointer disabled:opacity-50"
                >
                  {completingReg ? '...' : (isEn ? 'Mark Completed' : 'Valider')}
                </button>
              )}
            </div>

            {/* Condition 3 */}
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {isFirstInstalmentPaid ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  )}
                  <div>
                    <span className="font-bold text-slate-800 block">
                      {isEn ? '3. First Instalment Payment (Rawbank)' : '3. Premier Versement Encaissé (Rawbank)'}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {isFirstInstalmentPaid
                        ? `${isEn ? 'Verified' : 'Vérifié'}${prospect.rawbank_slip_number ? ` (Slip #${prospect.rawbank_slip_number})` : ''}`
                        : (isEn ? 'Requires 6-digit slip & 3-digit op code' : 'Bordereau 6 chiffres & Code op 3 chiffres')}
                    </span>
                  </div>
                </div>
                {isFirstInstalmentPaid ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    {isEn ? 'Verified' : 'Vérifié'}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowPaymentForm(!showPaymentForm)}
                    className="px-2.5 py-1 text-[11px] font-bold text-white bg-[#0c685a] hover:bg-[#094f46] rounded-lg cursor-pointer"
                  >
                    {showPaymentForm ? (isEn ? 'Hide' : 'Fermer') : (isEn ? 'Enter Slip' : 'Saisir Bordereau')}
                  </button>
                )}
              </div>

              {showPaymentForm && !isFirstInstalmentPaid && (
                <div className="pt-2 border-t border-slate-200/80 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-700 block mb-0.5">
                        {isEn ? 'Slip Number (6 digits) *' : 'N° Bordereau (6 chiffres) *'}
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        value={rawbankSlipNumber}
                        onChange={(e) => setRawbankSlipNumber(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="052658"
                        className="w-full p-1.5 text-xs font-mono rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-700 block mb-0.5">
                        {isEn ? 'Op Code (3 digits) *' : 'Code Op (3 chiffres) *'}
                      </label>
                      <input
                        type="text"
                        maxLength={3}
                        value={rawbankOperationCode}
                        onChange={(e) => setRawbankOperationCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
                        placeholder="012"
                        className="w-full p-1.5 text-xs font-mono rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-500">
                      {isEn ? 'Applicable obligation:' : 'Montant dû :'} <strong>{paymentAmount} EUR</strong>
                    </span>
                    <button
                      type="button"
                      onClick={handleVerifyPayment}
                      disabled={verifyingPayment || rawbankSlipNumber.length !== 6 || rawbankOperationCode.length !== 3}
                      className="px-3 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer disabled:opacity-50"
                    >
                      {verifyingPayment ? '...' : (isEn ? 'Verify in Ledger' : 'Vérifier & Valider')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              {isEn ? 'Cancel' : 'Annuler'}
            </button>
            <button
              type="button"
              onClick={handleConfirmQualify}
              disabled={!isReady || submitting}
              className={`px-4 py-2 text-xs font-bold rounded-xl shadow-sm transition cursor-pointer ${
                isReady
                  ? 'bg-[#f4be37] hover:bg-[#e5ae28] text-[#092342]'
                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
              }`}
            >
              {submitting
                ? (isEn ? 'Qualifying...' : 'Qualification...')
                : isReady
                ? (isEn ? 'Confirm Qualification & Convert' : 'Confirmer la Qualification')
                : (isEn ? 'Complete 3 Requirements to Qualify' : '3 Conditions Requises')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 8. DEACTIVATE PROSPECT MODAL
// ============================================================================
export function DeactivateProspectModal({
  prospect,
  currentUser = 'Barthelemy MAPWABA NTORO',
  isEn = true,
  onClose,
  onSaved,
  onNotify,
}: {
  prospect: ProspectItem;
  currentUser?: string;
  isEn?: boolean;
  onClose: () => void;
  onSaved: () => void;
  onNotify?: (msg: string) => void;
}) {
  const [reason, setReason] = useState<'Dropped Programme' | 'Not Pursuing'>('Dropped Programme');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isQualified = prospect.stage === 'qualifie';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isQualified) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/prospects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: prospect.id,
          action: 'deactivate_prospect',
          reason,
          comment: comment.trim() || undefined,
          actor: currentUser,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to deactivate prospect');
      }

      if (onNotify) {
        onNotify(
          isEn
            ? `Prospect ${prospect.full_name} marked as Inactive (${reason}).`
            : `Prospect ${prospect.full_name} marqué comme Inactif (${reason}).`
        );
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error deactivating prospect');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-100 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-red-50/50 to-white">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
              <UserX className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-[#092342]">
                {isEn ? 'Deactivate Prospect' : 'Désactiver le Prospect'}
              </h3>
              <p className="text-xs text-slate-500">
                {isEn ? 'Prospect:' : 'Candidat :'} <strong>{prospect.full_name}</strong> • Stage:{' '}
                <span className="font-semibold">{prospect.stage.replace('_', ' ')}</span>
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

        {isQualified ? (
          <div className="p-6 space-y-4">
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-red-900">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span>{isEn ? 'Action Blocked' : 'Action Bloquée'}</span>
              </div>
              <p>
                {isEn
                  ? 'Qualified prospects cannot be deactivated via this workflow. Qualified candidates have passed formal admission checks and must be managed via candidate workflows or administrative override.'
                  : 'Les prospects qualifiés ne peuvent pas être désactivés. Ils doivent être gérés via les flux de candidats ou une dérogation administrative.'}
              </p>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition"
              >
                {isEn ? 'Close' : 'Fermer'}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Warning confirmation notice */}
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">
                  {isEn ? 'Pipeline Exclusion Confirmation' : 'Confirmation de retrait du pipeline actif'}
                </p>
                <p className="text-[11px] leading-relaxed text-amber-800">
                  {isEn
                    ? 'Marking this prospect as inactive will exclude them from the active CRM pipeline and live metrics, while strictly preserving their records, notes, and activity history for future reference or reactivation.'
                    : 'Le passage en inactif retirera ce prospect du pipeline CRM actif et des KPI temps réel, tout en conservant son historique complet pour consultation ou réactivation ultérieure.'}
                </p>
              </div>
            </div>

            {/* Reason selection (Mandatory, 2 choices) */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                {isEn ? 'Deactivation Reason *' : 'Motif de désactivation *'}
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as 'Dropped Programme' | 'Not Pursuing')}
                className="w-full rounded-xl border border-slate-200 bg-[#fbfcfd] px-3.5 py-2.5 text-xs font-bold text-[#092342] focus:outline-none focus:ring-2 focus:ring-red-500/20"
                required
              >
                <option value="Dropped Programme">
                  {isEn ? 'Dropped Programme' : 'Abandon du Programme (Dropped Programme)'}
                </option>
                <option value="Not Pursuing">
                  {isEn ? 'Not Pursuing' : 'Ne poursuit pas les démarches (Not Pursuing)'}
                </option>
              </select>
            </div>

            {/* Optional Comment */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                {isEn ? 'Additional Comments (Optional)' : 'Commentaires additionnels (Optionnel)'}
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder={
                  isEn
                    ? 'Enter any relevant context, family feedback, or reason details...'
                    : 'Précisez le contexte, retour de la famille ou détails...'
                }
                className="w-full rounded-xl border border-slate-200 bg-[#fbfcfd] px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20"
              />
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                {isEn ? 'Cancel' : 'Annuler'}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold shadow-sm transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                <UserX className="w-3.5 h-3.5" />
                <span>
                  {submitting
                    ? isEn ? 'Deactivating...' : 'Désactivation...'
                    : isEn ? 'Confirm Deactivation' : 'Confirmer la désactivation'}
                </span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// 9. REACTIVATE PROSPECT MODAL
// ============================================================================
export function ReactivateProspectModal({
  prospect,
  currentUser = 'Barthelemy MAPWABA NTORO',
  isEn = true,
  onClose,
  onSaved,
  onNotify,
}: {
  prospect: ProspectItem;
  currentUser?: string;
  isEn?: boolean;
  onClose: () => void;
  onSaved: () => void;
  onNotify?: (msg: string) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReactivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/prospects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: prospect.id,
          action: 'reactivate_prospect',
          actor: currentUser,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to reactivate prospect');
      }

      if (onNotify) {
        onNotify(
          isEn
            ? `Prospect ${prospect.full_name} has been reactivated in stage '${prospect.stage.replace('_', ' ')}'.`
            : `Prospect ${prospect.full_name} réactivé dans l'étape '${prospect.stage.replace('_', ' ')}'.`
        );
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error reactivating prospect');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-100 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-emerald-50/50 to-white">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-[#092342]">
                {isEn ? 'Reactivate Prospect' : 'Réactiver le Prospect'}
              </h3>
              <p className="text-xs text-slate-500">
                {isEn ? 'Candidate:' : 'Candidat :'} <strong>{prospect.full_name}</strong>
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

        <form onSubmit={handleReactivate} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
              <span className="text-slate-500">{isEn ? 'Restored Workflow Stage:' : 'Étape restaurée :'}</span>
              <span className="font-extrabold text-[#092342] capitalize">
                {prospect.stage.replace('_', ' ')}
              </span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
              <span className="text-slate-500">{isEn ? 'Previous Deactivation Reason:' : 'Motif précédent :'}</span>
              <span className="font-bold text-amber-700">
                {prospect.deactivation_reason || 'N/A'}
              </span>
            </div>
            {prospect.deactivation_comment && (
              <div className="pt-1 text-[11px] text-slate-600 italic">
                &ldquo;{prospect.deactivation_comment}&rdquo;
              </div>
            )}
          </div>

          <p className="text-slate-600 text-xs">
            {isEn
              ? `This will restore ${prospect.full_name} as an ACTIVE lead in the CRM pipeline and re-include them in active metrics and reports.`
              : `Cette action réactivera ${prospect.full_name} dans le pipeline CRM actif et le réinclura dans les KPI et rapports.`}
          </p>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              {isEn ? 'Cancel' : 'Annuler'}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-sm transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>
                {submitting
                  ? isEn ? 'Reactivating...' : 'Réactivation...'
                  : isEn ? 'Confirm Reactivation' : 'Confirmer la réactivation'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
