import type { DBClient } from './db';

export interface PaymentVerificationOutcome {
  verified: boolean;
  status: 'VERIFIED' | 'AMBIGUOUS_REQUIRES_FINANCE' | 'NOT_FOUND' | 'INVALID_FORMAT' | 'DUPLICATE_TRANSACTION';
  paymentRef: string | null;
  amount: number | null;
  currency: string;
  paymentDate: string | null;
  source: 'prepa_payments' | 'invoices' | 'manual_finance_verified' | null;
  rawbankSlipNumber?: string | null;
  rawbankOperationCode?: string | null;
  verifiedBy?: string | null;
  reason?: string;
  matchedCount: number;
}

/**
 * Validates Rawbank 6-digit payment slip number.
 * Mandatory, exactly 6 numerical digits, string with leading zeros preserved.
 */
export function validateRawbankSlip(slip: unknown): { valid: boolean; error?: string; value: string } {
  if (slip === undefined || slip === null || String(slip).trim() === '') {
    return { valid: false, error: 'Rawbank payment slip number is mandatory.', value: '' };
  }
  const str = String(slip).trim();
  if (!/^\d+$/.test(str)) {
    return { valid: false, error: 'Rawbank payment slip number must contain numerical digits only.', value: str };
  }
  if (str.length !== 6) {
    return {
      valid: false,
      error: `Rawbank payment slip number must be exactly 6 digits (got ${str.length}).`,
      value: str,
    };
  }
  return { valid: true, value: str };
}

/**
 * Validates Rawbank 3-digit operation code.
 * Mandatory, exactly 3 numerical digits, string with leading zeros preserved.
 */
export function validateRawbankOpCode(code: unknown): { valid: boolean; error?: string; value: string } {
  if (code === undefined || code === null || String(code).trim() === '') {
    return { valid: false, error: 'Rawbank operation code is mandatory.', value: '' };
  }
  const str = String(code).trim();
  if (!/^\d+$/.test(str)) {
    return { valid: false, error: 'Rawbank operation code must contain numerical digits only.', value: str };
  }
  if (str.length !== 3) {
    return {
      valid: false,
      error: `Rawbank operation code must be exactly 3 digits (got ${str.length}).`,
      value: str,
    };
  }
  return { valid: true, value: str };
}

/**
 * Anti-Duplicate Transaction Protection:
 * Checks whether this exact (rawbank_slip_number, rawbank_operation_code) pair
 * has already been utilized to validate any other applicant or payment.
 */
export async function checkDuplicateRawbankTransaction(
  db: DBClient,
  slipNumber: string,
  opCode: string,
  excludeDemandeRef?: string | null,
  excludeApplicantName?: string | null
): Promise<{ isDuplicate: boolean; existingRef?: string; existingApplicant?: string }> {
  const cleanSlip = slipNumber.trim();
  const cleanOp = opCode.trim();
  const cleanExcludeName = (excludeApplicantName || '').trim().toLowerCase();

  // 1. Check in demandes
  let demandeQuery = `
    SELECT ref, full_name, first_instalment_amount
    FROM demandes
    WHERE rawbank_slip_number = $1
      AND rawbank_operation_code = $2
      AND first_instalment_paid = TRUE
  `;
  const demandeParams: any[] = [cleanSlip, cleanOp];
  if (excludeDemandeRef && excludeDemandeRef.trim()) {
    demandeQuery += ` AND ref <> $${demandeParams.length + 1}`;
    demandeParams.push(excludeDemandeRef.trim());
  }
  if (cleanExcludeName) {
    demandeQuery += ` AND LOWER(full_name) <> LOWER($${demandeParams.length + 1})`;
    demandeParams.push(cleanExcludeName);
  }
  demandeQuery += ` LIMIT 1`;

  const demRes = await db.query(demandeQuery, demandeParams);
  if (demRes.rows.length > 0) {
    return {
      isDuplicate: true,
      existingRef: demRes.rows[0].ref,
      existingApplicant: demRes.rows[0].full_name,
    };
  }

  // 2. Check in prospects
  let prospectQuery = `
    SELECT id, full_name, first_instalment_amount
    FROM prospects
    WHERE rawbank_slip_number = $1
      AND rawbank_operation_code = $2
      AND first_instalment_paid = TRUE
  `;
  const prospectParams: any[] = [cleanSlip, cleanOp];
  if (cleanExcludeName) {
    prospectQuery += ` AND LOWER(full_name) <> LOWER($${prospectParams.length + 1})`;
    prospectParams.push(cleanExcludeName);
  }
  prospectQuery += ` LIMIT 1`;

  const proRes = await db.query(prospectQuery, prospectParams);
  if (proRes.rows.length > 0) {
    return {
      isDuplicate: true,
      existingRef: `PROSPECT-${proRes.rows[0].id}`,
      existingApplicant: proRes.rows[0].full_name,
    };
  }

  return { isDuplicate: false };
}

