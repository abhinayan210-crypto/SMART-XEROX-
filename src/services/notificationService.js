/**
 * Smart Notification Service (STEP 9 & STEP 11)
 * Primary source of truth: Express + SQLite Backend API
 * Fallback: localStorage & in-memory cache when backend is temporarily unreachable.
 * Handles student notifications, read tracking, unread badges, and cross-component reactivity.
 */

import { mockNotifications, mockCurrentUser } from '../data/mockData.js';
import { apiService } from './apiService.js';

const STORAGE_KEY = 'smartprint_notifications_v2';
const STATUS_TRACKER_KEY = 'smartprint_notified_statuses_v2';

// In-memory fallbacks for non-browser / Node.js testing environments
const memoryStore = {};

const getStorageItem = (key, fallback) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const data = window.localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    }
  } catch (e) {
    console.warn(`Error reading localStorage key "${key}":`, e);
  }
  return memoryStore[key] !== undefined ? memoryStore[key] : fallback;
};

const setStorageItem = (key, value) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, JSON.stringify(value));
    }
  } catch (e) {
    console.warn(`Error writing localStorage key "${key}":`, e);
  }
  memoryStore[key] = value;
};

// Listeners for real-time reactivity
const listeners = new Set();

const notifyListeners = () => {
  listeners.forEach(callback => {
    try {
      callback();
    } catch (err) {
      console.error('Error notifying notificationService listener:', err);
    }
  });
};

// Window storage listener for multi-tab synchronization
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY || event.key === STATUS_TRACKER_KEY) {
      notifyListeners();
    }
  });
}

/**
 * Format relative / short timestamp for notification display.
 */
const formatNotificationTime = (date = new Date()) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

/**
 * Normalize notification from backend SQLite row into UI object
 */
export const normalizeBackendNotification = (n) => {
  if (!n) return null;
  const isRead = Boolean(n.is_read !== undefined ? n.is_read : n.read);
  const createdDate = new Date(n.created_at || n.createdAt || Date.now());
  const timeStr = createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return {
    id: n.id,
    studentId: n.student_id || n.studentId || mockCurrentUser.id,
    jobId: n.job_id || n.jobId || null,
    title: n.title || 'Print Update',
    message: n.message || '',
    type: n.type || 'info',
    read: isRead,
    isUnread: !isRead,
    createdAt: n.created_at || n.createdAt || new Date().toISOString(),
    time: n.time || timeStr,
    status: n.status || null
  };
};

/**
 * Default initial notifications seed
 */
const getInitialSeedNotifications = () => {
  const defaultStudentId = mockCurrentUser.id || 'STD-2026-0842';
  return (mockNotifications || []).map((n, idx) => ({
    id: n.id || `NOTIF-SEED-${idx}`,
    studentId: defaultStudentId,
    jobId: idx === 0 ? 'PRT-1003' : (idx === 1 ? 'PRT-1001' : 'PRT-1002'),
    title: n.title,
    message: n.message,
    type: n.status === 'Ready' ? 'success' : 'info',
    createdAt: new Date(Date.now() - (idx + 1) * 600000).toISOString(),
    time: n.time || '10 mins ago',
    read: !n.isUnread,
    isUnread: !!n.isUnread,
    status: n.status
  }));
};

