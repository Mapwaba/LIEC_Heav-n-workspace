/**
 * LIEC Heav'n — Multi-Partner AVI Financing Desk & Commercial Catalog
 * 
 * Supports:
 * - Partner 1: YIMMILINE (Preserved, with €7,380 cap removed)
 * - Partner 2: TrustAVI SAS (Normal AVI, Pre-financing with contribution, Pre-financing without contribution)
 */

export interface TrustAVIOfferSnapshot {
  partner_id: 'trustavi';
  partner_name: 'TrustAVI SAS';
  offer_key: 'normal_avi' | 'prefinancing_with_contribution' | 'prefinancing_without_contribution';
  offer_name: string;
  offer_version: string;
  partner_total_eur: number;
  blocked_amount_eur: number | null;
  student_contribution_eur: number;
  production_fees_eur: number | null;
  transfer_fees_eur: number | null;
  prefinancing_fees_eur: number | null;
  liec_commission_eur: number;
  parent_deposit_eur: number;
  net_payable_to_trustavi_eur: number;
  fee_breakdown_specified: boolean;
  subline_fee_breakdown?: {
    production_and_issuance_eur?: number;
    transfer_fees_eur?: number;
    prefinancing_fees_eur?: number;
  } | 'UNSPECIFIED_BY_PARTNER' | 'NOT_SPECIFIED_BY_PARTNER';
  drc_guarantor_accepted: boolean;
  deposit_reference?: string;
  deposit_payment_date?: string;
  deposit_evidence_key?: string;
  responsible_staff?: string;
  snapshot_timestamp: string;
}

export interface YimmilineOfferSnapshot {
  partner_id: 'yimmiline';
  partner_name: 'YIMMILINE';
  offer_key: string;
  offer_name: string;
  offer_version: string;
  principal_eur: number;
  interest_rate: number;
  duration_months: number;
  total_interest_eur: number;
  liec_commission_eur: number;
  net_partner_interest_eur: number;
  snapshot_timestamp: string;
}

export type AviFinancialSnapshot = TrustAVIOfferSnapshot | YimmilineOfferSnapshot;

export const TRUSTAVI_OFFERS = {
  normal_avi: {
    offer_key: 'normal_avi' as const,
    offer_name: 'Normal AVI',
    offer_name_fr: 'AVI Normale',
    partner_total_eur: 11260,
    blocked_amount_eur: 10800,
    student_contribution_eur: 0,
    production_fees_eur: 460,
    transfer_fees_eur: 0,
    prefinancing_fees_eur: 0,
    liec_commission_eur: 115,
    parent_deposit_eur: 11260,
    net_payable_to_trustavi_eur: 11145,
    fee_breakdown_specified: true,
    drc_guarantor_accepted: true,
  },
  prefinancing_with_contribution: {
    offer_key: 'prefinancing_with_contribution' as const,
    offer_name: 'Pre-financing with student contribution',
    offer_name_fr: 'Préfinancement avec apport étudiant',
    partner_total_eur: 4185,
    blocked_amount_eur: null,
    student_contribution_eur: 2700,
    production_fees_eur: 460,
    transfer_fees_eur: 293,
    prefinancing_fees_eur: 732,
    liec_commission_eur: 300,
    parent_deposit_eur: 4185,
    net_payable_to_trustavi_eur: 3885,
    fee_breakdown_specified: true,
    drc_guarantor_accepted: true,
  },
  prefinancing_without_contribution: {
    offer_key: 'prefinancing_without_contribution' as const,
    offer_name: 'Pre-financing without student contribution',
    offer_name_fr: 'Préfinancement sans apport étudiant',
    partner_total_eur: 1500,
    blocked_amount_eur: null,
    student_contribution_eur: 0,
    production_fees_eur: null,
    transfer_fees_eur: null,
    prefinancing_fees_eur: null,
    liec_commission_eur: 300,
    parent_deposit_eur: 1500,
    net_payable_to_trustavi_eur: 1200,
    fee_breakdown_specified: false, // NOT SPECIFIED BY PARTNER (never invent)
    drc_guarantor_accepted: true,
  },
} as const;

export interface TrustAviChecklistItem {
  id: string;
  label_en: string;
  label_fr: string;
  category: 'student' | 'guarantor';
  type: 'document' | 'field';
  file_key?: string | null;
  file_name?: string | null;
  field_value?: string | null;
  status: 'MISSING' | 'SUBMITTED' | 'VERIFIED' | 'REJECTED';
  verified_by?: string | null;
  verified_at?: string | null;
  notes?: string | null;
}