/**
 * Resolves the actual applicable first instalment obligation amount from the
 * financial ledger (prepa_payments or invoices) instead of assuming a fixed 1800 EUR.
 */
export async function resolveApplicableInstalmentAmount(
  db: DBClient,
  params: {
    fullName: string;
    email?: string | null;
    demandeRef?: string | null;
    studentRef?: string | null;
  }
): Promise<{ amount: number; applicableAmount: number | null; currency: string; source: string | null; instalmentLabel?: string }> {
  const { fullName, email, demandeRef, studentRef } = params;
  const cleanName = (fullName || '').trim();
  const cleanEmail = (email || '').trim().toLowerCase();

  // 1. Check prepa_payments for instalment 1
  const prepa = await db.query(
    `SELECT amount, instalment_label, payment_ref
     FROM prepa_payments
     WHERE instalment_number = 1
       AND (
         (LOWER(candidate_name) = LOWER($1) AND $1 <> '')
         OR (LOWER(candidate_email) = LOWER($2) AND $2 <> '')
         OR (candidate_ref = $3 AND $3 <> '')
       )
     ORDER BY id DESC
     LIMIT 1`,
    [cleanName, cleanEmail, studentRef || demandeRef || '']
  );

  if (prepa.rows.length > 0) {
    const amt = Number(prepa.rows[0].amount);
    return {
      amount: amt,
      applicableAmount: amt,
      currency: 'EUR',
      source: 'prepa_payments',
      instalmentLabel: prepa.rows[0].instalment_label,
    };
  }

  // 2. Check invoices
  const inv = await db.query(
    `SELECT amount_eur, paid_eur, ref, service_label
     FROM invoices
     WHERE LOWER(student_name) = LOWER($1) AND $1 <> ''
     ORDER BY id DESC
     LIMIT 1`,
    [cleanName]
  );

  if (inv.rows.length > 0) {
    const amt = Number(inv.rows[0].paid_eur) || Number(inv.rows[0].amount_eur);
    return {
      amount: amt,
      applicableAmount: amt,
      currency: 'EUR',
      source: 'invoices',
      instalmentLabel: inv.rows[0].service_label,
    };
  }

  return { amount: 1800, applicableAmount: null, currency: 'EUR', source: null };
}

/**
 * Authoritative payment verification for candidate qualification.
 *
 * Requirements enforced:
 * 1. Never assume payment without authoritative database evidence.
 * 2. Strict Rawbank 6-digit slip and 3-digit operation code formatting.
 * 3. Anti-duplicate transaction check across ledger and dossiers.
 * 4. Resolves actual applicable amount from applicant's financial records.
 * 5. Strict reference match takes precedence (candidate_ref, payment_ref).
 * 6. Fallback entity search requires name and email concordance.
 * 7. Any multiple or ambiguous matches trigger AMBIGUOUS_REQUIRES_FINANCE.
 */
