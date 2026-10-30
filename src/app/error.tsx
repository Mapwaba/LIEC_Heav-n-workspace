"use client";

import React, { useEffect } from "react";

export default function WorkspaceErrorCatch({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("LIEC Heav'n Workspace Client Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#f6f9fc] flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="w-16 h-16 rounded-2xl bg-[#092342]/5 border border-[#092342]/10 flex items-center justify-center mb-5 text-2xl shadow-sm">
        ⚠️
      </div>
      <h1 className="text-xl font-bold text-[#092342] mb-2">Chargement du workspace interrompu</h1>
      <p className="text-slate-500 max-w-md text-sm mb-6 leading-relaxed">
        Une exception d'interface a été interceptée. Vous pouvez recharger la session sans perte de vos données de travail.
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={() => reset()}
          className="px-5 py-2.5 rounded-xl bg-[#092342] text-white font-semibold text-sm shadow hover:bg-[#153a70] transition-colors"
        >
          Recharger l'affichage
        </button>
        <button
          onClick={() => window.location.reload()}
          className="px-5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-700 font-medium text-sm hover:bg-slate-50 transition-colors"
        >
          Actualiser la page
        </button>
      </div>
    </div>
  );
}
