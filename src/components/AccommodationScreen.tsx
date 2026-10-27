'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import { Lang } from './ServicesAndOtherScreens';

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

  // Send Confirmation Dialog State
  const [showSendConfirmDialog, setShowSendConfirmDialog] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [confirmedResend, setConfirmedResend] = useState(false);

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
  const [newAssignedAgent, setNewAssignedAgent] = useState(currentUser?.name || 'Sarah Mwamba');
  const [newNotes, setNewNotes] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Status Tone Helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Sent':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
          dot: 'bg-emerald-500',
          label: isEn ? 'Dispatched (Sent)' : 'Envoyé au partenaire',
        };
      case 'Partner Confirmed':
      case 'Reserved':
        return {
          bg: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-400 dark:border-teal-800',
          dot: 'bg-teal-500',
          label: isEn ? 'Partner Confirmed' : 'Confirmé partenaire',
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
          bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
          dot: 'bg-amber-500',
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
          'x-user-email': currentUser?.email || 'sarah.mwamba@liec-education.com',
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
    if (!selectedRequest) return;
    setIsSending(true);

    try {
      const res = await fetch('/api/accommodation/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': currentUser?.email || 'sarah.mwamba@liec-education.com',
        },
        body: JSON.stringify({
          ref: selectedRequest.ref,
          confirmed_resend: confirmedResend,
        }),
      });

      const data = await res.json();

      if (res.status === 409 && data.requiresConfirmation) {
        // Needs explicit resend confirmation
        setConfirmedResend(true);
        onNotify('Previous submission detected. Please confirm to resend.');
        setIsSending(false);
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send partner email');
      }

      onNotify(`Official accommodation request sent to partner (${data.recipient})!`);
      setShowSendConfirmDialog(false);
      setShowDetailModal(false);
      setConfirmedResend(false);
      await onRefresh();
    } catch (err: any) {
      onNotify(`Error sending request: ${err.message}`);
    } finally {
      setIsSending(false);
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
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {req.assigned_agent}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          {isAuthorizedToSend && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedRequest(req);
                                setConfirmedResend(req.status === 'Sent');
                                setShowSendConfirmDialog(true);
                              }}
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
                {isAuthorizedToSend && (
                  <button
                    onClick={() => {
                      setConfirmedResend(selectedRequest.status === 'Sent');
                      setShowSendConfirmDialog(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
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
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Email Delivery Banner if Sent or Failed */}
              {selectedRequest.email_sent_at && (
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">
                      {isEn ? 'Official Partner Email Dispatched' : 'Email partenaire expédié avec succès'}
                    </p>
                    <p className="text-[11px] opacity-90">
                      {isEn ? 'Delivered to' : 'Envoyé à'} <strong>{selectedRequest.email_recipient}</strong> {isEn ? 'on' : 'le'} {selectedRequest.email_sent_at} {isEn ? 'by' : 'par'} {selectedRequest.email_sent_by}.
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

                {selectedRequest.supporting_docs && (
                  <div className="mt-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 text-xs">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">
                      {isEn ? 'Supporting Documents' : 'Pièces Justificatives'}
                    </span>
                    <p className="text-slate-700 dark:text-slate-300">{selectedRequest.supporting_docs}</p>
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
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                {isEn ? 'Assigned to:' : 'Assigné à :'} <strong>{selectedRequest.assigned_agent}</strong>
              </span>
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50"
              >
                {isEn ? 'Close' : 'Fermer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SEND CONFIRMATION MODAL */}
      {showSendConfirmDialog && selectedRequest && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  {confirmedResend
                    ? isEn
                      ? 'Confirm Resending Request Email'
                      : 'Confirmer la réexpédition'
                    : isEn
                    ? 'Confirm Accommodation Request Email'
                    : 'Confirmer l’envoi au partenaire'}
                </h3>
                <p className="text-xs text-slate-500 font-mono">{selectedRequest.ref}</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
              <p>
                <strong className="text-slate-800 dark:text-slate-200">{isEn ? 'Recipient:' : 'Destinataire :'}</strong>{' '}
                <span className="text-indigo-600 dark:text-indigo-400 font-mono">
                  housing-partner@liecconsulting.com
                </span>
              </p>
              <p>
                <strong className="text-slate-800 dark:text-slate-200">{isEn ? 'Applicant:' : 'Candidat :'}</strong>{' '}
                {selectedRequest.student_name} ({selectedRequest.student_ref})
              </p>
              <p>
                <strong className="text-slate-800 dark:text-slate-200">{isEn ? 'Location:' : 'Lieu :'}</strong>{' '}
                {selectedRequest.preferred_location}
              </p>
              <p>
                <strong className="text-slate-800 dark:text-slate-200">{isEn ? 'Budget:' : 'Budget :'}</strong>{' '}
                {selectedRequest.budget}
              </p>
              <p>
                <strong className="text-slate-800 dark:text-slate-200">{isEn ? 'Arrival Date:' : 'Date d’arrivée :'}</strong>{' '}
                {selectedRequest.arrival_date}
              </p>
            </div>

            {confirmedResend && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <p>
                  {isEn
                    ? 'Warning: This request was already sent previously. Clicking confirm will trigger an official email resend.'
                    : 'Attention : Cette demande a déjà été envoyée. La confirmation entraînera une réexpédition par email.'}
                </p>
              </div>
            )}

            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {isEn
                ? 'The partner email will be securely dispatched using the official LIEC template with complete student and accommodation specifications.'
                : 'L’email sera généré et expédié via le modèle officiel LIEC avec les pièces et critères du dossier.'}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setShowSendConfirmDialog(false);
                  setConfirmedResend(false);
                }}
                disabled={isSending}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50"
              >
                {isEn ? 'Cancel' : 'Annuler'}
              </button>

              <button
                type="button"
                onClick={handleSendEmail}
                disabled={isSending}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow disabled:opacity-50 transition-colors"
              >
                {isSending ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    {isEn ? 'Sending...' : 'Envoi en cours...'}
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    {confirmedResend
                      ? isEn
                        ? 'Confirm Resend'
                        : 'Confirmer la réexpédition'
                      : isEn
                      ? 'Confirm & Send Email'
                      : 'Confirmer & Envoyer'}
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
    </div>
  );
}
