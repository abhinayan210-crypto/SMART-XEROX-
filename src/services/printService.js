/**
 * Print Service Layer (STEP 10 & STEP 11)
 * Primary source of truth: Express + SQLite REST Backend API (http://localhost:5000/api)
 * Fallback: localStorage & in-memory cache when backend is offline.
 * Synchronizes print requests, live queue status transitions, notifications,
 * waiting time predictions, and AI queue analysis between Student and Staff Dashboards.
 */

import {
  initialStaffQueueJobs,
  initialCompletedJobs,
  mockNotifications,
  mockStaffNotifications,
  mockPrinterUnits,
  mockCurrentUser,
  mockStaffUser,
  mockPricingRules
} from '../data/mockData.js';
import {
  calculateEstimatedWaitTime,
  enrichJobsWithPredictions,
  getActiveQueue,
  getQueueSummary
} from './waitingTimeService.js';
import {
  analyzeQueue,
  calculateJobPriority,
  getQueueInsights,
  enrichJobsWithPriority
} from './queueAnalysisService.js';
import { getAIResponse } from './aiAssistantService.js';
import { notificationService } from './notificationService.js';
import { apiService } from './apiService.js';

const STORAGE_KEYS = {
  ACTIVE_JOBS: 'smartprint_active_jobs_v1',
  COMPLETED_JOBS: 'smartprint_completed_jobs_v1',
  STUDENT_NOTIFS: 'smartprint_student_notifs_v1',
  STAFF_NOTIFS: 'smartprint_staff_notifs_v1'
};

// Listeners for real-time reactivity
const listeners = new Set();

const notifyListeners = () => {
  listeners.forEach(callback => {
    try {
      callback();
    } catch (err) {
      console.error('Error notifying printService listener:', err);
    }
  });
};

// Window storage listener for multi-tab synchronization
if (typeof window !== 'undefined') {
  window.addEventListener('storage', () => {
    notifyListeners();
  });
}

// In-memory store fallback for SSR/testing environments
const memoryStore = {};

// Helpers for localStorage access with fallback
const getStorageItem = (key, defaultVal) => {
  if (typeof window === 'undefined') {
    return memoryStore[key] !== undefined ? memoryStore[key] : defaultVal;
  }
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(defaultVal));
      return defaultVal;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.warn(`Error reading localStorage key ${key}:`, e);
    return defaultVal;
  }
};

const setStorageItem = (key, val) => {
  if (typeof window === 'undefined') {
    memoryStore[key] = val;
    notifyListeners();
    return;
  }
  try {
    localStorage.setItem(key, JSON.stringify(val));
    notifyListeners();
  } catch (e) {
    console.warn(`Error writing localStorage key ${key}:`, e);
  }
};

// Calculate stageIndex based on status
const getStageIndex = (status) => {
  switch (status) {
    case 'Received': return 0;
    case 'Processing': return 1;
    case 'Printing': return 2;
    case 'Ready': return 3;
    case 'Collected':
    case 'Completed': return 4;
    default: return 0;
  }
};

/**
 * Normalizes backend SQLite job record into rich frontend Job representation
 */
