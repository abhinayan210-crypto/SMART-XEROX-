/**
 * Unit tests for SmartPrint AI Assistant Service (STEP 8)
 * Verifies intent detection, dynamic queue & wait time responses, multi-job handling,
 * empty state, and edge case fallbacks.
 */

import assert from 'node:assert';
import { getAIResponse, detectIntent } from './aiAssistantService.js';

console.log('--- RUNNING AI ASSISTANT SERVICE TEST SUITE ---');

const mockSingleActiveJob = [
  {
    id: 'PRT-1001',
    documentName: 'AI_Immersion_Report.pdf',
    status: 'Printing',
    copies: 3,
    pageCount: 20,
    pickupPin: '4821'
  }
];

const mockMultipleJobs = [
  {
    id: 'PRT-1001',
    documentName: 'AI_Immersion_Report.pdf',
    status: 'Printing',
    copies: 3,
    pageCount: 20,
    pickupPin: '4821'
  },
  {
    id: 'PRT-1002',
    documentName: 'Java_Assignment.pdf',
    status: 'Received',
    copies: 2,
    pageCount: 10,
    pickupPin: '7103'
  },
  {
    id: 'PRT-1003',
    documentName: 'Project_Report.pdf',
    status: 'Ready',
    copies: 1,
    pageCount: 45,
    pickupPin: '9024'
  },
  {
    id: 'PRT-0988',
    documentName: 'Resume.pdf',
    status: 'Collected',
    copies: 2,
    pageCount: 2,
    pickupPin: '3319'
  }
];

// Test 1: Intent Detection
console.log('Test 1: Intent Detection');
assert.strictEqual(detectIntent('What is my print status?'), 'STATUS');
assert.strictEqual(detectIntent('Where is my print?'), 'STATUS');
assert.strictEqual(detectIntent('How long will my print take?'), 'WAITING_TIME');
assert.strictEqual(detectIntent('Estimated wait?'), 'WAITING_TIME');
assert.strictEqual(detectIntent('What is my queue position?'), 'QUEUE_POSITION');
assert.strictEqual(detectIntent('How many jobs are before me?'), 'QUEUE_POSITION');
assert.strictEqual(detectIntent('Is my print ready?'), 'READY_CHECK');
assert.strictEqual(detectIntent('What are my active print jobs?'), 'MY_JOBS');
assert.strictEqual(detectIntent('My print jobs'), 'MY_JOBS');
assert.strictEqual(detectIntent('Show my completed jobs.'), 'COMPLETED_JOBS');
assert.strictEqual(detectIntent('How does SmartPrint work?'), 'GENERAL_HOW_IT_WORKS');
assert.strictEqual(detectIntent('What are the print statuses?'), 'GENERAL_STATUSES');
assert.strictEqual(detectIntent('How do I submit a print?'), 'GENERAL_SUBMIT');
assert.strictEqual(detectIntent('What can you help me with?'), 'GENERAL_HELP');
assert.strictEqual(detectIntent('What is the weather today?'), 'UNKNOWN');
assert.strictEqual(detectIntent(''), 'EMPTY');
console.log('✓ Intent detection tests passed.');

// Test 2: Status Question (Single active job)
console.log('Test 2: Status Question (Single active job)');
const statusResponse = getAIResponse('What is my print status?', mockSingleActiveJob, mockSingleActiveJob);
console.log('Response:', statusResponse);
assert.ok(statusResponse.includes('AI_Immersion_Report.pdf'));
assert.ok(statusResponse.includes('Printing'));
console.log('✓ Status question (single job) passed.');

// Test 3: Status Question (Multiple active jobs)
console.log('Test 3: Status Question (Multiple active jobs)');
const multiStatusResponse = getAIResponse('Where is my print?', mockMultipleJobs, mockMultipleJobs);
console.log('Response:', multiStatusResponse);
assert.ok(multiStatusResponse.includes('AI_Immersion_Report.pdf'));
assert.ok(multiStatusResponse.includes('Java_Assignment.pdf'));
console.log('✓ Status question (multiple jobs) passed.');

// Test 4: Waiting Time Question
console.log('Test 4: Waiting Time Question');
const waitResponse = getAIResponse('How long will my print take?', mockSingleActiveJob, mockSingleActiveJob);
console.log('Response:', waitResponse);
assert.ok(waitResponse.includes('estimated waiting time'));
assert.ok(waitResponse.includes('minutes'));
assert.ok(waitResponse.includes('queue position is #1'));
console.log('✓ Waiting time question passed.');

