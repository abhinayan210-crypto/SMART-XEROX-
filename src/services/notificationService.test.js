/**
 * Unit & Integration Test Suite for Smart Notification Service (STEP 9)
 * Tests:
 * 1. Notification creation & data structure
 * 2. Retrieval & student-specific filtering
 * 3. Marking individual notification as read
 * 4. Marking all notifications as read
 * 5. Clearing notifications
 * 6. Duplicate prevention on repeat / unchanged status
 * 7. Status transition notification generation (Received -> Processing -> Printing -> Ready -> Collected)
 * 8. End-to-end full workflow simulation
 */

import assert from 'node:assert';
import { notificationService } from './notificationService.js';

console.log('====================================================');
console.log('🧪 RUNNING STEP 9 NOTIFICATION SERVICE TEST SUITE');
console.log('====================================================\n');

// Reset to clean test state
notificationService.resetToMockData();
notificationService.clearNotifications('STD-TEST-001');
notificationService.clearNotifications('STD-TEST-002');

// Test 1: Create Notification
console.log('Test 1: Create Notification');
const created = notificationService.createNotification({
  studentId: 'STD-TEST-001',
  jobId: 'JOB-9001',
  title: 'Test Notification',
  message: 'This is a test notification message.',
  type: 'info',
  status: 'Received'
});

assert.ok(created.id, 'Notification must have a unique ID');
assert.strictEqual(created.studentId, 'STD-TEST-001');
assert.strictEqual(created.jobId, 'JOB-9001');
assert.strictEqual(created.read, false);
assert.strictEqual(created.isUnread, true);
assert.strictEqual(created.type, 'info');
console.log('✓ Create notification passed.');

// Test 2: Get Notifications & Student Filtering
console.log('\nTest 2: Get Notifications & Student Filtering');
notificationService.createNotification({
  studentId: 'STD-TEST-002',
  jobId: 'JOB-9002',
  title: 'Student 2 Note',
  message: 'Private for student 2',
  type: 'success'
});

const student1Notifs = notificationService.getNotifications('STD-TEST-001');
const student2Notifs = notificationService.getNotifications('STD-TEST-002');

assert.strictEqual(student1Notifs.length, 1);
assert.strictEqual(student1Notifs[0].title, 'Test Notification');
assert.strictEqual(student2Notifs.length, 1);
assert.strictEqual(student2Notifs[0].title, 'Student 2 Note');
console.log('✓ Student-specific filtering passed.');

// Test 3: Unread Count & Mark as Read
console.log('\nTest 3: Unread Count & Mark as Read');
const unreadBefore = notificationService.getUnreadCount('STD-TEST-001');
assert.strictEqual(unreadBefore, 1);

notificationService.markNotificationAsRead(created.id);
const unreadAfter = notificationService.getUnreadCount('STD-TEST-001');
assert.strictEqual(unreadAfter, 0);

const updatedStudent1Notifs = notificationService.getNotifications('STD-TEST-001');
assert.strictEqual(updatedStudent1Notifs[0].read, true);
assert.strictEqual(updatedStudent1Notifs[0].isUnread, false);
console.log('✓ Mark notification as read passed.');

// Test 4: Mark All Notifications as Read
console.log('\nTest 4: Mark All as Read');
notificationService.createNotification({ studentId: 'STD-TEST-001', title: 'Note 2', message: 'Msg 2' });
notificationService.createNotification({ studentId: 'STD-TEST-001', title: 'Note 3', message: 'Msg 3' });
assert.strictEqual(notificationService.getUnreadCount('STD-TEST-001'), 2);

notificationService.markAllNotificationsAsRead('STD-TEST-001');
assert.strictEqual(notificationService.getUnreadCount('STD-TEST-001'), 0);
console.log('✓ Mark all as read passed.');

// Test 5: Clear Notifications
console.log('\nTest 5: Clear Notifications');
notificationService.clearNotifications('STD-TEST-001');
assert.strictEqual(notificationService.getNotifications('STD-TEST-001').length, 0);
assert.strictEqual(notificationService.getUnreadCount('STD-TEST-001'), 0);
console.log('✓ Clear notifications passed.');

// Test 6: Status-change Notification Generation & Content Verification
console.log('\nTest 6: Status-change Notification Generation');
const sampleJob = {
  id: 'JOB-9099',
  studentId: 'STD-TEST-FLOW',
  documentName: 'AI_Immersion_Report.pdf',
  copies: 2
};