export const normalizeBackendJob = (job) => {
  if (!job) return null;

  const copies = Math.max(1, Number(job.copies) || 1);
  const printType = (job.print_type || job.printType || 'B&W').trim();
  const isColor = printType === 'Colour' || printType === 'Color';
  const fileName = (job.file_name || job.fileName || job.documentName || 'Document.pdf').trim();
  const studentId = job.student_id || job.studentId || mockCurrentUser.id;
  const studentName = job.student_name || job.studentName || job.student || (studentId === mockCurrentUser.id ? mockCurrentUser.name : 'Student');
  const status = (job.status || 'Received').trim();
  const submittedAt = job.submitted_at || job.submittedAt || new Date().toISOString();

  // Format date/time
  const dateObj = new Date(submittedAt);
  const isToday = new Date().toDateString() === dateObj.toDateString();
  const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formattedTime = isToday ? `Today, ${timeStr}` : `${dateObj.toLocaleDateString()}, ${timeStr}`;

  // Deterministic PIN derived from ID or random fallback
  const digitsOnly = job.id ? job.id.replace(/\D/g, '') : '';
  const pin = digitsOnly.length >= 4 ? digitsOnly.slice(-4) : (job.pickupPin || '4821');

  // Approximate page count
  let pages = Number(job.pages || job.pageCount);
  if (!pages) {
    const pageRange = job.page_range || job.pageRange;
    if (pageRange && pageRange.includes('-')) {
      const parts = pageRange.split('-');
      const p1 = parseInt(parts[0], 10);
      const p2 = parseInt(parts[1], 10);
      pages = (!isNaN(p1) && !isNaN(p2) && p2 >= p1) ? (p2 - p1 + 1) : 12;
    } else {
      pages = 12;
    }
  }

  // Assigned printer based on status
  let assignedPrinter = job.assignedPrinter || 'Pending Allocation';
  if (assignedPrinter === 'Pending Allocation') {
    if (status === 'Processing') assignedPrinter = 'Xerox WorkCentre 7845';
    else if (status === 'Printing') assignedPrinter = isColor ? 'Epson EcoTank Pro Color' : 'Xerox WorkCentre 7845';
    else if (status === 'Ready' || status === 'Collected' || status === 'Completed') {
      assignedPrinter = isColor ? 'Epson EcoTank Pro Color' : 'Xerox WorkCentre 7845';
    }
  }

  const cost = Number(job.cost) || (pages * copies * (isColor ? 5 : 2));

  return {
    id: job.id,
    queueNo: `#${(job.id || '').replace(/\D/g, '').slice(-3).padStart(3, '0') || '001'}`,
    student: studentName,
    studentName: studentName,
    studentId: studentId,
    studentEmail: job.student_email || (studentId === mockCurrentUser.id ? mockCurrentUser.email : ''),
    department: job.department || mockCurrentUser.department,
    fileName: fileName,
    documentName: fileName,
    copies: copies,
    printType: isColor ? 'Colour' : 'B&W',
    colorMode: isColor ? 'Color' : 'B&W',
    pages: pages,
    pageCount: pages,
    paperSize: job.paper_size || job.paperSize || 'A4',
    pageRange: job.page_range || job.pageRange || 'All Pages',
    isDoubleSided: job.is_double_sided !== undefined ? Boolean(job.is_double_sided) : true,
    binding: job.binding || job.bindingOption || 'None',
    bindingOption: job.binding || job.bindingOption || 'None',
    cost: cost,
    status: status,
    stageIndex: getStageIndex(status),
    pickupPin: pin,
    queuePosition: status === 'Ready' || status === 'Collected' || status === 'Completed' ? 0 : 1,
    estimatedWaitTime: status === 'Ready' ? 'Ready for Pickup' : (status === 'Collected' || status === 'Completed' ? 'Completed' : 'Calculating...'),
    estimatedMinutes: status === 'Ready' || status === 'Collected' || status === 'Completed' ? 0 : 5,
    assignedPrinter: assignedPrinter,
    submittedTime: formattedTime,
    date: formattedTime,
    submittedAt: submittedAt,
    updatedAt: job.updated_at || job.updatedAt || submittedAt
  };
};