export const notificationService = {
  /**
   * Subscribe to notification state updates
   * @param {Function} callback
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    listeners.add(callback);
    return () => listeners.delete(callback);
  },

  /**
   * Fetch latest notifications from backend API with fallback to cache
   * @param {string} studentId
   * @returns {Promise<Array>} List of notifications
   */
  async fetchNotifications(studentId = mockCurrentUser.id) {
    try {
      const backendNotifs = await apiService.getNotifications(studentId);
      if (Array.isArray(backendNotifs)) {
        const normalized = backendNotifs.map(normalizeBackendNotification);
        setStorageItem(STORAGE_KEY, normalized);
        notifyListeners();
        return normalized;
      }
    } catch (err) {
      console.warn('[SmartPrint] Backend notifications unavailable, using cached/fallback:', err.message);
    }
    return this.getNotifications(studentId);
  },

  /**
   * Get all notifications for a student synchronously from cache (non-blocking)
   * @param {string} studentId
   * @returns {Array} List of notifications
   */
  getNotifications(studentId = mockCurrentUser.id) {
    const all = getStorageItem(STORAGE_KEY, getInitialSeedNotifications());
    if (!studentId) return all;
    return all.filter(n => n.studentId === studentId || !n.studentId);
  },

  /**
   * Get unread notifications count for a student
   * @param {string} studentId
   * @returns {number}
   */
  getUnreadCount(studentId = mockCurrentUser.id) {
    const notifs = this.getNotifications(studentId);
    return notifs.filter(n => !n.read && n.isUnread !== false).length;
  },

  /**
   * Mark a single notification as read (calls backend API + updates local cache)
   * @param {string} notificationId
   * @returns {Promise<Array>}
   */
  async markNotificationAsRead(notificationId) {
    // 1. Optimistic / local update
    const all = getStorageItem(STORAGE_KEY, getInitialSeedNotifications());
    const updated = all.map(n => {
      if (n.id === notificationId) {
        return { ...n, read: true, isUnread: false };
      }
      return n;
    });
    setStorageItem(STORAGE_KEY, updated);
    notifyListeners();

    // 2. Sync with backend
    try {
      await apiService.markNotificationAsRead(notificationId);
    } catch (err) {
      console.warn('[SmartPrint] Failed to mark notification read on backend:', err.message);
    }

    return updated;
  },

  /**
   * Mark all notifications as read for a given student
   * @param {string} studentId
   * @returns {Promise<Array>}
   */
  async markAllNotificationsAsRead(studentId = mockCurrentUser.id) {
    // 1. Optimistic / local update
    const all = getStorageItem(STORAGE_KEY, getInitialSeedNotifications());
    const updated = all.map(n => {
      if (!studentId || n.studentId === studentId || !n.studentId) {
        return { ...n, read: true, isUnread: false };
      }
      return n;
    });
    setStorageItem(STORAGE_KEY, updated);
    notifyListeners();

    // 2. Sync with backend
    try {
      await apiService.markAllNotificationsAsRead(studentId);
    } catch (err) {
      console.warn('[SmartPrint] Failed to mark all notifications read on backend:', err.message);
    }

    return updated;
  },

  /**
   * Clear all notifications for a given student
   * @param {string} studentId
   * @returns {Promise<Array>}
   */
  async clearNotifications(studentId = mockCurrentUser.id) {
    // 1. Optimistic / local update
    const all = getStorageItem(STORAGE_KEY, getInitialSeedNotifications());
    const remaining = studentId ? all.filter(n => n.studentId !== studentId && n.studentId) : [];
    setStorageItem(STORAGE_KEY, remaining);
    notifyListeners();

    // 2. Sync with backend
    try {
      await apiService.clearNotifications(studentId);
    } catch (err) {
      console.warn('[SmartPrint] Failed to clear notifications on backend:', err.message);
    }

    return remaining;
  },

  /**
   * Create a notification (persists locally and syncs to backend)
   */
  createNotification(data = {}) {
    const studentId = data.studentId || data.student_id || mockCurrentUser.id;
    const now = new Date();

    const localNotif = {
      id: data.id || `NOTIF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      studentId,
      jobId: data.jobId || data.job_id || null,
      title: data.title || 'Print Update',
      message: data.message || 'Your print status has been updated.',
      type: data.type || (data.status === 'Ready' || data.status === 'Collected' ? 'success' : 'info'),
      createdAt: data.createdAt || now.toISOString(),
      time: data.time || 'Just now',
      read: data.read || false,
      isUnread: data.read === undefined ? true : !data.read,
      status: data.status || null
    };

    const all = getStorageItem(STORAGE_KEY, getInitialSeedNotifications());
    const updated = [localNotif, ...all.filter(n => n.id !== localNotif.id)];
    setStorageItem(STORAGE_KEY, updated);
    notifyListeners();

    // Background sync to backend
    apiService.createNotification({
      student_id: studentId,
      job_id: localNotif.jobId,
      title: localNotif.title,
      message: localNotif.message,
      type: localNotif.type
    }).catch(() => {
      // Handled gracefully locally
    });

    return localNotif;
  },

  /**
   * Generate status change notification with duplicate prevention.
   */
  generateStatusNotification(job, oldStatus, newStatus) {
    if (!job || !newStatus) return null;
    if (oldStatus && oldStatus.trim() === newStatus.trim()) return null;

    const jobId = job.id || job.jobId;
    const studentId = job.studentId || job.student_id || mockCurrentUser.id;
    const fileName = job.documentName || job.fileName || job.file_name || 'Document.pdf';

    // Duplicate Prevention Tracking
    const statusTracker = getStorageItem(STATUS_TRACKER_KEY, {});
    if (statusTracker[jobId] === newStatus) {
      return null;
    }
    statusTracker[jobId] = newStatus;
    setStorageItem(STATUS_TRACKER_KEY, statusTracker);

    let title = '';
    let message = '';
    let type = 'info';

    switch (newStatus) {
      case 'Received':
        title = 'Print Request Received';
        message = `Your print request for "${fileName}" has been received successfully.`;
        type = 'info';
        break;
      case 'Processing':
        title = 'Print Request Processing';
        message = `Your print job for "${fileName}" is now being processed.`;
        type = 'info';
        break;
      case 'Printing':
        title = 'Print Job Printing';
        message = `Your print job for "${fileName}" is currently being printed.`;
        type = 'info';
        break;
      case 'Ready':
        title = 'Print Ready';
        message = `"${fileName}" is ready for collection.`;
        type = 'success';
        break;
      case 'Collected':
        title = 'Print Collected';
        message = `Your print job for "${fileName}" has been marked as collected.`;
        type = 'success';
        break;
      default:
        title = `Status Updated: ${newStatus}`;
        message = `Your print job for "${fileName}" is now ${newStatus}.`;
        type = 'info';
        break;
    }

    return this.createNotification({
      studentId,
      jobId,
      title,
      message,
      type,
      status: newStatus,
      createdAt: new Date().toISOString(),
      time: 'Just now',
      read: false
    });
  },

  /**
   * Reset notification store to initial mock fixtures (for testing)
   */
  resetToMockData() {
    setStorageItem(STORAGE_KEY, getInitialSeedNotifications());
    setStorageItem(STATUS_TRACKER_KEY, {});
    notifyListeners();
  }
};

export default notificationService;