// 6a: Received
const notifReceived = notificationService.generateStatusNotification(sampleJob, null, 'Received');
assert.ok(notifReceived);
assert.strictEqual(notifReceived.title, 'Print Request Received');
assert.ok(notifReceived.message.includes('AI_Immersion_Report.pdf'));
assert.strictEqual(notifReceived.type, 'info');

// 6b: Processing
const notifProcessing = notificationService.generateStatusNotification(sampleJob, 'Received', 'Processing');
assert.ok(notifProcessing);
assert.strictEqual(notifProcessing.title, 'Print Request Processing');
assert.ok(notifProcessing.message.includes('AI_Immersion_Report.pdf'));
assert.strictEqual(notifProcessing.type, 'info');

// 6c: Printing
const notifPrinting = notificationService.generateStatusNotification(sampleJob, 'Processing', 'Printing');
assert.ok(notifPrinting);
assert.strictEqual(notifPrinting.title, 'Print Job Printing');
assert.ok(notifPrinting.message.includes('AI_Immersion_Report.pdf'));
assert.strictEqual(notifPrinting.type, 'info');

// 6d: Ready
const notifReady = notificationService.generateStatusNotification(sampleJob, 'Printing', 'Ready');
assert.ok(notifReady);
assert.strictEqual(notifReady.title, 'Print Ready');
assert.ok(notifReady.message.includes('AI_Immersion_Report.pdf'));
assert.strictEqual(notifReady.type, 'success');

// 6e: Collected
const notifCollected = notificationService.generateStatusNotification(sampleJob, 'Ready', 'Collected');
assert.ok(notifCollected);
assert.strictEqual(notifCollected.title, 'Print Collected');
assert.ok(notifCollected.message.includes('AI_Immersion_Report.pdf'));
assert.strictEqual(notifCollected.type, 'success');
console.log('✓ All 5 status transition notifications generated with exact titles and messages.');

// Test 7: Duplicate Prevention
console.log('\nTest 7: Duplicate Prevention');
// Trying to emit Collected again for the same job
const duplicateCollected = notificationService.generateStatusNotification(sampleJob, 'Ready', 'Collected');
assert.strictEqual(duplicateCollected, null, 'Must return null for duplicate status notification');

// Trying to emit when oldStatus === newStatus
const unchanged = notificationService.generateStatusNotification(sampleJob, 'Collected', 'Collected');
assert.strictEqual(unchanged, null, 'Must return null when status has not changed');
console.log('✓ Duplicate prevention passed.');

// Test 8: Full End-to-End Workflow Verification
console.log('\nTest 8: Full End-to-End Workflow Verification');
notificationService.clearNotifications('STD-FLOW-USER');
const flowJob = {
  id: 'JOB-FLOW-777',
  studentId: 'STD-FLOW-USER',
  documentName: 'Final_Thesis.pdf'
};

// 1. Student submits -> Received
const step1 = notificationService.generateStatusNotification(flowJob, null, 'Received');
assert.strictEqual(notificationService.getUnreadCount('STD-FLOW-USER'), 1);

// 2. Staff: Received -> Processing
const step2 = notificationService.generateStatusNotification(flowJob, 'Received', 'Processing');
assert.strictEqual(notificationService.getUnreadCount('STD-FLOW-USER'), 2);

// 3. Staff: Processing -> Printing
const step3 = notificationService.generateStatusNotification(flowJob, 'Processing', 'Printing');
assert.strictEqual(notificationService.getUnreadCount('STD-FLOW-USER'), 3);

// 4. Staff: Printing -> Ready
const step4 = notificationService.generateStatusNotification(flowJob, 'Printing', 'Ready');
assert.strictEqual(notificationService.getUnreadCount('STD-FLOW-USER'), 4);

// 5. Student marks one as read
notificationService.markNotificationAsRead(step4.id);
assert.strictEqual(notificationService.getUnreadCount('STD-FLOW-USER'), 3);

// 6. Staff: Ready -> Collected
const step5 = notificationService.generateStatusNotification(flowJob, 'Ready', 'Collected');
assert.strictEqual(notificationService.getUnreadCount('STD-FLOW-USER'), 4);

// 7. Student marks all as read
notificationService.markAllNotificationsAsRead('STD-FLOW-USER');
assert.strictEqual(notificationService.getUnreadCount('STD-FLOW-USER'), 0);

console.log('✓ Complete student -> staff workflow passed flawlessly.');

console.log('\n====================================================');
console.log('🎉 ALL STEP 9 NOTIFICATION SERVICE TESTS PASSED!');
console.log('====================================================\n');
process.exit(0);