export const printService = {
  /**
   * Subscribe to state changes
   * @param {Function} callback
   * @returns {Function} unsubscribe function
   */
  subscribe(callback) {
    listeners.add(callback);
    return () => listeners.delete(callback);
  },

  /**
   * Asynchronously fetch all print jobs from Express + SQLite Backend API
   * and update internal cached store.
   * @returns {Promise<{ activeJobs: Array, completedJobs: Array }>}
   */
  async fetchPrintJobs() {
    try {
      const rawJobs = await apiService.getPrintJobs();
      if (Array.isArray(rawJobs)) {
        const normalized = rawJobs.map(normalizeBackendJob).filter(Boolean);

        const active = normalized.filter(j => 
          j.status === 'Received' || j.status === 'Processing' || j.status === 'Printing' || j.status === 'Ready'
        );
        const completed = normalized.filter(j => 
          j.status === 'Collected' || j.status === 'Completed'
        );

        const enrichedActive = enrichJobsWithPredictions(active);
        setStorageItem(STORAGE_KEYS.ACTIVE_JOBS, enrichedActive);
        setStorageItem(STORAGE_KEYS.COMPLETED_JOBS, completed);
        notifyListeners();

        return { activeJobs: enrichedActive, completedJobs: completed };
      }
    } catch (err) {
      console.warn('[SmartPrint] Backend unavailable, using cached jobs:', err.message);
    }
    return {
      activeJobs: this.getPrintJobs(),
      completedJobs: this.getCompletedJobs()
    };
  },

  /**
   * Asynchronously fetch student print jobs from Backend API
   * @param {string} studentId
   * @returns {Promise<Array>}
   */
  async fetchStudentJobs(studentId = mockCurrentUser.id) {
    try {
      const studentJobs = await apiService.getStudentPrintJobs(studentId);
      if (Array.isArray(studentJobs)) {
        const normalized = studentJobs.map(normalizeBackendJob).filter(Boolean);

        // Also fetch all jobs to calculate global queue positions accurately
        await this.fetchPrintJobs();
        return this.getStudentJobs(studentId);
      }
    } catch (err) {
      console.warn('[SmartPrint] Backend student jobs unavailable, using cached:', err.message);
    }
    return this.getStudentJobs(studentId);
  },

  /**
   * Synchronize all print jobs and notifications with backend in one call
   * @param {string} studentId
   */
  async syncWithBackend(studentId = mockCurrentUser.id) {
    try {
      await Promise.allSettled([
        this.fetchPrintJobs(),
        notificationService.fetchNotifications(studentId)
      ]);
    } catch (err) {
      console.warn('[SmartPrint] Background sync encountered an issue:', err.message);
    }
  },

  /**
   * Fetch all active queue print jobs (synchronously from cache, enriched with live predictions)
   */
  getPrintJobs() {
    const rawJobs = getStorageItem(STORAGE_KEYS.ACTIVE_JOBS, initialStaffQueueJobs);
    return enrichJobsWithPredictions(rawJobs);
  },

  /**
   * Fetch all completed print jobs archive (synchronously from cache)
   */
  getCompletedJobs() {
    return getStorageItem(STORAGE_KEYS.COMPLETED_JOBS, initialCompletedJobs);
  },

  /**
   * Fetch all jobs submitted by a student (both active and completed)
   */
  getStudentJobs(studentId = mockCurrentUser.id) {
    const active = this.getPrintJobs();
    const completed = this.getCompletedJobs();

    // Match by studentId, student name, or return all active for prototype if matching user
    const studentActive = active.filter(j => 
      j.studentId === studentId || 
      j.student === mockCurrentUser.name || 
      j.studentName === mockCurrentUser.name
    );

    const studentCompleted = completed.filter(j => 
      j.studentId === studentId || 
      j.student === mockCurrentUser.name || 
      j.studentName === mockCurrentUser.name
    );

    return [...studentActive, ...studentCompleted];
  },

  /**
   * Submit a new print request (Primary: Backend API, Fallback: LocalStorage)
   * @param {Object} jobData
   * @returns {Promise<Object>} Created job
   */
  async addPrintJob(jobData) {
    const docName = (jobData.fileName || jobData.documentName || 'Document_Submission.pdf').trim();
    const copies = Math.max(1, Number(jobData.copies) || 1);
    const printType = jobData.printType || 'B&W';
    const pageRange = jobData.pageRange || (jobData.pageRangeType === 'custom' ? (jobData.customPages || 'Custom') : 'All Pages');
    const studentId = jobData.studentId || mockCurrentUser.id;

    // 1. Try sending to Express + SQLite backend
    try {
      const backendCreated = await apiService.createPrintJob({
        student_id: studentId,
        file_name: docName,
        copies: copies,
        print_type: printType,
        page_range: pageRange
      });

      if (backendCreated && backendCreated.id) {
        // Backend auto-created the job & status notification in SQLite
        const normalized = normalizeBackendJob({
          ...backendCreated,
          student_name: jobData.student || mockCurrentUser.name,
          student_email: mockCurrentUser.email,
          paper_size: jobData.paperSize || 'A4',
          binding: jobData.bindingOption || 'None',
          cost: jobData.cost || this.calculateCost({
            pages: 12,
            copies: copies,
            colorMode: printType === 'Colour' ? 'Color' : 'B&W',
            paperSize: jobData.paperSize,
            binding: jobData.bindingOption
          })
        });

        // Update local active cache with new job + recalculate predictions
        const currentActive = getStorageItem(STORAGE_KEYS.ACTIVE_JOBS, initialStaffQueueJobs);
        const updatedActive = enrichJobsWithPredictions([normalized, ...currentActive.filter(j => j.id !== normalized.id)]);
        setStorageItem(STORAGE_KEYS.ACTIVE_JOBS, updatedActive);

        // Fetch fresh notifications from backend
        notificationService.fetchNotifications(studentId).catch(() => {});

        // Create Staff Notification locally for live dashboard view
        const staffNotifs = this.getNotifications('staff');
        const newStaffNotif = {
          id: `STF-NOTIF-${Date.now()}`,
          title: 'New Print Request',
          message: `New request from ${normalized.student} (${docName} • ${copies} ${copies > 1 ? 'copies' : 'copy'}).`,
          time: 'Just now',
          status: 'Received',
          isUnread: true
        };
        setStorageItem(STORAGE_KEYS.STAFF_NOTIFS, [newStaffNotif, ...staffNotifs]);

        notifyListeners();
        return updatedActive.find(j => j.id === normalized.id) || normalized;
      }
    } catch (err) {
      console.warn('[SmartPrint] Backend print job submission failed, falling back to local mode:', err.message);
    }

    // 2. Fallback to LocalStorage Generation if backend is unreachable
    const activeJobs = getStorageItem(STORAGE_KEYS.ACTIVE_JOBS, initialStaffQueueJobs);
    const newIdNum = Math.floor(1000 + Math.random() * 9000);
    const newJobId = `PRT-${newIdNum}`;
    const queueNumber = `#${String(activeJobs.length + 1).padStart(3, '0')}`;
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    const now = new Date();
    const timeFormatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const rawJob = {
      id: newJobId,
      queueNo: queueNumber,
      student: jobData.student || mockCurrentUser.name,
      studentId: studentId,
      studentName: jobData.student || mockCurrentUser.name,
      department: jobData.department || mockCurrentUser.department,
      fileName: docName,
      documentName: docName,
      copies: copies,
      printType: printType,
      colorMode: printType === 'Colour' || jobData.colorMode === 'Color' ? 'Color' : 'B&W',
      pages: Number(jobData.pages || jobData.pageCount) || 12,
      pageCount: Number(jobData.pages || jobData.pageCount) || 12,
      paperSize: jobData.paperSize || 'A4',
      pageRange: pageRange,
      isDoubleSided: jobData.isDoubleSided !== undefined ? jobData.isDoubleSided : true,
      binding: jobData.binding || jobData.bindingOption || 'None',
      bindingOption: jobData.binding || jobData.bindingOption || 'None',
      cost: Number(jobData.cost) || this.calculateCost({
        pages: Number(jobData.pages || jobData.pageCount) || 12,
        copies: copies,
        colorMode: printType === 'Colour' ? 'Color' : 'B&W',
        paperSize: jobData.paperSize || 'A4',
        binding: jobData.binding || 'None'
      }),
      status: 'Received',
      stageIndex: 0,
      pickupPin: pin,
      assignedPrinter: 'Pending Allocation',
      submittedTime: `Today, ${timeFormatted}`,
      date: `Today, ${timeFormatted}`,
      submittedAt: now.toISOString()
    };

    const updatedActive = enrichJobsWithPredictions([rawJob, ...activeJobs]);
    setStorageItem(STORAGE_KEYS.ACTIVE_JOBS, updatedActive);

    // Create Local Notification
    notificationService.generateStatusNotification(rawJob, null, 'Received');

    // Create Staff Notification
    const staffNotifs = this.getNotifications('staff');
    const newStaffNotif = {
      id: `STF-NOTIF-${Date.now()}`,
      title: 'New Print Request',
      message: `New request from ${rawJob.student} (${docName} • ${copies} ${copies > 1 ? 'copies' : 'copy'}).`,
      time: 'Just now',
      status: 'Received',
      isUnread: true
    };
    setStorageItem(STORAGE_KEYS.STAFF_NOTIFS, [newStaffNotif, ...staffNotifs]);

    notifyListeners();
    return updatedActive.find(j => j.id === newJobId) || rawJob;
  },

  /**
   * Update status of a print job (Primary: Backend API, Fallback: LocalStorage)
   * Progression: Received -> Processing -> Printing -> Ready -> Collected
   * @param {string} jobId
   * @param {string} newStatus
   * @returns {Promise<Object>} Updated job
   */
  async updatePrintJobStatus(jobId, newStatus) {
    const rawActiveJobs = getStorageItem(STORAGE_KEYS.ACTIVE_JOBS, initialStaffQueueJobs);
    const targetJob = rawActiveJobs.find(j => j.id === jobId);

    // 1. Send status update to Backend API
    try {
      const backendUpdated = await apiService.updatePrintJobStatus(jobId, newStatus);
      if (backendUpdated) {
        // Status updated in SQLite and automatic notification inserted in database
        const normalized = normalizeBackendJob({
          ...(targetJob || {}),
          ...backendUpdated
        });

        if (newStatus === 'Collected') {
          // Remove from active queue, add to completed
          const remainingActive = rawActiveJobs.filter(j => j.id !== jobId);
          const updatedActive = enrichJobsWithPredictions(remainingActive);
          setStorageItem(STORAGE_KEYS.ACTIVE_JOBS, updatedActive);

          const completedJobs = this.getCompletedJobs();
          const newlyCompleted = {
            ...normalized,
            status: 'Collected',
            stageIndex: 4,
            queuePosition: 0,
            estimatedWaitTime: 'Completed',
            estimatedMinutes: 0
          };
          setStorageItem(STORAGE_KEYS.COMPLETED_JOBS, [newlyCompleted, ...completedJobs.filter(j => j.id !== jobId)]);
        } else {
          // Update active queue
          const modified = rawActiveJobs.map(j => j.id === jobId ? normalized : j);
          const updatedActive = enrichJobsWithPredictions(modified);
          setStorageItem(STORAGE_KEYS.ACTIVE_JOBS, updatedActive);
        }

        // Pull latest backend notifications
        notificationService.fetchNotifications(normalized.studentId || mockCurrentUser.id).catch(() => {});

        // Staff notification
        const staffNotifs = this.getNotifications('staff');
        const staffNotif = {
          id: `STF-NOTIF-${Date.now()}`,
          title: newStatus === 'Collected' ? 'Job Handed Over / Collected' : `Queue Status: ${newStatus}`,
          message: `"${normalized.fileName}" (${normalized.queueNo || normalized.id}) updated to ${newStatus}.`,
          time: 'Just now',
          status: newStatus,
          isUnread: true
        };
        setStorageItem(STORAGE_KEYS.STAFF_NOTIFS, [staffNotif, ...staffNotifs]);

        notifyListeners();
        return normalized;
      }
    } catch (err) {
      console.warn('[SmartPrint] Backend status update failed, performing local transition:', err.message);
    }

    // 2. Fallback to LocalStorage Progression
    if (!targetJob) {
      console.warn(`Job ${jobId} not found in active queue`);
      return null;
    }

    const previousStatus = targetJob.status;
    const docName = targetJob.fileName || targetJob.documentName;
    const studentName = targetJob.student || targetJob.studentName;
    const pin = targetJob.pickupPin;
    const now = new Date();
    const timeFormatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (newStatus === 'Collected') {
      const remainingActive = rawActiveJobs.filter(j => j.id !== jobId);
      const updatedActive = enrichJobsWithPredictions(remainingActive);
      setStorageItem(STORAGE_KEYS.ACTIVE_JOBS, updatedActive);

      const completedJobs = this.getCompletedJobs();
      const newlyCompleted = {
        ...targetJob,
        status: 'Collected',
        stageIndex: 4,
        queuePosition: 0,
        estimatedWaitTime: 'Completed',
        estimatedMinutes: 0,
        completedTime: `Today, ${timeFormatted}`,
        completedAt: now.toISOString()
      };
      setStorageItem(STORAGE_KEYS.COMPLETED_JOBS, [newlyCompleted, ...completedJobs]);

      notificationService.generateStatusNotification(targetJob, previousStatus, 'Collected');

      const staffNotifs = this.getNotifications('staff');
      const staffNotif = {
        id: `STF-NOTIF-${Date.now()}`,
        title: 'Job Handed Over / Collected',
        message: `"${docName}" was handed over to ${studentName} (PIN: ${pin}).`,
        time: 'Just now',
        status: 'Collected',
        isUnread: true
      };
      setStorageItem(STORAGE_KEYS.STAFF_NOTIFS, [staffNotif, ...staffNotifs]);

      notifyListeners();
      return newlyCompleted;
    } else {
      let assignedPrinter = targetJob.assignedPrinter;
      if (newStatus === 'Processing' && (assignedPrinter === 'Pending Allocation' || !assignedPrinter)) {
        assignedPrinter = 'Xerox WorkCentre 7845';
      } else if (newStatus === 'Printing' && (assignedPrinter === 'Pending Allocation' || !assignedPrinter)) {
        assignedPrinter = targetJob.printType === 'Colour' ? 'Epson EcoTank Pro Color' : 'Xerox WorkCentre 7845';
      }

      const stageIdx = getStageIndex(newStatus);
      let updatedTarget = null;
      const modifiedRaw = rawActiveJobs.map(job => {
        if (job.id === jobId) {
          updatedTarget = {
            ...job,
            status: newStatus,
            stageIndex: stageIdx,
            assignedPrinter: assignedPrinter
          };
          return updatedTarget;
        }
        return job;
      });

      const updatedActive = enrichJobsWithPredictions(modifiedRaw);
      setStorageItem(STORAGE_KEYS.ACTIVE_JOBS, updatedActive);

      const resolvedUpdatedJob = updatedActive.find(j => j.id === jobId) || updatedTarget;

      notificationService.generateStatusNotification(resolvedUpdatedJob, previousStatus, newStatus);

      const staffNotifs = this.getNotifications('staff');
      const staffNotif = {
        id: `STF-NOTIF-${Date.now()}`,
        title: `Queue Status: ${newStatus}`,
        message: `"${docName}" (${targetJob.queueNo || targetJob.id}) updated to ${newStatus}.`,
        time: 'Just now',
        status: newStatus,
        isUnread: true
      };
      setStorageItem(STORAGE_KEYS.STAFF_NOTIFS, [staffNotif, ...staffNotifs]);

      notifyListeners();
      return resolvedUpdatedJob;
    }
  },

  /**
   * Fetch notifications (delegates to notificationService for students)
   */
  getNotifications(role = 'student', studentId = mockCurrentUser.id) {
    if (role === 'staff') {
      return getStorageItem(STORAGE_KEYS.STAFF_NOTIFS, mockStaffNotifications);
    }
    return notificationService.getNotifications(studentId);
  },

  /**
   * Get unread notifications count
   */
  getUnreadNotificationsCount(role = 'student', studentId = mockCurrentUser.id) {
    if (role === 'staff') {
      const notifs = this.getNotifications('staff');
      return notifs.filter(n => n.isUnread).length;
    }
    return notificationService.getUnreadCount(studentId);
  },

  /**
   * Mark all notifications as read
   */
  async markNotificationsRead(role = 'student', studentId = mockCurrentUser.id) {
    if (role === 'staff') {
      const notifs = this.getNotifications('staff');
      const updated = notifs.map(n => ({ ...n, isUnread: false }));
      setStorageItem(STORAGE_KEYS.STAFF_NOTIFS, updated);
      notifyListeners();
      return updated;
    }
    return notificationService.markAllNotificationsAsRead(studentId);
  },

  /**
   * Mark individual notification as read
   */
  async markNotificationAsRead(notificationId) {
    return notificationService.markNotificationAsRead(notificationId);
  },

  /**
   * Clear notifications for a student
   */
  async clearNotifications(studentId = mockCurrentUser.id) {
    return notificationService.clearNotifications(studentId);
  },

  /**
   * Get list of Xerox hardware printers
   */
  getPrinters() {
    return [...mockPrinterUnits];
  },

  /**
   * Calculate cost based on pricing rules
   */
  calculateCost({ pages = 1, copies = 1, colorMode = 'B&W', isDoubleSided = false, paperSize = 'A4', binding = 'None' }) {
    let baseRate = 0;
    const isColor = colorMode === 'Color' || colorMode === 'Colour';

    if (isColor) {
      baseRate = isDoubleSided 
        ? (Math.ceil(pages / 2) * mockPricingRules.colorDoubleSidedSheet) 
        : (pages * mockPricingRules.colorSinglePage);
    } else {
      baseRate = isDoubleSided 
        ? (Math.ceil(pages / 2) * mockPricingRules.bwDoubleSidedSheet) 
        : (pages * mockPricingRules.bwSinglePage);
    }

    if (paperSize === 'A3') {
      baseRate *= mockPricingRules.a3Multiplier;
    }

    let total = baseRate * copies;

    if (binding === 'Spiral Binding') total += mockPricingRules.spiralBinding;
    if (binding === 'Soft Binding') total += mockPricingRules.softBinding;
    if (binding === 'Hard Binding') total += mockPricingRules.hardBinding;

    return Math.max(1, total);
  },

  /**
   * Calculate wait time for a specific job
   */
  calculateEstimatedWaitTime(job, allJobs) {
    const jobs = allJobs || this.getPrintJobs();
    return calculateEstimatedWaitTime(job, jobs);
  },

  /**
   * Get queue analytics & workload summary (Step 6)
   */
  getQueueSummary(allJobs) {
    const jobs = allJobs || this.getPrintJobs();
    return getQueueSummary(jobs);
  },

  /**
   * AI-Ready Queue Analysis (Step 7)
   */
  analyzeQueue(allJobs) {
    const jobs = allJobs || this.getPrintJobs();
    return analyzeQueue(jobs);
  },

  /**
   * Calculate priority recommendation for a job (Step 7)
   */
  calculateJobPriority(job, allJobs) {
    const jobs = allJobs || this.getPrintJobs();
    return calculateJobPriority(job, jobs);
  },

  /**
   * Dynamic insights for staff dashboard (Step 7)
   */
  getQueueInsights(allJobs) {
    const jobs = allJobs || this.getPrintJobs();
    return getQueueInsights(jobs);
  },

  /**
   * Get all active jobs enriched with priority recommendations (Step 7)
   */
  getPrioritizedQueue(allJobs) {
    const jobs = allJobs || this.getPrintJobs();
    const active = getActiveQueue(jobs);
    return enrichJobsWithPriority(active);
  },

  /**
   * SmartPrint AI Assistant Response (Step 8)
   */
  getAIResponse(message, studentJobs, allJobs) {
    const student = studentJobs || this.getStudentJobs();
    const all = allJobs || this.getPrintJobs();
    return getAIResponse(message, student, all);
  },

  /**
   * Reset all storage to default mock data (useful for testing)
   */
  resetToMockData() {
    setStorageItem(STORAGE_KEYS.ACTIVE_JOBS, initialStaffQueueJobs);
    setStorageItem(STORAGE_KEYS.COMPLETED_JOBS, initialCompletedJobs);
    setStorageItem(STORAGE_KEYS.STUDENT_NOTIFS, mockNotifications);
    setStorageItem(STORAGE_KEYS.STAFF_NOTIFS, mockStaffNotifications);
    notificationService.resetToMockData();
    notifyListeners();
  }
};

export default printService;
