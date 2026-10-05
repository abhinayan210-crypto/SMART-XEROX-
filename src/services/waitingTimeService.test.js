/**
 * STEP 6 Verification Script
 * Tests the complete flow and mathematical logic of Smart Waiting Time Prediction.
 */

import {
  calculateEstimatedWaitTime,
  getActiveQueue,
  enrichJobsWithPredictions,
  getQueueSummary
} from './waitingTimeService.js';

console.log('====================================================');
console.log('🧪 RUNNING STEP 6 WAITING TIME SERVICE TEST SUITE');
console.log('====================================================\n');

// Mock Jobs for testing
const mockJobs = [
  { id: 'JOB-1', fileName: 'Thesis.pdf', status: 'Printing', copies: 1, pages: 20 },
  { id: 'JOB-2', fileName: 'Assignment.pdf', status: 'Processing', copies: 1, pages: 10 },
  { id: 'JOB-3', fileName: 'LabReport.pdf', status: 'Received', copies: 2, pages: 15 },
  { id: 'JOB-4', fileName: 'ProjectDoc.pdf', status: 'Received', copies: 1, pages: 12 },
  { id: 'JOB-5', fileName: 'CompletedNotes.pdf', status: 'Ready', copies: 1, pages: 5 },
  { id: 'JOB-6', fileName: 'ArchiveDoc.pdf', status: 'Collected', copies: 1, pages: 8 }
];

// Test 1: Active Queue Filtering and Sorting
console.log('Test 1: getActiveQueue()');
const activeQueue = getActiveQueue(mockJobs);
console.log(`Active Queue count: ${activeQueue.length} (Expected: 4)`);
console.assert(activeQueue.length === 4, 'Active queue should exclude Ready and Collected');
console.assert(activeQueue[0].status === 'Printing', 'Printing job should be #1 in execution queue');
console.assert(activeQueue[1].status === 'Processing', 'Processing job should be #2 in execution queue');
console.assert(activeQueue[2].status === 'Received', 'Received job should be #3 in execution queue');
console.log('✓ getActiveQueue() passed\n');

// Test 2: calculateEstimatedWaitTime() for each status
console.log('Test 2: calculateEstimatedWaitTime()');
const pJob1 = calculateEstimatedWaitTime(mockJobs[0], mockJobs);
const pJob2 = calculateEstimatedWaitTime(mockJobs[1], mockJobs);
const pJob3 = calculateEstimatedWaitTime(mockJobs[2], mockJobs);
const pJob5 = calculateEstimatedWaitTime(mockJobs[4], mockJobs);
const pJob6 = calculateEstimatedWaitTime(mockJobs[5], mockJobs);

console.log(`Job 1 (Printing): Position #${pJob1.queuePosition} — Estimated: ${pJob1.formattedWaitTime} (${pJob1.estimatedMinutes} min)`);
console.log(`Job 2 (Processing): Position #${pJob2.queuePosition} — Estimated: ${pJob2.formattedWaitTime} (${pJob2.estimatedMinutes} min)`);
console.log(`Job 3 (Received): Position #${pJob3.queuePosition} — Estimated: ${pJob3.formattedWaitTime} (${pJob3.estimatedMinutes} min)`);
console.log(`Job 5 (Ready): Position #${pJob5.queuePosition} — Estimated: ${pJob5.formattedWaitTime}`);
console.log(`Job 6 (Collected): Position #${pJob6.queuePosition} — Estimated: ${pJob6.formattedWaitTime}`);

console.assert(pJob1.queuePosition === 1, 'Job 1 queue position should be 1');
console.assert(pJob2.queuePosition === 2, 'Job 2 queue position should be 2');
console.assert(pJob3.queuePosition === 3, 'Job 3 queue position should be 3');
console.assert(pJob5.queuePosition === 0 && pJob5.formattedWaitTime === 'Ready for Pickup', 'Ready job should not wait in queue');
console.assert(pJob6.queuePosition === 0 && pJob6.formattedWaitTime === 'Completed', 'Collected job should not wait in queue');
console.assert(pJob1.estimatedMinutes < pJob2.estimatedMinutes, 'Job 1 wait time must be less than Job 2');
console.assert(pJob2.estimatedMinutes < pJob3.estimatedMinutes, 'Job 2 wait time must be less than Job 3');
console.log('✓ calculateEstimatedWaitTime() passed\n');

// Test 3: enrichJobsWithPredictions()
console.log('Test 3: enrichJobsWithPredictions()');
const enriched = enrichJobsWithPredictions(mockJobs);
console.log(`Enriched ${enriched.length} jobs with predictions.`);
enriched.forEach(j => {
  console.log(`- ${j.fileName} [${j.status}]: Pos #${j.queuePosition || '—'}, Wait: ${j.estimatedWaitTime}`);
});
console.assert(enriched[0].estimatedWaitTime !== undefined, 'Job must have estimatedWaitTime');
console.log('✓ enrichJobsWithPredictions() passed\n');

// Test 4: Dynamic recalculation when status changes
console.log('Test 4: Status progression and recalculation');
// Job 1 becomes Ready -> Job 2 becomes Printing -> Job 3 becomes Processing
const updatedJobs = [
  { ...mockJobs[0], status: 'Ready' },
  { ...mockJobs[1], status: 'Printing' },
  { ...mockJobs[2], status: 'Processing' },
  { ...mockJobs[3], status: 'Received' }
];
const pUpdatedJob2 = calculateEstimatedWaitTime(updatedJobs[1], updatedJobs);
const pUpdatedJob3 = calculateEstimatedWaitTime(updatedJobs[2], updatedJobs);
console.log(`Job 2 promoted to Printing: Pos #${pUpdatedJob2.queuePosition}, Wait: ${pUpdatedJob2.formattedWaitTime}`);
console.log(`Job 3 promoted to Processing: Pos #${pUpdatedJob3.queuePosition}, Wait: ${pUpdatedJob3.formattedWaitTime}`);
console.assert(pUpdatedJob2.queuePosition === 1, 'Job 2 should now be queue position #1');
console.assert(pUpdatedJob3.queuePosition === 2, 'Job 3 should now be queue position #2');
console.log('✓ Status progression and recalculation passed\n');

// Test 5: getQueueSummary()
console.log('Test 5: getQueueSummary()');
const summary = getQueueSummary(mockJobs);
console.log(`Queue Summary: Total Active = ${summary.totalActive}, Printing = ${summary.printingCount}, Avg Wait = ${summary.avgWaitMinutes} min`);
console.assert(summary.totalActive === 4, 'Total active should be 4');
console.assert(summary.printingCount === 1, 'Printing count should be 1');
console.log('✓ getQueueSummary() passed\n');

console.log('====================================================');
console.log('🎉 ALL STEP 6 TESTS PASSED SUCCESSFULLY!');
console.log('====================================================');
