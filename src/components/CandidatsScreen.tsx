'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  GraduationCap,
  Briefcase,
  UserPlus,
  Search,
  Building2,
  Calendar,
  CheckCircle2,
  Edit3,
  FolderDown,
  RefreshCw,
  Send,
  Plane,
  FileText,
  Clock,
  PlusCircle,
  Plus,
  Euro,
  ShieldCheck,
  Wrench,
  Flag,
  ClipboardCheck,
  Smile,
  Save,
  Trash2,
  Home,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  X,
  Check,
  MessageSquare,
  History,
  Phone,
  Mail,
  User,
  MapPin,
  Shield,
  Layers,
} from 'lucide-react';

import { Lang } from './ServicesAndOtherScreens';

interface CandidatsScreenProps {
  candidats: any[];
  selectedRef: string;
  onSelectRef: (ref: string) => void;
  onCreateCandidat: (data: any) => Promise<void>;
  onAddNote: (ref: string, text: string) => Promise<void>;
  onAddVoeu: (ref: string, data: any) => Promise<void>;
  onAdvanceJalon: (ref: string, jalonNum: number) => Promise<void>;
  onTogglePiece: (ref: string, pieceIndex: number) => Promise<void>;
  onNotify: (msg: string) => void;
  lang?: Lang;
  aviRequests?: any[];
  accommodationRequests?: any[];
  currentRole?: 'admin' | 'secretary' | 'avi';
  currentUser?: any;
  onRefresh?: () => Promise<void>;
  onOpenAviCreation?: (studentRef: string) => void;
  onOpenAccommodationCreation?: (studentRef: string) => void;
}

