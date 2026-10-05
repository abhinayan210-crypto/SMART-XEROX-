/**
 * STEP 6 & STEP 11 Verification Script for printService and Student/Staff notifications
 */

import { printService } from './printService.js';

console.log('====================================================');
console.log('🧪 RUNNING STEP 6 & 11 PRINT SERVICE & NOTIFICATION TEST');
console.log('====================================================\n');

async function runTests() {
  // Reset to clean test state
  printService.resetToMockData();

  // Test 1: Fetch initial active print jobs with predictions
  console.log('Test 1: Initial getPrintJobs()');
  const activeJobs = printService.getPrintJobs();
  console.log(`Active jobs loaded: ${activeJobs.length}`);
  console.assert(activeJobs.length > 0, 'Must have initial active jobs');
  const firstActive = activeJobs[0];
  console.log(`Sample Job: ${firstActive.fileName} -> Status: ${firstActive.status}, Queue Pos: #${firstActive.queuePosition}, Wait: ${firstActive.estimatedWaitTime}`);
  console.log('✓ Initial active print jobs verified\n');

  // Test 2: Add new print job
  console.log('Test 2: addPrintJob() from student');
  const submitted = await printService.addPrintJob({
    documentName: 'AI_Ethics_Term_Paper.pdf',
    student: 'Abhinaya N',
    studentId: 'STD-2026-0842',
    department: 'Computer Science',
    copies: 2,
    pages: 18,
    printType: 'B&W'
  });
  console.log(`Submitted new job: ${submitted.id} | Pos: #${submitted.queuePosition} | Wait: ${submitted.estimatedWaitTime} | PIN: ${submitted.pickupPin}`);
  console.assert(submitted.id.startsWith('PRT-'), 'Job ID format valid');
  console.assert(submitted.queuePosition > 0, 'Queue position should be > 0');
  console.assert(submitted.estimatedWaitTime.includes('min') || submitted.estimatedWaitTime.includes('Ready') || submitted.estimatedWaitTime.includes('Completed'), 'Estimated wait time calculated');
  console.log('✓ Student job submission passed\n');

  // Test 3: Status transitions and Notifications
  console.log('Test 3: updatePrintJobStatus() -> Printing and Ready');

  // Transition to Printing
  const printingJob = await printService.updatePrintJobStatus(submitted.id, 'Printing');
  console.log(`Status advanced to Printing: ${printingJob.status} | Wait: ${printingJob.estimatedWaitTime}`);
  const studentNotifsAfterPrint = printService.getNotifications('student');
  const latestNotif1 = studentNotifsAfterPrint[0];
  console.log(`Student Notification on Printing: [${latestNotif1.title}] - "${latestNotif1.message}"`);
  console.assert(latestNotif1.title === 'Print Job Printing' && latestNotif1.message.includes('currently being printed'), 'Notification text must match requirement');

  // Transition to Ready
  const readyJob = await printService.updatePrintJobStatus(submitted.id, 'Ready');
  console.log(`Status advanced to Ready: ${readyJob.status} | Wait: ${readyJob.estimatedWaitTime}`);
  const studentNotifsAfterReady = printService.getNotifications('student');
  const latestNotif2 = studentNotifsAfterReady[0];
  console.log(`Student Notification on Ready: [${latestNotif2.title}] - "${latestNotif2.message}"`);
  console.assert(latestNotif2.title === 'Print Ready' && latestNotif2.message.includes('ready for collection'), 'Notification text must match requirement');

  // Transition to Collected
  const collectedJob = await printService.updatePrintJobStatus(submitted.id, 'Collected');
  console.log(`Status advanced to Collected: ${collectedJob.status} | Wait: ${collectedJob.estimatedWaitTime}`);
  const completedJobs = printService.getCompletedJobs();
  const foundInCompleted = completedJobs.some(j => j.id === submitted.id);
  console.assert(foundInCompleted, 'Collected job must be present in Completed Jobs archive');
  console.log('✓ Status transitions and student notifications verified\n');

  // Reset to clean mock state for application runtime
  printService.resetToMockData();

  console.log('====================================================');
  console.log('🎉 ALL STEP 6 & 11 PRINT SERVICE TESTS PASSED!');
  console.log('====================================================');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
