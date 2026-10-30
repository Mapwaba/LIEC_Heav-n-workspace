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
  Printer,
  Search,
  Clock,
  CreditCard,
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

export const PREPA_TOTAL_FEE = 2800.00;
export const PREPA_INSTALMENT_1_AMOUNT = 1800.12;
export const PREPA_INSTALMENT_1_PCT = 64.29;
export const PREPA_INSTALMENT_2_AMOUNT = 999.88;
export const PREPA_INSTALMENT_2_PCT = 35.71;

export function RapportsFinanceScreen({
  invoices = [],
  candidats = [],
  prepaPayments = [],
  prepaReceipts = [],
  currentRole,
  currentUser,
  onRefreshWorkspace,
  onNotify,
  lang = 'en',
}: {
  invoices: any[];
  candidats?: any[];
  prepaPayments?: any[];
  prepaReceipts?: any[];
  currentRole: string;
  currentUser?: any;
  onRefreshWorkspace?: () => void;
  onNotify: (msg: string) => void;
  lang?: Lang;
}) {
  const isEn = lang === 'en';
  const [activeFinanceTab, setActiveFinanceTab] = useState<'prepa_schedule' | 'general_ledger'>('prepa_schedule');
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedCandidateRef, setSelectedCandidateRef] = useState<string>('');
  const [candidateSearchQuery, setCandidateSearchQuery] = useState<string>('');
  
  // Registration & Validation Modal State
  const [showPaymentRegisterModal, setShowPaymentRegisterModal] = useState(false);
  const [registerInstalmentNumber, setRegisterInstalmentNumber] = useState<1 | 2>(1);
  const [registerPaymentMethod, setRegisterPaymentMethod] = useState<string>('Bank Wire (Virement)');
  const [registerTransactionRef, setRegisterTransactionRef] = useState<string>('');
  const [registerNotes, setRegisterNotes] = useState<string>('');
  const [registerAutoValidate, setRegisterAutoValidate] = useState<boolean>(true);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState<boolean>(false);

  // Active Receipt Preview State
  const [activeReceipt, setActiveReceipt] = useState<any>(null);
  const [isGeneratingReceipt, setIsGeneratingReceipt] = useState<boolean>(false);

  const invoicesList = Array.isArray(invoices) ? invoices : [];
  const safeCandidats = Array.isArray(candidats) ? candidats : [];
  const safePayments = Array.isArray(prepaPayments) ? prepaPayments : [];
  const safeReceipts = Array.isArray(prepaReceipts) ? prepaReceipts : [];

  const isAuthorizedValidator =
    currentRole === 'admin' ||
    currentRole === 'avi' ||
    currentUser?.business_profile === 'Admin' ||
    currentUser?.business_profile === 'Finance Officer' ||
    currentUser?.technical_roles?.includes('lh_admin') ||
    currentUser?.technical_roles?.includes('lh_finance');

  // Candidate roster for LIEC-France PREPA
  const prepaCandidates = useMemo(() => {
    return safeCandidats.filter((c) => {
      const prog = (c.program || '').toLowerCase();
      const q = candidateSearchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        (c.full_name || '').toLowerCase().includes(q) ||
        (c.ref || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q);
      return matchSearch;
    });
  }, [safeCandidats, candidateSearchQuery]);

  // Selected candidate object
  const currentCandidate = useMemo(() => {
    return safeCandidats.find((c) => c.ref === selectedCandidateRef) || prepaCandidates[0] || null;
  }, [safeCandidats, selectedCandidateRef, prepaCandidates]);

  // Candidate's PREPA payments
  const candidatePayments = useMemo(() => {
    if (!currentCandidate) return { instalment1: null, instalment2: null, validatedTotal: 0 };
    const paymentsForCandidate = safePayments.filter((p) => p.candidate_ref === currentCandidate.ref);
    const inst1 = paymentsForCandidate.find((p) => p.instalment_number === 1) || null;
    const inst2 = paymentsForCandidate.find((p) => p.instalment_number === 2) || null;

    let total = 0;
    if (inst1 && inst1.status === 'Validated') total += Number(inst1.amount);
    if (inst2 && inst2.status === 'Validated') total += Number(inst2.amount);

    return { instalment1: inst1, instalment2: inst2, validatedTotal: total };
  }, [safePayments, currentCandidate]);

  // Candidate's PREPA receipts
  const candidateReceipts = useMemo(() => {
    if (!currentCandidate) return [];
    return safeReceipts.filter((r) => r.candidate_ref === currentCandidate.ref);
  }, [safeReceipts, currentCandidate]);

  // Financial KPI totals across all PREPA payments
  const prepaMetrics = useMemo(() => {
    const validated = safePayments.filter((p) => p.status === 'Validated');
    const totalCollected = validated.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const pendingCount = safePayments.filter((p) => p.status === 'Pending').length;
    
    // Group validated by candidate
    const candidateMap = new Map<string, number>();
    validated.forEach((p) => {
      candidateMap.set(p.candidate_ref, (candidateMap.get(p.candidate_ref) || 0) + Number(p.amount));
    });

    let fullyPaidCount = 0;
    let thresholdCount = 0;
    candidateMap.forEach((amt) => {
      if (amt >= PREPA_TOTAL_FEE) fullyPaidCount++;
      else if (amt >= PREPA_INSTALMENT_1_AMOUNT) thresholdCount++;
    });

    return {
      totalCollected,
      pendingCount,
      fullyPaidCount,
      thresholdCount,
      totalReceiptsCount: safeReceipts.length,
    };
  }, [safePayments, safeReceipts]);

  // Action: Register Payment
  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCandidate) return;
    setIsSubmittingPayment(true);

    try {
      const res = await fetch('/api/prepa/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate_ref: currentCandidate.ref,
          candidate_name: currentCandidate.full_name,
          candidate_email: currentCandidate.email,
          academic_intake: currentCandidate.academic_year || '2025–2026',
          instalment_number: registerInstalmentNumber,
          payment_method: registerPaymentMethod,
          transaction_ref: registerTransactionRef || `TXN-PREPA-${Date.now().toString().slice(-6)}`,
          auto_validate: registerAutoValidate && isAuthorizedValidator,
          notes: registerNotes,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to record payment');
      }

      onNotify(
        isEn
          ? `Instalment ${registerInstalmentNumber} recorded successfully for ${currentCandidate.full_name}.`
          : `Acompte ${registerInstalmentNumber} enregistré avec succès pour ${currentCandidate.full_name}.`
      );

      setShowPaymentRegisterModal(false);
      setRegisterTransactionRef('');
      setRegisterNotes('');
      if (onRefreshWorkspace) onRefreshWorkspace();
    } catch (err: any) {
      alert(err.message || 'Error recording payment');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Action: Validate or Reject Payment
  const handleUpdatePaymentStatus = async (paymentId: number, action: 'validate' | 'reject') => {
    if (!isAuthorizedValidator) {
      alert(isEn ? 'Only Admin or Finance Officer can validate payments.' : 'Seul un Administrateur ou Officier Finance peut valider un paiement.');
      return;
    }

    try {
      const res = await fetch('/api/prepa/payments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_id: paymentId, action }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update payment');
      }

      onNotify(
        isEn
          ? `Payment ${action === 'validate' ? 'validated' : 'rejected'} successfully.`
          : `Paiement ${action === 'validate' ? 'validé' : 'rejeté'} avec succès.`
      );

      if (onRefreshWorkspace) onRefreshWorkspace();
    } catch (err: any) {
      alert(err.message || 'Error updating payment');
    }
  };

  // Action: Generate Official Receipt
  const handleGenerateReceipt = async (paymentId: number, isReissue: boolean = false) => {
    setIsGeneratingReceipt(true);
    try {
      const res = await fetch('/api/prepa/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_id: paymentId, is_reissue: isReissue }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to generate receipt');
      }

      setActiveReceipt(data.receipt);
      onNotify(
        isEn
          ? `${isReissue ? 'Reissued' : 'Generated'} receipt ${data.receipt.receipt_number}. Ready for printing.`
          : `Reçu ${data.receipt.receipt_number} ${isReissue ? 'réémis' : 'généré'}. Prêt pour impression.`
      );

      if (onRefreshWorkspace) onRefreshWorkspace();
    } catch (err: any) {
      alert(err.message || 'Failed to generate receipt');
    } finally {
      setIsGeneratingReceipt(false);
    }
  };

  if (currentRole === 'secretary') {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center space-y-3">
        <Lock className="w-8 h-8 text-amber-600 mx-auto" />
        <h2 className="text-lg font-extrabold text-[#092342]">
          {isEn ? 'Restricted Financial Access (Secretary Role)' : 'Accès Financier Restreint (Rôle Secrétaire)'}
        </h2>
        <p className="text-xs text-slate-600 max-w-md mx-auto">
          {isEn
            ? 'In accordance with the LIEC Heav’n security matrix, financial totals, payment validations, and official receipts are restricted to Administrator and Finance Officer profiles.'
            : 'Conformément à la matrice de sécurité LIEC Heav’n, les totaux financiers, validations et reçus officiels sont réservés aux profils Administrateur et Officier Finance.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="inline-block rounded-full bg-[#ccf5e5] px-3 py-0.5 text-[10.5px] font-extrabold uppercase tracking-wider text-[#0c685a] mb-2">
            {isEn ? 'PROGRAMME FINANCE & OFFICIAL RECEIPTS' : 'FINANCE PROGRAMME & REÇUS OFFICIELS'}
          </span>
          <h1 className="text-[28px] font-extrabold text-[#092342] leading-tight">
            LIEC-France PREPA — Finance &amp; Receipts
          </h1>
          <p className="mt-1 text-sm text-slate-500 max-w-3xl">
            {isEn
              ? 'Authorized payment schedule: €2,800.00 total tuition (Instalment 1: €1,800.12 / 64.29% • Instalment 2: €999.88 / 35.71% due within 30 calendar days). Independent validation and official printable receipt generation.'
              : 'Échéancier officiel : 2 800,00 € (1er acompte : 1 800,12 € / 64,29% • 2nd acompte : 999,88 € / 35,71% à 30 jours). Validation indépendante et génération de reçus officiels.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              if (currentCandidate) {
                setSelectedCandidateRef(currentCandidate.ref);
              }
              setShowReceiptModal(true);
            }}
            className="rounded-xl bg-[#0c685a] hover:bg-[#0a5247] text-white px-4 py-2.5 text-xs font-extrabold shadow-sm flex items-center gap-2 transition cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>{isEn ? 'Generate Receipt' : 'Générer un reçu'}</span>
          </button>

          <button
            onClick={() => {
              window.print();
              onNotify(isEn ? 'Printing financial view...' : 'Impression en cours...');
            }}
            className="rounded-xl bg-[#092342] hover:bg-[#12365a] text-white px-4 py-2.5 text-xs font-extrabold shadow-sm flex items-center gap-2 transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>{isEn ? 'Print / Export' : 'Imprimer / Exporter'}</span>
          </button>
        </div>
      </div>

      {/* 5 Financial KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="rounded-2xl border border-[#e6eef6] bg-white p-4 shadow-card">
          <span className="text-[10px] font-bold uppercase text-slate-400">
            {isEn ? 'PREPA TUITION FEE' : 'TARIF PREPA RÉFÉRENCE'}
          </span>
          <div className="mt-1 text-xl font-extrabold text-[#092342]">€2,800.00</div>
          <span className="text-[11px] text-slate-500">
            {isEn ? 'Exact 2-instalment schedule' : 'Échéancier en 2 acomptes'}
          </span>
        </div>

        <div className="rounded-2xl border border-[#ccece2] bg-white p-4 shadow-card">
          <span className="text-[10px] font-bold uppercase text-[#0c685a]">
            {isEn ? 'VALIDATED COLLECTIONS' : 'ENCAISSEMENTS VALIDÉS'}
          </span>
          <div className="mt-1 text-xl font-extrabold text-[#0c685a]">
            €{prepaMetrics.totalCollected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] font-semibold text-[#0c685a]">
            Neon PostgreSQL Audited
          </span>
        </div>

        <div className="rounded-2xl border border-[#e6eef6] bg-white p-4 shadow-card">
          <span className="text-[10px] font-bold uppercase text-slate-400">
            {isEn ? 'PENDING VALIDATION' : 'EN ATTENTE VALIDATION'}
          </span>
          <div className="mt-1 text-xl font-extrabold text-[#92400e]">
            {prepaMetrics.pendingCount} {isEn ? 'Payments' : 'Paiements'}
          </div>
          <span className="text-[11px] text-slate-500">
            {isEn ? 'Requires staff check' : 'Vérification requise'}
          </span>
        </div>

        <div className="rounded-2xl border border-[#e6eef6] bg-white p-4 shadow-card">
          <span className="text-[10px] font-bold uppercase text-slate-400">
            {isEn ? 'INSTALMENT 1 (64.29%)' : 'SEUIL 1ER ACOMPTE (64,29%)'}
          </span>
          <div className="mt-1 text-xl font-extrabold text-[#092342]">
            {prepaMetrics.thresholdCount} {isEn ? 'Candidates' : 'Candidats'}
          </div>
          <span className="text-[11px] text-[#0c685a] font-semibold">
            ≥ €1,800.12 (Visa Ready)
          </span>
        </div>

        <div className="rounded-2xl border border-[#e6eef6] bg-white p-4 shadow-card">
          <span className="text-[10px] font-bold uppercase text-slate-400">
            {isEn ? 'FULLY SETTLED (100%)' : 'SOLDÉS À 100%'}
          </span>
          <div className="mt-1 text-xl font-extrabold text-[#092342]">
            {prepaMetrics.fullyPaidCount} {isEn ? 'Candidates' : 'Candidats'}
          </div>
          <span className="text-[11px] text-[#0c685a] font-semibold">
            €2,800.00 Complete
          </span>
        </div>
      </div>

      {/* Sub-Tabs: PREPA Payment Schedule & Receipts vs General Ledger */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveFinanceTab('prepa_schedule')}
          className={`px-4 py-2 text-xs font-extrabold rounded-xl transition cursor-pointer ${
            activeFinanceTab === 'prepa_schedule'
              ? 'bg-[#092342] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          🎓 {isEn ? 'LIEC-France PREPA Payment Schedule & Receipts' : 'Échéancier & Reçus LIEC-France PREPA'}
        </button>
        <button
          onClick={() => setActiveFinanceTab('general_ledger')}
          className={`px-4 py-2 text-xs font-extrabold rounded-xl transition cursor-pointer ${
            activeFinanceTab === 'general_ledger'
              ? 'bg-[#092342] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          📑 {isEn ? 'General Invoicing Ledger' : 'Journal Général des Factures'}
        </button>
      </div>

      {/* Tab 1: LIEC-France PREPA Payment Schedule & Receipts */}
      {activeFinanceTab === 'prepa_schedule' && (
        <div className="rounded-2xl border border-[#e6eef6] bg-white p-6 shadow-card space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-extrabold text-[#092342]">
                {isEn ? 'PREPA Enrolled Candidates & Payment Schedule' : 'Candidats PREPA & Échéancier de Paiement'}
              </h2>
              <p className="text-xs text-slate-500">
                {isEn
                  ? 'First instalment: €1,800.12 (64.29%) • Second instalment: €999.88 (35.71%) due 30 calendar days after instalment 1.'
                  : '1er acompte : 1 800,12 € (64,29%) • 2nd acompte : 999,88 € (35,71%) exigible 30 jours calendaires après le 1er.'}
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={candidateSearchQuery}
                onChange={(e) => setCandidateSearchQuery(e.target.value)}
                placeholder={isEn ? 'Search candidate by name, ref...' : 'Rechercher candidat, ref...'}
                className="w-full rounded-xl bg-[#f1f6fb] pl-9 pr-3 py-2 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0c685a]/20"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-y border-slate-100 bg-[#f8fafc] text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-3">REF ID</th>
                  <th className="py-3 px-3">{isEn ? 'CANDIDATE' : 'CANDIDAT'}</th>
                  <th className="py-3 px-3">{isEn ? 'INSTALMENT 1 (€1,800.12 / 64.29%)' : '1ER ACOMPTE (1 800,12 €)'}</th>
                  <th className="py-3 px-3">{isEn ? 'INSTALMENT 2 (€999.88 / 35.71%)' : '2ND ACOMPTE (999,88 €)'}</th>
                  <th className="py-3 px-3">{isEn ? 'TOTAL VALIDATED' : 'TOTAL VALIDÉ'}</th>
                  <th className="py-3 px-3">{isEn ? 'OUTSTANDING' : 'SOLDE RESTANT'}</th>
                  <th className="py-3 px-3 text-right">{isEn ? 'ACTIONS' : 'ACTIONS'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {prepaCandidates.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                      {isEn ? 'No candidates found in database.' : 'Aucun candidat trouvé dans la base de données.'}
                    </td>
                  </tr>
                ) : (
                  prepaCandidates.map((cand) => {
                    const cPayments = safePayments.filter((p) => p.candidate_ref === cand.ref);
                    const inst1 = cPayments.find((p) => p.instalment_number === 1);
                    const inst2 = cPayments.find((p) => p.instalment_number === 2);

                    let validatedSum = 0;
                    if (inst1 && inst1.status === 'Validated') validatedSum += Number(inst1.amount);
                    if (inst2 && inst2.status === 'Validated') validatedSum += Number(inst2.amount);

                    const balance = Math.max(0, PREPA_TOTAL_FEE - validatedSum);

                    return (
                      <tr key={cand.ref} className="hover:bg-slate-50">
                        <td className="py-3.5 px-3 font-mono font-extrabold text-[#092342]">{cand.ref}</td>
                        <td className="py-3.5 px-3">
                          <div className="font-extrabold text-[#092342]">{cand.full_name}</div>
                          <div className="text-[10px] text-slate-400">{cand.email || '—'}</div>
                        </td>

                        {/* Instalment 1 Cell */}
                        <td className="py-3.5 px-3">
                          {inst1 ? (
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10.5px] font-extrabold ${
                                inst1.status === 'Validated'
                                  ? 'bg-[#ccf5e5] text-[#0c685a]'
                                  : inst1.status === 'Rejected'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {inst1.status === 'Validated' ? '✓ ' : '⏳ '}
                              {inst1.status} (€1,800.12)
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">
                              {isEn ? 'Not recorded' : 'Non enregistré'}
                            </span>
                          )}
                        </td>

                        {/* Instalment 2 Cell */}
                        <td className="py-3.5 px-3">
                          {inst2 ? (
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10.5px] font-extrabold ${
                                inst2.status === 'Validated'
                                  ? 'bg-[#ccf5e5] text-[#0c685a]'
                                  : inst2.status === 'Rejected'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {inst2.status === 'Validated' ? '✓ ' : '⏳ '}
                              {inst2.status} (€999.88)
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">
                              {inst1 && inst1.status === 'Validated'
                                ? inst1.expected_next_date
                                  ? `${isEn ? 'Due' : 'Exigible'} ${new Date(inst1.expected_next_date).toLocaleDateString()}`
                                  : isEn ? 'Due in 30 days' : 'À 30 jours'
                                : isEn ? 'Awaiting Inst. 1' : 'En attente 1er acompte'}
                            </span>
                          )}
                        </td>

                        {/* Total Validated */}
                        <td className="py-3.5 px-3 font-extrabold text-[#0c685a]">
                          €{validatedSum.toFixed(2)}
                        </td>

                        {/* Outstanding Balance */}
                        <td className="py-3.5 px-3 font-extrabold text-[#92400e]">
                          €{balance.toFixed(2)}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-3 text-right">
                          <button
                            onClick={() => {
                              setSelectedCandidateRef(cand.ref);
                              setShowReceiptModal(true);
                            }}
                            className="rounded-lg bg-[#092342] hover:bg-[#12365a] text-white px-3 py-1.5 text-[11px] font-extrabold transition cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>{isEn ? 'Manage / Receipt' : 'Gérer / Reçu'}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: General Invoicing Ledger */}
      {activeFinanceTab === 'general_ledger' && (
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
      )}

      {/* MODAL 1: PREPA Candidate Receipts & Payment Schedule Manager */}
      {showReceiptModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-elevated border border-slate-100 space-y-5 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-[#0c685a]" />
                <div>
                  <h3 className="text-base font-extrabold text-[#092342]">
                    {isEn ? 'LIEC-France PREPA — Receipt & Payment Schedule Workflow' : 'LIEC-France PREPA — Gestion des Paiements & Reçus'}
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    Programme fee: €2,800.00 • Instalment 1: €1,800.12 (64.29%) • Instalment 2: €999.88 (35.71%)
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowReceiptModal(false);
                  setActiveReceipt(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Candidate Selector */}
            <div className="space-y-1.5 text-xs">
              <label className="block text-slate-700 font-bold">
                {isEn ? 'Select PREPA Candidate:' : 'Sélectionner le candidat PREPA :'}
              </label>
              <select
                value={currentCandidate ? currentCandidate.ref : ''}
                onChange={(e) => {
                  setSelectedCandidateRef(e.target.value);
                  setActiveReceipt(null);
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-[#092342] focus:outline-none focus:ring-2 focus:ring-[#0c685a]/20 cursor-pointer"
              >
                {safeCandidats.map((c) => (
                  <option key={c.ref} value={c.ref}>
                    {c.full_name} ({c.ref}) — {c.academic_year || '2025–2026 Intake'}
                  </option>
                ))}
              </select>
            </div>

            {currentCandidate ? (
              <div className="space-y-5">
                {/* Candidate Overview Card */}
                <div className="rounded-xl border border-slate-200 bg-[#f8fbff] p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {isEn ? 'CANDIDATE DETAILS' : 'DÉTAILS CANDIDAT'}
                    </div>
                    <div className="text-sm font-extrabold text-[#092342]">{currentCandidate.full_name}</div>
                    <div className="text-slate-500 font-mono">ID: {currentCandidate.ref}</div>
                  </div>

                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {isEn ? 'PROGRAMME' : 'PROGRAMME'}
                    </div>
                    <div className="font-bold text-[#0c685a]">LIEC-France PREPA</div>
                    <div className="text-slate-500">{currentCandidate.academic_year || '2025–2026'}</div>
                  </div>

                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {isEn ? 'TOTAL VALIDATED / BALANCE' : 'TOTAL VALIDÉ / SOLDE'}
                    </div>
                    <div className="text-sm font-extrabold text-[#0c685a]">
                      €{candidatePayments.validatedTotal.toFixed(2)} / €2,800.00
                    </div>
                    <div className="text-slate-500 font-semibold">
                      {candidatePayments.validatedTotal >= PREPA_TOTAL_FEE
                        ? isEn ? '✓ 100% Fully Settled' : '✓ 100% Soldé'
                        : isEn ? `Outstanding: €${(PREPA_TOTAL_FEE - candidatePayments.validatedTotal).toFixed(2)}` : `Solde : €${(PREPA_TOTAL_FEE - candidatePayments.validatedTotal).toFixed(2)}`}
                    </div>
                  </div>
                </div>

                {/* Both Instalments Comparison Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* INSTALMENT 1 CARD */}
                  <div className={`rounded-2xl border p-4 space-y-3 ${
                    candidatePayments.instalment1?.status === 'Validated'
                      ? 'border-[#ccece2] bg-[#f9fdfb]'
                      : 'border-slate-200 bg-white'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-[#092342]">
                        Instalment 1 of 2 (64.29%)
                      </span>
                      <span className="text-sm font-extrabold text-[#0c685a]">€1,800.12</span>
                    </div>

                    <div className="text-xs space-y-1.5 text-slate-600">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">STATUS</span>
                        {candidatePayments.instalment1 ? (
                          <span className={`inline-flex items-center gap-1 font-bold ${
                            candidatePayments.instalment1.status === 'Validated'
                              ? 'text-[#0c685a]'
                              : candidatePayments.instalment1.status === 'Rejected'
                              ? 'text-red-700'
                              : 'text-amber-700'
                          }`}>
                            {candidatePayments.instalment1.status === 'Validated' ? '✓ ' : '⏳ '}
                            {candidatePayments.instalment1.status}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Not registered yet</span>
                        )}
                      </div>

                      {candidatePayments.instalment1 && (
                        <>
                          <div className="text-[11px]">
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">PAYMENT REF</span>
                            <span className="font-mono text-slate-700">{candidatePayments.instalment1.payment_ref}</span>
                          </div>
                          {candidatePayments.instalment1.validated_at && (
                            <div className="text-[11px]">
                              <span className="text-slate-400 block text-[10px] uppercase font-bold">VALIDATION TIMESTAMP</span>
                              <span className="text-slate-700 font-semibold">
                                {new Date(candidatePayments.instalment1.validated_at).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })} (Europe/Paris)
                              </span>
                            </div>
                          )}
                          {candidatePayments.instalment1.expected_next_date && (
                            <div className="text-[11px] text-[#0c685a] font-semibold">
                              <span>Next Instalment Due: </span>
                              <span>{new Date(candidatePayments.instalment1.expected_next_date).toLocaleDateString()} (30 calendar days)</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Actions for Instalment 1 */}
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
                      {!candidatePayments.instalment1 ? (
                        <button
                          onClick={() => {
                            setRegisterInstalmentNumber(1);
                            setShowPaymentRegisterModal(true);
                          }}
                          className="w-full rounded-xl bg-[#092342] hover:bg-[#12365a] text-white py-2 text-xs font-extrabold cursor-pointer transition"
                        >
                          + Record Payment (€1,800.12)
                        </button>
                      ) : candidatePayments.instalment1.status === 'Pending' ? (
                        <>
                          <button
                            onClick={() => handleUpdatePaymentStatus(candidatePayments.instalment1.id, 'validate')}
                            className="flex-1 rounded-xl bg-[#0c685a] hover:bg-[#0a5247] text-white py-2 text-xs font-extrabold cursor-pointer transition"
                          >
                            ✓ Validate Payment
                          </button>
                          <button
                            onClick={() => handleUpdatePaymentStatus(candidatePayments.instalment1.id, 'reject')}
                            className="rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 px-3 py-2 text-xs font-bold cursor-pointer transition"
                          >
                            Reject
                          </button>
                        </>
                      ) : candidatePayments.instalment1.status === 'Validated' ? (
                        <button
                          onClick={() => handleGenerateReceipt(candidatePayments.instalment1.id)}
                          disabled={isGeneratingReceipt}
                          className="w-full rounded-xl bg-[#0c685a] hover:bg-[#0a5247] text-white py-2 text-xs font-extrabold cursor-pointer transition shadow-xs flex items-center justify-center gap-1.5"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Generate Receipt (1 of 2)</span>
                        </button>
                      ) : (
                        <div className="text-xs text-red-600 font-bold">
                          Payment rejected. Cannot issue receipt.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* INSTALMENT 2 CARD */}
                  <div className={`rounded-2xl border p-4 space-y-3 ${
                    candidatePayments.instalment2?.status === 'Validated'
                      ? 'border-[#ccece2] bg-[#f9fdfb]'
                      : 'border-slate-200 bg-white'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-[#092342]">
                        Instalment 2 of 2 (35.71%)
                      </span>
                      <span className="text-sm font-extrabold text-[#0c685a]">€999.88</span>
                    </div>

                    <div className="text-xs space-y-1.5 text-slate-600">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">STATUS</span>
                        {candidatePayments.instalment2 ? (
                          <span className={`inline-flex items-center gap-1 font-bold ${
                            candidatePayments.instalment2.status === 'Validated'
                              ? 'text-[#0c685a]'
                              : candidatePayments.instalment2.status === 'Rejected'
                              ? 'text-red-700'
                              : 'text-amber-700'
                          }`}>
                            {candidatePayments.instalment2.status === 'Validated' ? '✓ ' : '⏳ '}
                            {candidatePayments.instalment2.status}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">
                            {candidatePayments.instalment1?.status === 'Validated'
                              ? isEn ? 'Eligible for registration (due within 30 days)' : 'Exigible (sous 30 jours)'
                              : isEn ? 'Awaiting Instalment 1' : 'En attente 1er acompte'}
                          </span>
                        )}
                      </div>

                      {candidatePayments.instalment2 && (
                        <>
                          <div className="text-[11px]">
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">PAYMENT REF</span>
                            <span className="font-mono text-slate-700">{candidatePayments.instalment2.payment_ref}</span>
                          </div>
                          {candidatePayments.instalment2.validated_at && (
                            <div className="text-[11px]">
                              <span className="text-slate-400 block text-[10px] uppercase font-bold">VALIDATION TIMESTAMP</span>
                              <span className="text-slate-700 font-semibold">
                                {new Date(candidatePayments.instalment2.validated_at).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })} (Europe/Paris)
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Actions for Instalment 2 */}
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
                      {!candidatePayments.instalment2 ? (
                        <button
                          onClick={() => {
                            setRegisterInstalmentNumber(2);
                            setShowPaymentRegisterModal(true);
                          }}
                          className="w-full rounded-xl bg-[#092342] hover:bg-[#12365a] text-white py-2 text-xs font-extrabold cursor-pointer transition"
                        >
                          + Record Payment (€999.88)
                        </button>
                      ) : candidatePayments.instalment2.status === 'Pending' ? (
                        <>
                          <button
                            onClick={() => handleUpdatePaymentStatus(candidatePayments.instalment2.id, 'validate')}
                            className="flex-1 rounded-xl bg-[#0c685a] hover:bg-[#0a5247] text-white py-2 text-xs font-extrabold cursor-pointer transition"
                          >
                            ✓ Validate Payment
                          </button>
                          <button
                            onClick={() => handleUpdatePaymentStatus(candidatePayments.instalment2.id, 'reject')}
                            className="rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 px-3 py-2 text-xs font-bold cursor-pointer transition"
                          >
                            Reject
                          </button>
                        </>
                      ) : candidatePayments.instalment2.status === 'Validated' ? (
                        <button
                          onClick={() => handleGenerateReceipt(candidatePayments.instalment2.id)}
                          disabled={isGeneratingReceipt}
                          className="w-full rounded-xl bg-[#0c685a] hover:bg-[#0a5247] text-white py-2 text-xs font-extrabold cursor-pointer transition shadow-xs flex items-center justify-center gap-1.5"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Generate Receipt (2 of 2 - Full)</span>
                        </button>
                      ) : (
                        <div className="text-xs text-red-600 font-bold">
                          Payment rejected. Cannot issue receipt.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Printable Official Receipt View */}
                {activeReceipt && (
                  <div className="space-y-4 pt-4 border-t border-slate-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#0c685a]" />
                        <span className="font-extrabold text-xs text-[#092342]">
                          Official Receipt Ready ({activeReceipt.receipt_number})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleGenerateReceipt(activeReceipt.payment_id, true)}
                          className="rounded-xl border border-slate-200 hover:bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 cursor-pointer"
                        >
                          {isEn ? 'Reissue Duplicate Copy' : 'Réémettre duplicata'}
                        </button>
                        <button
                          onClick={() => window.print()}
                          className="rounded-xl bg-[#092342] hover:bg-[#12365a] text-white px-4 py-1.5 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>{isEn ? 'Print / Save PDF' : 'Imprimer / Sauvegarder PDF'}</span>
                        </button>
                      </div>
                    </div>

                    {/* OFFICIAL PRINTABLE PDF CARD CONTAINER */}
                    <div
                      id="liec-official-printable-receipt"
                      className="rounded-2xl border-2 border-[#092342]/20 bg-white p-8 space-y-6 font-sans text-xs text-[#092342] shadow-md print:shadow-none print:border-none print:p-0"
                    >
                      {/* RECEIPT HEADER */}
                      <div className="flex items-start justify-between border-b-2 border-[#092342] pb-5">
                        <div className="flex items-center gap-4">
                          <img
                            src="/logo_liec_prepa.png"
                            alt="LIEC Logo"
                            className="h-20 w-auto object-contain"
                          />
                          <div>
                            <div className="text-base font-extrabold tracking-tight text-[#092342]">
                              Lyon International Education Consulting (LIEC)
                            </div>
                            <div className="text-xs font-bold text-[#0c685a] mt-0.5">
                              Programme: LIEC-France PREPA
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Paris • Lyon • Kinshasa | www.liecconsulting.com
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="inline-block rounded-md bg-[#092342] text-white px-3 py-1 text-xs font-extrabold tracking-wider uppercase">
                            PAYMENT RECEIPT
                          </span>
                          {activeReceipt.is_reissue && (
                            <div className="mt-1 text-[10.5px] font-extrabold text-amber-700 uppercase tracking-wider">
                              [ DUPLICATE / REISSUED COPY #{activeReceipt.reissue_count || 1} ]
                            </div>
                          )}
                          <div className="font-mono font-extrabold text-sm text-[#092342] mt-2">
                            {activeReceipt.receipt_number}
                          </div>
                        </div>
                      </div>

                      {/* METADATA & CANDIDATE DETAILS ROW */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-[#f8fbff] border border-[#e6eef6] text-[11px]">
                        <div>
                          <span className="text-slate-400 block text-[9.5px] uppercase font-bold">ISSUE DATE & TIME</span>
                          <span className="font-bold text-[#092342]">
                            {activeReceipt.issue_date_paris} {activeReceipt.issue_time_paris}
                          </span>
                          <span className="text-slate-400 block text-[9.5px] font-mono">({activeReceipt.timezone || 'Europe/Paris'})</span>
                        </div>

                        <div>
                          <span className="text-slate-400 block text-[9.5px] uppercase font-bold">VALIDATION RECORD</span>
                          <span className="font-bold text-[#0c685a]">
                            {activeReceipt.metadata?.validated_at
                              ? new Date(activeReceipt.metadata.validated_at).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })
                              : 'Verified Staff'}
                          </span>
                          <span className="text-slate-400 block text-[9.5px]">By: {activeReceipt.metadata?.validated_by || 'Staff'}</span>
                        </div>

                        <div>
                          <span className="text-slate-400 block text-[9.5px] uppercase font-bold">PAYMENT REFERENCE</span>
                          <span className="font-mono font-bold text-[#092342]">
                            {activeReceipt.payment_ref}
                          </span>
                          <span className="text-slate-400 block text-[9.5px]">{activeReceipt.metadata?.payment_method || 'Bank Wire'}</span>
                        </div>

                        <div>
                          <span className="text-slate-400 block text-[9.5px] uppercase font-bold">VERIFICATION REFERENCE</span>
                          <span className="font-mono font-extrabold text-[#092342] text-[10px]">
                            {activeReceipt.verification_ref}
                          </span>
                        </div>
                      </div>

                      {/* CANDIDATE INFORMATION */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs border-b border-slate-200 pb-4">
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">CANDIDATE FULL NAME</span>
                          <span className="font-extrabold text-sm text-[#092342]">{activeReceipt.candidate_name}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">CANDIDATE IDENTIFIER</span>
                          <span className="font-mono font-bold text-[#092342]">{activeReceipt.candidate_ref}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">ACADEMIC INTAKE COHORT</span>
                          <span className="font-bold text-[#0c685a]">{activeReceipt.metadata?.academic_intake || '2025–2026 Intake'}</span>
                        </div>
                      </div>

                      {/* PAYMENT SCHEDULE & RECEIPT BREAKDOWN TABLE */}
                      <div className="rounded-xl border border-slate-200 overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-[#092342] text-white text-[10px] uppercase tracking-wider font-extrabold">
                            <tr>
                              <th className="py-2.5 px-3">Description</th>
                              <th className="py-2.5 px-3 text-center">Percentage</th>
                              <th className="py-2.5 px-3 text-right">Amount Received</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            <tr>
                              <td className="py-3 px-3">
                                <div className="font-extrabold text-[#092342]">
                                  {activeReceipt.instalment_number === 1
                                    ? 'LIEC-France PREPA — First Instalment (64.29%)'
                                    : 'LIEC-France PREPA — Second Instalment (35.71%)'}
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  {activeReceipt.instalment_number === 1
                                    ? 'Initial visa procedure qualification, scientific tests & university lodging support'
                                    : 'Final balance completion for full PREPA cohort participation'}
                                </div>
                              </td>
                              <td className="py-3 px-3 text-center font-bold text-[#092342]">
                                {activeReceipt.instalment_number === 1 ? '64.29%' : '35.71%'}
                              </td>
                              <td className="py-3 px-3 text-right font-extrabold text-sm text-[#0c685a]">
                                €{Number(activeReceipt.amount_paid).toFixed(2)}
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        {/* Financial Totals Summary Box */}
                        <div className="bg-[#f8fbff] p-4 border-t border-slate-200 space-y-2 text-xs">
                          <div className="flex justify-between items-center text-slate-600">
                            <span>Total Programme Fee (Configured Schedule)</span>
                            <span className="font-extrabold text-[#092342]">€2,800.00</span>
                          </div>
                          <div className="flex justify-between items-center text-slate-600">
                            <span>Previously Validated Amount</span>
                            <span className="font-bold text-slate-700">
                              €{Number(activeReceipt.metadata?.previously_validated_amount || 0).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[#0c685a] font-bold border-t border-slate-200 pt-2">
                            <span>Cumulative Amount Paid to Date</span>
                            <span className="text-base font-extrabold">
                              €{Number(activeReceipt.cumulative_paid).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-slate-700 font-bold border-t border-slate-200 pt-2">
                            <span>Outstanding Balance Remaining</span>
                            <span className={`text-base font-extrabold ${Number(activeReceipt.outstanding_balance) === 0 ? 'text-[#0c685a]' : 'text-[#92400e]'}`}>
                              €{Number(activeReceipt.outstanding_balance).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* PROGRAMME PAYMENT STATUS DISTINCTION BANNER */}
                      <div className={`p-3 rounded-xl text-center font-extrabold text-xs ${
                        Number(activeReceipt.cumulative_paid) >= PREPA_TOTAL_FEE
                          ? 'bg-[#ccf5e5] text-[#0c685a] border border-[#a3e9d2]'
                          : 'bg-[#d8f6ea] text-[#094f46] border border-[#bfead9]'
                      }`}>
                        {Number(activeReceipt.cumulative_paid) >= PREPA_TOTAL_FEE
                          ? '✓ FULL PROGRAMME PAYMENT SETTLED (100.00%) — Total Validated: €2,800.00. Outstanding Balance: €0.00. All LIEC-France PREPA Financial Requirements Fully Satisfied.'
                          : `✓ PARTIAL INSTALMENT PAYMENT (64.29%) — Initial Payment Validated (€1,800.12). Candidate Eligible for Visa Lodging & Partner University Procedure. Outstanding Balance: €999.88 (Due within 30 calendar days).`}
                      </div>

                      {/* FOOTER: ACKNOWLEDGEMENT, LEGAL INFO & OFFICIAL STAMP */}
                      <div className="border-t border-slate-200 pt-4 space-y-4">
                        <p className="text-[11px] text-slate-500 italic leading-relaxed text-center">
                          Lyon International Education Consulting hereby acknowledges receipt and validation of the above funds towards the LIEC-France PREPA programme. This document serves as official financial proof of payment.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end pt-2">
                          {/* Left Legal Info */}
                          <div className="text-[10px] text-slate-500 space-y-0.5">
                            <div className="font-extrabold text-[#092342]">Lyon International Education Consulting (LIEC) SAS</div>
                            <div>Paris Head Office: 12 Rue de la Paix, 75002 Paris, France</div>
                            <div>Lyon Office: 45 Rue de la République, 69002 Lyon, France</div>
                            <div>Kinshasa Hub: Boulevard du 30 Juin, Gombe, Kinshasa, RDC</div>
                            <div>RCS Paris B 912 345 678 • SIRET 912 345 678 00012</div>
                            <div>finance@liecconsulting.com • www.liecconsulting.com</div>
                          </div>

                          {/* Right Official Stamp & Signature Area */}
                          <div className="rounded-xl border-2 border-dashed border-[#092342]/30 p-3 text-center space-y-2 bg-[#fdfefe]">
                            <div className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400">
                              AUTHENTICATION &amp; OFFICIAL STAMP AREA
                            </div>
                            
                            {/* Visual Stamp Framing with Official LIEC Stamp Asset */}
                            <div className="min-h-[85px] flex items-center justify-center py-1">
                              <img
                                src="/liec_official_stamp.png"
                                alt="LIEC Official Stamp"
                                className="h-20 w-auto object-contain mx-auto opacity-95 drop-shadow-sm select-none"
                              />
                            </div>

                            <div className="border-t border-slate-200 pt-1 text-[10px] text-[#092342]">
                              Authorised Signatory: <span className="font-bold">Barthelemy MAPWABA NTORO</span>
                              <div className="text-[9px] text-slate-400">Managing Director • Senior Advisor</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">
                {isEn ? 'Please select a candidate above.' : 'Veuillez sélectionner un candidat ci-dessus.'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: Record / Validate PREPA Payment */}
      {showPaymentRegisterModal && currentCandidate && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-elevated border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-[#092342]">
                {isEn ? `Record Instalment ${registerInstalmentNumber}` : `Enregistrer Acompte ${registerInstalmentNumber}`}
              </h3>
              <button
                onClick={() => setShowPaymentRegisterModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterPayment} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Candidate</label>
                <div className="font-extrabold text-[#092342]">{currentCandidate.full_name} ({currentCandidate.ref})</div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Programme</label>
                <div className="font-bold text-[#0c685a]">LIEC-France PREPA (€2,800.00 Total)</div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Instalment</label>
                <div className="font-extrabold text-[#092342]">
                  {registerInstalmentNumber === 1
                    ? 'Instalment 1 of 2: €1,800.12 (64.29%)'
                    : 'Instalment 2 of 2: €999.88 (35.71%)'}
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Payment Method</label>
                <select
                  value={registerPaymentMethod}
                  onChange={(e) => setRegisterPaymentMethod(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-semibold text-[#092342]"
                >
                  <option value="Bank Wire (Virement)">Bank Wire (Virement bancaire)</option>
                  <option value="Credit Card (Carte Bancaire)">Credit Card (Carte Bancaire)</option>
                  <option value="Certified Deposit (Dépôt Certifié)">Certified Deposit (Dépôt Certifié)</option>
                  <option value="Cash Counter / Guichet LIEC">Cash Counter / Guichet LIEC</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Transaction Ref / Proof Reference</label>
                <input
                  type="text"
                  value={registerTransactionRef}
                  onChange={(e) => setRegisterTransactionRef(e.target.value)}
                  placeholder="e.g. WIRE-FR-2026-9812 / Swift MT103"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 font-semibold text-[#092342]"
                />
              </div>

              {isAuthorizedValidator && (
                <div className="p-3 rounded-xl bg-[#eefaf6] border border-[#bbf0df] flex items-center justify-between">
                  <label className="font-extrabold text-[#0c685a] cursor-pointer">
                    Validate payment immediately upon recording
                  </label>
                  <input
                    type="checkbox"
                    checked={registerAutoValidate}
                    onChange={(e) => setRegisterAutoValidate(e.target.checked)}
                    className="h-4 w-4 rounded text-[#0c685a]"
                  />
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPaymentRegisterModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPayment}
                  className="rounded-xl bg-[#092342] hover:bg-[#12365a] text-white px-5 py-2 font-extrabold shadow-sm disabled:opacity-60"
                >
                  {isSubmittingPayment ? 'Saving...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
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
  sessionTimeouts: initialSessionTimeouts = [],
  onRefreshWorkspace,
}: {
  auditLogs?: any[];
  dbEngine?: string;
  lang?: Lang;
  currentUser?: any;
  rolePreview?: 'admin' | 'secretary' | 'avi';
  users?: any[];
  roles?: any[];
  sessionTimeouts?: any[];
  onRefreshWorkspace?: () => void;
}) {
  const isEn = lang === 'en';
  const isAdmin =
    rolePreview === 'admin' ||
    currentUser?.business_profile === 'Admin' ||
    currentUser?.role === 'admin';

  const [subTab, setSubTab] = useState<'matrix' | 'roles' | 'users' | 'audit' | 'session'>('users');
  const [userList, setUserList] = useState<any[]>(initialUsers);
  const [roleList, setRoleList] = useState<any[]>(initialRoles);
  const [sessionTimeoutsList, setSessionTimeoutsList] = useState<any[]>(initialSessionTimeouts);
  const [timeoutValues, setTimeoutValues] = useState<Record<string, number>>({});
  const [loadingTimeouts, setLoadingTimeouts] = useState(false);
  const [savingTimeoutRole, setSavingTimeoutRole] = useState<string | null>(null);
  const [activeUserTimeout, setActiveUserTimeout] = useState<number>(15);
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

  useEffect(() => {
    if (initialSessionTimeouts && initialSessionTimeouts.length > 0) {
      setSessionTimeoutsList(initialSessionTimeouts);
      const map: Record<string, number> = {};
      initialSessionTimeouts.forEach((item: any) => {
        map[item.role_id] = item.timeout_minutes;
      });
      setTimeoutValues((prev) => ({ ...map, ...prev }));
    }
  }, [initialSessionTimeouts]);

  const fetchTimeouts = useCallback(async () => {
    try {
      setLoadingTimeouts(true);
      const activeEmail = currentUser?.email || 'bmapwabantoro@liecconsulting.com';
      const res = await fetch('/api/session-timeout', {
        headers: { 'x-user-email': activeEmail },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.timeouts && Array.isArray(data.timeouts)) {
          setSessionTimeoutsList(data.timeouts);
          const map: Record<string, number> = {};
          data.timeouts.forEach((item: any) => {
            map[item.role_id] = item.timeout_minutes;
          });
          setTimeoutValues((prev) => ({ ...map, ...prev }));
        }
        if (data.userTimeout) {
          setActiveUserTimeout(data.userTimeout);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch session timeouts:', e);
    } finally {
      setLoadingTimeouts(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchTimeouts();
  }, [fetchTimeouts]);

  const handleSaveTimeout = async (roleId: string, roleName?: string, businessProfile?: string) => {
    const rawVal = timeoutValues[roleId] ?? 15;
    const minutes = Math.min(30, Math.max(10, Math.round(Number(rawVal))));

    setSavingTimeoutRole(roleId);
    try {
      const res = await fetch('/api/session-timeout', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': currentUser?.email || 'bmapwabantoro@liecconsulting.com',
        },
        body: JSON.stringify({
          role_id: roleId,
          role_name: roleName,
          business_profile: businessProfile,
          timeout_minutes: minutes,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.timeouts) {
          setSessionTimeoutsList(data.timeouts);
        }
        onRefreshWorkspace?.();
        showFeedback(
          isEn
            ? `Session timeout for '${roleName || roleId}' successfully saved to ${minutes} min.`
            : `Délai de session pour '${roleName || roleId}' enregistré à ${minutes} min avec succès.`
        );
      } else {
        const err = await res.json();
        showFeedback(err.error_en || err.error || 'Erreur lors de la sauvegarde');
      }
    } catch {
      showFeedback(isEn ? 'Network error saving timeout' : 'Erreur réseau');
    } finally {
      setSavingTimeoutRole(null);
    }
  };

  const handleSaveAllTimeouts = async () => {
    setSavingTimeoutRole('all');
    try {
      const updates = Object.keys(timeoutValues).map((roleId) => ({
        role_id: roleId,
        timeout_minutes: Math.min(30, Math.max(10, Math.round(Number(timeoutValues[roleId])))),
      }));

      const res = await fetch('/api/session-timeout', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': currentUser?.email || 'bmapwabantoro@liecconsulting.com',
        },
        body: JSON.stringify({ updates }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.timeouts) setSessionTimeoutsList(data.timeouts);
        onRefreshWorkspace?.();
        showFeedback(
          isEn
            ? 'All role session timeouts updated successfully (10-30m range enforced).'
            : 'Tous les délais de session par rôle ont été mis à jour avec succès (plage 10-30 min respectée).'
        );
      } else {
        const err = await res.json();
        showFeedback(err.error || 'Erreur lors de la mise à jour des délais');
      }
    } catch {
      showFeedback('Erreur réseau lors de la mise à jour');
    } finally {
      setSavingTimeoutRole(null);
    }
  };

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
          { id: 'session', label: isEn ? 'Session Timeouts (10-30m)' : 'Délais de Session (10-30 min)', icon: Clock },
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

      {/* TAB: SESSION TIMEOUT POLICIES (Admin Only, Manageable Range: 10 - 30 minutes) */}
      {subTab === 'session' && (
        <div className="space-y-6 animate-fadeIn">
          {!isAdmin ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900 text-xs shadow-xs">
              <div className="flex items-center gap-2 text-sm font-extrabold mb-1">
                <ShieldAlert className="w-5 h-5 text-amber-700" />
                <span>{isEn ? 'Restricted to Platform Administrators' : 'Accès Restreint aux Administrateurs'}</span>
              </div>
              <p>
                {isEn
                  ? 'Only Platform Administrators with the Admin role can manage session timeout policies. This ensures unauthorized users cannot modify session inactivity rules.'
                  : 'Seul un Administrateur doté du profil Admin peut gérer et modifier les délais d’expiration de session par rôle.'}
              </p>
            </div>
          ) : (
            <>
              {/* Header Banner & Save All Action */}
              <div className="rounded-2xl border border-[#d8f6ea] bg-gradient-to-r from-[#f0faf7] to-white p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
                <div className="flex items-start gap-3.5">
                  <div className="h-11 w-11 rounded-2xl bg-[#0c685a] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-extrabold text-[#092342]">
                        {isEn ? 'Session Inactivity Timeout Management' : 'Gestion des Délais d’Inactivité de Session'}
                      </h3>
                      <span className="rounded-full bg-[#0c685a] text-white px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide">
                        {isEn ? 'Strict Range: 10 to 30 min' : 'Plage Stricte : 10 à 30 min'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                      {isEn
                        ? 'Configure the inactivity timeout for each role and for yourself. Sessions automatically lock and redirect to login after the defined period of inactivity. Value must be set between 10 and 30 minutes.'
                        : 'Définissez le délai de déconnexion automatique par rôle et pour vous-même (Admin). La session est clôturée après cette durée sans activité souris ou clavier. La plage doit être comprise entre 10 et 30 minutes.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <button
                    onClick={fetchTimeouts}
                    disabled={loadingTimeouts}
                    className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                    title={isEn ? 'Refresh timeouts from server' : 'Recharger les délais depuis le serveur'}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingTimeouts ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">{isEn ? 'Refresh' : 'Actualiser'}</span>
                  </button>

                  <button
                    onClick={handleSaveAllTimeouts}
                    disabled={savingTimeoutRole !== null}
                    className="px-4 py-2.5 rounded-xl bg-[#0c685a] hover:bg-[#094e45] text-white text-xs font-extrabold flex items-center gap-2 shadow-xs transition"
                  >
                    {savingTimeoutRole === 'all' ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>{isEn ? 'Saving All...' : 'Enregistrement...'}</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>{isEn ? 'Save All Policies' : 'Enregistrer Tous les Délais'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Current Admin Active Session Status */}
              <div className="rounded-xl border border-slate-200 bg-[#f8fafc] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-bold text-[#092342]">
                    {isEn ? 'Your Current Active Session Policy:' : 'Politique active sur votre session actuelle :'}
                  </span>
                  <span className="font-extrabold text-[#0c685a] bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full font-mono">
                    {activeUserTimeout} {isEn ? 'minutes' : 'minutes'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#0c685a]" />
                  <span>
                    {isEn
                      ? 'Inactivity warning modal appears at 60s remaining.'
                      : 'Une alerte visuelle préventive apparaît à 60 secondes de l’expiration.'}
                  </span>
                </div>
              </div>

              {/* Primary Business Profiles Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#0c685a]" />
                    <span>{isEn ? '1. Primary Business Profiles & Roles' : '1. Profils Métiers & Rôles Principaux'}</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    {isEn ? 'Governs login sessions across workspace' : 'Régit les sessions de travail'}
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {[
                    {
                      role_id: 'admin',
                      title: isEn ? 'Platform Administrator (Admin / Self)' : 'Administrateur de Plateforme (Vous-même)',
                      desc: isEn
                        ? 'Highest privilege. Session duration applied to your own login and other administrators.'
                        : 'Privilège maximal. Délai appliqué à votre propre session et aux autres administrateurs.',
                      profile: 'Admin',
                      badgeBg: 'bg-purple-100 text-purple-900 border-purple-200',
                      iconBg: 'bg-purple-700 text-white',
                      defaultVal: 15,
                    },
                    {
                      role_id: 'secretary',
                      title: isEn ? 'Secretary (Intake & Admissions)' : 'Secrétariat (Intake, Admissions & Suivi)',
                      desc: isEn
                        ? 'Applicant intake, dossier tracking, cohort planning and parent liaison.'
                        : 'Réception des candidatures, dossiers scolaires, planning prépa et suivi familles.',
                      profile: 'Secretary',
                      badgeBg: 'bg-blue-100 text-blue-900 border-blue-200',
                      iconBg: 'bg-blue-600 text-white',
                      defaultVal: 20,
                    },
                    {
                      role_id: 'avi',
                      title: isEn ? 'Finance Officer (Blocked Accounts & AVI)' : 'Pôle Finance (Caution Bancaire AVI & Yimmiline)',
                      desc: isEn
                        ? 'AVI certificates, blocked account calculations, and parent-financing agreements.'
                        : 'Délivrance attestations AVI, simulation caution bancaire et dossiers de financement.',
                      profile: 'Finance Officer',
                      badgeBg: 'bg-emerald-100 text-emerald-900 border-emerald-200',
                      iconBg: 'bg-emerald-700 text-white',
                      defaultVal: 15,
                    },
                  ].map((roleSpec) => {
                    const currentVal = timeoutValues[roleSpec.role_id] ?? roleSpec.defaultVal;
                    const isSaving = savingTimeoutRole === roleSpec.role_id;
                    const pct = Math.round(((currentVal - 10) / (30 - 10)) * 100);

                    return (
                      <div
                        key={roleSpec.role_id}
                        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-[#0c685a]/40 transition"
                      >
                        {/* Top: Header */}
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${roleSpec.badgeBg}`}
                            >
                              {roleSpec.profile}
                            </span>
                            <span className="font-mono text-xs font-extrabold text-[#092342] bg-slate-100 px-2.5 py-0.5 rounded-md">
                              role_id: {roleSpec.role_id}
                            </span>
                          </div>

                          <h5 className="font-extrabold text-[#092342] text-sm leading-tight mb-1">
                            {roleSpec.title}
                          </h5>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            {roleSpec.desc}
                          </p>
                        </div>

                        {/* Middle: Slider & Value Control */}
                        <div className="space-y-3 pt-2 border-t border-slate-100">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700">
                              {isEn ? 'Session Inactivity Timeout:' : 'Délai d’inactivité :'}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min={10}
                                max={30}
                                step={1}
                                value={currentVal}
                                onChange={(e) => {
                                  const num = Number(e.target.value);
                                  if (!isNaN(num)) {
                                    setTimeoutValues((prev) => ({
                                      ...prev,
                                      [roleSpec.role_id]: Math.min(30, Math.max(10, num)),
                                    }));
                                  }
                                }}
                                className="w-14 text-center font-mono font-extrabold text-sm rounded-lg border border-slate-300 py-1 px-1 text-[#092342] focus:outline-none focus:ring-2 focus:ring-[#0c685a]"
                              />
                              <span className="text-xs font-bold text-slate-600">min</span>
                            </div>
                          </div>

                          {/* Interactive Range Slider */}
                          <div className="space-y-1">
                            <input
                              type="range"
                              min={10}
                              max={30}
                              step={1}
                              value={currentVal}
                              onChange={(e) => {
                                const v = Number(e.target.value);
                                setTimeoutValues((prev) => ({
                                  ...prev,
                                  [roleSpec.role_id]: v,
                                }));
                              }}
                              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0c685a]"
                            />
                            <div className="flex justify-between text-[10px] text-slate-400 font-bold px-0.5">
                              <span>10 min (Min)</span>
                              <span>20 min</span>
                              <span>30 min (Max)</span>
                            </div>
                          </div>

                          {/* Quick Preset Buttons */}
                          <div className="flex items-center gap-1.5 pt-1">
                            <span className="text-[10px] text-slate-400 font-bold mr-1">Presets:</span>
                            {[10, 15, 20, 25, 30].map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() =>
                                  setTimeoutValues((prev) => ({
                                    ...prev,
                                    [roleSpec.role_id]: preset,
                                  }))
                                }
                                className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold transition ${
                                  currentVal === preset
                                    ? 'bg-[#0c685a] text-white shadow-xs'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                                }`}
                              >
                                {preset}m
                              </button>
                            ))}
                          </div>

                          {/* Visual Duration Gauge */}
                          <div className="rounded-xl bg-slate-50 border border-slate-100 p-2.5 space-y-1.5">
                            <div className="flex justify-between text-[10px] text-slate-500 font-semibold">
                              <span>{isEn ? 'Session Duration Intensity' : 'Étendue de Session'}</span>
                              <span className="font-extrabold text-[#0c685a]">{currentVal * 60} {isEn ? 'sec' : 'sec'}</span>
                            </div>
                            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-emerald-500 to-[#0c685a] transition-all duration-300 rounded-full"
                                style={{ width: `${Math.max(10, pct)}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Bottom: Save Button */}
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => handleSaveTimeout(roleSpec.role_id, roleSpec.title, roleSpec.profile)}
                            disabled={isSaving || savingTimeoutRole === 'all'}
                            className="w-full py-2.5 px-3 rounded-xl bg-[#0c685a] hover:bg-[#094e45] text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-xs transition disabled:opacity-50"
                          >
                            {isSaving ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>{isEn ? 'Saving...' : 'Enregistrement...'}</span>
                              </>
                            ) : (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>{isEn ? 'Apply Timeout Policy' : 'Appliquer ce Délai'}</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Technical Roles Section (ServiceNow / RBAC Technical Mapping) */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                    <Key className="w-4 h-4 text-[#0c685a]" />
                    <span>{isEn ? '2. Technical Roles Session Policies' : '2. Rôles Techniques & Délais Spécifiques'}</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    {isEn ? 'Enforced for granular technical role assignments' : 'Assignations techniques détaillées'}
                  </span>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 bg-[#f8fafc] text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                          <th className="py-3 px-4">{isEn ? 'Technical Role' : 'Rôle Technique'}</th>
                          <th className="py-3 px-4">{isEn ? 'Business Profile' : 'Profil Métier'}</th>
                          <th className="py-3 px-4">{isEn ? 'Timeout (10 - 30 min)' : 'Délai (10 - 30 min)'}</th>
                          <th className="py-3 px-4">{isEn ? 'Quick Range Select' : 'Sélection Rapide'}</th>
                          <th className="py-3 px-4 text-right">{isEn ? 'Action' : 'Action'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {[
                          { role_id: 'lh_security_admin', name: 'Security Administrator', profile: 'Admin' },
                          { role_id: 'ITIL', name: 'ITIL Workflow Operator', profile: 'Secretary' },
                          { role_id: 'lh_internal', name: 'Internal Application Access', profile: 'Secretary' },
                          { role_id: 'lh_finance', name: 'Finance & AVI Officer', profile: 'Finance Officer' },
                        ].map((tRole) => {
                          const val = timeoutValues[tRole.role_id] ?? (tRole.profile === 'Secretary' ? 20 : 15);
                          const isSaving = savingTimeoutRole === tRole.role_id;

                          return (
                            <tr key={tRole.role_id} className="hover:bg-slate-50 transition">
                              <td className="py-3 px-4">
                                <div className="font-extrabold text-[#092342] font-mono">{tRole.role_id}</div>
                                <div className="text-[11px] text-slate-500">{tRole.name}</div>
                              </td>
                              <td className="py-3 px-4">
                                <span className="rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                                  {tRole.profile}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="range"
                                    min={10}
                                    max={30}
                                    step={1}
                                    value={val}
                                    onChange={(e) => {
                                      const v = Number(e.target.value);
                                      setTimeoutValues((prev) => ({ ...prev, [tRole.role_id]: v }));
                                    }}
                                    className="w-28 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0c685a]"
                                  />
                                  <span className="font-mono font-bold text-[#0c685a] w-12 text-center bg-[#f0faf7] py-0.5 rounded border border-[#d8f6ea]">
                                    {val} min
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-1">
                                  {[10, 15, 20, 25, 30].map((preset) => (
                                    <button
                                      key={preset}
                                      type="button"
                                      onClick={() =>
                                        setTimeoutValues((prev) => ({ ...prev, [tRole.role_id]: preset }))
                                      }
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold transition ${
                                        val === preset
                                          ? 'bg-[#0c685a] text-white'
                                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                                      }`}
                                    >
                                      {preset}m
                                    </button>
                                  ))}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleSaveTimeout(tRole.role_id, tRole.name, tRole.profile)}
                                  disabled={isSaving || savingTimeoutRole === 'all'}
                                  className="px-3 py-1.5 rounded-lg bg-[#0c685a] hover:bg-[#094e45] text-white text-[11px] font-extrabold transition disabled:opacity-50"
                                >
                                  {isSaving ? (
                                    <RefreshCw className="w-3 h-3 animate-spin inline" />
                                  ) : (
                                    <span>{isEn ? 'Save' : 'Enregistrer'}</span>
                                  )}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
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