export const TRUSTAVI_MANDATORY_CHECKLIST_DEFINITIONS: Array<{
  id: string;
  label_en: string;
  label_fr: string;
  category: 'student' | 'guarantor';
  type: 'document' | 'field';
}> = [
  {
    id: 'student_prior_enrollment_agreement',
    label_en: 'Prior Campus France Enrollment Agreement (Accord préalable d’inscription)',
    label_fr: 'Accord préalable d’inscription Campus France',
    category: 'student',
    type: 'document',
  },
  {
    id: 'student_passport_copy',
    label_en: 'Student Passport Copy',
    label_fr: 'Copie du Passeport de l’étudiant',
    category: 'student',
    type: 'document',
  },
  {
    id: 'student_national_id_copy',
    label_en: 'Student National Identity Card Copy',
    label_fr: 'Copie de la Carte Nationale d’Identité de l’étudiant',
    category: 'student',
    type: 'document',
  },
  {
    id: 'student_phone_number',
    label_en: 'Student Telephone Number',
    label_fr: 'Numéro de téléphone de l’étudiant',
    category: 'student',
    type: 'field',
  },
  {
    id: 'student_email_address',
    label_en: 'Student Email Address',
    label_fr: 'Adresse email de l’étudiant',
    category: 'student',
    type: 'field',
  },
  {
    id: 'guarantor_identity_document',
    label_en: 'Guarantor Identity Document Copy',
    label_fr: 'Copie de la pièce d’identité du garant',
    category: 'guarantor',
    type: 'document',
  },
  {
    id: 'guarantor_phone_number',
    label_en: 'Guarantor Telephone Number',
    label_fr: 'Numéro de téléphone du garant',
    category: 'guarantor',
    type: 'field',
  },
  {
    id: 'guarantor_email_address',
    label_en: 'Guarantor Email Address',
    label_fr: 'Adresse email du garant',
    category: 'guarantor',
    type: 'field',
  },
];

export function buildTrustAviFinancialSnapshot(params: {
  offerKey: keyof typeof TRUSTAVI_OFFERS;
  depositReference?: string;
  depositPaymentDate?: string;
  depositEvidenceKey?: string;
  responsibleStaff?: string;
}): TrustAVIOfferSnapshot {
  const offer = TRUSTAVI_OFFERS[params.offerKey];
  if (!offer) {
    throw new Error(`Invalid TrustAVI offer key: ${params.offerKey}`);
  }

  return {
    partner_id: 'trustavi',
    partner_name: 'TrustAVI SAS',
    offer_key: offer.offer_key,
    offer_name: offer.offer_name,
    offer_version: 'v1',
    partner_total_eur: offer.partner_total_eur,
    blocked_amount_eur: offer.blocked_amount_eur,
    student_contribution_eur: offer.student_contribution_eur,
    production_fees_eur: offer.production_fees_eur,
    transfer_fees_eur: offer.transfer_fees_eur,
    prefinancing_fees_eur: offer.prefinancing_fees_eur,
    liec_commission_eur: offer.liec_commission_eur,
    parent_deposit_eur: offer.parent_deposit_eur,
    net_payable_to_trustavi_eur: offer.net_payable_to_trustavi_eur,
    fee_breakdown_specified: offer.fee_breakdown_specified,
    subline_fee_breakdown: offer.fee_breakdown_specified
      ? {
          production_and_issuance_eur: offer.production_fees_eur ?? undefined,
          transfer_fees_eur: offer.transfer_fees_eur ?? undefined,
          prefinancing_fees_eur: offer.prefinancing_fees_eur ?? undefined,
        }
      : 'UNSPECIFIED_BY_PARTNER',
    drc_guarantor_accepted: true,
    deposit_reference: params.depositReference,
    deposit_payment_date: params.depositPaymentDate,
    deposit_evidence_key: params.depositEvidenceKey,
    responsible_staff: params.responsibleStaff,
    snapshot_timestamp: new Date().toISOString(),
  };
}

export function validateTrustAviChecklist(items: TrustAviChecklistItem[]): {
  valid: boolean;
  missingItems: string[];
} {
  const missing: string[] = [];
  for (const def of TRUSTAVI_MANDATORY_CHECKLIST_DEFINITIONS) {
    const item = items.find((i) => i.id === def.id);
    if (!item) {
      missing.push(def.label_en);
      continue;
    }
    if (def.type === 'document' && (!item.file_key || item.status === 'MISSING')) {
      missing.push(def.label_en);
    } else if (def.type === 'field' && (!item.field_value || item.field_value.trim() === '')) {
      missing.push(def.label_en);
    }
  }

  return {
    valid: missing.length === 0,
    missingItems: missing,
  };
}
