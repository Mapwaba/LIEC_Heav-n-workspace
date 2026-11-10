'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  X,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Download,
  Users,
  ShieldCheck,
  Check,
  Eye,
  SlidersHorizontal,
  History,
  FileSpreadsheet,
} from 'lucide-react';
import { Lang } from './ServicesAndOtherScreens';

interface UserImportSetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEn: boolean;
  currentUser: any;
  onSuccess: () => void;
}

export function UserImportSetsModal({
  isOpen,
  onClose,
  isEn,
  currentUser,
  onSuccess,
}: UserImportSetsModalProps) {
  const [activeTab, setActiveTab] = useState<'workflow' | 'history'>('workflow');
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // File loading state
  const [fileName, setFileName] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [usePastedText, setUsePastedText] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  // Multi-worksheet Excel state
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [retryingRowId, setRetryingRowId] = useState<number | null>(null);

  // Staging & Transform state
  const [importSet, setImportSet] = useState<any | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [transformMap, setTransformMap] = useState<Record<string, string>>({});
  const [validationSummary, setValidationSummary] = useState<any | null>(null);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [sendWelcomeEmails, setSendWelcomeEmails] = useState(false);

  // Execution summary state
  const [executionSummary, setExecutionSummary] = useState<any | null>(null);
  const [showConfirmExecute, setShowConfirmExecute] = useState(false);

  // History state
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setFileName('');
      setFileContent('');
      setPastedText('');
      setUsePastedText(false);
      setFeedbackError(null);
      setAvailableSheets([]);
      setSelectedSheet('');
      setImportSet(null);
      setHeaders([]);
      setTransformMap({});
      setValidationSummary(null);
      setExecutionSummary(null);
      setShowConfirmExecute(false);
    }
  }, [isOpen]);

  // Fetch import history
  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const activeEmail = currentUser?.email || 'bmapwabantoro@liecconsulting.com';
      const res = await fetch('/api/users/import-sets', {
        headers: { 'x-user-email': activeEmail },
      });
      if (res.ok) {
        const data = await res.json();
        setHistoryList(data.importSets || []);
      }
    } catch (e: any) {
      console.warn('Failed to fetch import sets history:', e);
    } finally {
      setLoadingHistory(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab, fetchHistory]);

  if (!isOpen) return null;

  // Handle file drop / selection (supports genuine .xlsx, .csv, .tsv, .txt)
  const handleFileChosen = (file: File) => {
    setFileName(file.name);
    setFeedbackError(null);
    setAvailableSheets([]);
    setSelectedSheet('');

    // Server-enforced size limit check: 5 MB
    if (file.size > 5 * 1024 * 1024) {
      setFeedbackError(isEn ? 'File size exceeds maximum 5 MB limit.' : 'Le fichier dépasse la limite de 5 Mo.');
      return;
    }

    const isXlsx = file.name.toLowerCase().endsWith('.xlsx');
    const reader = new FileReader();

    reader.onload = async (e) => {
      const result = e.target?.result;
      if (isXlsx) {
        const dataUrl = result as string;
        setFileContent(dataUrl);

        // Pre-fetch worksheets if Excel file
        try {
          const activeEmail = currentUser?.email || 'bmapwabantoro@liecconsulting.com';
          const res = await fetch('/api/users/import-sets', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-email': activeEmail,
            },
            body: JSON.stringify({
              action: 'sheets',
              fileName: file.name,
              rawContent: dataUrl,
            }),
          });
          const data = await res.json();
          if (res.ok && data.sheets?.length) {
            setAvailableSheets(data.sheets);
            setSelectedSheet(data.selectedSheet || data.sheets[0]);
          }
        } catch (err) {
          console.warn('Notice: Could not pre-fetch sheets:', err);
        }
      } else {
        const text = (result as string) || '';
        setFileContent(text);
      }
    };

    reader.onerror = () => {
      setFeedbackError(isEn ? 'Failed to read uploaded file.' : 'Échec de la lecture du fichier.');
    };

    if (isXlsx) {
      reader.readAsDataURL(file);
    } else {
      reader.readAsText(file);
    }
  };

  // Step 1: Load Data into Staging
  const handleLoadData = async () => {
    const content = usePastedText ? pastedText : fileContent;
    const name = usePastedText ? 'pasted_users.csv' : fileName;

    if (!content || !content.trim()) {
      setFeedbackError(
        isEn ? 'Please choose a spreadsheet file or paste data.' : 'Veuillez choisir un fichier tableur ou coller des données.'
      );
      return;
    }

    setLoading(true);
    setFeedbackError(null);

    try {
      const activeEmail = currentUser?.email || 'bmapwabantoro@liecconsulting.com';
      const res = await fetch('/api/users/import-sets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': activeEmail,
        },
        body: JSON.stringify({
          action: 'load',
          fileName: name || 'users_import.csv',
          fileSize: content.length,
          rawContent: content,
          sheetName: selectedSheet || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load import set into staging.');
      }

      setImportSet(data.importSet);
      setHeaders(data.headers || []);
      setTransformMap(data.defaultTransformMap || {});
      setValidationSummary(data.validationSummary);
      setStep(2); // Advance to Transform Map
    } catch (err: any) {
      setFeedbackError(err.message || 'Error loading data.');
    } finally {
      setLoading(false);
    }
  };

  // Retry email delivery for a staging row
  const handleRetryEmail = async (stagingRowId: number) => {
    setRetryingRowId(stagingRowId);
    try {
      const activeEmail = currentUser?.email || 'bmapwabantoro@liecconsulting.com';
      const res = await fetch('/api/users/import-sets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': activeEmail,
        },
        body: JSON.stringify({
          action: 'retry_email',
          stagingRowId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Email retry failed');

      setExecutionSummary((prev: any) => {
        if (!prev) return prev;
        const updatedDetails = (prev.details || []).map((d: any) => {
          if (d.stagingRowId === stagingRowId) {
            return { ...d, emailStatus: 'SENT', emailSent: true, emailError: null };
          }
          return d;
        });
        return { ...prev, details: updatedDetails };
      });
      alert(isEn ? 'Welcome email resent successfully!' : 'Email de bienvenue renvoyé avec succès !');
    } catch (err: any) {
      alert(err.message || 'Retry failed');
    } finally {
      setRetryingRowId(null);
    }
  };

  // Step 2: Validate with Transform Map
  const handleValidateMap = async () => {
    if (!importSet?.id) return;
    setLoading(true);
    setFeedbackError(null);

    try {
      const activeEmail = currentUser?.email || 'bmapwabantoro@liecconsulting.com';
      const res = await fetch('/api/users/import-sets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': activeEmail,
        },
        body: JSON.stringify({
          action: 'validate',
          importSetId: importSet.id,
          transformMap,
          updateExisting,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to validate staging records.');
      }

      setValidationSummary(data.validationSummary);
      setStep(3); // Advance to Staging Preview
    } catch (err: any) {
      setFeedbackError(err.message || 'Validation error.');
    } finally {
      setLoading(false);
    }
  };

  // Toggle Row Exclude in Step 3
  const handleToggleExclude = async (rowId: number, currentExcluded: boolean) => {
    try {
      const activeEmail = currentUser?.email || 'bmapwabantoro@liecconsulting.com';
      const res = await fetch('/api/users/import-sets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': activeEmail,
        },
        body: JSON.stringify({
          action: 'toggle_exclude',
          rowId,
          isExcluded: !currentExcluded,
        }),
      });

      if (res.ok) {
        // Update local state
        setValidationSummary((prev: any) => {
          if (!prev) return prev;
          const updatedRows = prev.rows.map((r: any) => {
            if (r.id === rowId) {
              return { ...r, isExcluded: !currentExcluded };
            }
            return r;
          });
          const validCount = updatedRows.filter((r: any) => r.validationStatus === 'VALID' && !r.isExcluded).length;
          return {
            ...prev,
            validRows: validCount,
            rows: updatedRows,
          };
        });
      }
    } catch (e) {
      console.warn('Failed to toggle exclude:', e);
    }
  };

  // Step 3 -> 4: Execute Transform
  const handleExecuteTransform = async () => {
    if (!importSet?.id) return;
    setLoading(true);
    setFeedbackError(null);
    setShowConfirmExecute(false);

    try {
      const activeEmail = currentUser?.email || 'bmapwabantoro@liecconsulting.com';
      const res = await fetch('/api/users/import-sets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': activeEmail,
        },
        body: JSON.stringify({
          action: 'execute',
          importSetId: importSet.id,
          updateExisting,
          sendWelcomeEmails,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Transform execution failed.');
      }

      setExecutionSummary(data.summary);
      setStep(4); // Advance to Summary
      onSuccess(); // Refresh parent user list
    } catch (err: any) {
      setFeedbackError(err.message || 'Transform execution error.');
    } finally {
      setLoading(false);
    }
  };

  // Download Results CSV
  const handleDownloadResults = async (setId?: number) => {
    const targetId = setId || importSet?.id;
    if (!targetId) return;

    try {
      const activeEmail = currentUser?.email || 'bmapwabantoro@liecconsulting.com';
      const res = await fetch('/api/users/import-sets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': activeEmail,
        },
        body: JSON.stringify({
          action: 'download_results',
          importSetId: targetId,
        }),
      });

      if (!res.ok) throw new Error('Failed to download results.');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `import_set_${targetId}_results.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e.message || 'Download failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-scaleUp text-xs text-[#092342]">
        {/* HEADER */}
        <div className="px-6 py-4.5 bg-[#092342] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-teal-300">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-extrabold tracking-tight">
                  {isEn ? 'Import Users — ServiceNow Import Sets' : 'Importer des Utilisateurs — ServiceNow Import Sets'}
                </h2>
                {importSet?.set_number && (
                  <span className="px-2 py-0.5 rounded-full font-mono text-[10px] bg-teal-500/20 text-teal-200 border border-teal-400/30 font-bold">
                    {importSet.set_number}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-300">
                {isEn
                  ? 'Staged bulk account provisioning with Transform Maps & shared security rules.'
                  : 'Création en masse par zone de transit (Staging), Transform Maps et règles de sécurité partagées.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-white/10 rounded-xl p-1 flex items-center gap-1">
              <button
                onClick={() => setActiveTab('workflow')}
                className={`px-3 py-1 rounded-lg text-[11px] font-extrabold transition ${
                  activeTab === 'workflow' ? 'bg-white text-[#092342]' : 'text-slate-300 hover:text-white'
                }`}
              >
                {isEn ? 'Import Workflow' : 'Processus d’Import'}
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1 rounded-lg text-[11px] font-extrabold transition flex items-center gap-1.5 ${
                  activeTab === 'history' ? 'bg-white text-[#092342]' : 'text-slate-300 hover:text-white'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>{isEn ? 'History' : 'Historique'}</span>
              </button>
            </div>

            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* FEEDBACK ERROR BANNER */}
        {feedbackError && (
          <div className="px-6 py-2.5 bg-rose-50 border-b border-rose-200 text-rose-700 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 font-bold">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{feedbackError}</span>
            </div>
            <button onClick={() => setFeedbackError(null)} className="text-rose-500 hover:text-rose-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'history' ? (
            /* TAB: IMPORT SETS HISTORY */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-extrabold text-[#092342]">
                    {isEn ? 'Import Sets Execution History' : 'Historique d’exécution des Import Sets'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {isEn
                      ? 'Audit trail of past bulk user imports and downloadable result sets.'
                      : 'Journal d’audit des imports utilisateurs passés et rapports téléchargeables.'}
                  </p>
                </div>
                <button
                  onClick={fetchHistory}
                  disabled={loadingHistory}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 font-bold flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
                  <span>{isEn ? 'Refresh' : 'Actualiser'}</span>
                </button>
              </div>

              {historyList.length === 0 ? (
                <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                  <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold text-slate-500 text-xs">
                    {isEn ? 'No previous import sets recorded.' : 'Aucun Import Set précédent enregistré.'}
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase text-slate-500">
                        <th className="py-2.5 px-3">{isEn ? 'Import Set #' : 'N° Import Set'}</th>
                        <th className="py-2.5 px-3">{isEn ? 'File Name' : 'Nom de fichier'}</th>
                        <th className="py-2.5 px-3">{isEn ? 'Status' : 'Statut'}</th>
                        <th className="py-2.5 px-3 text-center">{isEn ? 'Total Staged' : 'Total Transité'}</th>
                        <th className="py-2.5 px-3 text-center">{isEn ? 'Created' : 'Créés'}</th>
                        <th className="py-2.5 px-3 text-center">{isEn ? 'Skipped' : 'Ignorés'}</th>
                        <th className="py-2.5 px-3">{isEn ? 'Executed By' : 'Exécuté par'}</th>
                        <th className="py-2.5 px-3 text-right">{isEn ? 'Action' : 'Action'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {historyList.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-2.5 px-3 font-mono font-extrabold text-[#0c685a]">{item.set_number}</td>
                          <td className="py-2.5 px-3 font-medium text-slate-700">{item.file_name}</td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9.5px] font-extrabold ${
                                item.status === 'COMPLETED'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-slate-700">{item.total_rows}</td>
                          <td className="py-2.5 px-3 text-center font-bold text-emerald-600">{item.created_rows}</td>
                          <td className="py-2.5 px-3 text-center font-bold text-slate-500">{item.skipped_rows}</td>
                          <td className="py-2.5 px-3 text-slate-600">{item.executed_by || item.created_by}</td>
                          <td className="py-2.5 px-3 text-right">
                            {item.status === 'COMPLETED' && (
                              <button
                                onClick={() => handleDownloadResults(item.id)}
                                className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-white text-[11px] font-bold text-[#0c685a] inline-flex items-center gap-1 shadow-2xs"
                              >
                                <Download className="w-3 h-3" />
                                <span>{isEn ? 'Results CSV' : 'Résultats CSV'}</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            /* TAB: 4-STEP WORKFLOW */
            <>
              {/* STEP PROGRESS BAR */}
              <div className="grid grid-cols-4 gap-2 pb-2 border-b border-slate-100">
                {[
                  { num: 1, labelEn: '1. Load Data', labelFr: '1. Charger Données' },
                  { num: 2, labelEn: '2. Transform Map', labelFr: '2. Mapper Colonnes' },
                  { num: 3, labelEn: '3. Staging Preview', labelFr: '3. Prévisualisation' },
                  { num: 4, labelEn: '4. Results Summary', labelFr: '4. Rapport Final' },
                ].map((s) => {
                  const isActive = step === s.num;
                  const isDone = step > s.num;
                  return (
                    <div
                      key={s.num}
                      className={`p-2.5 rounded-xl border text-center transition ${
                        isActive
                          ? 'border-[#0c685a] bg-teal-50/60 text-[#092342] font-extrabold shadow-2xs'
                          : isDone
                          ? 'border-emerald-200 bg-emerald-50/40 text-emerald-800 font-bold'
                          : 'border-slate-100 bg-slate-50/60 text-slate-400 font-medium'
                      }`}
                    >
                      <div className="text-[11px] flex items-center justify-center gap-1.5">
                        {isDone ? <Check className="w-3 h-3 text-emerald-600" /> : null}
                        <span>{isEn ? s.labelEn : s.labelFr}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* STEP 1: LOAD DATA */}
              {step === 1 && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="font-extrabold text-amber-900 text-xs">
                        {isEn ? 'ServiceNow Import Set Staging Guarantee' : 'Garantie Staging ServiceNow'}
                      </div>
                      <p className="text-[11.5px] text-amber-800 leading-relaxed">
                        {isEn
                          ? 'Uploading or pasting spreadsheet records only loads them into a secure staging area. NO user accounts or credentials will be generated until you review the Transform Map, inspect validation results, and explicitly confirm execution in Step 4.'
                          : 'Le chargement de la feuille de calcul enregistre uniquement les lignes dans une zone de transit sécurisée (Staging). AUCUN compte utilisateur n’est créé avant la revue du Transform Map et votre confirmation explicite à l’étape 4.'}
                      </p>
                    </div>
                  </div>

                  {/* Mode Selector */}
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                    <button
                      type="button"
                      onClick={() => setUsePastedText(false)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition ${
                        !usePastedText ? 'bg-[#092342] text-white' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {isEn ? 'Upload Spreadsheet (CSV / Excel export)' : 'Uploader un fichier (CSV / Export Excel)'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setUsePastedText(true)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition ${
                        usePastedText ? 'bg-[#092342] text-white' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {isEn ? 'Paste CSV / Tab-Delimited Text' : 'Coller du texte CSV / Délimité'}
                    </button>
                  </div>

                  {!usePastedText ? (
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                      }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) handleFileChosen(file);
                      }}
                      className={`border-2 border-dashed rounded-2xl p-8 text-center transition ${
                        isDragging
                          ? 'border-[#0c685a] bg-teal-50/50'
                          : 'border-slate-200 hover:border-slate-300 bg-slate-50/30'
                      }`}
                    >
                      <input
                        type="file"
                        id="import-file-input"
                        accept=".xlsx,.csv,.txt,.tsv"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileChosen(file);
                        }}
                        className="hidden"
                      />
                      <label htmlFor="import-file-input" className="cursor-pointer space-y-3 block">
                        <div className="w-12 h-12 rounded-2xl bg-teal-50 text-[#0c685a] flex items-center justify-center mx-auto shadow-2xs">
                          <Upload className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-extrabold text-sm text-[#092342]">
                            {fileName || (isEn ? 'Click or drag spreadsheet file here (.xlsx, .csv, .tsv)' : 'Cliquez ou glissez votre fichier ici (.xlsx, .csv, .tsv)')}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-1">
                            {isEn
                              ? 'Supports genuine Excel workbooks (.xlsx), CSV (comma or semicolon), and tab-delimited files'
                              : 'Supporte les classeurs Excel (.xlsx), CSV (virgule ou point-virgule) et tabulations'}
                          </p>
                        </div>
                        {fileName && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#d8f6ea] text-[#0c685a]">
                            {fileName} ({Math.round(fileContent.length / 1024)} KB)
                          </span>
                        )}
                      </label>
                    </div>
                  ) : (
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        {isEn ? 'Paste CSV text with column headers:' : 'Collez le texte CSV avec les en-têtes de colonnes :'}
                      </label>
                      <textarea
                        rows={7}
                        value={pastedText}
                        onChange={(e) => setPastedText(e.target.value)}
                        placeholder={`Prénom,Nom,Email,Profil,Titre\nJean,Mbuyi,j.mbuyi@liecconsulting.com,Secretary,Conseiller Senior\nSarah,Mukendi,s.mukendi@liecconsulting.com,Finance Officer,Chargée Financement`}
                        className="w-full font-mono text-xs rounded-xl border border-slate-200 p-3 focus:outline-none focus:ring-2 focus:ring-[#0c685a]/20"
                      />
                    </div>
                  )}

                  {/* Multi-Worksheet Selector if Excel file has multiple sheets */}
                  {availableSheets.length > 1 && (
                    <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-3.5 space-y-1.5 animate-fadeIn">
                      <label className="font-bold text-[#092342] text-[11px] block">
                        {isEn ? 'Select Worksheet to Import:' : 'Choisir la feuille de calcul à importer :'}
                      </label>
                      <select
                        value={selectedSheet}
                        onChange={(e) => setSelectedSheet(e.target.value)}
                        className="w-full rounded-xl border border-teal-300 bg-white p-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0c685a]/20"
                      >
                        {availableSheets.map((sh) => (
                          <option key={sh} value={sh}>
                            {sh}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Sample Format Helper */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-[11px] text-slate-600">
                    <span className="font-extrabold text-[#092342]">
                      {isEn ? 'Recommended Spreadsheet Columns:' : 'Colonnes recommandées dans le tableur :'}
                    </span>
                    <span className="ml-1.5 font-mono text-slate-700">
                      Prénom, Nom, Email (@liecconsulting.com), Profil Métier, Titre / Fonction
                    </span>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      disabled={loading || (!fileContent && !pastedText)}
                      onClick={handleLoadData}
                      className="px-5 py-2.5 rounded-xl bg-[#0c685a] hover:bg-[#094e45] disabled:bg-slate-300 text-white font-extrabold flex items-center gap-2 shadow-xs transition"
                    >
                      {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                      <span>{isEn ? 'Load Data into Staging' : 'Charger dans la zone de transit'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: TRANSFORM MAP */}
              {step === 2 && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    <div>
                      <div className="font-extrabold text-xs text-[#092342] flex items-center gap-2">
                        <span>{isEn ? 'ServiceNow Transform Map Configuration' : 'Configuration Transform Map (Mapping Colonnes)'}</span>
                        <span className="font-mono text-[10px] bg-teal-100 text-[#0c685a] px-2 py-0.5 rounded-full font-bold">
                          {importSet?.total_rows} {isEn ? 'records staged' : 'lignes transitées'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {isEn
                          ? 'Map the columns detected in your uploaded spreadsheet to LIEC Heav’n user target fields.'
                          : 'Associez les colonnes détectées dans votre fichier aux champs cibles de LIEC Heav’n.'}
                      </p>
                    </div>
                  </div>

                  {/* Mapping Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 border border-slate-200 rounded-2xl p-4 bg-white shadow-2xs">
                    {[
                      { key: 'first_name', labelEn: 'First Name *', labelFr: 'Prénom *', required: true },
                      { key: 'last_name', labelEn: 'Last Name *', labelFr: 'Nom *', required: true },
                      { key: 'email', labelEn: 'Professional Email * (@liecconsulting.com)', labelFr: 'Email Professionnel * (@liecconsulting.com)', required: true },
                      { key: 'business_profile', labelEn: 'Business Profile (Secretary/Finance/Admin)', labelFr: 'Profil Métier (Secretary/Finance/Admin)', required: false },
                      { key: 'title', labelEn: 'Job Title / Function', labelFr: 'Titre / Fonction', required: false },
                      { key: 'technical_roles', labelEn: 'Technical Roles (Comma-separated)', labelFr: 'Rôles Techniques (Séparés par virgule)', required: false },
                      { key: 'user_id', labelEn: 'Custom User ID (Default: auto-generated)', labelFr: 'Identifiant spécifique (Défaut: auto-généré)', required: false },
                    ].map((field) => (
                      <div key={field.key} className="space-y-1">
                        <label className="font-bold text-slate-700 block text-[11px]">
                          {isEn ? field.labelEn : field.labelFr}
                        </label>
                        <select
                          value={transformMap[field.key] || ''}
                          onChange={(e) => {
                            setTransformMap({ ...transformMap, [field.key]: e.target.value });
                          }}
                          className={`w-full rounded-xl border p-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0c685a]/20 ${
                            transformMap[field.key]
                              ? 'border-teal-300 bg-teal-50/30 text-[#092342]'
                              : field.required
                              ? 'border-amber-300 bg-amber-50/30 text-amber-800'
                              : 'border-slate-200 bg-white text-slate-500'
                          }`}
                        >
                          <option value="">{isEn ? '-- Select source column --' : '-- Choisir colonne source --'}</option>
                          {headers.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 font-bold flex items-center gap-1.5 text-slate-600"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>{isEn ? 'Back to Upload' : 'Retour au chargement'}</span>
                    </button>
                    <button
                      type="button"
                      disabled={loading || !transformMap.first_name || !transformMap.last_name || !transformMap.email}
                      onClick={handleValidateMap}
                      className="px-5 py-2.5 rounded-xl bg-[#0c685a] hover:bg-[#094e45] disabled:bg-slate-300 text-white font-extrabold flex items-center gap-2 shadow-xs transition"
                    >
                      {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                      <span>{isEn ? 'Validate & Preview Staged Records' : 'Valider & Prévisualiser'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: STAGING PREVIEW & VALIDATION */}
              {step === 3 && validationSummary && (
                <div className="space-y-4 animate-fadeIn">
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-4 gap-2.5">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                      <div className="text-[10px] font-extrabold text-slate-500 uppercase">{isEn ? 'Total Staged' : 'Total'}</div>
                      <div className="text-lg font-extrabold text-[#092342] mt-0.5">{validationSummary.totalRows}</div>
                    </div>
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-center">
                      <div className="text-[10px] font-extrabold text-emerald-700 uppercase">{isEn ? 'Ready to Create' : 'Prêts'}</div>
                      <div className="text-lg font-extrabold text-emerald-800 mt-0.5">{validationSummary.validRows}</div>
                    </div>
                    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-center">
                      <div className="text-[10px] font-extrabold text-amber-700 uppercase">{isEn ? 'Existing (Skip)' : 'Existants'}</div>
                      <div className="text-lg font-extrabold text-amber-800 mt-0.5">{validationSummary.skippedRows}</div>
                    </div>
                    <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3 text-center">
                      <div className="text-[10px] font-extrabold text-rose-700 uppercase">{isEn ? 'Invalid / Errors' : 'Erreurs'}</div>
                      <div className="text-lg font-extrabold text-rose-800 mt-0.5">{validationSummary.errorRows}</div>
                    </div>
                  </div>

                  {/* Options Bar */}
                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2">
                    <label className="flex items-center gap-2.5 cursor-pointer font-bold text-slate-700">
                      <input
                        type="checkbox"
                        checked={updateExisting}
                        onChange={(e) => {
                          setUpdateExisting(e.target.checked);
                          // Re-validate immediately
                          if (importSet?.id) {
                            handleValidateMap();
                          }
                        }}
                        className="h-4 w-4 text-[#0c685a] rounded"
                      />
                      <span>
                        {isEn
                          ? 'Allow updating existing users if email matches (Default is SKIPPING existing accounts)'
                          : 'Autoriser la mise à jour des utilisateurs existants (Par défaut: IGNORER pour préserver)'}
                      </span>
                    </label>

                    <label className="flex items-center gap-2.5 cursor-pointer font-bold text-slate-700">
                      <input
                        type="checkbox"
                        checked={sendWelcomeEmails}
                        onChange={(e) => setSendWelcomeEmails(e.target.checked)}
                        className="h-4 w-4 text-[#0c685a] rounded"
                      />
                      <span>
                        {isEn
                          ? 'Dispatch welcome email with credentials to newly created users via Resend'
                          : 'Envoyer l’email de bienvenue avec identifiants aux nouveaux utilisateurs'}
                      </span>
                    </label>
                  </div>

                  {/* Staged Rows Table */}
                  <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-2xs max-h-64 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-[10px] font-extrabold uppercase text-slate-600">
                        <tr>
                          <th className="py-2 px-2.5 text-center">{isEn ? 'Exclude' : 'Exclure'}</th>
                          <th className="py-2 px-3">{isEn ? 'Row' : 'Ligne'}</th>
                          <th className="py-2 px-3">{isEn ? 'User Details' : 'Détails Utilisateur'}</th>
                          <th className="py-2 px-3">{isEn ? 'Profile' : 'Profil'}</th>
                          <th className="py-2 px-3">{isEn ? 'Status' : 'Statut'}</th>
                          <th className="py-2 px-3">{isEn ? 'Validation Notes' : 'Remarques Validation'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {validationSummary.rows?.map((row: any) => {
                          const isInvalid = row.validationStatus === 'INVALID';
                          const isSkipped = row.validationStatus === 'SKIPPED';
                          const isValid = row.validationStatus === 'VALID';

                          return (
                            <tr
                              key={row.id}
                              className={`transition ${
                                row.isExcluded
                                  ? 'bg-slate-100/70 opacity-50 line-through'
                                  : isInvalid
                                  ? 'bg-rose-50/40'
                                  : isSkipped
                                  ? 'bg-amber-50/30'
                                  : 'hover:bg-slate-50/50'
                              }`}
                            >
                              <td className="py-2 px-2.5 text-center">
                                <input
                                  type="checkbox"
                                  checked={row.isExcluded}
                                  onChange={() => handleToggleExclude(row.id, row.isExcluded)}
                                  className="h-3.5 w-3.5 rounded text-rose-600"
                                  title={isEn ? 'Exclude from import' : 'Exclure de l’import'}
                                />
                              </td>
                              <td className="py-2 px-3 font-mono text-slate-400 font-bold">{row.rowNumber}</td>
                              <td className="py-2 px-3">
                                <div className="font-extrabold text-[#092342]">
                                  {row.mapped?.first_name} {row.mapped?.last_name}
                                </div>
                                <div className="font-mono text-[10px] text-slate-500">{row.mapped?.email}</div>
                              </td>
                              <td className="py-2 px-3 font-medium text-slate-700">{row.mapped?.business_profile}</td>
                              <td className="py-2 px-3">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
                                    row.isExcluded
                                      ? 'bg-slate-200 text-slate-600'
                                      : isInvalid
                                      ? 'bg-rose-100 text-rose-700 border border-rose-300'
                                      : isSkipped
                                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                      : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  }`}
                                >
                                  {row.isExcluded
                                    ? isEn
                                      ? 'EXCLUDED'
                                      : 'EXCLU'
                                    : isInvalid
                                    ? isEn
                                      ? 'INVALID'
                                      : 'INVALIDE'
                                    : isSkipped
                                    ? isEn
                                      ? 'EXISTING (SKIP)'
                                      : 'EXISTANT (IGNORÉ)'
                                    : isEn
                                    ? 'READY'
                                    : 'PRÊT'}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-[10.5px]">
                                {row.errors?.length > 0 ? (
                                  <span className="text-rose-600 font-bold">{row.errors.join('; ')}</span>
                                ) : row.warnings?.length > 0 ? (
                                  <span className="text-amber-700 font-medium">{row.warnings.join('; ')}</span>
                                ) : (
                                  <span className="text-emerald-700 flex items-center gap-1 font-semibold">
                                    <Check className="w-3 h-3 text-emerald-600" />
                                    {isEn ? 'Validated' : 'Vérifié'}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 font-bold flex items-center gap-1.5 text-slate-600"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>{isEn ? 'Edit Transform Map' : 'Modifier le Mapping'}</span>
                    </button>
                    <button
                      type="button"
                      disabled={loading || validationSummary.validRows === 0}
                      onClick={() => setShowConfirmExecute(true)}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-extrabold flex items-center gap-2 shadow-xs transition"
                    >
                      <span>
                        {isEn
                          ? `Execute Transform (${validationSummary.validRows} users)`
                          : `Exécuter le Transform (${validationSummary.validRows} utilisateurs)`}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: EXECUTION SUMMARY & DOWNLOAD */}
              {step === 4 && executionSummary && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-center space-y-1">
                    <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-sm">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <h3 className="font-extrabold text-sm text-emerald-900 mt-2">
                      {isEn ? 'Import Transform Successfully Executed' : 'Exécution du Transform terminée avec succès'}
                    </h3>
                    <p className="text-[11.5px] text-emerald-800">
                      {isEn
                        ? `Import Set ${executionSummary.importSetNumber} processed ${executionSummary.processed} accounts through LIEC Heav'n provisioning.`
                        : `L'Import Set ${executionSummary.importSetNumber} a traité ${executionSummary.processed} comptes via le provisioning LIEC Heav'n.`}
                    </p>
                  </div>

                  {/* Metrics Breakdown */}
                  <div className="grid grid-cols-4 gap-2.5">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                      <div className="text-[10px] font-extrabold text-slate-500 uppercase">{isEn ? 'Processed' : 'Traités'}</div>
                      <div className="text-lg font-extrabold text-[#092342] mt-0.5">{executionSummary.processed}</div>
                    </div>
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-center">
                      <div className="text-[10px] font-extrabold text-emerald-700 uppercase">{isEn ? 'Created' : 'Créés'}</div>
                      <div className="text-lg font-extrabold text-emerald-800 mt-0.5">{executionSummary.created}</div>
                    </div>
                    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-center">
                      <div className="text-[10px] font-extrabold text-amber-700 uppercase">{isEn ? 'Skipped' : 'Ignorés'}</div>
                      <div className="text-lg font-extrabold text-amber-800 mt-0.5">{executionSummary.skipped}</div>
                    </div>
                    <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3 text-center">
                      <div className="text-[10px] font-extrabold text-blue-700 uppercase">{isEn ? 'Updated' : 'Mis à jour'}</div>
                      <div className="text-lg font-extrabold text-blue-800 mt-0.5">{executionSummary.updated}</div>
                    </div>
                  </div>

                  {/* Provisioned Accounts Table Preview */}
                  <div className="rounded-2xl border border-slate-200 overflow-hidden max-h-56 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-[10px] font-extrabold uppercase text-slate-600">
                        <tr>
                          <th className="py-2 px-3">{isEn ? 'Row' : 'Ligne'}</th>
                          <th className="py-2 px-3">{isEn ? 'Name' : 'Nom'}</th>
                          <th className="py-2 px-3">{isEn ? 'User ID' : 'Identifiant'}</th>
                          <th className="py-2 px-3">{isEn ? 'Action' : 'Action'}</th>
                          <th className="py-2 px-3">{isEn ? 'Account Status' : 'Statut Compte'}</th>
                          <th className="py-2 px-3">{isEn ? 'Welcome Email' : 'Email Bienvenue'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {executionSummary.details?.map((item: any, idx: number) => {
                          const isSuccess = item.emailStatus === 'SENT' || item.emailSent;
                          const isFailed = item.emailStatus === 'FAILED';

                          return (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="py-2 px-3 font-mono text-slate-400 font-bold">{item.rowNumber}</td>
                              <td className="py-2 px-3 font-extrabold text-[#092342]">{item.name}</td>
                              <td className="py-2 px-3 font-mono font-bold text-[#0c685a]">{item.userId || '—'}</td>
                              <td className="py-2 px-3">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
                                    item.action === 'PROVISIONED'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : item.action === 'UPDATED'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {item.action}
                                </span>
                              </td>
                              <td className="py-2 px-3 font-bold text-slate-700">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] bg-slate-100 text-slate-700">
                                  {item.accountStatus || (item.action === 'PROVISIONED' ? 'Created' : item.action)}
                                </span>
                              </td>
                              <td className="py-2 px-3">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
                                      isSuccess
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : isFailed
                                        ? 'bg-rose-100 text-rose-800'
                                        : 'bg-slate-100 text-slate-500'
                                    }`}
                                  >
                                    {isSuccess
                                      ? isEn ? 'SENT' : 'ENVOYÉ'
                                      : isFailed
                                      ? isEn ? 'FAILED' : 'ÉCHEC'
                                      : isEn ? 'DEFERRED' : 'DIFFÉRÉ'}
                                  </span>
                                  {isFailed && item.stagingRowId && (
                                    <button
                                      type="button"
                                      disabled={retryingRowId === item.stagingRowId}
                                      onClick={() => handleRetryEmail(item.stagingRowId)}
                                      className="px-2 py-0.5 rounded-md border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[9.5px] font-bold flex items-center gap-1 shadow-2xs"
                                      title={isEn ? 'Retry sending welcome credentials email' : 'Renvoyer l’email de bienvenue'}
                                    >
                                      <RefreshCw className={`w-2.5 h-2.5 ${retryingRowId === item.stagingRowId ? 'animate-spin' : ''}`} />
                                      <span>{isEn ? 'Retry' : 'Renvoyer'}</span>
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => handleDownloadResults()}
                      className="px-4 py-2.5 rounded-xl border border-[#0c685a] bg-teal-50/70 hover:bg-teal-100/70 text-[#0c685a] font-extrabold flex items-center gap-2 shadow-2xs transition"
                    >
                      <Download className="w-4 h-4" />
                      <span>{isEn ? 'Download Execution Report (CSV)' : 'Télécharger le Rapport (CSV)'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={onClose}
                      className="px-6 py-2.5 rounded-xl bg-[#092342] hover:bg-[#061830] text-white font-extrabold shadow-xs transition"
                    >
                      {isEn ? 'Close & Refresh Users' : 'Fermer & Actualiser'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* CONFIRMATION POPUP BEFORE EXECUTE */}
      {showConfirmExecute && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-[#092342]">
                  {isEn ? 'Confirm Bulk Account Creation' : 'Confirmer la création en masse'}
                </h4>
                <p className="text-xs text-slate-600 mt-1">
                  {isEn
                    ? `You are about to execute Transform on Import Set ${importSet?.set_number}. This will create ${validationSummary?.validRows} new accounts with mandatory temporary passwords.`
                    : `Vous allez exécuter le Transform sur l'Import Set ${importSet?.set_number}. Cela créera ${validationSummary?.validRows} nouveaux comptes avec mots de passe temporaires.`}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmExecute(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 font-bold text-slate-600"
              >
                {isEn ? 'Cancel' : 'Annuler'}
              </button>
              <button
                type="button"
                onClick={handleExecuteTransform}
                disabled={loading}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold flex items-center gap-2 shadow-xs transition"
              >
                {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                <span>{isEn ? 'Confirm & Execute' : 'Confirmer & Exécuter'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
