'use client';

import React, { useState, useRef } from 'react';
import {
  Home,
  Search,
  Plus,
  Send,
  Calendar,
  MapPin,
  User,
  Mail,
  Phone,
  Euro,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
  ExternalLink,
  Shield,
  ChevronRight,
  Filter,
  Check,
  X,
  MessageSquare,
  History,
  Upload,
  Paperclip,
  Trash2,
  Building2,
  ShieldOff,
} from 'lucide-react';
import { Lang } from './ServicesAndOtherScreens';
import {
  ACCOMMODATION_PARTNERS,
  AccommodationPartner,
  AccommodationPartnerId,
  getAccommodationPartnerById,
} from '@/lib/accommodationPartners';

export interface AccommodationRequest {
  id: number;
  ref: string;
  student_ref: string;
  student_name: string;
  student_email: string;
  student_phone: string;
  student_nationality: string;
  student_location: string;
  parent_name?: string;
  parent_phone?: string;
  parent_email?: string;
  parent_relation?: string;
  admission_status?: string;
  procedure_status?: string;
  preferred_location: string;
  accommodation_type: string;
  arrival_date: string;
  departure_date?: string;
  budget: string;
  special_requirements?: string;
  supporting_docs?: string;
  partner_name?: string;
  attachments?: Array<{ filename: string; sizeFormatted?: string; contentType?: string }>;
  status:
    | 'Draft'
    | 'Ready to Send'
    | 'Sending'
    | 'Sent'
    | 'Failed'
    | 'Submitted'
    | 'In Progress'
    | 'Reserved'
    | 'Partner Confirmed'
    | 'Rejected'
    | 'Cancelled'
    | 'Completed';
  assigned_agent: string;
  notes?: string;
  history?: Array<{
    timestamp: string;
    author: string;
    action: string;
    details: string;
    status?: string;
  }>;
  email_sent_at?: string;
  email_sent_by?: string;
  email_recipient?: string;
  email_status?: string;
  email_error?: string;
  created_at: string;
  updated_at?: string;
}

interface AccommodationScreenProps {
  accommodationRequests: AccommodationRequest[];
  candidats: any[];
  currentRole: 'admin' | 'secretary' | 'avi';
  currentUser?: any;
  onRefresh: () => Promise<void>;
  onSelectStudentRef?: (ref: string) => void;
  onNotify: (msg: string) => void;
  lang?: Lang;
}

