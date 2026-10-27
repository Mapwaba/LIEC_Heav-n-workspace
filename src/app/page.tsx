'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutGrid,
  Inbox,
  Contact,
  GraduationCap,
  CheckSquare,
  Share2,
  FileText,
  BarChart3,
  Bell,
  SlidersHorizontal,
  HelpCircle,
  Search,
  Calendar,
  ExternalLink,
  User,
  LogOut,
  ChevronRight,
  Menu,
  X,
  Sun,
  Moon,
  Globe,
  Home,
} from 'lucide-react';

import OverviewScreen from '@/components/OverviewScreen';
import DemandesScreen from '@/components/DemandesScreen';
import ProspectsScreen from '@/components/ProspectsScreen';
import CandidatsScreen from '@/components/CandidatsScreen';
import AccommodationScreen from '@/components/AccommodationScreen';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  PrepaScreen,
  ServicesAviScreen,
  PublicSiteIntakeScreen,
  RapportsFinanceScreen,
  ParametresGovernanceScreen,
  Lang,
} from '@/components/ServicesAndOtherScreens';

type NavTab =
  | 'overview'
  | 'demandes'
  | 'prospects'
  | 'candidats'
  | 'prepa'
  | 'services'
  | 'accommodation'
  | 'contenus'
  | 'rapports'
  | 'notifications'
  | 'parametres'
  | 'aide';

const TAB_LABELS_EN: Record<NavTab, string> = {
  overview: 'Overview',
  demandes: 'Received Applications',
  prospects: 'Prospects CRM',
  candidats: 'Candidates & Files',
  prepa: 'PREPA Enrollments',
  services: 'AVI Financing Desk',
  accommodation: 'Accommodation Reservations',
  contenus: 'Public Portal Intake',
  rapports: 'Finance & Analytics',
  notifications: 'Notifications',
  parametres: 'Settings & Security',
  aide: 'Help & Knowledge Base',
};

const TAB_LABELS_FR: Record<NavTab, string> = {
  overview: "Vue d'ensemble",
  demandes: 'Demandes reçues',
  prospects: 'Prospects',
  candidats: 'Candidats',
  prepa: 'Inscriptions PREPA',
  services: 'Guichet Financement AVI',
  accommodation: 'Réservations Logement',
  contenus: 'Contenus du site',
  rapports: 'Rapports & stats',
  notifications: 'Notifications',
  parametres: 'Paramètres & sécurité',
  aide: 'Aide & support',
};

