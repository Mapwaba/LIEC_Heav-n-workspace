import assert from 'assert';

console.log('--- LIEC HEAV\'N CRM QUALIFICATION & ACCOMMODATION CONFIRMATION TEST SUITE ---');

// ============================================================================
// PART A: PROSPECTS 4-STAGE LIFECYCLE & 3-CONDITION QUALIFICATION RULES
// ============================================================================
console.log('\n[TEST 1] Prospects 4-Stage Lifecycle & Transition Guardrails...');

const STAGES = ['nouveau', 'premier_contact', 'diagnostic', 'qualifie'];

function canAdvanceStage(currentStage, targetStage, data = {}) {
  const currentIdx = STAGES.indexOf(currentStage);
  const targetIdx = STAGES.indexOf(targetStage);

  if (targetIdx === -1 || currentIdx === -1) {
    return { allowed: false, reason: 'Invalid stage identifier.' };
  }

  // Advancing to premier_contact (First Contact)
  if (targetStage === 'premier_contact') {
    return { allowed: true };
  }

  // Advancing to diagnostic (Eligibility Check)
  if (targetStage === 'diagnostic') {
    if (currentStage === 'nouveau' && !data.first_contact_outcome) {
      return {
        allowed: false,
        reason: 'First contact must be recorded before proceeding to eligibility diagnostic.',
      };
    }
    return { allowed: true };
  }

  // Advancing to qualifie (Qualification)
  if (targetStage === 'qualifie') {
    const missing = [];
    if (data.eligibility_status !== 'Eligible') {
      missing.push('Admission and programme eligibility confirmed (status must be Eligible)');
    }
    if (!data.registration_completed) {
      missing.push('Administrative registration completed');
    }
    if (!data.first_instalment_paid) {
      missing.push('First instalment payment verified against payment records');
    }

    if (missing.length > 0) {
      return {
        allowed: false,
        reason: 'Cannot advance to Qualified: Mandatory qualification conditions are incomplete.',
        missingConditions: missing,
      };
    }
    return { allowed: true };
  }

  return { allowed: true };
}

// 1.1 New Lead can move to First Contact
const res1_1 = canAdvanceStage('nouveau', 'premier_contact');
assert.strictEqual(res1_1.allowed, true);
console.log('  ✓ Stage 1 (New Lead) correctly advances to First Contact');

// 1.2 Moving from nouveau directly to diagnostic without contact is blocked
const res1_2 = canAdvanceStage('nouveau', 'diagnostic', {});
assert.strictEqual(res1_2.allowed, false);
console.log('  ✓ Skipping First Contact directly to Diagnostic is safely blocked');

// 1.3 Advancing to diagnostic with contact recorded is allowed
const res1_3 = canAdvanceStage('premier_contact', 'diagnostic', { first_contact_outcome: 'Completed' });
assert.strictEqual(res1_3.allowed, true);
console.log('  ✓ Progression from First Contact to Eligibility Diagnostic is permitted');

// 1.4 Attempting Qualification without the 3 conditions is strictly blocked
const res1_4 = canAdvanceStage('diagnostic', 'qualifie', {
  eligibility_status: 'Pending Review',
  registration_completed: false,
  first_instalment_paid: false,
});
assert.strictEqual(res1_4.allowed, false);
assert.strictEqual(res1_4.missingConditions.length, 3);
console.log('  ✓ Qualification attempt with 0/3 conditions is blocked with all 3 missing requirements returned');

// 1.5 Qualification with Ineligible prospect is strictly blocked
const res1_5 = canAdvanceStage('diagnostic', 'qualifie', {
  eligibility_status: 'Ineligible',
  registration_completed: true,
  first_instalment_paid: true,
});
assert.strictEqual(res1_5.allowed, false);
assert.ok(res1_5.missingConditions[0].includes('Eligible'));
console.log('  ✓ Ineligible prospect is strictly blocked from Qualification milestone');

// 1.6 Qualification with only Eligibility and Registration met, but NO payment verified is blocked
const res1_6 = canAdvanceStage('diagnostic', 'qualifie', {
  eligibility_status: 'Eligible',
  registration_completed: true,
  first_instalment_paid: false,
});
assert.strictEqual(res1_6.allowed, false);
assert.strictEqual(res1_6.missingConditions.length, 1);
assert.ok(res1_6.missingConditions[0].includes('First instalment'));
console.log('  ✓ Qualification without verified 1st instalment is blocked with payment requirement flagged');

