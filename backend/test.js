/**
 * Backend API & Authentication Test Suite (STEP 12)
 * Tests all REST endpoints, SQLite persistence, JWT authentication,
 * demo accounts, RBAC protections, status progression, and ownership isolation.
 */

import assert from 'node:assert';
import app from './server.js';

console.log('====================================================');
console.log('🧪 RUNNING SMARTPRINT AI STEP 12 AUTHENTICATION & API TESTS');
console.log('====================================================\n');

const TEST_PORT = 5099;
const BASE_URL = `http://localhost:${TEST_PORT}/api`;

const server = app.listen(TEST_PORT, async () => {
  try {
    // Helper fetch wrapper
    const api = async (endpoint, options = {}) => {
      const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
      if (options.token) {
        headers['Authorization'] = `Bearer ${options.token}`;
      }
      const res = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers
      });
      const data = await res.json().catch(() => ({}));
      return { status: res.status, data };
    };

    // Test 1: GET /api/health
    console.log('Test 1: Health Check endpoint');
    const health = await api('/health');
    assert.strictEqual(health.status, 200);
    assert.strictEqual(health.data.success, true);
    assert.ok(health.data.message.includes('SmartPrint AI backend is running'));
    console.log('✓ Health check passed.');

    // Test 2: Unauthenticated Request to Protected Route (Expect 401)
    console.log('\nTest 2: Protected route without token (401 Unauthorized)');
    const unauthJobs = await api('/print-jobs');
    assert.strictEqual(unauthJobs.status, 401, 'Should return 401 when no token is provided');
    assert.strictEqual(unauthJobs.data.success, false);
    console.log('✓ Unauthenticated request correctly rejected with 401.');

    // Test 3: Invalid login credentials (Expect 401)
    console.log('\nTest 3: Invalid email/password login test (401 Unauthorized)');
    const badLogin = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'student@smartprint.com',
        password: 'WrongPassword@999'
      })
    });
    assert.strictEqual(badLogin.status, 401, 'Should reject invalid credentials');
    assert.strictEqual(badLogin.data.success, false);
    console.log('✓ Invalid login credentials correctly rejected with 401.');

    // Test 4: Demo Student Login (student@smartprint.com / Student@123)
    console.log('\nTest 4: Demo Student Login (student@smartprint.com)');
    const studentLogin = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'student@smartprint.com',
        password: 'Student@123',
        role: 'student'
      })
    });
    assert.strictEqual(studentLogin.status, 200, 'Student login should succeed');
    assert.strictEqual(studentLogin.data.success, true);
    assert.ok(studentLogin.data.token, 'Should receive JWT token');
    assert.strictEqual(studentLogin.data.user.role, 'student');
    assert.strictEqual(studentLogin.data.user.email, 'student@smartprint.com');
    const studentToken = studentLogin.data.token;
    const studentUserId = studentLogin.data.user.id;
    console.log(`✓ Student logged in successfully. User ID: ${studentUserId}`);

    // Test 5: Demo Staff Login (staff@smartprint.com / Staff@123)
    console.log('\nTest 5: Demo Staff Login (staff@smartprint.com)');
    const staffLogin = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'staff@smartprint.com',
        password: 'Staff@123',
        role: 'staff'
      })
    });
    assert.strictEqual(staffLogin.status, 200, 'Staff login should succeed');
    assert.strictEqual(staffLogin.data.success, true);
    assert.ok(staffLogin.data.token, 'Should receive JWT token');
    assert.strictEqual(staffLogin.data.user.role, 'staff');
    assert.strictEqual(staffLogin.data.user.email, 'staff@smartprint.com');
    const staffToken = staffLogin.data.token;
    console.log(`✓ Staff logged in successfully. User ID: ${staffLogin.data.user.id}`);

    // Test 6: GET /api/auth/me (Current User Profile Verification)
    console.log('\nTest 6: GET /api/auth/me (Current User Endpoint)');
    const meRes = await api('/auth/me', { token: studentToken });
    assert.strictEqual(meRes.status, 200);
    assert.strictEqual(meRes.data.success, true);
    assert.strictEqual(meRes.data.user.email, 'student@smartprint.com');
    assert.strictEqual(meRes.data.user.role, 'student');
    console.log('✓ /api/auth/me returned correct verified user profile.');

    // Test 7: Student attempting Staff API (Expect 403 Forbidden)
    console.log('\nTest 7: Student accessing Staff API (403 Forbidden check)');
    const studentAccessingStaff = await api('/students', { token: studentToken });
    assert.strictEqual(studentAccessingStaff.status, 403, 'Student should be forbidden from staff students list');
    assert.strictEqual(studentAccessingStaff.data.success, false);
    console.log('✓ Student access to staff API correctly rejected with 403.');

    // Test 8: Staff accessing Staff API (Expect 200 OK)
    console.log('\nTest 8: Staff accessing Staff API (200 OK check)');
    const staffAccessingStaff = await api('/students', { token: staffToken });
    assert.strictEqual(staffAccessingStaff.status, 200, 'Staff should be allowed to view all students');
    assert.strictEqual(staffAccessingStaff.data.success, true);
    assert.ok(Array.isArray(staffAccessingStaff.data.data));
    console.log(`✓ Staff successfully retrieved ${staffAccessingStaff.data.data.length} students.`);

    // Test 9: Register a New Student via POST /api/auth/register
    console.log('\nTest 9: POST /api/auth/register (New User Registration)');
    const regEmail = `test_reg_${Date.now()}@smartprint.com`;
    const regRes = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Automated Test Student',
        email: regEmail,
        password: 'Password@123',
        role: 'student'
      })
    });
    assert.strictEqual(regRes.status, 201, 'Registration should return 201');
    assert.strictEqual(regRes.data.success, true);
    assert.ok(regRes.data.token, 'Should receive token upon registration');
    const newStudentToken = regRes.data.token;
    const newStudentId = regRes.data.user.id;
    console.log(`✓ New student registered with ID: ${newStudentId}`);

    // Test 10: Create Print Job as Student
    console.log('\nTest 10: POST /api/print-jobs (Create authenticated print job)');
    const createJobRes = await api('/print-jobs', {
      method: 'POST',
      token: newStudentToken,
      body: JSON.stringify({
        file_name: 'Auth_Step12_Report.pdf',
        copies: 2,
        print_type: 'Colour',
        page_range: '1-5'
      })
    });
    assert.strictEqual(createJobRes.status, 201);
    assert.strictEqual(createJobRes.data.success, true);
    const createdJob = createJobRes.data.data;
    assert.strictEqual(createdJob.student_id, newStudentId, 'Job must be linked to authenticated student ID');
    assert.strictEqual(createdJob.status, 'Received');
    console.log(`✓ Print job created: ID ${createdJob.id}, Student: ${createdJob.student_id}`);

    // Test 11: Student Isolation - Another student cannot view created job
    console.log('\nTest 11: Ownership Isolation - Student 1 cannot view Student 2 job');
    const otherStudentView = await api(`/print-jobs/${createdJob.id}`, { token: studentToken });
    assert.strictEqual(otherStudentView.status, 403, 'Should forbid viewing other student print job');
    console.log('✓ Cross-student job access denied with 403.');

    // Test 12: Staff Status Advancement (Staff only)
    console.log('\nTest 12: Staff Status Advancement (Received -> Processing -> Printing -> Ready -> Collected)');
    
    // First, test student trying to change status (Expect 403)
    const studentStatusAttempt = await api(`/print-jobs/${createdJob.id}/status`, {
      method: 'PATCH',
      token: newStudentToken,
      body: JSON.stringify({ status: 'Processing' })
    });
    assert.strictEqual(studentStatusAttempt.status, 403, 'Student cannot change print job status');
    console.log('✓ Student prevented from modifying status (403).');

    // Staff modifies status
    const toProcessing = await api(`/print-jobs/${createdJob.id}/status`, {
      method: 'PATCH',
      token: staffToken,
      body: JSON.stringify({ status: 'Processing' })
    });
    assert.strictEqual(toProcessing.status, 200);
    assert.strictEqual(toProcessing.data.data.status, 'Processing');

    const toPrinting = await api(`/print-jobs/${createdJob.id}/status`, {
      method: 'PATCH',
      token: staffToken,
      body: JSON.stringify({ status: 'Printing' })
    });
    assert.strictEqual(toPrinting.status, 200);
    assert.strictEqual(toPrinting.data.data.status, 'Printing');

    const toReady = await api(`/print-jobs/${createdJob.id}/status`, {
      method: 'PATCH',
      token: staffToken,
      body: JSON.stringify({ status: 'Ready' })
    });
    assert.strictEqual(toReady.status, 200);
    assert.strictEqual(toReady.data.data.status, 'Ready');

    const toCollected = await api(`/print-jobs/${createdJob.id}/status`, {
      method: 'PATCH',
      token: staffToken,
      body: JSON.stringify({ status: 'Collected' })
    });
    assert.strictEqual(toCollected.status, 200);
    assert.strictEqual(toCollected.data.data.status, 'Collected');
    console.log('✓ Staff advanced status successfully through full lifecycle.');

    // Test 13: Student Notifications (Owner isolation)
    console.log('\nTest 13: Student Notifications Retrieval & Read State');
    const notifsRes = await api(`/students/${newStudentId}/notifications`, { token: newStudentToken });
    assert.strictEqual(notifsRes.status, 200);
    assert.ok(Array.isArray(notifsRes.data.data));
    assert.ok(notifsRes.data.data.length >= 4, 'Should have received automatic notifications for status updates');
    console.log(`✓ Retrieved ${notifsRes.data.data.length} automatic notifications.`);

    // Test 14: Logout endpoint
    console.log('\nTest 14: POST /api/auth/logout');
    const logoutRes = await api('/auth/logout', { method: 'POST', token: newStudentToken });
    assert.strictEqual(logoutRes.status, 200);
    assert.strictEqual(logoutRes.data.success, true);
    console.log('✓ Logout endpoint returned 200 OK.');

    console.log('\n====================================================');
    console.log('🎉 ALL STEP 12 BACKEND AUTH & REST API TESTS PASSED!');
    console.log('====================================================\n');

    server.close();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Backend Auth Test Failure:', err);
    server.close();
    process.exit(1);
  }
});
