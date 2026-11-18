'use client';

import React, { useState, useEffect } from 'react';

export interface EvidenceFileItem {
  id: number;
  submission_id: number;
  file_name: string;
  storage_key: string;
  file_size_bytes: number;
  mime_type: string;
  created_at?: string;
}

interface SecureEvidenceViewerProps {
  evidence: EvidenceFileItem;
  submissionId: number;
  onClose?: () => void;
  lang?: 'en' | 'fr';
}

export function SecureEvidenceViewer({
  evidence,
  submissionId,
  onClose,
  lang = 'en',
}: SecureEvidenceViewerProps) {
  const isEn = lang === 'en';
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchSignedUrl() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(
          `/api/payments/submissions/${submissionId}/evidence/${evidence.id}/download`
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Failed to fetch secure download link (HTTP ${res.status})`);
        }
        const data = await res.json();
        if (isMounted) {
          if (data.url) {
            setDownloadUrl(data.url);
          } else {
            throw new Error('Download URL was not provided in server response.');
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Error generating secure signed preview URL.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    if (evidence && evidence.id && submissionId) {
      fetchSignedUrl();
    }

    return () => {
      isMounted = false;
    };
  }, [submissionId, evidence.id]);

  const isPdf = evidence.mime_type === 'application/pdf' || evidence.file_name.toLowerCase().endsWith('.pdf');
  const isImage =
    evidence.mime_type === 'image/jpeg' ||
    evidence.mime_type === 'image/png' ||
    /\.(jpg|jpeg|png)$/i.test(evidence.file_name);

  const formattedSize = (evidence.file_size_bytes / (1024 * 1024)).toFixed(2);

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 rounded-xl overflow-hidden border border-slate-700 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="p-2 bg-indigo-600/30 text-indigo-400 rounded-lg">
            {isPdf ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            )}
          </div>
          <div className="truncate">
            <h4 className="text-sm font-semibold truncate text-white" title={evidence.file_name}>
              {evidence.file_name}
            </h4>
            <div className="text-xs text-slate-400 flex items-center space-x-2">
              <span>{evidence.mime_type}</span>
              <span>•</span>
              <span>{formattedSize} MB</span>
              {evidence.created_at && (
                <>
                  <span>•</span>
                  <span>{new Date(evidence.created_at).toLocaleDateString()}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {downloadUrl && (
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              download={evidence.file_name}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {isEn ? 'Download' : 'Télécharger'}
            </a>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Security Disclaimer Notice */}
      <div className="bg-amber-950/40 border-b border-amber-800/40 px-4 py-1.5 text-[11px] text-amber-300 flex items-center justify-between">
        <span className="flex items-center">
          <svg className="w-3.5 h-3.5 mr-1.5 text-amber-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {isEn
            ? 'Sandboxed preview active (scripts blocked). Antivirus/malware scanning is not currently implemented.'
            : 'Aperçu isolé actif (scripts désactivés). L’analyse antivirus/malware n’est pas implémentée actuellement.'}
        </span>
        <span className="text-[10px] text-amber-400/80">TTL: 300s</span>
      </div>

      {/* Content Area */}
      <div className="flex-1 min-h-[360px] max-h-[600px] bg-slate-950 flex items-center justify-center p-2 relative overflow-auto">
        {loading && (
          <div className="flex flex-col items-center justify-center space-y-2 py-12 text-slate-400">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs">{isEn ? 'Generating secure signed preview URL...' : 'Génération du lien sécurisé...'}</span>
          </div>
        )}

        {error && (
          <div className="p-4 bg-rose-950/40 border border-rose-800/60 rounded-lg text-rose-300 text-xs text-center max-w-md">
            <p className="font-semibold mb-1">{isEn ? 'Secure Preview Failed' : 'Échec de l’aperçu sécurisé'}</p>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && downloadUrl && (
          <>
            {isPdf && (
              <iframe
                src={`${downloadUrl}#toolbar=0&navpanes=0`}
                title={`Evidence preview: ${evidence.file_name}`}
                sandbox="allow-same-origin"
                className="w-full h-full min-h-[460px] rounded border-0 bg-white"
              />
            )}

            {isImage && (
              <div className="w-full h-full flex items-center justify-center p-4">
                <img
                  src={downloadUrl}
                  alt={`Evidence preview: ${evidence.file_name}`}
                  className="max-w-full max-h-[500px] object-contain rounded shadow-lg border border-slate-700"
                />
              </div>
            )}

            {!isPdf && !isImage && (
              <div className="text-center p-6 text-slate-400 text-xs">
                <p>{isEn ? 'Inline preview not supported for this file type.' : 'Aperçu direct non supporté pour ce type de document.'}</p>
                <a
                  href={downloadUrl}
                  download={evidence.file_name}
                  className="mt-3 inline-block px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs"
                >
                  {isEn ? 'Download file directly' : 'Télécharger directement'}
                </a>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
