/**
 * Print Service Layer (Shared Frontend Store)
 * Synchronizes print requests, queue status transitions, notifications,
 * and completion history between Student Dashboard and Staff Dashboard
 * using localStorage and reactive event listeners.
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
} from '../data/mockData';

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

// Helpers for localStorage access with fallback
const getStorageItem = (key, defaultVal) => {
  if (typeof window === 'undefined') return defaultVal;
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
  if (typeof window === 'undefined') return;
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

// Calculate estimated wait time based on stage and queue load
const calculateWaitTime = (status, queuePosition = 1, copies = 1) => {
  switch (status) {
    case 'Received':
      return `${Math.max(4, queuePosition * 3 + (copies > 2 ? 2 : 0))} minutes`;
    case 'Processing':
      return `${Math.max(3, queuePosition * 2 + 3)} minutes`;
    case 'Printing':
      return `${Math.max(2, copies * 2)} minutes`;
    case 'Ready':
      return 'Ready for Pickup';
    case 'Collected':
    case 'Completed':
      return 'Completed';
    default:
      return '5 minutes';
  }
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
   * Fetch all active queue print jobs
   */
  getPrintJobs() {
    return getStorageItem(STORAGE_KEYS.ACTIVE_JOBS, initialStaffQueueJobs);
  },

  /**
   * Fetch all completed print jobs archive
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

    // Combine active first, then completed
    return [...studentActive, ...studentCompleted];
  },

  /**
   * Submit a new print request (From Student Dashboard)
   */
  addPrintJob(jobData) {
    const activeJobs = this.getPrintJobs();
    const newIdNum = Math.floor(1000 + Math.random() * 9000);
    const newJobId = `PRT-${newIdNum}`;
    const queueNumber = `#${String(activeJobs.length + 1).padStart(3, '0')}`;
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    const docName = (jobData.fileName || jobData.documentName || 'Document_Submission.pdf').trim();

    const now = new Date();
    const timeFormatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newJob = {
      id: newJobId,
      queueNo: queueNumber,
      student: jobData.student || mockCurrentUser.name,
      studentId: jobData.studentId || mockCurrentUser.id,
      studentName: jobData.student || mockCurrentUser.name,
      department: jobData.department || mockCurrentUser.department,
      fileName: docName,
      documentName: docName,
      copies: Number(jobData.copies) || 1,
      printType: jobData.printType || 'B&W',
      colorMode: jobData.printType === 'Colour' || jobData.colorMode === 'Color' || jobData.colorMode === 'Colour' ? 'Color' : 'B&W',
      pages: Number(jobData.pages || jobData.pageCount) || 12,
      pageCount: Number(jobData.pages || jobData.pageCount) || 12,
      paperSize: jobData.paperSize || 'A4',
      pageRange: jobData.pageRange || 'All Pages',
      isDoubleSided: jobData.isDoubleSided !== undefined ? jobData.isDoubleSided : true,
      binding: jobData.binding || jobData.bindingOption || 'None',
      bindingOption: jobData.binding || jobData.bindingOption || 'None',
      cost: Number(jobData.cost) || this.calculateCost({
        pages: Number(jobData.pages || jobData.pageCount) || 12,
        copies: Number(jobData.copies) || 1,
        colorMode: jobData.printType === 'Colour' ? 'Color' : 'B&W',
        paperSize: jobData.paperSize || 'A4',
        binding: jobData.binding || 'None'
      }),
      status: 'Received',
      stageIndex: 0,
      estimatedWaitTime: calculateWaitTime('Received', activeJobs.length + 1, jobData.copies),
      pickupPin: pin,
      assignedPrinter: 'Pending Allocation',
      queuePosition: activeJobs.length + 1,
      submittedTime: `Today, ${timeFormatted}`,
      date: `Today, ${timeFormatted}`,
      submittedAt: now.toISOString()
    };

    // Save to active queue (newest at top)
    const updatedActive = [newJob, ...activeJobs];
    setStorageItem(STORAGE_KEYS.ACTIVE_JOBS, updatedActive);

    // 1. Create Student Notification
    const studentNotifs = this.getNotifications('student');
    const newStudentNotif = {
      id: `NOTIF-${Date.now()}`,
      title: 'Print Request Received',
      message: `Your "${docName}" has been received and added to queue (PIN: ${pin}).`,
      time: 'Just now',
      status: 'Received',
      isUnread: true
    };
    setStorageItem(STORAGE_KEYS.STUDENT_NOTIFS, [newStudentNotif, ...studentNotifs]);

    // 2. Create Staff Notification
    const staffNotifs = this.getNotifications('staff');
    const newStaffNotif = {
      id: `STF-NOTIF-${Date.now()}`,
      title: 'New Print Request',
      message: `New request from ${newJob.student} (${docName} • ${newJob.copies} ${newJob.copies > 1 ? 'copies' : 'copy'}).`,
      time: 'Just now',
      status: 'Received',
      isUnread: true
    };
    setStorageItem(STORAGE_KEYS.STAFF_NOTIFS, [newStaffNotif, ...staffNotifs]);

    return newJob;
  },

  /**
   * Update status of an active print job (From Staff Dashboard)
   * Status progression: Received -> Processing -> Printing -> Ready -> Collected
   */
  updatePrintJobStatus(jobId, newStatus) {
    const activeJobs = this.getPrintJobs();
    const targetJob = activeJobs.find(j => j.id === jobId);

    if (!targetJob) {
      console.warn(`Job ${jobId} not found in active queue`);
      return null;
    }

    const docName = targetJob.fileName || targetJob.documentName;
    const studentName = targetJob.student || targetJob.studentName;
    const pin = targetJob.pickupPin;
    const now = new Date();
    const timeFormatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (newStatus === 'Collected') {
      // 1. Remove from active queue
      const updatedActive = activeJobs.filter(j => j.id !== jobId);
      setStorageItem(STORAGE_KEYS.ACTIVE_JOBS, updatedActive);

      // 2. Add to completed jobs archive
      const completedJobs = this.getCompletedJobs();
      const newlyCompleted = {
        ...targetJob,
        status: 'Collected',
        stageIndex: 4,
        estimatedWaitTime: 'Completed',
        completedTime: `Today, ${timeFormatted}`,
        completedAt: now.toISOString()
      };
      setStorageItem(STORAGE_KEYS.COMPLETED_JOBS, [newlyCompleted, ...completedJobs]);

      // 3. Create Student Notification
      const studentNotifs = this.getNotifications('student');
      const studentNotif = {
        id: `NOTIF-${Date.now()}`,
        title: 'Document Collected',
        message: `Your "${docName}" was verified with PIN ${pin} and marked as Collected.`,
        time: 'Just now',
        status: 'Collected',
        isUnread: true
      };
      setStorageItem(STORAGE_KEYS.STUDENT_NOTIFS, [studentNotif, ...studentNotifs]);

      // 4. Create Staff Notification
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

      return newlyCompleted;
    } else {
      // Advance status in active queue
      let assignedPrinter = targetJob.assignedPrinter;
      if (newStatus === 'Processing' && assignedPrinter === 'Pending Allocation') {
        assignedPrinter = 'Xerox WorkCentre 7845';
      } else if (newStatus === 'Printing' && (assignedPrinter === 'Pending Allocation' || !assignedPrinter)) {
        assignedPrinter = targetJob.printType === 'Colour' ? 'Epson EcoTank Pro Color' : 'Xerox WorkCentre 7845';
      }

      const stageIdx = getStageIndex(newStatus);
      const waitTime = calculateWaitTime(newStatus, 1, targetJob.copies);

      let updatedJob = null;
      const updatedActive = activeJobs.map(job => {
        if (job.id === jobId) {
          updatedJob = {
            ...job,
            status: newStatus,
            stageIndex: stageIdx,
            estimatedWaitTime: waitTime,
            assignedPrinter: assignedPrinter
          };
          return updatedJob;
        }
        return job;
      });

      setStorageItem(STORAGE_KEYS.ACTIVE_JOBS, updatedActive);

      // Student Notification for each status transition
      let studentMsg = '';
      if (newStatus === 'Processing') {
        studentMsg = `Your "${docName}" is now being processed on ${assignedPrinter}.`;
      } else if (newStatus === 'Printing') {
        studentMsg = `Your file "${docName}" is currently printing. Estimated time: ${waitTime}.`;
      } else if (newStatus === 'Ready') {
        studentMsg = `Your file "${docName}" is ready for collection at Counter 1! Show PIN: ${pin}.`;
      }

      if (studentMsg) {
        const studentNotifs = this.getNotifications('student');
        const notif = {
          id: `NOTIF-${Date.now()}`,
          title: newStatus === 'Ready' ? 'Document Ready for Pickup' : `Print Job ${newStatus}`,
          message: studentMsg,
          time: 'Just now',
          status: newStatus,
          isUnread: true
        };
        setStorageItem(STORAGE_KEYS.STUDENT_NOTIFS, [notif, ...studentNotifs]);
      }

      // Staff Notification
      const staffNotifs = this.getNotifications('staff');
      const staffNotif = {
        id: `STF-NOTIF-${Date.now()}`,
        title: `Queue Status: ${newStatus}`,
        message: `"${docName}" (${targetJob.queueNo}) updated to ${newStatus}.`,
        time: 'Just now',
        status: newStatus,
        isUnread: true
      };
      setStorageItem(STORAGE_KEYS.STAFF_NOTIFS, [staffNotif, ...staffNotifs]);

      return updatedJob;
    }
  },

  /**
   * Fetch notifications
   */
  getNotifications(role = 'student') {
    const key = role === 'staff' ? STORAGE_KEYS.STAFF_NOTIFS : STORAGE_KEYS.STUDENT_NOTIFS;
    const defaultVal = role === 'staff' ? mockStaffNotifications : mockNotifications;
    return getStorageItem(key, defaultVal);
  },

  /**
   * Mark all notifications as read
   */
  markNotificationsRead(role = 'student') {
    const key = role === 'staff' ? STORAGE_KEYS.STAFF_NOTIFS : STORAGE_KEYS.STUDENT_NOTIFS;
    const notifs = this.getNotifications(role);
    const updated = notifs.map(n => ({ ...n, isUnread: false }));
    setStorageItem(key, updated);
    return updated;
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
   * Reset all storage to default mock data (useful for testing)
   */
  resetToMockData() {
    setStorageItem(STORAGE_KEYS.ACTIVE_JOBS, initialStaffQueueJobs);
    setStorageItem(STORAGE_KEYS.COMPLETED_JOBS, initialCompletedJobs);
    setStorageItem(STORAGE_KEYS.STUDENT_NOTIFS, mockNotifications);
    setStorageItem(STORAGE_KEYS.STAFF_NOTIFS, mockStaffNotifications);
    notifyListeners();
  }
};

export default printService;