// 1.7 Qualification with ALL 3 conditions satisfied succeeds
const res1_7 = canAdvanceStage('diagnostic', 'qualifie', {
  eligibility_status: 'Eligible',
  registration_completed: true,
  first_instalment_paid: true,
});
assert.strictEqual(res1_7.allowed, true);
console.log('  ✓ Full qualification approved when all 3 formal conditions are satisfied');


// ============================================================================
// PART B: CANDIDATE CONVERSION & IDEMPOTENCY LOCK
// ============================================================================
console.log('\n[TEST 2] Received Applications Conversion & Duplicate Lock...');

function convertApplicationToCandidate(application, registeredPayments = []) {
  // Idempotency check: Already converted lock
  if (application.status === 'Convertie' || application.converted_candidate_ref) {
    return {
      status: 409,
      error: `Application ${application.ref} has already been converted to candidate (${application.converted_candidate_ref}).`,
      candidateRef: application.converted_candidate_ref,
      alreadyConverted: true,
    };
  }

  // Verify first instalment payment against payment records
  const matchingPayment = registeredPayments.find(
    (p) =>
      (p.candidate_email && application.email && p.candidate_email.toLowerCase() === application.email.toLowerCase()) ||
      (p.candidate_name && application.full_name && p.candidate_name.toLowerCase() === application.full_name.toLowerCase())
  );

  const hasFirstInstalment = application.first_instalment_paid || Boolean(matchingPayment);
  const isEligible = application.eligibility_status === 'Eligible';
  const isRegistered = Boolean(application.registration_completed);

  const missing = [];
  if (!isEligible) missing.push('Admission eligibility confirmed');
  if (!isRegistered) missing.push('Registration file completed');
  if (!hasFirstInstalment) missing.push('First instalment payment verified against records');

  if (missing.length > 0) {
    return {
      status: 400,
      error: 'Cannot convert application to candidate: Mandatory qualification conditions are incomplete.',
      missingConditions: missing,
    };
  }

  const candidateRef = `#CAN-${new Date().getFullYear()}-099`;
  const qualifiedAt = new Date().toISOString();

  return {
    status: 200,
    success: true,
    candidateRef,
    qualifiedAt,
    intakeYear: application.intake_year || '2026–2027',
  };
}

// 2.1 Conversion blocked when conditions missing
const appIncomplete = {
  ref: '#DEM-2026-001',
  full_name: 'Test Incomplete',
  email: 'inc@example.com',
  eligibility_status: 'Pending Review',
  registration_completed: false,
};
const convRes1 = convertApplicationToCandidate(appIncomplete, []);
assert.strictEqual(convRes1.status, 400);
console.log('  ✓ Incomplete application conversion returns 400 with missing conditions');

// 2.2 Conversion succeeds when all 3 verified, including automated payment detection
const appComplete = {
  ref: '#DEM-2026-002',
  full_name: 'David Kabangele',
  email: 'david@unikin.ac.cd',
  eligibility_status: 'Eligible',
  registration_completed: true,
  intake_year: '2026–2027',
};
const payments = [
  { candidate_email: 'david@unikin.ac.cd', amount: 800, status: 'Validated' },
];
const convRes2 = convertApplicationToCandidate(appComplete, payments);
assert.strictEqual(convRes2.status, 200);
assert.ok(convRes2.candidateRef.startsWith('#CAN-'));
console.log('  ✓ Application conversion successfully verifies payment and returns candidate ' + convRes2.candidateRef);

// 2.3 Duplicate conversion is locked and returns 409 Conflict
const appAlreadyConverted = {
  ref: '#DEM-2026-002',
  status: 'Convertie',
  converted_candidate_ref: convRes2.candidateRef,
};
const convRes3 = convertApplicationToCandidate(appAlreadyConverted, payments);
assert.strictEqual(convRes3.status, 409);
assert.strictEqual(convRes3.alreadyConverted, true);
assert.strictEqual(convRes3.candidateRef, convRes2.candidateRef);
console.log('  ✓ Repeated conversion attempt blocked by idempotency lock (HTTP 409 Conflict)');


