/**
 * STEP 14 Final End-to-End & Integration Test Suite for SmartPrint AI
 * Comprehensive validation of:
 * - Backend Health & SQLite Database persistence
 * - Student End-to-End lifecycle (login, job creation, wait time, queue position, AI queries, notifications, logout)
 * - Staff End-to-End lifecycle (login, queue visibility, status advancement, AI queue analysis, job priority, logout)
 * - Student <-> Staff real-time workflow without manual DB edits
 * - RBAC Authorization & Security Isolation (401 unauth, 403 forbidden, password hashing)
 * - AI Intelligence Services (Waiting Time, Queue Analysis, Smart Job Prioritization, AI Assistant)
 */

import assert from 'node:assert';
import app from '../../backend/server.js';
import { authService } from './authService.js';
import { apiService } from './apiService.js';
import { printService } from './printService.js';
import { notificationService } from './notificationService.js';
import { getAIResponse, detectIntent } from './aiAssistantService.js';
import { calculateEstimatedWaitTime, getActiveQueue } from './waitingTimeService.js';
import { analyzeQueue, calculateJobPriority } from './queueAnalysisService.js';
import db from '../../backend/database/database.js';

console.log('====================================================');
console.log('🧪 RUNNING SMARTPRINT AI STEP 14 FINAL E2E TEST SUITE');
console.log('====================================================\n');

const TEST_PORT = 5088;
const TEST_BASE_URL = `http://127.0.0.1:${TEST_PORT}/api`;

apiService.baseUrl = TEST_BASE_URL;
authService.baseUrl = TEST_BASE_URL;
if (typeof window !== 'undefined') {
  window.__API_BASE_URL__ = TEST_BASE_URL;
}

