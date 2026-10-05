/**
 * Smart Waiting Time Prediction Service (STEP 6)
 * Calculates realistic queue positions and estimated waiting times for print jobs
 * based on active queue depth, copy count, printer workload, and status progression.
 * Designed to be modular so it can later be seamlessly replaced by a real AI/ML model.
 */

// Active workflow stages in execution order
export const ACTIVE_STATUSES = ['Printing', 'Processing', 'Received'];

/**
 * Filter and sort active queue jobs in execution order:
 * Active queue: Printing (currently on hardware) -> Processing -> Received
 * Ready and Collected jobs are excluded from the active queue.
 *
 * @param {Array} allJobs - All print jobs from shared state
 * @returns {Array} Sorted active print jobs
 */
export const getActiveQueue = (allJobs = []) => {
  if (!Array.isArray(allJobs)) return [];

  // Filter only active jobs (exclude Ready, Collected, Completed, Cancelled)
  const activeOnly = allJobs.filter(job => {
    if (!job || !job.status) return false;
    const status = job.status.trim();
    return status === 'Printing' || status === 'Processing' || status === 'Received';
  });

  // Sort by execution priority: Printing first, then Processing, then Received.
  // Within the same status, preserve submission / existing queue order
  const statusPriority = {
    'Printing': 1,
    'Processing': 2,
    'Received': 3
  };

  return [...activeOnly].sort((a, b) => {
    const pA = statusPriority[a.status] || 99;
    const pB = statusPriority[b.status] || 99;
    if (pA !== pB) return pA - pB;
    return 0; // preserve relative order
  });
};

/**
 * Calculates estimated waiting time and queue position for a specific job.
 * 
 * Logic rules:
 * - Ready & Collected jobs have 0 min wait time and 0 queue position.
 * - Printing jobs: already on printer, remaining time is small (proportional to copies).
 * - Processing & Received jobs: wait time includes time of all jobs ahead in queue + own printing time.
 * - More copies increase estimated print time.
 *
 * @param {Object} job - The target print job
 * @param {Array} allJobs - All jobs currently in the system
 * @returns {Object} { estimatedMinutes: number, queuePosition: number, formattedWaitTime: string, status: string }
 */
export const calculateEstimatedWaitTime = (job, allJobs = []) => {
  if (!job) {
    return {
      estimatedMinutes: 0,
      queuePosition: 0,
      formattedWaitTime: '0 min',
      status: 'Unknown'
    };
  }

  const status = (job.status || 'Received').trim();
  const copies = Math.max(1, Number(job.copies) || 1);
  const pages = Math.max(1, Number(job.pages || job.pageCount) || 10);

  // 1. Ready or Completed / Collected jobs do not wait in queue
  if (status === 'Ready') {
    return {
      estimatedMinutes: 0,
      queuePosition: 0,
      formattedWaitTime: 'Ready for Pickup',
      status: 'Ready'
    };
  }

  if (status === 'Collected' || status === 'Completed') {
    return {
      estimatedMinutes: 0,
      queuePosition: 0,
      formattedWaitTime: 'Completed',
      status: status
    };
  }

  // 2. Get ordered active queue
  const activeQueue = getActiveQueue(allJobs);

  // Locate current job in the active queue
  const jobIndex = activeQueue.findIndex(j => j.id === job.id);
  const queuePosition = jobIndex !== -1 ? jobIndex + 1 : (status === 'Printing' ? 1 : activeQueue.length + 1);

  // 3. Compute time for jobs ahead in the queue
  let accumulatedMinutes = 0;

  // Time weight per copy helper (page-volume scaled)
  const getJobDuration = (jStatus, jCopies, jPages) => {
    const c = Math.max(1, Number(jCopies) || 1);
    const p = Math.max(1, Number(jPages) || 10);
    const pageFactor = p > 30 ? 1.5 : (p > 15 ? 1.2 : 1.0);

    if (jStatus === 'Printing') {
      // Actively printing: small remaining slice (1.5 min base * copies)
      return Math.max(1, Math.round(1.5 * c * pageFactor));
    } else if (jStatus === 'Processing') {
      // In processing/prep + spooling: 2 min base + copies factor
      return Math.max(2, Math.round(2 + (1.2 * c * pageFactor)));
    } else {
      // Received / queued: 2.5 min base + copies factor
      return Math.max(2, Math.round(2.5 + (1.5 * c * pageFactor)));
    }
  };

  if (status === 'Printing') {
    // Current job is actively printing right now
    // Estimated remaining time on printer
    const basePrintTime = Math.max(1, Math.round(1.5 * copies));
    accumulatedMinutes = basePrintTime;
  } else {
    // Current job is in Processing or Received
    // Sum time of all active jobs ahead of this job
    const jobsAhead = jobIndex !== -1 ? activeQueue.slice(0, jobIndex) : activeQueue;

    jobsAhead.forEach(aheadJob => {
      accumulatedMinutes += getJobDuration(
        aheadJob.status,
        aheadJob.copies,
        aheadJob.pages || aheadJob.pageCount
      );
    });

    // Add current job's own execution duration
    const ownTime = getJobDuration(status, copies, pages);
    accumulatedMinutes += ownTime;
  }

  // Ensure realistic non-zero integer
  const estimatedMinutes = Math.max(1, Math.round(accumulatedMinutes));
  const formattedWaitTime = `${estimatedMinutes} min`;

  return {
    estimatedMinutes,
    queuePosition,
    formattedWaitTime,
    status
  };
};

