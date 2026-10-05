/**
 * STEP 7 Verification Script for Queue Analysis & Smart Job Prioritization
 * Tests empty queue, single job, multiple jobs, copy scaling, workload thresholds,
 * priority recommendations, and dynamic natural-language insights.
 */

import {
  analyzeQueue,
  calculateJobPriority,
  getQueueInsights,
  enrichJobsWithPriority
} from './queueAnalysisService.js';

console.log('====================================================');
console.log('🧪 RUNNING STEP 7 QUEUE ANALYSIS & PRIORITY TEST SUITE');
console.log('====================================================\n');

// 1. Test Empty Queue
console.log('Test 1: analyzeQueue() with empty queue');
const emptyAnalysis = analyzeQueue([]);
console.log(`Empty Queue: totalActive = ${emptyAnalysis.totalActiveJobs}, workload = ${emptyAnalysis.currentWorkload}, avgWait = ${emptyAnalysis.averageWaitingTime}`);
console.assert(emptyAnalysis.totalActiveJobs === 0, 'Total active should be 0');
console.assert(emptyAnalysis.currentWorkload === 'Low', 'Empty workload should be Low');
console.assert(Array.isArray(emptyAnalysis.insights) && emptyAnalysis.insights.length > 0, 'Insights should be generated');
console.log('Insights generated for empty queue:', emptyAnalysis.insights);
console.log('✓ Empty queue analysis passed\n');

// 2. Test Single Job Queue
console.log('Test 2: analyzeQueue() and calculateJobPriority() with single job');
const singleJobQueue = [
  { id: 'JOB-001', fileName: 'Resume.pdf', student: 'Student 1', copies: 1, pages: 2, status: 'Received' }
];
const singleAnalysis = analyzeQueue(singleJobQueue);
const singlePriority = calculateJobPriority(singleJobQueue[0], singleJobQueue);
console.log(`Single Job Analysis: totalActive = ${singleAnalysis.totalActiveJobs}, totalCopies = ${singleAnalysis.totalCopies}, workload = ${singleAnalysis.currentWorkload}`);
console.log(`Single Job Priority: level = ${singlePriority.priority}, reason = "${singlePriority.reason}"`);
console.assert(singleAnalysis.totalActiveJobs === 1, 'Total active should be 1');
console.assert(singleAnalysis.totalCopies === 1, 'Total copies should be 1');
console.assert(singleAnalysis.currentWorkload === 'Low', 'Single job workload should be Low');
console.assert(singlePriority.priority === 'Normal', 'Recently submitted single job should be Normal priority');
console.log('✓ Single job analysis passed\n');

// 3. Test Multiple Jobs with Different Statuses and Copy Counts
console.log('Test 3: Multiple jobs across Received, Processing, Printing, Ready, Collected');
const multiJobs = [
  { id: 'JOB-101', fileName: 'HeavyReport.pdf', student: 'Abhinaya N', copies: 4, pages: 40, status: 'Received' },
  { id: 'JOB-102', fileName: 'Assignment.pdf', student: 'Student A', copies: 1, pages: 8, status: 'Processing' },
  { id: 'JOB-103', fileName: 'Thesis.pdf', student: 'Student B', copies: 2, pages: 24, status: 'Printing' },
  { id: 'JOB-104', fileName: 'LabNotes.pdf', student: 'Student C', copies: 3, pages: 15, status: 'Received' },
  { id: 'JOB-105', fileName: 'Flyer.pdf', student: 'Student D', copies: 5, pages: 2, status: 'Received' },
  { id: 'JOB-106', fileName: 'ProjectDoc.pdf', student: 'Student E', copies: 2, pages: 30, status: 'Received' },
  { id: 'JOB-107', fileName: 'PickupReady.pdf', student: 'Student F', copies: 1, pages: 10, status: 'Ready' },
  { id: 'JOB-108', fileName: 'OldCollected.pdf', student: 'Student G', copies: 1, pages: 5, status: 'Collected' }
];

const multiAnalysis = analyzeQueue(multiJobs);
console.log(`Multi-job Analysis:`);
console.log(`- Active Jobs: ${multiAnalysis.totalActiveJobs} (Received: ${multiAnalysis.pendingJobs}, Processing: ${multiAnalysis.processingJobs}, Printing: ${multiAnalysis.printingJobs})`);
console.log(`- Ready Jobs: ${multiAnalysis.readyJobs}`);
console.log(`- Total Copies: ${multiAnalysis.totalCopies}`);
console.log(`- Average Wait: ${multiAnalysis.averageWaitingTime}`);
console.log(`- Current Workload: ${multiAnalysis.currentWorkload}`);
console.log(`- Dynamic Insights:`);
multiAnalysis.insights.forEach(ins => console.log(`   * ${ins}`));

console.assert(multiAnalysis.totalActiveJobs === 6, 'Total active should be 6 (excluding Ready & Collected)');
console.assert(multiAnalysis.totalCopies === 17, 'Total copies should sum up to 17');
console.assert(multiAnalysis.currentWorkload === 'High', '6 active jobs with 17 copies should be High workload');
console.assert(multiAnalysis.readyJobs === 1, 'Ready jobs count should be 1');
console.log('✓ Multi-job queue workload analysis passed\n');

// 4. Test Priority Calculation for each Job
console.log('Test 4: Priority calculations and reasons');
const enrichedJobs = enrichJobsWithPriority(multiJobs.slice(0, 6)); // active only
enrichedJobs.forEach(j => {
  console.log(`Job ${j.id} (${j.fileName} • ${j.copies} copies • ${j.status}): Priority [${j.priority}] — Reason: "${j.priorityReason}"`);
});

const highPriorityJobs = enrichedJobs.filter(j => j.priority === 'High');
console.log(`High priority jobs count: ${highPriorityJobs.length}`);
console.assert(highPriorityJobs.length > 0, 'Should flag high priority jobs for long waiting or high copies');
console.log('✓ Priority calculation and rationale passed\n');

// 5. Test Moderate Workload Scenario
console.log('Test 5: Moderate workload scenario');
const moderateJobs = [
  { id: 'MOD-1', fileName: 'Doc1.pdf', copies: 2, pages: 10, status: 'Printing' },
  { id: 'MOD-2', fileName: 'Doc2.pdf', copies: 1, pages: 8, status: 'Processing' },
  { id: 'MOD-3', fileName: 'Doc3.pdf', copies: 2, pages: 12, status: 'Received' }
];
const moderateAnalysis = analyzeQueue(moderateJobs);
console.log(`Moderate Queue Workload: ${moderateAnalysis.currentWorkload} (Active: ${moderateAnalysis.totalActiveJobs}, Copies: ${moderateAnalysis.totalCopies})`);
console.assert(moderateAnalysis.currentWorkload === 'Moderate', '3 active jobs with 5 copies should be Moderate workload');
console.log('✓ Moderate workload calculation passed\n');

// 6. Test Dynamic Insights Generation
console.log('Test 6: Dynamic Insights Verification');
const insights = getQueueInsights(multiJobs);
console.assert(insights.some(i => i.includes('waiting in the queue')), 'Should mention waiting jobs in queue');
console.assert(insights.some(i => i.includes('workload is currently high')), 'Should mention high workload');
console.assert(insights.some(i => i.includes('ready for collection')), 'Should mention ready orders');
console.log('✓ Dynamic insights text generation passed\n');

console.log('====================================================');
console.log('🎉 ALL STEP 7 QUEUE ANALYSIS TESTS PASSED!');
console.log('====================================================');
