/**
 * SmartPrint AI Assistant Service (STEP 8)
 * Local JavaScript intelligence for student print-job queries.
 * Integrates real-time print data, queue positions, and estimated wait calculations.
 * Decoupled architecture ready for drop-in real AI API replacement.
 */

import { calculateEstimatedWaitTime, getActiveQueue } from './waitingTimeService.js';
import { notificationService } from './notificationService.js';

/**
 * Standardize job object properties (handles both documentName/fileName keys).
 */
const getJobFileName = (job) => {
  if (!job) return 'Document.pdf';
  return job.documentName || job.fileName || 'Document.pdf';
};

/**
 * Normalize and classify user intent from query string.
 * @param {string} message - User query message
 * @returns {string} Detected intent category
 */
export const detectIntent = (message = '') => {
  const text = message.toLowerCase().trim();

  if (!text) return 'EMPTY';

  // Specific general queries
  if (
    text.includes('how does smartprint work') ||
    text.includes('how does the printing process work') ||
    text.includes('how does it work') ||
    text.includes('printing process') ||
    text.includes('workflow')
  ) {
    return 'GENERAL_HOW_IT_WORKS';
  }

  if (
    text.includes('what are the print statuses') ||
    text.includes('print statuses') ||
    text.includes('status meaning') ||
    text.includes('what do statuses mean') ||
    text.includes('stages')
  ) {
    return 'GENERAL_STATUSES';
  }

  if (
    text.includes('how do i submit a print') ||
    text.includes('how to submit') ||
    text.includes('how to upload') ||
    text.includes('submit a print') ||
    text.includes('start a print')
  ) {
    return 'GENERAL_SUBMIT';
  }

  if (
    text.includes('what can you help me with') ||
    text.includes('what can you do') ||
    text.includes('help me') ||
    text === 'help' ||
    text.includes('commands') ||
    text.includes('capabilities')
  ) {
    return 'GENERAL_HELP';
  }

  if (
    text.includes('rate') ||
    text.includes('price') ||
    text.includes('pricing') ||
    text.includes('cost') ||
    text.includes('charges')
  ) {
    return 'GENERAL_PRICING';
  }

  // Completed jobs query
  if (
    text.includes('completed jobs') ||
    text.includes('completed print') ||
    text.includes('history') ||
    text.includes('past jobs') ||
    text.includes('finished jobs') ||
    text.includes('collected jobs')
  ) {
    return 'COMPLETED_JOBS';
  }

  // Active / All print jobs list query
  if (
    text.includes('my print jobs') ||
    text.includes('my jobs') ||
    text.includes('active print jobs') ||
    text.includes('active jobs') ||
    text.includes('show my jobs') ||
    text.includes('list jobs') ||
    text.includes('all my jobs') ||
    text.includes('what are my active') ||
    text === 'my print jobs'
  ) {
    return 'MY_JOBS';
  }

  // Ready / Pickup query
  if (
    text.includes('is my print ready') ||
    text.includes('is it ready') ||
    text.includes('ready for collection') ||
    text.includes('ready for pickup') ||
    text.includes('can i pick up') ||
    text.includes('can i collect') ||
    text.includes('ready?') ||
    text === 'is my print ready?' ||
    text === 'is my print ready'
  ) {
    return 'READY_CHECK';
  }

  // Queue query
  if (
    text.includes('queue position') ||
    text.includes('what is my queue') ||
    text.includes('jobs are before me') ||
    text.includes('jobs ahead') ||
    text.includes('ahead of me') ||
    text.includes('my position') ||
    text.includes('position in queue') ||
    text === 'queue position?' ||
    text === 'queue position'
  ) {
    return 'QUEUE_POSITION';
  }

  // Waiting time query
  if (
    text.includes('how long') ||
    text.includes('waiting time') ||
    text.includes('estimated wait') ||
    text.includes('wait time') ||
    text.includes('eta') ||
    text.includes('how much time') ||
    text.includes('when will my print') ||
    text.includes('when will it finish') ||
    text === 'estimated wait?' ||
    text === 'estimated wait'
  ) {
    return 'WAITING_TIME';
  }

  // PIN / Code query
  if (
    text.includes('pin') ||
    text.includes('pickup code') ||
    text.includes('pickup pin') ||
    text.includes('verification code')
  ) {
    return 'PICKUP_PIN';
  }

  // Notification / Updates query (Step 9)
  if (
    text.includes('what changed') ||
    text.includes('any updates') ||
    text.includes('any update') ||
    text.includes('do i have notifications') ||
    text.includes('notifications') ||
    text.includes('latest notification') ||
    text.includes('latest update') ||
    text.includes('recent update') ||
    text.includes('any news')
  ) {
    return 'NOTIFICATIONS_CHECK';
  }

  // Status / Where is my print query
  if (
    text.includes('what is my print status') ||
    text.includes('print status') ||
    text.includes('where is my print') ||
    text.includes("where's my print") ||
    text.includes('track my print') ||
    text.includes('track print') ||
    text.includes('status of my') ||
    text.includes('status') ||
    text.includes('where is my') ||
    text.includes('current print')
  ) {
    return 'STATUS';
  }

  return 'UNKNOWN';
};