/**
 * Enriches a list of jobs with accurate dynamic queue positions and waiting times.
 *
 * @param {Array} jobsList - List of jobs to enrich
 * @returns {Array} Enriched jobs with recalculated queuePosition and estimatedWaitTime
 */
export const enrichJobsWithPredictions = (jobsList = []) => {
  if (!Array.isArray(jobsList)) return [];

  const activeQueue = getActiveQueue(jobsList);

  return jobsList.map(job => {
    const prediction = calculateEstimatedWaitTime(job, jobsList);
    return {
      ...job,
      queuePosition: prediction.queuePosition,
      estimatedWaitTime: prediction.formattedWaitTime,
      estimatedMinutes: prediction.estimatedMinutes
    };
  });
};

/**
 * Calculates high-level queue metrics and throughput for the Smart Prediction cards.
 *
 * @param {Array} allJobs - All jobs in the system
 * @returns {Object} Queue analytics summary
 */
export const getQueueSummary = (allJobs = []) => {
  const activeQueue = getActiveQueue(allJobs);
  const printingJobs = activeQueue.filter(j => j.status === 'Printing');
  const processingJobs = activeQueue.filter(j => j.status === 'Processing');
  const receivedJobs = activeQueue.filter(j => j.status === 'Received');

  let totalQueueMinutes = 0;
  activeQueue.forEach(job => {
    const copies = Math.max(1, Number(job.copies) || 1);
    if (job.status === 'Printing') {
      totalQueueMinutes += Math.max(1, Math.round(copies * 1.5));
    } else if (job.status === 'Processing') {
      totalQueueMinutes += Math.max(2, Math.round(2 + copies * 1.2));
    } else {
      totalQueueMinutes += Math.max(2, Math.round(2.5 + copies * 1.5));
    }
  });

  const totalActive = activeQueue.length;
  const avgWaitMinutes = totalActive > 0 ? Math.max(2, Math.round(totalQueueMinutes / totalActive)) : 0;

  return {
    totalActive,
    printingCount: printingJobs.length,
    processingCount: processingJobs.length,
    receivedCount: receivedJobs.length,
    totalQueueMinutes: Math.max(0, Math.round(totalQueueMinutes)),
    avgWaitMinutes
  };
};

export default {
  ACTIVE_STATUSES,
  getActiveQueue,
  calculateEstimatedWaitTime,
  enrichJobsWithPredictions,
  getQueueSummary
};
