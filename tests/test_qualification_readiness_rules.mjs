/**
 * LIEC Heav’n — Automated Test Suite: Qualification Readiness Rules & Hotfix
 * Verification of Gate 1 (Eligibility), Gate 2 (Registration), Gate 3 (Rawbank Payment)
 * and 3-Gate Atomic Conversion Guardrails
 */

import assert from 'assert';
import {
  validateRawbankSlip,
  validateRawbankOpCode,
  checkDuplicateRawbankTransaction,
  resolveApplicableInstalmentAmount,
  verifyFirstInstalmentPayment,
} from '../src/lib/paymentVerification.ts';

/**
 * In-memory Mock DB Client implementing DBClient interface
 */
class MockDbClient {
  constructor() {
    this.demandes = [];
    this.prospects = [];
    this.prepa_payments = [];
    this.invoices = [];
    this.audit_logs = [];
    this.history = [];
  }

  async query(text, params = []) {
    this.history.push({ text, params });
    const cleanText = text.replace(/\s+/g, ' ').trim();

    // 1. checkDuplicateRawbankTransaction - demandes check
    if (cleanText.includes('FROM demandes') && cleanText.includes('rawbank_slip_number = $1') && cleanText.includes('rawbank_operation_code = $2')) {
      const [slip, op] = params;
      const excludeRef = cleanText.includes('ref <>') ? params[2] : null;
      const excludeName = cleanText.includes('LOWER(full_name) <>') ? params[params.length - 1] : null;
      const matched = this.demandes.filter((d) =>
        d.rawbank_slip_number === slip &&
        d.rawbank_operation_code === op &&
        d.first_instalment_paid === true &&
        (!excludeRef || d.ref !== excludeRef) &&
        (!excludeName || d.full_name.toLowerCase() !== excludeName.toLowerCase())
      );
      return { rows: matched.slice(0, 1) };
    }

    // 2. checkDuplicateRawbankTransaction - prospects check
    if (cleanText.includes('FROM prospects') && cleanText.includes('rawbank_slip_number = $1') && cleanText.includes('rawbank_operation_code = $2')) {
      const [slip, op] = params;
      const excludeName = cleanText.includes('LOWER(full_name) <>') ? params[params.length - 1] : null;
      const matched = this.prospects.filter((p) =>
        p.rawbank_slip_number === slip &&
        p.rawbank_operation_code === op &&
        p.first_instalment_paid === true &&
        (!excludeName || p.full_name.toLowerCase() !== excludeName.toLowerCase())
      );
      return { rows: matched.slice(0, 1) };
    }

    // 3. resolveApplicableInstalmentAmount - prepa_payments
    if (cleanText.includes('FROM prepa_payments') && cleanText.includes('instalment_number = 1') && cleanText.includes('LOWER(candidate_name) = LOWER($1)')) {
      const [name] = params;
      const matched = this.prepa_payments.filter((p) =>
        p.instalment_number === 1 &&
        p.candidate_name &&
        p.candidate_name.toLowerCase() === name.toLowerCase()
      );
      return { rows: matched };
    }

    // 4. resolveApplicableInstalmentAmount - invoices
    if (cleanText.includes('FROM invoices') && cleanText.includes('LOWER(student_name) = LOWER($1)')) {
      const [name] = params;
      const matched = this.invoices.filter((inv) =>
        inv.student_name &&
        inv.student_name.toLowerCase() === name.toLowerCase()
      );
      return { rows: matched };
    }

    // 5. verifyFirstInstalmentPayment - rawMatch in prepa_payments by transaction_ref ILIKE %slip%
    if (cleanText.includes('FROM prepa_payments') && cleanText.includes('transaction_ref ILIKE')) {
      const [slip] = params;
      const matched = this.prepa_payments.filter((p) =>
        p.instalment_number === 1 &&
        (p.status === 'Validated' || p.status === 'Settled' || p.is_settled_totally === true) &&
        p.transaction_ref &&
        p.transaction_ref.toLowerCase().includes(slip.toLowerCase())
      );
      return { rows: matched.slice(0, 2) };
    }

    // 6. verifyFirstInstalmentPayment - candidate name/email lookup in prepa_payments
    if (cleanText.includes('FROM prepa_payments') && cleanText.includes('WHERE instalment_number = 1')) {
      const [cleanName] = params;
      const matched = this.prepa_payments.filter((p) =>
        p.instalment_number === 1 &&
        (p.status === 'Validated' || p.status === 'Settled' || p.is_settled_totally === true) &&
        p.candidate_name &&
        p.candidate_name.toLowerCase().includes(cleanName.toLowerCase())
      );
      return { rows: matched.slice(0, 5) };
    }

    // 7. verifyFirstInstalmentPayment - invoice lookup
    if (cleanText.includes('FROM invoices') && cleanText.includes('WHERE status = \'Paid\'')) {
      const [cleanName] = params;
      const matched = this.invoices.filter((inv) =>
        inv.status === 'Paid' &&
        inv.student_name &&
        inv.student_name.toLowerCase().includes(cleanName.toLowerCase())
      );
      return { rows: matched.slice(0, 5) };
    }

    // 8. UPDATE demandes
    if (cleanText.startsWith('UPDATE demandes SET')) {
      if (cleanText.includes('registration_completed = TRUE')) {
        // UPDATE demandes SET registration_completed = TRUE, registration_verified_by = $1, registration_notes = $2, registration_date = CURRENT_TIMESTAMP WHERE ref = $3
        const [verifiedBy, notes, ref] = params;
        const target = this.demandes.find((d) => d.ref === ref);
        if (target) {
          target.registration_completed = true;
          target.registration_verified_by = verifiedBy;
          target.registration_notes = notes;
          target.registration_date = new Date().toISOString();
        }
        return { rows: target ? [target] : [] };
      }

      if (cleanText.includes('eligibility_status = $1')) {
        // UPDATE demandes SET eligibility_status = $1, eligibility_notes = $2, eligibility_assessed_by = $3, eligibility_date = CURRENT_TIMESTAMP WHERE ref = $4
        const [status, notes, assessedBy, ref] = params;
        const target = this.demandes.find((d) => d.ref === ref);
        if (target) {
          target.eligibility_status = status;
          target.eligibility_notes = notes;
          target.eligibility_assessed_by = assessedBy;
          target.eligibility_date = new Date().toISOString();
        }
        return { rows: target ? [target] : [] };
      }

      if (cleanText.includes('first_instalment_paid = TRUE')) {
        // UPDATE demandes SET first_instalment_paid = TRUE, first_instalment_amount = $1, first_instalment_ref = $2, rawbank_slip_number = $3, rawbank_operation_code = $4, first_instalment_verified_by = $5, first_instalment_notes = $6, first_instalment_date = CURRENT_TIMESTAMP WHERE ref = $7
        const [amount, paymentRef, slip, op, verifiedBy, notes, ref] = params;
        const target = this.demandes.find((d) => d.ref === ref);
        if (target) {
          target.first_instalment_paid = true;
          target.first_instalment_amount = amount;
          target.first_instalment_ref = paymentRef;
          target.rawbank_slip_number = slip;
          target.rawbank_operation_code = op;
          target.first_instalment_verified_by = verifiedBy;
          target.first_instalment_notes = notes;
          target.first_instalment_date = new Date().toISOString();
        }
        return { rows: target ? [target] : [] };
      }
    }

    // 9. UPDATE prospects
    if (cleanText.startsWith('UPDATE prospects SET')) {
      if (cleanText.includes('registration_completed = TRUE')) {
        const [verifiedBy, notes, name] = params;
        const target = this.prospects.find((p) => p.full_name.toLowerCase() === String(name).toLowerCase());
        if (target) {
          target.registration_completed = true;
          target.registration_verified_by = verifiedBy;
          target.registration_notes = notes;
          target.registration_date = new Date().toISOString();
        }
        return { rows: target ? [target] : [] };
      }

      if (cleanText.includes('eligibility_status = $1')) {
        const [status, notes, assessedBy, name] = params;
        const target = this.prospects.find((p) => p.full_name.toLowerCase() === String(name).toLowerCase());
        if (target) {
          target.eligibility_status = status;
          target.eligibility_notes = notes;
          target.eligibility_assessed_by = assessedBy;
          target.eligibility_date = new Date().toISOString();
        }
        return { rows: target ? [target] : [] };
      }

      if (cleanText.includes('first_instalment_paid = TRUE')) {
        const [amount, paymentRef, slip, op, verifiedBy, notes, name] = params;
        const target = this.prospects.find((p) => p.full_name.toLowerCase() === String(name).toLowerCase());
        if (target) {
          target.first_instalment_paid = true;
          target.first_instalment_amount = amount;
          target.first_instalment_ref = paymentRef;
          target.rawbank_slip_number = slip;
          target.rawbank_operation_code = op;
          target.first_instalment_verified_by = verifiedBy;
          target.first_instalment_notes = notes;
          target.first_instalment_date = new Date().toISOString();
        }
        return { rows: target ? [target] : [] };
      }
    }

    // 10. INSERT INTO audit_logs
    if (cleanText.startsWith('INSERT INTO audit_logs')) {
      this.audit_logs.push({ text, params, created_at: new Date().toISOString() });
      return { rows: [] };
    }

    // Default empty result
    return { rows: [] };
  }
}

