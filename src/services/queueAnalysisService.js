/**
 * AI-Ready Queue Analysis & Smart Job Prioritization Service (STEP 7)
 * Analyzes live print queue metrics, workload throughput, and generates intelligent
 * operator attention recommendations and dynamic insights without altering queue order.
 */

import { getActiveQueue, calculateEstimatedWaitTime } from './waitingTimeService.js';

/**
 * Calculates priority recommendation for an individual print job.
 * Note: Advisory only — does not modify actual queue execution sequence.
 *
 * @param {Object} job - Target print job
 * @param {Array} allJobs - Context of all print jobs
 * @returns {Object} { priority: 'High' | 'Medium' | 'Normal', priorityScore: number, reason: string }
 */
export const calculateJobPriority = (job, allJobs = []) => {
  if (!job) {
    return {
      priority: 'Normal',
      priorityScore: 10,
      reason: 'Standard turnaround'
    };
  }

  const status = (job.status || 'Received').trim();
  const copies = Math.max(1, Number(job.copies) || 1);

  // Ready & Completed orders
  if (status === 'Ready') {
    return {
      priority: 'Normal',
      priorityScore: 0,
      reason: 'Ready for collection'
    };
  }
  if (status === 'Collected' || status === 'Completed') {
    return {
      priority: 'Normal',
      priorityScore: 0,
      reason: 'Order fulfilled'
    };
  }

  // Active Prediction metrics
  const prediction = calculateEstimatedWaitTime(job, allJobs);
  const waitMinutes = prediction.estimatedMinutes || 0;
  const queuePos = prediction.queuePosition || 1;

  let score = 0;
  let reason = 'Recently submitted';

  // 1. Waiting Time Factor
  if (waitMinutes >= 12) {
    score += 45;
  } else if (waitMinutes >= 6) {
    score += 25;
  } else {
    score += 10;
  }

  // 2. Queue Depth Factor
  if (queuePos >= 5) {
    score += 20;
  } else if (queuePos >= 3) {
    score += 15;
  }

  // 3. Copy Volume Factor
  if (copies >= 4) {
    score += 25;
  } else if (copies >= 2) {
    score += 15;
  }

  // 4. Status Progression Weight
  if (status === 'Processing') {
    score += 15;
  } else if (status === 'Printing') {
    score += 5;
  }

  // Determine Level and Reason
  let priority = 'Normal';

  if (status === 'Printing') {
    priority = 'Normal';
    reason = 'Actively printing on workstation';
  } else if (status === 'Processing') {
    priority = copies >= 3 ? 'High' : 'Medium';
    reason = copies >= 3 ? 'High copy volume in processing' : 'Active job processing';
  } else if (waitMinutes >= 10 || copies >= 3 || queuePos >= 5) {
    priority = 'High';
    if (waitMinutes >= 8 || queuePos >= 4) {
      reason = 'Waiting longer in queue';
    } else if (copies >= 3) {
      reason = 'High copy volume';
    } else {
      reason = 'Queue bottleneck priority';
    }
  } else if (waitMinutes >= 6 || copies === 2 || queuePos >= 3) {
    priority = 'Medium';
    reason = 'Moderate waiting time';
  } else {
    priority = 'Normal';
    reason = 'Recently submitted';
  }

  return {
    priority,
    priorityScore: score,
    reason
  };
};

/**
 * Generates dynamic, natural-language insights based on current queue workload.
 *
 * @param {Array} jobs - All print jobs
 * @param {Object} metrics - Precomputed queue metrics (optional)
 * @returns {Array<string>} List of dynamically generated insights
 */
export const getQueueInsights = (jobs = [], metrics = null) => {
  const activeQueue = getActiveQueue(jobs);
  const pendingJobs = activeQueue.filter(j => j.status === 'Received');
  const processingJobs = activeQueue.filter(j => j.status === 'Processing');
  const printingJobs = activeQueue.filter(j => j.status === 'Printing');
  const readyJobs = jobs.filter(j => j.status === 'Ready');

  if (activeQueue.length === 0) {
    return [
      'The print queue is currently clear.',
      'No active print workload at this time. Ready for new submissions.'
    ];
  }

  const insights = [];

  // Insight 1: Pending queue count
  if (pendingJobs.length > 0) {
    insights.push(`${pendingJobs.length} ${pendingJobs.length === 1 ? 'job is' : 'jobs are'} currently waiting in the queue.`);
  } else {
    insights.push('All incoming requests have been allocated to workstations.');
  }

  // Insight 2: Workload level
  let workload = 'Low';
  const totalCopies = activeQueue.reduce((acc, j) => acc + (Number(j.copies) || 1), 0);
  if (activeQueue.length >= 6 || totalCopies >= 15) {
    workload = 'High';
    insights.push('Queue workload is currently high. Multiple print jobs are waiting, so students may experience longer turnaround times.');
  } else if (activeQueue.length >= 3 || totalCopies >= 6) {
    workload = 'Moderate';
    insights.push('Queue workload is currently moderate. Several jobs are waiting, so students may experience a short delay.');
  } else {
    insights.push('Queue workload is currently low. Incoming print jobs are being processed promptly with minimal wait.');
  }

  // Insight 3: High priority or long waiting job recommendation
  const prioritized = activeQueue.map(job => ({
    job,
    ...calculateJobPriority(job, jobs)
  }));

  const highPriority = prioritized.find(p => p.priority === 'High');
  if (highPriority) {
    const j = highPriority.job;
    const identifier = j.queueNo || j.id || 'current job';
    if (highPriority.reason === 'Waiting longer in queue') {
      insights.push(`Job ${identifier} may need attention because it has been waiting longer.`);
    } else if (highPriority.reason === 'High copy volume') {
      insights.push(`Job ${identifier} has a high copy count (${j.copies} copies) and may require dedicated paper allocation.`);
    } else {
      insights.push(`Job ${identifier} is flagged for priority attention (${highPriority.reason}).`);
    }
  } else if (processingJobs.length > 0) {
    const firstProc = processingJobs[0];
    insights.push(`Job ${firstProc.queueNo || firstProc.id} is progressing normally in workstation spooling.`);
  }

  // Insight 4: Ready pickups alert
  if (readyJobs.length > 0) {
    insights.push(`${readyJobs.length} ${readyJobs.length === 1 ? 'completed order is' : 'completed orders are'} ready for collection at Counter 1.`);
  }

  return insights;
};

