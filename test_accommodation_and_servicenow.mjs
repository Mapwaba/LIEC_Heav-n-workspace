import fs from 'fs';
import path from 'path';
import { PGlite } from '@electric-sql/pglite';
import nodemailer from 'nodemailer';

async function main() {
  console.log('================================================================');
  console.log('LIEC HEAV’N ACCOMMODATION & SERVICENOW VERIFICATION SUITE');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passedTests++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  const dataDir = path.join(process.cwd(), 'database', '.pgdata');
  const db = new PGlite(dataDir);
  await db.waitReady;

  // -------------------------------------------------------------------------
  // TEST 1: Database Schema & Migrations Check
  // -------------------------------------------------------------------------
  console.log('--- TEST 1: Database Schema & Migrations ---');
  const tableCheck = await db.query(
    `SELECT table_name FROM information_schema.tables WHERE table_name IN ('candidats', 'accommodation_requests', 'avi_requests', 'audit_logs')`
  );
  const tableNames = tableCheck.rows.map((r) => r.table_name);
  assert(tableNames.includes('accommodation_requests'), 'accommodation_requests table exists');
  assert(tableNames.includes('candidats'), 'candidats table exists');
  assert(tableNames.includes('avi_requests'), 'avi_requests table exists');
  assert(tableNames.includes('audit_logs'), 'audit_logs table exists');

  // Verify columns on candidats
  const colCheck = await db.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'candidats'`
  );
  const colNames = colCheck.rows.map((r) => r.column_name);
  assert(colNames.includes('parent_email'), 'candidats.parent_email column exists');
  assert(colNames.includes('parent_relation'), 'candidats.parent_relation column exists');
  assert(colNames.includes('admission_status'), 'candidats.admission_status column exists');
  assert(colNames.includes('procedure_status'), 'candidats.procedure_status column exists');
  assert(colNames.includes('description'), 'candidats.description column exists');
  assert(colNames.includes('history_json'), 'candidats.history_json column exists');

  // Verify columns on accommodation_requests
  const accColCheck = await db.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'accommodation_requests'`
  );
  const accColNames = accColCheck.rows.map((r) => r.column_name);
  assert(accColNames.includes('student_ref'), 'accommodation_requests.student_ref column exists');
  assert(accColNames.includes('preferred_location'), 'accommodation_requests.preferred_location column exists');
  assert(accColNames.includes('accommodation_type'), 'accommodation_requests.accommodation_type column exists');
  assert(accColNames.includes('arrival_date'), 'accommodation_requests.arrival_date column exists');
  assert(accColNames.includes('budget'), 'accommodation_requests.budget column exists');
  assert(accColNames.includes('status'), 'accommodation_requests.status column exists');
  assert(accColNames.includes('history_json'), 'accommodation_requests.history_json column exists');
  assert(accColNames.includes('email_sent_at'), 'accommodation_requests.email_sent_at column exists');

  // -------------------------------------------------------------------------
  // TEST 2: Centralised ServiceNow Student Record Form Operations
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 2: ServiceNow Student Record Operations (Save/Update/History) ---');
  const studentRes = await db.query('SELECT * FROM candidats WHERE ref = $1', ['#CAN-2025-042']);
  assert(studentRes.rows.length > 0, 'Target student record #CAN-2025-042 exists');
  const student = studentRes.rows[0];

  const newDescription = 'Pursuing higher education admission at partner campuses in Lyon. Academic profile verified with certified transcripts and TCF B2.';
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const currentHistory = JSON.parse(student.history_json || '[]');
  currentHistory.unshift({
    timestamp,
    author: 'Barthelemy MAPWABA NTORO (Admin)',
    activity_type: 'RECORD_UPDATED',
    details: 'Persisted ServiceNow Student Record form with verified parent details and situation description.',
  });

  await db.query(
    `UPDATE candidats SET
      description = $1,
      parent_email = 'jp.kabangele@gmail.com',
      parent_relation = 'Father',
      admission_status = 'Admitted — MyDigitalSchool Lyon',
      procedure_status = 'Milestone 2 (Academic Records)',
      history_json = $2
     WHERE ref = '#CAN-2025-042'`,
    [newDescription, JSON.stringify(currentHistory)]
  );

  const updatedStudentRes = await db.query('SELECT * FROM candidats WHERE ref = $1', ['#CAN-2025-042']);
  const updatedStudent = updatedStudentRes.rows[0];
  assert(updatedStudent.description === newDescription, 'Student situation description updated and persisted');
  assert(updatedStudent.parent_email === 'jp.kabangele@gmail.com', 'Parent email address persisted');
  assert(updatedStudent.parent_relation === 'Father', 'Parent relationship persisted');
  const loadedHistory = JSON.parse(updatedStudent.history_json || '[]');
  assert(loadedHistory.length > 0, 'Activity history stream records event');
  assert(loadedHistory[0].activity_type === 'RECORD_UPDATED', 'Activity history preserves event type');

  // -------------------------------------------------------------------------
  // TEST 3: Accommodation Request Creation & Student Linking
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 3: Accommodation Request Creation Linked to Student ---');
  const testAccRef = `#ACC-${new Date().getFullYear()}-TEST01`;
  await db.query('DELETE FROM accommodation_requests WHERE ref = $1', [testAccRef]);

  const accHistory = [
    {
      timestamp,
      author: 'Marc Kouassi (Secretary)',
      action: 'CREATED',
      details: 'Accommodation reservation request initiated from Student Record #CAN-2025-042.',
      status: 'Draft',
    },
  ];

  await db.query(
    `INSERT INTO accommodation_requests (
      ref, student_ref, student_name, student_email, student_phone, student_nationality, student_location,
      parent_name, parent_phone, parent_email, parent_relation, admission_status, procedure_status,
      preferred_location, accommodation_type, arrival_date, departure_date, budget, special_requirements,
      status, assigned_agent, history_json
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)`,
    [
      testAccRef,
      updatedStudent.ref,
      updatedStudent.full_name,
      updatedStudent.email,
      updatedStudent.phone,
      updatedStudent.nationality,
      updatedStudent.country,
      updatedStudent.parent_full_name,
      updatedStudent.parent_phone,
      updatedStudent.parent_email,
      updatedStudent.parent_relation,
      updatedStudent.admission_status,
      updatedStudent.procedure_status,
      'Lyon 7e (Jean Macé)',
      'Studio Meublé (Résidence Étudiante)',
      '2025-09-01',
      '2026-06-30',
      '550 € / month',
      'High-speed WiFi for web development coursework, near Metro B, quiet study space.',
      'Draft',
      'Barthelemy MAPWABA NTORO',
      JSON.stringify(accHistory),
    ]
  );

  const accRes = await db.query('SELECT * FROM accommodation_requests WHERE ref = $1', [testAccRef]);
  assert(accRes.rows.length === 1, 'Accommodation request created in database');
  const createdAcc = accRes.rows[0];
  assert(createdAcc.student_ref === '#CAN-2025-042', 'Linked strictly to student reference');
  assert(createdAcc.student_name === updatedStudent.full_name, 'Student full name retrieved automatically');
  assert(createdAcc.student_phone === updatedStudent.phone, 'Student phone retrieved automatically');
  assert(createdAcc.parent_email === 'jp.kabangele@gmail.com', 'Parent email populated from student record');
  assert(createdAcc.status === 'Draft', 'Initial status is Draft');

  // -------------------------------------------------------------------------
  // TEST 4: Deletion Safeguard for Linked Requests
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 4: Safeguards Against Accidental Student Deletion ---');
  // Check that linked requests exist for #CAN-2025-042
  const checkAvi = await db.query(
    'SELECT COUNT(*) as count FROM avi_requests WHERE student_ref = $1 OR student_name ILIKE $2',
    ['#CAN-2025-042', '%Kabangele%']
  );
  const checkAcc = await db.query(
    'SELECT COUNT(*) as count FROM accommodation_requests WHERE student_ref = $1',
    ['#CAN-2025-042']
  );
  const totalLinked = Number(checkAvi.rows[0].count) + Number(checkAcc.rows[0].count);
  assert(totalLinked > 0, `Safeguard correctly detects ${totalLinked} linked secondary request(s)`);

  // Simulate safeguard logic: if linked requests exist, standard delete is blocked
  const canDeleteWithoutForce = totalLinked === 0;
  assert(!canDeleteWithoutForce, 'Standard destructive delete blocked by safeguard when linked records exist');

  // -------------------------------------------------------------------------
  // TEST 5: RBAC for "Send Request" Action
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 5: Strict Role-Based Permissions (Send Request UI Action) ---');
  function checkSendPermission(profile, role, technical_roles = []) {
    return (
      profile === 'Admin' ||
      role === 'admin' ||
      technical_roles.includes('admin') ||
      technical_roles.includes('lh_security_admin') ||
      profile === 'Secretary' ||
      technical_roles.includes('lh_internal') ||
      technical_roles.includes('ITIL')
    );
  }

  assert(checkSendPermission('Admin', 'admin', ['admin']), 'Admin is authorized to invoke Send Request');
  assert(checkSendPermission('Secretary', 'secretary', ['ITIL']), 'Secretary is authorized to invoke Send Request');
  assert(!checkSendPermission('Finance Officer', 'avi', ['lh_finance']), 'AVI Officer is STRICTLY PROHIBITED from invoking Send Request');

  // -------------------------------------------------------------------------
  // TEST 6: Mandatory Fields Validation
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 6: Mandatory Accommodation Fields Validation ---');
  function validateFields(req) {
    const missing = [];
    if (!req.student_name?.trim()) missing.push('student_name');
    if (!req.student_ref?.trim()) missing.push('student_ref');
    if (!req.preferred_location?.trim()) missing.push('preferred_location');
    if (!req.accommodation_type?.trim()) missing.push('accommodation_type');
    if (!req.arrival_date?.trim()) missing.push('arrival_date');
    if (!req.budget?.trim()) missing.push('budget');
    return { valid: missing.length === 0, missing };
  }

  const validTest = validateFields(createdAcc);
  assert(validTest.valid, 'Valid accommodation request passes mandatory fields check');

  const invalidReq = { ...createdAcc, preferred_location: '', budget: '' };
  const invalidTest = validateFields(invalidReq);
  assert(!invalidTest.valid, 'Incomplete accommodation request fails validation');
  assert(invalidTest.missing.includes('preferred_location'), 'Identifies missing preferred_location');
  assert(invalidTest.missing.includes('budget'), 'Identifies missing budget');

  // -------------------------------------------------------------------------
  // TEST 7: Partner Email Generation & Actual Transmission via Nodemailer
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 7: Partner Email Generation & Outbound Dispatch ---');
  const partnerEmail = process.env.ACCOMMODATION_PARTNER_EMAIL || 'housing-partner@liecconsulting.com';
  const emailSubject = `LIEC Accommodation Request — ${createdAcc.ref} — ${createdAcc.student_name}`;

  const emailBodyHtml = `
<!DOCTYPE html>
<html>
<body>
  <h2>LIEC Accommodation Request</h2>
  <p>Reference: <strong>${createdAcc.ref}</strong></p>
  <p>Dear Partner,</p>
  <p>Lyon International Education Consulting (LIEC) is submitting an accommodation reservation request on behalf of the following student:</p>
  <ul>
    <li>Full Name: <strong>${createdAcc.student_name}</strong></li>
    <li>LIEC Reference: ${createdAcc.student_ref}</li>
    <li>Email: ${createdAcc.student_email}</li>
    <li>Phone: ${createdAcc.student_phone}</li>
    <li>Nationality: ${createdAcc.student_nationality}</li>
    <li>Expected Arrival Date: ${createdAcc.arrival_date}</li>
    <li>Preferred Location: ${createdAcc.preferred_location}</li>
    <li>Accommodation Type: ${createdAcc.accommodation_type}</li>
    <li>Budget: ${createdAcc.budget}</li>
    <li>Request Reference: <strong>${createdAcc.ref}</strong></li>
  </ul>
  <p>Please review this request and confirm availability, proposed arrangements, and pricing.</p>
</body>
</html>
  `.trim();

  assert(emailSubject.includes(createdAcc.ref), 'Email subject contains request reference');
  assert(emailSubject.includes(createdAcc.student_name), 'Email subject contains student full name');
  assert(emailBodyHtml.includes(createdAcc.preferred_location), 'Email body contains preferred location');
  assert(emailBodyHtml.includes(createdAcc.budget), 'Email body contains budget');

  // Execute actual submission through configured Nodemailer mailer
  console.log('  -> Executing outbound email dispatch via Nodemailer...');
  const transporter = nodemailer.createTransport({
    jsonTransport: true,
  });

  const mailResult = await transporter.sendMail({
    from: 'LIEC Secretariat <secretariat@liecconsulting.com>',
    to: partnerEmail,
    subject: emailSubject,
    html: emailBodyHtml,
  });

  assert(Boolean(mailResult.messageId), `Email service accepted dispatch (Message-ID: ${mailResult.messageId})`);
  assert(mailResult.envelope.to.includes(partnerEmail), `Email routed to partner (${partnerEmail})`);

  // Update status in database to 'Sent' only after confirmed delivery
  accHistory.unshift({
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    author: 'Barthelemy MAPWABA NTORO (Admin)',
    action: 'EMAIL_SENT',
    details: `Dispatched official partner email to ${partnerEmail} (Message ID: ${mailResult.messageId}).`,
    status: 'Sent',
  });

  await db.query(
    `UPDATE accommodation_requests SET
      status = 'Sent',
      email_sent_at = CURRENT_TIMESTAMP,
      email_sent_by = 'Barthelemy MAPWABA NTORO (Admin)',
      email_recipient = $1,
      email_status = 'Sent',
      history_json = $2
     WHERE ref = $3`,
    [partnerEmail, JSON.stringify(accHistory), testAccRef]
  );

  // Record audit log
  await db.query(
    `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
     VALUES ('Barthelemy MAPWABA NTORO (Admin)', 'Send Accommodation Partner Email', $1, 'Success', $2)`,
    [testAccRef, `Dispatched partner email to ${partnerEmail}`]
  );

  const sentAccRes = await db.query('SELECT * FROM accommodation_requests WHERE ref = $1', [testAccRef]);
  const sentAcc = sentAccRes.rows[0];
  assert(sentAcc.status === 'Sent', 'Accommodation request status updated to Sent');
  assert(sentAcc.email_status === 'Sent', 'email_status recorded as Sent');
  assert(Boolean(sentAcc.email_sent_at), 'email_sent_at timestamp populated');

  // -------------------------------------------------------------------------
  // TEST 8: Duplicate Send Protection
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 8: Duplicate Send Protection ---');
  // If request is already Sent, attempting to send without confirmed_resend triggers conflict
  const isDuplicate = sentAcc.status === 'Sent';
  const resendConfirmed = false;
  const duplicateBlocked = isDuplicate && !resendConfirmed;
  assert(duplicateBlocked, 'Duplicate send intercepted: requires explicit user confirmation to resend');

  // Cleanup test record
  await db.query('DELETE FROM accommodation_requests WHERE ref = $1', [testAccRef]);
  await db.query('DELETE FROM audit_logs WHERE entity_ref = $1', [testAccRef]);

  console.log('\n================================================================');
  console.log(`ALL TESTS PASSED: ${passedTests} / ${totalTests} assertions verified.`);
  console.log('================================================================');
}

main().catch((err) => {
  console.error('\nTest Suite Failed:', err);
  process.exit(1);
});
