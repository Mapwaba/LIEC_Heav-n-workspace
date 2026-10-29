'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CheckSquare,
  Award,
  Users,
  Calendar,
  ArrowRight,
  Euro,
  Calculator,
  FileCheck2,
  ShieldCheck,
  Globe,
  Send,
  CheckCircle2,
  AlertTriangle,
  Building2,
  RefreshCw,
  FileText,
  Lock,
  Upload,
  DollarSign,
  TrendingUp,
  UserCheck,
  UserPlus,
  ShieldAlert,
  Key,
  Unlock,
  SlidersHorizontal,
  Eye,
  EyeOff,
  Copy,
  Share2,
  X,
  Check,
  Info,
  Download,
} from 'lucide-react';

export type Lang = 'en' | 'fr';

export interface YimmiOfferSpec {
  key: 'classique' | 'partiel1' | 'partiel2';
  nameEn: string;
  nameFr: string;
  rate: number; // 0.12 | 0.06 | 0.12
  months: number; // 8 | 3 | 12
  minEur: number;
  maxEur: number;
  amountLabelEn: string;
  amountLabelFr: string;
  personalContributionEn?: string;
  personalContributionFr?: string;
  guarantorRuleEn: string;
  guarantorRuleFr: string;
  generalCondEn: string;
  generalCondFr: string;
  specificCondEn: {
    salaried: string;
    entrepreneur: string;
    informal: string;
  };
  specificCondFr: {
    salaried: string;
    entrepreneur: string;
    informal: string;
  };
  nbNoteEn: string;
  nbNoteFr: string;
}

export const YIMMILINE_OFFERS: Record<'classique' | 'partiel1' | 'partiel2', YimmiOfferSpec> = {
  classique: {
    key: 'classique',
    nameEn: 'YimmiLine Classic Prefinancing (Classique)',
    nameFr: 'Préfinancement YimmiLine Classique',
    rate: 0.12,
    months: 8,
    minEur: 0,
    maxEur: 3049,
    amountLabelEn: '0 to 2,000,000 XAF (0 to €3,049 EUR)',
    amountLabelFr: '0 à 2 000 000 XAF soit 0 à 3 049 €',
    guarantorRuleEn: 'Guarantor in Africa (DRC/Congo/Cameroon) or in France',
    guarantorRuleFr: 'Garant local (RDC/Congo/Cameroun) ou en France',
    generalCondEn:
      'Have a guarantor locally or in France earning 2 × 2,000,000 FCFA (4,000,000 XAF) over year N-1 and/or a reliable collateral worth 2 × the prefinanced amount.',
    generalCondFr:
      "Avoir un garant au pays ou en France qui gagne 2 fois 2 000 000 FCFA sur l'année N-1 et/ou une garantie fiable d'une valeur de 2 fois le montant préfinancé.",
    specificCondEn: {
      salaried: 'For Salaried: Submit payslips of the last 03 months at the time of credit application.',
      entrepreneur:
        'For Entrepreneur: Company balance sheet + Bank history over year N-1 (to verify activity).',
      informal: 'For Informal Sector: Bank statements of the guarantor(s).',
    },
    specificCondFr: {
      salaried:
        'Pour le Salarié : Présenter ses fiches de paie des 03 derniers mois au moment de la demande de crédit.',
      entrepreneur:
        "Pour l'entrepreneur : Bilan de société + Historique bancaire sur l'année N-1 (pour vérifier l'activité).",
      informal: "Pour l'informel : Relevés bancaires de ou des personnes garantes.",
    },
    nbNoteEn:
      'NB: Classic prefinancing is open to anyone meeting its conditions. If the guarantor is in France, security deposit checks (chèques de caution) and a sworn statement (attestation sur l’honneur) are required in addition to the listed documents.',
    nbNoteFr:
      "NB : Le préfinancement classique est ouvert à toute personne remplissant ses conditions. Si le garant est en France, les chèques de caution et l'attestation sur l'honneur seront demandés en plus des éléments listés.",
  },
  partiel1: {
    key: 'partiel1',
    nameEn: 'YimmiLine Partial 1 Prefinancing (Partiel 1)',
    nameFr: 'Préfinancement YimmiLine Partiel 1',
    rate: 0.06,
    months: 3,
    minEur: 3050,
    maxEur: 7380,
    amountLabelEn: '> 2,000,000 XAF (> €3,049 EUR)',
    amountLabelFr: '> 2 000 000 XAF soit > 3 049 €',
    personalContributionEn: 'Personal contribution: €615 × 3 (€1,845) i.e. 403,440 XAF × 3 (1,210,320 XAF)',
    personalContributionFr: 'Apport de la personne : 615 € × 3 soit 403 440 XAF × 3 (1 210 320 XAF)',
    guarantorRuleEn: 'Guarantor in France ONLY',
    guarantorRuleFr: 'Avoir un garant en France uniquement',
    generalCondEn:
      'Have a guarantor in France ONLY. The 6% interest is paid upon setup with the commitment to settle the credit after obtaining the visa within 03 months.',
    generalCondFr:
      "Avoir un garant en France uniquement. Le 6% est versé à la mise en place avec l'engagement de solder le crédit après le visa dans le délai de 03 mois.",
    specificCondEn: {
      salaried: 'Present: Payslips of the last 03 months + Bank history over year N-1 (to verify).',
      entrepreneur:
        'Present: Company balance sheet + Bank history over year N-1 (to verify) + Last 3 months payslips if applicable.',
      informal:
        'Present: Guarantor in France last 03 months payslips, company balance sheet & N-1 bank history.',
    },
    specificCondFr: {
      salaried:
        "Présenter : Ses fiches de paie des 03 derniers mois + Son historique bancaire sur l'année N-1 (pour vérifier).",
      entrepreneur:
        "Présenter : Son Bilan de société + Son Historique bancaire sur l'année N-1 (pour vérifier).",
      informal:
        'Présenter : Fiches de paie des 03 derniers mois, Bilan de société et Historique bancaire N-1 du garant en France.',
    },
    nbNoteEn:
      'NB: In case of visa refusal, the prefinancing will only be charged at the 6% interest rate. This prefinancing makes it possible with minimal financing to obtain the visa and a solid file, and opens the possibility to switch to 12 months after the visa with 12% over 8 months.',
    nbNoteFr:
      "NB : En cas de refus de visa, le préfinancement ne sera payé qu'au taux d'intérêt de 6%. Ce préfinancement permet avec peu de financement d'avoir le visa et un dossier solide. Par ailleurs, ouvre la possibilité de passer à 12 mois après le visa avec 12% en 8 mois.",
  },
  partiel2: {
    key: 'partiel2',
    nameEn: 'YimmiLine Partial 2 Prefinancing (Partiel 2)',
    nameFr: 'Préfinancement YimmiLine Partiel 2',
    rate: 0.12,
    months: 12,
    minEur: 3049,
    maxEur: 7380,
    amountLabelEn: 'From 2,000,000 XAF (€3,049) up to Total AVI Prefinancing',
    amountLabelFr: "De 2 000 000 XAF au préfinancement total de l'AVI",
    guarantorRuleEn: 'Guarantor in France ONLY (Caution checks + Sworn statement)',
    guarantorRuleFr: 'Garant en France uniquement (Chèques de caution + Attestation sur l’honneur)',
    generalCondEn:
      'Have a guarantor in France ONLY. The guarantor must provide security deposit checks (chèques de caution) and a sworn statement (attestation sur l’honneur) as collateral.',
    generalCondFr:
      "Avoir un garant en France uniquement. Le garant doit fournir à titre de garantie les chèques de caution et une attestation sur l'honneur.",
    specificCondEn: {
      salaried:
        'If Salaried: Submit payslips of the last 03 months + Bank history over year N-1 (to verify).',
      entrepreneur:
        'If Entrepreneur: Submit company balance sheet + Bank history over year N-1 (to verify).',
      informal:
        'Guarantor in France must provide last 3 payslips / balance sheet, N-1 bank history, security deposit checks & sworn statement.',
    },
    specificCondFr: {
      salaried:
        "Si salarié : Présenter ses fiches de paie des 03 derniers mois + Son historique bancaire sur l'année N-1 (pour vérifier).",
      entrepreneur:
        "Si entrepreneur : Présenter son Bilan de société + Son historique bancaire sur l'année N-1 (pour vérifier).",
      informal:
        "Le garant en France doit fournir ses justificatifs N-1, les chèques de caution et une attestation sur l'honneur.",
    },
    nbNoteEn:
      'NB: Repayment takes effect 30 days after signing the prefinancing contracts. AVI interest and fees are paid upon credit setup and are non-refundable in case of visa refusal.',
    nbNoteFr:
      "NB : Le remboursement prend effet 30 jours après la signature des contrats de préfinancement. Les intérêts et les frais de l'AVI sont versés à la mise en place du crédit. Ces derniers ne sont pas remboursables en cas d'échec de visa.",
  },
};