export default function LiecWorkspacePage() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>('en'); // English as primary language by default
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<'admin' | 'secretary' | 'avi' | null>(null);
  const [rolePreview, setRolePreview] = useState<'admin' | 'secretary' | 'avi'>('admin');
  const [globalSearch, setGlobalSearch] = useState('');
  const [showNewDemandeModal, setShowNewDemandeModal] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);

  // Workspace Data from PostgreSQL API
  const [loading, setLoading] = useState(true);
  const [dbEngine, setDbEngine] = useState('postgresql');
  const [demandes, setDemandes] = useState<any[]>([]);
  const [demandeNotes, setDemandeNotes] = useState<any[]>([]);
  const [prospects, setProspects] = useState<any[]>([]);
  const [candidats, setCandidats] = useState<any[]>([]);
  const [priorityTasks, setPriorityTasks] = useState<any[]>([]);
  const [aviRequests, setAviRequests] = useState<any[]>([]);
  const [prepaCohorts, setPrepaCohorts] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [accommodationRequests, setAccommodationRequests] = useState<any[]>([]);

  const [selectedDemandeRef, setSelectedDemandeRef] = useState('#DEM-2025-089');
  const [selectedCandidatRef, setSelectedCandidatRef] = useState('#CAN-2025-042');

  // New Demande Modal Form State
  const [newDemName, setNewDemName] = useState('');
  const [newDemEmail, setNewDemEmail] = useState('');
  const [newDemPhone, setNewDemPhone] = useState('+243 ');
  const [newDemCountry, setNewDemCountry] = useState('RDC');
  const [newDemCity, setNewDemCity] = useState('Kinshasa');
  const [newDemProgram, setNewDemProgram] = useState(
    'MyDigitalSchool Lyon — Dév. Web & UX/UI'
  );
  const [newDemPole, setNewDemPole] = useState('PREPA / MyDigitalSchool Lyon');
  const [newDemBudget, setNewDemBudget] = useState('8 500 € – 10 000 € / an');

  // New Student Application and Parent Linking Fields
  const [newDemParentName, setNewDemParentName] = useState('');
  const [newDemParentPhone, setNewDemParentPhone] = useState('');
  const [newDemGraduationYear, setNewDemGraduationYear] = useState('2024');
  const [newDemCurrentActivity, setNewDemCurrentActivity] = useState('');
  const [newDemFinalYearUni, setNewDemFinalYearUni] = useState('');
  const [parentStudentLinks, setParentStudentLinks] = useState<any[]>([]);

  const isEn = lang === 'en';
  const tabLabels = isEn ? TAB_LABELS_EN : TAB_LABELS_FR;

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 4500);
  }, []);

  const isNavVisible = useCallback(
    (tab: NavTab, targetRole?: 'admin' | 'secretary' | 'avi') => {
      const role = targetRole || rolePreview;
      if (role === 'admin') return true;
      if (role === 'secretary') {
        return [
          'overview',
          'demandes',
          'prospects',
          'candidats',
          'prepa',
          'services',
          'accommodation',
          'contenus',
          'notifications',
          'aide',
        ].includes(tab);
      }
      if (role === 'avi') {
        return ['overview', 'services', 'rapports', 'notifications', 'parametres', 'aide'].includes(
          tab
        );
      }
      return true;
    },
    [rolePreview]
  );

  const fetchWorkspace = useCallback(async (overrideEmail?: string) => {
    try {
      const activeEmail =
        overrideEmail ||
        (rolePreview === 'secretary'
          ? 'marc.kouassi@liec-education.com'
          : rolePreview === 'avi'
          ? 'alain.kanza@liec-education.com'
          : 'sarah.mwamba@liec-education.com');

      const res = await fetch(`/api/workspace?user_email=${encodeURIComponent(activeEmail)}`, {
        cache: 'no-store',
        headers: { 'x-user-email': activeEmail },
      });
      if (!res.ok) {
        if (res.status === 403) {
          const errData = await res.json().catch(() => null);
          if (errData?.requirePasswordChange) {
            router.replace('/login?status=password_change_required');
            return;
          }
          showToast(isEn ? 'Access restricted by server-side RBAC policy.' : 'Accès restreint par la politique RBAC du serveur.');
        }
        return;
      }
      const data = await res.json();
      setDbEngine(data.engine || 'postgresql');
      setDemandes(data.demandes || []);
      setDemandeNotes(data.demandeNotes || []);
      setProspects(data.prospects || []);
      setCandidats(data.candidats || []);
      setPriorityTasks(data.priorityTasks || []);
      setAviRequests(data.aviRequests || []);
      setPrepaCohorts(data.prepaCohorts || []);
      setInvoices(data.invoices || []);
      setAuditLogs(data.auditLogs || []);
      if (data.users) setUsers(data.users);
      if (data.roles) setRoles(data.roles);
      if (data.parentStudentLinks) setParentStudentLinks(data.parentStudentLinks);
      if (data.accommodationRequests) setAccommodationRequests(data.accommodationRequests);
    } catch (err) {
      console.error('Failed to fetch workspace:', err);
    } finally {
      setLoading(false);
    }
  }, [rolePreview, isEn, showToast]);

  // Initial authentication enforcement & load ONCE on mount
  useEffect(() => {
    const savedUserStr = localStorage.getItem('liec_user');
    if (!savedUserStr) {
      setCheckingAuth(false);
      setIsAuthenticated(false);
      router.replace('/login');
      return;
    }

    try {
      const u = JSON.parse(savedUserStr);
      if (!u || !u.email || !['admin', 'secretary', 'avi'].includes(u.role) || u.must_change_password) {
        if (u?.must_change_password) {
          router.replace('/login?status=password_change_required');
          return;
        }
        localStorage.removeItem('liec_user');
        localStorage.removeItem('liec_role');
        setCheckingAuth(false);
        setIsAuthenticated(false);
        router.replace('/login');
        return;
      }

      setCurrentUser(u);
      setUserRole(u.role);
      setRolePreview(u.role);
      setIsAuthenticated(true);
      setCheckingAuth(false);

      if (u.role === 'avi') {
        setActiveTab('services');
      } else {
        setActiveTab('overview');
      }

      const savedLang = localStorage.getItem('liec_lang') as Lang | null;
      if (savedLang === 'fr' || savedLang === 'en') {
        setLang(savedLang);
      } else {
        setLang('en');
      }

      const savedTheme = localStorage.getItem('liec_theme');
      if (savedTheme === 'dark') {
        setDarkMode(true);
        document.documentElement.classList.add('dark');
      }

      fetchWorkspace(u.email);
    } catch (e) {
      console.warn('Could not parse user:', e);
      localStorage.removeItem('liec_user');
      localStorage.removeItem('liec_role');
      setCheckingAuth(false);
      setIsAuthenticated(false);
      router.replace('/login');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRoleChange = (nextRole: 'admin' | 'secretary' | 'avi') => {
    setRolePreview(nextRole);
    const simEmail =
      nextRole === 'secretary'
        ? 'marc.kouassi@liec-education.com'
        : nextRole === 'avi'
        ? 'alain.kanza@liec-education.com'
        : 'sarah.mwamba@liec-education.com';
    fetchWorkspace(simEmail);
    if (!isNavVisible(activeTab, nextRole)) {
      setActiveTab(nextRole === 'avi' ? 'services' : 'overview');
    }
    showToast(
      isEn
        ? `Role switched to: ${
            nextRole === 'admin'
              ? 'Administrator / Senior Advisor'
              : nextRole === 'secretary'
              ? 'Secretary'
              : 'AVI Officer'
          }`
        : `Aperçu du rôle changé : ${
            nextRole === 'admin'
              ? 'Administrateur / Conseillère Senior'
              : nextRole === 'secretary'
              ? 'Secrétaire'
              : 'Officier AVI'
          }`
    );
  };

  const toggleLanguage = (targetLang: Lang) => {
    setLang(targetLang);
    localStorage.setItem('liec_lang', targetLang);
    showToast(
      targetLang === 'en'
        ? 'Language switched to English (Primary).'
        : 'Langue modifiée en Français.'
    );
  };

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('liec_theme', 'dark');
        showToast(isEn ? 'Dark mode enabled.' : 'Mode sombre activé.');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('liec_theme', 'light');
        showToast(isEn ? 'Light mode enabled.' : 'Mode clair activé.');
      }
      return next;
    });
  };

  // Keyboard shortcut ⌘K / Ctrl+K for search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        document.getElementById('global-search-input')?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // API Handlers
  const handleCreateDemande = async (payload: any): Promise<string | undefined> => {
    try {
      const activeEmail =
        currentUser?.email ||
        (rolePreview === 'secretary'
          ? 'marc.kouassi@liec-education.com'
          : rolePreview === 'avi'
          ? 'alain.kanza@liec-education.com'
          : 'sarah.mwamba@liec-education.com');

      const res = await fetch('/api/demandes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': activeEmail,
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        await fetchWorkspace(activeEmail);
        if (json.ref) setSelectedDemandeRef(json.ref);
        showToast(
          isEn
            ? `New student applicant ${json.ref} saved in PostgreSQL.`
            : `Nouvelle demande candidat ${json.ref} créée dans PostgreSQL.`
        );
        return json.ref;
      }
      showToast(
        json.error ||
          json.message ||
          (isEn ? 'Error while creating application.' : 'Erreur lors de la création de la demande.')
      );
      return undefined;
    } catch (err: any) {
      showToast(
        err?.message ||
          (isEn ? 'Error while creating application.' : 'Erreur lors de la création de la demande.')
      );
      return undefined;
    }
  };

  const handleNewDemandeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDemName.trim()) return;

    // Validate Candidate Phone / WhatsApp (max 14 digits)
    const candPhoneDigits = newDemPhone.replace(/\D/g, '');
    if (candPhoneDigits.length > 14) {
      showToast(
        isEn
          ? 'Phone / WhatsApp must be limited to a maximum of 14 digits.'
          : 'Le numéro de téléphone / WhatsApp ne peut pas dépasser 14 chiffres.'
      );
      return;
    }

    // Validate Parent Phone (max 14 digits)
    const phoneDigits = newDemParentPhone.replace(/\D/g, '');
    if (phoneDigits.length > 14) {
      showToast(
        isEn
          ? 'Parent Phone Number must be limited to a maximum of 14 digits.'
          : 'Le numéro de téléphone du parent ne peut pas dépasser 14 chiffres.'
      );
      return;
    }

    // Validate Current Activity (max 25 characters)
    if (newDemCurrentActivity.trim().length > 25) {
      showToast(
        isEn
          ? 'Current Activity cannot exceed 25 characters.'
          : 'L’activité actuelle ne peut pas dépasser 25 caractères.'
      );
      return;
    }

    // Validate Final Year University (max 4 digits)
    if (newDemFinalYearUni.trim().length > 4) {
      showToast(
        isEn
          ? 'Final Year of University cannot exceed 4 digits.'
          : 'La dernière année universitaire ne peut pas dépasser 4 chiffres.'
      );
      return;
    }

    const createdRef = await handleCreateDemande({
      full_name: newDemName.trim(),
      email: newDemEmail.trim() || `${newDemName.trim().toLowerCase().replace(/\s+/g, '.')}@gmail.com`,
      phone: newDemPhone.trim(),
      country_name: newDemCountry,
      city: `${newDemCity}, ${newDemCountry}`,
      program: newDemProgram,
      service_pole: newDemPole,
      budget_range: newDemBudget,
      parent_full_name: newDemParentName.trim(),
      parent_phone: newDemParentPhone.trim(),
      graduation_year: newDemGraduationYear,
      current_activity: newDemCurrentActivity.trim(),
      final_year_university: newDemFinalYearUni.trim(),
    });

    if (createdRef) {
      setNewDemName('');
      setNewDemEmail('');
      setNewDemPhone(newDemCountry === 'RDC' ? '+243 ' : '+242 ');
      setNewDemParentName('');
      setNewDemParentPhone('');
      setNewDemGraduationYear('2024');
      setNewDemCurrentActivity('');
      setNewDemFinalYearUni('');
      setShowNewDemandeModal(false);
      // Immediately navigate to demandes tab so the new applicant is shown at the top
      setActiveTab('demandes');
    }
  };

  const handleAddDemandeNote = async (ref: string, content: string) => {
    await fetch('/api/demandes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref, action: 'add_note', content }),
    });
    await fetchWorkspace();
    showToast(
      isEn
        ? `Internal follow-up note added to ${ref}.`
        : `Note de suivi interne ajoutée sur ${ref}.`
    );
  };

  const handleUpdateDemandeStatus = async (ref: string, status: string, adviser?: string) => {
    await fetch('/api/demandes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref, action: 'update_status', status, adviser }),
    });
    await fetchWorkspace();
    showToast(
      isEn
        ? `Status of ${ref} updated to: ${status}.`
        : `Statut de ${ref} mis à jour : ${status}.`
    );
  };

  const handleConvertDemandeToCandidat = async (ref: string) => {
    const res = await fetch('/api/demandes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref, action: 'convert_to_candidat' }),
    });
    if (res.ok) {
      const json = await res.json();
      await fetchWorkspace();
      if (json.candidatRef) {
        setSelectedCandidatRef(json.candidatRef);
      }
      showToast(
        isEn
          ? `Application ${ref} qualified and converted to Candidate (${json.candidatRef})!`
          : `Demande ${ref} qualifiée et convertie en Candidat (${json.candidatRef}) !`
      );
      setActiveTab('candidats');
    }
  };

  const handleArchiveDemande = async (ref: string) => {
    await fetch(`/api/demandes?ref=${encodeURIComponent(ref)}`, { method: 'DELETE' });
    await fetchWorkspace();
    showToast(isEn ? `Application ${ref} archived.` : `Demande ${ref} archivée.`);
  };

  const handleToggleTask = async (id: number) => {
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle', id }),
    });
    await fetchWorkspace();
  };

  const handleResetTasks = async () => {
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset_all' }),
    });
    await fetchWorkspace();
    showToast(
      isEn
        ? 'All priority tasks have been reset.'
        : 'Toutes les tâches prioritaires ont été réinitialisées.'
    );
  };

  const handleAddProspect = async (data: any) => {
    await fetch('/api/prospects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    await fetchWorkspace();
    showToast(
      isEn
        ? `Prospect ${data.full_name} added to pipeline.`
        : `Prospect ${data.full_name} ajouté au pipeline.`
    );
  };

  const handleMoveProspect = async (id: number, stage: string) => {
    await fetch('/api/prospects', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, stage }),
    });
    await fetchWorkspace();
    showToast(
      isEn
        ? 'Prospect stage updated in Kanban pipeline.'
        : 'Stade du prospect mis à jour dans le pipeline Kanban.'
    );
  };

  const handleCreateCandidat = async (data: any) => {
    try {
      const activeEmail =
        currentUser?.email ||
        (rolePreview === 'secretary'
          ? 'marc.kouassi@liec-education.com'
          : rolePreview === 'avi'
          ? 'alain.kanza@liec-education.com'
          : 'sarah.mwamba@liec-education.com');

      const res = await fetch('/api/candidats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': activeEmail,
        },
        body: JSON.stringify(data),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        await fetchWorkspace(activeEmail);
        if (json.ref) setSelectedCandidatRef(json.ref);
        showToast(
          isEn
            ? `New candidate file ${json.ref} created.`
            : `Nouveau dossier candidat ${json.ref} créé.`
        );
      } else {
        showToast(
          json.error ||
            json.message ||
            (isEn ? 'Error creating candidate file.' : 'Erreur création dossier candidat.')
        );
      }
    } catch (err: any) {
      showToast(
        err?.message ||
          (isEn ? 'Error creating candidate file.' : 'Erreur création dossier candidat.')
      );
    }
  };

  const handleAddCandidatNote = async (ref: string, text: string) => {
    await fetch('/api/candidats', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref, action: 'add_note', text }),
    });
    await fetchWorkspace();
    showToast(
      isEn
        ? 'Observation recorded in pedagogical journal.'
        : 'Observation enregistrée dans le journal pédagogique.'
    );
  };

  const handleAddCandidatVoeu = async (ref: string, data: any) => {
    await fetch('/api/candidats', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref, action: 'add_voeu', ...data }),
    });
    await fetchWorkspace();
    showToast(
      isEn
        ? `New academic choice added for ${ref}.`
        : `Nouveau vœu académique ajouté pour ${ref}.`
    );
  };

  const handleAdvanceCandidatJalon = async (ref: string, jalonNum: number) => {
    await fetch('/api/candidats', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref, action: 'advance_jalon', jalonNum }),
    });
    await fetchWorkspace();
    showToast(
      isEn
        ? `Milestone ${jalonNum} updated for file ${ref}.`
        : `Jalon ${jalonNum} mis à jour pour le dossier ${ref}.`
    );
  };

  const handleToggleCandidatPiece = async (ref: string, index: number) => {
    await fetch('/api/candidats', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref, action: 'toggle_piece', index }),
    });
    await fetchWorkspace();
    showToast(
      isEn
        ? 'Supporting document status updated.'
        : 'Statut de la pièce justificative mis à jour.'
    );
  };

  const handleCreateAvi = async (data: any) => {
    const activeEmail =
      rolePreview === 'secretary'
        ? 'marc.kouassi@liec-education.com'
        : rolePreview === 'avi'
        ? 'alain.kanza@liec-education.com'
        : currentUser?.email || 'sarah.mwamba@liec-education.com';

    const res = await fetch('/api/avi', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': activeEmail,
      },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const json = await res.json();
      await fetchWorkspace();
      showToast(
        isEn
          ? `Parent AVI application ${json.ref} successfully registered.`
          : `Demande AVI ${json.ref} enregistrée avec succès (150 € d'intérêt récupérés).`
      );
    } else {
      const err = await res.json();
      showToast(err.message || err.error || 'Erreur soumission AVI (403)');
    }
  };


  const newDemandesBadgeCount = 14 + Math.max(0, demandes.length - 11);

  const platformItems: {
    id: NavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    badgeTone?: 'mint' | 'gold';
  }[] = [
    { id: 'overview', label: tabLabels.overview, icon: LayoutGrid },
    {
      id: 'demandes',
      label: tabLabels.demandes,
      icon: Inbox,
      badge: newDemandesBadgeCount,
      badgeTone: 'mint',
    },
    { id: 'prospects', label: tabLabels.prospects, icon: Contact },
    { id: 'candidats', label: tabLabels.candidats, icon: GraduationCap },
    {
      id: 'prepa',
      label: tabLabels.prepa,
      icon: CheckSquare,
      badge: 3,
      badgeTone: 'gold',
    },
    { id: 'services', label: tabLabels.services, icon: Share2 },
    { id: 'accommodation', label: tabLabels.accommodation, icon: Home },
    { id: 'contenus', label: tabLabels.contenus, icon: FileText },
    { id: 'rapports', label: tabLabels.rapports, icon: BarChart3 },
  ];

  const configItems: {
    id: NavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }[] = [
    { id: 'notifications', label: tabLabels.notifications, icon: Bell, badge: 5 },
    { id: 'parametres', label: tabLabels.parametres, icon: SlidersHorizontal },
    { id: 'aide', label: tabLabels.aide, icon: HelpCircle },
  ];

  if (checkingAuth || !isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f6f9fc] p-6 text-center">
        <div className="flex items-center gap-3 mb-6">
          <img
            src="/logo_LIEC.jpeg"
            alt="LIEC Logo"
            className="h-12 w-12 rounded-2xl object-contain shadow-md bg-white p-1 border border-slate-200"
          />
          <div className="text-left">
            <div className="text-xl font-extrabold tracking-tight text-[#092342]">LIEC Heav’n</div>
            <div className="text-xs font-semibold text-slate-500">Education Management Workspace</div>
          </div>
        </div>
        <div className="h-8 w-8 rounded-full border-3 border-[#0c685a] border-t-transparent animate-spin mb-4" />
        <p className="text-xs font-extrabold text-slate-600">
          {isEn
            ? 'Enforcing staff security session & permissions...'
            : 'Vérification de la session sécurisée et des permissions...'}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#f6f9fc] text-[#092342]">
      {/* Left Sidebar (Desktop + Mobile Drawer) */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[242px] bg-white border-r border-[#e6eef6] flex flex-col justify-between transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 space-y-6 overflow-y-auto">
          {/* Top Brand Logo & Role Pill */}
          <div className="flex items-center justify-between px-1 pt-0.5">
            <button
              onClick={() => {
                setActiveTab('overview');
                setMobileMenuOpen(false);
              }}
              className="flex items-center gap-2.5 text-left group"
            >
              <img
                src="/logo_LIEC.jpeg"
                alt="LIEC Logo"
                className="h-9 w-9 rounded-xl object-contain shadow-xs bg-white p-0.5 border border-slate-200 dark:border-slate-700 group-hover:opacity-90 transition"
              />
              <div className="leading-tight" title="LIEC Heav'n Workspace">
                <div className="text-[13px] font-extrabold tracking-tight text-[#092342] dark:text-white">
                  LIEC Heav’n
                </div>
                <div className="text-[10px] font-medium text-slate-500 mt-0.5">
                  Workspace
                </div>
                <span className="sr-only">LIEC Heav'n Worskpace</span>
              </div>
            </button>

            <span className="rounded-full bg-[#d8f6ea] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#0c685a]">
              {rolePreview === 'avi' ? 'AVI OFF.' : rolePreview === 'secretary' ? 'SECRETARY' : 'ADMIN'}
            </span>
          </div>

          {/* PLATFORM Section */}
          <div>
            <div className="px-2.5 mb-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
              {isEn ? 'PLATFORM' : 'PLATEFORME'}
            </div>
            <nav className="space-y-1">
              {platformItems.filter((item) => isNavVisible(item.id)).map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full rounded-xl px-3 py-2.5 text-xs font-bold flex items-center justify-between transition ${
                      active
                        ? 'bg-[#d5f0e8] text-[#0c685a] font-extrabold'
                        : 'text-[#092342] hover:bg-slate-100/80'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`w-4 h-4 ${
                          active ? 'text-[#0c685a]' : 'text-slate-600'
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>

                    {item.badge !== undefined && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold leading-none ${
                          item.badgeTone === 'gold'
                            ? 'bg-[#fde6b8] text-[#784e06]'
                            : 'bg-[#6ee7b7] text-[#064e3b]'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          <hr className="border-[#eef3f8]" />

          {/* CONFIGURATION Section */}
          <div>
            <div className="px-2.5 mb-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
              {isEn ? 'CONFIGURATION' : 'CONFIGURATION'}
            </div>
            <nav className="space-y-1">
              {configItems.filter((item) => isNavVisible(item.id)).map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full rounded-xl px-3 py-2.5 text-xs font-bold flex items-center justify-between transition ${
                      active
                        ? 'bg-[#d5f0e8] text-[#0c685a] font-extrabold'
                        : 'text-[#092342] hover:bg-slate-100/80'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`w-4 h-4 ${
                          active ? 'text-[#0c685a]' : 'text-slate-600'
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && (
                      <span className="rounded-full bg-[#ccf5e5] px-2 py-0.5 text-[10px] font-extrabold text-[#0c685a] leading-none">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Bottom User Profile Box */}
        <div className="p-3 border-t border-[#eef3f8]">
          <div className="rounded-2xl border border-[#e6eef6] bg-[#f8fbff] p-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-9 w-9 rounded-full bg-[#092342] text-white flex items-center justify-center shrink-0 font-extrabold text-xs">
                {rolePreview === 'secretary'
                  ? 'MK'
                  : rolePreview === 'avi'
                  ? 'AK'
                  : currentUser?.initials || 'SM'}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-extrabold text-[#092342] truncate">
                  {rolePreview === 'secretary'
                    ? 'Marc Kouassi'
                    : rolePreview === 'avi'
                    ? 'Alain Kanza'
                    : currentUser?.name || 'Sarah Mwamba'}
                </div>
                <div className="text-[10.5px] text-slate-500 truncate">
                  {rolePreview === 'secretary'
                    ? isEn ? 'Secretary (Orientation)' : 'Secrétaire Orientation'
                    : rolePreview === 'avi'
                    ? isEn ? 'AVI Officer (Financing)' : 'Officier Financement AVI'
                    : isEn ? 'Administrator / Senior Advisor' : 'Administrateur / Conseillère Senior'}
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                localStorage.removeItem('liec_user');
                localStorage.removeItem('liec_role');
                document.cookie = 'liec_user_email=; path=/; max-age=0; SameSite=Lax';
                router.replace('/login');
              }}
              title={isEn ? 'Log out' : 'Se déconnecter'}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200/70 hover:text-[#092342] transition shrink-0 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="h-16 bg-white border-b border-[#e6eef6] px-4 sm:px-6 flex items-center justify-between gap-3 sticky top-0 z-30">
          {/* Left Breadcrumb & Mobile Menu Toggle */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="flex items-center gap-1.5 text-xs">
              <span
                onClick={() => setActiveTab('overview')}
                className="text-slate-500 font-medium cursor-pointer hover:text-[#092342]"
              >
                LIEC Admin
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-extrabold text-[#092342]">
                {tabLabels[activeTab]}
              </span>
            </div>
          </div>

          {/* Center Global Search Bar */}
          <div className="hidden md:flex items-center flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="global-search-input"
                type="text"
                value={globalSearch}
                onChange={(e) => {
                  setGlobalSearch(e.target.value);
                  if (e.target.value.trim().length > 1 && activeTab === 'overview') {
                    setActiveTab('demandes');
                  }
                }}
                placeholder={isEn ? 'Search candidate, file reference, school...' : 'Rechercher un candidat, un dossier, un...'}
                className="w-full rounded-xl bg-[#f1f6fb] pl-9 pr-12 py-2 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0c685a]/20"
              />
              <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-extrabold text-slate-600">
                ⌘K
              </kbd>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2.5">
            {/* Language Switcher: EN (Primary) | FR (Secondary) */}
            <div className="inline-flex items-center rounded-xl border border-[#ccece2] bg-[#f0faf7] p-1 shadow-xs">
              <button
                type="button"
                onClick={() => toggleLanguage('en')}
                className={`rounded-lg px-2.5 py-1 text-xs font-extrabold transition ${
                  lang === 'en'
                    ? 'bg-[#0c685a] text-white shadow-xs'
                    : 'text-slate-600 hover:text-[#092342]'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => toggleLanguage('fr')}
                className={`rounded-lg px-2.5 py-1 text-xs font-extrabold transition ${
                  lang === 'fr'
                    ? 'bg-[#0c685a] text-white shadow-xs'
                    : 'text-slate-600 hover:text-[#092342]'
                }`}
              >
                FR
              </button>
            </div>

            {/* Role Management Dropdown / Tab - EXCLUSIVELY for Administrator */}
            {userRole === 'admin' && (
              <div className="flex items-center gap-1.5 rounded-xl border border-[#bbf0df] bg-[#eefaf6] px-2.5 py-1 shadow-xs">
                <span className="text-[11px] font-extrabold text-[#0c685a] flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#0c685a]" />
                  <span className="hidden sm:inline">{isEn ? 'Role Mode:' : 'Gestion de rôles :'}</span>
                </span>
                <select
                  value={rolePreview}
                  onChange={(e) => handleRoleChange(e.target.value as 'admin' | 'secretary' | 'avi')}
                  aria-label="Gestion de rôles"
                  className="rounded-lg border border-[#ccece2] bg-white px-2 py-1 text-xs font-extrabold text-[#092342] focus:outline-none cursor-pointer"
                >
                  <option value="admin">{isEn ? '👑 Administrator (All Roles)' : '👑 Administrateur (Tous les rôles)'}</option>
                  <option value="secretary">{isEn ? '📋 Secretary (Restricted)' : '📋 Secrétaire (Accès Restreint)'}</option>
                  <option value="avi">{isEn ? '✈️ AVI Officer (Desk & Stats)' : '✈️ Officier AVI (Guichet & Stats)'}</option>
                </select>
              </div>
            )}

            {/* Cohort Pill */}
            <div className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-[#f1f6fb] px-3 py-2 text-xs font-bold text-[#092342]">
              <Calendar className="w-3.5 h-3.5 text-[#0c685a]" />
              <span>{isEn ? '2025–2026 Intake' : 'Rentrée 2025–2026'}</span>
              <span className="text-[10px] text-slate-400">▾</span>
            </div>

            {/* Light / Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              title={
                darkMode
                  ? isEn ? 'Switch to Light mode' : 'Passer en mode clair'
                  : isEn ? 'Switch to Dark mode' : 'Passer en mode sombre'
              }
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#e6eef6] bg-[#f1f6fb] hover:bg-slate-200/70 px-3 py-2 text-xs font-extrabold text-[#092342] transition"
            >
              {darkMode ? (
                <>
                  <Sun className="w-4 h-4 text-[#f4be37]" />
                  <span className="hidden md:inline">{isEn ? 'Light' : 'Clair'}</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-[#092342]" />
                  <span className="hidden md:inline">{isEn ? 'Dark' : 'Sombre'}</span>
                </>
              )}
            </button>

            {/* Notification Bell */}
            <button
              onClick={() => setActiveTab('notifications')}
              className="relative h-9 w-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-[#092342] transition"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[#10b981] ring-2 ring-white" />
            </button>

            {/* Public Portal Button */}
            <button
              onClick={() => setActiveTab('contenus')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#092342] hover:bg-[#12365a] text-white px-3.5 py-2 text-xs font-bold shadow-xs transition"
            >
              <span>{isEn ? 'View Public Site' : 'Voir le site public'}</span>
              <ExternalLink className="w-3 h-3" />
            </button>

            {/* User Avatar Circle */}
            <button
              onClick={() => router.push('/login')}
              title={isEn ? 'Profile & Login' : 'Profil & Connexion'}
              className="h-9 w-9 rounded-full bg-[#092342] text-white flex items-center justify-center hover:opacity-90 transition shrink-0"
            >
              <User className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 p-4 sm:p-6 max-w-[1540px] w-full mx-auto">
          {loading ? (
            <div className="rounded-2xl border border-[#e6eef6] bg-white p-12 text-center space-y-3">
              <div className="h-8 w-8 rounded-full border-2 border-[#0c685a] border-t-transparent animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-500">
                {isEn
                  ? 'Loading LIEC Education PostgreSQL database...'
                  : 'Chargement des données PostgreSQL LIEC Education...'}
              </p>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <OverviewScreen
                  demandes={demandes}
                  priorityTasks={priorityTasks}
                  userName={
                    rolePreview === 'secretary' && currentUser?.role !== 'secretary'
                      ? 'Marc Kouassi'
                      : rolePreview === 'avi' && currentUser?.role !== 'avi'
                      ? 'Alain Kanza'
                      : currentUser?.name || ''
                  }
                  currentUser={currentUser}
                  onNavigate={(tab) => setActiveTab(tab as NavTab)}
                  onOpenNewDemande={() => {
                    if (rolePreview === 'avi') return;
                    setShowNewDemandeModal(true);
                  }}
                  onSelectDemande={(ref) => setSelectedDemandeRef(ref)}
                  onToggleTask={handleToggleTask}
                  onResetTasks={handleResetTasks}
                  onNotify={showToast}
                  lang={lang}
                  userRole={rolePreview}
                />
              )}

              {activeTab === 'demandes' && (
                <ErrorBoundary fallbackTitle={isEn ? 'Error loading Received Applications' : "Erreur d'affichage des Demandes reçues"} onReset={fetchWorkspace}>
                  <DemandesScreen
                  demandes={demandes}
                  demandeNotes={demandeNotes}
                  selectedRef={selectedDemandeRef}
                  onSelectRef={setSelectedDemandeRef}
                  onOpenNewDemande={() => setShowNewDemandeModal(true)}
                  onAddNote={handleAddDemandeNote}
                  onUpdateStatus={handleUpdateDemandeStatus}
                  onConvertCandidat={handleConvertDemandeToCandidat}
                  onArchiveDemande={handleArchiveDemande}
                  onRefresh={fetchWorkspace}
                  onNotify={showToast}
                  lang={lang}
                  />
                </ErrorBoundary>
              )}

              {activeTab === 'prospects' && (
                <ProspectsScreen
                  prospects={prospects}
                  onAddProspect={handleAddProspect}
                  onMoveProspect={handleMoveProspect}
                  onRefresh={fetchWorkspace}
                  onNotify={showToast}
                  lang={lang}
                />
              )}

              {activeTab === 'candidats' && (
                <ErrorBoundary
                  fallbackTitle={isEn ? 'Error loading Candidate Files' : "Erreur d'affichage des Dossiers Candidats"}
                  onReset={fetchWorkspace}
                >
                  <CandidatsScreen
                    candidats={candidats}
                    selectedRef={selectedCandidatRef}
                    onSelectRef={setSelectedCandidatRef}
                    onCreateCandidat={handleCreateCandidat}
                    onAddNote={handleAddCandidatNote}
                    onAddVoeu={handleAddCandidatVoeu}
                    onAdvanceJalon={handleAdvanceCandidatJalon}
                    onTogglePiece={handleToggleCandidatPiece}
                    onNotify={showToast}
                    lang={lang}
                    aviRequests={aviRequests}
                    accommodationRequests={accommodationRequests}
                    currentRole={rolePreview}
                    currentUser={currentUser}
                    onRefresh={fetchWorkspace}
                    onOpenAviCreation={(studentRef) => {
                      setSelectedCandidatRef(studentRef);
                      setActiveTab('services');
                    }}
                    onOpenAccommodationCreation={(studentRef) => {
                      setSelectedCandidatRef(studentRef);
                      setActiveTab('accommodation');
                    }}
                  />
                </ErrorBoundary>
              )}

              {activeTab === 'prepa' && (
                <PrepaScreen
                  cohorts={prepaCohorts}
                  onOpenNewDemande={() => setShowNewDemandeModal(true)}
                  onNotify={showToast}
                  lang={lang}
                />
              )}

              {activeTab === 'services' && (
                <ServicesAviScreen
                  aviRequests={aviRequests}
                  onCreateAvi={handleCreateAvi}
                  onNotify={showToast}
                  lang={lang}
                  currentRole={rolePreview}
                  parentStudentLinks={parentStudentLinks}
                  demandes={demandes}
                  candidats={candidats}
                />
              )}

              {activeTab === 'accommodation' && (
                <AccommodationScreen
                  accommodationRequests={accommodationRequests}
                  candidats={candidats}
                  currentRole={rolePreview}
                  currentUser={currentUser}
                  onRefresh={fetchWorkspace}
                  onSelectStudentRef={(ref) => {
                    setSelectedCandidatRef(ref);
                    setActiveTab('candidats');
                  }}
                  onNotify={showToast}
                  lang={lang}
                />
              )}

              {activeTab === 'contenus' && (
                <PublicSiteIntakeScreen
                  onSubmitWebForm={handleCreateDemande}
                  onNavigate={(tab) => setActiveTab(tab as NavTab)}
                  lang={lang}
                />
              )}

              {activeTab === 'rapports' && (
                <RapportsFinanceScreen
                  invoices={invoices}
                  currentRole={rolePreview}
                  onNotify={showToast}
                  lang={lang}
                />
              )}

              {activeTab === 'parametres' && (
                <ParametresGovernanceScreen
                  auditLogs={auditLogs}
                  dbEngine={dbEngine}
                  lang={lang}
                  currentUser={currentUser}
                  rolePreview={rolePreview}
                  users={users}
                  roles={roles}
                  onRefreshWorkspace={fetchWorkspace}
                />
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-4">
                  <h1 className="text-[28px] font-extrabold text-[#092342]">
                    {isEn ? 'Notification Center (5)' : 'Centre de Notifications (5)'}
                  </h1>
                  <div className="rounded-2xl border border-[#e6eef6] bg-white divide-y divide-slate-100 shadow-card">
                    {[
                      {
                        title: isEn
                          ? 'New DRC Qualified Lead (#DEM-2025-089)'
                          : 'Nouvelle demande qualifiée RDC (#DEM-2025-089)',
                        desc: isEn
                          ? 'Gloire Mutombo submitted application for MyDigitalSchool Lyon with verified WhatsApp.'
                          : 'Gloire Mutombo a soumis son dossier MyDigitalSchool Lyon avec WhatsApp vérifié.',
                        time: isEn ? '8 min ago' : 'Il y a 8 min',
                        tab: 'demandes',
                      },
                      {
                        title: isEn
                          ? 'PREPA Kinshasa Oral Interviews D-4'
                          : 'Entrevues orales PREPA Kinshasa J–4',
                        desc: isEn
                          ? '18 candidates scheduled for Lyon partner school admission tests.'
                          : '18 candidats convoqués aux tests d’admission scientifiques Lyon.',
                        time: isEn ? '1h ago' : 'Il y a 1h',
                        tab: 'prepa',
                      },
                      {
                        title: isEn
                          ? 'Milestone 2 In Progress: Dieudonné KABANGELE (#CAN-2025-042)'
                          : 'Jalon 2 en cours : Dieudonné KABANGELE (#CAN-2025-042)',
                        desc: isEn
                          ? 'TCF B2 (540 pts) verified. Cover letter V2 ready for review.'
                          : 'Attestation TCF B2 (540 pts) vérifiée. Lettre de motivation V2 prête pour relecture.',
                        time: isEn ? '2h ago' : 'Il y a 2h',
                        tab: 'candidats',
                      },
                      {
                        title: isEn
                          ? 'AVI Quote Sent: David Lukoki (Goma, DRC)'
                          : 'Devis AVI envoyé : David Lukoki (Goma, RDC)',
                        desc: isEn
                          ? 'Awaiting contract signature for Visa Pack + PREPA.'
                          : 'En attente de signature du contrat Pack Premium Visa + PREPA.',
                        time: isEn ? '4h ago' : 'Il y a 4h',
                        tab: 'prospects',
                      },
                      {
                        title: isEn
                          ? 'Campus France Synchronization Completed'
                          : 'Synchronisation Campus France effectuée',
                        desc: isEn
                          ? 'Etudes en France files synchronized without error.'
                          : 'Dossiers Études en France synchronisés sans erreur.',
                        time: isEn ? 'Today, 11:42' : 'Aujourd’hui, 11:42',
                        tab: 'candidats',
                      },
                    ].map((n, idx) => (
                      <div
                        key={idx}
                        onClick={() => setActiveTab(n.tab as NavTab)}
                        className="p-4 hover:bg-slate-50 cursor-pointer flex items-center justify-between gap-4"
                      >
                        <div className="space-y-0.5">
                          <div className="text-xs font-extrabold text-[#092342]">{n.title}</div>
                          <div className="text-xs text-slate-500">{n.desc}</div>
                        </div>
                        <span className="text-[11px] font-bold text-[#0c685a] shrink-0">
                          {n.time} →
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'aide' && (
                <div className="space-y-4">
                  <h1 className="text-[28px] font-extrabold text-[#092342]">
                    {isEn ? 'Help, Support & LIEC Heav’n Knowledge Base' : 'Aide, Support & Documentation LIEC Heav’n'}
                  </h1>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-[#e6eef6] bg-white p-6 shadow-card space-y-2">
                      <h3 className="text-base font-extrabold text-[#092342]">
                        {isEn ? 'LIEC Advisor User Guide' : "Guide d'utilisation Conseillers LIEC"}
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {isEn
                          ? 'Procedures for public application qualification, Campus France support, and YIMMILINE AVI financing simulations (€150 LIEC cut).'
                          : "Retrouvez les procédures de qualification des demandes publiques, d'accompagnement Campus France et de simulation des offres AVI YIMMILINE (150 € LIEC)."}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-[#e6eef6] bg-white p-6 shadow-card space-y-2">
                      <h3 className="text-base font-extrabold text-[#092342]">
                        {isEn ? 'Technical Support & PostgreSQL Engine' : 'Support Technique & Base PostgreSQL'}
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {isEn
                          ? `Relational database active (${dbEngine}). To configure an external production PostgreSQL instance, set DATABASE_URL in .env.local.`
                          : `Base de données relationnelle active (${dbEngine}). Pour configurer une instance PostgreSQL externe, renseignez DATABASE_URL dans .env.local.`}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Modal: New Application - Accessible only by Admin & Secretary */}
      {showNewDemandeModal && (rolePreview === 'admin' || rolePreview === 'secretary' || userRole === 'admin' || userRole === 'secretary') && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-elevated border border-slate-100 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-[#092342]">
                  {isEn ? 'Record a New Student Application' : 'Enregistrer une Nouvelle Demande'}
                </h3>
                <p className="text-xs text-slate-500">
                  {isEn
                    ? 'Direct lead creation into the LIEC Education PostgreSQL database with parent linkage.'
                    : 'Création directe d’un lead dans la base PostgreSQL LIEC Education avec rattachement parent.'}
                </p>
              </div>
              <button
                onClick={() => setShowNewDemandeModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleNewDemandeSubmit} className="space-y-4 text-xs">
              {/* Candidate Personal Details */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#0c685a] block">
                  {isEn ? '1. Candidate Information' : '1. Informations du Candidat'}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      {isEn ? 'Candidate Full Name *' : 'Nom complet du candidat *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={newDemName}
                      onChange={(e) => setNewDemName(e.target.value)}
                      placeholder="Ex: Cédric Ilunga"
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
                      value={newDemEmail}
                      onChange={(e) => setNewDemEmail(e.target.value)}
                      placeholder="cedric.ilunga@gmail.com"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span>{isEn ? 'Phone / WhatsApp *' : 'Téléphone / WhatsApp *'}</span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        {newDemPhone.replace(/\D/g, '').length}/14 {isEn ? 'digits max' : 'chiffres max'}
                      </span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={newDemPhone}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val.replace(/\D/g, '').length <= 14) {
                          setNewDemPhone(val);
                        }
                      }}
                      maxLength={18}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      {isEn ? 'Recruitment Country *' : 'Pays de recrutement *'}
                    </label>
                    <select
                      value={newDemCountry}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewDemCountry(val);
                        setNewDemCity(val === 'RDC' ? 'Kinshasa' : 'Brazzaville');
                        setNewDemPhone(val === 'RDC' ? '+243 ' : '+242 ');
                      }}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 bg-white font-semibold"
                    >
                      <option value="RDC">🇨🇩 RDC (Kinshasa / Lubumbashi / Goma)</option>
                      <option value="Congo-Brazzaville">
                        🇨🇬 Congo-Brazzaville (Brazzaville / Pointe-Noire)
                      </option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      {isEn ? 'City of Origin' : "Ville d'origine"}
                    </label>
                    <select
                      value={newDemCity}
                      onChange={(e) => setNewDemCity(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 bg-white"
                    >
                      {newDemCountry === 'RDC' ? (
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
                      {isEn ? 'Study Destination' : "Destination d'études"}
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={isEn ? 'Lyon (Exclusive Destination)' : 'Lyon (Exclusivement)'}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-extrabold text-[#0c685a]"
                    />
                  </div>
                </div>
              </div>

              {/* Parent & Family Information Section (Requirements 1 & 2) */}
              <div className="pt-2 border-t border-slate-100 space-y-2.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#0c685a] block">
                  {isEn ? '2. Parent & Family Information' : '2. Informations du Parent & Famille'}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      {isEn ? 'Parent Full Name' : 'Nom complet du parent'}
                    </label>
                    <input
                      type="text"
                      list="existing-parents-new-demande"
                      value={newDemParentName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewDemParentName(val);
                        const matched = parentStudentLinks.filter(
                          (l) => l.parent_name.toLowerCase().trim() === val.toLowerCase().trim()
                        );
                        if (matched.length === 1) {
                          if (!newDemName || newDemName === '') {
                            setNewDemName(matched[0].student_name);
                          }
                          if (matched[0].parent_phone && (!newDemParentPhone || newDemParentPhone === '')) {
                            setNewDemParentPhone(matched[0].parent_phone);
                          }
                        }
                      }}
                      placeholder={isEn ? 'e.g. Jean-Pierre Kabangele' : 'Ex: Jean-Pierre Kabangele'}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 font-semibold"
                    />
                    <datalist id="existing-parents-new-demande">
                      {Array.from(new Set(parentStudentLinks.map((l) => l.parent_name))).map((pName) => (
                        <option key={pName} value={pName} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span>{isEn ? 'Parent Phone Number' : 'Téléphone du parent'}</span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        {newDemParentPhone.replace(/\D/g, '').length}/14 {isEn ? 'digits max' : 'chiffres max'}
                      </span>
                    </label>
                    <input
                      type="tel"
                      value={newDemParentPhone}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val.replace(/\D/g, '').length <= 14) {
                          setNewDemParentPhone(val);
                        }
                      }}
                      placeholder="+243 81 900 1234"
                      maxLength={18}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5"
                    />
                  </div>
                </div>
                {/* Multiple linked students selector */}
                {newDemParentName.trim() &&
                  parentStudentLinks.filter(
                    (l) => l.parent_name.toLowerCase().trim() === newDemParentName.toLowerCase().trim()
                  ).length > 1 && (
                    <div className="rounded-xl bg-teal-50 border border-teal-200 p-2.5 text-xs text-[#064e3b] space-y-1.5">
                      <span className="font-bold block">
                        {isEn
                          ? `Select applicant linked to ${newDemParentName}:`
                          : `Sélectionner le candidat lié à ${newDemParentName} :`}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {parentStudentLinks
                          .filter(
                            (l) =>
                              l.parent_name.toLowerCase().trim() === newDemParentName.toLowerCase().trim()
                          )
                          .map((l, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                setNewDemName(l.student_name);
                                if (l.parent_phone) setNewDemParentPhone(l.parent_phone);
                              }}
                              className={`px-2.5 py-1 rounded-lg border font-bold text-[11px] transition ${
                                newDemName === l.student_name
                                  ? 'bg-[#0c6358] text-white border-[#0c6358]'
                                  : 'bg-white text-[#092342] border-teal-200 hover:bg-teal-100'
                              }`}
                            >
                              ✓ {l.student_name} ({l.student_program || 'Dossier'})
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
              </div>

              {/* Academic Background & Activity Section (Requirements 1 & 2) */}
              <div className="pt-2 border-t border-slate-100 space-y-2.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#0c685a] block">
                  {isEn ? '3. Academic Background & Activity' : '3. Parcours Académique & Activité'}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      {isEn ? 'Year of Graduation' : 'Année d’obtention diplôme'}
                    </label>
                    <select
                      value={newDemGraduationYear}
                      onChange={(e) => setNewDemGraduationYear(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 bg-white font-semibold"
                    >
                      {[2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010].map((yr) => (
                        <option key={yr} value={String(yr)}>
                          {yr}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span>{isEn ? 'Current Activity' : 'Activité actuelle'}</span>
                      <span className="text-[10px] text-slate-400 font-normal">{newDemCurrentActivity.length}/25</span>
                    </label>
                    <input
                      type="text"
                      maxLength={25}
                      value={newDemCurrentActivity}
                      onChange={(e) => setNewDemCurrentActivity(e.target.value.slice(0, 25))}
                      placeholder={isEn ? 'e.g. Student / Intern' : 'Ex: Étudiant / Stagiaire'}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span>{isEn ? 'Final Year Univ.' : 'Dernière année univ.'}</span>
                      <span className="text-[10px] text-slate-400 font-normal">max 4 {isEn ? 'digits' : 'chiffres'}</span>
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      value={newDemFinalYearUni}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                        setNewDemFinalYearUni(val);
                      }}
                      placeholder="2024"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Program & Budget */}
              <div className="pt-2 border-t border-slate-100 space-y-2.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#0c685a] block">
                  {isEn ? '4. Partner School & Budget' : '4. École Partenaire & Budget'}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      {isEn ? 'Partner School in Lyon *' : 'École Partenaire à Lyon *'}
                    </label>
                    <select
                      value={newDemProgram}
                      onChange={(e) => {
                        setNewDemProgram(e.target.value);
                        setNewDemPole(`PREPA / ${e.target.value.split('—')[0]?.trim()}`);
                      }}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 bg-white font-semibold"
                    >
                      <option value="ISCOM Lyon — Communication, Publicité & Marketing">
                        1. ISCOM Lyon (Communication, marketing & events)
                      </option>
                      <option value="MyDigitalSchool Lyon — Dév. Web & UX/UI">
                        2. MyDigitalSchool Lyon (Web dev, digital & UX/UI)
                      </option>
                      <option value="École Internationale Tunon Lyon — Tourisme & Hôtellerie">
                        3. École Internationale Tunon Lyon (Tourism, hospitality & PR)
                      </option>
                      <option value="IHECF Lyon — Comptabilité, Finance & Audit">
                        4. IHECF Lyon (Accounting, finance & audit)
                      </option>
                      <option value="Ipac Bachelor Factory Lyon — Commerce & Logistique">
                        5. Ipac Bachelor Factory Lyon (Commerce, management & logistics)
                      </option>
                      <option value="MBway Lyon — Management & Commerce International">
                        6. MBway Lyon (Management, entrepreneurship & HR)
                      </option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      {isEn ? 'Guaranteed Annual Budget' : 'Budget annuel garanti'}
                    </label>
                    <input
                      type="text"
                      value={newDemBudget}
                      onChange={(e) => setNewDemBudget(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewDemandeModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  {isEn ? 'Cancel' : 'Annuler'}
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#0c6358] hover:bg-[#094e45] text-white px-5 py-2 font-extrabold shadow-sm transition"
                >
                  {isEn ? 'Create Application' : 'Créer la demande'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm rounded-2xl bg-[#092342] text-white px-4 py-3 text-xs font-bold shadow-elevated border border-white/10 flex items-center gap-2.5">
          <span className="h-2 w-2 rounded-full bg-[#2dd4bf] shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