// Test 5: Queue Question
console.log('Test 5: Queue Question');
const queueResponse = getAIResponse('What is my queue position?', mockSingleActiveJob, mockSingleActiveJob);
console.log('Response:', queueResponse);
assert.ok(queueResponse.includes('queue position #1'));
console.log('✓ Queue question passed.');

// Test 6: Ready Check when job is Ready
console.log('Test 6: Ready Check when job is Ready');
const readyJobsList = [{ id: 'PRT-1003', documentName: 'Project_Report.pdf', status: 'Ready', copies: 1, pickupPin: '9024' }];
const readyResponse = getAIResponse('Is my print ready?', readyJobsList, readyJobsList);
console.log('Response:', readyResponse);
assert.ok(readyResponse.includes('Your print is ready for collection'));
console.log('✓ Ready check (is ready) passed.');

// Test 7: Ready Check when job is NOT Ready
console.log('Test 7: Ready Check when job is NOT Ready');
const notReadyResponse = getAIResponse('Is my print ready?', mockSingleActiveJob, mockSingleActiveJob);
console.log('Response:', notReadyResponse);
assert.strictEqual(notReadyResponse, 'None of your current print jobs are ready for collection yet.');
console.log('✓ Ready check (not ready) passed.');

// Test 8: My Print Jobs List
console.log('Test 8: My Print Jobs List');
const myJobsResponse = getAIResponse('My print jobs', mockMultipleJobs, mockMultipleJobs);
console.log('Response:', myJobsResponse);
assert.ok(myJobsResponse.includes('AI_Immersion_Report.pdf — Printing'));
assert.ok(myJobsResponse.includes('Java_Assignment.pdf — Received'));
assert.ok(myJobsResponse.includes('Project_Report.pdf — Ready'));
console.log('✓ My print jobs summary passed.');

// Test 9: Completed Jobs
console.log('Test 9: Completed Jobs');
const completedResponse = getAIResponse('Show my completed jobs.', mockMultipleJobs, mockMultipleJobs);
console.log('Response:', completedResponse);
assert.ok(completedResponse.includes('Resume.pdf'));
console.log('✓ Completed jobs query passed.');

// Test 10: General Questions (How it works, Statuses, Submit, Help)
console.log('Test 10: General Questions');
const howItWorks = getAIResponse('How does the printing process work?');
assert.ok(howItWorks.includes('SmartPrint allows you to upload documents online'));

const statuses = getAIResponse('What are the print statuses?');
assert.ok(statuses.includes('Received') && statuses.includes('Printing') && statuses.includes('Ready'));

const help = getAIResponse('What can you help me with?');
assert.ok(help.includes('I can help you check print job status'));
console.log('✓ General SmartPrint questions passed.');

// Test 11: Empty state (Student has no jobs)
console.log('Test 11: Empty state');
const emptyJobsResponse = getAIResponse('Where is my print?', [], []);
assert.strictEqual(emptyJobsResponse, "You don't have any print jobs yet. Submit a new print request to get started.");

const emptyWaitResponse = getAIResponse('What is my queue position?', [], []);
assert.strictEqual(emptyWaitResponse, "You don't have any print jobs yet. Submit a new print request to get started.");
console.log('✓ Empty jobs handling passed.');

// Test 12: Unknown Question
console.log('Test 12: Unknown Question');
const unknownResponse = getAIResponse('What is the square root of 144?', mockSingleActiveJob, mockSingleActiveJob);
assert.strictEqual(
  unknownResponse,
  "I'm currently focused on SmartPrint services. You can ask me about your print status, queue position, waiting time, or print jobs."
);
console.log('✓ Unknown question fallback passed.');

// Test 13: Empty message input
console.log('Test 13: Empty message');
const emptyMsgResponse = getAIResponse('   ');
assert.strictEqual(emptyMsgResponse, "Please enter a question or choose one of the quick options.");
console.log('✓ Empty message input handling passed.');

console.log('\n========================================');
console.log('🎉 ALL AI ASSISTANT UNIT TESTS PASSED!');
console.log('========================================\n');
