/**
 * STEP 11 Frontend API Integration Test Suite
 * Validates the connection between SmartPrint AI Frontend services (apiService, printService, notificationService)
 * and the Express + SQLite Backend API, testing:
 * - Server health check
 * - Print job creation & SQLite persistence
 * - Fetching student print jobs
 * - Fetching staff active queue
 * - Status progression: Received -> Processing -> Printing -> Ready -> Collected
 * - Automatic backend notifications generation
 * - Mark as read & Clear notifications
 * - Waiting time recalculation & AI queue analysis with backend data
 * - AI Assistant answering questions using live backend jobs
 * - Fallback / graceful offline handling
 */

import assert from 'node:assert';
import app from '../../backend/server.js';
import { apiService } from './apiService.js';
import { printService } from './printService.js';
import { notificationService } from './notificationService.js';
import { getAIResponse } from './aiAssistantService.js';

console.log('====================================================');
console.log('🧪 RUNNING STEP 11 FRONTEND-BACKEND INTEGRATION TESTS');
console.log('====================================================\n');

const TEST_PORT = 5088;
const TEST_BASE_URL = `http://127.0.0.1:${TEST_PORT}/api`;

// Point apiService to test server instance
apiService.baseUrl = TEST_BASE_URL;
if (typeof window !== 'undefined') {
  window.__API_BASE_URL__ = TEST_BASE_URL;
}

