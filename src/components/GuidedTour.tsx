'use client';

import React, { useState } from 'react';
import {
  LayoutGrid,
  Inbox,
  Contact,
  GraduationCap,
  Banknote,
  HelpCircle,
  Calendar,
  X,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export interface GuidedTourStep {
  id: string;
  titleEn: string;
  titleFr: string;
  descEn: string;
  descFr: string;
  icon: React.ComponentType<{ className?: string }>;
  tabTarget?: string;
  badge?: string;
  roles?: string[];
}

const ALL_TOUR_STEPS: GuidedTourStep[] = [
  {
    id: 'welcome',
    titleEn: 'Welcome to LIEC Heav’n Workspace',
    titleFr: 'Bienvenue dans LIEC Heav’n Workspace',
    descEn:
      'Your centralized operations platform for student recruitment from DRC and Congo-Brazzaville to prestigious Lyon partner schools and the LIEC-France PREPA programme.',
    descFr:
      'Votre plateforme centrale de gestion des recrutements étudiants de RDC et Congo vers les grandes écoles partenaires de Lyon et le programme d’excellence LIEC-France PRÉPA.',
    icon: Sparkles,
    tabTarget: 'overview',
    badge: 'Introduction',
    roles: ['all'],
  },
  {
    id: 'intake',
    titleEn: 'Academic Intake Selector',
    titleFr: 'Sélecteur de Rentrée Académique',
    descEn:
      'LIEC operates two intakes per session: September and January. Switch between Full Sessions (Sept–Jan) or specific cohort intakes to isolate candidate records instantly.',
    descFr:
      'LIEC organise deux rentrées par session : Septembre et Janvier. Basculez en un clic entre sessions complètes ou cohortes ciblées pour filtrer précisément vos données.',
    icon: Calendar,
    tabTarget: 'overview',
    badge: 'Intakes',
    roles: ['all'],
  },
  {
    id: 'dashboard',
    titleEn: 'Overview & Interactive Reports',
    titleFr: 'Tableau de Bord & Rapports Interactifs',
    descEn:
      'Monitor key operational metrics, urgency alerts, and the interactive Breakdown by Service donut chart. Hover for values or click segments to view detailed underlying records.',
    descFr:
      'Suivez les indicateurs clés, les alertes d’urgence et le graphique interactif Répartition par Service. Survolez pour voir les taux ou cliquez pour inspecter chaque dossier.',
    icon: LayoutGrid,
    tabTarget: 'overview',
    badge: 'KPIs & Reports',
    roles: ['all'],
  },
  {
    id: 'prospects',
    titleEn: 'Prospects CRM & Dynamic Advisors',
    titleFr: 'CRM Prospects & Conseillers Dynamiques',
    descEn:
      'Track prospective students through pipeline stages. Click any candidate name to view their profile, schedule calls directly into their card, and leave shared team comments.',
    descFr:
      'Gérez votre pipeline de prospection en colonnes visuelles. Cliquez sur un nom pour ouvrir sa fiche, planifiez des rendez-vous et partagez vos notes internes d’équipe.',
    icon: Contact,
    tabTarget: 'prospects',
    badge: 'CRM Pipeline',
    roles: ['admin', 'secretary', 'ITIL', 'lh_internal'],
  },
  {
    id: 'candidats',
    titleEn: 'Student & Application Management',
    titleFr: 'Gestion des Candidats & Dossiers',
    descEn:
      'Monitor Campus France milestones, academic records, linked parent details, and school admissions for all enrolled candidates across Lyon institutions.',
    descFr:
      'Suivez les jalons Campus France, les pièces justificatives, les coordonnées des parents/tuteurs et l’état des admissions auprès des universités et écoles lyonnaises.',
    icon: GraduationCap,
    tabTarget: 'candidats',
    badge: 'Étudiants',
    roles: ['admin', 'secretary', 'ITIL', 'lh_internal'],
  },
  {
    id: 'finance',
    titleEn: 'Finance & YIMMILINE Prefinancing Desk',
    titleFr: 'Finance & Préfinancement YIMMILINE',
    descEn:
      'Process Blocked Account (AVI) certificates, evaluate Classique vs Partiel funding tiers, and validate installment receipts for the €2,800 PREPA programme.',
    descFr:
      'Gérez les attestations de virement irrévocable (AVI), calculez les échéanciers YIMMILINE (Classique, Partiel 1 & 2) et validez les reçus officiels d’acomptes.',
    icon: Banknote,
    tabTarget: 'avi',
    badge: 'Finance & AVI',
    roles: ['admin', 'avi', 'lh_finance'],
  },
  {
    id: 'kb',
    titleEn: '“Heav’n Knows Better KB” Knowledge Base',
    titleFr: 'Base de Connaissances “Heav’n Knows Better KB”',
    descEn:
      'Need guidance? Explore our complete manual detailing all 11 stages of LIEC-France PREPA, role workflows, and step-by-step procedures anytime.',
    descFr:
      'Une question sur une démarche ? Consultez notre guide complet détaillant les 11 étapes de la Prépa, les procédures Campus France et les scénarios métiers par rôle.',
    icon: HelpCircle,
    tabTarget: 'aide',
    badge: 'Documentation',
    roles: ['all'],
  },
];

export function GuidedTour({
  isOpen = true,
  userEmail,
  userRole = 'admin',
  lang = 'en',
  onClose,
  onComplete,
  onDismiss,
  onNavigate,
  onNavigateTab,
}: {
  isOpen?: boolean;
  userEmail?: string;
  userRole?: string;
  lang?: 'fr' | 'en';
  onClose?: () => void;
  onComplete?: () => void;
  onDismiss?: () => void;
  onNavigate?: (tab: string) => void;
  onNavigateTab?: (tab: string) => void;
}) {
  const isEn = lang === 'en';

  const navigateFn = onNavigate || onNavigateTab;
  const closeTour = () => {
    if (onClose) onClose();
    if (onComplete) onComplete();
    if (onDismiss) onDismiss();
  };

  // Filter steps by role
  const steps = ALL_TOUR_STEPS.filter((s) => {
    if (!s.roles || s.roles.includes('all')) return true;
    return s.roles.includes(userRole) || userRole === 'admin';
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const currentStep = steps[currentIndex] || steps[0];

  const handleFinish = async (discard: boolean = false) => {
    // 1. Immediately close the tour modal in UI
    closeTour();

    // 2. Persist completion to DB in background
    if (userEmail) {
      try {
        await fetch('/api/users/tour', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: userEmail, completed: true }),
        });
      } catch (e) {
        console.warn('Could not persist tour state:', e);
      }
    }
  };

  const handleNext = () => {
    if (currentIndex < steps.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      if (navigateFn && steps[nextIdx]?.tabTarget) {
        navigateFn(steps[nextIdx].tabTarget!);
      }
    } else {
      handleFinish(false);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      const prevIdx = currentIndex - 1;
      setCurrentIndex(prevIdx);
      if (navigateFn && steps[prevIdx]?.tabTarget) {
        navigateFn(steps[prevIdx].tabTarget!);
      }
    }
  };

  if (!isOpen) return null;

  const IconComponent = currentStep.icon;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-100 flex flex-col justify-between space-y-6 relative overflow-hidden">
        {/* Subtle decorative background gradient */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-gradient-to-br from-[#0c685a]/15 to-[#092342]/10 rounded-full blur-2xl pointer-events-none" />

        {/* Header bar with step counter & discard button */}
        <div className="flex items-center justify-between relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#f1f6fb] px-3 py-1 text-xs font-extrabold text-[#092342]">
            <span className="h-2 w-2 rounded-full bg-[#10b981]" />
            <span>
              {isEn ? `Step ${currentIndex + 1} of ${steps.length}` : `Étape ${currentIndex + 1} sur ${steps.length}`}
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-[#0c685a]">{currentStep.badge}</span>
          </div>

          <button
            onClick={() => handleFinish(true)}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer text-xs font-semibold flex items-center gap-1"
            title={isEn ? 'Discard Tour' : 'Ignorer le tour'}
          >
            <span>{isEn ? 'Skip' : 'Ignorer'}</span>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Main Content Area */}
        <div className="space-y-4 relative z-10 py-2">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-[#092342] to-[#153a70] text-white flex items-center justify-center shadow-md">
            <IconComponent className="w-8 h-8 text-[#5eead4]" />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl sm:text-2xl font-extrabold text-[#092342] tracking-tight">
              {isEn ? currentStep.titleEn : currentStep.titleFr}
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed font-medium">
              {isEn ? currentStep.descEn : currentStep.descFr}
            </p>
          </div>
        </div>

        {/* Progress Dots */}
        <div className="flex items-center gap-1.5 justify-center py-1">
          {steps.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                setCurrentIndex(idx);
                if (onNavigateTab && steps[idx]?.tabTarget) {
                  onNavigateTab(steps[idx].tabTarget!);
                }
              }}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                idx === currentIndex
                  ? 'w-7 bg-[#092342]'
                  : 'w-2 bg-slate-200 hover:bg-slate-300'
              }`}
              aria-label={`Go to step ${idx + 1}`}
            />
          ))}
        </div>

        {/* Footer Navigation Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 relative z-10">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              currentIndex === 0
                ? 'text-slate-300 cursor-not-allowed'
                : 'text-slate-600 hover:bg-slate-100 hover:text-[#092342]'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>{isEn ? 'Previous' : 'Précédent'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleFinish(true)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700 px-3 py-2 cursor-pointer"
            >
              {isEn ? 'Discard' : 'Passer'}
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#092342] hover:bg-[#153a70] text-white text-xs font-extrabold shadow-sm transition cursor-pointer"
            >
              {currentIndex === steps.length - 1 ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-[#5eead4]" />
                  <span>{isEn ? 'Complete Tour' : 'Terminer le tour'}</span>
                </>
              ) : (
                <>
                  <span>{isEn ? 'Next' : 'Suivant'}</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