const server = app.listen(TEST_PORT, '127.0.0.1', async () => {
  try {
    // ----------------------------------------------------
    // Section 1: Backend Health Check
    // ----------------------------------------------------
    console.log('--- SECTION 1: BACKEND HEALTH & REST APIS ---');
    const isHealthy = await apiService.checkHealth();
    assert.strictEqual(isHealthy, true, 'Backend server should report healthy');
    console.log('✓ GET /api/health returned healthy status.');

    // ----------------------------------------------------
    // Section 2: Security & Authentication Verification
    // ----------------------------------------------------
    console.log('\n--- SECTION 2: AUTHENTICATION & SECURITY ISOLATION ---');
    
    // 2.1 Unauthenticated request rejection
    let unauthCaught = false;
    try {
      await apiService.getPrintJobs();
    } catch {
      unauthCaught = true;
    }
    assert.strictEqual(unauthCaught, true, 'Unauthenticated request should throw error');
    console.log('✓ Unauthenticated requests rejected (401 Guard).');

    // 2.2 Invalid credentials rejection
    let badLoginFailed = false;
    try {
      await authService.login({ email: 'student@smartprint.com', password: 'BadPassword@999', role: 'student' });
    } catch {
      badLoginFailed = true;
    }
    assert.strictEqual(badLoginFailed, true, 'Invalid password should fail');
    console.log('✓ Invalid login credentials rejected.');

    // 2.3 Password Hash verification (No plain text in database)
    const userRow = db.prepare('SELECT password_hash FROM users WHERE email = ?').get('student@smartprint.com');
    assert.ok(userRow && userRow.password_hash, 'User must have a password hash');
    assert.ok(userRow.password_hash.startsWith('$2'), 'Password must be hashed with bcrypt');
    assert.ok(!userRow.password_hash.includes('Student@123'), 'Plain text password must NEVER be in database');
    console.log('✓ Passwords verified securely hashed with bcrypt in SQLite.');

    // ----------------------------------------------------
    // Section 3: Student End-to-End Workflow
    // ----------------------------------------------------
    console.log('\n--- SECTION 3: STUDENT END-TO-END WORKFLOW ---');
    
    // 3.1 Student Login
    const studentAuth = await authService.login({
      email: 'student@smartprint.com',
      password: 'Student@123',
      role: 'student'
    });
    assert.strictEqual(studentAuth.success, true);
    assert.ok(studentAuth.token, 'Token must be issued');
    assert.strictEqual(studentAuth.user.role, 'student');
    const studentId = studentAuth.user.id;
    console.log(`✓ Student login successful: ${studentAuth.user.name} (${studentId}).`);

    // 3.2 Create New Print Request
    const testDocName = `Final_Immersion_Project_${Date.now()}.pdf`;
    const newJob = await printService.addPrintJob({
      fileName: testDocName,
      documentName: testDocName,
      copies: 3,
      printType: 'Colour',
      pageRange: '1-15',
      paperSize: 'A4',
      bindingOption: 'Spiral',
      student: studentAuth.user.name,
      studentId: studentId
    });

    assert.ok(newJob && newJob.id, 'Job should be created');
    assert.strictEqual(newJob.status, 'Received');
    assert.strictEqual(newJob.copies, 3);
    assert.ok(newJob.pickupPin && newJob.pickupPin.length === 4, 'Pickup PIN must be 4 digits');
    console.log(`✓ Print Job created: ID ${newJob.id} | PIN: ${newJob.pickupPin} | Status: ${newJob.status}`);

    // 3.3 Verify Student Dashboard Isolation (Student only sees their jobs)
    const studentJobs = await printService.fetchStudentJobs(studentId);
    assert.ok(studentJobs.some(j => j.id === newJob.id), 'New job must be in student list');
    assert.ok(studentJobs.every(j => j.studentId === studentId), 'Student must only see their own jobs');
    console.log(`✓ Student jobs loaded (${studentJobs.length} jobs). Ownership strictly enforced.`);

    // 3.4 Waiting Time Prediction & Queue Position Calculation
    const studentPred = calculateEstimatedWaitTime(newJob, studentJobs);
    assert.ok(studentPred.queuePosition >= 1, 'Queue position should be >= 1');
    assert.ok(studentPred.estimatedMinutes >= 1, 'Estimated minutes should be >= 1');
    console.log(`✓ Queue Position: #${studentPred.queuePosition} | Estimated Turnaround: ${studentPred.formattedWaitTime}`);

    // 3.5 AI Assistant Student Queries
    console.log('\n--- SECTION 4: AI ASSISTANT & INTENT VERIFICATION ---');
    const queries = [
      { q: 'Where is my print?', expectedIntent: 'STATUS' },
      { q: 'What is my print status?', expectedIntent: 'STATUS' },
      { q: 'Is my print ready?', expectedIntent: 'READY_CHECK' },
      { q: 'How long will my print take?', expectedIntent: 'WAITING_TIME' },
      { q: 'What is my queue position?', expectedIntent: 'QUEUE_POSITION' },
      { q: 'Show my active print jobs.', expectedIntent: 'MY_JOBS' },
      { q: 'How does the printing process work?', expectedIntent: 'GENERAL_HOW_IT_WORKS' }
    ];

    for (const item of queries) {
      const detected = detectIntent(item.q);
      const reply = getAIResponse(item.q, studentJobs, studentJobs);
      assert.strictEqual(detected, item.expectedIntent, `Intent mismatch for "${item.q}"`);
      assert.ok(reply && reply.length > 5, `Response empty for "${item.q}"`);
      console.log(`✓ Q: "${item.q}" -> Intent: [${detected}]`);
      console.log(`   A: "${reply.split('\n')[0]}"`);
    }

    // 3.6 Student Notifications
    const studentNotifs = await notificationService.fetchNotifications(studentId);
    assert.ok(Array.isArray(studentNotifs) && studentNotifs.length > 0);
    console.log(`✓ Student received ${studentNotifs.length} real-time notifications.`);

    // ----------------------------------------------------
    // Section 5: Staff End-to-End Workflow & Status Lifecycle
    // ----------------------------------------------------
    console.log('\n--- SECTION 5: STAFF END-TO-END WORKFLOW & STATUS LIFECYCLE ---');
    
    // 5.1 Staff Login
    const staffAuth = await authService.login({
      email: 'staff@smartprint.com',
      password: 'Staff@123',
      role: 'staff'
    });
    assert.strictEqual(staffAuth.success, true);
    assert.strictEqual(staffAuth.user.role, 'staff');
    console.log(`✓ Staff login successful: ${staffAuth.user.name}.`);

    // 5.2 Staff Queue Inspection
    const { activeJobs } = await printService.fetchPrintJobs();
    assert.ok(activeJobs.some(j => j.id === newJob.id), 'Submitted job must appear in staff queue');
    console.log(`✓ Staff loaded full campus queue (${activeJobs.length} active jobs).`);

    // 5.3 AI Queue Analysis Check
    const queueAnalysis = analyzeQueue(activeJobs);
    assert.ok(['Low', 'Moderate', 'High'].includes(queueAnalysis.currentWorkload));
    assert.ok(queueAnalysis.totalActiveJobs > 0);
    assert.ok(Array.isArray(queueAnalysis.insights) && queueAnalysis.insights.length > 0);
    console.log(`✓ AI-Assisted Queue Analysis: Workload [${queueAnalysis.currentWorkload}], Average Wait [${queueAnalysis.averageWaitingTime}]`);
    console.log(`   Dynamic Insight: "${queueAnalysis.insights[1] || queueAnalysis.insights[0]}"`);

    // 5.4 Smart Job Priority Check
    const priorityInfo = calculateJobPriority(newJob, activeJobs);
    assert.ok(['High', 'Medium', 'Normal'].includes(priorityInfo.priority));
    assert.ok(priorityInfo.reason && priorityInfo.reason.length > 0);
    console.log(`✓ Smart Job Priority recommendation: [${priorityInfo.priority}] — "${priorityInfo.reason}"`);

    // 5.5 Step-by-Step Status Advancement Flow
    console.log('\n--- SECTION 6: CROSS-ROLE REAL-TIME STATUS PROGRESSION ---');
    const stages = ['Processing', 'Printing', 'Ready', 'Collected'];
    for (const stage of stages) {
      const updated = await printService.updatePrintJobStatus(newJob.id, stage);
      assert.strictEqual(updated.status, stage, `Job status should advance to ${stage}`);
      console.log(`✓ Staff progressed Job ${newJob.id} -> ${stage}`);
    }

    // 5.6 Verify Final Notification on Ready/Collected
    const finalNotifs = await notificationService.fetchNotifications(studentId);
    const readyNotif = finalNotifs.find(n => n.title.includes('Ready') || n.status === 'Ready');
    assert.ok(readyNotif, 'Student must receive Print Ready notification');
    console.log(`✓ Student received "Print Ready" alert: "${readyNotif.message}"`);

    // ----------------------------------------------------
    // Section 7: RBAC & Protected Access Verification
    // ----------------------------------------------------
    console.log('\n--- SECTION 7: ACCESS CONTROL & LOGOUT ---');
    
    // Switch back to Student to verify Staff API Blocking
    await authService.login({ email: 'student@smartprint.com', password: 'Student@123', role: 'student' });
    let staffBlocked = false;
    try {
      await apiService.getStudents();
    } catch {
      staffBlocked = true;
    }
    assert.strictEqual(staffBlocked, true, 'Student must be blocked from calling Staff Students API');
    console.log('✓ Student correctly blocked from staff endpoints (403 Forbidden).');

    // Logout
    await authService.logout();
    assert.strictEqual(authService.isAuthenticated(), false);
    assert.strictEqual(authService.getToken(), null);
    console.log('✓ Session terminated & authentication state cleared on logout.');

    console.log('\n====================================================');
    console.log('🎉 ALL STEP 14 FINAL E2E & INTEGRATION TESTS PASSED!');
    console.log('====================================================\n');

    server.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ E2E Integration Test Failure:', error);
    server.close();
    process.exit(1);
  }
});

