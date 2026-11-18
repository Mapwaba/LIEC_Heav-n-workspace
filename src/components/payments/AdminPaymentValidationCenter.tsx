'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { SecureEvidenceViewer, EvidenceFileItem } from './SecureEvidenceViewer';

interface AdminPaymentValidationCenterProps {
  currentUser: any;
  currentRole: string;
  onNotify?: (msg: string) => void;
  lang?: 'en' | 'fr';
}

export function AdminPaymentValidationCenter({
  currentUser,
  currentRole,
  onNotify,
  lang = 'en',
}: AdminPaymentValidationCenterProps) {
  const isEn = lang === 'en';

  // Check if current user is Main Admin
  const isMainAdminUser = useMemo(() => {
    const email = (currentUser?.email || '').toLowerCase().trim();
    const isAdminEmail =
      email === 'bmapwabantoro@liecconsulting.com' ||
      email === 'admin@liecconsulting.com' ||
      email === 'admin@liec-education.com';
    const profile = currentUser?.business_profile || '';
    const role = currentRole || currentUser?.role || '';
    return isAdminEmail && (profile === 'Admin' || role === 'admin');
  }, [currentUser, currentRole]);

  // Submissions state
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected submission for detail view
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);
  const [submissionHistory, setSubmissionHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // Active evidence file for secure viewing
  const [activeEvidenceFile, setActiveEvidenceFile] = useState<EvidenceFileItem | null>(null);

  // Action modal states
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [showRequestEvidenceModal, setShowRequestEvidenceModal] = useState<boolean>(false);
  const [decisionReason, setDecisionReason] = useState<string>('');
  const [actionInProgress, setActionInProgress] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Fetch submissions from API
  const fetchSubmissions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/payments/submissions');
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      const list = Array.isArray(data.submissions) ? data.submissions : [];
      setSubmissions(list);

      // Refresh selected submission if currently open
      if (selectedSubmission) {
        const updated = list.find((s: any) => s.id === selectedSubmission.id);
        if (updated) setSelectedSubmission(updated);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch payment submissions');
    } finally {
      setLoading(false);
    }
  }, [selectedSubmission]);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  // Fetch submission history when selected
  useEffect(() => {
    if (!selectedSubmission?.id) {
      setSubmissionHistory([]);
      return;
    }

    let isMounted = true;
    async function loadHistory() {
      try {
        setLoadingHistory(true);
        const res = await fetch(`/api/payments/submissions/${selectedSubmission.id}/history`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setSubmissionHistory(data.history || []);
          }
        }
      } catch (e) {
        console.error('Failed to load history:', e);
      } finally {
        if (isMounted) setLoadingHistory(false);
      }
    }

    loadHistory();
    return () => {
      isMounted = false;
    };
  }, [selectedSubmission?.id]);

  // Filtered submissions
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((s) => {
      const matchStatus =
        filterStatus === 'ALL' ||
        (filterStatus === 'PENDING' && (s.status === 'PENDING_ADMIN_VALIDATION' || s.status === 'ADDITIONAL_EVIDENCE_REQUESTED')) ||
        s.status === filterStatus;

      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        s.applicant_name?.toLowerCase().includes(q) ||
        s.entity_ref?.toLowerCase().includes(q) ||
        s.submission_ref?.toLowerCase().includes(q) ||
        s.rawbank_slip_number?.includes(q);

      return matchStatus && matchSearch;
    });
  }, [submissions, filterStatus, searchQuery]);

  // Execute Decision (APPROVE, REJECT, REQUEST_ADDITIONAL_EVIDENCE)
  const handleDecision = async (
    action: 'APPROVE' | 'REJECT' | 'REQUEST_ADDITIONAL_EVIDENCE',
    reason?: string
  ) => {
    if (!selectedSubmission) return;
    try {
      setActionInProgress(true);
      setActionError(null);

      const res = await fetch(`/api/payments/submissions/${selectedSubmission.id}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          decision_reason: reason || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      // Close modals
      setShowRejectModal(false);
      setShowRequestEvidenceModal(false);
      setDecisionReason('');

      // Notify user
      if (action === 'APPROVE') {
        const msg = isEn ? 'Payment validated by the Admin' : 'Paiement validé par l’Administrateur';
        if (onNotify) onNotify(msg);
      } else if (action === 'REJECT') {
        if (onNotify) onNotify(isEn ? 'Payment submission rejected.' : 'Soumission de paiement rejetée.');
      } else {
        if (onNotify) onNotify(isEn ? 'Additional evidence requested.' : 'Justificatifs complémentaires demandés.');
      }

      await fetchSubmissions();
    } catch (err: any) {
      setActionError(err.message || 'Action failed');
    } finally {
      setActionInProgress(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'VALIDATED':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800">
            {isEn ? 'VALIDATED' : 'VALIDÉ'}
          </span>
        );
      case 'PENDING_ADMIN_VALIDATION':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-950/60 text-amber-300 border border-amber-800 animate-pulse">
            {isEn ? 'PENDING VALIDATION' : 'EN ATTENTE VALIDATION'}
          </span>
        );
      case 'ADDITIONAL_EVIDENCE_REQUESTED':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-orange-950/60 text-orange-300 border border-orange-800">
            {isEn ? 'EVIDENCE REQUESTED' : 'JUSTIFICATIFS REQUIS'}
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-950/60 text-rose-300 border border-rose-800">
            {isEn ? 'REJECTED' : 'REJETÉ'}
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-700/80 p-5 rounded-2xl shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-indigo-600/20 text-indigo-400 rounded-xl">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <span>{isEn ? 'Main Admin Validation Centre' : 'Centre de Validation Administrateur'}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-800 font-mono">
                W3 Centralized
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isEn
                ? 'Mandatory review and authoritative decisioning for banking evidence across all payment channels'
                : 'Examen obligatoire et décision faisant foi sur les justificatifs de paiement tous canaux'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchSubmissions}
            disabled={loading}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center space-x-1.5"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{isEn ? 'Refresh Queue' : 'Actualiser'}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center space-x-1 overflow-x-auto text-xs">
          {[
            { id: 'ALL', label: isEn ? 'All Submissions' : 'Toutes les soumissions' },
            { id: 'PENDING', label: isEn ? 'Pending Review' : 'En attente' },
            { id: 'VALIDATED', label: isEn ? 'Validated' : 'Validés' },
            { id: 'ADDITIONAL_EVIDENCE_REQUESTED', label: isEn ? 'Evidence Requested' : 'Justificatifs requis' },
            { id: 'REJECTED', label: isEn ? 'Rejected' : 'Rejetés' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                filterStatus === tab.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="w-full md:w-72">
          <input
            type="text"
            placeholder={isEn ? 'Search applicant, ref, or slip #...' : 'Rechercher candidat, réf, bordereau...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Main Content Layout: Queue List on Left, Detail / Viewer on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Submissions Queue */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {isEn ? `Validation Queue (${filteredSubmissions.length})` : `File d’attente (${filteredSubmissions.length})`}
            </span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500 bg-slate-900 rounded-xl border border-slate-800">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              {isEn ? 'Loading submissions queue...' : 'Chargement de la file...'}
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 bg-slate-900 rounded-xl border border-slate-800">
              {isEn ? 'No payment submissions found matching criteria.' : 'Aucune soumission ne correspond aux critères.'}
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[700px] overflow-y-auto pr-1">
              {filteredSubmissions.map((sub) => {
                const isSelected = selectedSubmission?.id === sub.id;
                const isRawbank = sub.payment_method?.toLowerCase().includes('rawbank');

                return (
                  <div
                    key={sub.id}
                    onClick={() => {
                      setSelectedSubmission(sub);
                      setActiveEvidenceFile(null);
                    }}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-slate-800/90 border-indigo-500 ring-1 ring-indigo-500 shadow-lg'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-white">{sub.applicant_name}</span>
                          <span className="text-[10px] font-mono text-slate-400">{sub.entity_ref}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {isEn ? 'Instalment' : 'Tranche'} {sub.instalment_number} • {sub.payment_method}
                        </p>
                      </div>
                      <div>{getStatusBadge(sub.status)}</div>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-sm font-black text-indigo-400">
                          €{Number(sub.amount).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {sub.currency}
                        </span>
                        {isRawbank && sub.rawbank_slip_number && (
                          <span className="ml-2 text-[10px] font-mono text-amber-400 bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-800/40">
                            Slip #{sub.rawbank_slip_number}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {sub.created_at ? new Date(sub.created_at).toLocaleDateString() : ''}
                      </span>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                      <span>{isEn ? 'By:' : 'Par :'} {sub.created_by_name || sub.created_by_email || 'Staff'}</span>
                      <span>{sub.evidence_count ?? (sub.evidence_files?.length || 0)} {isEn ? 'file(s)' : 'pièce(s)'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Selected Submission Detail & Review Console */}
        <div className="lg:col-span-7">
          {!selectedSubmission ? (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center p-8 bg-slate-900 rounded-2xl border border-slate-800 text-center">
              <svg className="w-12 h-12 text-slate-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-sm font-semibold text-slate-300">
                {isEn ? 'No Submission Selected' : 'Aucune soumission sélectionnée'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                {isEn
                  ? 'Select a payment submission from the queue to inspect banking evidence, review authoritative balances, and render an administrative validation decision.'
                  : 'Sélectionnez une soumission pour examiner les pièces justificatives et rendre une décision.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Submission Header Card */}
              <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-bold text-white">{selectedSubmission.applicant_name}</h3>
                      <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                        {selectedSubmission.entity_ref}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">
                      Ref: {selectedSubmission.submission_ref}
                    </p>
                  </div>
                  <div>{getStatusBadge(selectedSubmission.status)}</div>
                </div>

                {/* Amount and Key Details Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-slate-800/50 rounded-xl border border-slate-700/60 text-xs">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-medium">{isEn ? 'Amount' : 'Montant'}</p>
                    <p className="text-sm font-black text-indigo-400 mt-0.5">
                      €{Number(selectedSubmission.amount).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-medium">{isEn ? 'Instalment' : 'Tranche'}</p>
                    <p className="text-sm font-bold text-white mt-0.5">#{selectedSubmission.instalment_number}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-medium">{isEn ? 'Payment Date' : 'Date de Paiement'}</p>
                    <p className="text-xs font-semibold text-slate-200 mt-0.5">{selectedSubmission.payment_date || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-medium">{isEn ? 'Method' : 'Méthode'}</p>
                    <p className="text-xs font-semibold text-slate-200 mt-0.5 truncate">{selectedSubmission.payment_method}</p>
                  </div>
                </div>

                {/* Rawbank Coordinates or Transaction Ref */}
                {selectedSubmission.rawbank_slip_number ? (
                  <div className="p-3 bg-amber-950/20 border border-amber-800/40 rounded-xl text-xs flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-amber-400 font-semibold uppercase">{isEn ? 'Rawbank Coordinates:' : 'Coordonnées Rawbank :'}</span>
                      <span className="ml-2 font-mono font-bold text-white">
                        Bordereau #{selectedSubmission.rawbank_slip_number} • Op #{selectedSubmission.rawbank_operation_code || '000'}
                      </span>
                    </div>
                    <span className="text-[10px] text-amber-400/80">Leading Zeros Preserved</span>
                  </div>
                ) : selectedSubmission.transaction_reference ? (
                  <div className="p-3 bg-slate-800/40 border border-slate-700 rounded-xl text-xs">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">{isEn ? 'Transaction Ref:' : 'Réf Transaction :'}</span>
                    <span className="ml-2 font-mono text-white">{selectedSubmission.transaction_reference}</span>
                  </div>
                ) : null}

                {/* Submitter Notes or Rejection Reasons */}
                {selectedSubmission.notes && (
                  <div className="text-xs text-slate-300 bg-slate-800/30 p-2.5 rounded-lg border border-slate-800">
                    <span className="font-semibold text-slate-400">{isEn ? 'Submitter Note:' : 'Note Soumissionnaire :'}</span> {selectedSubmission.notes}
                  </div>
                )}
                {selectedSubmission.decision_reason && (
                  <div className="text-xs text-rose-300 bg-rose-950/30 p-2.5 rounded-lg border border-rose-900/40">
                    <span className="font-semibold">{isEn ? 'Decision Reason / Notice:' : 'Motif de Décision :'}</span> {selectedSubmission.decision_reason}
                  </div>
                )}

                {/* Action Buttons (Visible for Pending or Additional Evidence Requested) */}
                {selectedSubmission.status === 'PENDING_ADMIN_VALIDATION' && (
                  <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDecision('APPROVE')}
                      disabled={actionInProgress}
                      className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center space-x-1.5 shadow-md"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{isEn ? 'Approve Payment' : 'Valider le Paiement'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowRequestEvidenceModal(true)}
                      disabled={actionInProgress}
                      className="px-3.5 py-2 text-xs font-medium rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors"
                    >
                      {isEn ? 'Request Additional Evidence' : 'Demander Justificatif Complémentaire'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowRejectModal(true)}
                      disabled={actionInProgress}
                      className="px-3.5 py-2 text-xs font-medium rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-colors"
                    >
                      {isEn ? 'Reject Payment' : 'Rejeter'}
                    </button>
                  </div>
                )}

                {actionError && (
                  <p className="text-xs text-rose-400 p-2 bg-rose-950/40 rounded border border-rose-800">
                    {actionError}
                  </p>
                )}
              </div>

              {/* Evidence Documents List & Viewer */}
              <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
                    <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    <span>
                      {isEn
                        ? `Attached Evidence Files (${selectedSubmission.evidence_files?.length || 0})`
                        : `Pièces Justificatives (${selectedSubmission.evidence_files?.length || 0})`}
                    </span>
                  </h4>
                </div>

                {(!selectedSubmission.evidence_files || selectedSubmission.evidence_files.length === 0) ? (
                  <div className="text-xs text-slate-500 py-3 text-center">
                    {isEn ? 'No evidence documents attached to this submission.' : 'Aucun justificatif joint à cette soumission.'}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {selectedSubmission.evidence_files.map((file: any) => {
                      const isViewing = activeEvidenceFile?.id === file.id;

                      return (
                        <div
                          key={file.id}
                          onClick={() => setActiveEvidenceFile(file)}
                          className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs ${
                            isViewing
                              ? 'bg-indigo-950/40 border-indigo-500 ring-1 ring-indigo-500 text-white'
                              : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-600 hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center space-x-2 truncate">
                            <span className="p-1 rounded bg-slate-900 text-slate-400 text-[10px] font-mono">
                              {file.mime_type?.includes('pdf') ? 'PDF' : 'IMG'}
                            </span>
                            <span className="truncate font-medium">{file.file_name}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 flex-shrink-0">
                            {(file.file_size_bytes / (1024 * 1024)).toFixed(2)} MB
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Embedded Secure Evidence Viewer */}
                {activeEvidenceFile && (
                  <div className="mt-4 pt-4 border-t border-slate-800">
                    <SecureEvidenceViewer
                      evidence={activeEvidenceFile}
                      submissionId={selectedSubmission.id}
                      onClose={() => setActiveEvidenceFile(null)}
                      lang={lang}
                    />
                  </div>
                )}
              </div>

              {/* Immutable Decision Audit Trail */}
              <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-xl space-y-3">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{isEn ? 'Financial Decision History (Immutable)' : 'Historique des Décisions (Immuable)'}</span>
                </h4>

                {loadingHistory ? (
                  <p className="text-xs text-slate-500 py-2">{isEn ? 'Loading audit trail...' : 'Chargement de l’historique...'}</p>
                ) : submissionHistory.length === 0 ? (
                  <p className="text-xs text-slate-500 py-2">{isEn ? 'No previous decision events recorded.' : 'Aucun événement précédent.'}</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {submissionHistory.map((evt: any, idx: number) => (
                      <div key={evt.id || idx} className="p-2.5 bg-slate-800/40 border border-slate-800 rounded-lg text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-white">{evt.event_type}</span>
                          <span className="text-[10px] text-slate-500">
                            {evt.created_at ? new Date(evt.created_at).toLocaleString() : ''}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          {isEn ? 'Actor:' : 'Acteur :'} {evt.actor_name || evt.actor_email} ({evt.actor_role})
                        </p>
                        {evt.decision_reason && (
                          <p className="text-[11px] text-amber-300/90 italic">
                            &quot;{evt.decision_reason}&quot;
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">{isEn ? 'Reject Payment Submission' : 'Rejeter la Soumission de Paiement'}</h3>
            <p className="text-xs text-slate-400">
              {isEn
                ? 'Please specify a mandatory rejection reason. This will be permanently recorded in the immutable audit log and communicated to the submitter.'
                : 'Veuillez saisir un motif de rejet obligatoire.'}
            </p>
            <textarea
              rows={3}
              value={decisionReason}
              onChange={(e) => setDecisionReason(e.target.value)}
              placeholder={isEn ? 'Enter rejection reason (mandatory)...' : 'Saisir le motif du rejet (obligatoire)...'}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-rose-500"
            />
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                {isEn ? 'Cancel' : 'Annuler'}
              </button>
              <button
                type="button"
                disabled={!decisionReason.trim() || actionInProgress}
                onClick={() => handleDecision('REJECT', decisionReason)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50"
              >
                {isEn ? 'Confirm Rejection' : 'Confirmer le Rejet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request Additional Evidence Modal */}
      {showRequestEvidenceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">
              {isEn ? 'Request Additional Evidence' : 'Demander un Justificatif Complémentaire'}
            </h3>
            <p className="text-xs text-slate-400">
              {isEn
                ? 'Provide instructions detailing what additional proof is required from the submitter or candidate.'
                : 'Indiquez les instructions précisant les pièces requises.'}
            </p>
            <textarea
              rows={3}
              value={decisionReason}
              onChange={(e) => setDecisionReason(e.target.value)}
              placeholder={isEn ? 'Enter instructions for additional evidence (mandatory)...' : 'Saisir les instructions (obligatoire)...'}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
            />
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRequestEvidenceModal(false)}
                className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                {isEn ? 'Cancel' : 'Annuler'}
              </button>
              <button
                type="button"
                disabled={!decisionReason.trim() || actionInProgress}
                onClick={() => handleDecision('REQUEST_ADDITIONAL_EVIDENCE', decisionReason)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50"
              >
                {isEn ? 'Send Evidence Request' : 'Envoyer la Demande'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
