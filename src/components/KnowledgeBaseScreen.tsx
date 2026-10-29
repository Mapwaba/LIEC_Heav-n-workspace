'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  BookOpen,
  Database,
  ShieldCheck,
  FileText,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Printer,
  Info,
  Server,
  Lock,
  ExternalLink,
  HelpCircle,
  Clock,
  Layers,
  ArrowRight,
  Download,
  Building,
  GraduationCap,
  Banknote,
  Home,
  UserCheck,
  FileCheck,
} from 'lucide-react';

export type Lang = 'fr' | 'en';

interface KnowledgeArticle {
  id: string;
  category: 'advisor' | 'technical' | 'prefinancing';
  stepNum?: number;
  title: string;
  titleEn: string;
  summary: string;
  summaryEn: string;
  tags: string[];
  roleRestriction?: 'all' | 'admin_finance';
  contentFr: React.ReactNode;
  contentEn: React.ReactNode;
}

export function KnowledgeBaseScreen({
  lang = 'en',
  currentRole = 'admin',
  onNavigate,
}: {
  lang?: Lang;
  currentRole?: string;
  onNavigate?: (tab: string) => void;
}) {
  const isEn = lang === 'en';
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'advisor' | 'technical' | 'prefinancing'>('all');
  const [activeArticleId, setActiveArticleId] = useState<string | null>(null);

  // 11 Programme Steps from "PROGRAMME ET PARCOURS DES ELITES LIEC – FRANCE PRÉPA 28.pdf"
  // & Technical Support & PostgreSQL Engine from Architecture + "Préfinancement Envol 2025(1).pdf"
  const articles: KnowledgeArticle[] = useMemo(() => [
    {
      id: 'step-1-inscription',
      category: 'advisor',
      stepNum: 1,
      title: 'Étape 1 — Inscription au programme LIEC-France Prépa',
      titleEn: 'Step 1 — Registration for LIEC-France Prépa',
      summary: 'Enregistrement de l’étudiant, création du dossier, vérification initiale et calendrier d’accompagnement.',
      summaryEn: 'Official student registration, dossier creation, profile validation, and programme schedule delivery.',
      tags: ['Inscription', 'Dossier', 'CV', 'Projet d’études', 'Orientation'],
      roleRestriction: 'all',
      contentFr: (
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <div className="bg-[#f0f6fe] p-3.5 rounded-xl border border-[#d6e4f7] space-y-1">
            <span className="font-extrabold text-[#092342] text-sm block">Objectif de l’étape</span>
            <p>L’étudiant s’inscrit officiellement au programme LIEC-France Prépa et fournit les informations et documents requis pour l’ouverture de son dossier d’études en France.</p>
          </div>
          <div className="space-y-2">
            <h4 className="font-extrabold text-[#092342] text-xs uppercase tracking-wider">Actions à accomplir par le conseiller</h4>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Enregistrement officiel :</strong> Créer la fiche candidat dans LIEC Heav’n via le formulaire d’admission ou qualifier la demande web.</li>
              <li><strong>Collecte du CV :</strong> Exiger un CV académique à jour détaillant le cursus scolaire ou universitaire.</li>
              <li><strong>Projet d’études :</strong> Faire rédiger et présenter un projet d’études détaillant la vision et les objectifs post-études en France.</li>
              <li><strong>Ouverture du dossier :</strong> Intégrer l’étudiant dans les canaux d’information officiels LIEC-France Prépa.</li>
              <li><strong>Validation initiale :</strong> Vérifier la cohérence du profil et transmettre le calendrier des différentes étapes.</li>
            </ul>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-800 block text-[11px] mb-1">Documents requis</span>
              <p className="text-slate-600">CV à jour, lettre d’objectifs / vision d’études, pièces d’identité en cours de validité.</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-800 block text-[11px] mb-1">Résultat attendu & Étape suivante</span>
              <p className="text-slate-600">Dossier ouvert et validé. Passage à l’<strong>Étape 2 (Premier paiement et engagement financier)</strong>.</p>
            </div>
          </div>
        </div>
      ),
      contentEn: (
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <div className="bg-[#f0f6fe] p-3.5 rounded-xl border border-[#d6e4f7] space-y-1">
            <span className="font-extrabold text-[#092342] text-sm block">Purpose of the Step</span>
            <p>The student registers officially for LIEC-France Prépa and provides all required background documents for initial profile validation and file opening.</p>
          </div>
          <div className="space-y-2">
            <h4 className="font-extrabold text-[#092342] text-xs uppercase tracking-wider">Advisor Actions</h4>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Official Registration:</strong> Create student record in LIEC Heav’n or qualify incoming web application.</li>
              <li><strong>CV Submission:</strong> Review updated academic CV highlighting curriculum achievements.</li>
              <li><strong>Study Project Statement:</strong> Ensure the applicant submits a detailed vision outlining career objectives after completing studies in France.</li>
              <li><strong>File Setup:</strong> Open candidate profile and onboard student to official LIEC communication channels.</li>
              <li><strong>Timeline Delivery:</strong> Transmit the complete milestone calendar and procedure schedule.</li>
            </ul>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-800 block text-[11px] mb-1">Required Information</span>
              <p className="text-slate-600">Updated CV, post-study goals statement, valid passport or ID card.</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-800 block text-[11px] mb-1">Expected Outcome & Next Step</span>
              <p className="text-slate-600">Dossier activated and verified. Proceed to <strong>Step 2 (Initial Payment & Financial Commitment)</strong>.</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'step-2-paiement',
      category: 'advisor',
      stepNum: 2,
      title: 'Étape 2 — Premier paiement et engagement financier (2 800 €)',
      titleEn: 'Step 2 — Initial Payment & Financial Commitment (€2,800)',
      summary: 'Modalités de paiement du programme LIEC-France Prépa : 1 800,12 € à l’inscription, 999,88 € à J+30.',
      summaryEn: 'Payment schedule: €1,800.12 initial payment (64.29%), €999.88 second instalment due within 30 days.',
      tags: ['Paiement', 'Finance', 'Rawbank', '2800 €', 'Reçu'],
      roleRestriction: 'all',
      contentFr: (
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <div className="bg-[#eefaf6] p-3.5 rounded-xl border border-[#ccece2] space-y-1">
            <span className="font-extrabold text-[#0c685a] text-sm block">Échéancier Officiel LIEC-France Prépa</span>
            <p>Le parent ou tuteur effectue le règlement auprès de <strong>Rawbank RDC</strong>. Montant total du programme : <strong>2 800,00 €</strong>.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1">
              <div className="font-bold text-[#092342]">1er Dépôt : 1 800,12 € (64,29 %)</div>
              <p className="text-slate-500">Exigible immédiatement à l’inscription. Conditionne l’accès aux webinaires et le dépôt de candidature.</p>
            </div>
            <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1">
              <div className="font-bold text-[#092342]">2ème Versement : 999,88 € (35,71 %)</div>
              <p className="text-slate-500">Exigible strictement dans un délai de <strong>30 jours calendaires</strong> après le 1er versement.</p>
            </div>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-1 text-amber-900">
            <span className="font-bold block text-[11px]">Coordonnées Bancaires Officielles Rawbank</span>
            <div className="font-mono text-[10.5px]">IBAN : CD48 0510 0251 0101 2624 0200 116 • BIC : RAWBCDKI</div>
            <div className="text-[10.5px]">Titulaire : MAPWABA NTORO Barthelemy • ILLICOCASH : +243 80 3615 543</div>
          </div>
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-blue-900 space-y-1 text-[11px]">
            <span className="font-bold block">Règle de Non-Remboursement</span>
            <p>Les frais d’accompagnement et de formation dans le cadre du programme LIEC-France Prépa sont <strong>non remboursables</strong> en cas de refus ou de non-obtention du visa étudiant.</p>
          </div>
        </div>
      ),
      contentEn: (
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <div className="bg-[#eefaf6] p-3.5 rounded-xl border border-[#ccece2] space-y-1">
            <span className="font-extrabold text-[#0c685a] text-sm block">Configured LIEC-France PREPA Payment Schedule</span>
            <p>Parent or guarantor performs payments via <strong>Rawbank RDC</strong>. Total configured programme fee: <strong>€2,800.00</strong>.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1">
              <div className="font-bold text-[#092342]">Instalment 1: €1,800.12 (64.29%)</div>
              <p className="text-slate-500">Due upon registration. Qualifies student for webinar access and school applications.</p>
            </div>
            <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1">
              <div className="font-bold text-[#092342]">Instalment 2: €999.88 (35.71%)</div>
              <p className="text-slate-500">Due strictly within <strong>30 calendar days</strong> following instalment 1 validation.</p>
            </div>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-1 text-amber-900">
            <span className="font-bold block text-[11px]">Official Rawbank Wire Coordinates</span>
            <div className="font-mono text-[10.5px]">IBAN: CD48 0510 0251 0101 2624 0200 116 • BIC: RAWBCDKI</div>
            <div className="text-[10.5px]">Account Holder: MAPWABA NTORO Barthelemy • ILLICOCASH: +243 80 3615 543</div>
          </div>
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-blue-900 space-y-1 text-[11px]">
            <span className="font-bold block">Non-Refundability Policy</span>
            <p>All accompaniment and training fees under LIEC-France Prépa are <strong>non-refundable</strong> in the event of visa refusal or non-issuance.</p>
          </div>
        </div>
      ),
    },
    {
      id: 'step-3-webinaires',
      category: 'advisor',
      stepNum: 3,
      title: 'Étape 3 — Préparation académique et préparation aux entretiens',
      titleEn: 'Step 3 — Academic & Interview Preparation Webinars',
      summary: 'Sessions de formation intensive : projet académique, projet professionnel, argumentation France et simulations.',
      summaryEn: 'Intensive coaching webinars: academic & career projects, motivation for France, and interview rehearsals.',
      tags: ['Webinaires', 'Entretiens', 'Projet pro', 'Coaching'],
      roleRestriction: 'all',
      contentFr: (
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <p>Pendant les webinaires et sessions de préparation organisés par LIEC-France Prépa, l’étudiant prépare son projet académique et ses futures candidatures.</p>
          <div className="space-y-2">
            <h4 className="font-extrabold text-[#092342] uppercase text-xs">Axes de préparation obligatoire</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>Présentation fluide et structurée du parcours académique antérieur.</li>
              <li>Définition claire du projet d’études et de la formation visée.</li>
              <li>Élaboration du projet professionnel (secteur, débouchés, cohérence).</li>
              <li>Exposé des motivations pour étudier en France plutôt que dans son pays d’origine.</li>
              <li>Simulations des entretiens d’admission des universités et grandes écoles partenaires.</li>
              <li>Constitution et amélioration continue des pièces constitutives du dossier.</li>
            </ul>
          </div>
        </div>
      ),
      contentEn: (
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <p>During coaching webinars organized by LIEC-France Prépa, students structure their academic narrative and practice candidate interviews.</p>
          <div className="space-y-2">
            <h4 className="font-extrabold text-[#092342] uppercase text-xs">Core Coaching Areas</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>Structured presentation of academic background.</li>
              <li>Clear articulation of academic path and chosen degree.</li>
              <li>Professional project blueprint (target industry, career milestones).</li>
              <li>Compelling motivation for selecting France as study destination.</li>
              <li>Live mock interviews for partner university oral examinations.</li>
              <li>Portfolio and dossier continuous enhancement.</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: 'step-4-candidatures',
      category: 'advisor',
      stepNum: 4,
      title: 'Étape 4 — Candidature auprès des établissements en France',
      titleEn: 'Step 4 — Applications to Educational Institutions in France',
      summary: 'Processus de sélection d’école partenaire à Lyon, soumission du dossier, passage de l’entretien et obtention de l’admission.',
      summaryEn: 'Partner school selection in Lyon, application transmission, admission interviews, and official acceptance letter.',
      tags: ['Écoles partenaires', 'Lyon', 'Admission', 'Attestation'],
      roleRestriction: 'all',
      contentFr: (
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <p>L’étudiant candidate auprès d’un ou plusieurs établissements désignés en France en collaboration avec LIEC, conformément à son profil.</p>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5 font-medium">
            <div>1. Sélection de l’établissement (MyDigitalSchool Lyon, ISCOM, IHECF, MBway, Tunon, Ipac).</div>
            <div>2. Préparation et transmission du dossier de candidature certifié.</div>
            <div>3. Entretien avec l’établissement (lorsque requis par la filière).</div>
            <div>4. Évaluation du dossier par la commission pédagogique de l’école.</div>
            <div>5. Obtention de l’admission officielle sous forme d’attestation d’acceptation.</div>
          </div>
        </div>
      ),
      contentEn: (
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <p>The student applies to designated higher education institutions in Lyon supported by LIEC advisors.</p>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5 font-medium">
            <div>1. School Selection (MyDigitalSchool Lyon, ISCOM, IHECF, MBway, Tunon, Ipac).</div>
            <div>2. Application compilation and certified dossier transmission.</div>
            <div>3. School oral interview (where mandated by curriculum).</div>
            <div>4. Academic board evaluation.</div>
            <div>5. Official admission confirmation with formal acceptance certificate.</div>
          </div>
        </div>
      ),
    },
    {
      id: 'step-5-acompte',
      category: 'advisor',
      stepNum: 5,
      title: 'Étape 5 — Confirmation de l’inscription & Acompte 25 % Scolarité',
      titleEn: 'Step 5 — Enrolment Confirmation & 25% Tuition Deposit',
      summary: 'Règlement de 25 % des frais de scolarité annuels sous 10 jours ouvrés via Rawbank pour virement instantané.',
      summaryEn: 'Payment of 25% annual tuition deposit within 10 working days via Rawbank for instant transfer.',
      tags: ['Scolarité', 'Acompte 25%', '10 jours ouvrés', 'Virement'],
      roleRestriction: 'all',
      contentFr: (
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <div className="p-3 bg-red-50 text-red-900 rounded-xl border border-red-200">
            <strong>Délai impératif :</strong> Après admission, l’étudiant procède au paiement demandé par l’établissement afin de confirmer son inscription sous <strong>dix (10) jours ouvrés</strong>.
          </div>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>Montant :</strong> Paiement de 25 % des frais de scolarité annuels selon les conditions de l’établissement.</li>
            <li><strong>Canal :</strong> Paiement effectué via le compte Rawbank de LIEC.</li>
            <li><strong>Preuve :</strong> Transmission immédiate à LIEC de la preuve de versement.</li>
            <li><strong>Transfert :</strong> LIEC effectue le virement instantané direct à l’établissement en France. Les frais de transfert s’appliquent selon le cours de change du jour.</li>
          </ul>
        </div>
      ),
      contentEn: (
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <div className="p-3 bg-red-50 text-red-900 rounded-xl border border-red-200">
            <strong>Strict Deadline:</strong> Enrolment deposit must be settled within <strong>ten (10) working days</strong> of formal admission.
          </div>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>Amount:</strong> 25% of annual tuition fee according to school conditions.</li>
            <li><strong>Method:</strong> Deposit paid through LIEC’s Rawbank designated account.</li>
            <li><strong>Proof:</strong> Immediate proof submission to LIEC advisors.</li>
            <li><strong>Direct Transfer:</strong> LIEC executes instant transfer to the French school. Wire transfer and FX rate adjustments apply.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'step-6-campus-france',
      category: 'advisor',
      stepNum: 6,
      title: 'Étape 6 — Création et constitution du dossier Campus France',
      titleEn: 'Step 6 — Campus France Dossier Creation & Submission',
      summary: 'Création du compte Études en France, téléversement des pièces certifiées et paiement des frais via SOFIBANK.',
      summaryEn: 'Creating Campus France account, uploading certified files, and fee settlement via SOFIBANK Kinshasa.',
      tags: ['Campus France', 'SOFIBANK', 'Téléversement', 'Contrôle'],
      roleRestriction: 'all',
      contentFr: (
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <p>Après obtention de l’admission, l’étudiant crée son compte Campus France accompagné par un formateur LIEC-France Prépa.</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Création et complétion du compte Campus France.</li>
            <li>Téléversement des documents requis au format numérique certifié.</li>
            <li>Vérification méticuleuse de la cohérence des données avec l’admission obtenue.</li>
            <li>Paiement des frais de dossier Campus France auprès de <strong>SOFIBANK Kinshasa</strong>.</li>
            <li>Transmission à LIEC de la quittance SOFIBANK et soumission officielle sur la plateforme.</li>
          </ul>
        </div>
      ),
      contentEn: (
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <p>Following admission, the student creates their Campus France profile assisted by a dedicated LIEC advisor.</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Account creation and biographical record completion.</li>
            <li>Uploading certified academic credentials and identification.</li>
            <li>Cross-verification against official school acceptance letters.</li>
            <li>Campus France processing fee payment at <strong>SOFIBANK Kinshasa</strong>.</li>
            <li>Submission proof receipt sent to LIEC.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'step-7-avi-yimmiline',
      category: 'advisor',
      stepNum: 7,
      title: 'Étape 7 — Préparation de l’AVI et du financement avec YIMMILINE',
      titleEn: 'Step 7 — AVI Financial Guarantee & YIMMILINE Prefinancing',
      summary: 'Attestation de Virement Irrévocable (AVI) : constitution du dossier financier couvrant jusqu’à 100 % avec le partenaire YIMMILINE.',
      summaryEn: 'Irrevocable Transfer Certificate (AVI): financial dossier preparation covering up to 100% with YIMMILINE.',
      tags: ['AVI', 'YIMMILINE', 'Garantie financière', 'Solvabilité'],
      roleRestriction: 'all',
      contentFr: (
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <p>LIEC accompagne l’étudiant dans la préparation de son dossier financier pour soutenir la demande de visa étudiant.</p>
          <div className="bg-[#f0faf7] p-3 rounded-xl border border-[#ccece2] space-y-1">
            <span className="font-extrabold text-[#0c685a] block">Partenariat YIMMILINE</span>
            <p>YIMMILINE propose une solution de préfinancement pouvant couvrir jusqu’à 100 % du montant requis pour l’AVI, sous réserve d’éligibilité et des conditions du partenaire (voir référentiel de préfinancement Envol 2025).</p>
          </div>
          <ul className="list-disc pl-5 space-y-1">
            <li>Analyse des besoins financiers et capacité de cautionnement.</li>
            <li>Constitution du dossier complet d’Attestation de Virement Irrévocable (AVI).</li>
            <li>Vérification stricte de la solvabilité des parents et des garants (fiches de paie, bilans, historique bancaire).</li>
          </ul>
        </div>
      ),
      contentEn: (
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <p>LIEC assists the student in preparing the financial documentation supporting their French student visa application.</p>
          <div className="bg-[#f0faf7] p-3 rounded-xl border border-[#ccece2] space-y-1">
            <span className="font-extrabold text-[#0c685a] block">YIMMILINE Financing Partner</span>
            <p>YIMMILINE offers prefinancing solutions covering up to 100% of required funds for the AVI certificate, subject to eligibility criteria (see Envol 2025 reference guide).</p>
          </div>
          <ul className="list-disc pl-5 space-y-1">
            <li>Financial assessment and guarantor evaluation.</li>
            <li>AVI certificate generation and escrow verification.</li>
            <li>Solvency verification of parents and financial guarantors.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'step-8-logement',
      category: 'advisor',
      stepNum: 8,
      title: 'Étape 8 — Réservation du logement étudiant à Lyon (500 €)',
      titleEn: 'Step 8 — Student Accommodation Reservation in Lyon (€500)',
      summary: 'Dépôt de 500 € auprès de Rawbank Kinshasa, traitement par les partenaires LIEC, obtention de l’attestation KBIS et contrat.',
      summaryEn: '€500 reservation deposit via Rawbank Kinshasa, partner allocation, and official KBIS accommodation contract.',
      tags: ['Logement', 'Hébergement', '500 €', 'KBIS', 'Contrat'],
      roleRestriction: 'all',
      contentFr: (
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <p>L’étudiant procède à la réservation de son hébergement en France avec l’un des partenaires agréés de LIEC.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
              <span className="font-bold text-[#092342] block">Modalités Financières</span>
              <p>Dépôt de <strong>500 €</strong> auprès de Rawbank Kinshasa. Transmission immédiate de la preuve de paiement à LIEC.</p>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
              <span className="font-bold text-[#092342] block">Documents Obtenus pour le Visa</span>
              <p>Justificatif officiel d’hébergement, extrait KBIS de la résidence partenaire et Attestation de titulaire de contrat.</p>
            </div>
          </div>
        </div>
      ),
      contentEn: (
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <p>Student reserves their housing in Lyon through authorized LIEC accommodation partners.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
              <span className="font-bold text-[#092342] block">Deposit Terms</span>
              <p>Deposit of <strong>€500</strong> at Rawbank Kinshasa. Payment receipt forwarded to LIEC.</p>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
              <span className="font-bold text-[#092342] block">Issued Documents for Visa</span>
              <p>Official accommodation certificate, legal KBIS registry excerpt, and lease contract entitlement confirmation.</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'step-9-entretien-cf',
      category: 'advisor',
      stepNum: 9,
      title: 'Étape 9 — Entretien Campus France',
      titleEn: 'Step 9 — Campus France Oral Interview',
      summary: 'Préparation individuelle sur le parcours, le choix de formation, le projet professionnel et la cohérence générale.',
      summaryEn: 'One-on-one preparation covering academic trajectory, study choice, career vision, and motivation.',
      tags: ['Campus France', 'Oral', 'Entretien', 'Motivation'],
      roleRestriction: 'all',
      contentFr: (
        <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
          <p>Dès convocation par Campus France, l’étudiant passe son entretien d’évaluation pédagogique.</p>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
            <span className="font-extrabold text-[#092342] block">Points clés préparés par LIEC-France Prépa</span>
            <ul className="list-disc pl-5 space-y-1">
              <li>Justification solide du choix de la France et de la métropole de Lyon.</li>
              <li>Explication détaillée des modules de la formation retenue.</li>
              <li>Cohérence entre les études passées, le diplôme visé et le futur métier.</li>
              <li>Capacité à convaincre sur le financement et l’autonomie de l’étudiant.</li>
            </ul>
          </div>
        </div>
      ),
      contentEn: (
        <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
          <p>Once summoned by Campus France, the candidate attends their pedagogical evaluation interview.</p>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
            <span className="font-extrabold text-[#092342] block">Coached Pillars by LIEC Advisors</span>
            <ul className="list-disc pl-5 space-y-1">
              <li>Convincing rationale for choosing France and Lyon.</li>
              <li>Comprehensive mastery of selected course modules.</li>
              <li>Coherence between past curriculum, target degree, and post-graduation career.</li>
              <li>Clear presentation of financial arrangements and student autonomy.</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: 'step-10-pieces',
      category: 'advisor',
      stepNum: 10,
      title: 'Étape 10 — Documents requis pour le dossier d’études en France',
      titleEn: 'Step 10 — Mandatory Documents Checklist for France Studies',
      summary: 'Référentiel des 7 catégories de pièces obligatoires : identité, académique post-bac, postuniversitaire, état civil et garants.',
      summaryEn: 'Exhaustive checklist of the 7 mandatory document categories: ID, post-bac, university degrees, civil status, and guarantors.',
      tags: ['Documents', 'Passeport', 'Relevés', 'Diplôme d’État', 'Acte de naissance'],
      roleRestriction: 'all',
      contentFr: (
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <p>Tous les documents doivent être lisibles, à jour et conformes aux exigences administratives.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
              <span className="font-bold text-[#092342] block">1. Pièces d’identité</span>
              <p className="text-slate-600">Passeport de l’étudiant en cours de validité (durée suffisante pour l’ensemble de la procédure).</p>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
              <span className="font-bold text-[#092342] block">2. Académique Post-Bac</span>
              <p className="text-slate-600">Bulletins scolaires des deux dernières années précédant le baccalauréat, bulletin de terminale, relevé de notes du bac.</p>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
              <span className="font-bold text-[#092342] block">3. Postuniversitaire</span>
              <p className="text-slate-600">Diplôme universitaire ou attestation de réussite, relevés de notes de toutes les années universitaires.</p>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
              <span className="font-bold text-[#092342] block">4. Diplôme d’État</span>
              <p className="text-slate-600">Diplôme d’État ou attestation de réussite officielle + Relevé de notes du diplôme d’État.</p>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
              <span className="font-bold text-[#092342] block">5. Justificatifs d’activité</span>
              <p className="text-slate-600">Attestation de travail, stage ou formation pour justifier tout intervalle depuis le dernier diplôme.</p>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
              <span className="font-bold text-[#092342] block">6. État Civil & 7. Garants</span>
              <p className="text-slate-600">Acte de naissance légalisé (ou jugement supplétif) + Pièce d’identité valide du parent ou garant légal.</p>
            </div>
          </div>
        </div>
      ),
      contentEn: (
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <p>All records must be legible, current, and legalized according to consular standards.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
              <span className="font-bold text-[#092342] block">1. Identification</span>
              <p className="text-slate-600">Valid passport with duration covering the entire visa and academic period.</p>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
              <span className="font-bold text-[#092342] block">2. Secondary Academic Records</span>
              <p className="text-slate-600">Transcripts for the last two years preceding High School graduation + Baccalaureate transcripts.</p>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
              <span className="font-bold text-[#092342] block">3. Higher Education Degrees</span>
              <p className="text-slate-600">University degree or graduation certificate + complete certified yearly transcripts.</p>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
              <span className="font-bold text-[#092342] block">4. State Diploma (Diplôme d'État)</span>
              <p className="text-slate-600">Official State Diploma / Baccalaureate certificate + official marks report.</p>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
              <span className="font-bold text-[#092342] block">5. Employment / Activity Proof</span>
              <p className="text-slate-600">Employment certificate, internships or training records accounting for post-graduation gaps.</p>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
              <span className="font-bold text-[#092342] block">6. Civil Registry & 7. Guarantor</span>
              <p className="text-slate-600">Certified birth certificate (or court judgment) + valid ID card of the financial guarantor.</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'step-11-visa',
      category: 'advisor',
      stepNum: 11,
      title: 'Étape 11 — Dossier Visa & Entretien Ambassade de France à Kinshasa',
      titleEn: 'Step 11 — Visa Application & French Embassy Interview in Kinshasa',
      summary: 'Dépôt du visa étudiant : justificatifs d’admission, financiers, AVI, logement, et préparation consulaire.',
      summaryEn: 'Student visa submission: admission letters, AVI financial guarantee, housing certificate, and consular mock interview.',
      tags: ['Visa', 'Ambassade', 'Kinshasa', 'Consulat', 'Entretien'],
      roleRestriction: 'all',
      contentFr: (
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <p>Étape finale du parcours : constitution du dossier consulaire et participation au rendez-vous à l’Ambassade de France à Kinshasa.</p>
          <div className="bg-[#f0faf7] p-3.5 rounded-xl border border-[#ccece2] space-y-1.5">
            <span className="font-extrabold text-[#0c685a] block text-sm">Composition finale du dossier consulaire</span>
            <ul className="list-disc pl-5 space-y-1">
              <li>Attestation officielle d’admission de l’école partenaire à Lyon.</li>
              <li>Reçu officiel de paiement des frais de scolarité (25 % ou solde).</li>
              <li>Attestation de Virement Irrévocable (AVI) de caution bancaire (YIMMILINE).</li>
              <li>Justificatif d’hébergement, extrait KBIS et attestation titulaire de contrat.</li>
              <li>Quittance de validation Campus France.</li>
              <li>Formulaire France-Visas et récépissé officiel.</li>
            </ul>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] space-y-1">
            <span className="font-bold block">Avis Administratif — Disparité Financière Source PDF vs Système</span>
            <p>Le tableau récapitulatif de la page 7 du PDF source mentionne un budget indicatif en USD (3 230,16 $ pour LIEC, total 8 935,31 $). Conformément à la politique financière en Euros (€), le tarif officiel LIEC-France Prépa est strictement configuré à <strong>2 800,00 €</strong> (1 800,12 € + 999,88 €). Ne jamais convertir de montants avec des taux non homologués.</p>
          </div>
        </div>
      ),
      contentEn: (
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <p>Final milestone: consular dossier preparation and student visa appointment at the French Embassy in Kinshasa.</p>
          <div className="bg-[#f0faf7] p-3.5 rounded-xl border border-[#ccece2] space-y-1.5">
            <span className="font-extrabold text-[#0c685a] block text-sm">Consular Dossier Final Checklist</span>
            <ul className="list-disc pl-5 space-y-1">
              <li>Official admission letter from partner university in Lyon.</li>
              <li>Official receipt confirming 25% tuition deposit settlement.</li>
              <li>Irrevocable Transfer Certificate (AVI) from YIMMILINE.</li>
              <li>Housing certificate, official KBIS extract, and titleholder lease.</li>
              <li>Campus France official clearance receipt.</li>
              <li>France-Visas confirmation form and official submission slip.</li>
            </ul>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] space-y-1">
            <span className="font-bold block">Administrative Notice — Currency Policy & Source Discrepancy</span>
            <p>Page 7 of the source PDF features an illustrative summary table in USD ($3,230.16 USD LIEC fee, $8,935.31 USD total). In strict compliance with the platform’s Euro-Only Currency Policy, the LIEC-France PREPA fee is configured at exactly <strong>€2,800.00</strong> (€1,800.12 + €999.88). Unapproved exchange rate conversions are strictly prohibited.</p>
          </div>
        </div>
      ),
    },

    // TECHNICAL SUPPORT & POSTGRESQL ENGINE ARTICLES
    {
      id: 'tech-architecture',
      category: 'technical',
      title: '1. Architecture Système, Vercel & Contrôle de Version GitHub',
      titleEn: '1. System Architecture, Vercel & GitHub Source Control',
      summary: 'Architecture Next.js App Router, déploiements Vercel Subproduction / Preview et gestion des branches Git.',
      summaryEn: 'Next.js App Router architecture, Vercel Subproduction / Preview environments, and Git branch workflows.',
      tags: ['Architecture', 'Next.js', 'Vercel', 'GitHub', 'CI/CD'],
      roleRestriction: 'admin_finance',
      contentFr: (
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <p>LIEC Heav’n est déployé sur l’infrastructure serverless de Vercel avec une architecture Next.js App Router connectée à Neon PostgreSQL.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
              <span className="font-bold text-[#092342] block">Dépôt GitHub Officiel</span>
              <div className="font-mono text-[11px] text-slate-600">Mapwaba/LIEC_Heav-n-workspace</div>
              <p className="text-[10.5px] text-slate-500">Branche principale : <code>main</code> (production / subproduction). Branche de qualification : <code>subproduction</code>.</p>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
              <span className="font-bold text-[#092342] block">Vercel Environments</span>
              <div className="text-[11px] text-slate-600">Preview & Production</div>
              <p className="text-[10.5px] text-slate-500">Chaque commit poussé sur <code>main</code> déclenche un build de prévisualisation et une exécution des routes API serverless.</p>
            </div>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <span className="font-bold text-[#092342] block">Séparation des Responsabilités (Workspace vs Site Web)</span>
            <p>Le site public (<code>LIEC-website</code>) est un projet indépendant qui transmet les candidatures via l’API sécurisée <code>/api/demandes</code>. Aucun secret ou identifiant de base de données n’est exposé aux visiteurs publics.</p>
          </div>
        </div>
      ),
      contentEn: (
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <p>LIEC Heav’n runs on Vercel serverless infrastructure with Next.js App Router connected directly to Neon PostgreSQL over TLS.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
              <span className="font-bold text-[#092342] block">Official GitHub Repository</span>
              <div className="font-mono text-[11px] text-slate-600">Mapwaba/LIEC_Heav-n-workspace</div>
              <p className="text-[10.5px] text-slate-500">Core branch: <code>main</code>. Staging/qualification branch: <code>subproduction</code>.</p>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
              <span className="font-bold text-[#092342] block">Vercel Deployments</span>
              <div className="text-[11px] text-slate-600">Preview & Production</div>
              <p className="text-[10.5px] text-slate-500">Every commit to <code>main</code> triggers an automated build and serverless function deployment.</p>
            </div>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <span className="font-bold text-[#092342] block">Separation of Concerns</span>
            <p>The public website (<code>LIEC-website</code>) operates independently, transmitting applications to <code>/api/demandes</code>. No database credentials are ever shipped in client bundles.</p>
          </div>
        </div>
      ),
    },
    {
      id: 'tech-postgres',
      category: 'technical',
      title: '2. Moteur Neon PostgreSQL, Connection Pooling & Sauvegardes',
      titleEn: '2. Neon PostgreSQL Engine, Connection Pooling & Backups',
      summary: 'Architecture de base de données Neon serverless, pg-pool, pooler AWS Frankfurt et intégrité relationnelle.',
      summaryEn: 'Neon serverless PostgreSQL database architecture, connection pooling via pg-pool, and relational integrity.',
      tags: ['PostgreSQL', 'Neon', 'Pooler', 'Migrations', 'Backups'],
      roleRestriction: 'admin_finance',
      contentFr: (
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <p>Le stockage des données repose sur Neon PostgreSQL serverless hébergé sur AWS Frankfurt (<code>eu-central-1</code>).</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
              <span className="font-bold text-[#0c685a] block">Connection Pooling (DATABASE_URL_POOLED)</span>
              <p className="text-slate-600">Utilise le proxy PgBouncer intégré de Neon (<code>-pooler</code>). Indispensable pour absorber les montées en charge serverless sans saturer les connexions.</p>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
              <span className="font-bold text-[#0c685a] block">Chiffrement & Sécurité TLS</span>
              <p className="text-slate-600">Connexions obligatoirement chiffrées avec <code>sslmode=require</code>. Aucun accès en clair n’est toléré.</p>
            </div>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <span className="font-bold text-[#092342] block">Procédure de Sauvegarde & Restauration</span>
            <p>Des snapshots continus point-in-time sont maintenus par Neon. Pour exporter une sauvegarde manuelle : exécuter <code>pg_dump "$DATABASE_URL" -F c -f liec_heavn_backup.dump</code>.</p>
          </div>
        </div>
      ),
      contentEn: (
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <p>Database storage is powered by Neon Serverless PostgreSQL hosted in AWS Frankfurt (<code>eu-central-1</code>).</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
              <span className="font-bold text-[#0c685a] block">Connection Pooling (DATABASE_URL_POOLED)</span>
              <p className="text-slate-600">Utilizes Neon’s PgBouncer pooler endpoint (<code>-pooler</code>). Prevents serverless connection exhaustion.</p>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
              <span className="font-bold text-[#0c685a] block">TLS / SSL Encryption</span>
              <p className="text-slate-600">Enforces encrypted TLS sockets with <code>sslmode=require</code>. Plaintext connections are blocked.</p>
            </div>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <span className="font-bold text-[#092342] block">Backup & Point-in-Time Recovery</span>
            <p>Neon provides automated WAL point-in-time recovery. Manual snapshots can be captured using standard <code>pg_dump</code> utilities.</p>
          </div>
        </div>
      ),
    },
    {
      id: 'tech-env',
      category: 'technical',
      title: '3. Configuration des Variables d’Environnement',
      titleEn: '3. Environment Variables & Secret Separation',
      summary: 'Description des variables DATABASE_URL, DATABASE_URL_POOLED et services Neon sans divulgation de secrets.',
      summaryEn: 'Role of DATABASE_URL, DATABASE_URL_POOLED, and S3 variables without disclosing secret credentials.',
      tags: ['Environnement', 'Secrets', 'Vercel Vars', 'Sécurité'],
      roleRestriction: 'admin_finance',
      contentFr: (
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <p>La configuration de l’application s’effectue exclusivement par variables d’environnement dans Vercel :</p>
          <div className="space-y-2">
            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
              <code className="font-bold text-[#092342]">DATABASE_URL</code>
              <p className="text-slate-600 text-[11px]">URL de connexion directe à PostgreSQL. Utilisée pour les migrations initiales et les opérations d’administration nécessitant des verrous exclusifs.</p>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
              <code className="font-bold text-[#092342]">DATABASE_URL_POOLED</code>
              <p className="text-slate-600 text-[11px]">URL routée via le connection pooler PgBouncer. C’est la variable prioritaire lue par le runtime de l’application en production.</p>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
              <code className="font-bold text-[#092342]">AWS_ENDPOINT_URL_S3 / S3_BUCKET</code>
              <p className="text-slate-600 text-[11px]">Stockage d’objets compatible S3 hébergé par Neon pour les justificatifs de paiement et pièces d’identité téléversées.</p>
            </div>
          </div>
        </div>
      ),
      contentEn: (
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <p>System runtime configuration relies strictly on environment variables configured in Vercel project settings:</p>
          <div className="space-y-2">
            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
              <code className="font-bold text-[#092342]">DATABASE_URL</code>
              <p className="text-slate-600 text-[11px]">Direct PostgreSQL connection string. Reserved for schema migrations and administrative DDL operations.</p>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
              <code className="font-bold text-[#092342]">DATABASE_URL_POOLED</code>
              <p className="text-slate-600 text-[11px]">PgBouncer pooled connection string. Primary endpoint read by application API routes in production.</p>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
              <code className="font-bold text-[#092342]">AWS_ENDPOINT_URL_S3 / S3_BUCKET</code>
              <p className="text-slate-600 text-[11px]">Neon S3-compatible bucket credentials for secure student proof document storage.</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'tech-troubleshooting',
      category: 'technical',
      title: '4. Résolution des Pannes Courantes & Diagnostics',
      titleEn: '4. Common Technical Issues, Diagnostics & Escalation',
      summary: 'Guide d’intervention en cas d’erreur 500, timeout base de données, blocage CORS ou échec de validation.',
      summaryEn: 'Diagnostic playbook for 500 server errors, database timeouts, CORS blocks, and form validation failures.',
      tags: ['Diagnostic', 'Erreurs', 'Dépannage', 'Logs', 'Support'],
      roleRestriction: 'admin_finance',
      contentFr: (
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <div className="space-y-3">
            <div className="p-3 bg-red-50 text-red-900 rounded-xl border border-red-200 space-y-1">
              <span className="font-bold block">1. Échec de connexion base de données (Timeout / ENOTFOUND)</span>
              <p className="text-[11px]"><strong>Symptôme :</strong> Les pages affichent une erreur 500 ou basculent en mode mémoire locale.<br />
              <strong>Diagnostic :</strong> Vérifier l’état du projet Neon dans la console AWS Frankfurt et s’assurer que <code>DATABASE_URL_POOLED</code> contient <code>sslmode=require</code>.</p>
            </div>
            <div className="p-3 bg-amber-50 text-amber-900 rounded-xl border border-amber-200 space-y-1">
              <span className="font-bold block">2. Rejet de soumission depuis le site web (CORS / 400 Bad Request)</span>
              <p className="text-[11px]"><strong>Symptôme :</strong> Le formulaire <code>/demarrer-mon-projet</code> affiche une erreur de transmission.<br />
              <strong>Diagnostic :</strong> Vérifier la méthode <code>OPTIONS</code> sur <code>/api/demandes</code> et contrôler que le numéro de téléphone ne dépasse pas 14 chiffres.</p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-900 rounded-xl border border-blue-200 space-y-1">
              <span className="font-bold block">3. Génération de reçu refusée (Paiement non validé)</span>
              <p className="text-[11px]"><strong>Symptôme :</strong> Le bouton "Generate Receipt" est désactivé.<br />
              <strong>Résolution :</strong> Règle métier stricte : seuls les paiements validés par un Admin ou Finance Officer peuvent donner lieu à un reçu officiel.</p>
            </div>
          </div>
        </div>
      ),
      contentEn: (
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <div className="space-y-3">
            <div className="p-3 bg-red-50 text-red-900 rounded-xl border border-red-200 space-y-1">
              <span className="font-bold block">1. Database Connection Failures (Timeout / ENOTFOUND)</span>
              <p className="text-[11px]"><strong>Symptom:</strong> API routes return 500 or fallback to mock data.<br />
              <strong>Diagnostic:</strong> Check Neon compute status in console and ensure <code>DATABASE_URL_POOLED</code> includes <code>sslmode=require</code>.</p>
            </div>
            <div className="p-3 bg-amber-50 text-amber-900 rounded-xl border border-amber-200 space-y-1">
              <span className="font-bold block">2. Public Web Submission Failures (CORS / 400 Bad Request)</span>
              <p className="text-[11px]"><strong>Symptom:</strong> <code>/demarrer-mon-projet</code> shows submission errors.<br />
              <strong>Diagnostic:</strong> Verify preflight <code>OPTIONS</code> on <code>/api/demandes</code> and ensure phone number input is within 14 digits.</p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-900 rounded-xl border border-blue-200 space-y-1">
              <span className="font-bold block">3. Receipt Generation Blocked (Unvalidated Payment)</span>
              <p className="text-[11px]"><strong>Symptom:</strong> "Generate Receipt" is disabled.<br />
              <strong>Resolution:</strong> Expected behaviour: payments must be reviewed and marked Validated by authorized staff before receipt issuance.</p>
            </div>
          </div>
        </div>
      ),
    },

    // PREFINANCING & YIMMILINE REFERENCE (FROM PDF 2)
    {
      id: 'prefinancing-yimmiline-reference',
      category: 'prefinancing',
      title: 'Référentiel des Offres de Préfinancement AVI — YIMMILINE (Envol 2025)',
      titleEn: 'YIMMILINE AVI Prefinancing Reference (Envol 2025)',
      summary: 'Détail des 3 offres documentées : Classique (0 à 3 049 €), Partiel 1 (> 3 049 € à 6 %), et Partiel 2 (12 mois).',
      summaryEn: 'Full breakdown of the 3 documented options: Classic (€0 to €3,049), Partial 1 (> €3,049 at 6%), and Partial 2 (12 months).',
      tags: ['YIMMILINE', 'Préfinancement', 'AVI', 'Classique', 'Partiel', 'Taux'],
      roleRestriction: 'all',
      contentFr: (
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <div className="bg-[#f0faf7] p-3.5 rounded-xl border border-[#ccece2] space-y-1">
            <span className="font-extrabold text-[#0c685a] text-sm block">Avertissement Partenariat YIMMILINE</span>
            <p>Ces conditions constituent le référentiel contractuel documenté par notre partenaire YIMMILINE (Envol 2025). Elles ne constituent pas une garantie automatique d’approbation de crédit.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* OPTION 1 */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 shadow-sm">
              <div className="inline-block px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-extrabold text-[10.5px]">
                Offre 1 · Classique
              </div>
              <div className="text-sm font-extrabold text-[#092342]">0 à 3 049 €</div>
              <div className="text-[11px] text-slate-500 font-medium">(0 à 2 000 000 XAF)</div>
              <div className="space-y-1.5 pt-2 border-t border-slate-100 text-[11px]">
                <div><strong>Taux d’intérêt :</strong> 12 % du montant</div>
                <div><strong>Délai de remboursement :</strong> 08 mois</div>
                <div><strong>Garant :</strong> Au Cameroun ou en France gagnant 2x 2 000 000 FCFA sur N-1 ou garantie fiable de 2x le montant.</div>
                <div><strong>Pièces :</strong> 3 derniers bulletins de paie (salarié) ou bilan + historique bancaire N-1 (entrepreneur).</div>
              </div>
            </div>

            {/* OPTION 2 */}
            <div className="rounded-2xl border border-[#ccece2] bg-[#f9fdfb] p-4 space-y-3 shadow-sm">
              <div className="inline-block px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 font-extrabold text-[10.5px]">
                Offre 2 · Partiel 1
              </div>
              <div className="text-sm font-extrabold text-[#0c685a]">&gt; 3 049 €</div>
              <div className="text-[11px] text-slate-500 font-medium">(&gt; 2 000 000 XAF)</div>
              <div className="space-y-1.5 pt-2 border-t border-slate-100 text-[11px]">
                <div><strong>Taux d’intérêt :</strong> 6 % du montant</div>
                <div><strong>Délai :</strong> 03 mois pour remboursement</div>
                <div><strong>Apport personnel :</strong> 615 € × 3 (soit 403 440 XAF × 3)</div>
                <div><strong>Garant :</strong> En France uniquement (bulletins de paie, bilan, historique N-1).</div>
                <div><strong>Refus de visa :</strong> Seuls les intérêts de 6 % restent dus.</div>
              </div>
            </div>

            {/* OPTION 3 */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 shadow-sm">
              <div className="inline-block px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 font-extrabold text-[10.5px]">
                Offre 3 · Partiel 2
              </div>
              <div className="text-sm font-extrabold text-[#092342]">Jusqu’à 100 % de l’AVI</div>
              <div className="text-[11px] text-slate-500 font-medium">(De 2 000 000 XAF au total)</div>
              <div className="space-y-1.5 pt-2 border-t border-slate-100 text-[11px]">
                <div><strong>Taux d’intérêt :</strong> 12 % du montant</div>
                <div><strong>Délai :</strong> 12 mois pour remboursement</div>
                <div><strong>Prise d’effet :</strong> 30 jours après signature</div>
                <div><strong>Garant :</strong> En France uniquement avec chèques de caution et attestation sur l’honneur.</div>
                <div><strong>NB :</strong> Intérêts et frais AVI versés à la mise en place (non remboursables en cas d’échec).</div>
              </div>
            </div>
          </div>
        </div>
      ),
      contentEn: (
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <div className="bg-[#f0faf7] p-3.5 rounded-xl border border-[#ccece2] space-y-1">
            <span className="font-extrabold text-[#0c685a] text-sm block">YIMMILINE Partnership Disclaimer</span>
            <p>These terms reflect the partner’s contractual documentation (Envol 2025). They do not represent an automatic credit guarantee or loan approval substitute.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* OPTION 1 */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 shadow-sm">
              <div className="inline-block px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-extrabold text-[10.5px]">
                Option 1 · Classic
              </div>
              <div className="text-sm font-extrabold text-[#092342]">€0 to €3,049</div>
              <div className="text-[11px] text-slate-500 font-medium">(0 to 2,000,000 XAF)</div>
              <div className="space-y-1.5 pt-2 border-t border-slate-100 text-[11px]">
                <div><strong>Interest Rate:</strong> 12% of prefinanced amount</div>
                <div><strong>Repayment Period:</strong> 08 months</div>
                <div><strong>Guarantor:</strong> In Cameroon or France earning 2x annual prefinanced threshold.</div>
                <div><strong>Files:</strong> Last 3 payslips (employee) or balance sheet + N-1 bank statements.</div>
              </div>
            </div>

            {/* OPTION 2 */}
            <div className="rounded-2xl border border-[#ccece2] bg-[#f9fdfb] p-4 space-y-3 shadow-sm">
              <div className="inline-block px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 font-extrabold text-[10.5px]">
                Option 2 · Partial 1
              </div>
              <div className="text-sm font-extrabold text-[#0c685a]">&gt; €3,049</div>
              <div className="text-[11px] text-slate-500 font-medium">(&gt; 2,000,000 XAF)</div>
              <div className="space-y-1.5 pt-2 border-t border-slate-100 text-[11px]">
                <div><strong>Interest Rate:</strong> 6% of prefinanced amount</div>
                <div><strong>Repayment Period:</strong> 03 months</div>
                <div><strong>Personal Contribution:</strong> 3 × €615 (403,440 XAF × 3)</div>
                <div><strong>Guarantor:</strong> France only (payslips, balance sheet, N-1 bank history).</div>
                <div><strong>Visa Denial:</strong> Only 6% interest is owed.</div>
              </div>
            </div>

            {/* OPTION 3 */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 shadow-sm">
              <div className="inline-block px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 font-extrabold text-[10.5px]">
                Option 3 · Partial 2
              </div>
              <div className="text-sm font-extrabold text-[#092342]">Up to 100% of AVI</div>
              <div className="text-[11px] text-slate-500 font-medium">(From 2,000,000 XAF to total AVI)</div>
              <div className="space-y-1.5 pt-2 border-t border-slate-100 text-[11px]">
                <div><strong>Interest Rate:</strong> 12% of prefinanced amount</div>
                <div><strong>Repayment Period:</strong> 12 months</div>
                <div><strong>Start Date:</strong> 30 days post-contract</div>
                <div><strong>Guarantor:</strong> France only with guarantee cheques and declaration of honour.</div>
                <div><strong>Notice:</strong> Interest and AVI fees are due upon credit setup (non-refundable).</div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ], []);

  // Filter articles based on search and category
  const filteredArticles = useMemo(() => {
    return articles.filter((art) => {
      if (selectedCategory !== 'all' && art.category !== selectedCategory) return false;
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      const matchTitle = isEn ? art.titleEn.toLowerCase().includes(term) : art.title.toLowerCase().includes(term);
      const matchSummary = isEn ? art.summaryEn.toLowerCase().includes(term) : art.summary.toLowerCase().includes(term);
      const matchTags = art.tags.some((t) => t.toLowerCase().includes(term));
      return matchTitle || matchSummary || matchTags;
    });
  }, [articles, selectedCategory, searchTerm, isEn]);

  const activeArticle = useMemo(() => {
    if (!activeArticleId) return null;
    return articles.find((a) => a.id === activeArticleId) || null;
  }, [articles, activeArticleId]);

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <span className="inline-block rounded-full bg-[#eef4fb] px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-[#092342] mb-2">
            {isEn ? 'OFFICIAL DOCUMENTATION & SYSTEM KNOWLEDGE' : 'DOCUMENTATION OFFICIELLE & BASE DE CONNAISSANCES'}
          </span>
          <h1 className="text-[28px] font-extrabold text-[#092342] leading-tight">
            {isEn ? 'Help, Support & LIEC Heav’n Knowledge Base' : 'Aide, Support & Base de Connaissances LIEC Heav’n'}
          </h1>
          <p className="mt-1 text-sm text-slate-500 max-w-3xl">
            {isEn
              ? 'Comprehensive reference guides for LIEC advisors (LIEC-France Prépa student journey, requirements, fees) and Technical Support for the Neon PostgreSQL engine.'
              : 'Guides de référence complets pour les conseillers LIEC (parcours LIEC-France Prépa, pièces, scolarité) et support technique pour le moteur Neon PostgreSQL.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 inline-flex items-center gap-2 shadow-sm"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>{isEn ? 'Print Guide' : 'Imprimer'}</span>
          </button>
        </div>
      </div>

      {/* SEARCH AND CATEGORY FILTER TOOLBAR */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        <div className="md:col-span-6 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={isEn ? 'Search across articles, steps, fees, procedures, or technical engine...' : 'Rechercher un article, une étape, des frais, des pièces...'}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#092342] bg-white shadow-sm"
          />
        </div>

        <div className="md:col-span-6 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
              selectedCategory === 'all'
                ? 'bg-[#092342] text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {isEn ? 'All Articles' : 'Tous les articles'} ({articles.length})
          </button>
          <button
            onClick={() => setSelectedCategory('advisor')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all inline-flex items-center gap-1.5 ${
              selectedCategory === 'advisor'
                ? 'bg-[#0c685a] text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>{isEn ? 'LIEC Advisor Guide' : 'Guide Conseiller'}</span>
          </button>
          <button
            onClick={() => setSelectedCategory('technical')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all inline-flex items-center gap-1.5 ${
              selectedCategory === 'technical'
                ? 'bg-[#1e3a8a] text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>{isEn ? 'Technical Support & PostgreSQL' : 'Support Technique & PostgreSQL'}</span>
          </button>
          <button
            onClick={() => setSelectedCategory('prefinancing')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all inline-flex items-center gap-1.5 ${
              selectedCategory === 'prefinancing'
                ? 'bg-[#4338ca] text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Banknote className="w-3.5 h-3.5" />
            <span>{isEn ? 'YIMMILINE Prefinancing' : 'Préfinancement Yimmiline'}</span>
          </button>
        </div>
      </div>

      {/* ARTICLES GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredArticles.map((art) => (
          <div
            key={art.id}
            onClick={() => setActiveArticleId(art.id)}
            className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-[#092342]/40 hover:shadow-card transition-all cursor-pointer flex flex-col justify-between group space-y-3"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                    art.category === 'advisor'
                      ? 'bg-[#eefaf6] text-[#0c685a] border border-[#ccece2]'
                      : art.category === 'technical'
                      ? 'bg-blue-50 text-blue-800 border border-blue-200'
                      : 'bg-purple-50 text-purple-800 border border-purple-200'
                  }`}
                >
                  {art.category === 'advisor'
                    ? (art.stepNum ? `Étape ${art.stepNum}` : 'Guide Conseiller')
                    : art.category === 'technical'
                    ? 'Support Technique'
                    : 'Préfinancement AVI'}
                </span>

                {art.roleRestriction === 'admin_finance' && (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Admin / Tech
                  </span>
                )}
              </div>

              <h3 className="font-extrabold text-sm text-[#092342] group-hover:text-[#0c685a] transition-colors leading-snug">
                {isEn ? art.titleEn : art.title}
              </h3>

              <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                {isEn ? art.summaryEn : art.summary}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-[#092342] font-extrabold">
              <div className="flex flex-wrap gap-1">
                {art.tags.slice(0, 2).map((t) => (
                  <span key={t} className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
                    #{t}
                  </span>
                ))}
              </div>
              <span className="inline-flex items-center gap-1 text-[#0c685a] group-hover:translate-x-0.5 transition-transform">
                {isEn ? 'Read article' : 'Consulter'} →
              </span>
            </div>
          </div>
        ))}
      </div>

      {filteredArticles.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center space-y-3 bg-white">
          <HelpCircle className="w-8 h-8 text-slate-400 mx-auto" />
          <h3 className="font-extrabold text-slate-700 text-sm">
            {isEn ? 'No knowledge articles matched your search' : 'Aucun article ne correspond à votre recherche'}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {isEn
              ? 'Try modifying your search term or select "All Articles" to see the complete guide.'
              : 'Essayez de modifier vos mots-clés ou sélectionnez "Tous les articles" pour afficher la documentation complète.'}
          </p>
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('all');
            }}
            className="px-4 py-2 rounded-xl bg-[#092342] text-white text-xs font-bold"
          >
            {isEn ? 'Reset Filters' : 'Réinitialiser les filtres'}
          </button>
        </div>
      )}

      {/* ARTICLE READER MODAL */}
      {activeArticle && (
        <div className="fixed inset-0 z-50 bg-[#092342]/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden my-8 animate-fadeIn">
            {/* Modal Header */}
            <div className="p-6 bg-[#092342] text-white flex items-start justify-between gap-4">
              <div className="space-y-1">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-white/10 text-white/90">
                  {activeArticle.category === 'advisor'
                    ? (activeArticle.stepNum ? `Étape ${activeArticle.stepNum} · Parcours des Élites` : 'Guide Conseiller')
                    : activeArticle.category === 'technical'
                    ? 'Architecture & PostgreSQL Engine'
                    : 'Référentiel Envol 2025'}
                </span>
                <h2 className="text-lg font-extrabold leading-tight">
                  {isEn ? activeArticle.titleEn : activeArticle.title}
                </h2>
              </div>
              <button
                onClick={() => setActiveArticleId(null)}
                className="rounded-full bg-white/10 hover:bg-white/20 text-white h-8 w-8 flex items-center justify-center text-sm font-bold shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {isEn ? activeArticle.contentEn : activeArticle.contentFr}

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <span className="font-extrabold text-[#092342] block">Source Document Reference</span>
                  <span className="text-slate-500 text-[11px]">
                    {activeArticle.category === 'advisor'
                      ? 'PROGRAMME ET PARCOURS DES ELITES LIEC – FRANCE PRÉPA 28.pdf (August 11, 2026)'
                      : activeArticle.category === 'technical'
                      ? 'LIEC Heav’n System Architecture & Neon PostgreSQL Engine (Subproduction)'
                      : 'Préfinancement Envol 2025(1).pdf — YIMMILINE Stains & Douala'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-bold text-slate-700 inline-flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => setActiveArticleId(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-100"
              >
                {isEn ? 'Close' : 'Fermer'}
              </button>

              {onNavigate && activeArticle.category === 'advisor' && (
                <button
                  onClick={() => {
                    setActiveArticleId(null);
                    onNavigate('candidats');
                  }}
                  className="px-4 py-2 rounded-xl bg-[#092342] hover:bg-[#12365a] text-white font-extrabold text-xs inline-flex items-center gap-1.5"
                >
                  <span>{isEn ? 'Open Candidates CRM' : 'Ouvrir le CRM Candidats'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
