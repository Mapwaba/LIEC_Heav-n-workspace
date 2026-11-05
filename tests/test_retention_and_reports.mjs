import assert from 'assert';

console.log('--- LIEC HEAV\'N RETENTION & PROGRAMME REPORTS TEST SUITE ---');

// Test 1: 11-Month Retention Computation Logic
console.log('Testing 1: 11-Month Retention Timeline & Safeguards...');

function computeRetention(cand) {
  if (cand.documents_purged) {
    return { status: 'PURGED', isExpired: false, eligibleEarlyPurge: false, requiresReview: false };
  }
  if (!cand.qualified_at || cand.qualification_status === 'REQUIRES_REVIEW') {
    return {
      status: 'REQUIRES_REVIEW',
      isExpired: false,
      eligibleEarlyPurge: cand.visa_status === 'Obtained',
      requiresReview: true
    };
  }
  const qDate = new Date(cand.qualified_at);
  const deadline = new Date(qDate);
  deadline.setMonth(deadline.getMonth() + 11);

  const now = new Date();
  const msRemaining = deadline.getTime() - now.getTime();
  const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
  const isExpired = daysRemaining <= 0;
  const eligibleEarlyPurge = cand.visa_status === 'Obtained';

  let status = 'ACTIVE';
  if (eligibleEarlyPurge) status = 'ELIGIBLE_EARLY_PURGE';
  else if (isExpired) status = 'DUE_FOR_PURGE';

  return { status, deadline, daysRemaining, isExpired, eligibleEarlyPurge, requiresReview: false };
}

// 1.1 Verified qualified student 2 months ago -> Active (approx 270 days remaining)
const studentActive = {
  ref: '#CAN-2025-050',
  full_name: 'Test Active',
  qualified_at: new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString(),
  qualification_status: 'QUALIFIED',
  visa_status: 'In Preparation',
  documents_purged: false,
};
const resActive = computeRetention(studentActive);
assert.strictEqual(resActive.status, 'ACTIVE');
assert.strictEqual(resActive.isExpired, false);
assert.strictEqual(resActive.requiresReview, false);
console.log('  ✓ Active candidate within 11 months correctly calculated (days remaining: ' + resActive.daysRemaining + ')');

// 1.2 Qualified student 12 months ago -> Due for purge
const studentExpired = {
  ref: '#CAN-2025-051',
  full_name: 'Test Expired',
  qualified_at: new Date(Date.now() - 370 * 24 * 3600 * 1000).toISOString(),
  qualification_status: 'QUALIFIED',
  visa_status: 'Not Applied',
  documents_purged: false,
};
const resExpired = computeRetention(studentExpired);
assert.strictEqual(resExpired.status, 'DUE_FOR_PURGE');
assert.strictEqual(resExpired.isExpired, true);
console.log('  ✓ Expired candidate past 11-month deadline correctly flagged as DUE_FOR_PURGE');

// 1.3 Candidate with Obtained Visa -> Eligible for early purge
const studentVisaObtained = {
  ref: '#CAN-2025-052',
  full_name: 'Test Visa Obtained',
  qualified_at: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
  qualification_status: 'QUALIFIED',
  visa_status: 'Obtained',
  documents_purged: false,
};
const resVisaObtained = computeRetention(studentVisaObtained);
assert.strictEqual(resVisaObtained.status, 'ELIGIBLE_EARLY_PURGE');
assert.strictEqual(resVisaObtained.eligibleEarlyPurge, true);
console.log('  ✓ Student with confirmed visa obtention correctly identified as ELIGIBLE_EARLY_PURGE');

// 1.4 Historical candidate with missing timestamp -> REQUIRES_REVIEW (No backdating!)
const studentHistorical = {
  ref: '#CAN-2025-001',
  full_name: 'Historical Candidate',
  qualified_at: null,
  qualification_status: 'REQUIRES_REVIEW',
  visa_status: 'In Preparation',
  documents_purged: false,
};
const resHistorical = computeRetention(studentHistorical);
assert.strictEqual(resHistorical.status, 'REQUIRES_REVIEW');
assert.strictEqual(resHistorical.requiresReview, true);
console.log('  ✓ Historical candidate without verified timestamp strictly flagged as REQUIRES_REVIEW');

// 1.5 Purged candidate -> PURGED
const studentPurged = {
  ref: '#CAN-2025-053',
  full_name: 'Test Purged',
  qualified_at: new Date().toISOString(),
  documents_purged: true,
};
const resPurged = computeRetention(studentPurged);
assert.strictEqual(resPurged.status, 'PURGED');
console.log('  ✓ Purged candidate correctly recorded as PURGED (Compliant)');

// Test 2: Strict Visa Success Rate Calculation Formula
console.log('\nTesting 2: Strict Visa Success Rate Denominator...');

function calculateVisaSuccessRate(obtained, refused, pending, inPreparation) {
  const decided = obtained + refused;
  const rate = decided > 0 ? Math.round((obtained / decided) * 1000) / 10 : 0;
  return { decided, rate };
}

// Case 2.1: 5 obtained, 1 refused, 10 pending
// Strict formula: 5 / (5 + 1) = 83.3%
// WRONG formula would be: 5 / (5 + 1 + 10) = 31.25%
const metrics1 = calculateVisaSuccessRate(5, 1, 10, 4);
assert.strictEqual(metrics1.decided, 6);
assert.strictEqual(metrics1.rate, 83.3);
console.log('  ✓ Strict denominator excludes 10 pending and 4 in-prep: 5 / (5 + 1) = ' + metrics1.rate + '% (NOT 31.2%)');

// Case 2.2: 0 obtained, 0 refused, 8 pending -> 0 decided -> rate 0% (or N/A)
const metrics2 = calculateVisaSuccessRate(0, 0, 8, 2);
assert.strictEqual(metrics2.decided, 0);
assert.strictEqual(metrics2.rate, 0);
console.log('  ✓ 0 decided applications handled gracefully without divide-by-zero');

// Case 2.3: 4 obtained, 0 refused, 3 pending -> 100%
const metrics3 = calculateVisaSuccessRate(4, 0, 3, 1);
assert.strictEqual(metrics3.decided, 4);
assert.strictEqual(metrics3.rate, 100);
console.log('  ✓ 4 obtained, 0 refused yields 100% success rate');

console.log('\nALL RETENTION & PROGRAMME REPORTS CHECKS PASSED SUCCESSFULLY!\n');
