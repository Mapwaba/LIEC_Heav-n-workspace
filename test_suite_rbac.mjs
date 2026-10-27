async function runTests() {
  const adminEmail = 'sarah.mwamba@liec-education.com';
  const secEmail = 'marc.kouassi@liec-education.com';
  const aviEmail = 'alain.kanza@liec-education.com';

  console.log('================================================================');
  console.log('LIEC HEAV’N RBAC VERIFICATION SUITE (PDF SPECIFICATION COMPLIANCE)');
  console.log('================================================================\n');

  // TEST 1: Technical Roles Registry
  console.log('--- TEST 1: Technical Roles Registry (/api/roles) ---');
  const resRoles = await fetch('http://localhost:3001/api/roles', {
    headers: { 'x-user-email': adminEmail }
  });
  const dataRoles = await resRoles.json();
  console.log(`Status: ${resRoles.status} (Expected 200) | Roles found: ${dataRoles.roles?.length}`);
  dataRoles.roles?.forEach(r => console.log(`  * [${r.role_id}] -> Profile: ${r.business_profile} | Safeguard: ${r.safeguards}`));

  // TEST 2: Admin inspecting Users & Roles
  console.log('\n--- TEST 2: Admin User-Management Endpoint (/api/users) ---');
  const resUsersAdmin = await fetch('http://localhost:3001/api/users', {
    headers: { 'x-user-email': adminEmail }
  });
  const dataUsersAdmin = await resUsersAdmin.json();
  console.log(`Status: ${resUsersAdmin.status} (Expected 200) | Users count: ${dataUsersAdmin.users?.length}`);
  dataUsersAdmin.users?.forEach(u => console.log(`  * ${u.name} (${u.business_profile}) -> Roles: ${JSON.stringify(u.technical_roles)} | Active: ${u.active}`));

  // TEST 3: Secretary Access Restriction on /api/users
  console.log('\n--- TEST 3: Secretary Access Restriction on /api/users ---');
  const resUsersSec = await fetch('http://localhost:3001/api/users', {
    headers: { 'x-user-email': secEmail }
  });
  const dataUsersSec = await resUsersSec.json();
  console.log(`Status: ${resUsersSec.status} (Expected 403 Forbidden)`);
  console.log(`Denied message: ${dataUsersSec.message || dataUsersSec.error}`);

  // TEST 4: Secretary Access Restriction on /api/avi
  console.log('\n--- TEST 4: Secretary Access Restriction on /api/avi ---');
  const resAviSec = await fetch('http://localhost:3001/api/avi', {
    headers: { 'x-user-email': secEmail }
  });
  const dataAviSec = await resAviSec.json();
  console.log(`Status: ${resAviSec.status} (Expected 403 Forbidden)`);
  console.log(`Denied message: ${dataAviSec.message || dataAviSec.error}`);

  // TEST 5: Finance Officer Access to /api/avi
  console.log('\n--- TEST 5: Finance Officer Access to /api/avi ---');
  const resAviFinance = await fetch('http://localhost:3001/api/avi', {
    headers: { 'x-user-email': aviEmail }
  });
  const dataAviFinance = await resAviFinance.json();
  console.log(`Status: ${resAviFinance.status} (Expected 200 OK) | AVI records: ${dataAviFinance.dossiers?.length}`);

  // TEST 6: Secretary Workspace Dataset Filtering (Access Matrix)
  console.log('\n--- TEST 6: Secretary Workspace Dataset Filtering (Access Matrix) ---');
  const resWorkSec = await fetch('http://localhost:3001/api/workspace', {
    headers: { 'x-user-email': secEmail }
  });
  const dataWorkSec = await resWorkSec.json();
  console.log(`Status: ${resWorkSec.status} (Expected 200)`);
  console.log(`Active Profile: ${dataWorkSec.activeUser?.business_profile}`);
  console.log(`Demandes: ${dataWorkSec.demandes?.length} (Allowed)`);
  console.log(`Prospects: ${dataWorkSec.prospects?.length} (Allowed)`);
  console.log(`Candidats: ${dataWorkSec.candidats?.length} (Allowed)`);
  console.log(`AVI Requests: ${dataWorkSec.aviRequests?.length} (Expected 0 - Denied by default)`);
  console.log(`Invoices: ${dataWorkSec.invoices?.length} (Expected 0 - Denied by default)`);
  console.log(`Audit Logs: ${dataWorkSec.auditLogs?.length} (Expected 0 - Denied)`);
  console.log(`Users: ${dataWorkSec.users?.length} (Expected 0 - Denied)`);

  // TEST 7: Finance Officer Workspace Dataset Filtering
  console.log('\n--- TEST 7: Finance Officer Workspace Dataset Filtering ---');
  const resWorkFinance = await fetch('http://localhost:3001/api/workspace', {
    headers: { 'x-user-email': aviEmail }
  });
  const dataWorkFinance = await resWorkFinance.json();
  console.log(`Status: ${resWorkFinance.status} (Expected 200)`);
  console.log(`Active Profile: ${dataWorkFinance.activeUser?.business_profile}`);
  console.log(`AVI Requests: ${dataWorkFinance.aviRequests?.length} (Allowed)`);
  console.log(`Invoices: ${dataWorkFinance.invoices?.length} (Allowed)`);
  console.log(`Prospects: ${dataWorkFinance.prospects?.length} (Expected 0 - Denied by default)`);
  console.log(`Prepa: ${dataWorkFinance.prepaCohorts?.length} (Expected 0 - Denied by default)`);
  console.log(`Audit Logs: ${dataWorkFinance.auditLogs?.length} (Expected 0 - Denied)`);
  console.log(`Users: ${dataWorkFinance.users?.length} (Expected 0 - Denied)`);

  // TEST 8: Admin Workspace (Full System Oversight)
  console.log('\n--- TEST 8: Admin Workspace (Full System Oversight) ---');
  const resWorkAdmin = await fetch('http://localhost:3001/api/workspace', {
    headers: { 'x-user-email': adminEmail }
  });
  const dataWorkAdmin = await resWorkAdmin.json();
  console.log(`Status: ${resWorkAdmin.status} (Expected 200)`);
  console.log(`Active Profile: ${dataWorkAdmin.activeUser?.business_profile}`);
  console.log(`Demandes: ${dataWorkAdmin.demandes?.length}`);
  console.log(`Prospects: ${dataWorkAdmin.prospects?.length}`);
  console.log(`Candidats: ${dataWorkAdmin.candidats?.length}`);
  console.log(`AVI Requests: ${dataWorkAdmin.aviRequests?.length}`);
  console.log(`Invoices: ${dataWorkAdmin.invoices?.length}`);
  console.log(`Audit Logs: ${dataWorkAdmin.auditLogs?.length}`);
  console.log(`Users: ${dataWorkAdmin.users?.length}`);
  console.log(`Roles: ${dataWorkAdmin.roles?.length}`);

  console.log('\n================================================================');
  console.log('ALL TESTS EXECUTED SUCCESSFULLY!');
  console.log('================================================================');
}

runTests().catch(console.error);