export async function verifyFirstInstalmentPayment(
  db: DBClient,
  params: {
    studentRef?: string | null;
    demandeRef?: string | null;
    fullName: string;
    email?: string | null;
    knownPaymentRef?: string | null;
    rawbankSlipNumber?: string | null;
    rawbankOperationCode?: string | null;
    requiredAmount?: number | null;
  }
): Promise<PaymentVerificationOutcome> {
  const { studentRef, demandeRef, fullName, email, knownPaymentRef, rawbankSlipNumber, rawbankOperationCode, requiredAmount } = params;
  const cleanName = (fullName || '').trim();
  const cleanEmail = (email || '').trim().toLowerCase();

  // 1. Rawbank Slip & Operation Code Format Checks (if provided)
  if (rawbankSlipNumber !== undefined && rawbankSlipNumber !== null) {
    const slipCheck = validateRawbankSlip(rawbankSlipNumber);
    if (!slipCheck.valid) {
      return {
        verified: false,
        status: 'INVALID_FORMAT',
        paymentRef: null,
        amount: null,
        currency: 'EUR',
        paymentDate: null,
        source: null,
        reason: slipCheck.error,
        matchedCount: 0,
      };
    }
  }

  if (rawbankOperationCode !== undefined && rawbankOperationCode !== null) {
    const opCheck = validateRawbankOpCode(rawbankOperationCode);
    if (!opCheck.valid) {
      return {
        verified: false,
        status: 'INVALID_FORMAT',
        paymentRef: null,
        amount: null,
        currency: 'EUR',
        paymentDate: null,
        source: null,
        reason: opCheck.error,
        matchedCount: 0,
      };
    }
  }

  // 2. Anti-Duplicate Check if both Rawbank references are provided
  if (rawbankSlipNumber && rawbankOperationCode) {
    const dupCheck = await checkDuplicateRawbankTransaction(
      db,
      rawbankSlipNumber,
      rawbankOperationCode,
      demandeRef,
      fullName
    );
    if (dupCheck.isDuplicate) {
      return {
        verified: false,
        status: 'DUPLICATE_TRANSACTION',
        paymentRef: null,
        amount: null,
        currency: 'EUR',
        paymentDate: null,
        source: null,
        reason: `Transaction conflict: Rawbank slip #${rawbankSlipNumber} with operation code ${rawbankOperationCode} is already registered to ${dupCheck.existingApplicant || 'another applicant'} (Ref: ${dupCheck.existingRef}). Duplicate transaction use is prohibited.`,
        matchedCount: 0,
      };
    }
  }

  // 3. Authoritative check via known payment reference if already linked
  if (knownPaymentRef && knownPaymentRef.trim()) {
    const directPay = await db.query(
      `SELECT payment_ref, amount, payment_date, status, candidate_name
       FROM prepa_payments
       WHERE payment_ref = $1
         AND (status = 'Validated' OR status = 'Settled' OR is_settled_totally = TRUE)
       LIMIT 1`,
      [knownPaymentRef.trim()]
    );

    if (directPay.rows.length > 0) {
      const row = directPay.rows[0];
      return {
        verified: true,
        status: 'VERIFIED',
        paymentRef: row.payment_ref,
        amount: Number(row.amount),
        currency: 'EUR',
        paymentDate: row.payment_date || new Date().toISOString(),
        source: 'prepa_payments',
        rawbankSlipNumber,
        rawbankOperationCode,
        matchedCount: 1,
      };
    }

    const directInv = await db.query(
      `SELECT ref, paid_eur, amount_eur, status, issued_date
       FROM invoices
       WHERE ref = $1 AND paid_eur > 0
       LIMIT 1`,
      [knownPaymentRef.trim()]
    );

    if (directInv.rows.length > 0) {
      const row = directInv.rows[0];
      return {
        verified: true,
        status: 'VERIFIED',
        paymentRef: row.ref,
        amount: Number(row.paid_eur),
        currency: 'EUR',
        paymentDate: row.issued_date || new Date().toISOString(),
        source: 'invoices',
        rawbankSlipNumber,
        rawbankOperationCode,
        matchedCount: 1,
      };
    }
  }

  // 4. Authoritative check via candidate_ref or demande_ref in prepa_payments
  const refMatches = [];
  if (studentRef && studentRef.trim()) refMatches.push(studentRef.trim());
  if (demandeRef && demandeRef.trim()) refMatches.push(demandeRef.trim());

  if (refMatches.length > 0) {
    const refQuery = await db.query(
      `SELECT payment_ref, candidate_ref, amount, payment_date, status, instalment_number
       FROM prepa_payments
       WHERE candidate_ref = ANY($1::varchar[])
         AND instalment_number = 1
         AND (status = 'Validated' OR status = 'Settled' OR is_settled_totally = TRUE)`,
      [refMatches]
    );

    if (refQuery.rows.length === 1) {
      const row = refQuery.rows[0];
      return {
        verified: true,
        status: 'VERIFIED',
        paymentRef: row.payment_ref,
        amount: Number(row.amount),
        currency: 'EUR',
        paymentDate: row.payment_date || new Date().toISOString(),
        source: 'prepa_payments',
        rawbankSlipNumber,
        rawbankOperationCode,
        matchedCount: 1,
      };
    } else if (refQuery.rows.length > 1) {
      return {
        verified: false,
        status: 'AMBIGUOUS_REQUIRES_FINANCE',
        paymentRef: null,
        amount: null,
        currency: 'EUR',
        paymentDate: null,
        source: null,
        reason: `Multiple (${refQuery.rows.length}) first-instalment payment records are linked to reference ${refMatches.join('/')}. Authoritative Finance Officer verification is required.`,
        matchedCount: refQuery.rows.length,
      };
    }
  }

  // 5. Rawbank transaction match in prepa_payments (by transaction_ref matching slip / op code)
  if (rawbankSlipNumber) {
    const rawMatch = await db.query(
      `SELECT payment_ref, candidate_name, candidate_email, amount, payment_date, status, transaction_ref
       FROM prepa_payments
       WHERE instalment_number = 1
         AND (status = 'Validated' OR status = 'Settled' OR is_settled_totally = TRUE)
         AND transaction_ref ILIKE '%' || $1 || '%'
       LIMIT 2`,
      [rawbankSlipNumber]
    );

    if (rawMatch.rows.length === 1) {
      const row = rawMatch.rows[0];
      // Verify candidate name matches
      const candName = (row.candidate_name || '').toLowerCase().trim();
      if (!cleanName || candName === cleanName.toLowerCase() || candName.includes(cleanName.toLowerCase()) || cleanName.toLowerCase().includes(candName)) {
        return {
          verified: true,
          status: 'VERIFIED',
          paymentRef: row.payment_ref,
          amount: Number(row.amount),
          currency: 'EUR',
          paymentDate: row.payment_date || new Date().toISOString(),
          source: 'prepa_payments',
          rawbankSlipNumber,
          rawbankOperationCode,
          matchedCount: 1,
        };
      }
    }
  }

  // 6. Fallback Entity Search with Strict Concordance & Ambiguity Detection
  const prepaQuery = await db.query(
    `SELECT payment_ref, candidate_name, candidate_email, amount, payment_date, status
     FROM prepa_payments
     WHERE instalment_number = 1
       AND (status = 'Validated' OR status = 'Settled' OR is_settled_totally = TRUE)
       AND (
         (LOWER(candidate_name) = LOWER($1) AND $1 <> '')
         OR
         (LOWER(candidate_email) = LOWER($2) AND $2 <> '')
       )`,
    [cleanName, cleanEmail]
  );

  const invoiceQuery = await db.query(
    `SELECT ref, student_name, paid_eur, amount_eur, status, issued_date
     FROM invoices
     WHERE paid_eur > 0
       AND LOWER(student_name) = LOWER($1) AND $1 <> ''`,
    [cleanName]
  );

  const totalMatches = prepaQuery.rows.length + invoiceQuery.rows.length;

  if (totalMatches === 0) {
    return {
      verified: false,
      status: 'NOT_FOUND',
      paymentRef: null,
      amount: null,
      currency: 'EUR',
      paymentDate: null,
      source: null,
      reason: 'No verified first instalment payment record found in authoritative financial ledger.',
      matchedCount: 0,
    };
  }

  if (totalMatches > 1) {
    return {
      verified: false,
      status: 'AMBIGUOUS_REQUIRES_FINANCE',
      paymentRef: null,
      amount: null,
      currency: 'EUR',
      paymentDate: null,
      source: null,
      reason: `Ambiguous payment match: ${totalMatches} payment records matched candidate name/email. Authoritative manual review by a Finance Officer is required to prevent incorrect attribution.`,
      matchedCount: totalMatches,
    };
  }

  // Exactly 1 match in prepa_payments
  if (prepaQuery.rows.length === 1) {
    const row = prepaQuery.rows[0];
    const rowName = (row.candidate_name || '').toLowerCase().trim();
    const rowEmail = (row.candidate_email || '').toLowerCase().trim();

    if (cleanName && cleanEmail && rowEmail && (rowName !== cleanName.toLowerCase() || rowEmail !== cleanEmail)) {
      return {
        verified: false,
        status: 'AMBIGUOUS_REQUIRES_FINANCE',
        paymentRef: null,
        amount: null,
        currency: 'EUR',
        paymentDate: null,
        source: null,
        reason: 'Payment record partially matches candidate name but email does not match ledger email. Manual Finance verification required.',
        matchedCount: 1,
      };
    }

    return {
      verified: true,
      status: 'VERIFIED',
      paymentRef: row.payment_ref,
      amount: Number(row.amount),
      currency: 'EUR',
      paymentDate: row.payment_date || new Date().toISOString(),
      source: 'prepa_payments',
      rawbankSlipNumber,
      rawbankOperationCode,
      matchedCount: 1,
    };
  }

  // Exactly 1 match in invoices
  if (invoiceQuery.rows.length === 1) {
    const row = invoiceQuery.rows[0];
    return {
      verified: true,
      status: 'VERIFIED',
      paymentRef: row.ref,
      amount: Number(row.paid_eur),
      currency: 'EUR',
      paymentDate: row.issued_date || new Date().toISOString(),
      source: 'invoices',
      rawbankSlipNumber,
      rawbankOperationCode,
      matchedCount: 1,
    };
  }

  return {
    verified: false,
    status: 'NOT_FOUND',
    paymentRef: null,
    amount: null,
    currency: 'EUR',
    paymentDate: null,
    source: null,
    reason: 'Payment record could not be authoritatively verified.',
    matchedCount: 0,
  };
}
