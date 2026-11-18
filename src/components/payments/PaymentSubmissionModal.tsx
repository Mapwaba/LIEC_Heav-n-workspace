'use client';

import React, { useState, useEffect, useMemo } from 'react';

interface ApplicantOption {
  entity_type: string;
  entity_ref: string;
  name: string;
  email?: string;
  program?: string;
}

interface PaymentSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentUser: any;
  currentRole: string;
  applicantsList?: ApplicantOption[];
  preselectedApplicant?: ApplicantOption | null;
  lang?: 'en' | 'fr';
}

export function PaymentSubmissionModal({
  isOpen,
  onClose,
  onSuccess,
  currentUser,
  currentRole,
  applicantsList = [],
  preselectedApplicant = null,
  lang = 'en',
}: PaymentSubmissionModalProps) {
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

  // Step state: 1 = Form & Upload, 2 = Review & Confirm
  const [step, setStep] = useState<1 | 2>(1);

  // Applicant Selection & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedApplicant, setSelectedApplicant] = useState<ApplicantOption | null>(preselectedApplicant);

  // Real-time Balance Data from server
  const [balanceData, setBalanceData] = useState<any>(null);
  const [loadingBalance, setLoadingBalance] = useState<boolean>(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  // Form Fields
  const [instalmentNumber, setInstalmentNumber] = useState<1 | 2>(1);
  const [paymentMethod, setPaymentMethod] = useState<string>('Rawbank Deposit');
  const [rawbankSlipNumber, setRawbankSlipNumber] = useState<string>('');
  const [rawbankOperationCode, setRawbankOperationCode] = useState<string>('');
  const [otherMethodDetails, setOtherMethodDetails] = useState<string>('');
  const [transactionReference, setTransactionReference] = useState<string>('');
  const [amount, setAmount] = useState<string>('1800');
  const [currency, setCurrency] = useState<string>('EUR');
  const [paymentDate, setPaymentDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState<string>('');
  const [isDirectAdminEntry, setIsDirectAdminEntry] = useState<boolean>(false);

  // Evidence Files
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Submission State
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string>('');

  // Synchronize preselected applicant
  useEffect(() => {
    if (preselectedApplicant) {
      setSelectedApplicant(preselectedApplicant);
    }
  }, [preselectedApplicant]);

  // Filtered applicants
  const filteredApplicants = useMemo(() => {
    if (!searchQuery.trim()) return applicantsList.slice(0, 15);
    const q = searchQuery.toLowerCase().trim();
    return applicantsList.filter(
      (a) =>
        a.name?.toLowerCase().includes(q) ||
        a.entity_ref?.toLowerCase().includes(q) ||
        a.email?.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [applicantsList, searchQuery]);

  // Fetch real-time balances whenever selected applicant changes
  useEffect(() => {
    if (!selectedApplicant?.entity_ref) {
      setBalanceData(null);
      return;
    }

    let isMounted = true;
    async function fetchBalances() {
      try {
        setLoadingBalance(true);
        setBalanceError(null);
        const params = new URLSearchParams({
          entity_type: selectedApplicant?.entity_type || 'DEMANDE',
          entity_ref: selectedApplicant?.entity_ref || '',
          applicant_name: selectedApplicant?.name || '',
          applicant_email: selectedApplicant?.email || '',
        });

        const res = await fetch(`/api/payments/balances?${params.toString()}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `HTTP ${res.status}`);
        }
        const data = await res.json();
        if (isMounted) {
          setBalanceData(data);
          // Suggest recommended instalment amount based on remaining balance
          if (data.instalments) {
            const inst1 = data.instalments.find((i: any) => i.instalment_number === 1);
            const inst2 = data.instalments.find((i: any) => i.instalment_number === 2);
            if (inst1 && inst1.remaining_balance > 0) {
              setInstalmentNumber(1);
              setAmount(String(inst1.remaining_balance));
            } else if (inst2 && inst2.remaining_balance > 0) {
              setInstalmentNumber(2);
              setAmount(String(inst2.remaining_balance));
            }
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setBalanceError(err.message || 'Failed to load real-time financial balance.');
        }
      } finally {
        if (isMounted) {
          setLoadingBalance(false);
        }
      }
    }

    fetchBalances();
    return () => {
      isMounted = false;
    };
  }, [selectedApplicant]);

  // Handle instalment switch
  const handleInstalmentChange = (num: 1 | 2) => {
    setInstalmentNumber(num);
    if (balanceData?.instalments) {
      const match = balanceData.instalments.find((i: any) => i.instalment_number === num);
      if (match) {
        setAmount(String(match.remaining_balance > 0 ? match.remaining_balance : match.expected_amount));
      }
    } else {
      setAmount(num === 1 ? '1800' : '1000');
    }
  };

  // Handle Evidence File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    if (!e.target.files) return;

    const newFiles = Array.from(e.target.files);
    const validExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
    const maxSizeBytes = 10 * 1024 * 1024;

    const validated: File[] = [];

    for (const f of newFiles) {
      const ext = '.' + f.name.split('.').pop()?.toLowerCase();
      if (!validExtensions.includes(ext)) {
        setUploadError(
          isEn
            ? `File "${f.name}" has invalid extension. Only PDF, JPG, JPEG, and PNG are allowed.`
            : `Le fichier "${f.name}" a une extension invalide (.pdf, .jpg, .jpeg, .png autorisés).`
        );
        return;
      }
      if (f.size > maxSizeBytes) {
        setUploadError(
          isEn
            ? `File "${f.name}" exceeds 10 MB limit (${(f.size / (1024 * 1024)).toFixed(2)} MB).`
            : `Le fichier "${f.name}" dépasse la limite de 10 Mo (${(f.size / (1024 * 1024)).toFixed(2)} Mo).`
        );
        return;
      }

      // Check duplicate
      const isDuplicate = evidenceFiles.some(
        (existing) => existing.name === f.name && existing.size === f.size
      );
      if (!isDuplicate) {
        validated.push(f);
      }
    }

    setEvidenceFiles((prev) => [...prev, ...validated]);
  };

  const removeEvidenceFile = (index: number) => {
    setEvidenceFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Validation before proceeding to Review step
  const handleProceedToReview = () => {
    setSubmitError(null);
    if (!selectedApplicant) {
      setSubmitError(isEn ? 'Please select an applicant.' : 'Veuillez sélectionner un candidat.');
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setSubmitError(isEn ? 'Please enter a valid positive amount.' : 'Veuillez saisir un montant valide.');
      return;
    }
    if (paymentMethod === 'Rawbank Deposit') {
      const slip = rawbankSlipNumber.trim();
      const op = rawbankOperationCode.trim();
      if (!/^\d{6}$/.test(slip)) {
        setSubmitError(
          isEn
            ? 'Rawbank Deposit Slip must be exactly 6 digits (e.g. 001234).'
            : 'Le bordereau Rawbank doit comporter exactement 6 chiffres (ex. 001234).'
        );
        return;
      }
      if (!/^\d{3}$/.test(op)) {
        setSubmitError(
          isEn
            ? 'Rawbank Operation Code must be exactly 3 digits (e.g. 042).'
            : 'Le code opération Rawbank doit comporter exactement 3 chiffres (ex. 042).'
        );
        return;
      }
    } else {
      if (!transactionReference.trim()) {
        setSubmitError(
          isEn
            ? 'Transaction reference or proof identifier is mandatory for alternative methods.'
            : 'La référence de transaction ou identifiant de preuve est obligatoire.'
        );
        return;
      }
    }

    if (evidenceFiles.length === 0) {
      setSubmitError(
        isEn
          ? 'At least one evidence document (PDF, JPG, PNG) must be attached.'
          : 'Au moins un justificatif (PDF, JPG, PNG) doit être joint.'
      );
      return;
    }

    setStep(2);
  };

  // Execute Submission
  const handleFinalSubmit = async () => {
    if (!selectedApplicant) return;
    try {
      setSubmitting(true);
      setSubmitError(null);
      setUploadProgress(isEn ? 'Creating payment submission record...' : 'Création de la soumission...');

      // 1. Create Payment Submission
      const payload: any = {
        entity_type: selectedApplicant.entity_type || 'DEMANDE',
        entity_ref: selectedApplicant.entity_ref,
        applicant_name: selectedApplicant.name,
        applicant_email: selectedApplicant.email || '',
        instalment_number: instalmentNumber,
        amount: parseFloat(amount),
        currency,
        payment_date: paymentDate,
        payment_method: paymentMethod,
        notes,
      };

      if (paymentMethod === 'Rawbank Deposit') {
        payload.rawbank_slip_number = rawbankSlipNumber.trim();
        payload.rawbank_operation_code = rawbankOperationCode.trim();
      } else {
        payload.other_method_details = otherMethodDetails.trim() || paymentMethod;
        payload.transaction_reference = transactionReference.trim();
      }

      if (isMainAdminUser && isDirectAdminEntry) {
        payload.is_direct_admin_entry = true;
      }

      const res = await fetch('/api/payments/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to create submission (HTTP ${res.status})`);
      }

      const submissionData = await res.json();
      const submissionId = submissionData.submission?.id || submissionData.id;

      // 2. Upload Evidence Files sequentially
      for (let i = 0; i < evidenceFiles.length; i++) {
        const file = evidenceFiles[i];
        setUploadProgress(
          isEn
            ? `Uploading evidence file ${i + 1} of ${evidenceFiles.length} (${file.name})...`
            : `Téléversement du fichier ${i + 1}/${evidenceFiles.length} (${file.name})...`
        );

        const formData = new FormData();
        formData.append('file', file);
        formData.append('submission_id', String(submissionId));

        const uploadRes = await fetch(`/api/payments/submissions/${submissionId}/evidence`, {
          method: 'POST',
          body: formData,
        });

        if (!uploadRes.ok) {
          const upErr = await uploadRes.json().catch(() => ({}));
          throw new Error(
            upErr.error || `Failed to upload evidence file "${file.name}" (HTTP ${uploadRes.status})`
          );
        }
      }

      // 3. Finalize and Submit for Admin Validation
      setUploadProgress(isEn ? 'Finalizing submission...' : 'Finalisation de la soumission...');
      const submitRes = await fetch(`/api/payments/submissions/${submissionId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!submitRes.ok) {
        const subErr = await submitRes.json().catch(() => ({}));
        throw new Error(subErr.error || `Failed to submit for validation (HTTP ${submitRes.status})`);
      }

      // Done
      onSuccess();
      onClose();
    } catch (err: any) {
      setSubmitError(err.message || 'Submission error');
    } finally {
      setSubmitting(false);
      setUploadProgress('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-800/90 border-b border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-600/20 text-indigo-400 rounded-xl">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {isEn ? 'Record Payment Evidence' : 'Enregistrer un Justificatif de Paiement'}
              </h3>
              <p className="text-xs text-slate-400">
                {isEn
                  ? 'Submit payment details and official banking proof for Main Admin validation'
                  : 'Soumettre les détails et preuves bancaires pour validation Admin'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
          {submitError && (
            <div className="p-3.5 bg-rose-950/50 border border-rose-800/70 rounded-xl text-xs text-rose-300 flex items-start space-x-2">
              <svg className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{submitError}</span>
            </div>
          )}

          {step === 1 ? (
            <>
              {/* SECTION 1: APPLICANT SELECTION */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  {isEn ? '1. Select Applicant' : '1. Sélectionner le Candidat'}
                </label>

                {!selectedApplicant ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder={isEn ? 'Search applicant by name, reference, or email...' : 'Rechercher par nom, réf ou email...'}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                    <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-700 divide-y divide-slate-800">
                      {filteredApplicants.length === 0 ? (
                        <div className="p-3 text-xs text-slate-500 text-center">
                          {isEn ? 'No applicants found' : 'Aucun candidat trouvé'}
                        </div>
                      ) : (
                        filteredApplicants.map((app) => (
                          <div
                            key={`${app.entity_type}-${app.entity_ref}`}
                            onClick={() => setSelectedApplicant(app)}
                            className="p-2.5 hover:bg-slate-800 cursor-pointer flex items-center justify-between transition-colors"
                          >
                            <div>
                              <p className="text-xs font-semibold text-white">{app.name}</p>
                              <p className="text-[11px] text-slate-400">
                                {app.entity_ref} • {app.email || 'No email'}
                              </p>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                              {app.entity_type}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-800/80 border border-slate-700 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-white">{selectedApplicant.name}</p>
                      <p className="text-xs text-slate-400">
                        {selectedApplicant.entity_ref} • {selectedApplicant.email || 'No email'}
                        {selectedApplicant.program && ` • ${selectedApplicant.program}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedApplicant(null)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 underline"
                    >
                      {isEn ? 'Change' : 'Modifier'}
                    </button>
                  </div>
                )}
              </div>

              {/* SECTION 2: REAL-TIME FINANCIAL BALANCE PRESENTATION */}
              {selectedApplicant && (
                <div className="p-4 bg-slate-800/50 border border-slate-700/80 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider flex items-center">
                      <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      {isEn ? 'Authoritative Financial Ledger (Live)' : 'Grand Livre Financier Faisant Foi (Direct)'}
                    </span>
                    {loadingBalance && (
                      <span className="text-[11px] text-slate-400 animate-pulse">
                        {isEn ? 'Querying database...' : 'Interrogation de la base...'}
                      </span>
                    )}
                  </div>

                  {balanceError && (
                    <div className="text-xs text-rose-400 p-2 bg-rose-950/40 rounded border border-rose-900">
                      {balanceError}
                    </div>
                  )}

                  {balanceData && (
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-700">
                        <p className="text-[10px] text-slate-400 uppercase font-medium">
                          {isEn ? 'Total Course Fee' : 'Frais de Formation'}
                        </p>
                        <p className="text-base font-bold text-white mt-0.5">
                          €{Number(balanceData.course_balance?.total_course_fee || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                          Source: {balanceData.fee_resolution?.source}
                        </p>
                      </div>

                      <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-700">
                        <p className="text-[10px] text-slate-400 uppercase font-medium">
                          {isEn ? 'Validated Paid' : 'Total Validé Encaissé'}
                        </p>
                        <p className="text-base font-bold text-emerald-400 mt-0.5">
                          €{Number(balanceData.course_balance?.total_validated_amount || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {balanceData.submissions_summary?.validated_count || 0} {isEn ? 'validated payment(s)' : 'paiement(s) validé(s)'}
                        </p>
                      </div>

                      <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-700">
                        <p className="text-[10px] text-slate-400 uppercase font-medium">
                          {isEn ? 'Outstanding Balance' : 'Solde Restant Dû'}
                        </p>
                        <p className="text-base font-bold text-amber-400 mt-0.5">
                          €{Number(balanceData.course_balance?.outstanding_course_balance || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {balanceData.course_balance?.is_fully_paid ? (isEn ? 'Fully settled' : 'Soldé') : (isEn ? 'Payment due' : 'Reste à payer')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 3: INSTALMENT & PAYMENT DETAILS */}
              <div className="space-y-4">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  {isEn ? '2. Payment Particulars' : '2. Détails du Paiement'}
                </label>

                {/* Instalment Selection */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleInstalmentChange(1)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      instalmentNumber === 1
                        ? 'border-indigo-500 bg-indigo-950/30 ring-1 ring-indigo-500 text-white'
                        : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase">{isEn ? 'Instalment 1' : 'Tranche 1'}</span>
                      <span className="text-xs font-semibold text-indigo-400">€1,800.00</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {isEn ? 'Course Enrollment & Pathway setup (64.29%)' : 'Inscription PREPA & Campus France (64,29%)'}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleInstalmentChange(2)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      instalmentNumber === 2
                        ? 'border-indigo-500 bg-indigo-950/30 ring-1 ring-indigo-500 text-white'
                        : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase">{isEn ? 'Instalment 2' : 'Tranche 2'}</span>
                      <span className="text-xs font-semibold text-indigo-400">€1,000.00</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {isEn ? 'Final Balance before consular departure (35.71%)' : 'Solde final avant départ consulaire (35,71%)'}
                    </p>
                  </button>
                </div>

                {/* Payment Method Selector */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      {isEn ? 'Payment Channel / Method' : 'Canal / Méthode de Paiement'}
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Rawbank Deposit">{isEn ? 'Rawbank Deposit (Official Channel)' : 'Dépôt Rawbank (Canal Officiel)'}</option>
                      <option value="Bank Wire">{isEn ? 'Bank Wire / Virement' : 'Virement Bancaire'}</option>
                      <option value="Cash Desk">{isEn ? 'Cash Deposit at Desk' : 'Espèces au Guichet'}</option>
                      <option value="Cheque">{isEn ? 'Bank Cheque' : 'Chèque de Banque'}</option>
                      <option value="Mobile Money">{isEn ? 'Mobile Money (M-Pesa / Airtel)' : 'Mobile Money'}</option>
                      <option value="Other">{isEn ? 'Other Alternative Method' : 'Autre Méthode Alternative'}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      {isEn ? 'Payment Date' : 'Date de Paiement'}
                    </label>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Method Specific Fields */}
                {paymentMethod === 'Rawbank Deposit' ? (
                  <div className="p-4 bg-slate-800/40 border border-slate-700 rounded-xl space-y-3">
                    <div className="flex items-center space-x-2 text-xs font-semibold text-amber-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{isEn ? 'Rawbank Banking Transaction Coordinates' : 'Coordonnées Bancaires Rawbank'}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          {isEn ? 'Deposit Slip Number (6 Digits)' : 'N° Bordereau de Versement (6 Chiffres)'}
                        </label>
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="e.g. 001234"
                          value={rawbankSlipNumber}
                          onChange={(e) => setRawbankSlipNumber(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                        />
                        <p className="text-[10px] text-slate-500 mt-1">
                          {isEn ? 'Preserves leading zeros (e.g. 001234)' : 'Préserve les zéros initiaux (ex. 001234)'}
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          {isEn ? 'Operation Code (3 Digits)' : 'Code Opération (3 Chiffres)'}
                        </label>
                        <input
                          type="text"
                          maxLength={3}
                          placeholder="e.g. 042"
                          value={rawbankOperationCode}
                          onChange={(e) => setRawbankOperationCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                        />
                        <p className="text-[10px] text-slate-500 mt-1">
                          {isEn ? 'Preserves leading zeros (e.g. 042)' : 'Préserve les zéros initiaux (ex. 042)'}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-800/40 border border-slate-700 rounded-xl space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          {isEn ? 'Transaction Reference / Code' : 'Référence / Code Transaction'}
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. VIR-2026-99210 or MPESA-9938"
                          value={transactionReference}
                          onChange={(e) => setTransactionReference(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          {isEn ? 'Method Details / Channel Description' : 'Précisions sur la Méthode'}
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Ecobank DRC or Cash desk Kinshasa"
                          value={otherMethodDetails}
                          onChange={(e) => setOtherMethodDetails(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Amount and Currency */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      {isEn ? 'Amount' : 'Montant'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm font-semibold text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      {isEn ? 'Currency' : 'Devise'}
                    </label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="EUR">EUR (€)</option>
                      <option value="USD">USD ($)</option>
                      <option value="CDF">CDF (FC)</option>
                    </select>
                  </div>
                </div>

                {/* Submitter Notes */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {isEn ? 'Internal Notes / Observations' : 'Notes Internes / Observations'}
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={isEn ? 'Additional observations for the validator...' : 'Observations complémentaires pour le valideur...'}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* SECTION 4: MULTI-FILE EVIDENCE UPLOAD */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  {isEn ? '3. Attach Evidence Documents' : '3. Joindre les Justificatifs'}
                </label>

                <div className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-xl p-4 text-center bg-slate-800/30 transition-colors">
                  <input
                    type="file"
                    id="evidence-file-input"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="evidence-file-input" className="cursor-pointer block">
                    <svg className="w-8 h-8 mx-auto text-slate-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-xs font-medium text-indigo-400 hover:text-indigo-300">
                      {isEn ? 'Click to browse or drop banking proof documents' : 'Cliquez pour parcourir ou déposez vos justificatifs'}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {isEn ? 'Supported: PDF, JPG, JPEG, PNG (Max 10 MB per file)' : 'Formats acceptés : PDF, JPG, JPEG, PNG (Max 10 Mo par fichier)'}
                    </p>
                  </label>
                </div>

                {uploadError && (
                  <p className="text-xs text-rose-400">{uploadError}</p>
                )}

                {/* Evidence File List */}
                {evidenceFiles.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase">
                      {isEn ? `Selected Documents (${evidenceFiles.length})` : `Documents Sélectionnés (${evidenceFiles.length})`}
                    </p>
                    <div className="divide-y divide-slate-800 border border-slate-700 rounded-lg overflow-hidden bg-slate-900/60">
                      {evidenceFiles.map((file, idx) => (
                        <div key={`${file.name}-${idx}`} className="p-2.5 flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-2 truncate">
                            <span className="p-1.5 rounded bg-slate-800 text-slate-300">
                              {file.name.endsWith('.pdf') ? 'PDF' : 'IMG'}
                            </span>
                            <span className="text-slate-200 truncate font-medium">{file.name}</span>
                            <span className="text-slate-500 text-[10px]">({(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeEvidenceFile(idx)}
                            className="text-slate-400 hover:text-rose-400 transition-colors p-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 5: MAIN ADMIN DIRECT VALIDATION OPTION */}
              {isMainAdminUser && (
                <div className="p-4 bg-emerald-950/30 border border-emerald-700/50 rounded-xl space-y-2">
                  <label className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isDirectAdminEntry}
                      onChange={(e) => setIsDirectAdminEntry(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-slate-700 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <p className="text-xs font-bold text-emerald-300">
                        {isEn ? 'Direct Main Admin Validation' : 'Validation Directe par l’Admin Principal'}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {isEn
                          ? 'As canonical Main Admin, you may validate this payment directly upon submission without passing through the pending review queue. This action is permanently recorded as DIRECT_VALIDATION in the immutable financial audit log.'
                          : 'En tant qu’Admin Principal canonique, vous pouvez valider ce paiement directement lors de la soumission sans file d’attente. L’action est consignée de manière permanente en tant que DIRECT_VALIDATION.'}
                      </p>
                    </div>
                  </label>
                </div>
              )}
            </>
          ) : (
            /* STEP 2: REVIEW & CONFIRMATION */
            <div className="space-y-6">
              <div className="p-4 bg-indigo-950/30 border border-indigo-800/40 rounded-xl text-center">
                <p className="text-xs text-indigo-300 font-semibold uppercase tracking-wider">
                  {isEn ? 'Summary of Payment Submission' : 'Récapitulatif de la Soumission'}
                </p>
                <p className="text-2xl font-black text-white mt-1">
                  €{parseFloat(amount).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {currency}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isEn ? `Instalment ${instalmentNumber} for ` : `Tranche ${instalmentNumber} pour `}
                  <span className="font-semibold text-white">{selectedApplicant?.name}</span> ({selectedApplicant?.entity_ref})
                </p>
              </div>

              <div className="space-y-3 bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-700">
                  <span className="text-slate-400">{isEn ? 'Payment Channel:' : 'Canal de Paiement :'}</span>
                  <span className="font-semibold text-white">{paymentMethod}</span>
                </div>

                {paymentMethod === 'Rawbank Deposit' ? (
                  <>
                    <div className="flex justify-between py-1 border-b border-slate-700">
                      <span className="text-slate-400">{isEn ? 'Rawbank Slip Number:' : 'N° Bordereau Rawbank :'}</span>
                      <span className="font-mono font-bold text-amber-400">{rawbankSlipNumber}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-700">
                      <span className="text-slate-400">{isEn ? 'Rawbank Operation Code:' : 'Code Opération Rawbank :'}</span>
                      <span className="font-mono font-bold text-amber-400">{rawbankOperationCode}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between py-1 border-b border-slate-700">
                      <span className="text-slate-400">{isEn ? 'Transaction Reference:' : 'Référence Transaction :'}</span>
                      <span className="font-mono text-white">{transactionReference}</span>
                    </div>
                    {otherMethodDetails && (
                      <div className="flex justify-between py-1 border-b border-slate-700">
                        <span className="text-slate-400">{isEn ? 'Method Details:' : 'Précisions :'}</span>
                        <span className="text-white">{otherMethodDetails}</span>
                      </div>
                    )}
                  </>
                )}

                <div className="flex justify-between py-1 border-b border-slate-700">
                  <span className="text-slate-400">{isEn ? 'Payment Date:' : 'Date du Paiement :'}</span>
                  <span className="text-white">{paymentDate}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-700">
                  <span className="text-slate-400">{isEn ? 'Attached Evidence Files:' : 'Justificatifs joints :'}</span>
                  <span className="font-semibold text-indigo-400">{evidenceFiles.length} {isEn ? 'document(s)' : 'document(s)'}</span>
                </div>

                <div className="flex justify-between py-1">
                  <span className="text-slate-400">{isEn ? 'Validation Queue:' : 'Statut après Soumission :'}</span>
                  <span className={`font-semibold ${isDirectAdminEntry ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {isDirectAdminEntry ? (isEn ? 'IMMEDIATE DIRECT VALIDATION' : 'VALIDATION DIRECTE IMMÉDIATE') : (isEn ? 'AWAITING MAIN ADMIN VALIDATION' : 'EN ATTENTE VALIDATION ADMIN')}
                  </span>
                </div>
              </div>

              {submitting && (
                <div className="p-3 bg-slate-800 rounded-lg text-center space-y-2">
                  <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-indigo-300 font-medium">{uploadProgress}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-800/90 border-t border-slate-700">
          {step === 1 ? (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
              >
                {isEn ? 'Cancel' : 'Annuler'}
              </button>

              <button
                type="button"
                onClick={handleProceedToReview}
                className="px-5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
              >
                {isEn ? 'Review Submission' : 'Vérifier la Soumission'}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={submitting}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
              >
                {isEn ? 'Back to Edit' : 'Modifier'}
              </button>

              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={submitting}
                className={`px-5 py-2 text-xs font-semibold rounded-lg text-white transition-colors flex items-center space-x-2 ${
                  isDirectAdminEntry
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                <span>
                  {isDirectAdminEntry
                    ? (isEn ? 'Confirm & Validate Directly' : 'Confirmer & Valider Directement')
                    : (isEn ? 'Submit for Admin Validation' : 'Soumettre pour Validation Admin')}
                </span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