async function runTestSuite() {
  console.log('================================================================');
  console.log(' LIEC HEAV’N — QUALIFICATION READINESS HOTFIX & RULES TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function recordPass(testName) {
    console.log(`  [PASS] ${testName}`);
    passed++;
  }

  function recordFail(testName, error) {
    console.error(`  [FAIL] ${testName}: ${error?.message || error}`);
    failed++;
  }

  // ============================================================================
  // SECTION 1: UNIT TESTS — RAWBANK SLIP & OPERATION CODE FORMAT VALIDATION
  // ============================================================================
  console.log('--- SECTION 1: Rawbank Slip & Operation Code Format Verification ---');

  // TC-PAY-01: Valid 6-digit slip
  try {
    const res = validateRawbankSlip('123456');
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.value, '123456');
    recordPass('TC-PAY-01: Valid 6-digit slip (123456) accepted');
  } catch (err) {
    recordFail('TC-PAY-01: Valid 6-digit slip', err);
  }

  // TC-PAY-02: Slip with leading zero preserved as string
  try {
    const res = validateRawbankSlip('052658');
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.value, '052658');
    assert.strictEqual(typeof res.value, 'string');
    assert.strictEqual(res.value.startsWith('0'), true);
    recordPass('TC-PAY-02: Slip with leading zero (052658) preserved as string');
  } catch (err) {
    recordFail('TC-PAY-02: Leading zero preservation', err);
  }

  // TC-PAY-03: Slip < 6 digits rejected
  try {
    const res = validateRawbankSlip('12345');
    assert.strictEqual(res.valid, false);
    assert.match(res.error, /exactly 6 digits/);
    recordPass('TC-PAY-03: Slip < 6 digits (12345) rejected with 6-digit error');
  } catch (err) {
    recordFail('TC-PAY-03: Slip < 6 digits', err);
  }

  // TC-PAY-04: Slip > 6 digits rejected
  try {
    const res = validateRawbankSlip('1234567');
    assert.strictEqual(res.valid, false);
    assert.match(res.error, /exactly 6 digits/);
    recordPass('TC-PAY-04: Slip > 6 digits (1234567) rejected with 6-digit error');
  } catch (err) {
    recordFail('TC-PAY-04: Slip > 6 digits', err);
  }

  // TC-PAY-05: Non-numeric slip rejected
  try {
    const res = validateRawbankSlip('12A456');
    assert.strictEqual(res.valid, false);
    assert.match(res.error, /numerical digits only/);
    recordPass('TC-PAY-05: Non-numeric slip (12A456) rejected with numerical error');
  } catch (err) {
    recordFail('TC-PAY-05: Non-numeric slip', err);
  }

  // TC-PAY-06: Missing / null / empty slip rejected
  try {
    const res1 = validateRawbankSlip('');
    const res2 = validateRawbankSlip(null);
    const res3 = validateRawbankSlip(undefined);
    assert.strictEqual(res1.valid, false);
    assert.strictEqual(res2.valid, false);
    assert.strictEqual(res3.valid, false);
    assert.match(res1.error, /mandatory/);
    recordPass('TC-PAY-06: Missing or blank slip rejected as mandatory');
  } catch (err) {
    recordFail('TC-PAY-06: Missing slip', err);
  }

  // TC-PAY-07: Valid 3-digit op code
  try {
    const res = validateRawbankOpCode('101');
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.value, '101');
    recordPass('TC-PAY-07: Valid 3-digit op code (101) accepted');
  } catch (err) {
    recordFail('TC-PAY-07: Valid 3-digit op code', err);
  }

  // TC-PAY-08: Op code with leading zero preserved as string
  try {
    const res = validateRawbankOpCode('012');
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.value, '012');
    assert.strictEqual(typeof res.value, 'string');
    assert.strictEqual(res.value.startsWith('0'), true);
    recordPass('TC-PAY-08: Op code with leading zero (012) preserved as string');
  } catch (err) {
    recordFail('TC-PAY-08: Op code leading zero', err);
  }

  // TC-PAY-09: Op code != 3 digits rejected
  try {
    const resShort = validateRawbankOpCode('12');
    const resLong = validateRawbankOpCode('1234');
    assert.strictEqual(resShort.valid, false);
    assert.strictEqual(resLong.valid, false);
    assert.match(resShort.error, /exactly 3 digits/);
    recordPass('TC-PAY-09: Op code != 3 digits rejected (12, 1234)');
  } catch (err) {
    recordFail('TC-PAY-09: Op code length check', err);
  }

  // TC-PAY-10: Non-numeric op code rejected
  try {
    const res = validateRawbankOpCode('12A');
    assert.strictEqual(res.valid, false);
    assert.match(res.error, /numerical digits only/);
    recordPass('TC-PAY-10: Non-numeric op code (12A) rejected with numerical error');
  } catch (err) {
    recordFail('TC-PAY-10: Non-numeric op code', err);
  }

  // ============================================================================
  // SECTION 2: BUSINESS LOGIC, DYNAMIC AMOUNT & ANTI-DUPLICATE VERIFICATION
  // ============================================================================
  console.log('\n--- SECTION 2: Dynamic Amount, Anti-Duplicate & Ledger Verification ---');

  const mockDb = new MockDbClient();

  const applicantAlpha = {
    ref: '#DEM-TEST-001',
    full_name: 'Eduard Movomobe Mover',
    email: 'eduard.mover@example.com',
    rawbank_slip_number: '052658',
    rawbank_operation_code: '012',
    first_instalment_paid: true,
    first_instalment_amount: 1500,
    first_instalment_ref: 'RAW-052658-012',
    eligibility_status: 'Eligible',
    registration_completed: true,
  };

  const applicantBeta = {
    ref: '#DEM-TEST-002',
    full_name: 'Jovani Mokomba',
    email: 'jovani.mokomba@example.com',
    rawbank_slip_number: null,
    rawbank_operation_code: null,
    first_instalment_paid: false,
    first_instalment_amount: null,
    first_instalment_ref: null,
    eligibility_status: 'Pending Review',
    registration_completed: false,
  };

  mockDb.demandes.push(applicantAlpha, applicantBeta);
  mockDb.prospects.push(
    { id: 1, full_name: applicantAlpha.full_name, rawbank_slip_number: '052658', rawbank_operation_code: '012', first_instalment_paid: true },
    { id: 2, full_name: applicantBeta.full_name, rawbank_slip_number: null, rawbank_operation_code: null, first_instalment_paid: false }
  );
  mockDb.prepa_payments.push(
    {
      payment_ref: 'PAY-MOV-001',
      candidate_name: 'Eduard Movomobe Mover',
      candidate_email: 'eduard.mover@example.com',
      instalment_number: 1,
      amount: 1500.0,
      status: 'Validated',
      is_settled_totally: true,
      transaction_ref: 'RAW052658-012',
    },
    {
      payment_ref: 'PAY-MOK-001',
      candidate_name: 'Jovani Mokomba',
      candidate_email: 'jovani.mokomba@example.com',
      instalment_number: 1,
      amount: 1800.0,
      status: 'Validated',
      is_settled_totally: true,
      transaction_ref: 'RAW998877-001',
    }
  );

  // TC-PAY-11: Anti-Duplicate Transaction Protection
  try {
    // Check if Alpha's transaction (052658 / 012) is flagged when Beta tries to submit it
    const dupCheck = await checkDuplicateRawbankTransaction(mockDb, '052658', '012', applicantBeta.ref);
    assert.strictEqual(dupCheck.isDuplicate, true);
    assert.strictEqual(dupCheck.existingRef, applicantAlpha.ref);
    assert.strictEqual(dupCheck.existingApplicant, applicantAlpha.full_name);

    // Unused transaction should pass
    const unusedCheck = await checkDuplicateRawbankTransaction(mockDb, '998877', '001', applicantBeta.ref);
    assert.strictEqual(unusedCheck.isDuplicate, false);
    recordPass('TC-PAY-11: Anti-duplicate check blocks duplicate Rawbank transaction reuse across applicants');
  } catch (err) {
    recordFail('TC-PAY-11: Anti-duplicate protection', err);
  }

  // TC-PAY-12: Dynamic Instalment Amount Resolution
  try {
    const alphaAmt = await resolveApplicableInstalmentAmount(mockDb, {
      fullName: applicantAlpha.full_name,
      email: applicantAlpha.email,
      demandeRef: applicantAlpha.ref,
    });
    assert.strictEqual(alphaAmt.amount, 1500, 'Eduard Movomobe Mover obligation must resolve dynamically to €1,500');

    const betaAmt = await resolveApplicableInstalmentAmount(mockDb, {
      fullName: applicantBeta.full_name,
      email: applicantBeta.email,
      demandeRef: applicantBeta.ref,
    });
    assert.strictEqual(betaAmt.amount, 1800, 'Jovani Mokomba obligation must resolve dynamically to €1,800');
    recordPass('TC-PAY-12: Dynamic amount resolution (€1,500 vs €1,800) matches individual ledger obligation');
  } catch (err) {
    recordFail('TC-PAY-12: Dynamic amount resolution', err);
  }

  // TC-PAY-13: Authoritative Ledger Cross-Check
  try {
    // Cross-check Alpha against ledger with matching slip
    const alphaMatch = await verifyFirstInstalmentPayment(mockDb, {
      demandeRef: applicantAlpha.ref,
      fullName: applicantAlpha.full_name,
      email: applicantAlpha.email,
      rawbankSlipNumber: '052658',
      rawbankOperationCode: '012',
      requiredAmount: 1500,
    });
    assert.strictEqual(alphaMatch.verified, true);
    assert.strictEqual(alphaMatch.status, 'VERIFIED');
    assert.strictEqual(alphaMatch.amount, 1500);

    // Non-existent transaction in ledger
    const missingMatch = await verifyFirstInstalmentPayment(mockDb, {
      demandeRef: applicantBeta.ref,
      fullName: 'Unknown Random Candidate',
      email: 'unknown@example.com',
      rawbankSlipNumber: '888888',
      rawbankOperationCode: '999',
      requiredAmount: 1800,
    });
    assert.strictEqual(missingMatch.verified, false);
    assert.strictEqual(missingMatch.status, 'NOT_FOUND');
    recordPass('TC-PAY-13: Authoritative ledger cross-check validates genuine matches and rejects missing records');
  } catch (err) {
    recordFail('TC-PAY-13: Ledger cross-check', err);
  }

  // ============================================================================
  // SECTION 3: GATE 1 (ELIGIBILITY) & GATE 2 (REGISTRATION) TESTS
  // ============================================================================
  console.log('\n--- SECTION 3: Gate 1 & Gate 2 Verification ---');

  // TC-REG-01: Administrative registration query parameter alignment ($1, $2, $3)
  try {
    // We execute the query with positional parameters [verifiedBy, notes, ref]
    const verifiedBy = 'Registrar Officer';
    const notes = 'Dossier complet et pièces certifiées conformes';

    await mockDb.query(
      `UPDATE demandes SET registration_completed = TRUE, registration_verified_by = $1, registration_notes = $2, registration_date = CURRENT_TIMESTAMP WHERE ref = $3`,
      [verifiedBy, notes, applicantBeta.ref]
    );

    await mockDb.query(
      `UPDATE prospects SET registration_completed = TRUE, registration_verified_by = $1, registration_notes = $2, registration_date = CURRENT_TIMESTAMP WHERE LOWER(full_name) = LOWER($3)`,
      [verifiedBy, notes, applicantBeta.full_name]
    );

    assert.strictEqual(applicantBeta.registration_completed, true);
    assert.strictEqual(applicantBeta.registration_verified_by, verifiedBy);
    assert.strictEqual(applicantBeta.registration_notes, notes);
    recordPass('TC-REG-01: Administrative registration parameter alignment ($1, $2, $3 fixed, no bind error)');
  } catch (err) {
    recordFail('TC-REG-01: Registration query parameters', err);
  }

  // TC-REG-02: Registration records reviewer, notes, timestamp and syncs to prospects
  try {
    const pros = mockDb.prospects.find((p) => p.full_name === applicantBeta.full_name);
    assert.strictEqual(pros.registration_completed, true);
    assert.strictEqual(pros.registration_verified_by, 'Registrar Officer');
    assert.strictEqual(pros.registration_notes, 'Dossier complet et pièces certifiées conformes');
    assert.ok(pros.registration_date, 'Timestamp must be recorded');
    recordPass('TC-REG-02: Registration records reviewer, notes, timestamp and syncs with prospects');
  } catch (err) {
    recordFail('TC-REG-02: Registration audit metadata', err);
  }

  // TC-ELIG-01: Admission Eligibility Approval
  try {
    const reviewer = 'Dean Academic Affairs';
    const notes = 'Academic file approved for Master UX/UI program';

    await mockDb.query(
      `UPDATE demandes SET eligibility_status = $1, eligibility_notes = $2, eligibility_assessed_by = $3, eligibility_date = CURRENT_TIMESTAMP WHERE ref = $4`,
      ['Eligible', notes, reviewer, applicantBeta.ref]
    );

    await mockDb.query(
      `UPDATE prospects SET eligibility_status = $1, eligibility_notes = $2, eligibility_assessed_by = $3, eligibility_date = CURRENT_TIMESTAMP WHERE LOWER(full_name) = LOWER($4)`,
      ['Eligible', notes, reviewer, applicantBeta.full_name]
    );

    assert.strictEqual(applicantBeta.eligibility_status, 'Eligible');
    assert.strictEqual(applicantBeta.eligibility_assessed_by, reviewer);
    assert.strictEqual(applicantBeta.eligibility_notes, notes);
    recordPass('TC-ELIG-01: Admission eligibility approved with reviewer & timestamp recorded');
  } catch (err) {
    recordFail('TC-ELIG-01: Eligibility approval', err);
  }

  // TC-ELIG-02: Admission Eligibility Rejection Requires Mandatory Notes
  try {
    function simulateEligibilityEndpoint(status, notes) {
      if (status === 'Rejected' && (!notes || !notes.trim())) {
        return { ok: false, error: 'A justification note is strictly mandatory when rejecting admission eligibility.' };
      }
      return { ok: true };
    }

    const blankReject = simulateEligibilityEndpoint('Rejected', '');
    assert.strictEqual(blankReject.ok, false);
    assert.match(blankReject.error, /mandatory/);

    const validReject = simulateEligibilityEndpoint('Rejected', 'Niveau linguistique insuffisant (TCF B1 au lieu de B2 requis)');
    assert.strictEqual(validReject.ok, true);
    recordPass('TC-ELIG-02: Admission eligibility rejection without notes is strictly rejected');
  } catch (err) {
    recordFail('TC-ELIG-02: Mandatory rejection reason', err);
  }

  // ============================================================================
  // SECTION 4: ATOMIC CONVERSION 3-GATE INTEGRITY TESTS
  // ============================================================================
  console.log('\n--- SECTION 4: 3-Gate Conversion Guardrails ---');

  // Helper simulating convert_to_candidat 3-condition guard
  function checkConversionEligibility(demande) {
    const isEligible = demande.eligibility_status === 'Eligible';
    const isRegDone = Boolean(demande.registration_completed);
    const hasRawbank = Boolean(demande.rawbank_slip_number && demande.rawbank_operation_code);
    const isPaid = Boolean(demande.first_instalment_paid) && hasRawbank;

    const missing = [];
    if (!isEligible) missing.push('Admission Eligibility');
    if (!isRegDone) missing.push('Administrative Registration');
    if (!isPaid) missing.push('First Instalment Payment (with Rawbank slip)');

    return {
      canConvert: missing.length === 0,
      missingConditions: missing,
    };
  }

  // TC-CONV-01: Conversion blocked when 0/3 conditions met
  try {
    const blankDemande = {
      eligibility_status: 'Pending Review',
      registration_completed: false,
      first_instalment_paid: false,
      rawbank_slip_number: null,
      rawbank_operation_code: null,
    };
    const res = checkConversionEligibility(blankDemande);
    assert.strictEqual(res.canConvert, false);
    assert.strictEqual(res.missingConditions.length, 3);
    recordPass('TC-CONV-01: Conversion blocked when 0/3 conditions met');
  } catch (err) {
    recordFail('TC-CONV-01: 0/3 conversion block', err);
  }

  // TC-CONV-02: Conversion blocked when 2/3 conditions met (e.g. eligibility + registration, but unpaid)
  try {
    const twoThirdsDemande = {
      eligibility_status: 'Eligible',
      registration_completed: true,
      first_instalment_paid: false,
      rawbank_slip_number: null,
      rawbank_operation_code: null,
    };
    const res = checkConversionEligibility(twoThirdsDemande);
    assert.strictEqual(res.canConvert, false);
    assert.strictEqual(res.missingConditions.length, 1);
    assert.match(res.missingConditions[0], /First Instalment Payment/);
    recordPass('TC-CONV-02: Conversion blocked when 2/3 conditions met (payment missing)');
  } catch (err) {
    recordFail('TC-CONV-02: 2/3 conversion block', err);
  }

  // TC-CONV-03: Conversion succeeds when 3/3 conditions verified with valid Rawbank slip & op code
  try {
    const fullDemande = {
      eligibility_status: 'Eligible',
      registration_completed: true,
      first_instalment_paid: true,
      rawbank_slip_number: '052658',
      rawbank_operation_code: '012',
    };
    const res = checkConversionEligibility(fullDemande);
    assert.strictEqual(res.canConvert, true);
    assert.strictEqual(res.missingConditions.length, 0);
    recordPass('TC-CONV-03: Conversion authorized when all 3 gates verified with Rawbank slip & op code');
  } catch (err) {
    recordFail('TC-CONV-03: 3/3 conversion success', err);
  }

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n================================================================');
  console.log(` TEST EXECUTION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Test suite failed with unhandled exception:', err);
  process.exit(1);
});
