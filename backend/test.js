/**
 * Backend API Integration Test Suite (STEP 10)
 * Tests all REST endpoints, SQLite persistence, status progression,
 * validation errors, and automatic status notification creation.
 */

import assert from 'node:assert';
import app from './server.js';

console.log('====================================================');
console.log('🧪 RUNNING SMARTPRINT AI BACKEND API TEST SUITE');
console.log('====================================================\n');

const TEST_PORT = 5099;
const BASE_URL = `http://localhost:${TEST_PORT}/api`;

const server = app.listen(TEST_PORT, async () => {
  try {
    // Helper fetch wrapper
    const api = async (endpoint, options = {}) => {
      const res = await fetch(`${BASE_URL}${endpoint}`, {
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
        ...options
      });
      const data = await res.json();
      return { status: res.status, data };
    };

    // Test 1: GET /api/health
    console.log('Test 1: Health Check endpoint');
    const health = await api('/health');
    assert.strictEqual(health.status, 200);
    assert.strictEqual(health.data.success, true);
    assert.ok(health.data.message.includes('SmartPrint AI backend is running'));
    console.log('✓ Health check passed.');

    // Test 2: GET /api/students
    console.log('\nTest 2: GET /api/students');
    const studentsRes = await api('/students');
    assert.strictEqual(studentsRes.status, 200);
    assert.strictEqual(studentsRes.data.success, true);
    assert.ok(Array.isArray(studentsRes.data.data));
    assert.ok(studentsRes.data.data.length >= 3, 'Must have at least initial seeded students');
    console.log(`✓ Loaded ${studentsRes.data.data.length} students.`);

    // Test 3: POST /api/students (Create student)
    console.log('\nTest 3: POST /api/students');
    const testId = `STD-TEST-${Date.now()}`;
    const testEmail = `teststudent_${Date.now()}@college.edu`;
    const newStudent = await api('/students', {
      method: 'POST',
      body: JSON.stringify({
        id: testId,
        name: 'Integration Test Student',
        email: testEmail
      })
    });
    assert.strictEqual(newStudent.status, 201);
    assert.strictEqual(newStudent.data.success, true);
    assert.strictEqual(newStudent.data.data.id, testId);
    console.log('✓ Student registration passed.');

    // Test 4: GET /api/students/:id
    console.log('\nTest 4: GET /api/students/:id');
    const singleStudent = await api(`/students/${testId}`);
    assert.strictEqual(singleStudent.status, 200);
    assert.strictEqual(singleStudent.data.data.name, 'Integration Test Student');
    console.log('✓ Single student retrieval passed.');

    // Test 5: GET /api/print-jobs
    console.log('\nTest 5: GET /api/print-jobs');
    const jobsRes = await api('/print-jobs');
    assert.strictEqual(jobsRes.status, 200);
    assert.ok(Array.isArray(jobsRes.data.data));
    console.log(`✓ Loaded ${jobsRes.data.data.length} total print jobs.`);

    // Test 6: POST /api/print-jobs (Create print job)
    console.log('\nTest 6: POST /api/print-jobs');
    const createdJobRes = await api('/print-jobs', {
      method: 'POST',
      body: JSON.stringify({
        student_id: testId,
        file_name: 'Backend_Verification_Report.pdf',
        copies: 2,
        print_type: 'Colour',
        page_range: '1-10'
      })
    });
    assert.strictEqual(createdJobRes.status, 201);
    assert.strictEqual(createdJobRes.data.success, true);
    const createdJob = createdJobRes.data.data;
    assert.strictEqual(createdJob.status, 'Received');
    assert.strictEqual(createdJob.file_name, 'Backend_Verification_Report.pdf');
    console.log(`✓ Print job created with ID: ${createdJob.id}, status: ${createdJob.status}`);

    // Test 7: Verify Automatic 'Received' notification created
    console.log('\nTest 7: Automatic Received notification check');
    const notifsAfterCreate = await api(`/students/${testId}/notifications`);
    assert.strictEqual(notifsAfterCreate.status, 200);
    assert.ok(notifsAfterCreate.data.data.length >= 1);
    const receivedNotif = notifsAfterCreate.data.data[0];
    assert.strictEqual(receivedNotif.title, 'Print Request Received');
    assert.ok(receivedNotif.message.includes('Backend_Verification_Report.pdf'));
    console.log(`✓ Received notification verified: "${receivedNotif.title}" - "${receivedNotif.message}"`);

    // Test 8: Status Transitions: Received -> Processing -> Printing -> Ready -> Collected
    console.log('\nTest 8: Full Status Progression & Notification Triggers');

    // 8a: Received -> Processing
    const toProcessing = await api(`/print-jobs/${createdJob.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'Processing' })
    });
    assert.strictEqual(toProcessing.status, 200);
    assert.strictEqual(toProcessing.data.data.status, 'Processing');

    // 8b: Processing -> Printing
    const toPrinting = await api(`/print-jobs/${createdJob.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'Printing' })
    });
    assert.strictEqual(toPrinting.status, 200);
    assert.strictEqual(toPrinting.data.data.status, 'Printing');

    // 8c: Printing -> Ready
    const toReady = await api(`/print-jobs/${createdJob.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'Ready' })
    });
    assert.strictEqual(toReady.status, 200);
    assert.strictEqual(toReady.data.data.status, 'Ready');

    // 8d: Ready -> Collected
    const toCollected = await api(`/print-jobs/${createdJob.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'Collected' })
    });
    assert.strictEqual(toCollected.status, 200);
    assert.strictEqual(toCollected.data.data.status, 'Collected');
    console.log('✓ All 4 status transitions succeeded.');

    // Test 9: Verify all corresponding notifications exist
    console.log('\nTest 9: Verify all status notifications created in DB');
    const allNotifs = await api(`/students/${testId}/notifications`);
    const titles = allNotifs.data.data.map(n => n.title);
    assert.ok(titles.includes('Print Request Received'));
    assert.ok(titles.includes('Print Request Processing'));
    assert.ok(titles.includes('Print Job Printing'));
    assert.ok(titles.includes('Print Ready'));
    assert.ok(titles.includes('Print Collected'));
    console.log('✓ All 5 automatic status notifications verified in SQLite DB.');

    // Test 10: Invalid Status Transition Rejection
    console.log('\nTest 10: Invalid Status Transition Validation');
    const invalidTrans = await api(`/print-jobs/${createdJob.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'Printing' }) // Collected -> Printing is invalid
    });
    assert.strictEqual(invalidTrans.status, 400);
    assert.strictEqual(invalidTrans.data.success, false);
    console.log(`✓ Invalid status transition rejected correctly: "${invalidTrans.data.message}"`);

    // Test 11: Mark Single Notification as Read
    console.log('\nTest 11: PATCH /api/notifications/:id/read');
    const topNotifId = allNotifs.data.data[0].id;
    const markReadRes = await api(`/notifications/${topNotifId}/read`, { method: 'PATCH' });
    assert.strictEqual(markReadRes.status, 200);
    assert.strictEqual(markReadRes.data.data.read, true);
    console.log('✓ Single notification mark as read passed.');

    // Test 12: Mark All Notifications as Read
    console.log('\nTest 12: PATCH /api/students/:studentId/notifications/read-all');
    const markAllRes = await api(`/students/${testId}/notifications/read-all`, { method: 'PATCH' });
    assert.strictEqual(markAllRes.status, 200);
    const afterMarkAll = await api(`/students/${testId}/notifications`);
    const unreadCount = afterMarkAll.data.data.filter(n => !n.read).length;
    assert.strictEqual(unreadCount, 0);
    console.log('✓ Mark all notifications as read passed.');

    // Test 13: DELETE /api/students/:studentId/notifications (Clear)
    console.log('\nTest 13: DELETE /api/students/:studentId/notifications');
    const clearRes = await api(`/students/${testId}/notifications`, { method: 'DELETE' });
    assert.strictEqual(clearRes.status, 200);
    const afterClear = await api(`/students/${testId}/notifications`);
    assert.strictEqual(afterClear.data.data.length, 0);
    console.log('✓ Clear notifications passed.');

    console.log('\n====================================================');
    console.log('🎉 ALL BACKEND API & SQLITE TESTS PASSED!');
    console.log('====================================================\n');

    server.close();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Test Failure:', err);
    server.close();
    process.exit(1);
  }
});