/**
 * Main AI Assistant response generator.
 * Evaluates student's intent, matches relevant print job(s), and returns contextual response.
 *
 * @param {string} message - User question
 * @param {Array} studentJobs - Array of print jobs belonging to current student
 * @param {Array} allJobs - All print jobs across system (used for accurate queue calculations)
 * @returns {string} Response text
 */
export const getAIResponse = (message = '', studentJobs = [], allJobs = []) => {
  const query = (message || '').trim();

  // 1. Empty message handling
  if (!query) {
    return "Please enter a question or choose one of the quick options.";
  }

  const jobsList = Array.isArray(studentJobs) ? studentJobs : [];
  const systemJobs = Array.isArray(allJobs) && allJobs.length > 0 ? allJobs : jobsList;
  const intent = detectIntent(query);
  const lowerQuery = query.toLowerCase();

  // 2. Handle general non-job-dependent questions first
  if (intent === 'GENERAL_HOW_IT_WORKS') {
    return "SmartPrint allows you to upload documents online, configure print options (B&W/Color, copies, paper size), track queue progress in real time, and collect your prints at the counter using a secure 4-digit PIN.";
  }

  if (intent === 'GENERAL_STATUSES') {
    return "SmartPrint uses 4 main statuses: 1. Received (queued in system), 2. Processing (pre-flight & rendering), 3. Printing (actively printing on Xerox machine), and 4. Ready (printed and waiting for PIN collection).";
  }

  if (intent === 'GENERAL_SUBMIT') {
    return "To submit a print, use the 'Start a New Print' form on your dashboard, upload your PDF or DOCX file, select copies and color mode, and click 'Submit Print Request'.";
  }

  if (intent === 'GENERAL_HELP') {
    return "I can help you check print job status, view your queue position, calculate estimated waiting time, check if your prints are ready for pickup, view your active or completed jobs, and answer questions about SmartPrint services.";
  }

  if (intent === 'GENERAL_PRICING') {
    return "SmartPrint rates: B&W printing is ₹1.00/single page (₹1.50 duplex), Color is ₹5.00/page, and Spiral Binding is ₹20.00.";
  }

  // Handle Notifications / What changed query (Step 9)
  if (intent === 'NOTIFICATIONS_CHECK') {
    const studentId = jobsList[0]?.studentId || 'STD-2026-0842';
    const notifs = notificationService.getNotifications(studentId);

    if (!notifs || notifs.length === 0) {
      return "You have no new notifications. All your print jobs are up to date.";
    }

    const unread = notifs.filter(n => !n.read && n.isUnread !== false);
    if (unread.length > 0) {
      const topNotif = unread[0];
      return `You have ${unread.length} new update(s). Latest: ${topNotif.message}`;
    }

    return `Latest update: ${notifs[0].message}`;
  }

  // 3. If student has NO print jobs at all and asks a job-related question:
  if (jobsList.length === 0) {
    if (intent === 'UNKNOWN') {
      return "I'm currently focused on SmartPrint services. You can ask me about your print status, queue position, waiting time, or print jobs.";
    }
    return "You don't have any print jobs yet. Submit a new print request to get started.";
  }

  // Categorize student jobs
  const activeJobs = jobsList.filter(j => j.status === 'Printing' || j.status === 'Processing' || j.status === 'Received');
  const readyJobs = jobsList.filter(j => j.status === 'Ready');
  const completedJobs = jobsList.filter(j => j.status === 'Collected' || j.status === 'Completed');

  // Check if query targets a specific document by name
  const matchedJob = jobsList.find(j => {
    const name = getJobFileName(j).toLowerCase();
    const baseName = name.replace(/\.[^/.]+$/, '');
    return lowerQuery.includes(name) || (baseName.length > 3 && lowerQuery.includes(baseName));
  });

  // 4. Intent: STATUS & WHERE IS MY PRINT
  if (intent === 'STATUS' || matchedJob) {
    if (matchedJob) {
      const pred = calculateEstimatedWaitTime(matchedJob, systemJobs);
      const name = getJobFileName(matchedJob);
      if (matchedJob.status === 'Ready') {
        return `Your ${name} is Ready for collection at the counter (Pickup PIN: ${matchedJob.pickupPin || 'N/A'}).`;
      }
      if (matchedJob.status === 'Collected' || matchedJob.status === 'Completed') {
        return `Your ${name} has already been completed and collected.`;
      }
      return `Your ${name} is currently ${matchedJob.status}. Estimated waiting time is ${pred.formattedWaitTime} (Queue #${pred.queuePosition}).`;
    }

    if (activeJobs.length === 1) {
      const job = activeJobs[0];
      const name = getJobFileName(job);
      return `Your ${name} is currently ${job.status}.`;
    }

    if (activeJobs.length > 1) {
      const jobLines = activeJobs
        .map(j => `• ${getJobFileName(j)} — ${j.status}`)
        .join('\n');
      return `You have ${activeJobs.length} active print jobs:\n${jobLines}`;
    }

    if (readyJobs.length > 0) {
      const name = getJobFileName(readyJobs[0]);
      return `Your ${name} is Ready for collection at the counter.`;
    }

    if (completedJobs.length > 0) {
      const name = getJobFileName(completedJobs[0]);
      return `All your print jobs are completed. Your latest print was ${name} (${completedJobs[0].status}).`;
    }

    return "You don't have any active print jobs in the queue.";
  }

  // 5. Intent: WAITING TIME
  if (intent === 'WAITING_TIME') {
    if (matchedJob) {
      const pred = calculateEstimatedWaitTime(matchedJob, systemJobs);
      const name = getJobFileName(matchedJob);
      if (matchedJob.status === 'Ready') {
        return `Your ${name} is ready for collection now! There is no waiting time.`;
      }
      return `Your current estimated waiting time for ${name} is ${pred.estimatedMinutes} minutes and your queue position is #${pred.queuePosition}.`;
    }

    if (activeJobs.length === 1) {
      const job = activeJobs[0];
      const pred = calculateEstimatedWaitTime(job, systemJobs);
      return `Your current estimated waiting time is ${pred.estimatedMinutes} minutes and your queue position is #${pred.queuePosition}.`;
    }

    if (activeJobs.length > 1) {
      const jobLines = activeJobs
        .map(j => {
          const pred = calculateEstimatedWaitTime(j, systemJobs);
          return `• ${getJobFileName(j)}: ~${pred.estimatedMinutes} min (Queue #${pred.queuePosition})`;
        })
        .join('\n');
      return `Estimated waiting times for your active jobs:\n${jobLines}`;
    }

    if (readyJobs.length > 0) {
      return `Your print is ready for collection now! There is no waiting time.`;
    }

    return "You currently have no active print jobs in the queue.";
  }

  // 6. Intent: QUEUE POSITION
  if (intent === 'QUEUE_POSITION') {
    if (matchedJob) {
      const pred = calculateEstimatedWaitTime(matchedJob, systemJobs);
      if (matchedJob.status === 'Ready' || matchedJob.status === 'Collected' || matchedJob.status === 'Completed') {
        return `Your ${getJobFileName(matchedJob)} has already cleared the queue (${matchedJob.status}).`;
      }
      return `Your ${getJobFileName(matchedJob)} is currently at queue position #${pred.queuePosition}.`;
    }

    if (activeJobs.length === 1) {
      const pred = calculateEstimatedWaitTime(activeJobs[0], systemJobs);
      return `You are currently at queue position #${pred.queuePosition}.`;
    }

    if (activeJobs.length > 1) {
      const jobLines = activeJobs
        .map(j => {
          const pred = calculateEstimatedWaitTime(j, systemJobs);
          return `• ${getJobFileName(j)}: Queue #${pred.queuePosition} (${j.status})`;
        })
        .join('\n');
      return `Your current queue positions:\n${jobLines}`;
    }

    return "There are currently no active print jobs ahead of you.";
  }

  // 7. Intent: READY CHECK
  if (intent === 'READY_CHECK') {
    if (readyJobs.length > 0) {
      if (readyJobs.length === 1) {
        const job = readyJobs[0];
        const pinText = job.pickupPin ? ` (Pickup PIN: ${job.pickupPin})` : '';
        return `Your print is ready for collection.${pinText ? ` PIN: ${job.pickupPin}` : ''}`;
      }
      const readyLines = readyJobs
        .map(j => `• ${getJobFileName(j)} (PIN: ${j.pickupPin || 'N/A'})`)
        .join('\n');
      return `Your prints are ready for collection:\n${readyLines}`;
    }

    return "None of your current print jobs are ready for collection yet.";
  }

  // 8. Intent: MY PRINT JOBS
  if (intent === 'MY_JOBS') {
    if (jobsList.length === 0) {
      return "You don't have any print jobs yet. Submit a new print request to get started.";
    }

    const formattedJobs = jobsList.map(j => {
      const name = getJobFileName(j);
      const copies = Number(j.copies) || 1;
      const copiesText = `${copies} ${copies > 1 ? 'copies' : 'copy'}`;
      const pred = calculateEstimatedWaitTime(j, systemJobs);

      if (j.status === 'Ready') {
        return `${name} — Ready — ${copiesText}`;
      }
      if (j.status === 'Collected' || j.status === 'Completed') {
        return `${name} — Completed — ${copiesText}`;
      }
      return `${name} — ${j.status} — ${copiesText} — ${pred.estimatedMinutes} min`;
    });

    return formattedJobs.join('\n');
  }

  // 9. Intent: COMPLETED JOBS
  if (intent === 'COMPLETED_JOBS') {
    if (completedJobs.length > 0) {
      const lines = completedJobs
        .map(j => `• ${getJobFileName(j)} — ${j.status} (${j.copies || 1} ${(j.copies || 1) > 1 ? 'copies' : 'copy'})`)
        .join('\n');
      return `Here are your completed print jobs:\n${lines}`;
    }
    return "You have no completed print jobs in your history.";
  }

  // 10. Intent: PICKUP PIN
  if (intent === 'PICKUP_PIN') {
    const pins = jobsList
      .filter(j => j.pickupPin)
      .map(j => `${getJobFileName(j)}: ${j.pickupPin}`);

    if (pins.length > 0) {
      return `Your pickup PINs are: ${pins.join(' | ')}.`;
    }
    return "No pickup PINs found for your current jobs.";
  }

  // 11. Fallback for unknown questions
  return "I'm currently focused on SmartPrint services. You can ask me about your print status, queue position, waiting time, or print jobs.";
};

export default {
  detectIntent,
  getAIResponse
};
