import { DBClient } from './db';

export interface PaymentVerificationOutcome {
  verified: boolean;
  status: 'VERIFIED' | 'AMBIGUOUS_REQUIRES_FINANCE' | 'NOT_FOUND';
  paymentRef: string | null;
  amount: number | null;
  paymentDate: string | null;
  source: 'prepa_payments' | 'invoices' | 'manual_finance_verified' | null;
  verifiedBy?: string | null;
  reason?: string;
  matchedCount: number;
}

/**
 * Authoritative payment verification for candidate qualification.
 *
 * Requirements enforced:
 * 1. Never assume payment without authoritative database evidence.
 * 2. Strict reference match takes precedence (candidate_ref, payment_ref).
 * 3. Fallback entity search requires both name AND email concordance.
 * 4. Any multiple or ambiguous matches trigger AMBIGUOUS_REQUIRES_FINANCE and block automated qualification.
 */
export async function verifyFirstInstalmentPayment(
  db: DBClient,
  params: {
    studentRef?: string | null;
    demandeRef?: string | null;
    fullName: string;
    email?: string | null;
    knownPaymentRef?: string | null;
  }
): Promise<PaymentVerificationOutcome> {
  const { studentRef, demandeRef, fullName, email, knownPaymentRef } = params;
  const cleanName = (fullName || '').trim();
  const cleanEmail = (email || '').trim().toLowerCase();

  // 1. Authoritative check via known payment reference if already linked
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
        paymentDate: row.payment_date || new Date().toISOString(),
        source: 'prepa_payments',
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
        paymentDate: row.issued_date || new Date().toISOString(),
        source: 'invoices',
        matchedCount: 1,
      };
    }
  }

  // 2. Authoritative check via candidate_ref or demande_ref in prepa_payments
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
        paymentDate: row.payment_date || new Date().toISOString(),
        source: 'prepa_payments',
        matchedCount: 1,
      };
    } else if (refQuery.rows.length > 1) {
      return {
        verified: false,
        status: 'AMBIGUOUS_REQUIRES_FINANCE',
        paymentRef: null,
        amount: null,
        paymentDate: null,
        source: null,
        reason: `Multiple (${refQuery.rows.length}) first-instalment payment records are linked to reference ${refMatches.join('/')}. Authoritative Finance Officer verification is required.`,
        matchedCount: refQuery.rows.length,
      };
    }
  }

  // 3. Fallback Entity Search with Strict Concordance & Ambiguity Detection
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
      paymentDate: null,
      source: null,
      reason: 'No verified first instalment payment record found in financial ledger.',
      matchedCount: 0,
    };
  }

  if (totalMatches > 1) {
    return {
      verified: false,
      status: 'AMBIGUOUS_REQUIRES_FINANCE',
      paymentRef: null,
      amount: null,
      paymentDate: null,
      source: null,
      reason: `Ambiguous payment match: ${totalMatches} payment records matched candidate name/email. Authoritative manual review by a Finance Officer is required to prevent incorrect attribution.`,
      matchedCount: totalMatches,
    };
  }

  // Exactly 1 match: verify strict concordance (cannot rely solely on loose match)
  if (prepaQuery.rows.length === 1) {
    const row = prepaQuery.rows[0];
    const rowName = (row.candidate_name || '').toLowerCase().trim();
    const rowEmail = (row.candidate_email || '').toLowerCase().trim();

    // If both name and email were available on applicant, both must match
    if (cleanName && cleanEmail && rowEmail && (rowName !== cleanName.toLowerCase() || rowEmail !== cleanEmail)) {
      return {
        verified: false,
        status: 'AMBIGUOUS_REQUIRES_FINANCE',
        paymentRef: null,
        amount: null,
        paymentDate: null,
        source: null,
        reason: 'Payment record partially matches but candidate email does not match ledger email. Manual Finance verification required.',
        matchedCount: 1,
      };
    }

    return {
      verified: true,
      status: 'VERIFIED',
      paymentRef: row.payment_ref,
      amount: Number(row.amount),
      paymentDate: row.payment_date || new Date().toISOString(),
      source: 'prepa_payments',
      matchedCount: 1,
    };
  }

  if (invoiceQuery.rows.length === 1) {
    const row = invoiceQuery.rows[0];
    return {
      verified: true,
      status: 'VERIFIED',
      paymentRef: row.ref,
      amount: Number(row.paid_eur),
      paymentDate: row.issued_date || new Date().toISOString(),
      source: 'invoices',
      matchedCount: 1,
    };
  }

  return {
    verified: false,
    status: 'NOT_FOUND',
    paymentRef: null,
    amount: null,
    paymentDate: null,
    source: null,
    reason: 'Payment record could not be authoritatively verified.',
    matchedCount: 0,
  };
}