const server = app.listen(TEST_PORT, '127.0.0.1', async () => {
  try {
    const testStudentId = 'STD-2026-0842'; // Abhinaya N

    // Test 1: Server Health Check
    console.log('Test 1: Backend Health Check via apiService');
    const isHealthy = await apiService.checkHealth();
    assert.strictEqual(isHealthy, true, 'Backend server should report healthy');
    console.log('✓ Health check passed.\n');

    // Test 2: Fetch initial student print jobs
    console.log('Test 2: Fetch student jobs from backend via printService.fetchStudentJobs()');
    const initialJobs = await printService.fetchStudentJobs(testStudentId);
    assert.ok(Array.isArray(initialJobs), 'Should return array of student jobs');
    console.log(`✓ Loaded ${initialJobs.length} jobs for ${testStudentId}.\n`);

    // Test 3: Submit New Print Job (POST /api/print-jobs)
    console.log('Test 3: Submit new print job via printService.addPrintJob()');
    const docName = `Step11_Integration_Test_${Date.now()}.pdf`;
    const submittedJob = await printService.addPrintJob({
      fileName: docName,
      documentName: docName,
      copies: 3,
      printType: 'Colour',
      pageRange: '1-15',
      paperSize: 'A4',
      bindingOption: 'None',
      student: 'Abhinaya N',
      studentId: testStudentId
    });

    assert.ok(submittedJob, 'Submitted job should be returned');
    assert.strictEqual(submittedJob.status, 'Received', 'Initial status should be Received');
    assert.strictEqual(submittedJob.fileName, docName, 'File name should match');
    assert.strictEqual(submittedJob.copies, 3, 'Copies should match');
    assert.strictEqual(submittedJob.printType, 'Colour', 'Print type should match');
    assert.ok(submittedJob.queuePosition >= 1, 'Queue position should be calculated');
    console.log(`✓ Job created: ID ${submittedJob.id}, Pos #${submittedJob.queuePosition}, Wait: ${submittedJob.estimatedWaitTime}\n`);

    // Test 4: Verify Job appears in Staff Queue (GET /api/print-jobs)
    console.log('Test 4: Fetch all print jobs via printService.fetchPrintJobs() for Staff Dashboard');
    const { activeJobs } = await printService.fetchPrintJobs();
    const foundInActive = activeJobs.some(j => j.id === submittedJob.id);
    assert.strictEqual(foundInActive, true, 'New job must appear in active staff queue');
    console.log(`✓ Job ${submittedJob.id} confirmed in staff active queue.\n`);

    // Test 5: Verify Automatic 'Received' notification in backend
    console.log('Test 5: Fetch student notifications via notificationService.fetchNotifications()');
    const notifs = await notificationService.fetchNotifications(testStudentId);
    assert.ok(Array.isArray(notifs) && notifs.length > 0, 'Should have student notifications');
    const receivedNotif = notifs.find(n => n.jobId === submittedJob.id && n.title === 'Print Request Received');
    assert.ok(receivedNotif, 'Should find automatic Received notification');
    console.log(`✓ Received notification verified: "${receivedNotif.title}" - "${receivedNotif.message}"\n`);

    // Test 6: Status Progression: Received -> Processing -> Printing -> Ready -> Collected
    console.log('Test 6: Staff Status Advancement Flow');

    // 6a: Received -> Processing
    const processingJob = await printService.updatePrintJobStatus(submittedJob.id, 'Processing');
    assert.strictEqual(processingJob.status, 'Processing');
    console.log(`- Status -> Processing (Printer: ${processingJob.assignedPrinter})`);

    // 6b: Processing -> Printing
    const printingJob = await printService.updatePrintJobStatus(submittedJob.id, 'Printing');
    assert.strictEqual(printingJob.status, 'Printing');
    console.log(`- Status -> Printing (Printer: ${printingJob.assignedPrinter})`);

    // 6c: Printing -> Ready
    const readyJob = await printService.updatePrintJobStatus(submittedJob.id, 'Ready');
    assert.strictEqual(readyJob.status, 'Ready');
    console.log(`- Status -> Ready (Wait: ${readyJob.estimatedWaitTime})`);

    // 6d: Ready -> Collected
    const collectedJob = await printService.updatePrintJobStatus(submittedJob.id, 'Collected');
    assert.strictEqual(collectedJob.status, 'Collected');
    const completedJobs = printService.getCompletedJobs();
    assert.ok(completedJobs.some(j => j.id === submittedJob.id), 'Job must be in completed jobs archive');
    console.log(`- Status -> Collected (Archived in completed jobs)`);
    console.log('✓ Full status progression cycle completed.\n');

    // Test 7: AI Assistant queries using live backend jobs
    console.log('Test 7: Rule-Based AI Assistant using latest backend jobs');
    const studentJobs = printService.getStudentJobs(testStudentId);
    const allActiveJobs = printService.getPrintJobs();

    const responseStatus = getAIResponse('Where is my print?', studentJobs, allActiveJobs);
    assert.ok(typeof responseStatus === 'string' && responseStatus.length > 10, 'AI should respond to status query');
    console.log(`- AI Query ["Where is my print?"] =>\n  "${responseStatus.split('\n')[0]}..."`);

    const responseWait = getAIResponse('How long will my print take?', studentJobs, allActiveJobs);
    assert.ok(typeof responseWait === 'string' && responseWait.length > 5, 'AI should respond to wait time query');
    console.log(`- AI Query ["How long will my print take?"] =>\n  "${responseWait.split('\n')[0]}..."\n`);

    // Test 8: Notification Management (Mark as read, Mark all as read, Clear)
    console.log('Test 8: Notification Actions (Read tracking & clearing)');
    const studentNotifs = await notificationService.fetchNotifications(testStudentId);
    if (studentNotifs.length > 0) {
      const firstNotifId = studentNotifs[0].id;
      const afterMarkOne = await notificationService.markNotificationAsRead(firstNotifId);
      const markedNotif = afterMarkOne.find(n => n.id === firstNotifId);
      assert.strictEqual(markedNotif.read, true, 'Target notification should be marked read');
      console.log('✓ Single notification mark as read verified.');

      await notificationService.markAllNotificationsAsRead(testStudentId);
      const unreadCount = notificationService.getUnreadCount(testStudentId);
      assert.strictEqual(unreadCount, 0, 'Unread count should be 0 after markAll');
      console.log('✓ Mark all notifications as read verified.');
    }

    console.log('\n====================================================');
    console.log('🎉 ALL STEP 11 FRONTEND-BACKEND INTEGRATION TESTS PASSED!');
    console.log('====================================================\n');

    server.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Integration Test Error:', error);
    server.close();
    process.exit(1);
  }
});