export default function AccommodationScreen({
  accommodationRequests,
  candidats,
  currentRole,
  currentUser,
  onRefresh,
  onSelectStudentRef,
  onNotify,
  lang = 'en',
}: AccommodationScreenProps) {
  const isEn = lang === 'en';
  const isAuthorizedToSend = currentRole === 'admin' || currentRole === 'secretary';

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [agentFilter, setAgentFilter] = useState('ALL');

  // Selected Request Modal / Detail View
  const [selectedRequest, setSelectedRequest] = useState<AccommodationRequest | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Send Confirmation Dialog State & Partner Selection
  const [showSendConfirmDialog, setShowSendConfirmDialog] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [confirmedResend, setConfirmedResend] = useState(false);
  const [selectedPartnerId, setSelectedPartnerId] = useState<AccommodationPartnerId>('danova');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileUploadError, setFileUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual Confirmation, Decline & Cancellation State
  const [showConfirmGrantedModal, setShowConfirmGrantedModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [confirmDate, setConfirmDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [confirmPartnerRef, setConfirmPartnerRef] = useState('');
  const [confirmNotes, setConfirmNotes] = useState('');
  const [confirmDocName, setConfirmDocName] = useState('');
  const [declineReason, setDeclineReason] = useState('');
  const [cancellationReason, setCancellationReason] = useState('');
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);

  // File Attachment Validation & Handling
  const handleAddFiles = (newFiles: FileList | File[]) => {
    setFileUploadError(null);
    const validExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.docx', '.doc'];
    const maxFileSizeBytes = 5 * 1024 * 1024; // 5 MB

    const filesArray = Array.from(newFiles);
    const accumulated = [...selectedFiles];

    for (const file of filesArray) {
      if (accumulated.length >= 5) {
        setFileUploadError(
          isEn ? 'Maximum 5 supporting documents allowed.' : 'Maximum 5 pièces justificatives autorisées.'
        );
        break;
      }

      const extMatch = file.name.match(/\.[0-9a-z]+$/i);
      const ext = extMatch ? extMatch[0].toLowerCase() : '';

      if (!validExtensions.includes(ext)) {
        setFileUploadError(
          isEn
            ? `File "${file.name}" has an unsupported format. Allowed formats: PDF, JPG, PNG, DOCX.`
            : `Le fichier "${file.name}" a un format non pris en charge. Formats acceptés : PDF, JPG, PNG, DOCX.`
        );
        continue;
      }

      if (file.size > maxFileSizeBytes) {
        setFileUploadError(
          isEn
            ? `File "${file.name}" (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the 5 MB limit.`
            : `Le fichier "${file.name}" (${(file.size / (1024 * 1024)).toFixed(1)} Mo) dépasse la limite de 5 Mo.`
        );
        continue;
      }

      if (accumulated.some((f) => f.name === file.name && f.size === file.size)) {
        continue;
      }

      accumulated.push(file);
    }

    setSelectedFiles(accumulated);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setFileUploadError(null);
  };

  const openSendModal = (req: AccommodationRequest) => {
    setSelectedRequest(req);
    setConfirmedResend(req.status === 'Sent');
    const existingPartner = ACCOMMODATION_PARTNERS.find(
      (p) => p.name === req.partner_name || p.email === req.email_recipient
    );
    setSelectedPartnerId(existingPartner ? existingPartner.id : 'danova');
    setSelectedFiles([]);
    setFileUploadError(null);
    setShowSendConfirmDialog(true);
  };

  // New Request Form State
  const [newStudentRef, setNewStudentRef] = useState(candidats[0]?.ref || '');
  const [newPreferredLocation, setNewPreferredLocation] = useState('Lyon 7e (Jean Macé)');
  const [newAccommodationType, setNewAccommodationType] = useState('Studio Meublé (Résidence Étudiante)');
  const [newArrivalDate, setNewArrivalDate] = useState('2025-09-01');
  const [newDepartureDate, setNewDepartureDate] = useState('2026-06-30');
  const [newBudget, setNewBudget] = useState('550 € / month');
  const [newSpecialRequirements, setNewSpecialRequirements] = useState(
    'High-speed WiFi for coursework, close to Metro B or Tram T2, quiet study space.'
  );
  const [newSupportingDocs, setNewSupportingDocs] = useState('Passport, Admission Certificate, Financial Guarantee');
  const [newAssignedAgent, setNewAssignedAgent] = useState(currentUser?.name || 'Barthelemy MAPWABA NTORO');
  const [newNotes, setNewNotes] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Status Tone Helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Sent':
      case 'Pending Partner Response':
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
          dot: 'bg-amber-500',
          label: isEn ? 'Pending Partner Response' : 'En attente retour partenaire',
        };
      case 'Reservation Granted':
      case 'Partner Confirmed':
      case 'Reserved':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
          dot: 'bg-emerald-500',
          label: isEn ? 'Reservation Granted' : 'Réservation accordée',
        };
      case 'Reservation Declined':
      case 'Rejected':
        return {
          bg: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800',
          dot: 'bg-rose-500',
          label: isEn ? 'Reservation Declined' : 'Réservation refusée',
        };
      case 'Cancelled':
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
          dot: 'bg-slate-400',
          label: isEn ? 'Cancelled' : 'Annulée',
        };
      case 'Failed':
        return {
          bg: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800',
          dot: 'bg-rose-500',
          label: isEn ? 'Dispatch Failed' : 'Échec transmission',
        };
      case 'Ready to Send':
        return {
          bg: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800',
          dot: 'bg-blue-500',
          label: isEn ? 'Ready to Send' : 'Prêt à expédier',
        };
      case 'Draft':
        return {
          bg: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
          dot: 'bg-slate-400',
          label: isEn ? 'Draft' : 'Brouillon',
        };
      case 'In Progress':
        return {
          bg: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800',
          dot: 'bg-sky-500',
          label: isEn ? 'In Progress' : 'En cours',
        };
      default:
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
          dot: 'bg-slate-400',
          label: status,
        };
    }
  };

  // Action handlers: Manual Confirmation, Decline, and Cancellation
  const handleConfirmReservationGranted = async () => {
    if (!selectedRequest) return;
    setIsActionSubmitting(true);
    try {
      const res = await fetch('/api/accommodation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ref: selectedRequest.ref,
          action: 'confirm_reservation_granted',
          confirmation_date: confirmDate,
          confirmation_reference: confirmPartnerRef,
          confirmation_notes: confirmNotes,
          confirmation_doc_name: confirmDocName,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to confirm reservation granted');
      }
      onNotify(
        isEn
          ? `Accommodation reservation granted confirmed for ${selectedRequest.student_name}.`
          : `Réservation de logement accordée confirmée pour ${selectedRequest.student_name}.`
      );
      setShowConfirmGrantedModal(false);
      setShowDetailModal(false);
      onRefresh();
    } catch (err: any) {
      onNotify('Error: ' + err?.message);
    } finally {
      setIsActionSubmitting(false);
    }
  };

  const handleConfirmReservationDeclined = async () => {
    if (!selectedRequest) return;
    if (!declineReason.trim()) {
      onNotify(isEn ? 'Please provide a mandatory reason for declining.' : 'Veuillez renseigner le motif du refus.');
      return;
    }
    setIsActionSubmitting(true);
    try {
      const res = await fetch('/api/accommodation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ref: selectedRequest.ref,
          action: 'confirm_reservation_declined',
          decline_reason: declineReason,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to record reservation decline');
      }
      onNotify(
        isEn
          ? `Reservation declined recorded for ${selectedRequest.student_name}.`
          : `Refus de réservation enregistré pour ${selectedRequest.student_name}.`
      );
      setShowDeclineModal(false);
      setShowDetailModal(false);
      onRefresh();
    } catch (err: any) {
      onNotify('Error: ' + err?.message);
    } finally {
      setIsActionSubmitting(false);
    }
  };

  const handleCancelReservation = async () => {
    if (!selectedRequest) return;
    if (!cancellationReason.trim()) {
      onNotify(isEn ? 'Please provide a mandatory reason for cancellation.' : 'Veuillez renseigner le motif d’annulation.');
      return;
    }
    setIsActionSubmitting(true);
    try {
      const res = await fetch('/api/accommodation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ref: selectedRequest.ref,
          action: 'cancel_reservation',
          cancellation_reason: cancellationReason,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to cancel reservation');
      }
      onNotify(
        isEn
          ? `Reservation request ${selectedRequest.ref} cancelled.`
          : `Demande de réservation ${selectedRequest.ref} annulée.`
      );
      setShowCancelModal(false);
      setShowDetailModal(false);
      onRefresh();
    } catch (err: any) {
      onNotify('Error: ' + err?.message);
    } finally {
      setIsActionSubmitting(false);
    }
  };

  // Filter requests
  const filteredRequests = accommodationRequests.filter((req) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      req.ref.toLowerCase().includes(q) ||
      req.student_ref.toLowerCase().includes(q) ||
      req.student_name.toLowerCase().includes(q) ||
      req.preferred_location.toLowerCase().includes(q) ||
      req.accommodation_type.toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'ALL' || req.status === statusFilter;
    const matchesAgent = agentFilter === 'ALL' || req.assigned_agent === agentFilter;

    return matchesSearch && matchesStatus && matchesAgent;
  });

  // Unique agents for filter dropdown
  const uniqueAgents = Array.from(
    new Set(accommodationRequests.map((r) => r.assigned_agent).filter(Boolean))
  );

  // Handle Create Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentRef) {
      onNotify('Please select a student record.');
      return;
    }
    if (!newArrivalDate) {
      onNotify('Intended arrival date is required.');
      return;
    }

    setIsCreating(true);
    try {
      const selectedStudent = candidats.find((c) => c.ref === newStudentRef);
      const res = await fetch('/api/accommodation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': currentUser?.email || 'bmapwabantoro@liecconsulting.com',
        },
        body: JSON.stringify({
          student_ref: newStudentRef,
          student_name: selectedStudent?.full_name,
          student_email: selectedStudent?.email,
          student_phone: selectedStudent?.phone,
          student_nationality: selectedStudent?.nationality,
          student_location: selectedStudent?.country,
          parent_name: selectedStudent?.parent_full_name,
          parent_phone: selectedStudent?.parent_phone,
          parent_email: selectedStudent?.parent_email,
          parent_relation: selectedStudent?.parent_relation || 'Parent',
          admission_status: selectedStudent?.admission_status,
          procedure_status: selectedStudent?.stage_badge,
          preferred_location: newPreferredLocation,
          accommodation_type: newAccommodationType,
          arrival_date: newArrivalDate,
          departure_date: newDepartureDate,
          budget: newBudget,
          special_requirements: newSpecialRequirements,
          supporting_docs: newSupportingDocs,
          assigned_agent: newAssignedAgent,
          notes: newNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create accommodation request');
      }

      onNotify(`Accommodation request ${data.accommodationRequest.ref} successfully created.`);
      setShowCreateModal(false);
      await onRefresh();
    } catch (err: any) {
      onNotify(`Error: ${err.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  // Handle Send Partner Email
  const handleSendEmail = async () => {
    if (!selectedRequest || !selectedPartnerId) return;
    setIsSending(true);

    try {
      const targetPartner = getAccommodationPartnerById(selectedPartnerId);
      if (!targetPartner) {
        throw new Error('Please select a valid partner (SCI DANOVA or CITY PROPERTY).');
      }

      const formData = new FormData();
      formData.append('ref', selectedRequest.ref);
      formData.append('partner_id', selectedPartnerId);
      if (confirmedResend) {
        formData.append('confirmed_resend', 'true');
      }
      for (const file of selectedFiles) {
        formData.append('attachments', file);
      }

      const res = await fetch('/api/accommodation/send', {
        method: 'POST',
        headers: {
          'x-user-email': currentUser?.email || 'bmapwabantoro@liecconsulting.com',
        },
        body: formData,
      });

      const data = await res.json();

      if (res.status === 409 && data.requiresConfirmation) {
        // Needs explicit resend confirmation
        setConfirmedResend(true);
        onNotify(
          data.message ||
            (isEn
              ? 'Previous submission detected. Please confirm to resend.'
              : 'Demande déjà envoyée. Veuillez confirmer pour réexpédier.')
        );
        setIsSending(false);
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send partner email');
      }

      const docNote =
        data.attachmentsCount > 0
          ? ` (${data.attachmentsCount} ${isEn ? 'document(s) enclosed' : 'document(s) joint(s)'})`
          : '';

      onNotify(
        isEn
          ? `Accommodation reservation request sent exclusively to ${data.partner} (${data.recipient})${docNote}!`
          : `Demande de réservation envoyée exclusivement à ${data.partner} (${data.recipient})${docNote} !`
      );
      setShowSendConfirmDialog(false);
      setShowDetailModal(false);
      setConfirmedResend(false);
      setSelectedFiles([]);
      setFileUploadError(null);
      await onRefresh();
    } catch (err: any) {
      onNotify(`Error sending request: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  // Revocation State & Handler for Partner Download Tokens
  const [isRevoking, setIsRevoking] = useState(false);
  const handleRevokeAccess = async () => {
    if (!selectedRequest) return;
    const confirmMessage = isEn
      ? `Are you sure you want to revoke partner document download access for request ${selectedRequest.ref}? All temporary download links dispatched to the partner will immediately stop functioning.`
      : `Êtes-vous sûr de vouloir révoquer l'accès aux documents pour la demande ${selectedRequest.ref} ? Tous les liens de téléchargement temporaires transmis au partenaire cesseront immédiatement de fonctionner.`;

    if (!window.confirm(confirmMessage)) return;

    setIsRevoking(true);
    try {
      const res = await fetch('/api/accommodation/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': currentUser?.email || 'bmapwabantoro@liecconsulting.com',
        },
        body: JSON.stringify({ ref: selectedRequest.ref }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to revoke partner access tokens');
      }

      onNotify(
        isEn
          ? `Partner document access revoked successfully (${data.revokedTokensCount} active token(s) deactivated).`
          : `Accès révoqué avec succès (${data.revokedTokensCount} jeton(s) d’accès désactivé(s)).`
      );
      setShowDetailModal(false);
      await onRefresh();
    } catch (err: any) {
      onNotify(`Error revoking access: ${err.message}`);
    } finally {
      setIsRevoking(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-600 flex items-center justify-center text-white shadow-md">
              <Home className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                {isEn ? 'Accommodation Reservations' : 'Réservations de Logement'}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isEn
                  ? 'Initiate, track, and manage student housing requests with partner accommodations in Lyon'
                  : 'Gestion et suivi des demandes de logement étudiant avec les résidences partenaires à Lyon'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onRefresh()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-750 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {isEn ? 'Refresh' : 'Actualiser'}
          </button>

          {isAuthorizedToSend && (
            <button
              onClick={() => {
                setConfirmedResend(false);
                setShowCreateModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg shadow hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              {isEn ? 'New Accommodation Request' : 'Nouvelle Demande Logement'}
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-white dark:bg-slate-850 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="md:col-span-6 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder={
              isEn
                ? 'Search by request ref, student name, LIEC ref, or location...'
                : 'Rechercher par référence, nom étudiant, jalon ou ville...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="md:col-span-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">{isEn ? 'All Statuses' : 'Tous les statuts'}</option>
            <option value="Draft">Draft</option>
            <option value="Ready to Send">Ready to Send</option>
            <option value="Sent">Sent (Partner Email Dispatched)</option>
            <option value="Partner Confirmed">Partner Confirmed</option>
            <option value="Reserved">Reserved</option>
            <option value="In Progress">In Progress</option>
            <option value="Failed">Failed (Retryable)</option>
            <option value="Completed">Completed</option>
          </select>
        </div>

        <div className="md:col-span-3">
          <select
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
            className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">{isEn ? 'All Assigned Agents' : 'Tous les conseillers'}</option>
            {uniqueAgents.map((agent) => (
              <option key={agent} value={agent}>
                {agent}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">{isEn ? 'Request Ref' : 'Réf. Logement'}</th>
                <th className="py-3 px-4">{isEn ? 'Student / LIEC Ref' : 'Étudiant / Réf. LIEC'}</th>
                <th className="py-3 px-4">{isEn ? 'Location & Type' : 'Lieu & Type'}</th>
                <th className="py-3 px-4">{isEn ? 'Arrival Date' : 'Arrivée'}</th>
                <th className="py-3 px-4">{isEn ? 'Budget' : 'Budget'}</th>
                <th className="py-3 px-4">{isEn ? 'Status' : 'Statut'}</th>
                <th className="py-3 px-4">{isEn ? 'Assigned Agent' : 'Conseiller'}</th>
                <th className="py-3 px-4 text-right">{isEn ? 'Actions' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Home className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                      <p className="font-medium text-slate-700 dark:text-slate-300">
                        {isEn ? 'No accommodation requests found' : 'Aucune demande de logement'}
                      </p>
                      <p className="text-[11px]">
                        {isEn
                          ? 'Create a new request directly or filter by another keyword.'
                          : 'Initiez une nouvelle demande ou ajustez les filtres.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => {
                  const badge = getStatusBadge(req.status);
                  return (
                    <tr
                      key={req.ref}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                      onClick={() => {
                        setSelectedRequest(req);
                        setShowDetailModal(true);
                      }}
                    >
                      <td className="py-3.5 px-4 font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                        {req.ref}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {req.student_name}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onSelectStudentRef) onSelectStudentRef(req.student_ref);
                          }}
                          className="text-[11px] font-mono text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 inline-flex items-center gap-1"
                        >
                          {req.student_ref}
                          <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                        </button>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {req.preferred_location}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {req.accommodation_type}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {req.arrival_date}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {req.budget}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${badge.bg}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          {badge.label}
                        </span>
                        {(req.partner_name || req.email_recipient) && (
                          <div className="text-[10px] text-indigo-700 dark:text-indigo-400 mt-1 font-semibold flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-indigo-500 flex-shrink-0" />
                            <span className="truncate max-w-[130px]">{req.partner_name || req.email_recipient}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {req.assigned_agent}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          {isAuthorizedToSend && (req.status === 'Sent' || req.status === 'Pending Partner Response') && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedRequest(req);
                                setShowConfirmGrantedModal(true);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer"
                              title="Confirm reservation granted by partner"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{isEn ? 'Confirm' : 'Confirmer'}</span>
                            </button>
                          )}
                          {isAuthorizedToSend && (
                            <button
                              type="button"
                              onClick={() => openSendModal(req)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors shadow-sm"
                              title={
                                req.status === 'Sent'
                                  ? 'Resend request email to partner'
                                  : 'Dispatch official request email to partner'
                              }
                            >
                              <Send className="w-3 h-3" />
                              {req.status === 'Sent'
                                ? isEn
                                  ? 'Resend'
                                  : 'Réexpédier'
                                : isEn
                                ? 'Send Request'
                                : 'Envoyer'}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRequest(req);
                              setShowDetailModal(true);
                            }}
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL & STATUS MODAL */}
      {showDetailModal && selectedRequest && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                  <Home className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      {selectedRequest.ref}
                    </h2>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                        getStatusBadge(selectedRequest.status).bg
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${getStatusBadge(selectedRequest.status).dot}`} />
                      {getStatusBadge(selectedRequest.status).label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {isEn ? 'Student:' : 'Étudiant :'} {selectedRequest.student_name} (
                    <button
                      type="button"
                      onClick={() => {
                        setShowDetailModal(false);
                        if (onSelectStudentRef) onSelectStudentRef(selectedRequest.student_ref);
                      }}
                      className="text-indigo-600 dark:text-indigo-400 underline font-mono"
                    >
                      {selectedRequest.student_ref}
                    </button>
                    )
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isAuthorizedToSend && (selectedRequest.status === 'Sent' || selectedRequest.status === 'Pending Partner Response') && (
                  <button
                    onClick={() => setShowConfirmGrantedModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isEn ? 'Confirm Granted' : 'Confirmer accordée'}</span>
                  </button>
                )}
                {isAuthorizedToSend && (
                  <button
                    onClick={() => openSendModal(selectedRequest)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {selectedRequest.status === 'Sent'
                      ? isEn
                        ? 'Resend Request'
                        : 'Réexpédier Demande'
                      : isEn
                      ? 'Send Request'
                      : 'Envoyer au Partenaire'}
                  </button>
                )}
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Status Specific Highlights */}
              {selectedRequest.status === 'Reservation Granted' && (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 space-y-2">
                  <div className="font-bold flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    <span className="text-sm">{isEn ? 'Official Accommodation Reservation Granted' : 'Réservation de Logement Officiellement Accordée'}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block">{isEn ? 'Confirmation Date:' : 'Date de confirmation :'}</span>
                      <strong>{selectedRequest.confirmation_date ? new Date(selectedRequest.confirmation_date).toLocaleDateString() : 'Confirmed'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block">{isEn ? 'Partner Ref / Lease:' : 'Réf. Partenaire / Bail :'}</span>
                      <strong className="font-mono">{selectedRequest.confirmation_reference || 'N/A'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block">{isEn ? 'Confirmed By:' : 'Confirmé par :'}</span>
                      <strong>{selectedRequest.confirmation_agent || 'Authorized Staff'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block">{isEn ? 'Partner Name:' : 'Partenaire :'}</span>
                      <strong>{selectedRequest.partner_name || 'Partner'}</strong>
                    </div>
                  </div>
                  {selectedRequest.confirmation_notes && (
                    <div className="pt-1.5 text-[11px] border-t border-emerald-200 dark:border-emerald-800">
                      <span className="text-slate-500 dark:text-slate-400">{isEn ? 'Partner Notes:' : 'Notes partenaire :'}</span> {selectedRequest.confirmation_notes}
                    </div>
                  )}
                  {selectedRequest.confirmation_doc_name && (
                    <div className="text-[11px]">
                      <span className="text-slate-500 dark:text-slate-400">{isEn ? 'Confirmation Doc:' : 'Document justificatif :'}</span>{' '}
                      <span className="font-mono font-bold">{selectedRequest.confirmation_doc_name}</span>
                    </div>
                  )}
                </div>
              )}

              {selectedRequest.status === 'Reservation Declined' && (
                <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-900 dark:text-rose-200 space-y-1">
                  <div className="font-bold flex items-center gap-2 text-rose-800 dark:text-rose-300">
                    <X className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                    <span>{isEn ? 'Accommodation Reservation Declined by Partner' : 'Réservation Refusée par le Partenaire'}</span>
                  </div>
                  <p className="text-[11px]">
                    <strong className="text-slate-600 dark:text-slate-400">{isEn ? 'Documented Reason:' : 'Motif enregistré :'}</strong>{' '}
                    {selectedRequest.decline_reason || 'No availability for requested semester.'}
                  </p>
                </div>
              )}

              {selectedRequest.status === 'Cancelled' && (
                <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 space-y-1">
                  <div className="font-bold flex items-center gap-2 text-slate-800 dark:text-slate-200">
                    <X className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    <span>{isEn ? 'Accommodation Request Cancelled' : 'Demande de Logement Annulée'}</span>
                  </div>
                  <p className="text-[11px]">
                    <strong className="text-slate-500">{isEn ? 'Cancellation Reason:' : 'Motif d’annulation :'}</strong>{' '}
                    {selectedRequest.cancellation_reason || 'Cancelled by LIEC staff / student.'}
                  </p>
                </div>
              )}
              {/* Email Delivery Banner if Sent or Failed */}
              {selectedRequest.email_sent_at && (
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                  <div className="space-y-0.5">
                    <p className="font-semibold flex items-center gap-2">
                      <span>{isEn ? 'Official Partner Email Dispatched' : 'Email partenaire expédié avec succès'}</span>
                      {selectedRequest.partner_name && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 font-bold text-[10px] uppercase">
                          {selectedRequest.partner_name}
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] opacity-90">
                      {isEn ? 'Delivered exclusively to' : 'Envoyé exclusivement à'}{' '}
                      <strong className="font-mono text-emerald-900 dark:text-emerald-100">
                        {selectedRequest.email_recipient}
                      </strong>{' '}
                      {isEn ? 'on' : 'le'} {selectedRequest.email_sent_at} {isEn ? 'by' : 'par'}{' '}
                      {selectedRequest.email_sent_by}.
                    </p>
                  </div>
                </div>
              )}

              {selectedRequest.status === 'Failed' && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">
                      {isEn ? 'Email Dispatch Failed' : 'Échec de transmission'}
                    </p>
                    <p className="text-[11px] opacity-90">
                      {selectedRequest.email_error || 'Could not reach partner outbound mail service.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Student & Parent Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-2 uppercase text-[10px] tracking-wider text-indigo-600 dark:text-indigo-400">
                    {isEn ? 'Student Information' : 'Dossier Étudiant'}
                  </h3>
                  <div className="space-y-1 text-slate-600 dark:text-slate-300">
                    <p>
                      <strong className="text-slate-800 dark:text-slate-200">{isEn ? 'Full Name:' : 'Nom :'}</strong>{' '}
                      {selectedRequest.student_name}
                    </p>
                    <p>
                      <strong className="text-slate-800 dark:text-slate-200">Email:</strong>{' '}
                      {selectedRequest.student_email || '—'}
                    </p>
                    <p>
                      <strong className="text-slate-800 dark:text-slate-200">{isEn ? 'Phone:' : 'Tél :'}</strong>{' '}
                      {selectedRequest.student_phone || '—'}
                    </p>
                    <p>
                      <strong className="text-slate-800 dark:text-slate-200">{isEn ? 'Nationality:' : 'Nationalité :'}</strong>{' '}
                      {selectedRequest.student_nationality || '—'}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-2 uppercase text-[10px] tracking-wider text-indigo-600 dark:text-indigo-400">
                    {isEn ? 'Parent / Sponsor' : 'Parent / Garant'}
                  </h3>
                  <div className="space-y-1 text-slate-600 dark:text-slate-300">
                    <p>
                      <strong className="text-slate-800 dark:text-slate-200">{isEn ? 'Parent Name:' : 'Nom parent :'}</strong>{' '}
                      {selectedRequest.parent_name || '—'} ({selectedRequest.parent_relation || 'Parent'})
                    </p>
                    <p>
                      <strong className="text-slate-800 dark:text-slate-200">Email:</strong>{' '}
                      {selectedRequest.parent_email || '—'}
                    </p>
                    <p>
                      <strong className="text-slate-800 dark:text-slate-200">{isEn ? 'Phone:' : 'Tél :'}</strong>{' '}
                      {selectedRequest.parent_phone || '—'}
                    </p>
                    <p>
                      <strong className="text-slate-800 dark:text-slate-200">{isEn ? 'Admission:' : 'Admission :'}</strong>{' '}
                      {selectedRequest.admission_status || '—'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Accommodation Requirements */}
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white mb-3 text-xs uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  {isEn ? 'Accommodation Specifications' : 'Critères de Logement'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">
                      {isEn ? 'Preferred Location' : 'Secteur'}
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {selectedRequest.preferred_location}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">
                      {isEn ? 'Type' : 'Typologie'}
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {selectedRequest.accommodation_type}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">
                      {isEn ? 'Budget' : 'Budget'}
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {selectedRequest.budget}
                    </span>
                  </div>
                </div>

                <div className="mt-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 text-xs">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">
                    {isEn ? 'Dates' : 'Dates du séjour'}
                  </span>
                  <div className="flex items-center gap-4 text-slate-800 dark:text-slate-200">
                    <span>
                      <strong>{isEn ? 'Arrival:' : 'Arrivée :'}</strong> {selectedRequest.arrival_date}
                    </span>
                    <span>
                      <strong>{isEn ? 'Departure:' : 'Départ :'}</strong> {selectedRequest.departure_date || 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="mt-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 text-xs">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">
                    {isEn ? 'Special Requirements' : 'Besoins & Aménagements Spécifiques'}
                  </span>
                  <p className="text-slate-700 dark:text-slate-300">
                    {selectedRequest.special_requirements || 'Standard requirements.'}
                  </p>
                </div>

                {(selectedRequest.supporting_docs || (selectedRequest.attachments && selectedRequest.attachments.length > 0)) && (
                  <div className="mt-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 text-xs">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase block mb-1.5 flex items-center gap-1.5">
                      <Paperclip className="w-3 h-3 text-indigo-500" />
                      {isEn ? 'Supporting Documents & Attachments' : 'Pièces Justificatives & Pièces Jointes'}
                    </span>
                    {selectedRequest.attachments && selectedRequest.attachments.length > 0 ? (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {selectedRequest.attachments.map((att, attIdx) => (
                          <div
                            key={attIdx}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-800 dark:text-slate-200"
                          >
                            <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                            <span className="font-medium">{att.filename}</span>
                            {att.sizeFormatted && (
                              <span className="text-[10px] text-slate-400">({att.sizeFormatted})</span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-700 dark:text-slate-300">{selectedRequest.supporting_docs}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Status History Stream */}
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white mb-3 text-xs uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5" />
                  {isEn ? 'Status & Transmission History' : 'Historique des Actions & Envois'}
                </h3>
                <div className="space-y-2.5">
                  {selectedRequest.history && selectedRequest.history.length > 0 ? (
                    selectedRequest.history.map((hist, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs flex items-start justify-between gap-3"
                      >
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                            <span>{hist.action}</span>
                            {hist.status && (
                              <span className="text-[10px] px-2 py-0.2 rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-mono">
                                {hist.status}
                              </span>
                            )}
                          </div>
                          <p className="text-slate-600 dark:text-slate-400 mt-0.5">{hist.details}</p>
                          <p className="text-[10px] text-slate-400 mt-1">
                            {isEn ? 'By' : 'Par'} {hist.author}
                          </p>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap">
                          {hist.timestamp}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      {isEn ? 'No historical logs recorded.' : 'Aucun historique enregistré.'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex flex-wrap items-center justify-between gap-3">
              <span className="text-[11px] text-slate-400">
                {isEn ? 'Assigned to:' : 'Assigné à :'} <strong>{selectedRequest.assigned_agent}</strong>
              </span>
              <div className="flex items-center gap-2">
                {isAuthorizedToSend && (selectedRequest.status === 'Sent' || selectedRequest.status === 'Pending Partner Response') && (
                  <>
                    <button
                      onClick={() => setShowConfirmGrantedModal(true)}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isEn ? 'Confirm Granted' : 'Confirmer accordée'}</span>
                    </button>
                    <button
                      onClick={() => setShowDeclineModal(true)}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>{isEn ? 'Record Declined' : 'Enregistrer refus'}</span>
                    </button>
                    <button
                      onClick={() => setShowCancelModal(true)}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    >
                      <span>{isEn ? 'Cancel Request' : 'Annuler'}</span>
                    </button>
                    <button
                      onClick={handleRevokeAccess}
                      disabled={isRevoking}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-white hover:bg-rose-600 border border-rose-300 dark:border-rose-800 rounded-lg transition-colors disabled:opacity-50"
                      title={isEn ? 'Immediately revoke partner access to uploaded documents' : 'Révoquer immédiatement l’accès du partenaire aux documents'}
                    >
                      <ShieldOff className="w-3.5 h-3.5" />
                      <span>{isRevoking ? (isEn ? 'Revoking...' : 'Révocation...') : (isEn ? 'Revoke Partner Access' : 'Révoquer l’accès partenaire')}</span>
                    </button>
                  </>
                )}
                {isAuthorizedToSend && selectedRequest.status === 'Draft' && (
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  >
                    <span>{isEn ? 'Cancel Request' : 'Annuler'}</span>
                  </button>
                )}
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  {isEn ? 'Close' : 'Fermer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PARTNER SELECTION & ATTACHMENT MODAL */}
      {showSendConfirmDialog && selectedRequest && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-600 text-white flex items-center justify-center shadow-md">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    {confirmedResend
                      ? isEn
                        ? 'Resend Accommodation Reservation'
                        : 'Réexpédier la Demande de Logement'
                      : isEn
                      ? 'Submit Accommodation Reservation Request'
                      : 'Transmettre la Demande de Logement'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold">{selectedRequest.ref}</span>
                    {' • '}
                    <span>{selectedRequest.student_name}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowSendConfirmDialog(false);
                  setConfirmedResend(false);
                  setSelectedFiles([]);
                  setFileUploadError(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* PARTNER SELECTION SECTION */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  {isEn ? '1. Select Accommodation Partner *' : '1. Choisir le Partenaire Hébergement *'}
                </label>
                <span className="text-[11px] text-slate-400">
                  {isEn ? 'Exclusive recipient' : 'Destinataire exclusif'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ACCOMMODATION_PARTNERS.map((partner) => {
                  const isSelected = selectedPartnerId === partner.id;
                  return (
                    <div
                      key={partner.id}
                      onClick={() => setSelectedPartnerId(partner.id)}
                      className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all relative flex flex-col justify-between ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 shadow-sm ring-2 ring-indigo-500/20'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                            {partner.badge}
                          </span>
                          <h4 className="font-bold text-slate-900 dark:text-white text-sm mt-1.5">
                            {partner.name}
                          </h4>
                        </div>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-600 text-white'
                              : 'border-slate-300 dark:border-slate-600'
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-800 text-[11px]">
                        <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-mono font-semibold">
                          <Mail className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                          <span className="truncate">{partner.email}</span>
                        </div>
                        <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                          {partner.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* STUDENT & SPECIFICATIONS SUMMARY */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                {isEn ? '2. Summary of Student Request' : '2. Synthèse du Dossier'}
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-slate-700 dark:text-slate-300">
                <div>
                  <span className="text-[10px] text-slate-400 block">{isEn ? 'Candidate' : 'Candidat'}</span>
                  <span className="font-semibold text-slate-900 dark:text-white truncate block">
                    {selectedRequest.student_name}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">{isEn ? 'Location' : 'Secteur'}</span>
                  <span className="font-medium truncate block">{selectedRequest.preferred_location}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">{isEn ? 'Arrival Date' : 'Arrivée'}</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400 block">{selectedRequest.arrival_date}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">{isEn ? 'Indicated Budget' : 'Budget'}</span>
                  <span className="font-semibold text-slate-900 dark:text-white block">{selectedRequest.budget}</span>
                </div>
              </div>
            </div>

            {/* FILE ATTACHMENT SECTION */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{isEn ? '3. Supporting Documents (Attachments)' : '3. Pièces Justificatives (Pièces Jointes)'}</span>
                </label>
                <span className="text-[11px] text-slate-400">
                  {selectedFiles.length}/5 {isEn ? 'files' : 'fichiers'}
                </span>
              </div>

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.webp,.docx,.doc"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) handleAddFiles(e.target.files);
                  e.target.value = '';
                }}
              />

              {/* Dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files) handleAddFiles(e.dataTransfer.files);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`p-4 rounded-xl border-2 border-dashed text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/50'
                    : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 bg-slate-50/50 dark:bg-slate-850/50 hover:bg-slate-50'
                }`}
              >
                <Upload className="w-6 h-6 mx-auto text-indigo-500 mb-1.5 opacity-80" />
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {isEn ? 'Click or drag & drop documents here' : 'Cliquez ou glissez-déposez vos pièces ici'}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {isEn
                    ? 'Passport copy, proof of registration, school admission letter, guarantor proof (PDF, JPG, PNG, DOCX — Max 5 MB each)'
                    : 'Passeport, attestation d’inscription, lettre d’admission, garant (PDF, JPG, PNG, DOCX — Max 5 Mo)'}
                </p>
              </div>

              {/* Validation Error Banner */}
              {fileUploadError && (
                <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{fileUploadError}</span>
                </div>
              )}

              {/* Selected Files List */}
              {selectedFiles.length > 0 && (
                <div className="space-y-1.5 mt-2">
                  {selectedFiles.map((file, idx) => {
                    const sizeKb = file.size / 1024;
                    const formatted = sizeKb >= 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${Math.round(sizeKb)} KB`;
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                          <span className="font-medium text-slate-800 dark:text-slate-200 truncate">{file.name}</span>
                          <span className="text-[10px] text-slate-400 flex-shrink-0 font-mono">({formatted})</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFile(idx);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                          title={isEn ? 'Remove attachment' : 'Retirer le document'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* WARNING OR NOTICE */}
            {confirmedResend ? (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <p>
                  {isEn
                    ? 'Warning: This request was already sent previously. Confirming will resend the official request exclusively to the selected partner.'
                    : 'Attention : Cette demande a déjà été envoyée. La confirmation réexpédiera la demande exclusivement au partenaire sélectionné.'}
                </p>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 flex items-start gap-2">
                <Shield className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                <p>
                  {isEn
                    ? `Documents are securely archived in private cloud storage. ${getAccommodationPartnerById(selectedPartnerId)?.name} (${getAccommodationPartnerById(selectedPartnerId)?.email}) will receive temporary 48-hour download links (no raw files are attached to the email).`
                    : `Les documents sont archivés sur un espace cloud privé sécurisé. ${getAccommodationPartnerById(selectedPartnerId)?.name} (${getAccommodationPartnerById(selectedPartnerId)?.email}) recevra des liens de téléchargement valables 48 heures (aucun fichier brut n’est envoyé en pièce jointe).`}
                </p>
              </div>
            )}

            {/* MODAL ACTIONS */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setShowSendConfirmDialog(false);
                  setConfirmedResend(false);
                  setSelectedFiles([]);
                  setFileUploadError(null);
                }}
                disabled={isSending}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors"
              >
                {isEn ? 'Cancel' : 'Annuler'}
              </button>

              <button
                type="button"
                onClick={handleSendEmail}
                disabled={isSending || !selectedPartnerId}
                className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow disabled:opacity-50 transition-colors"
              >
                {isSending ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    {isEn ? 'Sending...' : 'Envoi en cours...'}
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>
                      {confirmedResend
                        ? isEn
                          ? `Confirm Resend to ${getAccommodationPartnerById(selectedPartnerId)?.name}`
                          : `Confirmer la réexpédition à ${getAccommodationPartnerById(selectedPartnerId)?.name}`
                        : isEn
                        ? `Send to ${getAccommodationPartnerById(selectedPartnerId)?.name}`
                        : `Envoyer à ${getAccommodationPartnerById(selectedPartnerId)?.name}`}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE NEW ACCOMMODATION REQUEST MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  {isEn ? 'Initiate Accommodation Reservation' : 'Initier une Demande de Logement'}
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              {/* Linked Student */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isEn ? 'Select Student Record *' : 'Sélectionner l’Étudiant *'}
                </label>
                <select
                  value={newStudentRef}
                  onChange={(e) => setNewStudentRef(e.target.value)}
                  className="w-full py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  {candidats.map((c) => (
                    <option key={c.ref} value={c.ref}>
                      {c.full_name} ({c.ref}) — {c.program || c.country}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  {isEn
                    ? 'Student profile, nationality, contacts, and parent information will be retrieved automatically.'
                    : 'Les coordonnées et le garant seront automatiquement extraits du dossier.'}
                </p>
              </div>

              {/* Location & Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isEn ? 'Preferred Location in Lyon *' : 'Secteur souhaité à Lyon *'}
                  </label>
                  <input
                    type="text"
                    value={newPreferredLocation}
                    onChange={(e) => setNewPreferredLocation(e.target.value)}
                    placeholder="e.g. Lyon 7e (Jean Macé / Guillotière)"
                    className="w-full py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isEn ? 'Accommodation Type *' : 'Type de Logement *'}
                  </label>
                  <select
                    value={newAccommodationType}
                    onChange={(e) => setNewAccommodationType(e.target.value)}
                    className="w-full py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    required
                  >
                    <option value="Studio Meublé (Résidence Étudiante)">
                      Studio Meublé (Résidence Étudiante)
                    </option>
                    <option value="Résidence CROUS / Conventionnée">
                      Résidence CROUS / Conventionnée
                    </option>
                    <option value="Colocation Équipée">Colocation Équipée</option>
                    <option value="Logement chez l'habitant / Famille">
                      Logement chez l'habitant / Famille
                    </option>
                  </select>
                </div>
              </div>

              {/* Arrival & Departure & Budget */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isEn ? 'Intended Arrival *' : 'Date d’arrivée *'}
                  </label>
                  <input
                    type="date"
                    value={newArrivalDate}
                    onChange={(e) => setNewArrivalDate(e.target.value)}
                    className="w-full py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isEn ? 'Expected Departure' : 'Date de fin'}
                  </label>
                  <input
                    type="date"
                    value={newDepartureDate}
                    onChange={(e) => setNewDepartureDate(e.target.value)}
                    className="w-full py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isEn ? 'Budget Range *' : 'Budget mensuel *'}
                  </label>
                  <input
                    type="text"
                    value={newBudget}
                    onChange={(e) => setNewBudget(e.target.value)}
                    placeholder="e.g. 550 € / month"
                    className="w-full py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    required
                  />
                </div>
              </div>

              {/* Special Requirements */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isEn ? 'Special Requirements / Notes' : 'Besoins Spécifiques'}
                </label>
                <textarea
                  rows={2}
                  value={newSpecialRequirements}
                  onChange={(e) => setNewSpecialRequirements(e.target.value)}
                  placeholder="Elevator, high speed wifi, close to transport..."
                  className="w-full py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              {/* Assigned Agent */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isEn ? 'Assigned Agent' : 'Conseiller en charge'}
                </label>
                <input
                  type="text"
                  value={newAssignedAgent}
                  onChange={(e) => setNewAssignedAgent(e.target.value)}
                  className="w-full py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50"
                >
                  {isEn ? 'Cancel' : 'Annuler'}
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow disabled:opacity-50"
                >
                  {isCreating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      {isEn ? 'Saving...' : 'Création...'}
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      {isEn ? 'Create Request' : 'Créer la demande'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM RESERVATION GRANTED MODAL */}
      {showConfirmGrantedModal && selectedRequest && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    {isEn ? 'Confirm Reservation Granted' : 'Confirmer la Réservation Accordée'}
                  </h3>
                  <p className="text-xs text-slate-500">{selectedRequest.ref} • {selectedRequest.student_name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmGrantedModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">{isEn ? 'Student:' : 'Étudiant :'}</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{selectedRequest.student_name} ({selectedRequest.student_ref})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{isEn ? 'Accommodation Partner:' : 'Partenaire Logement :'}</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">{selectedRequest.partner_name || 'Selected Partner'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{isEn ? 'Accommodation Details:' : 'Détails du logement :'}</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedRequest.accommodation_type} • {selectedRequest.preferred_location}</span>
              </div>
              {selectedRequest.email_sent_at && (
                <div className="flex justify-between">
                  <span className="text-slate-500">{isEn ? 'Request Sent Date:' : 'Date d’envoi de la demande :'}</span>
                  <span className="text-slate-600 dark:text-slate-400">{new Date(selectedRequest.email_sent_at).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleConfirmReservationGranted();
              }}
              className="space-y-3.5 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    {isEn ? 'Confirmation Date *' : 'Date de confirmation *'}
                  </label>
                  <input
                    type="date"
                    value={confirmDate}
                    onChange={(e) => setConfirmDate(e.target.value)}
                    required
                    className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    {isEn ? 'Partner Ref / Lease #' : 'Réf. Partenaire / N° Bail'}
                  </label>
                  <input
                    type="text"
                    value={confirmPartnerRef}
                    onChange={(e) => setConfirmPartnerRef(e.target.value)}
                    placeholder="e.g. DAN-2026-STUDIO-14"
                    className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  {isEn ? 'Confirmation Document Name (Optional)' : 'Nom du document justificatif (optionnel)'}
                </label>
                <input
                  type="text"
                  value={confirmDocName}
                  onChange={(e) => setConfirmDocName(e.target.value)}
                  placeholder="e.g. Attestation_Hebergement_Danova_2026.pdf"
                  className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  {isEn ? 'Partner Notes & Observations' : 'Notes et observations du partenaire'}
                </label>
                <textarea
                  rows={2}
                  value={confirmNotes}
                  onChange={(e) => setConfirmNotes(e.target.value)}
                  placeholder={isEn ? 'Studio confirmed. Security deposit and lease agreement received...' : 'Studio confirmé, bail et caution validés par le bailleur...'}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowConfirmGrantedModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-50 cursor-pointer"
                >
                  {isEn ? 'Cancel' : 'Annuler'}
                </button>
                <button
                  type="submit"
                  disabled={isActionSubmitting}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isActionSubmitting ? (isEn ? 'Confirming...' : 'Confirmation...') : (isEn ? 'Confirm Reservation Granted' : 'Confirmer réservation accordée')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD RESERVATION DECLINED MODAL */}
      {showDeclineModal && selectedRequest && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 flex items-center justify-center">
                  <X className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    {isEn ? 'Record Reservation Declined' : 'Enregistrer le Refus du Partenaire'}
                  </h3>
                  <p className="text-xs text-slate-500">{selectedRequest.ref} • {selectedRequest.student_name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDeclineModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleConfirmReservationDeclined();
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  {isEn ? 'Mandatory Decline Reason *' : 'Motif obligatoire du refus *'}
                </label>
                <textarea
                  rows={3}
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder={isEn ? 'e.g. No studios available for requested arrival date, budget insufficient for residence...' : 'ex : Aucun logement disponible pour la période demandée...'}
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowDeclineModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-50 cursor-pointer"
                >
                  {isEn ? 'Cancel' : 'Annuler'}
                </button>
                <button
                  type="submit"
                  disabled={isActionSubmitting}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow cursor-pointer disabled:opacity-50"
                >
                  <span>{isActionSubmitting ? (isEn ? 'Saving...' : 'Enregistrement...') : (isEn ? 'Record Reservation Declined' : 'Enregistrer le refus')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CANCEL RESERVATION MODAL */}
      {showCancelModal && selectedRequest && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
                  <X className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    {isEn ? 'Cancel Accommodation Request' : 'Annuler la Demande de Logement'}
                  </h3>
                  <p className="text-xs text-slate-500">{selectedRequest.ref} • {selectedRequest.student_name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCancelReservation();
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  {isEn ? 'Mandatory Cancellation Reason *' : 'Motif obligatoire d’annulation *'}
                </label>
                <textarea
                  rows={3}
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  placeholder={isEn ? 'e.g. Student secured private accommodation, university residence assigned, procedure aborted...' : 'ex : L’étudiant a trouvé une solution d’hébergement chez un garant...'}
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-50 cursor-pointer"
                >
                  {isEn ? 'Close' : 'Fermer'}
                </button>
                <button
                  type="submit"
                  disabled={isActionSubmitting}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-700 hover:bg-slate-800 rounded-xl shadow cursor-pointer disabled:opacity-50"
                >
                  <span>{isActionSubmitting ? (isEn ? 'Cancelling...' : 'Annulation...') : (isEn ? 'Confirm Cancellation' : 'Confirmer l’annulation')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