export default function CandidatsScreen({
  candidats = [],
  selectedRef,
  onSelectRef,
  onCreateCandidat,
  onAddNote,
  onAddVoeu,
  onAdvanceJalon,
  onTogglePiece,
  onNotify,
  lang = 'en',
  aviRequests = [],
  accommodationRequests = [],
  currentRole = 'admin',
  currentUser,
  onRefresh,
  onOpenAviCreation,
  onOpenAccommodationCreation,
}: CandidatsScreenProps) {
  const isEn = lang === 'en';
  const isAdmin = currentRole === 'admin';
  const isAuthorizedToEdit = currentRole === 'admin' || currentRole === 'secretary';

  const [cohortFilter, setCohortFilter] = useState('');
  const [activeSubTab, setActiveSubTab] = useState(1); // 1 = ServiceNow Student Record Form
  const [relatedListTab, setRelatedListTab] = useState<'avi' | 'accommodation' | 'schools'>('accommodation');

  // Modals
  const [showNewCandidatModal, setShowNewCandidatModal] = useState(false);
  const [showNewVoeuModal, setShowNewVoeuModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [deleteSafeguardData, setDeleteSafeguardData] = useState<{
    hasLinkedRecords: boolean;
    linkedCount: number;
    linkedRecords: string[];
    message?: string;
  } | null>(null);

  // Form State for ServiceNow Student Record Form
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Candidate fields in form
  const [formFullName, setFormFullName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formCountry, setFormCountry] = useState('');
  const [formNationality, setFormNationality] = useState('');
  const [formAdmissionStatus, setFormAdmissionStatus] = useState('');
  const [formProcedureStatus, setFormProcedureStatus] = useState('');
  const [formParentFullName, setFormParentFullName] = useState('');
  const [formParentRelation, setFormParentRelation] = useState('Parent');
  const [formParentPhone, setFormParentPhone] = useState('');
  const [formParentEmail, setFormParentEmail] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formNewComment, setFormNewComment] = useState('');

  // New Candidat Form
  const [newCandName, setNewCandName] = useState('');
  const [newCandCountry, setNewCandCountry] = useState('RDC (Kinshasa)');
  const [newCandProgram, setNewCandProgram] = useState(
    'MyDigitalSchool Lyon — Web dev, digital creation, webmarketing & UX/UI design'
  );
  const [newCandParentName, setNewCandParentName] = useState('');
  const [newCandParentPhone, setNewCandParentPhone] = useState('');
  const [newCandGraduationYear, setNewCandGraduationYear] = useState('2024');
  const [newCandCurrentActivity, setNewCandCurrentActivity] = useState('');
  const [newCandFinalYearUni, setNewCandFinalYearUni] = useState('');

  // New Voeu Form
  const [voeuUniv, setVoeuUniv] = useState('ISCOM Lyon');
  const [voeuProg, setVoeuProg] = useState('Communication, advertising, marketing and events');
  const [voeuCode, setVoeuCode] = useState('ISCO');

  const safeCandidats = Array.isArray(candidats) ? candidats : [];

  const filteredCandidats = safeCandidats.filter((c) => {
    if (!c) return false;
    const q = cohortFilter.toLowerCase().trim();
    if (!q) return true;
    return (
      (c.ref || '').toLowerCase().includes(q) ||
      (c.full_name || '').toLowerCase().includes(q) ||
      (c.program || '').toLowerCase().includes(q) ||
      (c.country || '').toLowerCase().includes(q)
    );
  });

  const selectedCandidat =
    safeCandidats.find((c) => c.ref === selectedRef) || filteredCandidats[0] || safeCandidats[0];

  // Sync form state when selectedCandidat changes
  useEffect(() => {
    if (selectedCandidat) {
      setFormFullName(selectedCandidat.full_name || '');
      setFormEmail(selectedCandidat.email || '');
      setFormPhone(selectedCandidat.phone || '');
      setFormCountry(selectedCandidat.country || 'RDC (Kinshasa)');
      setFormNationality(selectedCandidat.nationality || 'Congolaise (RDC)');
      setFormAdmissionStatus(
        selectedCandidat.admission_status || 'Admitted — Partner School Lyon'
      );
      setFormProcedureStatus(
        selectedCandidat.procedure_status || selectedCandidat.stage_badge || 'Milestone 2'
      );
      setFormParentFullName(selectedCandidat.parent_full_name || '');
      setFormParentRelation(selectedCandidat.parent_relation || 'Parent');
      setFormParentPhone(selectedCandidat.parent_phone || '');
      setFormParentEmail(selectedCandidat.parent_email || '');
      setFormDescription(
        selectedCandidat.description ||
          `${selectedCandidat.full_name} is pursuing higher education admission at partner campuses in Lyon. Academic profile verified with verified diplomas.`
      );
      setFormNewComment('');
    }
  }, [selectedCandidat?.ref]);

  // Linked secondary requests for the current student
  const linkedAviRequests = aviRequests.filter((a) => {
    if (!selectedCandidat) return false;
    if (a.student_ref && a.student_ref === selectedCandidat.ref) return true;
    return (
      a.student_name &&
      selectedCandidat.full_name &&
      (a.student_name.toLowerCase().includes(selectedCandidat.full_name.toLowerCase()) ||
        selectedCandidat.full_name.toLowerCase().includes(a.student_name.toLowerCase()))
    );
  });

  const linkedAccommodationRequests = accommodationRequests.filter((acc) => {
    if (!selectedCandidat) return false;
    return (
      acc.student_ref === selectedCandidat.ref ||
      (acc.student_name &&
        selectedCandidat.full_name &&
        acc.student_name.toLowerCase() === selectedCandidat.full_name.toLowerCase())
    );
  });

  const linkedSchoolApplications = selectedCandidat?.voeux || [];

  // Handle Save / Update Student Record (ServiceNow Action)
  const handleSaveOrUpdateRecord = async () => {
    if (!selectedCandidat) return;

    // Validate phone number digits (max 14 digits)
    const phoneDigits = formPhone.replace(/\D/g, '');
    if (phoneDigits.length > 14) {
      onNotify(isEn ? 'Student Phone Number cannot exceed 14 digits.' : 'Le numéro de téléphone étudiant ne doit pas dépasser 14 chiffres.');
      return;
    }

    const parentPhoneDigits = formParentPhone.replace(/\D/g, '');
    if (parentPhoneDigits.length > 14) {
      onNotify(isEn ? 'Parent Phone Number cannot exceed 14 digits.' : 'Le numéro de téléphone du parent ne doit pas dépasser 14 chiffres.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/candidats', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': currentUser?.email || 'sarah.mwamba@liec-education.com',
        },
        body: JSON.stringify({
          ref: selectedCandidat.ref,
          full_name: formFullName.trim(),
          email: formEmail.trim(),
          phone: formPhone.trim(),
          country: formCountry.trim(),
          nationality: formNationality.trim(),
          admission_status: formAdmissionStatus.trim(),
          procedure_status: formProcedureStatus.trim(),
          parent_full_name: formParentFullName.trim(),
          parent_relation: formParentRelation.trim(),
          parent_phone: formParentPhone.trim(),
          parent_email: formParentEmail.trim(),
          description: formDescription.trim(),
          new_comment: formNewComment.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to persist Student Record updates');
      }

      onNotify(
        isEn
          ? `Student Record ${selectedCandidat.ref} updated successfully.`
          : `Dossier étudiant ${selectedCandidat.ref} mis à jour avec succès.`
      );
      setFormNewComment('');
      if (onRefresh) await onRefresh();
    } catch (err: any) {
      onNotify(`Error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Delete Record with Safeguards
  const handleDeleteCheck = async () => {
    if (!selectedCandidat || !isAdmin) return;

    const totalLinked = linkedAviRequests.length + linkedAccommodationRequests.length;
    if (totalLinked > 0) {
      setDeleteSafeguardData({
        hasLinkedRecords: true,
        linkedCount: totalLinked,
        linkedRecords: [
          ...linkedAviRequests.map((a) => `AVI Request: ${a.ref} (${a.status})`),
          ...linkedAccommodationRequests.map((acc) => `Accommodation: ${acc.ref} (${acc.status})`),
        ],
        message: isEn
          ? `This Student Record has ${linkedAviRequests.length} linked AVI request(s) and ${linkedAccommodationRequests.length} accommodation reservation(s).`
          : `Ce dossier étudiant est associé à ${linkedAviRequests.length} demande(s) AVI et ${linkedAccommodationRequests.length} réservation(s) de logement.`,
      });
    } else {
      setDeleteSafeguardData(null);
    }
    setShowDeleteConfirmModal(true);
  };

  const handleConfirmDelete = async (force: boolean = false) => {
    if (!selectedCandidat) return;
    setIsDeleting(true);

    try {
      const url = `/api/candidats?ref=${encodeURIComponent(selectedCandidat.ref)}${
        force ? '&force=true' : ''
      }`;
      const res = await fetch(url, {
        method: 'DELETE',
        headers: {
          'x-user-email': currentUser?.email || 'sarah.mwamba@liec-education.com',
        },
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409 && data.hasLinkedRecords) {
          setDeleteSafeguardData(data);
          setIsDeleting(false);
          return;
        }
        throw new Error(data.error || 'Could not delete Student Record');
      }

      onNotify(
        isEn
          ? `Student Record ${selectedCandidat.ref} successfully deleted.`
          : `Dossier étudiant ${selectedCandidat.ref} supprimé.`
      );
      setShowDeleteConfirmModal(false);
      if (onRefresh) await onRefresh();
    } catch (err: any) {
      onNotify(`Error deleting record: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Add Target Submit
  const handleAddVoeuSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidat || !voeuUniv.trim()) return;
    await onAddVoeu(selectedCandidat.ref, {
      code: voeuCode,
      codeBg: voeuUniv.includes('ISCOM') ? 'navy' : 'teal',
      university: voeuUniv,
      rankBadge: `Choice #${selectedCandidat.voeux.length + 1}`,
      rankTone: 'neutral',
      program: voeuProg,
      location: 'Lyon Campus',
      meta: 'LIEC Lyon Partner School',
      statusBadge: 'Ready File',
      statusTone: 'green',
      statusSub: 'Added by Advisor',
    });
    setShowNewVoeuModal(false);
  };

  const handleCreateCandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCandName.trim()) return;

    const phoneDigits = newCandParentPhone.replace(/\D/g, '');
    if (phoneDigits.length > 14) {
      onNotify(
        isEn
          ? 'Parent Phone Number must be limited to a maximum of 14 digits.'
          : 'Le numéro de téléphone du parent ne peut pas dépasser 14 chiffres.'
      );
      return;
    }

    await onCreateCandidat({
      full_name: newCandName.trim(),
      program: newCandProgram,
      country: newCandCountry,
      cities: 'Lyon (Exclusive)',
      adviser: currentUser?.name || 'Sarah Mwamba',
      parent_full_name: newCandParentName.trim(),
      parent_phone: newCandParentPhone.trim(),
      graduation_year: newCandGraduationYear,
      current_activity: newCandCurrentActivity.trim(),
      final_year_university: newCandFinalYearUni.trim(),
    });

    setNewCandName('');
    setNewCandParentName('');
    setNewCandParentPhone('');
    setNewCandGraduationYear('2024');
    setNewCandCurrentActivity('');
    setNewCandFinalYearUni('');
    setShowNewCandidatModal(false);
  };

  if (!selectedCandidat) {
    return (
      <div className="space-y-5">
        <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-[10.5px] font-extrabold uppercase tracking-wider text-[#0c685a] mb-1">
              <span className="h-2 w-2 rounded-full bg-[#0c685a]" />
              <span>LIEC HEAV’N • STUDENT RECORD MANAGEMENT</span>
            </div>
            <h1 className="text-[26px] sm:text-[30px] font-extrabold tracking-tight text-[#092342] leading-[1.15]">
              Centralised Student Record
            </h1>
            <p className="mt-1 text-xs text-slate-500 max-w-lg">
              ServiceNow Incident-inspired unified record, tracking personal data, activity stream, and linked secondary requests.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setShowNewCandidatModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#092342] hover:bg-[#12365a] px-4 py-2 text-xs font-extrabold text-white shadow-sm transition"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ New Student Record</span>
            </button>
          </div>
        </div>

        <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 space-y-3">
          <Users className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">
            {isEn ? 'No Student Records Available' : 'Aucun dossier étudiant disponible'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {isEn
              ? 'No applicant or student records matched your search query or exist in the workspace database.'
              : 'Aucun dossier de candidat ne correspond à votre recherche ou n’existe dans la base de données.'}
          </p>
          <button
            onClick={() => setShowNewCandidatModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-xs font-bold text-white shadow-sm"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Create Student Record</span>
          </button>
        </div>

        {/* CREATE NEW CANDIDAT MODAL */}
        {showNewCandidatModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4 my-8 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    {isEn ? 'Record a New Student Record' : 'Créer un Nouveau Candidat'}
                  </h3>
                </div>
                <button
                  onClick={() => setShowNewCandidatModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleCreateCandSubmit} className="space-y-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isEn ? 'Student Full Name *' : 'Nom et Prénom *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={newCandName}
                    onChange={(e) => setNewCandName(e.target.value)}
                    placeholder="e.g. Dieudonné KABANGELE"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                  />
                </div>
                <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowNewCandidatModal(false)}
                    className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 font-bold shadow"
                  >
                    Create Student Record
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-[10.5px] font-extrabold uppercase tracking-wider text-[#0c685a] mb-1">
            <span className="h-2 w-2 rounded-full bg-[#0c685a]" />
            <span>LIEC HEAV’N • STUDENT RECORD MANAGEMENT</span>
          </div>
          <h1 className="text-[26px] sm:text-[30px] font-extrabold tracking-tight text-[#092342] leading-[1.15]">
            Centralised Student Record
          </h1>
          <p className="mt-1 text-xs text-slate-500 max-w-lg">
            ServiceNow Incident-inspired unified record, tracking personal data, activity stream, and linked secondary requests.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowNewCandidatModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#092342] hover:bg-[#12365a] px-4 py-2 text-xs font-extrabold text-white shadow-sm transition"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ New Student Record</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Assigned Student Records List (3 cols on LG) */}
        <div className="lg:col-span-3 rounded-2xl border border-[#e6eef6] bg-white p-3.5 shadow-card space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-extrabold text-[#092342] leading-tight">
              Assigned
              <br />
              Student Records
            </h2>
            <span className="rounded-xl bg-[#6ee7b7] px-2.5 py-1 text-[10.5px] font-extrabold text-[#064e3b] leading-tight text-center">
              {candidats.length}
              <br />
              records
            </span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={cohortFilter}
              onChange={(e) => setCohortFilter(e.target.value)}
              placeholder="Search ref or student..."
              className="w-full rounded-xl bg-[#f1f6fb] pl-8 pr-3 py-2 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0c685a]/20"
            />
          </div>

          <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1">
            {filteredCandidats.map((cand) => {
              const active = selectedCandidat.ref === cand.ref;
              return (
                <div
                  key={cand.ref}
                  onClick={() => onSelectRef(cand.ref)}
                  className={`rounded-xl p-3 border transition-all cursor-pointer ${
                    active
                      ? 'border-[#0c685a] bg-[#f0fdf9] shadow-sm'
                      : 'border-slate-100 hover:border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-[11px]">
                      {cand.ref}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">
                      {cand.country?.split('(')[0]?.trim() || 'DRC'}
                    </span>
                  </div>
                  <div className="font-bold text-slate-900 text-xs truncate">{cand.full_name}</div>
                  <div className="text-[11px] text-slate-500 truncate">{cand.program}</div>
                  <div className="mt-2 flex items-center justify-between text-[10.5px] text-slate-400 pt-1 border-t border-slate-100">
                    <span className="font-medium text-slate-600">{cand.stage_badge || 'Milestone 2'}</span>
                    <span>{cand.adviser}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Main Column: ServiceNow Incident-Style Student Record Form (9 cols on LG) */}
        <div className="lg:col-span-9 rounded-2xl border border-[#e6eef6] bg-white shadow-card overflow-hidden">
          {/* ServiceNow Header Bar with TOP-RIGHT FORM UI ACTIONS */}
          <div className="bg-[#092342] text-white p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#12365a]">
            <div className="flex items-center gap-3.5">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#0c685a] to-[#2dd4bf] text-white flex items-center justify-center text-lg font-extrabold ring-2 ring-white/20 shadow-md">
                {selectedCandidat.initials || selectedCandidat.full_name?.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs bg-white/10 px-2.5 py-0.5 rounded text-sky-300">
                    {selectedCandidat.ref}
                  </span>
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    {selectedCandidat.full_name}
                  </h2>
                </div>
                <div className="text-xs text-slate-300 flex items-center gap-2 mt-0.5">
                  <span>{selectedCandidat.program}</span>
                  <span>•</span>
                  <span>{selectedCandidat.country}</span>
                </div>
              </div>
            </div>

            {/* TOP-RIGHT FORM UI ACTIONS (ServiceNow Pattern) */}
            <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
              {/* Contextual: + New Accommodation Request */}
              {isAuthorizedToEdit && (
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenAccommodationCreation) {
                      onOpenAccommodationCreation(selectedCandidat.ref);
                    } else {
                      onNotify(`Opening Accommodation Request form for ${selectedCandidat.full_name}...`);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition"
                  title="Initiate Accommodation Reservation for this student"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>+ New Accommodation</span>
                </button>
              )}

              {/* Contextual: + New AVI Request */}
              {isAuthorizedToEdit && (
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenAviCreation) {
                      onOpenAviCreation(selectedCandidat.ref);
                    } else {
                      onNotify(`Opening AVI Desk for ${selectedCandidat.full_name}...`);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition"
                  title="Initiate AVI blocked-account request for this student"
                >
                  <Euro className="w-3.5 h-3.5" />
                  <span>+ New AVI</span>
                </button>
              )}

              {/* Save / Update Action */}
              {isAuthorizedToEdit && (
                <button
                  type="button"
                  onClick={handleSaveOrUpdateRecord}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition disabled:opacity-50"
                  title="Save modifications and refresh record"
                >
                  {isSaving ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>{isSaving ? 'Saving...' : 'Update / Save'}</span>
                </button>
              )}

              {/* Delete Action (Admin Only) */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={handleDeleteCheck}
                  disabled={isDeleting}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white shadow-sm transition disabled:opacity-50"
                  title="Delete record with safeguard check"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              )}
            </div>
          </div>

          {/* Sub-Tabs: ServiceNow Student Record vs Milestones & Documents */}
          <div className="border-b border-slate-200 px-6 bg-[#f9fbfd] flex items-center gap-6 overflow-x-auto text-xs font-bold">
            <button
              onClick={() => setActiveSubTab(1)}
              className={`py-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
                activeSubTab === 1
                  ? 'border-indigo-600 text-indigo-700 font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>ServiceNow Student Record Form</span>
            </button>

            <button
              onClick={() => setActiveSubTab(2)}
              className={`py-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
                activeSubTab === 2
                  ? 'border-indigo-600 text-indigo-700 font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Academic Milestones (Jalons)</span>
            </button>

            <button
              onClick={() => setActiveSubTab(3)}
              className={`py-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
                activeSubTab === 3
                  ? 'border-indigo-600 text-indigo-700 font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Partner School Targets ({linkedSchoolApplications.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab(4)}
              className={`py-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
                activeSubTab === 4
                  ? 'border-indigo-600 text-indigo-700 font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>Documents ({selectedCandidat.pieces?.length || 0})</span>
            </button>
          </div>

          {/* TAB 1: SERVICENOW INCIDENT-INSPIRED STUDENT RECORD FORM */}
          {activeSubTab === 1 && (
            <div className="p-6 space-y-8">
              {/* Form Grid: Sections A & B */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* SECTION A: STUDENT INFORMATION */}
                <div className="bg-slate-50/70 p-5 rounded-xl border border-slate-200/80 space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200 text-indigo-950 font-bold text-xs uppercase tracking-wider">
                    <User className="w-4 h-4 text-indigo-600" />
                    <span>A. Student Information</span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                        LIEC Reference (Unique Identifier)
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={selectedCandidat.ref}
                        className="w-full py-2 px-3 rounded-lg border border-slate-200 bg-slate-100 font-mono font-bold text-slate-700 cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Student Full Name *
                      </label>
                      <input
                        type="text"
                        value={formFullName}
                        onChange={(e) => setFormFullName(e.target.value)}
                        className="w-full py-2 px-3 rounded-lg border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          value={formEmail}
                          onChange={(e) => setFormEmail(e.target.value)}
                          className="w-full py-2 px-3 rounded-lg border border-slate-300 bg-white text-slate-900"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Phone / WhatsApp (max 14 digits) *
                        </label>
                        <input
                          type="text"
                          value={formPhone}
                          onChange={(e) => setFormPhone(e.target.value)}
                          className="w-full py-2 px-3 rounded-lg border border-slate-300 bg-white text-slate-900"
                          placeholder="+243 81 552 1904"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Nationality
                        </label>
                        <input
                          type="text"
                          value={formNationality}
                          onChange={(e) => setFormNationality(e.target.value)}
                          className="w-full py-2 px-3 rounded-lg border border-slate-300 bg-white text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Location / Residence
                        </label>
                        <input
                          type="text"
                          value={formCountry}
                          onChange={(e) => setFormCountry(e.target.value)}
                          className="w-full py-2 px-3 rounded-lg border border-slate-300 bg-white text-slate-900"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Admission Status
                        </label>
                        <input
                          type="text"
                          value={formAdmissionStatus}
                          onChange={(e) => setFormAdmissionStatus(e.target.value)}
                          className="w-full py-2 px-3 rounded-lg border border-slate-300 bg-white text-slate-900"
                          placeholder="Admitted — MyDigitalSchool Lyon"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Procedure Status
                        </label>
                        <input
                          type="text"
                          value={formProcedureStatus}
                          onChange={(e) => setFormProcedureStatus(e.target.value)}
                          className="w-full py-2 px-3 rounded-lg border border-slate-300 bg-white text-slate-900"
                          placeholder="Milestone 2 (Academic Records)"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION B: PARENT / TUTOR INFORMATION */}
                <div className="bg-slate-50/70 p-5 rounded-xl border border-slate-200/80 space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200 text-indigo-950 font-bold text-xs uppercase tracking-wider">
                    <Shield className="w-4 h-4 text-teal-600" />
                    <span>B. Parent / Tutor Information</span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Parent or Tutor Full Name
                      </label>
                      <input
                        type="text"
                        value={formParentFullName}
                        onChange={(e) => setFormParentFullName(e.target.value)}
                        placeholder="Jean-Pierre Kabangele"
                        className="w-full py-2 px-3 rounded-lg border border-slate-300 bg-white text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Relationship to Student
                      </label>
                      <select
                        value={formParentRelation}
                        onChange={(e) => setFormParentRelation(e.target.value)}
                        className="w-full py-2 px-3 rounded-lg border border-slate-300 bg-white text-slate-900"
                      >
                        <option value="Father">Father (Père)</option>
                        <option value="Mother">Mother (Mère)</option>
                        <option value="Legal Tutor">Legal Guardian / Tutor (Tuteur légal)</option>
                        <option value="Uncle / Aunt">Uncle / Aunt (Oncle / Tante)</option>
                        <option value="Sponsor">Financial Sponsor (Garant financier)</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Parent Phone / WhatsApp (max 14 digits)
                      </label>
                      <input
                        type="text"
                        value={formParentPhone}
                        onChange={(e) => setFormParentPhone(e.target.value)}
                        placeholder="+243 81 900 12 34"
                        className="w-full py-2 px-3 rounded-lg border border-slate-300 bg-white text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Parent Email Address
                      </label>
                      <input
                        type="email"
                        value={formParentEmail}
                        onChange={(e) => setFormParentEmail(e.target.value)}
                        placeholder="jp.kabangele@gmail.com"
                        className="w-full py-2 px-3 rounded-lg border border-slate-300 bg-white text-slate-900"
                      />
                    </div>

                    <div className="p-3 bg-teal-50/60 rounded-lg border border-teal-200/80 text-[11px] text-teal-800">
                      <strong>Guarantor Verification:</strong> Financial sponsor records are linked to AVI calculations and consulate certificates.
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION C: DESCRIPTION */}
              <div className="bg-slate-50/70 p-5 rounded-xl border border-slate-200/80 space-y-2 text-xs">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200 text-indigo-950 font-bold text-xs uppercase tracking-wider">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <span>C. Description &amp; Candidate Situation</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Comprehensive background, career plan, academic prerequisites, special constraints, or requirements.
                </p>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full p-3 rounded-lg border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* SECTION D: COMMENTS & COMMUNICATIONS */}
              <div className="bg-slate-50/70 p-5 rounded-xl border border-slate-200/80 space-y-3 text-xs">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200 text-indigo-950 font-bold text-xs uppercase tracking-wider">
                  <MessageSquare className="w-4 h-4 text-indigo-600" />
                  <span>D. Comments &amp; Communications</span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formNewComment}
                    onChange={(e) => setFormNewComment(e.target.value)}
                    placeholder="Enter an internal advisor note or student communication update..."
                    className="flex-1 py-2 px-3 rounded-lg border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleSaveOrUpdateRecord}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm"
                  >
                    Post Comment
                  </button>
                </div>

                {/* Historical Comments Stream */}
                {selectedCandidat.notes && selectedCandidat.notes.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    <p className="text-[10.5px] font-semibold text-slate-400 uppercase">
                      Historical Communications:
                    </p>
                    {selectedCandidat.notes.map((n: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs"
                      >
                        <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                          <span className="font-bold text-slate-800">{n.author}</span>
                          <span>{n.date}</span>
                        </div>
                        <p className="text-slate-700">{n.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION E: ACTIVITIES / HISTORY STREAM */}
              <div className="bg-slate-50/70 p-5 rounded-xl border border-slate-200/80 space-y-3 text-xs">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200 text-indigo-950 font-bold text-xs uppercase tracking-wider">
                  <History className="w-4 h-4 text-indigo-600" />
                  <span>E. Activities &amp; Lifecycle History Stream</span>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {selectedCandidat.history && selectedCandidat.history.length > 0 ? (
                    selectedCandidat.history.map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-start justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-800">{item.author}</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 font-mono">
                              {item.activity_type || 'UPDATE'}
                            </span>
                          </div>
                          <p className="text-slate-600 mt-0.5">{item.details}</p>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap">
                          {item.timestamp}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-400 italic text-[11px] p-2">
                      No previous activity logged. Initial record creation tracked.
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION F: SERVICENOW RELATED LISTS */}
              <div className="pt-4 border-t-2 border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <Layers className="w-4 h-4 text-indigo-600" />
                      <span>Related Lists (Secondary Requests)</span>
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Directly view, track, or initiate secondary service requests linked to this student.
                    </p>
                  </div>

                  {/* Related Lists Sub-Tabs */}
                  <div className="inline-flex rounded-lg bg-slate-100 p-1 text-xs font-semibold text-slate-600">
                    <button
                      type="button"
                      onClick={() => setRelatedListTab('accommodation')}
                      className={`px-3 py-1 rounded-md transition ${
                        relatedListTab === 'accommodation'
                          ? 'bg-white text-indigo-600 shadow-sm'
                          : 'hover:text-slate-900'
                      }`}
                    >
                      Accommodation ({linkedAccommodationRequests.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setRelatedListTab('avi')}
                      className={`px-3 py-1 rounded-md transition ${
                        relatedListTab === 'avi'
                          ? 'bg-white text-indigo-600 shadow-sm'
                          : 'hover:text-slate-900'
                      }`}
                    >
                      AVI Requests ({linkedAviRequests.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setRelatedListTab('schools')}
                      className={`px-3 py-1 rounded-md transition ${
                        relatedListTab === 'schools'
                          ? 'bg-white text-indigo-600 shadow-sm'
                          : 'hover:text-slate-900'
                      }`}
                    >
                      School Applications ({linkedSchoolApplications.length})
                    </button>
                  </div>
                </div>

                {/* RELATED LIST CONTENT */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  {/* LIST 1: ACCOMMODATION REQUESTS */}
                  {relatedListTab === 'accommodation' && (
                    <div>
                      <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">
                          Accommodation Reservation Requests for {selectedCandidat.full_name}
                        </span>
                        {isAuthorizedToEdit && (
                          <button
                            type="button"
                            onClick={() => {
                              if (onOpenAccommodationCreation) {
                                onOpenAccommodationCreation(selectedCandidat.ref);
                              } else {
                                onNotify(`Initiating accommodation request for ${selectedCandidat.ref}...`);
                              }
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                          >
                            <Plus className="w-3 h-3" />
                            <span>New Request</span>
                          </button>
                        )}
                      </div>

                      {linkedAccommodationRequests.length === 0 ? (
                        <div className="py-8 text-center text-xs text-slate-500 space-y-2">
                          <Home className="w-6 h-6 text-slate-300 mx-auto" />
                          <p>No accommodation requests linked to this student.</p>
                          {isAuthorizedToEdit && (
                            <button
                              type="button"
                              onClick={() => {
                                if (onOpenAccommodationCreation) {
                                  onOpenAccommodationCreation(selectedCandidat.ref);
                                }
                              }}
                              className="text-indigo-600 font-semibold hover:underline"
                            >
                              + Create New Accommodation Request
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-[10.5px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                              <tr>
                                <th className="py-2.5 px-3">Reference</th>
                                <th className="py-2.5 px-3">Location &amp; Type</th>
                                <th className="py-2.5 px-3">Arrival Date</th>
                                <th className="py-2.5 px-3">Budget</th>
                                <th className="py-2.5 px-3">Status</th>
                                <th className="py-2.5 px-3">Agent</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {linkedAccommodationRequests.map((acc: any) => (
                                <tr key={acc.ref} className="hover:bg-slate-50/60">
                                  <td className="py-2.5 px-3 font-mono font-bold text-indigo-600">
                                    {acc.ref}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <div className="font-semibold">{acc.preferred_location}</div>
                                    <div className="text-[10px] text-slate-400">{acc.accommodation_type}</div>
                                  </td>
                                  <td className="py-2.5 px-3">{acc.arrival_date}</td>
                                  <td className="py-2.5 px-3 font-medium">{acc.budget}</td>
                                  <td className="py-2.5 px-3">
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                        acc.status === 'Sent'
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                          : acc.status === 'Failed'
                                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                                          : 'bg-amber-50 text-amber-700 border-amber-200'
                                      }`}
                                    >
                                      {acc.status}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-500">{acc.assigned_agent}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* LIST 2: AVI REQUESTS */}
                  {relatedListTab === 'avi' && (
                    <div>
                      <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">
                          AVI &amp; Parent Financing Dossiers for {selectedCandidat.full_name}
                        </span>
                        {isAuthorizedToEdit && (
                          <button
                            type="button"
                            onClick={() => {
                              if (onOpenAviCreation) {
                                onOpenAviCreation(selectedCandidat.ref);
                              } else {
                                onNotify(`Initiating AVI request for ${selectedCandidat.ref}...`);
                              }
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-teal-600 text-white rounded-md hover:bg-teal-700"
                          >
                            <Plus className="w-3 h-3" />
                            <span>New Request</span>
                          </button>
                        )}
                      </div>

                      {linkedAviRequests.length === 0 ? (
                        <div className="py-8 text-center text-xs text-slate-500 space-y-2">
                          <Euro className="w-6 h-6 text-slate-300 mx-auto" />
                          <p>No AVI requests currently linked to this student record.</p>
                          {isAuthorizedToEdit && (
                            <button
                              type="button"
                              onClick={() => {
                                if (onOpenAviCreation) {
                                  onOpenAviCreation(selectedCandidat.ref);
                                }
                              }}
                              className="text-teal-600 font-semibold hover:underline"
                            >
                              + Create New AVI Request
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-[10.5px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                              <tr>
                                <th className="py-2.5 px-3">Reference</th>
                                <th className="py-2.5 px-3">Offer / Formula</th>
                                <th className="py-2.5 px-3">Amount (EUR)</th>
                                <th className="py-2.5 px-3">Parent Sponsor</th>
                                <th className="py-2.5 px-3">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {linkedAviRequests.map((avi: any) => (
                                <tr key={avi.ref} className="hover:bg-slate-50/60">
                                  <td className="py-2.5 px-3 font-mono font-bold text-teal-700">
                                    {avi.ref}
                                  </td>
                                  <td className="py-2.5 px-3 font-medium">{avi.offer_name || 'Classique'}</td>
                                  <td className="py-2.5 px-3 font-semibold">
                                    {Number(avi.principal_eur || 0).toLocaleString()} €
                                  </td>
                                  <td className="py-2.5 px-3">{avi.parent_name}</td>
                                  <td className="py-2.5 px-3">
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                                      {avi.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* LIST 3: SCHOOL APPLICATIONS */}
                  {relatedListTab === 'schools' && (
                    <div>
                      <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">
                          Partner School Targets &amp; Applications in Lyon
                        </span>
                        {isAuthorizedToEdit && (
                          <button
                            type="button"
                            onClick={() => setShowNewVoeuModal(true)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-[#0c685a] text-white rounded-md hover:bg-[#0c685a]/90"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add Application Target</span>
                          </button>
                        )}
                      </div>

                      {linkedSchoolApplications.length === 0 ? (
                        <div className="py-8 text-center text-xs text-slate-500 space-y-2">
                          <Building2 className="w-6 h-6 text-slate-300 mx-auto" />
                          <p>No school applications currently added.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-[10.5px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                              <tr>
                                <th className="py-2.5 px-3">Partner Institution</th>
                                <th className="py-2.5 px-3">Program / Major</th>
                                <th className="py-2.5 px-3">Location</th>
                                <th className="py-2.5 px-3">Preference Rank</th>
                                <th className="py-2.5 px-3">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {linkedSchoolApplications.map((app: any, idx: number) => (
                                <tr key={idx} className="hover:bg-slate-50/60">
                                  <td className="py-2.5 px-3 font-semibold text-slate-900">
                                    {app.university}
                                  </td>
                                  <td className="py-2.5 px-3">{app.program}</td>
                                  <td className="py-2.5 px-3 text-slate-500">{app.location || 'Lyon'}</td>
                                  <td className="py-2.5 px-3 font-mono text-indigo-600">
                                    {app.rankBadge || `Choice #${idx + 1}`}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      {app.statusBadge || 'Validated Target'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MILESTONES (Existing Jalons View) */}
          {activeSubTab === 2 && (
            <div className="p-6 space-y-4">
              <h3 className="font-bold text-slate-900 text-sm mb-2">Academic &amp; Consular Milestones</h3>
              <div className="space-y-3">
                {selectedCandidat.jalons?.map((jalon: any) => (
                  <div
                    key={jalon.num}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-indigo-600">
                          {jalon.label}
                        </span>
                        <h4 className="font-bold text-slate-900 text-xs">{jalon.title}</h4>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                            jalon.tone === 'done'
                              ? 'bg-emerald-100 text-emerald-800'
                              : jalon.tone === 'active'
                              ? 'bg-sky-100 text-sky-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {jalon.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">{jalon.description}</p>
                    </div>

                    {isAuthorizedToEdit && (
                      <button
                        onClick={() => onAdvanceJalon(selectedCandidat.ref, jalon.num)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 whitespace-nowrap"
                      >
                        Set Active
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: PARTNER SCHOOL TARGETS */}
          {activeSubTab === 3 && (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm">Lyon Partner Schools</h3>
                {isAuthorizedToEdit && (
                  <button
                    onClick={() => setShowNewVoeuModal(true)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white"
                  >
                    + Add School Target
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedCandidat.voeux?.map((voeu: any, idx: number) => (
                  <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                    <span className="text-[10px] font-bold text-indigo-600 font-mono">
                      {voeu.rankBadge}
                    </span>
                    <h4 className="font-bold text-slate-900 text-xs">{voeu.university}</h4>
                    <p className="text-xs text-slate-600">{voeu.program}</p>
                    <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                      {voeu.statusBadge}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: DOCUMENTS */}
          {activeSubTab === 4 && (
            <div className="p-6 space-y-3">
              <h3 className="font-bold text-slate-900 text-sm mb-2">Student Dossier Documents</h3>
              <div className="space-y-2">
                {selectedCandidat.pieces?.map((piece: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-900">{piece.name}</span>
                      <span className="text-slate-400 text-[11px] ml-2 font-mono">({piece.meta})</span>
                    </div>
                    <button
                      onClick={() => onTogglePiece(selectedCandidat.ref, idx)}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold ${
                        piece.status === 'valid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {piece.status === 'valid' ? '✓ Verified' : 'Pending Review'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* DELETE SAFEGUARD CONFIRMATION MODAL */}
      {showDeleteConfirmModal && selectedCandidat && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  {deleteSafeguardData?.hasLinkedRecords
                    ? 'Safeguard: Linked Requests Detected'
                    : 'Confirm Student Record Deletion'}
                </h3>
                <p className="text-slate-500 font-mono">{selectedCandidat.ref}</p>
              </div>
            </div>

            {deleteSafeguardData?.hasLinkedRecords ? (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 space-y-2">
                <p className="font-bold">
                  Cannot perform normal deletion: This student has {deleteSafeguardData.linkedCount} linked secondary request(s).
                </p>
                <div className="text-[11px] space-y-1">
                  {deleteSafeguardData.linkedRecords.map((r, i) => (
                    <div key={i} className="font-mono bg-white/70 p-1 rounded">
                      • {r}
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-rose-800 pt-1">
                  To protect data integrity, remove or archive linked requests first, or confirm an administrative cascade deletion.
                </p>
              </div>
            ) : (
              <p className="text-slate-600">
                Are you sure you want to permanently delete Student Record <strong>{selectedCandidat.full_name}</strong> ({selectedCandidat.ref})? This action will be logged in the audit trail.
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirmModal(false);
                  setDeleteSafeguardData(null);
                }}
                disabled={isDeleting}
                className="px-3.5 py-2 font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>

              {deleteSafeguardData?.hasLinkedRecords ? (
                <button
                  type="button"
                  onClick={() => handleConfirmDelete(true)}
                  disabled={isDeleting}
                  className="px-4 py-2 font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow"
                >
                  {isDeleting ? 'Deleting...' : 'Force Cascade Delete'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleConfirmDelete(false)}
                  disabled={isDeleting}
                  className="px-4 py-2 font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow"
                >
                  {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CREATE NEW CANDIDAT MODAL */}
      {showNewCandidatModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4 my-8 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  {isEn ? 'Record a New Student Record' : 'Créer un Nouveau Candidat'}
                </h3>
              </div>
              <button
                onClick={() => setShowNewCandidatModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCandSubmit} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isEn ? 'Student Full Name *' : 'Nom et Prénom *'}
                </label>
                <input
                  type="text"
                  required
                  value={newCandName}
                  onChange={(e) => setNewCandName(e.target.value)}
                  placeholder="e.g. Dieudonné KABANGELE"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isEn ? 'Target Partner School Program *' : 'Filière Partenaire *'}
                </label>
                <select
                  value={newCandProgram}
                  onChange={(e) => setNewCandProgram(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                >
                  <option value="MyDigitalSchool Lyon — Web dev, digital creation, webmarketing & UX/UI design">
                    MyDigitalSchool Lyon — Web Dev &amp; UX/UI
                  </option>
                  <option value="ISCOM Lyon — Communication, advertising, marketing and events">
                    ISCOM Lyon — Communication &amp; Marketing
                  </option>
                  <option value="École Internationale Tunon Lyon — Tourism, hospitality, PR and events">
                    École Internationale Tunon Lyon — Hospitality &amp; Events
                  </option>
                  <option value="IHECF Lyon — Accounting, auditing, finance and management control">
                    IHECF Lyon — Accounting &amp; Audit
                  </option>
                  <option value="MBway Lyon — Management, HR, finance and international business">
                    MBway Lyon — International Business &amp; MBA
                  </option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Country</label>
                  <input
                    type="text"
                    value={newCandCountry}
                    onChange={(e) => setNewCandCountry(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Graduation Year</label>
                  <input
                    type="text"
                    value={newCandGraduationYear}
                    onChange={(e) => setNewCandGraduationYear(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isEn ? 'Parent / Tutor Full Name' : 'Nom du parent / tuteur'}
                  </label>
                  <input
                    type="text"
                    value={newCandParentName}
                    onChange={(e) => setNewCandParentName(e.target.value)}
                    placeholder="Jean-Pierre Kabangele"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isEn ? 'Parent Phone (max 14 digits)' : 'Tél parent (max 14 chiffres)'}
                  </label>
                  <input
                    type="text"
                    value={newCandParentPhone}
                    onChange={(e) => setNewCandParentPhone(e.target.value)}
                    placeholder="+243 81 900 12 34"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowNewCandidatModal(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 font-bold shadow"
                >
                  Create Student Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD ACADEMIC TARGET */}
      {showNewVoeuModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900">
                Add Academic Target ({selectedCandidat.full_name})
              </h3>
              <button
                onClick={() => setShowNewVoeuModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddVoeuSubmit} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Partner School *</label>
                <select
                  value={voeuUniv}
                  onChange={(e) => {
                    const school = e.target.value;
                    setVoeuUniv(school);
                    if (school.includes('ISCOM')) setVoeuCode('ISCO');
                    else if (school.includes('MyDigitalSchool')) setVoeuCode('MDS');
                    else if (school.includes('Tunon')) setVoeuCode('TUNO');
                    else if (school.includes('IHECF')) setVoeuCode('IHEC');
                    else if (school.includes('MBway')) setVoeuCode('MBW');
                  }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option value="ISCOM Lyon">ISCOM Lyon</option>
                  <option value="MyDigitalSchool Lyon">MyDigitalSchool Lyon</option>
                  <option value="École Internationale Tunon Lyon">École Internationale Tunon Lyon</option>
                  <option value="IHECF Lyon">IHECF Lyon</option>
                  <option value="MBway Lyon">MBway Lyon</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Program / Major *</label>
                <input
                  type="text"
                  required
                  value={voeuProg}
                  onChange={(e) => setVoeuProg(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowNewVoeuModal(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 text-white px-5 py-2 font-bold"
                >
                  Add Target
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