// ============================================================================
// PART C: ACCOMMODATION RESERVATIONS WORKFLOW SEPARATION
// ============================================================================
console.log('\n[TEST 3] Accommodation Dispatch vs Manual Confirmation Separation...');

function processAccommodationAction(request, action, payload = {}) {
  switch (action) {
    case 'dispatch_partner_email':
      return {
        ...request,
        status: 'Sent', // Pending partner response
        partner_name: payload.partner_name,
        email_sent_at: new Date().toISOString(),
      };

    case 'confirm_reservation_granted':
      if (!request.partner_name && !payload.partner_name) {
        return { error: 'Partner must be specified for reservation confirmation.', status: 400 };
      }
      return {
        ...request,
        status: 'Reservation Granted',
        confirmation_date: payload.confirmation_date || new Date().toISOString(),
        confirmation_reference: payload.confirmation_reference || 'REF-CONFIRMED',
        confirmation_notes: payload.notes || 'Partner confirmed studio availability.',
      };

    case 'confirm_reservation_declined':
      if (!payload.decline_reason) {
        return { error: 'Mandatory decline reason is required.', status: 400 };
      }
      return {
        ...request,
        status: 'Reservation Declined',
        decline_reason: payload.decline_reason,
        confirmation_date: new Date().toISOString(),
      };

    case 'cancel_reservation':
      if (!payload.cancellation_reason) {
        return { error: 'Mandatory cancellation reason is required.', status: 400 };
      }
      return {
        ...request,
        status: 'Cancelled',
        cancellation_reason: payload.cancellation_reason,
      };

    default:
      return request;
  }
}

// 3.1 Initial creation starts in Draft
let accReq = { ref: '#ACC-2026-001', student_ref: '#CAN-2026-001', status: 'Draft' };
assert.strictEqual(accReq.status, 'Draft');
console.log('  ✓ Initial accommodation request created in Draft status');

// 3.2 Dispatching to partner sets status to 'Sent' (Pending Partner Response), NOT 'Reservation Granted'
accReq = processAccommodationAction(accReq, 'dispatch_partner_email', { partner_name: 'SCI DANOVA' });
assert.strictEqual(accReq.status, 'Sent');
assert.strictEqual(accReq.partner_name, 'SCI DANOVA');
console.log('  ✓ Dispatching request to partner sets status to "Sent" (Pending Partner Response) strictly distinct from Granted');

// 3.3 Explicit staff confirmation transitions status to 'Reservation Granted'
accReq = processAccommodationAction(accReq, 'confirm_reservation_granted', {
  confirmation_reference: 'DAN-2026-STUDIO-14',
  notes: 'Lease agreement signed and reservation deposit confirmed by SCI DANOVA.',
});
assert.strictEqual(accReq.status, 'Reservation Granted');
assert.strictEqual(accReq.confirmation_reference, 'DAN-2026-STUDIO-14');
console.log('  ✓ Explicit manual confirmation transitions request to "Reservation Granted" with partner ref recorded');

// 3.4 Decline requires reason
const declineAttemptNoReason = processAccommodationAction(accReq, 'confirm_reservation_declined', {});
assert.strictEqual(declineAttemptNoReason.status, 400);
console.log('  ✓ Decline attempt without mandatory reason correctly rejected');

const declineSuccess = processAccommodationAction(accReq, 'confirm_reservation_declined', {
  decline_reason: 'No availability for requested arrival semester',
});
assert.strictEqual(declineSuccess.status, 'Reservation Declined');
assert.strictEqual(declineSuccess.decline_reason, 'No availability for requested arrival semester');
console.log('  ✓ Decline successfully recorded with documented reason');

// 3.5 Cancellation requires reason
const cancelAttemptNoReason = processAccommodationAction(accReq, 'cancel_reservation', {});
assert.strictEqual(cancelAttemptNoReason.status, 400);
console.log('  ✓ Cancellation attempt without mandatory reason correctly rejected');

const cancelSuccess = processAccommodationAction(accReq, 'cancel_reservation', {
  cancellation_reason: 'Student opted for university CROUS accommodation',
});
assert.strictEqual(cancelSuccess.status, 'Cancelled');
console.log('  ✓ Cancellation successfully recorded with documented reason');

console.log('\n=============================================================');
console.log('ALL CRM, QUALIFICATION & ACCOMMODATION WORKFLOW TESTS PASSED!');
console.log('=============================================================\n');