/**
 * Performs complete AI-ready queue analysis.
 *
 * @param {Array} jobs - List of all print jobs
 * @returns {Object} Comprehensive queue analysis and workload summary
 */
export const analyzeQueue = (jobs = []) => {
  if (!Array.isArray(jobs)) {
    return {
      totalActiveJobs: 0,
      totalCopies: 0,
      totalPages: 0,
      pendingJobs: 0,
      processingJobs: 0,
      printingJobs: 0,
      readyJobs: 0,
      averageWaitingTime: '0 min',
      averageWaitingMinutes: 0,
      currentWorkload: 'Low',
      queueStatus: 'Low',
      insights: ['The print queue is currently empty.']
    };
  }

  const activeQueue = getActiveQueue(jobs);
  const pendingJobs = activeQueue.filter(j => j.status === 'Received');
  const processingJobs = activeQueue.filter(j => j.status === 'Processing');
  const printingJobs = activeQueue.filter(j => j.status === 'Printing');
  const readyJobs = jobs.filter(j => j.status === 'Ready');

  const totalActiveJobs = activeQueue.length;
  const totalCopies = activeQueue.reduce((acc, j) => acc + Math.max(1, Number(j.copies) || 1), 0);
  const totalPages = activeQueue.reduce((acc, j) => acc + Math.max(1, Number(j.pages || j.pageCount) || 10), 0);

  // Compute average estimated wait time
  let totalWaitMins = 0;
  activeQueue.forEach(j => {
    const pred = calculateEstimatedWaitTime(j, jobs);
    totalWaitMins += pred.estimatedMinutes || 0;
  });

  const averageWaitingMinutes = totalActiveJobs > 0 
    ? Math.max(1, Math.round(totalWaitMins / totalActiveJobs)) 
    : 0;
  const averageWaitingTime = `${averageWaitingMinutes} min`;

  // Workload Classification (Deterministic, Realistic)
  let currentWorkload = 'Low';
  if (totalActiveJobs >= 6 || totalCopies >= 15 || averageWaitingMinutes >= 12) {
    currentWorkload = 'High';
  } else if (totalActiveJobs >= 3 || totalCopies >= 6 || averageWaitingMinutes >= 6) {
    currentWorkload = 'Moderate';
  } else {
    currentWorkload = totalActiveJobs === 0 ? 'Low' : 'Low';
  }

  const queueStatus = currentWorkload;
  const insights = getQueueInsights(jobs, { totalActiveJobs, totalCopies, currentWorkload, averageWaitingMinutes });

  return {
    totalActiveJobs,
    totalCopies,
    totalPages,
    pendingJobs: pendingJobs.length,
    processingJobs: processingJobs.length,
    printingJobs: printingJobs.length,
    readyJobs: readyJobs.length,
    averageWaitingTime,
    averageWaitingMinutes,
    currentWorkload,
    queueStatus,
    insights
  };
};

/**
 * Enriches active jobs with priority recommendations and reasons.
 *
 * @param {Array} jobs - List of print jobs
 * @returns {Array} Enriched jobs with priority, priorityScore, and priorityReason
 */
export const enrichJobsWithPriority = (jobs = []) => {
  if (!Array.isArray(jobs)) return [];

  return jobs.map(job => {
    const priorityInfo = calculateJobPriority(job, jobs);
    return {
      ...job,
      priority: priorityInfo.priority,
      priorityScore: priorityInfo.priorityScore,
      priorityReason: priorityInfo.reason,
      reason: priorityInfo.reason
    };
  });
};

export default {
  calculateJobPriority,
  getQueueInsights,
  analyzeQueue,
  enrichJobsWithPriority
};