export function PrepaScreen({
  cohorts,
  onOpenNewDemande,
  onNotify,
  lang = 'en',
}: {
  cohorts: any[];
  onOpenNewDemande: () => void;
  onNotify: (msg: string) => void;
  lang?: Lang;
}) {
  const isEn = lang === 'en';
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="inline-block rounded-full bg-[#fef4d6] px-3 py-0.5 text-[10.5px] font-extrabold uppercase tracking-wider text-[#b87c08] mb-2">
            {isEn ? 'ACADEMIC TRAINING & PREPARATION' : 'FORMATION & PRÉPARATION ACADÉMIQUE'}
          </span>
          <h1 className="text-[28px] font-extrabold text-[#092342] leading-tight">
            {isEn
              ? 'PREPA Enrollments & Campus France Pathway'
              : 'Inscriptions PREPA & Parcours Campus France'}
          </h1>
          <p className="mt-1 text-sm text-slate-500 max-w-2xl">
            {isEn
              ? 'Dedicated management of LIEC — France PREPA training cohorts (Kinshasa, Brazzaville & Lyon) and consular preparation milestones.'
              : 'Gestion distincte des cohortes de formation LIEC — France PREPA (Kinshasa, Brazzaville & Lyon) et jalons de préparation consulaire.'}
          </p>
        </div>
        <button
          onClick={onOpenNewDemande}
          className="inline-flex items-center gap-2 rounded-xl bg-[#f4be37] hover:bg-[#e5ae28] px-5 py-2.5 text-xs font-extrabold text-[#092342] shadow-sm transition"
        >
          <span>
            {isEn
              ? '+ Enroll Student (DRC / Congo → Lyon)'
              : '+ Inscrire un étudiant (RDC / Congo → Lyon)'}
          </span>
        </button>
      </div>

      {/* Official Catalog of the 6 Partner Schools in Lyon */}
      <div className="rounded-2xl border border-[#ccece2] bg-white p-6 shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-[#0c685a]">
              {isEn
                ? 'EXCLUSIVE LYON CITY PARTNERSHIP • DRC & CONGO-BRAZZAVILLE RECRUITMENT'
                : 'PARTENARIAT EXCLUSIF VILLE DE LYON • RECRUTEMENT RDC & CONGO-BRAZZAVILLE'}
            </span>
            <h2 className="text-lg font-extrabold text-[#092342]">
              {isEn ? 'The 6 LIEC Partner Schools in Lyon' : 'Les 6 Écoles Partenaires LIEC à Lyon'}
            </h2>
          </div>
          <span className="rounded-full bg-[#ccf5e5] px-3 py-1 text-xs font-extrabold text-[#0c685a]">
            {isEn ? '6 Partner Institutions in Lyon' : '6 Établissements à Lyon'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {[
            {
              num: 1,
              name: 'ISCOM',
              desc: isEn
                ? 'Communication, advertising, marketing and events management.'
                : 'Communication, publicité, marketing et événementiel.',
              badge: 'Lyon Campus',
            },
            {
              num: 2,
              name: 'MyDigitalSchool',
              desc: isEn
                ? 'Web development, digital creation, webmarketing and UX/UI design.'
                : 'Développement web, création numérique, webmarketing et UX/UI design.',
              badge: 'Lyon Campus',
            },
            {
              num: 3,
              name: 'École Internationale Tunon',
              desc: isEn
                ? 'Tourism, hospitality, public relations and events management.'
                : 'Tourisme, hôtellerie, relations publiques et événementiel.',
              badge: 'Lyon Campus',
            },
            {
              num: 4,
              name: 'IHECF',
              desc: isEn
                ? 'Accounting, chartered accountancy, finance and management control.'
                : 'Comptabilité, expertise comptable, finance et contrôle de gestion.',
              badge: 'Lyon Campus',
            },
            {
              num: 5,
              name: 'Ipac Bachelor Factory',
              desc: isEn
                ? 'Business, management, finance, communication and logistics.'
                : 'Commerce, gestion, finance, communication et logistique.',
              badge: 'Lyon Campus',
            },
            {
              num: 6,
              name: 'MBway',
              desc: isEn
                ? 'Management, entrepreneurship, human resources, finance and international trade.'
                : 'Management, entrepreneuriat, ressources humaines, finance et commerce international.',
              badge: 'Lyon Campus',
            },
          ].map((school) => (
            <div
              key={school.num}
              className="rounded-2xl border border-[#e6eef6] bg-[#f8fbff] p-4 flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="h-7 w-7 rounded-lg bg-[#092342] text-white flex items-center justify-center text-xs font-extrabold">
                    {school.num}
                  </span>
                  <span className="rounded-full bg-[#d8f6ea] px-2.5 py-0.5 text-[10px] font-extrabold text-[#0c685a]">
                    📍 {school.badge}
                  </span>
                </div>
                <h3 className="mt-2.5 text-sm font-extrabold text-[#092342]">{school.name}</h3>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">{school.desc}</p>
              </div>
              <button
                onClick={onOpenNewDemande}
                className="text-left text-[11px] font-extrabold text-[#0c685a] hover:underline"
              >
                {isEn
                  ? 'Register a DRC / Congo candidate →'
                  : 'Inscrire un candidat RDC / Congo →'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Cohorts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cohorts.map((c) => {
          const pct = Math.round((c.enrolled_count / c.capacity) * 100);
          return (
            <div
              key={c.code}
              className="rounded-2xl border border-[#e6eef6] bg-white p-5 shadow-card flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-lg bg-[#eef4fb] px-2.5 py-1 text-[10.5px] font-extrabold text-[#092342]">
                    {c.code}
                  </span>
                  <span className="rounded-full bg-[#ccf5e5] px-2.5 py-0.5 text-[10.5px] font-extrabold text-[#0c685a]">
                    {c.status}
                  </span>
                </div>
                <h3 className="mt-3 text-base font-extrabold text-[#092342]">{c.name}</h3>
                <p className="mt-1 text-xs text-slate-500">
                  📍 Campus: <strong className="text-slate-700">{c.campus}</strong> •{' '}
                  {isEn ? 'Intake:' : 'Rentrée :'} {c.start_date}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  👤 {isEn ? 'Lead Instructor:' : 'Référent :'}{' '}
                  <strong className="text-[#092342]">{c.lead_instructor}</strong>
                </p>
              </div>

              <div className="space-y-2 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">
                    {isEn ? 'Enrolled Students' : 'Effectif inscrit'}
                  </span>
                  <span className="font-extrabold text-[#092342]">
                    {c.enrolled_count} / {c.capacity} {isEn ? 'seats' : 'places'} ({pct}%)
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#0c685a]"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <button
                  onClick={() =>
                    onNotify(
                      isEn
                        ? `Attendance sheet and tracking for cohort ${c.code} opened.`
                        : `Feuille d'émargement et suivi de présence ${c.code} ouverte.`
                    )
                  }
                  className="mt-2 w-full rounded-xl bg-[#f1f6fb] hover:bg-[#e3edf8] py-2 text-xs font-extrabold text-[#092342] transition"
                >
                  {isEn ? 'Manage Cohort Attendance →' : 'Émarger la cohorte & présences →'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ServicesAviScreen({
  aviRequests,
  onCreateAvi,
  onNotify,
  lang = 'en',
  currentRole = 'avi',
  parentStudentLinks = [],
  demandes = [],
  candidats = [],
}: {
  aviRequests: any[];
  onCreateAvi: (data: any) => Promise<void>;
  onNotify: (msg: string) => void;
  lang?: Lang;
  currentRole?: string;
  parentStudentLinks?: any[];
  demandes?: any[];
  candidats?: any[];
}) {
  const isEn = lang === 'en';

  // Parent AVI Registration Form State (Dedicated to the Parent Borrower)
  const [parentName, setParentName] = useState('');
  const [occupation, setOccupation] = useState('');
  const [occupationProfile, setOccupationProfile] = useState<'salaried' | 'entrepreneur' | 'informal'>('salaried');
  const [studentName, setStudentName] = useState('');
  const [physicalAddress, setPhysicalAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [otherGuarantor, setOtherGuarantor] = useState<boolean>(false);
  const [guarantorDetails, setGuarantorDetails] = useState('');
  const [country, setCountry] = useState('');
  const [town, setTown] = useState('');
  const [nationalityDifferent, setNationalityDifferent] = useState('');
  const [studentProgram, setStudentProgram] = useState('');
  const [email, setEmail] = useState('');
  // Passport ID starting with OP or PO + 9 digits (or 9 characters total)
  const [passportId, setPassportId] = useState('');
  const [startDate, setStartDate] = useState('');

  // Aggregate catalog of parents and their linked applicants to reuse records and avoid duplicates
  const parentsCatalog = useMemo(() => {
    const map = new Map<
      string,
      {
        parent_name: string;
        parent_phone: string;
        students: { name: string; program?: string; email?: string }[];
      }
    >();

    const addLink = (
      pName: string,
      sName: string,
      pPhone?: string,
      sProg?: string,
      sEmail?: string
    ) => {
      const cleanP = (pName || '').trim();
      const cleanS = (sName || '').trim();
      if (!cleanP || !cleanS) return;
      const key = cleanP.toLowerCase();
      if (!map.has(key)) {
        map.set(key, { parent_name: cleanP, parent_phone: pPhone || '', students: [] });
      }
      const item = map.get(key)!;
      if (pPhone && !item.parent_phone) item.parent_phone = pPhone;
      if (!item.students.some((s) => s.name.toLowerCase() === cleanS.toLowerCase())) {
        item.students.push({ name: cleanS, program: sProg, email: sEmail });
      }
    };

    // 1. From database parent_student_links
    (parentStudentLinks || []).forEach((l: any) => {
      addLink(l.parent_name, l.student_name, l.parent_phone, l.student_program, l.student_email);
    });

    // 2. From aviRequests
    (aviRequests || []).forEach((a: any) => {
      addLink(a.parent_name, a.student_name, a.phone, a.student_program, a.email);
    });

    // 3. From incoming student applications (demandes)
    (demandes || []).forEach((d: any) => {
      if (d.parent_full_name) {
        addLink(d.parent_full_name, d.full_name, d.parent_phone, d.program, d.email);
      }
    });

    // 4. No demo seed links (clean workspace)

    return Array.from(map.values());
  }, [parentStudentLinks, aviRequests, demandes]);

  // Find linked students for current parentName
  const linkedStudents = useMemo(() => {
    const clean = parentName.trim().toLowerCase();
    if (!clean) return [];
    const found = parentsCatalog.find((p) => p.parent_name.toLowerCase() === clean);
    return found ? found.students : [];
  }, [parentName, parentsCatalog]);

  const handleParentNameChange = (newName: string) => {
    setParentName(newName);
    const clean = newName.trim().toLowerCase();
    const matched = parentsCatalog.find((p) => p.parent_name.toLowerCase() === clean);
    if (matched) {
      if (matched.parent_phone && (!phone || phone.includes('000 0000'))) {
        setPhone(matched.parent_phone);
      }
      if (matched.students.length === 1) {
        // Automatically populate Student Full Name field!
        setStudentName(matched.students[0].name);
        if (matched.students[0].program) {
          setStudentProgram(matched.students[0].program);
        }
        onNotify(
          isEn
            ? `Student auto-populated: ${matched.students[0].name} (linked to parent ${matched.parent_name})`
            : `Étudiant auto-rempli : ${matched.students[0].name} (rattaché au parent ${matched.parent_name})`
        );
      } else if (matched.students.length > 1) {
        // Multi-student selection needed
        onNotify(
          isEn
            ? `Multiple students linked to ${matched.parent_name}. Please choose the applicant below.`
            : `Plusieurs étudiants sont liés à ${matched.parent_name}. Veuillez choisir le candidat ci-dessous.`
        );
      }
    }
  };

  // Multiple-choice Financing Type ('classique' | 'partiel1' | 'partiel2')
  const [offerKey, setOfferKey] = useState<'classique' | 'partiel1' | 'partiel2'>('classique');

  // Real-time Market FX Rates & Tri-Currency Conversion Fields (EUR / USD / FCFA)
  const [eurUsdRate, setEurUsdRate] = useState<number>(1.087); // 1 EUR = 1.087 USD (so 1 USD ≈ 0.92 EUR)
  const [eurXafRate, setEurXafRate] = useState<number>(655.957); // Fixed parity 1 EUR = 655.957 XAF
  const [marketTimestamp, setMarketTimestamp] = useState<string>('Live Market FX');
  const [fetchingRates, setFetchingRates] = useState<boolean>(false);

  // Primary amount & 2 live conversion fields (EUR, USD, FCFA/XAF)
  const [amountEur, setAmountEur] = useState<number>(2800);
  const [amountUsd, setAmountUsd] = useState<number>(Math.round(2800 * 1.087 * 100) / 100);
  const [amountXaf, setAmountXaf] = useState<number>(Math.round(2800 * 655.957));

  // Supporting Documents attachment state
  const [selectedFilesCount, setSelectedFilesCount] = useState<number>(0);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [confirmAvi, setConfirmAvi] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch Real-Time Market Exchange Rate from public FX API
  const syncLiveMarketRates = useCallback(
    async (silent = false) => {
      setFetchingRates(true);
      try {
        const res = await fetch('https://open.er-api.com/v6/latest/EUR', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          const liveUsd = Number(data?.rates?.USD) || 1.087;
          const liveXaf = Number(data?.rates?.XAF) || 655.957;
          setEurUsdRate(Number(liveUsd.toFixed(4)));
          setEurXafRate(Number(liveXaf.toFixed(3)));
          setAmountUsd(Number((amountEur * liveUsd).toFixed(2)));
          setAmountXaf(Math.round(amountEur * liveXaf));
          const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          setMarketTimestamp(`${isEn ? 'Synced live at' : 'Synchronisé à'} ${nowStr}`);
          if (!silent) {
            onNotify(
              isEn
                ? `Live market rate synced: 1 EUR = ${liveUsd.toFixed(4)} USD | 1 EUR = ${liveXaf.toFixed(2)} FCFA`
                : `Taux du marché en temps réel synchronisé : 1 EUR = ${liveUsd.toFixed(4)} USD | 1 EUR = ${liveXaf.toFixed(2)} FCFA`
            );
          }
        }
      } catch {
        setMarketTimestamp(isEn ? 'Real-Time Market Benchmark Active' : 'Taux marché de référence actif');
      } finally {
        setFetchingRates(false);
      }
    },
    [amountEur, isEn, onNotify]
  );

  useEffect(() => {
    syncLiveMarketRates(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When Financing Type changes, adjust default amount to respect PDF rules & guarantor rule
  const handleSelectOffer = (nextKey: 'classique' | 'partiel1' | 'partiel2') => {
    setOfferKey(nextKey);
    let nextEur = amountEur;
    if (nextKey === 'classique' && amountEur > 3049) {
      nextEur = 2800; // 0 to 3,049 €
    } else if (nextKey === 'partiel1' && amountEur <= 3049) {
      nextEur = 3800; // > 3,049 €
      setOtherGuarantor(true); // France guarantor required
    } else if (nextKey === 'partiel2' && amountEur < 3049) {
      nextEur = 4500; // >= 3,049 € up to total AVI
      setOtherGuarantor(true); // France guarantor required
    }
    setAmountEur(nextEur);
    setAmountUsd(Number((nextEur * eurUsdRate).toFixed(2)));
    setAmountXaf(Math.round(nextEur * eurXafRate));
  };

  // Bi-directional currency handlers (EUR <-> USD <-> XAF)
  const handleEurChange = (valEur: number) => {
    const cleanEur = Math.max(0, valEur);
    setAmountEur(cleanEur);
    setAmountUsd(Number((cleanEur * eurUsdRate).toFixed(2)));
    setAmountXaf(Math.round(cleanEur * eurXafRate));
  };

  const handleUsdChange = (valUsd: number) => {
    const cleanUsd = Math.max(0, valUsd);
    setAmountUsd(cleanUsd);
    const derivedEur = eurUsdRate > 0 ? cleanUsd / eurUsdRate : 0;
    setAmountEur(Number(derivedEur.toFixed(2)));
    setAmountXaf(Math.round(derivedEur * eurXafRate));
  };

  const handleXafChange = (valXaf: number) => {
    const cleanXaf = Math.max(0, valXaf);
    setAmountXaf(cleanXaf);
    const derivedEur = eurXafRate > 0 ? cleanXaf / eurXafRate : 0;
    setAmountEur(Number(derivedEur.toFixed(2)));
    setAmountUsd(Number((derivedEur * eurUsdRate).toFixed(2)));
  };

  const selectedOffer = YIMMILINE_OFFERS[offerKey];
  const usdEurRate = eurUsdRate > 0 ? Number((1 / eurUsdRate).toFixed(4)) : 0.92;
  const usdXafRate = eurUsdRate > 0 ? Number((eurXafRate / eurUsdRate).toFixed(2)) : 603.48;

  // Total AVI Interest Paid according to PDF rate (12%, 6%, or 12%)
  const totalInterestEur = amountEur * selectedOffer.rate;
  const totalInterestUsd = totalInterestEur * eurUsdRate;
  const totalInterestXaf = totalInterestEur * eurXafRate;

  // Rule: Out of the interest amount paid to obtain the AVI, LIEC recovers 150 EUR on every file!
  const liecInterestEur = 150.0;
  const liecInterestUsd = liecInterestEur * eurUsdRate;
  const liecInterestXaf = liecInterestEur * eurXafRate;

  // Net interest remaining for YimmiLine partner after LIEC recovers 150 EUR
  const yimmilineNetInterestEur = Math.max(0, totalInterestEur - liecInterestEur);

  // Repayment calculations
  const totalRepayEur = amountEur + totalInterestEur;
  const monthlyRepayEur = totalRepayEur / selectedOffer.months;
  const monthlyRepayXaf = (totalRepayEur * eurXafRate) / selectedOffer.months;

  // Check amount compliance with PDF threshold
  const isAmountValidForOffer =
    offerKey === 'classique'
      ? amountEur >= 0 && amountEur <= 3049
      : offerKey === 'partiel1'
      ? amountEur > 3049
      : amountEur >= 3049;

  // Check Passport ID compliance: Starts with OP or PO + 9 digits (or 9 characters total starting with OP/PO)
  const cleanPassport = passportId.trim().toUpperCase();
  const isPassportValid = /^(OP|PO)(\d{7}|\d{9})$/.test(cleanPassport);

  const formatMoney = (val: number, curr: 'USD' | 'EUR') =>
    new Intl.NumberFormat(isEn ? 'en-US' : 'fr-FR', {
      style: 'currency',
      currency: curr,
      maximumFractionDigits: 2,
    }).format(Number.isFinite(val) ? val : 0);

  const formatXaf = (val: number) =>
    new Intl.NumberFormat(isEn ? 'en-US' : 'fr-FR', { maximumFractionDigits: 0 }).format(
      Number.isFinite(val) ? val : 0
    ) + ' FCFA (XAF)';

  const handleSubmitAvi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPassportValid) {
      onNotify(
        isEn
          ? 'Invalid Passport ID: Must start with OP or PO and respect 9 digits (e.g. OP123456789 or PO1234567).'
          : 'Numéro de passeport invalide : doit commencer par OP ou PO et respecter les 9 chiffres (ex: OP123456789 ou PO1234567).'
      );
      return;
    }
    if (!confirmAvi) {
      onNotify(
        isEn
          ? 'Please confirm the declaration before submitting the AVI application.'
          : 'Veuillez confirmer la déclaration avant de soumettre le dossier AVI.'
      );
      return;
    }
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length > 14) {
      onNotify(
        isEn
          ? 'Telephone / WhatsApp must be limited to a maximum of 14 digits.'
          : 'Le numéro de téléphone / WhatsApp ne peut pas dépasser 14 chiffres.'
      );
      return;
    }
    setSubmitting(true);
    try {
      await onCreateAvi({
        parent_name: parentName,
        country,
        town,
        nationality:
          nationalityDifferent.trim() ||
          (country === 'RDC' ? 'Congolese (DRC)' : 'Congolese (Congo-Brazzaville)'),
        physical_address: physicalAddress,
        occupation,
        phone,
        email,
        other_guarantor: otherGuarantor,
        guarantor_details: otherGuarantor ? guarantorDetails : 'Parent is primary borrower/guarantor',
        expected_start: startDate,
        student_name: studentName,
        student_program: studentProgram,
        student_id_doc: cleanPassport,
        offer_key: offerKey,
        principal_eur: amountEur,
        principal_usd: amountUsd,
        principal_xaf: amountXaf,
        usd_eur_rate: usdEurRate,
        usd_xaf_rate: usdXafRate,
        total_interest_eur: totalInterestEur,
        liec_fee_usd: liecInterestEur, // 150 EUR recovered by LIEC per file
        files_count: selectedFilesCount,
        supporting_docs: fileNames.join(', '),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Role & Module Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="rounded-full bg-[#ccf5e5] px-3 py-0.5 text-[10.5px] font-extrabold uppercase tracking-wider text-[#0c685a]">
              {isEn
                ? 'AVI FINANCING MODULE • ROLE: AVI OFFICER'
                : 'MODULE FINANCEMENT AVI • RÔLE : OFFICIER AVI'}
            </span>
            <span className="rounded-full bg-[#092342] text-white px-2.5 py-0.5 text-[10.5px] font-extrabold">
              {isEn ? 'Parent = Borrower' : 'Parent = Emprunteur'}
            </span>
            <span className="rounded-full bg-[#fef3c7] text-[#92400e] px-2.5 py-0.5 text-[10.5px] font-extrabold">
              {isEn
                ? 'LIEC Interest Recovery: €150 / File'
                : 'Récupération Intérêt LIEC : 150 € / Dossier'}
            </span>
          </div>
          <h1 className="text-[28px] font-extrabold text-[#092342] leading-tight">
            {isEn
              ? 'YIMMILINE AVI Prefinancing & Parent Registration'
              : 'Préfinancement AVI YIMMILINE & Enregistrement Parent'}
          </h1>
          <p className="mt-1 text-sm text-slate-500 max-w-3xl">
            {isEn
              ? 'Official YimmiLine AVI prefinancing desk (Classic 12% / 8 months, Partial 1 6% / 3 months, Partial 2 12% / 12 months). Out of the interest paid to obtain the AVI, LIEC recovers €150 EUR on every file.'
              : "Guichet officiel de préfinancement AVI YimmiLine (Classique 12% / 8 mois, Partiel 1 6% / 3 mois, Partiel 2 12% / 12 mois). Sur le montant d'intérêt payé pour l'obtention de l'AVI, LIEC récupère 150 € sur chaque dossier."}
          </p>
        </div>

        <button
          type="button"
          onClick={() => syncLiveMarketRates(false)}
          disabled={fetchingRates}
          className="inline-flex items-center gap-2 rounded-xl border border-[#ccece2] bg-[#eefaf6] hover:bg-[#d8f6ea] px-4 py-2.5 text-xs font-extrabold text-[#0c685a] transition self-start lg:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${fetchingRates ? 'animate-spin' : ''}`} />
          <span>
            {isEn ? 'Sync Real-Time Market FX Rate' : 'Synchroniser Taux Marché Temps Réel'}
          </span>
        </button>
      </div>

      {/* Main Unified Form for AVI Officer & Parent Registration */}
      <form onSubmit={handleSubmitAvi} className="space-y-6">
        {/* SECTION 1: MULTIPLE-CHOICE FINANCING TYPE & OFFICIAL YIMMILINE PDF RULES */}
        <div className="rounded-2xl border border-[#e6eef6] bg-white p-6 shadow-card space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3.5">
            <div>
              <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-[#0c685a]">
                {isEn
                  ? 'STEP 1 • MULTIPLE-CHOICE FINANCING TYPE & YIMMILINE PDF RULES'
                  : 'ÉTAPE 1 • CHOIX MULTIPLE DU TYPE DE FINANCEMENT & RÈGLES PDF YIMMILINE'}
              </span>
              <h2 className="text-lg font-extrabold text-[#092342]">
                {isEn
                  ? 'Select AVI Financing Type (Classic, Partial 1, Partial 2)'
                  : 'Sélectionner le Type de Préfinancement AVI (Classique, Partiel 1, Partiel 2)'}
              </h2>
            </div>

            {/* Multiple-Choice Dropdown Selector */}
            <div className="w-full sm:w-80">
              <label className="block text-[11px] font-extrabold text-slate-600 mb-1">
                {isEn
                  ? 'Financing Type (Multiple Choice) *'
                  : 'Type de financement (Choix multiple) *'}
              </label>
              <select
                value={offerKey}
                onChange={(e) =>
                  handleSelectOffer(e.target.value as 'classique' | 'partiel1' | 'partiel2')
                }
                className="w-full rounded-xl border-2 border-[#0c685a] bg-[#eefaf6] px-3.5 py-2.5 text-xs font-extrabold text-[#092342] focus:outline-none cursor-pointer"
              >
                <option value="classique">
                  1. {isEn ? 'Classic (Classique) — 12% · 08 Months (0 to €3,049)' : 'Classique — 12% · 08 Mois (0 à 3 049 €)'}
                </option>
                <option value="partiel1">
                  2. {isEn ? 'Partial 1 (Partiel 1) — 6% · 03 Months (> €3,049)' : 'Partiel 1 — 6% · 03 Mois (> 3 049 €)'}
                </option>
                <option value="partiel2">
                  3. {isEn ? 'Partial 2 (Partiel 2) — 12% · 12 Months (Up to Total AVI)' : 'Partiel 2 — 12% · 12 Mois (Préfinancement Total AVI)'}
                </option>
              </select>
            </div>
          </div>

          {/* 3 Interactive Multiple-Choice Offer Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['classique', 'partiel1', 'partiel2'] as const).map((key) => {
              const o = YIMMILINE_OFFERS[key];
              const active = offerKey === key;
              return (
                <div
                  key={key}
                  onClick={() => handleSelectOffer(key)}
                  className={`cursor-pointer rounded-2xl border p-5 transition space-y-2.5 ${
                    active
                      ? 'border-2 border-[#0c685a] bg-[#eefaf6] shadow-sm'
                      : 'border-[#e6eef6] bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-extrabold text-[#092342]">
                      {isEn ? o.nameEn : o.nameFr}
                    </h3>
                    <input
                      type="radio"
                      name="avi_offer_choice"
                      checked={active}
                      onChange={() => handleSelectOffer(key)}
                      className="h-4 w-4 text-[#0c685a]"
                    />
                  </div>
                  <p className="text-xs font-semibold text-slate-600">
                    {isEn ? o.amountLabelEn : o.amountLabelFr}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold text-[#0c685a]">
                      {Math.round(o.rate * 100)}%
                    </span>
                    <span className="text-xs font-bold text-[#092342]">
                      • {o.months} {isEn ? 'months repayment' : 'mois pour remboursement'}
                    </span>
                  </div>
                  {o.personalContributionEn && (
                    <div className="rounded-lg bg-[#fef3c7] px-2.5 py-1 text-[10.5px] font-extrabold text-[#92400e]">
                      {isEn ? o.personalContributionEn : o.personalContributionFr}
                    </div>
                  )}
                  <span className="inline-block rounded-full bg-[#e6effa] px-2.5 py-1 text-[10.5px] font-extrabold text-[#092342]">
                    {isEn ? o.guarantorRuleEn : o.guarantorRuleFr}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Official YimmiLine PDF Conditions Box for the Selected Offer */}
          <div className="rounded-2xl border border-[#ccece2] bg-[#f8fbff] p-5 space-y-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-extrabold text-[#092342] text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#0c685a]" />
                <span>
                  {isEn
                    ? `Official Eligibility Rules — ${selectedOffer.nameEn}`
                    : `Règles d'Obtention Officielles — ${selectedOffer.nameFr}`}
                </span>
              </div>
              <span className="rounded-full bg-[#ccf5e5] px-3 py-0.5 text-[10.5px] font-extrabold text-[#0c685a]">
                {Math.round(selectedOffer.rate * 100)}% • {selectedOffer.months}{' '}
                {isEn ? 'Months' : 'Mois'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl bg-white p-3.5 border border-[#e6eef6] space-y-1.5">
                <div className="text-[10.5px] font-extrabold uppercase tracking-wider text-[#0c685a]">
                  {isEn ? 'GENERAL CONDITIONS' : 'CONDITIONS GÉNÉRALES'}
                </div>
                <p className="text-slate-700 leading-relaxed font-medium">
                  {isEn ? selectedOffer.generalCondEn : selectedOffer.generalCondFr}
                </p>
                {selectedOffer.personalContributionEn && (
                  <p className="text-[#92400e] font-extrabold pt-1">
                    • {isEn ? selectedOffer.personalContributionEn : selectedOffer.personalContributionFr}
                  </p>
                )}
              </div>

              <div className="rounded-xl bg-white p-3.5 border border-[#e6eef6] space-y-1.5">
                <div className="text-[10.5px] font-extrabold uppercase tracking-wider text-[#092342]">
                  {isEn ? 'SPECIFIC CONDITIONS BY PROFILE' : 'CONDITIONS SPÉCIFIQUES PAR PROFIL'}
                </div>
                <ul className="space-y-1 text-slate-700">
                  <li>
                    • <strong>{isEn ? 'Salaried:' : 'Salarié :'}</strong>{' '}
                    {isEn
                      ? selectedOffer.specificCondEn.salaried
                      : selectedOffer.specificCondFr.salaried}
                  </li>
                  <li>
                    • <strong>{isEn ? 'Entrepreneur:' : 'Entrepreneur :'}</strong>{' '}
                    {isEn
                      ? selectedOffer.specificCondEn.entrepreneur
                      : selectedOffer.specificCondFr.entrepreneur}
                  </li>
                  <li>
                    • <strong>{isEn ? 'Informal:' : 'Informel :'}</strong>{' '}
                    {isEn
                      ? selectedOffer.specificCondEn.informal
                      : selectedOffer.specificCondFr.informal}
                  </li>
                </ul>
              </div>
            </div>

            <div className="rounded-xl border border-[#fde6b8] bg-[#fffbeb] p-3 text-[#784e06] font-semibold">
              {isEn ? selectedOffer.nbNoteEn : selectedOffer.nbNoteFr}
            </div>
          </div>

          {/* Dynamic Financial Fields Added Depending on Chosen Financing Type */}
          <div className="pt-2 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-sm font-extrabold text-[#092342] flex items-center gap-2">
                <Calculator className="w-4 h-4 text-[#0c685a]" />
                <span>
                  {isEn
                    ? 'Dynamic Financial Fields: Real-Time Market Rate, USD / EUR / FCFA Conversions & LIEC Interest (€150 Recovered)'
                    : 'Champs Financiers Dynamiques : Taux du Marché en Temps Réel, Conversions USD / EUR / FCFA & Intérêt LIEC (150 € Récupérés)'}
                </span>
              </h3>
              <span className="text-[11px] font-extrabold text-[#0c685a] bg-[#eefaf6] px-2.5 py-1 rounded-lg border border-[#ccece2]">
                🟢 {marketTimestamp}
              </span>
            </div>

            {/* Row 1: Real-time market rate fields & LIEC Interest fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isEn
                    ? 'Real-Time Market Rate (1 EUR → USD)'
                    : 'Taux Marché Temps Réel (1 EUR → USD)'}
                </label>
                <input
                  type="number"
                  step="any"
                  min={0}
                  value={eurUsdRate}
                  onChange={(e) => {
                    const r = Number(e.target.value) || 0;
                    setEurUsdRate(r);
                    setAmountUsd(Number((amountEur * r).toFixed(2)));
                  }}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 font-extrabold text-[#092342]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isEn
                    ? 'Real-Time Market Rate (1 EUR → FCFA)'
                    : 'Taux Marché Temps Réel (1 EUR → FCFA)'}
                </label>
                <input
                  type="number"
                  step="any"
                  min={0}
                  value={eurXafRate}
                  onChange={(e) => {
                    const r = Number(e.target.value) || 0;
                    setEurXafRate(r);
                    setAmountXaf(Math.round(amountEur * r));
                  }}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 font-extrabold text-[#092342]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isEn
                    ? `Total AVI Interest (${Math.round(selectedOffer.rate * 100)}%)`
                    : `Intérêt Total AVI (${Math.round(selectedOffer.rate * 100)}%)`}
                </label>
                <input
                  type="text"
                  readOnly
                  value={`${formatMoney(totalInterestEur, 'EUR')} (${formatMoney(
                    totalInterestUsd,
                    'USD'
                  )})`}
                  className="w-full rounded-xl border border-[#ccece2] bg-[#eefaf6] px-3.5 py-2.5 font-extrabold text-[#0c685a]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#92400e] mb-1">
                  {isEn
                    ? 'LIEC Interest Recovered / File (Fixed)'
                    : 'Intérêt LIEC Récupéré / Dossier (Fixe)'}
                </label>
                <input
                  type="text"
                  readOnly
                  value={`150.00 € (${formatMoney(liecInterestUsd, 'USD')} / ${Math.round(
                    liecInterestXaf
                  ).toLocaleString()} XAF)`}
                  className="w-full rounded-xl border-2 border-[#f4be37] bg-[#fffbeb] px-3.5 py-2.5 font-extrabold text-[#784e06]"
                />
              </div>
            </div>

            {/* Row 2: Three Interactive Currency Conversion Fields (Euros, Dollars, FCFA) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Field 1: Euros (EUR) */}
              <div className="rounded-2xl border-2 border-[#0c685a] bg-[#eefaf6] p-4 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-extrabold uppercase text-[#0c685a]">
                    {isEn ? '1. PREFINANCED AMOUNT (EUR €)' : '1. MONTANT PRÉFINANCÉ (EUR €)'}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500">
                    {isEn ? selectedOffer.amountLabelEn : selectedOffer.amountLabelFr}
                  </span>
                </div>
                <input
                  type="number"
                  step="any"
                  min={0}
                  value={amountEur}
                  onChange={(e) => handleEurChange(Number(e.target.value) || 0)}
                  className="w-full rounded-xl border border-[#0c685a]/40 bg-white px-3.5 py-2 text-lg font-extrabold text-[#092342]"
                />
                {!isAmountValidForOffer && (
                  <p className="text-[11px] font-bold text-amber-700">
                    ⚠️{' '}
                    {isEn
                      ? `Note: ${selectedOffer.nameEn} rule specifies ${selectedOffer.amountLabelEn}.`
                      : `Note : La règle ${selectedOffer.nameFr} prévoit ${selectedOffer.amountLabelFr}.`}
                  </p>
                )}
              </div>

              {/* Extra Conversion Field A: US Dollars (USD $) */}
              <div className="rounded-2xl border border-[#e6eef6] bg-[#f8fbff] p-4 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-extrabold uppercase text-[#092342]">
                    {isEn
                      ? '2. CONVERSION IN US DOLLARS (USD $)'
                      : '2. CONVERSION EN DOLLARS (USD $)'}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    1 EUR = {eurUsdRate} USD
                  </span>
                </div>
                <input
                  type="number"
                  step="any"
                  min={0}
                  value={amountUsd}
                  onChange={(e) => handleUsdChange(Number(e.target.value) || 0)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-lg font-extrabold text-[#092342]"
                />
                <span className="text-[11px] text-slate-500 block">
                  {isEn
                    ? `Total Interest in USD: ${formatMoney(totalInterestUsd, 'USD')}`
                    : `Intérêt total en USD : ${formatMoney(totalInterestUsd, 'USD')}`}
                </span>
              </div>

              {/* Extra Conversion Field B: FCFA (XAF) */}
              <div className="rounded-2xl border border-[#fde6b8] bg-[#fffbeb] p-4 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-extrabold uppercase text-[#92400e]">
                    {isEn ? '3. CONVERSION IN FCFA (XAF)' : '3. CONVERSION EN FCFA (XAF)'}
                  </span>
                  <span className="text-[10px] font-bold text-[#92400e]">
                    1 EUR = {eurXafRate} XAF
                  </span>
                </div>
                <input
                  type="number"
                  step="any"
                  min={0}
                  value={amountXaf}
                  onChange={(e) => handleXafChange(Number(e.target.value) || 0)}
                  className="w-full rounded-xl border border-[#f4be37] bg-white px-3.5 py-2 text-lg font-extrabold text-[#784e06]"
                />
                <span className="text-[11px] text-[#784e06] block">
                  {isEn
                    ? `Total Interest in FCFA: ${formatXaf(totalInterestXaf)}`
                    : `Intérêt total en FCFA : ${formatXaf(totalInterestXaf)}`}
                </span>
              </div>
            </div>

            {/* Summary Strip of Interest Distribution (LIEC €150 vs YimmiLine) & Monthly Installment */}
            <div className="rounded-2xl bg-[#092342] text-white p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-300 text-[10.5px] uppercase font-bold block">
                  {isEn ? 'Total Interest Paid by Parent' : 'Intérêt Total Payé par le Parent'}
                </span>
                <div className="text-lg font-extrabold text-[#2dd4bf] mt-0.5">
                  {formatMoney(totalInterestEur, 'EUR')} ({Math.round(selectedOffer.rate * 100)}%)
                </div>
                <span className="text-[11px] text-slate-300">{formatXaf(totalInterestXaf)}</span>
              </div>

              <div>
                <span className="text-[#f4be37] text-[10.5px] uppercase font-extrabold block">
                  {isEn ? 'LIEC Interest Share (Per File)' : 'Part Intérêt LIEC (Par Dossier)'}
                </span>
                <div className="text-lg font-extrabold text-[#f4be37] mt-0.5">150.00 € EUR</div>
                <span className="text-[11px] text-slate-300">
                  ≈ {formatMoney(liecInterestUsd, 'USD')} • {formatXaf(liecInterestXaf)}
                </span>
              </div>

              <div>
                <span className="text-slate-300 text-[10.5px] uppercase font-bold block">
                  {isEn ? 'Net Partner Interest (YimmiLine)' : 'Intérêt Net Partenaire (YimmiLine)'}
                </span>
                <div className="text-lg font-extrabold text-white mt-0.5">
                  {formatMoney(yimmilineNetInterestEur, 'EUR')}
                </div>
                <span className="text-[11px] text-slate-300">
                  {isEn ? 'After €150 LIEC deduction' : 'Après déduction des 150 € LIEC'}
                </span>
              </div>

              <div>
                <span className="text-slate-300 text-[10.5px] uppercase font-bold block">
                  {isEn
                    ? `Monthly Repayment (${selectedOffer.months} Months)`
                    : `Mensualité (${selectedOffer.months} Mois)`}
                </span>
                <div className="text-lg font-extrabold text-[#6ee7b7] mt-0.5">
                  {formatMoney(monthlyRepayEur, 'EUR')} / {isEn ? 'mo' : 'mois'}
                </div>
                <span className="text-[11px] text-slate-300">
                  ≈ {formatXaf(monthlyRepayXaf)} / {isEn ? 'mo' : 'mois'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: PARENT AVI REGISTRATION FORM (DESTINED FOR THE PARENT BORROWER) */}
        <div className="rounded-2xl border border-[#e6eef6] bg-white p-6 shadow-card space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3.5">
            <div>
              <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-[#0c685a]">
                {isEn
                  ? 'STEP 2 • PARENT AVI REGISTRATION FORM (BORROWER INFORMATION)'
                  : "ÉTAPE 2 • FORMULAIRE D'ENREGISTREMENT DEMANDE AVI (DESTINÉ AU PARENT)"}
              </span>
              <h2 className="text-lg font-extrabold text-[#092342]">
                {isEn
                  ? 'Parent Borrower Information, Guarantor & Passport Verification'
                  : 'Informations du Parent Emprunteur, Garant du Prêt & Passeport'}
              </h2>
            </div>
            <span className="rounded-lg bg-[#f1f6fb] px-3 py-1 text-xs font-extrabold text-[#092342]">
              {isEn ? 'Mandatory Parent Form' : 'Formulaire Parent Obligatoire'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            {/* 1. Parent Full Name */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block font-bold text-slate-700">
                  {isEn ? '1. Parent Full Name *' : '1. Nom complet du parent *'}
                </label>
                {linkedStudents.length === 1 && (
                  <span className="text-[10px] font-extrabold text-[#0c685a] bg-[#eefaf6] px-2 py-0.5 rounded-md border border-[#ccece2]">
                    ✓ {isEn ? 'Student linked' : 'Étudiant lié'}
                  </span>
                )}
                {linkedStudents.length > 1 && (
                  <span className="text-[10px] font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    ⚠️ {linkedStudents.length} {isEn ? 'students linked' : 'étudiants liés'}
                  </span>
                )}
              </div>

              {/* Existing parent quick-select dropdown */}
              {parentsCatalog.length > 0 && (
                <select
                  value={parentsCatalog.some((p) => p.parent_name.toLowerCase() === parentName.trim().toLowerCase()) ? parentName : ''}
                  onChange={(e) => {
                    if (e.target.value) handleParentNameChange(e.target.value);
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-medium text-slate-600 focus:bg-white transition"
                >
                  <option value="">
                    {isEn ? '— Select from existing parents to auto-populate —' : '— Choisir parmi les parents existants pour auto-remplir —'}
                  </option>
                  {parentsCatalog.map((p) => (
                    <option key={p.parent_name} value={p.parent_name}>
                      👤 {p.parent_name} ({p.students.map((s) => s.name).join(', ')})
                    </option>
                  ))}
                </select>
              )}

              <input
                type="text"
                required
                list="parents-catalog-datalist"
                value={parentName}
                onChange={(e) => handleParentNameChange(e.target.value)}
                placeholder={isEn ? 'Type parent name or select above' : 'Saisir le nom du parent ou choisir ci-dessus'}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 font-semibold text-[#092342]"
              />
              <datalist id="parents-catalog-datalist">
                {parentsCatalog.map((p) => (
                  <option key={p.parent_name} value={p.parent_name} />
                ))}
              </datalist>

              {linkedStudents.length === 1 && (
                <p className="text-[10.5px] font-semibold text-[#0c685a]">
                  ✓ {isEn ? 'Linked Student auto-populated: ' : 'Étudiant lié auto-rempli : '}
                  <strong>{linkedStudents[0].name}</strong>
                </p>
              )}
            </div>

            {/* 2. Profession (Free Text Field) */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {isEn
                  ? '2. Parent Profession (Free Text Field) *'
                  : '2. Profession du parent (Champ libre) *'}
              </label>
              <input
                type="text"
                required
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                placeholder={
                  isEn
                    ? 'Type parent profession freely (e.g. Civil Engineer, Merchant...)'
                    : 'Saisie libre de la profession du parent...'
                }
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 font-semibold text-[#092342]"
              />
            </div>

            {/* 3. Student Full Name */}
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700">
                {isEn ? '3. Student Full Name *' : "3. Nom complet de l'étudiant *"}
              </label>

              {/* Multi-student selection if parent has multiple children */}
              {linkedStudents.length > 1 && (
                <div className="p-2.5 rounded-xl bg-amber-50/90 border border-amber-200 space-y-1.5">
                  <span className="text-[10.5px] font-extrabold text-amber-900 block">
                    {isEn
                      ? `Select applicant linked to ${parentName}:`
                      : `Sélectionnez l’étudiant lié à ${parentName} :`}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {linkedStudents.map((st) => (
                      <button
                        key={st.name}
                        type="button"
                        onClick={() => {
                          setStudentName(st.name);
                          if (st.program) setStudentProgram(st.program);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                          studentName.toLowerCase() === st.name.toLowerCase()
                            ? 'bg-[#0c685a] text-white shadow-xs'
                            : 'bg-white border border-amber-300 text-amber-900 hover:bg-amber-100'
                        }`}
                      >
                        <span>🎓 {st.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <input
                type="text"
                required
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder={isEn ? 'e.g. Gloire Mutombo' : 'Ex: Gloire Mutombo'}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 font-semibold text-[#092342]"
              />

              {linkedStudents.length === 1 && studentName.toLowerCase() === linkedStudents[0].name.toLowerCase() && (
                <p className="text-[10.5px] font-semibold text-[#0c685a]">
                  ✓ {isEn ? 'Verified applicant relationship with parent' : 'Filiation candidat vérifiée avec le parent'}
                </p>
              )}
            </div>

            {/* 4. Physical Address */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {isEn ? '4. Parent Physical Address *' : '4. Adresse physique du parent *'}
              </label>
              <input
                type="text"
                required
                value={physicalAddress}
                onChange={(e) => setPhysicalAddress(e.target.value)}
                placeholder={
                  isEn
                    ? 'Street, Quarter, Commune, City'
                    : 'Numéro, Avenue, Quartier, Commune'
                }
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5"
              />
            </div>

            {/* 5. Telephone */}
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>{isEn ? '5. Telephone / WhatsApp *' : '5. Téléphone / WhatsApp *'}</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  {phone.replace(/\D/g, '').length}/14 {isEn ? 'digits max' : 'chiffres max'}
                </span>
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.replace(/\D/g, '').length <= 14) {
                    setPhone(val);
                  }
                }}
                maxLength={18}
                placeholder="+243 ... / +242 ..."
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5"
              />
            </div>

            {/* 6. Email Address */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {isEn ? '6. Parent Email Address *' : '6. Adresse mail du parent *'}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="parent@email.com"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5"
              />
            </div>

            {/* 7. Country */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {isEn ? '7. Country (DRC / Congo-Brazzaville) *' : '7. Pays (RDC / Congo-Brazzaville) *'}
              </label>
              <select
                value={country}
                onChange={(e) => {
                  const val = e.target.value;
                  setCountry(val);
                  setTown(val === 'RDC' ? 'Kinshasa' : 'Brazzaville');
                }}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 bg-white font-semibold text-[#092342]"
              >
                <option value="RDC">🇨🇩 {isEn ? 'DRC (Democratic Republic of the Congo)' : 'RDC (République Démocratique du Congo)'}</option>
                <option value="Congo-Brazzaville">🇨🇬 {isEn ? 'Congo-Brazzaville (Republic of the Congo)' : 'Congo-Brazzaville'}</option>
              </select>
            </div>

            {/* 8. City */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {isEn ? '8. City *' : '8. Ville *'}
              </label>
              <input
                type="text"
                required
                value={town}
                onChange={(e) => setTown(e.target.value)}
                placeholder={country === 'RDC' ? 'Kinshasa / Lubumbashi / Goma' : 'Brazzaville / Pointe-Noire'}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5"
              />
            </div>

            {/* 9. Nationality if different */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {isEn ? '9. Nationality (if different)' : '9. Nationalité (si différente)'}
              </label>
              <input
                type="text"
                value={nationalityDifferent}
                onChange={(e) => setNationalityDifferent(e.target.value)}
                placeholder={
                  isEn
                    ? 'Leave blank if same as country, or specify...'
                    : 'Laisser vide si identique au pays, ou préciser...'
                }
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5"
              />
            </div>

            {/* 10. Study Program to Pursue (6 Partner Schools in Lyon) */}
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">
                {isEn
                  ? '10. Study Program to Pursue (6 Partner Schools in Lyon) *'
                  : '10. Étude à faire (6 Écoles Partenaires à Lyon) *'}
              </label>
              <select
                value={studentProgram}
                onChange={(e) => setStudentProgram(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 bg-white font-semibold text-[#0c685a]"
              >
                <option value="ISCOM Lyon — Communication, Advertising, Marketing & Events">
                  1. ISCOM Lyon — {isEn ? 'Communication, Advertising, Marketing & Events' : 'Communication, publicité, marketing et événementiel'}
                </option>
                <option value="MyDigitalSchool Lyon — Web Development, Digital Creation, Webmarketing & UX/UI Design">
                  2. MyDigitalSchool Lyon — {isEn ? 'Web Development, Digital Creation, Webmarketing & UX/UI Design' : 'Développement web, création numérique, webmarketing et UX/UI design'}
                </option>
                <option value="École Internationale Tunon Lyon — Tourism, Hospitality, Public Relations & Events">
                  3. École Internationale Tunon Lyon — {isEn ? 'Tourism, Hospitality, Public Relations & Events' : 'Tourisme, hôtellerie, relations publiques et événementiel'}
                </option>
                <option value="IHECF Lyon — Accounting, Chartered Accountancy, Finance & Management Control">
                  4. IHECF Lyon — {isEn ? 'Accounting, Chartered Accountancy, Finance & Management Control' : 'Comptabilité, expertise comptable, finance et contrôle de gestion'}
                </option>
                <option value="Ipac Bachelor Factory Lyon — Business, Management, Finance, Communication & Logistics">
                  5. Ipac Bachelor Factory Lyon — {isEn ? 'Business, Management, Finance, Communication & Logistics' : 'Commerce, gestion, finance, communication et logistique'}
                </option>
                <option value="MBway Lyon — Management, Entrepreneurship, HR, Finance & International Trade">
                  6. MBway Lyon — {isEn ? 'Management, Entrepreneurship, HR, Finance & International Trade' : 'Management, entrepreneuriat, RH, finance et commerce international'}
                </option>
              </select>
            </div>

            {/* 11. Passport ID Number (9 digits starting with OP or PO) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-700">
                  {isEn
                    ? '11. Passport ID Number (OP / PO + 9 digits) *'
                    : '11. N° ID Passeport (OP / PO + 9 digits) *'}
                </label>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                    isPassportValid
                      ? 'bg-[#ccf5e5] text-[#0c685a]'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {isPassportValid
                    ? isEn
                      ? '✓ Valid OP/PO Format'
                      : '✓ Format OP/PO Valide'
                    : isEn
                    ? 'Must start with OP or PO'
                    : 'Doit commencer par OP ou PO'}
                </span>
              </div>
              <input
                type="text"
                required
                maxLength={11}
                value={passportId}
                onChange={(e) => setPassportId(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                placeholder="OP123456789 or PO1234567"
                className={`w-full rounded-xl border px-3.5 py-2.5 font-mono font-extrabold ${
                  isPassportValid
                    ? 'border-[#0c685a] bg-[#eefaf6] text-[#092342]'
                    : 'border-red-400 bg-red-50 text-red-800'
                }`}
              />
              <span className="text-[10.5px] text-slate-400 mt-0.5 block">
                {isEn
                  ? 'Rule: Starts with OP or PO + 9 digits (e.g. OP123456789 or 9 chars OP1234567)'
                  : 'Règle : Commence par OP ou PO + 9 chiffres (ex: OP123456789 ou 9 caract. OP1234567)'}
              </span>
            </div>
          </div>

          {/* 12. Loan Guarantor if Other (True / False field -> Opens manual input field if True) */}
          <div className="rounded-2xl border border-[#e6eef6] bg-[#f8fbff] p-4 space-y-3 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <label className="font-extrabold text-[#092342] text-sm block">
                  {isEn
                    ? '12. Loan Guarantor if Other (True / False) *'
                    : '12. Garant du prêt si autre (Champ True / False) *'}
                </label>
                <p className="text-slate-500 text-xs">
                  {isEn
                    ? 'If True, a manual input field opens to enter the third-party guarantor information (mandatory in France for Partial 1 & Partial 2).'
                    : 'Si Vrai (True), ouvre un nouveau champ pour la saisie manuelle des informations du garant tiers (obligatoire en France pour Partiel 1 & Partiel 2).'}
                </p>
              </div>

              <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setOtherGuarantor(true)}
                  className={`rounded-lg px-4 py-2 text-xs font-extrabold transition ${
                    otherGuarantor
                      ? 'bg-[#0c685a] text-white shadow-sm'
                      : 'text-slate-600 hover:text-[#092342]'
                  }`}
                >
                  {isEn ? 'TRUE (Yes — Other Guarantor)' : 'TRUE (Vrai — Autre Garant)'}
                </button>
                <button
                  type="button"
                  onClick={() => setOtherGuarantor(false)}
                  className={`rounded-lg px-4 py-2 text-xs font-extrabold transition ${
                    !otherGuarantor
                      ? 'bg-[#092342] text-white shadow-sm'
                      : 'text-slate-600 hover:text-[#092342]'
                  }`}
                >
                  {isEn ? 'FALSE (No — Parent Only)' : 'FALSE (Faux — Parent Seul)'}
                </button>
              </div>
            </div>

            {otherGuarantor && (
              <div className="pt-2 border-t border-slate-200/80 space-y-2 animate-fadeIn">
                <label className="block font-extrabold text-[#0c685a]">
                  {isEn
                    ? 'Manual Entry: Full Details of the Loan Guarantor (Name, Residence in France/Local, Profession, N-1 Income & Collateral) *'
                    : 'Saisie Manuelle : Informations complètes du Garant du prêt (Nom, Résidence France/Local, Profession, Revenus N-1 & Garantie) *'}
                </label>
                <textarea
                  rows={2}
                  required={otherGuarantor}
                  value={guarantorDetails}
                  onChange={(e) => setGuarantorDetails(e.target.value)}
                  placeholder={
                    isEn
                      ? 'Enter guarantor full name, address in France or locally, phone, occupation, N-1 income, and caution check details...'
                      : 'Saisir manuellement le nom complet du garant, adresse (France ou local), téléphone, profession, revenus N-1 et chèques de caution...'
                  }
                  className="w-full rounded-xl border-2 border-[#0c685a] bg-white p-3 text-xs font-medium text-[#092342]"
                />
              </div>
            )}
          </div>

          {/* 13. Supporting Documents Field (To Attach) + Profile Specific Checklist */}
          <div className="space-y-3 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="font-extrabold text-[#092342] text-sm">
                {isEn
                  ? '13. Supporting Documents to Attach (Justificatifs à attacher) *'
                  : '13. Champ Justificatifs (Pièces justificatives à attacher) *'}
              </label>

              {/* Helper switcher to highlight specific PDF document rules */}
              <div className="inline-flex items-center gap-1.5 bg-[#f1f6fb] p-1 rounded-xl">
                {(
                  [
                    { id: 'salaried', en: 'Salaried Rules', fr: 'Règles Salarié' },
                    { id: 'entrepreneur', en: 'Entrepreneur Rules', fr: 'Règles Entrepreneur' },
                    { id: 'informal', en: 'Informal Rules', fr: 'Règles Informel' },
                  ] as const
                ).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setOccupationProfile(p.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition ${
                      occupationProfile === p.id
                        ? 'bg-[#092342] text-white'
                        : 'text-slate-600 hover:text-[#092342]'
                    }`}
                  >
                    {isEn ? p.en : p.fr}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <label className="rounded-xl border border-slate-200 p-3 flex items-center gap-2.5 bg-[#f8fbff]">
                <input type="checkbox" defaultChecked className="h-4 w-4 text-[#0c685a] rounded" />
                <span className="font-semibold text-[#092342]">
                  {isEn
                    ? `Valid Passport ID (${cleanPassport}) & Lyon Partner School Admission`
                    : `Passeport valide (${cleanPassport}) & Attestation d'admission École Lyon`}
                </span>
              </label>

              <label className="rounded-xl border border-[#ccece2] bg-[#eefaf6] p-3 flex items-center gap-2.5">
                <input type="checkbox" defaultChecked className="h-4 w-4 text-[#0c685a] rounded" />
                <span className="font-bold text-[#0c685a]">
                  {isEn
                    ? selectedOffer.specificCondEn[occupationProfile]
                    : selectedOffer.specificCondFr[occupationProfile]}
                </span>
              </label>

              {(offerKey !== 'classique' || otherGuarantor) && (
                <label className="rounded-xl border border-[#fde6b8] bg-[#fffbeb] p-3 flex items-center gap-2.5 md:col-span-2">
                  <input type="checkbox" defaultChecked className="h-4 w-4 text-[#0c685a] rounded" />
                  <span className="font-bold text-[#784e06]">
                    {isEn
                      ? 'France Guarantor Documents: Security deposit checks (chèques de caution) + Sworn statement (attestation sur l’honneur) + Last 3 months payslips & N-1 bank history'
                      : "Pièces Garant en France : Chèques de caution + Attestation sur l'honneur + 3 dernières fiches de paie & Historique bancaire N-1"}
                  </span>
                </label>
              )}
            </div>

            {/* File Attachment Dropzone */}
            <div className="rounded-2xl border-2 border-dashed border-[#0c685a]/50 bg-[#f8fbff] p-5 text-center space-y-2">
              <Upload className="w-6 h-6 text-[#0c685a] mx-auto" />
              <div className="text-xs font-extrabold text-[#092342]">
                {isEn
                  ? 'Attach Supporting Documents (Payslips, Balance Sheet, Bank History N-1, Caution Checks, Passport)'
                  : 'Joindre les pièces justificatives (Fiches de paie, Bilan, Historique bancaire N-1, Chèques de caution, Passeport)'}
              </div>
              <input
                type="file"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length > 0) {
                    setSelectedFilesCount(files.length);
                    setFileNames(files.map((f) => f.name));
                  }
                }}
                className="text-xs text-slate-500 mx-auto block cursor-pointer"
              />
              <div className="text-[11px] font-bold text-[#0c685a]">
                📎 {selectedFilesCount} {isEn ? 'files attached:' : 'fichiers joints :'}{' '}
                {fileNames.join(' · ')}
              </div>
            </div>
          </div>

          {/* Declaration & Submit Button */}
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <label className="flex items-start gap-2.5 text-xs text-slate-600 cursor-pointer max-w-2xl">
              <input
                type="checkbox"
                checked={confirmAvi}
                onChange={(e) => setConfirmAvi(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded text-[#0c685a]"
              />
              <span>
                {isEn
                  ? `I confirm that all parent borrower information, Passport ID (${cleanPassport}), and attached supporting documents comply with the YimmiLine ${selectedOffer.nameEn} rules, and that LIEC recovers €150 EUR on the AVI interest paid.`
                  : `Je confirme que les informations du parent emprunteur, le N° Passeport (${cleanPassport}) et les justificatifs respectent les conditions ${selectedOffer.nameFr}, et que LIEC récupère 150 € sur l'intérêt AVI payé.`}
              </span>
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-[#0c685a] hover:bg-[#095247] text-white px-6 py-3 text-xs font-extrabold shadow-sm transition shrink-0"
            >
              {submitting
                ? isEn
                  ? 'Submitting to PostgreSQL...'
                  : 'Enregistrement PostgreSQL...'
                : isEn
                ? 'Submit Parent AVI Application →'
                : 'Enregistrer la Demande AVI Parent →'}
            </button>
          </div>
        </div>
      </form>

      {/* AVI Requests Register Table */}
      <div className="rounded-2xl border border-[#e6eef6] bg-white p-6 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-[#092342]">
              {isEn
                ? 'AVI Prefinancing Applications Register (YIMMILINE & LIEC €150 Cut)'
                : 'Registre des Demandes de Préfinancement AVI (YIMMILINE & Part LIEC 150 €)'}
            </h2>
            <p className="text-xs text-slate-500">
              {isEn
                ? 'Parent borrower dossiers stored in PostgreSQL with multi-currency conversions, OP/PO Passport ID, and €150 LIEC interest recovery.'
                : 'Dossiers parents enregistrés dans PostgreSQL avec conversions tri-devises, ID Passeport OP/PO et récupération LIEC de 150 €.'}
            </p>
          </div>
          <span className="rounded-full bg-[#ccf5e5] px-3 py-1 text-xs font-extrabold text-[#0c685a]">
            {aviRequests.length} {isEn ? 'active files' : 'dossiers actifs'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-y border-slate-100 bg-[#f8fafc] text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-3">{isEn ? 'REF & PASSPORT' : 'RÉF & PASSEPORT'}</th>
                <th className="py-3 px-3">{isEn ? 'PARENT BORROWER' : 'PARENT EMPRUNTEUR'}</th>
                <th className="py-3 px-3">{isEn ? 'STUDENT & LYON SCHOOL' : 'ÉTUDIANT & ÉCOLE LYON'}</th>
                <th className="py-3 px-3">{isEn ? 'FINANCING TYPE' : 'TYPE FINANCEMENT'}</th>
                <th className="py-3 px-3">{isEn ? 'AMOUNT (EUR / USD / XAF)' : 'MONTANT (EUR / USD / XAF)'}</th>
                <th className="py-3 px-3">{isEn ? 'TOTAL INTEREST & LIEC €150' : 'INTÉRÊT & PART LIEC 150 €'}</th>
                <th className="py-3 px-3">{isEn ? 'STATUS' : 'STATUT'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {aviRequests.map((req) => {
                const eurVal =
                  Number(req.principal_eur) ||
                  Number(req.principal_usd || 3000) * Number(req.usd_eur_rate || 0.92);
                const usdVal = Number(req.principal_usd) || eurVal * 1.087;
                const xafVal = Number(req.principal_xaf) || eurVal * 655.957;
                const ratePct = Number(req.interest_rate) || 12;
                const totIntEur = Number(req.total_interest_eur) || eurVal * (ratePct / 100);

                return (
                  <tr key={req.ref} className="hover:bg-slate-50">
                    <td className="py-3.5 px-3">
                      <div className="font-extrabold text-[#092342]">{req.ref}</div>
                      <span className="inline-block mt-0.5 rounded bg-[#eef4fb] px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#0c685a]">
                        {req.student_id_doc}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-[#092342]">{req.parent_name}</div>
                      <div className="text-[11px] text-slate-500">{req.occupation}</div>
                      <div className="text-[10.5px] text-slate-400">
                        {req.town}, {req.country}
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="font-semibold text-slate-700">{req.student_name}</div>
                      <div className="text-[11px] text-[#0c685a]">{req.student_program}</div>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="font-extrabold text-[#092342]">
                        {req.offer_name} ({ratePct}%)
                      </div>
                      <div className="text-[10.5px] text-slate-500">
                        {req.duration_months} {isEn ? 'months' : 'mois'}
                      </div>
                    </td>
                    <td className="py-3.5 px-3 font-extrabold text-[#092342]">
                      €{eurVal.toLocaleString('en-US', { maximumFractionDigits: 0 })} EUR
                      <span className="block text-[10.5px] font-medium text-slate-500">
                        ${usdVal.toLocaleString('en-US', { maximumFractionDigits: 0 })} USD •{' '}
                        {Math.round(xafVal).toLocaleString('en-US')} XAF
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="font-extrabold text-[#0c685a]">
                        {isEn ? 'Total Interest:' : 'Intérêt Total :'} €{totIntEur.toFixed(2)}
                      </div>
                      <span className="inline-block mt-0.5 rounded bg-[#fef3c7] px-2 py-0.5 text-[10px] font-extrabold text-[#92400e]">
                        {isEn ? 'LIEC Cut: €150.00 EUR' : 'Part LIEC : 150,00 €'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="rounded-full bg-[#ccf5e5] px-2.5 py-1 text-[10.5px] font-extrabold text-[#0c685a]">
                        {req.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function PublicSiteIntakeScreen({
  onSubmitWebForm,
  onNavigate,
  lang = 'en',
}: {
  onSubmitWebForm: (data: any) => Promise<string | undefined>;
  onNavigate: (tab: string) => void;
  lang?: Lang;
}) {
  const isEn = lang === 'en';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('RDC');
  const [town, setTown] = useState('Kinshasa');
  const [nationality, setNationality] = useState('Congolaise (RDC)');
  const [servicePole, setServicePole] = useState('MyDigitalSchool Lyon');
  const [program, setProgram] = useState(
    'MyDigitalSchool Lyon — Web development, digital creation, webmarketing and UX/UI design'
  );
  const [expectedStart, setExpectedStart] = useState('2025-09');
  const [budgetRange, setBudgetRange] = useState('8,500 € – 10,000 € / year');
  const [message, setMessage] = useState('');
  const [consent, setConsent] = useState(true);
  const [createdRef, setCreatedRef] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length > 14) {
      alert(
        isEn
          ? 'Phone / WhatsApp must be limited to a maximum of 14 digits.'
          : 'Le numéro de téléphone / WhatsApp ne peut pas dépasser 14 chiffres.'
      );
      return;
    }
    setSubmitting(true);
    try {
      const ref = await onSubmitWebForm({
        full_name: name,
        email,
        phone,
        country_name: country,
        city: `${town}, ${country}`,
        nationality,
        service_pole: servicePole,
        program,
        expected_start: expectedStart,
        budget_range: budgetRange,
        message,
      });
      if (ref) setCreatedRef(ref);
      setName('');
      setEmail('');
      setPhone('');
      setMessage('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="inline-block rounded-full bg-[#ccf5e5] px-3 py-0.5 text-[10.5px] font-extrabold uppercase tracking-wider text-[#0c685a] mb-2">
            {isEn ? 'LIEC EDUCATION PUBLIC PORTAL • WEB INTAKE' : 'PORTAIL PUBLIC LIEC EDUCATION • INTAKE WEB'}
          </span>
          <h1 className="text-[28px] font-extrabold text-[#092342] leading-tight">
            {isEn
              ? 'Public Student Application Form & Website Content'
              : 'Formulaire Public de Candidature & Contenus du Site'}
          </h1>
          <p className="mt-1 text-sm text-slate-500 max-w-2xl">
            {isEn
              ? 'Every submission from this form immediately creates a record in PostgreSQL with a unique reference number and feeds the "Received Applications" queue.'
              : 'Toute soumission depuis ce formulaire crée immédiatement une demande dans PostgreSQL avec un numéro de référence unique et alimente la file « Demandes reçues ».'}
          </p>
        </div>
        <button
          onClick={() => onNavigate('demandes')}
          className="rounded-xl bg-[#092342] text-white px-4 py-2.5 text-xs font-extrabold"
        >
          {isEn ? 'View Received Applications Queue →' : 'Voir la file Demandes reçues →'}
        </button>
      </div>

      {createdRef && (
        <div className="rounded-2xl border border-[#10b981] bg-[#eefaf6] p-4 flex items-center justify-between gap-4 text-xs text-[#064e3b]">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-[#0c685a] shrink-0" />
            <span>
              <strong>
                {isEn ? 'Application saved in PostgreSQL!' : 'Candidature enregistrée dans PostgreSQL !'}
              </strong>{' '}
              {isEn ? 'Assigned Reference:' : 'Référence attribuée :'}{' '}
              <strong className="underline">{createdRef}</strong>.
            </span>
          </div>
          <button
            onClick={() => onNavigate('demandes')}
            className="rounded-lg bg-[#0c685a] text-white px-3 py-1.5 font-extrabold shrink-0"
          >
            {isEn ? 'Qualify Now →' : 'Qualifier maintenant →'}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-7 rounded-2xl border border-[#e6eef6] bg-white p-6 shadow-card space-y-4 text-xs"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-extrabold text-[#092342]">
                {isEn
                  ? 'Submit an Application for Lyon Partner Schools'
                  : "Soumettre une demande d'accompagnement à LIEC"}
              </h2>
              <p className="text-slate-500">
                {isEn ? 'Step 1 · Secure Online Intake Form' : 'Étape 1 · Formulaire en ligne sécurisé'}
              </p>
            </div>
            <span className="rounded-full bg-[#eef4fb] px-3 py-1 font-extrabold text-[#092342]">
              {isEn ? 'Public Portal' : 'Portail Public'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {isEn ? 'Full Name *' : 'Nom complet *'}
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Patrick Lukusa"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {isEn ? 'Email Address *' : 'Adresse e-mail *'}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@example.com"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>{isEn ? 'Phone / WhatsApp *' : 'Téléphone / WhatsApp *'}</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  {phone.replace(/\D/g, '').length}/14 {isEn ? 'digits max' : 'chiffres max'}
                </span>
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.replace(/\D/g, '').length <= 14) {
                    setPhone(val);
                  }
                }}
                maxLength={18}
                placeholder="+243 81..."
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {isEn
                  ? 'Country of Residence (Exclusive Recruitment) *'
                  : 'Pays de résidence (Recrutement exclusif) *'}
              </label>
              <select
                value={country}
                onChange={(e) => {
                  const val = e.target.value;
                  setCountry(val);
                  setTown(val === 'RDC' ? 'Kinshasa' : 'Brazzaville');
                  setNationality(
                    val === 'RDC' ? 'Congolaise (RDC)' : 'Congolaise (Brazzaville)'
                  );
                }}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 bg-white font-semibold"
              >
                <option value="RDC">🇨🇩 {isEn ? 'DRC (Democratic Republic of the Congo)' : 'RDC (République Démocratique du Congo)'}</option>
                <option value="Congo-Brazzaville">🇨🇬 {isEn ? 'Congo-Brazzaville' : 'Congo-Brazzaville'}</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {isEn ? 'Departure City *' : 'Ville de départ *'}
              </label>
              <select
                value={town}
                onChange={(e) => setTown(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 bg-white"
              >
                {country === 'RDC' ? (
                  <>
                    <option value="Kinshasa">Kinshasa</option>
                    <option value="Lubumbashi">Lubumbashi</option>
                    <option value="Goma">Goma</option>
                  </>
                ) : (
                  <>
                    <option value="Brazzaville">Brazzaville</option>
                    <option value="Pointe-Noire">Pointe-Noire</option>
                  </>
                )}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {isEn
                  ? 'Partner School in Lyon (Exclusive Destination: Lyon) *'
                  : 'École Partenaire à Lyon (Destination exclusive : Lyon) *'}
              </label>
              <select
                value={program}
                onChange={(e) => {
                  setProgram(e.target.value);
                  setServicePole(e.target.value.split('—')[0]?.trim() || 'Lyon Partner School');
                }}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 bg-white font-semibold text-[#0c685a]"
              >
                <option value="ISCOM Lyon — Communication, advertising, marketing and events">
                  1. ISCOM Lyon — Communication, advertising, marketing & events
                </option>
                <option value="MyDigitalSchool Lyon — Web development, digital creation, webmarketing and UX/UI design">
                  2. MyDigitalSchool Lyon — Web dev, digital creation, webmarketing & UX/UI
                </option>
                <option value="École Internationale Tunon Lyon — Tourism, hospitality, public relations and events">
                  3. École Internationale Tunon Lyon — Tourism, hospitality, PR & events
                </option>
                <option value="IHECF Lyon — Accounting, chartered accountancy, finance and management control">
                  4. IHECF Lyon — Accounting, chartered accountancy, finance & audit
                </option>
                <option value="Ipac Bachelor Factory Lyon — Business, management, finance, communication and logistics">
                  5. Ipac Bachelor Factory Lyon — Business, management, finance & logistics
                </option>
                <option value="MBway Lyon — Management, entrepreneurship, HR, finance and international trade">
                  6. MBway Lyon — Management, entrepreneurship, HR, finance & int. trade
                </option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              {isEn
                ? 'Describe your study project and academic goals *'
                : "Décrivez votre projet d'études et vos objectifs *"}
            </label>
            <textarea
              rows={3}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                isEn
                  ? 'Specify your current degree level and your goals in Lyon...'
                  : "Précisez votre niveau d'études actuel et vos objectifs à Lyon..."
              }
              className="w-full rounded-xl border border-slate-200 p-3"
            />
          </div>

          <label className="flex items-start gap-2 text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              required
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded text-[#0c685a]"
            />
            <span>
              {isEn
                ? 'I confirm that the information provided is accurate and agree to its processing by the LIEC Education advisory team.'
                : "Je confirme que les informations fournies sont exactes et j'accepte leur traitement par l'équipe conseil LIEC Education."}
            </span>
          </label>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-[#0c6358] hover:bg-[#094e45] text-white px-6 py-3 font-extrabold shadow-sm transition"
            >
              {submitting
                ? isEn
                  ? 'Submitting...'
                  : 'Envoi en cours...'
                : isEn
                ? 'Submit Application →'
                : 'Soumettre la candidature →'}
            </button>
          </div>
        </form>

        {/* Right 5 cols: Workflow */}
        <div className="lg:col-span-5 rounded-2xl border border-[#e6eef6] bg-white p-6 shadow-card space-y-4">
          <h2 className="text-base font-extrabold text-[#092342]">
            {isEn
              ? 'Automated Processing Workflow (Public Site → LIEC Heav’n)'
              : 'Flux de traitement automatisé (Site Public → LIEC Heav’n)'}
          </h2>
          <div className="space-y-3">
            {[
              {
                n: 1,
                title: isEn ? 'Validated Portal Submission' : 'Soumission validée sur le portail',
                desc: isEn
                  ? 'Server validation and immediate issuance of a #DEM-2025-XXX reference.'
                  : 'Validation serveur et émission immédiate d’une référence #DEM-2025-XXX.',
              },
              {
                n: 2,
                title: isEn ? 'Arrival in Received Applications' : 'Arrivée dans Demandes reçues',
                desc: isEn
                  ? 'Creation of the file with "New" status and advisory team alert.'
                  : 'Création du dossier avec statut « Nouvelle » et alerte équipe conseil.',
              },
              {
                n: 3,
                title: isEn ? 'Advisor / Secretariat Verification' : 'Vérification par le Secrétariat',
                desc: isEn
                  ? 'Eligibility check, WhatsApp contact, and internal notes.'
                  : 'Contrôle d’éligibilité, prise de contact WhatsApp et ajout de notes internes.',
              },
              {
                n: 4,
                title: isEn ? 'Qualification & Candidate Conversion' : 'Qualification & Conversion en Candidat',
                desc: isEn
                  ? 'In one click, the application becomes an active Candidate Dossier linked to PREPA, Campus France, and AVI.'
                  : 'En un clic, la demande devient un Dossier Candidat actif relié à PREPA, Campus France et AVI.',
              },
            ].map((s) => (
              <div
                key={s.n}
                className="rounded-xl border border-slate-100 bg-[#f8fbff] p-3.5 flex items-start gap-3"
              >
                <span className="h-7 w-7 rounded-lg bg-[#e0f8ef] text-[#0c685a] flex items-center justify-center text-xs font-extrabold shrink-0">
                  {s.n}
                </span>
                <div className="text-xs">
                  <div className="font-extrabold text-[#092342]">{s.title}</div>
                  <p className="mt-0.5 text-slate-500">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function RapportsFinanceScreen({
  invoices = [],
  candidats = [],
  currentRole,
  onNotify,
  lang = 'en',
}: {
  invoices: any[];
  candidats?: any[];
  currentRole: string;
  onNotify: (msg: string) => void;
  lang?: Lang;
}) {
  const isEn = lang === 'en';
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedReceiptStudent, setSelectedReceiptStudent] = useState<string>('');
  const [receiptNumber, setReceiptNumber] = useState<string>('REC-2026-0104');
  const [customReceiptAmount, setCustomReceiptAmount] = useState<number>(1800);
  const [receiptPaymentMethod, setReceiptPaymentMethod] = useState<string>('Bank Wire (Virement)');

  const invoicesList = Array.isArray(invoices) ? invoices : [];

  // Grouped candidates by payment
  const studentPayments = useMemo(() => {
    const map = new Map<string, { student_name: string; total_paid: number; ref: string; count: number }>();
    
    // Seed with existing candidates
    (candidats || []).forEach((c) => {
      const name = c.full_name || c.name || '';
      if (!name) return;
      const key = name.toLowerCase().trim();
      if (!map.has(key)) {
        map.set(key, { student_name: name, total_paid: 0, ref: c.ref || 'CAN', count: 0 });
      }
    });

    invoicesList.forEach((inv) => {
      const sName = inv.student_name || inv.client_name || '';
      if (!sName) return;
      const key = sName.toLowerCase().trim();
      if (!map.has(key)) {
        map.set(key, { student_name: sName, total_paid: 0, ref: inv.ref || 'INV', count: 0 });
      }
      const item = map.get(key)!;
      item.count += 1;
      const s = (inv.status || '').toLowerCase();
      if (s.includes('pay') || s.includes('valid') || s.includes('paid')) {
        item.total_paid += Number(inv.paid_eur || inv.amount_eur || inv.amount || 0);
      }
    });

    return Array.from(map.values());
  }, [invoicesList, candidats]);

  // Financial KPI calculations
  const totalBilled = useMemo(() => {
    return invoicesList.reduce((acc, inv) => acc + Number(inv.amount_eur || inv.amount || 0), 0);
  }, [invoicesList]);

  const validatedPayments = useMemo(() => {
    return invoicesList
      .filter((inv) => {
        const s = (inv.status || '').toLowerCase();
        return s.includes('pay') || s.includes('valid') || s.includes('paid');
      })
      .reduce((acc, inv) => acc + Number(inv.paid_eur || inv.amount_eur || inv.amount || 0), 0);
  }, [invoicesList]);

  const outstandingBalance = Math.max(0, totalBilled - validatedPayments);

  const pendingPaymentsCount = useMemo(() => {
    return invoicesList.filter((inv) => {
      const s = (inv.status || '').toLowerCase();
      return s.includes('attente') || s.includes('pending') || s.includes('unpaid');
    }).length;
  }, [invoicesList]);

  const rejectedPaymentsCount = useMemo(() => {
    return invoicesList.filter((inv) => {
      const s = (inv.status || '').toLowerCase();
      return s.includes('rejet') || s.includes('fail');
    }).length;
  }, [invoicesList]);

  const fullyPaidCandidates = useMemo(() => {
    return studentPayments.filter((s) => s.total_paid >= 2800).length;
  }, [studentPayments]);

  const thresholdCandidates = useMemo(() => {
    return studentPayments.filter((s) => s.total_paid >= 1800 && s.total_paid < 2800).length;
  }, [studentPayments]);

  const eligibleForReceipt = useMemo(() => {
    return studentPayments.filter((s) => s.total_paid >= 1800);
  }, [studentPayments]);

  const handleOpenReceiptModal = () => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    setReceiptNumber(`REC-2026-${randomSuffix}`);
    if (eligibleForReceipt.length > 0) {
      setSelectedReceiptStudent(eligibleForReceipt[0].student_name);
      setCustomReceiptAmount(eligibleForReceipt[0].total_paid);
    } else if (candidats.length > 0) {
      setSelectedReceiptStudent(candidats[0].full_name || '');
      setCustomReceiptAmount(1800);
    }
    setShowReceiptModal(true);
  };

  if (currentRole === 'secretary') {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center space-y-3">
        <Lock className="w-8 h-8 text-amber-600 mx-auto" />
        <h2 className="text-lg font-extrabold text-[#092342]">
          {isEn
            ? 'Restricted Financial Access (Secretary Role)'
            : 'Accès Financier Restreint (Rôle Secrétaire)'}
        </h2>
        <p className="text-xs text-slate-600 max-w-md mx-auto">
          {isEn
            ? 'In accordance with the LIEC Heav’n security matrix, sensitive financial totals and billing are not exposed to the Secretary profile. Switch to Admin or AVI Officer role in the top header.'
            : 'Conformément à la matrice de sécurité LIEC Heav’n, les totaux financiers sensibles et la facturation ne sont pas exposés au profil Secrétaire.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="inline-block rounded-full bg-[#ccf5e5] px-3 py-0.5 text-[10.5px] font-extrabold uppercase tracking-wider text-[#0c685a] mb-2">
            {isEn ? 'EDUCATION FINANCE & ACTIVITY REPORTS' : "FINANCE ÉDUCATIVE & RAPPORTS D'ACTIVITÉ"}
          </span>
          <h1 className="text-[28px] font-extrabold text-[#092342] leading-tight">
            {isEn
              ? 'Reports, Invoicing & Payment Allocations'
              : 'Rapports, Facturation & Allocations de Paiements'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {isEn
              ? 'Traceable tracking of student invoices, PREPA deposits (€2,800 standard / €1,800 threshold), €150 LIEC AVI interest recoveries, and partner reconciliations.'
              : 'Suivi traçable des factures étudiants, acomptes PREPA (2 800 € standard / seuil 1 800 €), récupérations intérêts AVI (150 € LIEC) et rapprochements partenaires.'}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleOpenReceiptModal}
            className="rounded-xl bg-[#0c685a] hover:bg-[#0a5247] text-white px-4 py-2.5 text-xs font-extrabold shadow-sm flex items-center gap-2 transition cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>{isEn ? 'Generate Receipt' : 'Générer un reçu'}</span>
          </button>
          <button
            onClick={() =>
              onNotify(
                isEn
                  ? 'Consolidated financial report exported to PDF.'
                  : 'Rapport financier consolidé exporté en PDF.'
              )
            }
            className="rounded-xl bg-[#092342] hover:bg-[#12365a] text-white px-4 py-2.5 text-xs font-extrabold shadow-sm transition cursor-pointer"
          >
            {isEn ? 'Export Financial Statement ↓' : 'Exporter le bilan financier ↓'}
          </button>
        </div>
      </div>

      {/* 5 Financial KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="rounded-2xl border border-[#e6eef6] bg-white p-4 shadow-card">
          <span className="text-[10px] font-bold uppercase text-slate-400">
            {isEn ? 'TOTAL BILLED' : 'TOTAL FACTURÉ'}
          </span>
          <div className="mt-1 text-xl font-extrabold text-[#092342]">
            €{totalBilled.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-500">
            {invoicesList.length} {isEn ? 'invoices logged' : 'factures enregistrées'}
          </span>
        </div>

        <div className="rounded-2xl border border-[#ccece2] bg-white p-4 shadow-card">
          <span className="text-[10px] font-bold uppercase text-[#0c685a]">
            {isEn ? 'VALIDATED PAYMENTS' : 'PAIEMENTS VALIDÉS'}
          </span>
          <div className="mt-1 text-xl font-extrabold text-[#0c685a]">
            €{validatedPayments.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] font-semibold text-[#0c685a]">
            {totalBilled > 0 ? `${Math.round((validatedPayments / totalBilled) * 100)}% collected` : isEn ? 'Real-time Neon DB' : 'Base Neon temps réel'}
          </span>
        </div>

        <div className="rounded-2xl border border-[#e6eef6] bg-white p-4 shadow-card">
          <span className="text-[10px] font-bold uppercase text-slate-400">
            {isEn ? 'OUTSTANDING BALANCE' : 'SOLDE RESTANT DÛ'}
          </span>
          <div className="mt-1 text-xl font-extrabold text-[#92400e]">
            €{outstandingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-500">
            {pendingPaymentsCount} {isEn ? 'pending verification' : 'en attente'}
          </span>
        </div>

        <div className="rounded-2xl border border-[#e6eef6] bg-white p-4 shadow-card">
          <span className="text-[10px] font-bold uppercase text-slate-400">
            {isEn ? 'THRESHOLD (64.29%)' : 'SEUIL VISA (64,29%)'}
          </span>
          <div className="mt-1 text-xl font-extrabold text-[#092342]">
            {thresholdCandidates} {isEn ? 'Candidates' : 'Candidats'}
          </div>
          <span className="text-[11px] text-[#0c685a] font-semibold">
            ≥ €1,800.00 {isEn ? 'paid' : 'versés'}
          </span>
        </div>

        <div className="rounded-2xl border border-[#e6eef6] bg-white p-4 shadow-card">
          <span className="text-[10px] font-bold uppercase text-slate-400">
            {isEn ? 'FULLY PAID (100%)' : 'SOLDÉS À 100%'}
          </span>
          <div className="mt-1 text-xl font-extrabold text-[#092342]">
            {fullyPaidCandidates} {isEn ? 'Candidates' : 'Candidats'}
          </div>
          <span className="text-[11px] text-[#0c685a] font-semibold">
            €2,800.00 PREPA {isEn ? 'complete' : 'complet'}
          </span>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="rounded-2xl border border-[#e6eef6] bg-white p-6 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-[#092342]">
            {isEn ? 'Invoices & Allocated Payments Ledger' : 'Journal des Factures & Paiements Alloués'}
          </h2>
          <span className="text-xs text-slate-500 font-semibold">
            {invoicesList.length} {isEn ? 'records' : 'entrées'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-y border-slate-100 bg-[#f8fafc] text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-3">{isEn ? 'INVOICE #' : 'N° FACTURE'}</th>
                <th className="py-3 px-3">{isEn ? 'STUDENT' : 'ÉTUDIANT'}</th>
                <th className="py-3 px-3">{isEn ? 'SERVICE' : 'PRESTATION / SERVICE'}</th>
                <th className="py-3 px-3">{isEn ? 'RECIPIENT' : 'BÉNÉFICIAIRE'}</th>
                <th className="py-3 px-3">{isEn ? 'BILLED' : 'FACTURÉ'}</th>
                <th className="py-3 px-3">{isEn ? 'PAID' : 'PAYÉ / ALLOUÉ'}</th>
                <th className="py-3 px-3">{isEn ? 'STATUS' : 'STATUT'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoicesList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                    {isEn
                      ? 'No invoices or allocated payments recorded yet in the database.'
                      : 'Aucune facture ni paiement alloué pour le moment dans la base de données.'}
                  </td>
                </tr>
              ) : (
                invoicesList.map((inv, idx) => (
                  <tr key={inv.ref || inv.id || idx} className="hover:bg-slate-50">
                    <td className="py-3.5 px-3 font-extrabold text-[#092342]">{inv.ref || `INV-${inv.id}`}</td>
                    <td className="py-3.5 px-3 font-bold text-[#092342]">{inv.student_name || inv.client_name || '—'}</td>
                    <td className="py-3.5 px-3 text-slate-600">{inv.service_label || 'LIEC-France PREPA'}</td>
                    <td className="py-3.5 px-3 font-semibold text-slate-700">{inv.recipient || 'LIEC Education'}</td>
                    <td className="py-3.5 px-3 font-extrabold text-[#092342]">
                      €{Number(inv.amount_eur || inv.amount || 0).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-3 font-extrabold text-[#0c685a]">
                      €{Number(inv.paid_eur || (inv.status === 'Paid' || inv.status === 'Payé' || inv.status === 'Validé' ? inv.amount : 0)).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10.5px] font-extrabold ${
                          inv.status === 'Payé' || inv.status === 'Paid' || inv.status === 'Validé'
                            ? 'bg-[#ccf5e5] text-[#0c685a]'
                            : inv.status === 'Rejeté' || inv.status === 'Rejected'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-[#fef3c7] text-[#92400e]'
                        }`}
                      >
                        {inv.status || 'En attente'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Generate Receipt */}
      {showReceiptModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-elevated border border-slate-100 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#0c685a]" />
                <h3 className="text-base font-extrabold text-[#092342]">
                  {isEn ? 'LIEC Heav’n — Official Payment Receipt Generator' : 'Générateur de Reçu Officiel LIEC Heav’n'}
                </h3>
              </div>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Receipt configuration controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">
                  {isEn ? 'Candidate / Student' : 'Candidat / Étudiant'}
                </label>
                <select
                  value={selectedReceiptStudent}
                  onChange={(e) => {
                    setSelectedReceiptStudent(e.target.value);
                    const matched = studentPayments.find((s) => s.student_name === e.target.value);
                    if (matched && matched.total_paid > 0) {
                      setCustomReceiptAmount(matched.total_paid);
                    }
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#092342] focus:outline-none focus:ring-2 focus:ring-[#0c685a]/20"
                >
                  {studentPayments.length > 0 ? (
                    studentPayments.map((s) => (
                      <option key={s.student_name} value={s.student_name}>
                        {s.student_name} (Paid: €{s.total_paid.toFixed(2)})
                      </option>
                    ))
                  ) : (
                    <option value="">{isEn ? 'No candidates in database' : 'Aucun candidat dans la base'}</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">
                  {isEn ? 'Validated Amount (€)' : 'Montant validé (€)'}
                </label>
                <input
                  type="number"
                  value={customReceiptAmount}
                  onChange={(e) => setCustomReceiptAmount(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#092342] focus:outline-none focus:ring-2 focus:ring-[#0c685a]/20"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">
                  {isEn ? 'Receipt Number' : 'Numéro de Reçu'}
                </label>
                <input
                  type="text"
                  value={receiptNumber}
                  onChange={(e) => setReceiptNumber(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono font-semibold text-[#092342] focus:outline-none focus:ring-2 focus:ring-[#0c685a]/20"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">
                  {isEn ? 'Payment Method' : 'Moyen de Paiement'}
                </label>
                <select
                  value={receiptPaymentMethod}
                  onChange={(e) => setReceiptPaymentMethod(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#092342] focus:outline-none focus:ring-2 focus:ring-[#0c685a]/20"
                >
                  <option value="Bank Wire (Virement)">Bank Wire (Virement bancaire)</option>
                  <option value="Credit Card (Carte Bancaire)">Credit Card (Carte Bancaire)</option>
                  <option value="Certified Deposit (Dépôt Certifié)">Certified Deposit (Dépôt Certifié)</option>
                  <option value="Cash Counter / Guichet LIEC">Cash Counter / Guichet LIEC</option>
                </select>
              </div>
            </div>

            {/* Printable Receipt Preview Box */}
            <div className="rounded-2xl border-2 border-dashed border-[#ccece2] bg-[#f9fcfa] p-6 space-y-4 font-sans text-xs text-[#092342]">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <div className="font-extrabold text-sm tracking-wide text-[#092342]">LIEC CONSULTING &amp; EDUCATION</div>
                  <div className="text-[10px] text-slate-500">Heav’n Workspace — Paris &amp; Lyon Offices</div>
                </div>
                <div className="text-right">
                  <span className="inline-block rounded-md bg-[#0c685a] px-2 py-0.5 text-[10px] font-extrabold text-white">
                    {isEn ? 'OFFICIAL RECEIPT' : 'REÇU OFFICIEL'}
                  </span>
                  <div className="font-mono font-bold text-xs mt-1 text-[#092342]">{receiptNumber}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11.5px]">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">{isEn ? 'STUDENT / CANDIDATE' : 'ÉTUDIANT / CANDIDAT'}</span>
                  <span className="font-bold text-[#092342]">{selectedReceiptStudent || 'Student Name'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">{isEn ? 'ISSUE DATE' : "DATE D'ÉMISSION"}</span>
                  <span className="font-semibold text-slate-700">{new Date().toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">{isEn ? 'PROGRAM' : 'PROGRAMME'}</span>
                  <span className="font-semibold text-slate-700">LIEC-France PREPA &amp; Orientation (2025–2026)</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">{isEn ? 'PAYMENT METHOD' : 'MODE DE RÈGLEMENT'}</span>
                  <span className="font-semibold text-slate-700">{receiptPaymentMethod}</span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600">{isEn ? 'Total LIEC PREPA Standard Tuition' : 'Montant Total Prépa LIEC'}</span>
                  <span className="font-extrabold text-[#092342]">€2,800.00</span>
                </div>
                <div className="flex justify-between items-center text-xs border-t border-slate-100 pt-2 text-[#0c685a]">
                  <span className="font-bold">{isEn ? 'Amount Received & Validated' : 'Montant Encaissé et Validé'}</span>
                  <span className="font-extrabold text-base">€{customReceiptAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-xs border-t border-slate-100 pt-2 text-slate-600">
                  <span>{isEn ? 'Remaining Balance Due' : 'Solde Restant à Régler'}</span>
                  <span className="font-bold text-[#92400e]">€{Math.max(0, 2800 - customReceiptAmount).toFixed(2)}</span>
                </div>
              </div>

              {/* Status Eligibility Banner */}
              <div className={`p-2.5 rounded-xl text-center font-bold text-xs ${
                customReceiptAmount >= 2800
                  ? 'bg-[#ccf5e5] text-[#0c685a]'
                  : customReceiptAmount >= 1800
                  ? 'bg-[#d8f6ea] text-[#094f46]'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {customReceiptAmount >= 2800
                  ? (isEn ? '✓ 100% Fully Settled — All academic milestones unlocked' : '✓ Soldé à 100% — Tous les jalons académiques débloqués')
                  : customReceiptAmount >= 1800
                  ? (isEn ? '✓ 64.29% Milestone Reached — Eligible for Visa & AVI Process' : '✓ Seuil de 64,29% atteint — Éligible à la procédure Visa & AVI')
                  : (isEn ? '⚠ Partial Payment — Minimum €1,800.00 required for visa threshold' : '⚠ Paiement partiel — 1 800,00 € minimum requis pour le seuil visa')}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-[10px] text-slate-500">
                <div>
                  Authorized Signature: <span className="font-bold text-[#092342]">Barthelemy MAPWABA NTORO</span>
                </div>
                <div className="font-mono">LIEC-HEAVN-AUTH-CERTIFIED</div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowReceiptModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-extrabold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                {isEn ? 'Close' : 'Fermer'}
              </button>
              <button
                onClick={() => {
                  window.print();
                  onNotify(isEn ? `Receipt ${receiptNumber} generated and ready for print.` : `Reçu ${receiptNumber} généré et prêt pour impression.`);
                }}
                className="rounded-xl bg-[#092342] hover:bg-[#12365a] text-white px-5 py-2 text-xs font-extrabold flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>{isEn ? 'Print / Save Receipt' : 'Imprimer / Sauvegarder'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ParametresGovernanceScreen({
  auditLogs = [],
  dbEngine = 'postgresql',
  lang = 'fr',
  currentUser,
  rolePreview = 'admin',
  users: initialUsers = [],
  roles: initialRoles = [],
  onRefreshWorkspace,
}: {
  auditLogs?: any[];
  dbEngine?: string;
  lang?: Lang;
  currentUser?: any;
  rolePreview?: 'admin' | 'secretary' | 'avi';
  users?: any[];
  roles?: any[];
  onRefreshWorkspace?: () => void;
}) {
  const isEn = lang === 'en';
  const isAdmin =
    rolePreview === 'admin' ||
    currentUser?.business_profile === 'Admin' ||
    currentUser?.role === 'admin';

  const [subTab, setSubTab] = useState<'matrix' | 'roles' | 'users' | 'audit'>('users');
  const [userList, setUserList] = useState<any[]>(initialUsers);
  const [roleList, setRoleList] = useState<any[]>(initialRoles);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState(false);

  // Create User Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserProfile, setNewUserProfile] = useState<'Admin' | 'Secretary' | 'Finance Officer'>('Secretary');
  const [newUserRoles, setNewUserRoles] = useState<string[]>(['lh_internal', 'ITIL']);
  const [newUserTitle, setNewUserTitle] = useState('');

  // Created User Credentials Confirmation Dialog State (Admin-only visibility)
  const [createdUserCredentials, setCreatedUserCredentials] = useState<{
    name: string;
    email: string;
    business_profile: string;
    technical_roles: string[];
    temporaryPassword: string;
  } | null>(null);
  const [showCreatedPassword, setShowCreatedPassword] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);

  // Edit Roles Modal State
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editProfile, setEditProfile] = useState<'Admin' | 'Secretary' | 'Finance Officer'>('Secretary');
  const [editRoles, setEditRoles] = useState<string[]>([]);

  // Search in user list
  const [userSearch, setUserSearch] = useState('');

  const fetchUsersAndRoles = useCallback(async () => {
    try {
      const activeEmail = currentUser?.email || 'bmapwabantoro@liecconsulting.com';

      const res = await fetch('/api/users', {
        headers: { 'x-user-email': activeEmail },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.users) setUserList(data.users);
        if (data.roles) setRoleList(data.roles);
      }
    } catch (e) {
      console.warn('Failed to fetch users:', e);
    }
  }, [currentUser, rolePreview]);

  useEffect(() => {
    if (initialUsers && initialUsers.length > 0) {
      setUserList(initialUsers);
    }
  }, [initialUsers]);

  useEffect(() => {
    if (initialRoles && initialRoles.length > 0) {
      setRoleList(initialRoles);
    }
  }, [initialRoles]);

  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 5000);
  };

  const handleDeleteUser = async (targetUser: any) => {
    if (
      targetUser.email === currentUser?.email ||
      targetUser.email === 'bmapwabantoro@liecconsulting.com' ||
      targetUser.business_profile === 'Admin'
    ) {
      showFeedback(
        isEn
          ? 'Cannot delete the primary administrator account.'
          : 'Impossible de supprimer le compte administrateur principal.'
      );
      return;
    }

    const confirmMsg = isEn
      ? `Are you sure you want to permanently delete user account '${targetUser.name}' (${targetUser.email})?`
      : `Êtes-vous sûr de vouloir supprimer définitivement le compte '${targetUser.name}' (${targetUser.email}) ?`;

    if (!window.confirm(confirmMsg)) return;

    setLoadingAction(true);
    try {
      const res = await fetch(`/api/users?userId=${targetUser.id}`, {
        method: 'DELETE',
        headers: {
          'x-user-email': currentUser?.email || 'bmapwabantoro@liecconsulting.com',
        },
      });

      if (res.ok) {
        await fetchUsersAndRoles();
        onRefreshWorkspace?.();
        showFeedback(
          isEn
            ? `User account '${targetUser.name}' deleted successfully.`
            : `Compte utilisateur '${targetUser.name}' supprimé avec succès.`
        );
      } else {
        const err = await res.json().catch(() => ({}));
        showFeedback(err.error || (isEn ? 'Failed to delete user' : 'Erreur lors de la suppression'));
      }
    } catch {
      showFeedback(isEn ? 'Network error during user deletion' : 'Erreur réseau lors de la suppression');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleToggleSuspend = async (targetUser: any) => {
    setLoadingAction(true);
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': currentUser?.email || 'bmapwabantoro@liecconsulting.com',
        },
        body: JSON.stringify({
          userId: targetUser.id,
          action: 'toggle_status',
          active: !targetUser.active,
        }),
      });
      if (res.ok) {
        await fetchUsersAndRoles();
        onRefreshWorkspace?.();
        showFeedback(
          targetUser.active
            ? isEn
              ? `Account ${targetUser.name} suspended. Server access revoked.`
              : `Compte de ${targetUser.name} suspendu. Accès serveur révoqué.`
            : isEn
            ? `Account ${targetUser.name} reactivated.`
            : `Compte de ${targetUser.name} réactivé avec succès.`
        );
      } else {
        const err = await res.json();
        showFeedback(err.error || 'Erreur lors de la modification du statut');
      }
    } catch {
      showFeedback('Erreur réseau lors de la mise à jour du statut.');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleSaveCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;
    const cleanEmail = newUserEmail.trim().toLowerCase();
    if (!cleanEmail.endsWith('@liecconsulting.com')) {
      showFeedback(
        isEn
          ? 'Error: Professional email must end with @liecconsulting.com'
          : 'Erreur : L’email professionnel doit se terminer par @liecconsulting.com'
      );
      return;
    }
    setLoadingAction(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': currentUser?.email || 'bmapwabantoro@liecconsulting.com',
          'x-user-lang': isEn ? 'en' : 'fr',
        },
        body: JSON.stringify({
          name: newUserName.trim(),
          email: cleanEmail,
          business_profile: newUserProfile,
          technical_roles: newUserRoles,
          title: newUserTitle.trim() || `Collaborateur ${newUserProfile}`,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setShowCreateModal(false);
        setNewUserName('');
        setNewUserEmail('');
        setNewUserTitle('');
        await fetchUsersAndRoles();
        onRefreshWorkspace?.();

        if (data.temporaryPassword) {
          setCreatedUserCredentials({
            name: data.user?.name || newUserName.trim(),
            email: data.user?.email || cleanEmail,
            business_profile: data.user?.business_profile || newUserProfile,
            technical_roles: newUserRoles,
            temporaryPassword: data.temporaryPassword,
          });
          setShowCreatedPassword(false);
          setCopiedPassword(false);
          setCopiedInvite(false);
        }

        showFeedback(
          isEn
            ? `User account created with secure default password.`
            : `Compte utilisateur créé avec mot de passe temporaire sécurisé.`
        );
      } else {
        const err = await res.json();
        showFeedback(
          isEn
            ? (err.error_en || err.message || (err.error?.includes('Refusé') ? 'Access Denied / 403 Forbidden' : err.error) || 'Failed to create user')
            : (err.error_fr || err.error || 'Erreur lors de la création')
        );
      }
    } catch {
      showFeedback(isEn ? 'Network error during user creation' : 'Erreur lors de la création');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleOpenEditRoles = (u: any) => {
    setEditingUser(u);
    setEditProfile(u.business_profile || 'Secretary');
    setEditRoles(Array.isArray(u.technical_roles) ? u.technical_roles : []);
  };

  const handleSaveEditRoles = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setLoadingAction(true);
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': currentUser?.email || 'bmapwabantoro@liecconsulting.com',
        },
        body: JSON.stringify({
          userId: editingUser.id,
          action: 'update_roles',
          business_profile: editProfile,
          technical_roles: editRoles,
        }),
      });
      if (res.ok) {
        setEditingUser(null);
        await fetchUsersAndRoles();
        onRefreshWorkspace?.();
        showFeedback(
          isEn
            ? `Roles and business profile updated for ${editingUser.name}.`
            : `Rôles et profil métier mis à jour pour ${editingUser.name}.`
        );
      } else {
        const err = await res.json();
        showFeedback(err.error || 'Erreur mise à jour');
      }
    } catch {
      showFeedback('Erreur réseau');
    } finally {
      setLoadingAction(false);
    }
  };

  // Filtered users for search
  const filteredUsers = userList.filter((u) => {
    const q = userSearch.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.business_profile?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header & Platform Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="inline-block rounded-full bg-[#d8f6ea] px-3 py-0.5 text-[10.5px] font-extrabold uppercase tracking-wider text-[#0c685a] mb-2">
            {isEn
              ? 'SERVICENOW-INSPIRED RBAC & SECURITY ARCHITECTURE'
              : 'ARCHITECTURE RBAC & SÉCURITÉ SERVICENOW'}
          </span>
          <h1 className="text-[26px] font-extrabold text-[#092342] leading-tight">
            {isEn
              ? 'Role-Based Access Control (RBAC) & User Management'
              : 'Contrôle d’Accès par Rôles (RBAC) & Gestion des Utilisateurs'}
          </h1>
          <p className="mt-1 text-xs text-slate-500 max-w-2xl">
            {isEn
              ? 'Server-side enforcement of business roles, technical roles, field-level ACLs and audit logging.'
              : 'Application stricte côté serveur des rôles métiers, rôles techniques, ACL au niveau champ et journal d’audit.'}
          </p>
        </div>

        {/* Current User RBAC Identity Card */}
        <div className="rounded-2xl border border-[#d8f6ea] bg-[#f0faf7] p-3 flex items-center gap-3 shrink-0">
          <div className="h-10 w-10 rounded-full bg-[#0c685a] text-white flex items-center justify-center font-extrabold text-sm shadow-xs">
            {currentUser?.initials || 'BM'}
          </div>
          <div>
            <div className="text-xs font-extrabold text-[#092342] flex items-center gap-1.5">
              <span>{currentUser?.name || 'Barthelemy MAPWABA NTORO'}</span>
              <span className="rounded-full bg-[#0c685a] text-white px-2 py-0.2 text-[9.5px] font-extrabold">
                {currentUser?.business_profile || 'Admin'}
              </span>
            </div>
            <div className="text-[10px] text-slate-600 mt-0.5 flex items-center gap-1">
              <Key className="w-3 h-3 text-[#0c685a]" />
              <span>
                {Array.isArray(currentUser?.technical_roles)
                  ? currentUser.technical_roles.join(', ')
                  : 'admin, lh_security_admin'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {feedbackMsg && (
        <div className="rounded-xl border border-[#bbf0df] bg-[#eefaf6] p-3 text-xs font-extrabold text-[#0c685a] flex items-center justify-between animate-fadeIn">
          <span>{feedbackMsg}</span>
          <button onClick={() => setFeedbackMsg(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Sub-Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto text-xs font-extrabold">
        {[
          { id: 'users', label: isEn ? 'User Management (Workflow)' : 'Gestion des Utilisateurs', icon: Users },
          { id: 'roles', label: isEn ? 'Technical Roles Table' : 'Table des Rôles Techniques', icon: Key },
          { id: 'matrix', label: isEn ? 'Access Matrix' : 'Matrice d’Accès (Matrix)', icon: SlidersHorizontal },
          { id: 'audit', label: isEn ? 'Audit & Security Trail' : 'Journal d’Audit & Sécurité', icon: ShieldCheck },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = subTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id as any)}
              className={`flex items-center gap-2 py-3 px-4 border-b-2 transition whitespace-nowrap ${
                active
                  ? 'border-[#0c685a] text-[#0c685a] bg-[#f0faf7]'
                  : 'border-transparent text-slate-500 hover:text-[#092342] hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: USER MANAGEMENT WORKFLOW (Admin Only) */}
      {subTab === 'users' && (
        <div className="space-y-4">
          {!isAdmin ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900 text-xs">
              <div className="flex items-center gap-2 text-sm font-extrabold mb-1">
                <ShieldAlert className="w-5 h-5 text-amber-700" />
                <span>Accès Restreint aux Administrateurs</span>
              </div>
              <p>
                Seul un utilisateur doté du profil <strong>Admin</strong> ou des rôles techniques{' '}
                <code>admin</code> / <code>lh_security_admin</code> est autorisé à gérer les utilisateurs,
                assigner des rôles ou suspendre des comptes.
              </p>
            </div>
          ) : (
            <>
              {/* Action Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#e6eef6]">
                <div className="relative flex-1 max-w-sm">
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder={isEn ? 'Filter users by name, email, profile...' : 'Filtrer par nom, email, profil...'}
                    className="w-full rounded-xl bg-[#f6f9fc] border border-slate-200 px-3 py-2 text-xs text-[#092342] focus:outline-none focus:ring-2 focus:ring-[#0c685a]/25"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setNewUserProfile('Secretary');
                      setNewUserRoles(['lh_internal', 'ITIL']);
                      setShowCreateModal(true);
                    }}
                    className="rounded-xl bg-[#0c685a] hover:bg-[#094e45] text-white px-4 py-2.5 text-xs font-extrabold flex items-center gap-2 shadow-xs transition"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>{isEn ? '+ Create User' : '+ Créer un Utilisateur'}</span>
                  </button>
                </div>
              </div>

              {/* Users Table */}
              <div className="rounded-2xl border border-[#e6eef6] bg-white overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 bg-[#f8fafc] text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                        <th className="py-3 px-4">{isEn ? 'User / Account' : 'Utilisateur / Compte'}</th>
                        <th className="py-3 px-4">{isEn ? 'Business Profile' : 'Profil Métier'}</th>
                        <th className="py-3 px-4">{isEn ? 'Assigned Technical Roles' : 'Rôles Techniques Assignés'}</th>
                        <th className="py-3 px-4">{isEn ? 'Status' : 'Statut'}</th>
                        <th className="py-3 px-4 text-right">{isEn ? 'Admin Actions' : 'Actions Admin'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredUsers.map((u) => {
                        const roles: string[] = Array.isArray(u.technical_roles) ? u.technical_roles : [];
                        return (
                          <tr key={u.id} className="hover:bg-slate-50 transition">
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-[#092342] text-white flex items-center justify-center font-extrabold text-xs">
                                  {u.initials || u.name?.slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-extrabold text-[#092342]">{u.name}</div>
                                  <div className="text-[11px] text-slate-500">{u.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-extrabold ${
                                  u.business_profile === 'Admin'
                                    ? 'bg-[#e0f8ef] text-[#0c685a]'
                                    : u.business_profile === 'Finance Officer'
                                    ? 'bg-[#fef3c7] text-[#92400e]'
                                    : 'bg-[#e0f2fe] text-[#0369a1]'
                                }`}
                              >
                                {u.business_profile || 'Secretary'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex flex-wrap gap-1">
                                {roles.length > 0 ? (
                                  roles.map((r) => (
                                    <span
                                      key={r}
                                      className="rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-mono font-bold text-slate-700"
                                    >
                                      {r}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic">{isEn ? 'No role' : 'Aucun rôle'}</span>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              {u.active ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-[#dcfce7] text-[#15803d] px-2.5 py-0.5 text-[10.5px] font-extrabold">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>{isEn ? 'Active' : 'Actif'}</span>
                                </span>
                              ) : (
                                <div>
                                  <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700 px-2.5 py-0.5 text-[10.5px] font-extrabold">
                                    <AlertTriangle className="w-3 h-3" />
                                    <span>{isEn ? 'Suspended' : 'Suspendu'}</span>
                                  </span>
                                  {u.suspended_by && (
                                    <div className="text-[9.5px] text-red-500 mt-0.5">{isEn ? `By ${u.suspended_by}` : `Par ${u.suspended_by}`}</div>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  onClick={() => handleOpenEditRoles(u)}
                                  className="rounded-lg border border-slate-200 hover:border-[#0c685a] bg-white px-2.5 py-1 text-[11px] font-extrabold text-[#092342] hover:text-[#0c685a] transition"
                                >
                                  {isEn ? 'Edit roles' : 'Modifier rôles'}
                                </button>
                                {u.email !== currentUser?.email &&
                                  u.email !== 'bmapwabantoro@liecconsulting.com' &&
                                  u.business_profile !== 'Admin' && (
                                    <button
                                      onClick={() => handleDeleteUser(u)}
                                      disabled={loadingAction}
                                      title={isEn ? 'Delete user account' : 'Supprimer le compte'}
                                      className="rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 px-2.5 py-1 text-[11px] font-extrabold transition"
                                    >
                                      {isEn ? 'Delete' : 'Supprimer'}
                                    </button>
                                  )}
                                <button
                                  onClick={() => handleToggleSuspend(u)}
                                  disabled={loadingAction || u.email === currentUser?.email}
                                  title={
                                    u.email === currentUser?.email
                                      ? (isEn ? 'Cannot suspend your own logged-in account' : 'Impossible de suspendre votre propre compte connecté')
                                      : u.active
                                      ? (isEn ? 'Suspend account immediately' : 'Suspendre immédiatement le compte')
                                      : (isEn ? 'Reactivate account' : 'Réactiver le compte')
                                  }
                                  className={`rounded-lg px-2.5 py-1 text-[11px] font-extrabold transition ${
                                    u.email === currentUser?.email
                                      ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400'
                                      : u.active
                                      ? 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                                      : 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                  }`}
                                >
                                  {u.active ? (isEn ? 'Suspend' : 'Suspendre') : (isEn ? 'Reactivate' : 'Réactiver')}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 2: TECHNICAL ROLES TABLE (Section 2 of PDF) */}
      {subTab === 'roles' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#e6eef6] bg-white p-6 shadow-xs space-y-4">
            <div>
              <h2 className="text-base font-extrabold text-[#092342]">
                {isEn ? 'Technical Roles Table (Section 2)' : 'Table des Rôles Techniques Officielle (Section 2)'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {isEn
                  ? 'Technical roles assignable to platform users, their intended business profile mapping and security safeguards.'
                  : 'Rôles techniques attribuables, correspondance avec les profils métiers et garde-fous de sécurité.'}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-[#f8fafc] text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Rôle Technique</th>
                    <th className="py-3 px-4">Profil Métier Associé</th>
                    <th className="py-3 px-4">Description Opérationnelle</th>
                    <th className="py-3 px-4">Garde-fous / Safeguards</th>
                    <th className="py-3 px-4">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    {
                      role_id: 'admin',
                      mapping: 'Admin',
                      desc: 'Highest privilege. Platform administration and full system oversight.',
                      safeguards: 'Assign only to trusted administrators; log assignments and removals.',
                    },
                    {
                      role_id: 'lh_security_admin',
                      mapping: 'Admin',
                      desc: 'Security administration. Limit access to security configuration and sensitive controls.',
                      safeguards: 'Limit access to security configuration and sensitive controls.',
                    },
                    {
                      role_id: 'ITIL',
                      mapping: 'Secretary',
                      desc: 'Secretary workflows (as configured). Applicant intake and status transitions.',
                      safeguards: 'Do not assume this role means full administrator access. Verify permissions.',
                    },
                    {
                      role_id: 'lh_internal',
                      mapping: 'Secretary',
                      desc: 'Internal application access. Restrict to applicant intake, assigned records, comments and history.',
                      safeguards: 'Restrict to applicant intake, assigned records, comments and history.',
                    },
                    {
                      role_id: 'lh_finance',
                      mapping: 'Finance Officer (Blocked Finance / AVI)',
                      desc: 'AVI and parent-financing operations. YIMMILINE desk calculations and loan requests.',
                      safeguards: 'Restrict to AVI-related functions and records; do not grant unrelated finance or system configuration access.',
                    },
                  ].map((r) => (
                    <tr key={r.role_id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-extrabold text-[#0c685a]">
                        <span className="bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                          {r.role_id}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-extrabold text-[#092342]">{r.mapping}</td>
                      <td className="py-3 px-4 text-slate-600">{r.desc}</td>
                      <td className="py-3 px-4 text-slate-500 italic text-[11px]">{r.safeguards}</td>
                      <td className="py-3 px-4">
                        <span className="rounded-full bg-[#dcfce7] text-[#15803d] px-2 py-0.5 text-[10px] font-extrabold">
                          Actif
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ACCESS MATRIX (Section 3 of PDF) */}
      {subTab === 'matrix' && (
        <div className="rounded-2xl border border-[#e6eef6] bg-white p-6 shadow-xs space-y-4">
          <div>
            <h2 className="text-base font-extrabold text-[#092342]">
              {isEn ? 'RBAC Access Matrix (Section 3)' : 'Matrice d’Accès Officielle (Section 3)'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Règles d’autorisation strictes par module et action pour les 3 profils métiers.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-[#f8fafc] text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Module / Action</th>
                  <th className="py-3 px-4">Admin</th>
                  <th className="py-3 px-4">Finance Officer</th>
                  <th className="py-3 px-4">Secretary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { module: 'Dashboard', admin: 'All modules', finance: 'Finance / AVI view', sec: 'Intake / tasks view' },
                  { module: 'Website and in-office applications', admin: 'Full', finance: 'Only if needed for AVI', sec: 'Review and follow up' },
                  { module: 'Student records', admin: 'All authorized records', finance: 'Relevant financial/AVI fields', sec: 'Administrative fields' },
                  { module: 'General finance', admin: 'Full', finance: 'Authorized finance operations', sec: 'Denied by default' },
                  { module: 'Blocked Finance (AVI)', admin: 'Oversight', finance: 'Manage assigned AVI cases', sec: 'Denied by default' },
                  { module: 'YIMMILINE submission', admin: 'Oversight / authorized action', finance: 'Submit assigned cases', sec: 'Denied' },
                  { module: 'Admissions / Campus France', admin: 'Full oversight', finance: 'Relevant payment status only', sec: 'Administrative tracking' },
                  { module: 'Comments, work notes, history', admin: 'All authorized records', finance: 'AVI records only', sec: 'Application records only' },
                  { module: 'Users, roles and system configuration', admin: 'Manage', finance: 'Denied', sec: 'Denied' },
                  { module: 'Reports and exports', admin: 'All authorized reports', finance: 'Finance / AVI reports', sec: 'Intake reports' },
                ].map((row) => (
                  <tr key={row.module} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-[#092342]">{row.module}</td>
                    <td className="py-3 px-4">
                      <span className="rounded-full bg-[#dcfce7] text-[#15803d] px-2.5 py-0.5 text-[10.5px] font-extrabold">
                        {row.admin}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-extrabold ${
                          row.finance.includes('Denied')
                            ? 'bg-red-100 text-red-700'
                            : 'bg-[#fef3c7] text-[#92400e]'
                        }`}
                      >
                        {row.finance}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-extrabold ${
                          row.sec.includes('Denied')
                            ? 'bg-red-100 text-red-700'
                            : 'bg-[#e0f2fe] text-[#0369a1]'
                        }`}
                      >
                        {row.sec}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT TRAIL */}
      {subTab === 'audit' && (
        <div className="rounded-2xl border border-[#e6eef6] bg-white p-6 shadow-xs space-y-4">
          <div>
            <h2 className="text-base font-extrabold text-[#092342]">
              {isEn ? 'Security Audit Trail & Server-Side Enforcement Logs' : 'Journal d’Audit de Sécurité & Contrôles Serveur'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Traces des modifications de rôles, suspensions de comptes et rejets d'accès 403 Forbidden.
            </p>
          </div>

          <div className="space-y-2">
            {auditLogs.length > 0 ? (
              auditLogs.map((log) => {
                const isViolation = log.outcome?.includes('DENIED') || log.action?.includes('SECURITY_VIOLATION');
                return (
                  <div
                    key={log.id}
                    className={`rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs border ${
                      isViolation
                        ? 'bg-red-50 border-red-200 text-red-900'
                        : 'bg-[#f8fafc] border-slate-100 text-[#092342]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold text-white ${
                          isViolation ? 'bg-red-600' : 'bg-[#092342]'
                        }`}
                      >
                        {log.entity_ref || 'AUTH'}
                      </span>
                      <span className="font-extrabold">{log.actor}</span>
                      <span className="text-slate-600">{log.action}</span>
                      {log.details && (
                        <span className="text-[11px] text-slate-500 italic truncate max-w-md">
                          ({log.details})
                        </span>
                      )}
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                        isViolation
                          ? 'bg-red-200 text-red-800'
                          : 'bg-[#ccf5e5] text-[#0c685a]'
                      }`}
                    >
                      {log.outcome || 'SUCCESS'}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="text-xs text-slate-400 py-6 text-center">Aucun événement d’audit enregistré.</div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: CREATE USER */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-extrabold text-[#092342] flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#0c685a]" />
                <span>{isEn ? 'Create a New User (Admin Workflow)' : 'Créer un Nouvel Utilisateur (Admin Workflow)'}</span>
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCreateUser} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {isEn ? 'Full Name *' : 'Nom complet *'}
                </label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder={isEn ? 'e.g. Jean-Paul Mbuyi' : 'ex: Jean-Paul Mbuyi'}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#0c685a]/20"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {isEn ? 'Professional Email *' : 'Email professionnel *'}{' '}
                  <span className="text-[10.5px] font-semibold text-[#0c685a]">(@liecconsulting.com)</span>
                </label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder={isEn ? 'e.g. j.mbuyi@liecconsulting.com' : 'ex: j.mbuyi@liecconsulting.com'}
                  pattern="^[a-zA-Z0-9._%+\-]+@liecconsulting\.com$"
                  title={isEn ? 'Email must end with @liecconsulting.com' : 'L’email doit se terminer par @liecconsulting.com'}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#0c685a]/20"
                />
                {newUserEmail && !newUserEmail.toLowerCase().endsWith('@liecconsulting.com') && (
                  <p className="mt-1 text-[11px] text-amber-600 font-semibold">
                    {isEn
                      ? 'Email must end with @liecconsulting.com'
                      : 'L’email doit se terminer par @liecconsulting.com'}
                  </p>
                )}
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {isEn ? 'Business Profile' : 'Profil Métier (Business Profile)'}
                </label>
                <select
                  value={newUserProfile}
                  onChange={(e) => {
                    const prof = e.target.value as any;
                    setNewUserProfile(prof);
                    if (prof === 'Admin') setNewUserRoles(['admin', 'lh_security_admin']);
                    else if (prof === 'Finance Officer') setNewUserRoles(['lh_finance']);
                    else setNewUserRoles(['lh_internal', 'ITIL']);
                  }}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#0c685a]/20 font-extrabold text-[#092342]"
                >
                  <option value="Secretary">{isEn ? 'Secretary (Intake & Admissions)' : 'Secrétaire (Intake & Admissions)'}</option>
                  <option value="Finance Officer">{isEn ? 'Finance Officer (Blocked Finance / AVI)' : 'Officier Finance (Guichet AVI / Finances)'}</option>
                  <option value="Admin">{isEn ? 'Admin (Full System Privilege)' : 'Admin (Privilège Système Total)'}</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {isEn ? 'Technical Roles to Assign' : 'Rôles Techniques à Assigner'}
                </label>
                <div className="grid grid-cols-2 gap-2 border border-slate-200 rounded-xl p-2.5 bg-slate-50">
                  {['admin', 'lh_security_admin', 'ITIL', 'lh_internal', 'lh_finance'].map((rId) => {
                    const checked = newUserRoles.includes(rId);
                    return (
                      <label key={rId} className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) setNewUserRoles([...newUserRoles, rId]);
                            else setNewUserRoles(newUserRoles.filter((r) => r !== rId));
                          }}
                          className="h-3.5 w-3.5 text-[#0c685a] rounded"
                        />
                        <span className="font-mono text-[11px]">{rId}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {isEn ? 'Job Title / Position' : 'Intitulé de poste / Titre'}
                </label>
                <input
                  type="text"
                  value={newUserTitle}
                  onChange={(e) => setNewUserTitle(e.target.value)}
                  placeholder={isEn ? "e.g. Lyon Admissions Advisor" : "ex: Conseiller d'orientation Lyon"}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#0c685a]/20"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-extrabold"
                >
                  {isEn ? 'Cancel' : 'Annuler'}
                </button>
                <button
                  type="submit"
                  disabled={loadingAction}
                  className="px-4 py-2 rounded-xl bg-[#0c685a] hover:bg-[#094e45] text-white font-extrabold"
                >
                  {loadingAction
                    ? (isEn ? 'Saving...' : 'Enregistrement...')
                    : (isEn ? 'Save User' : "Enregistrer l'utilisateur")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TEMPORARY PASSWORD CONFIRMATION DIALOG (FOR ADMIN CREATOR ONLY) */}
      {createdUserCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-scaleUp border border-[#bbf0df]">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <Key className="w-5 h-5 text-[#0c685a]" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#092342]">
                    {isEn ? 'User Account Created Successfully' : 'Compte Utilisateur Créé avec Succès'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {isEn ? 'One-time secure temporary password generated' : 'Mot de passe temporaire unique généré'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCreatedUserCredentials(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Account Summary */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">{isEn ? 'Full Name:' : 'Nom complet :'}</span>
                <span className="font-extrabold text-[#092342]">{createdUserCredentials.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">{isEn ? 'Work Email:' : 'Email professionnel :'}</span>
                <span className="font-mono font-bold text-[#0c685a]">{createdUserCredentials.email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">{isEn ? 'Business Profile:' : 'Profil Métier :'}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#e0f8ef] text-[#0c685a]">
                  {createdUserCredentials.business_profile}
                </span>
              </div>
            </div>

            {/* Temporary Password Box */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>{isEn ? 'Default Temporary Password' : 'Mot de passe temporaire sécurisé'}</span>
                <span className="text-[10px] font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  {isEn ? 'Visible only now' : 'Affiché uniquement maintenant'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type={showCreatedPassword ? 'text' : 'password'}
                    readOnly
                    value={createdUserCredentials.temporaryPassword}
                    className="w-full rounded-xl border border-slate-300 bg-slate-100/90 px-3.5 py-2.5 text-xs font-mono font-extrabold text-[#092342] tracking-wider select-all focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatedPassword(!showCreatedPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 p-1"
                    title={showCreatedPassword ? (isEn ? 'Hide password' : 'Masquer') : (isEn ? 'Reveal password' : 'Révéler')}
                  >
                    {showCreatedPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(createdUserCredentials.temporaryPassword);
                    setCopiedPassword(true);
                    setTimeout(() => setCopiedPassword(false), 3000);
                  }}
                  className={`px-3 py-2.5 rounded-xl border text-xs font-extrabold flex items-center gap-1.5 transition ${
                    copiedPassword
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {copiedPassword ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{isEn ? 'Copied' : 'Copié'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>{isEn ? 'Copy' : 'Copier'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Secure Share Invitation Button */}
            <div>
              <button
                type="button"
                onClick={() => {
                  const shareText = isEn
                    ? `Welcome to LIEC Heav’n Workspace.\n\nYour account has been created:\n- Login URL: ${window.location.origin}/login\n- Username / Email: ${createdUserCredentials.email}\n- Temporary Password: ${createdUserCredentials.temporaryPassword}\n\nSecurity Policy: You are required to create a new personal password immediately upon your first login.`
                    : `Bienvenue sur l'espace LIEC Heav’n Workspace.\n\nVotre compte collaborateur a été créé :\n- Lien de connexion : ${window.location.origin}/login\n- Identifiant / Email : ${createdUserCredentials.email}\n- Mot de passe temporaire : ${createdUserCredentials.temporaryPassword}\n\nPolitique de sécurité : Vous serez invité à définir votre mot de passe personnel dès votre première connexion.`;
                  navigator.clipboard.writeText(shareText);
                  setCopiedInvite(true);
                  setTimeout(() => setCopiedInvite(false), 3000);
                }}
                className={`w-full py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                  copiedInvite
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {copiedInvite ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>{isEn ? 'Invitation Details Copied to Clipboard!' : 'Message d’invitation copié !'}</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4 text-slate-500" />
                    <span>{isEn ? 'Copy Secure Invitation Message' : 'Copier le message d’invitation sécurisé'}</span>
                  </>
                )}
              </button>
            </div>

            {/* Security Warning Notice */}
            <div className="rounded-xl bg-amber-50 border border-amber-200/80 p-3 text-[11px] text-amber-900 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong className="block font-bold">
                  {isEn ? 'Mandatory First-Login Password Change Enforced' : 'Changement de mot de passe obligatoire'}
                </strong>
                {isEn
                  ? 'For security compliance, this temporary password is never saved in plain text and cannot be retrieved later. The new user will be strictly required to configure their own personal password upon their first login before accessing any workspace features.'
                  : 'Par conformité de sécurité, ce mot de passe temporaire n’est jamais enregistré en clair et ne pourra plus être consulté. Le collaborateur devra obligatoirement définir son mot de passe personnel dès sa première connexion avant d’accéder au workspace.'}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t">
              <button
                type="button"
                onClick={() => setCreatedUserCredentials(null)}
                className="px-5 py-2 rounded-xl bg-[#0c685a] hover:bg-[#094e45] text-white font-extrabold text-xs"
              >
                {isEn ? 'Done & Close' : 'Terminé'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT ROLES */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-extrabold text-[#092342] flex items-center gap-2">
                <Key className="w-4 h-4 text-[#0c685a]" />
                <span>
                  {isEn ? `Edit Roles for: ${editingUser.name}` : `Modifier les Rôles de : ${editingUser.name}`}
                </span>
              </h3>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditRoles} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {isEn ? 'Business Profile' : 'Profil Métier (Business Profile)'}
                </label>
                <select
                  value={editProfile}
                  onChange={(e) => setEditProfile(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-extrabold text-[#092342]"
                >
                  <option value="Secretary">{isEn ? 'Secretary (Intake & Admissions)' : 'Secrétaire (Intake & Admissions)'}</option>
                  <option value="Finance Officer">{isEn ? 'Finance Officer (Blocked Finance / AVI)' : 'Officier Finance (Guichet AVI / Finances)'}</option>
                  <option value="Admin">{isEn ? 'Admin (Full System Privilege)' : 'Admin (Privilège Système Total)'}</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {isEn ? 'Assigned Technical Roles' : 'Rôles Techniques Assignés'}
                </label>
                <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50">
                  {[
                    {
                      id: 'admin',
                      warn: isEn ? 'Warning: Full platform administrator privilege.' : 'Attention: Accès privilège total sur la plateforme.',
                    },
                    {
                      id: 'lh_security_admin',
                      warn: isEn ? 'Security administration & sensitive controls.' : 'Administration sécurité & contrôles sensibles.',
                    },
                    {
                      id: 'ITIL',
                      warn: isEn ? 'Secretariat workflow operator.' : 'Opérateur workflows Secrétariat.',
                    },
                    {
                      id: 'lh_internal',
                      warn: isEn ? 'Internal access to records and admissions files.' : 'Accès interne aux dossiers et demandes d’admission.',
                    },
                    {
                      id: 'lh_finance',
                      warn: isEn ? 'AVI counter and YIMMILINE financing management.' : 'Gestion Guichet AVI et financements YIMMILINE.',
                    },
                  ].map((r) => {
                    const checked = editRoles.includes(r.id);
                    return (
                      <div key={r.id} className="flex items-start gap-2.5 p-1.5 rounded-lg hover:bg-white">
                        <input
                          type="checkbox"
                          id={`edit-role-${r.id}`}
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) setEditRoles([...editRoles, r.id]);
                            else setEditRoles(editRoles.filter((id) => id !== r.id));
                          }}
                          className="mt-0.5 h-4 w-4 text-[#0c685a] rounded"
                        />
                        <label htmlFor={`edit-role-${r.id}`} className="cursor-pointer">
                          <div className="font-mono font-extrabold text-[#092342]">{r.id}</div>
                          <div className="text-[10px] text-slate-500">{r.warn}</div>
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-extrabold"
                >
                  {isEn ? 'Cancel' : 'Annuler'}
                </button>
                <button
                  type="submit"
                  disabled={loadingAction}
                  className="px-4 py-2 rounded-xl bg-[#0c685a] hover:bg-[#094e45] text-white font-extrabold"
                >
                  {loadingAction
                    ? (isEn ? 'Saving...' : 'Enregistrement...')
                    : (isEn ? 'Save Changes' : 'Sauvegarder les modifications')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
