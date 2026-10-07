/**
 * SmartPrint AI Frontend API Service (STEP 10, 11 & 12)
 * Reusable client for communicating with the Node.js/Express SQLite backend.
 * Provides central backend data access with automatic JWT token attachment and error handling.
 */

import { authService } from './authService.js';

let currentBaseUrl = typeof window !== 'undefined' && window.__API_BASE_URL__ 
  ? window.__API_BASE_URL__ 
  : (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_API_URL || import.meta.env.API_BASE_URL))
    ? (import.meta.env.VITE_API_URL || import.meta.env.API_BASE_URL)
    : (typeof process !== 'undefined' && process.env && process.env.API_BASE_URL ? process.env.API_BASE_URL : 'http://localhost:5000/api');

/**
 * Common fetch helper with JWT header injection, JSON parsing, and error handling
 */
const request = async (endpoint, options = {}) => {
  const base = apiService.baseUrl || currentBaseUrl;
  const url = `${base}${endpoint}`;
  
  const token = authService ? authService.getToken() : null;
  const authHeader = token ? { 'Authorization': `Bearer ${token}` } : {};

  const headers = {
    'Content-Type': 'application/json',
    ...authHeader,
    ...(options.headers || {})
  };

  try {
    const controller = new AbortController();
    const timeout = options.timeout || 6000;
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401 && authService && typeof window !== 'undefined') {
        // If unauthorized, token may have expired
        // authService.logout();
      }
      throw new Error(data.message || `Request failed with status ${response.status}`);
    }

    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.warn(`[SmartPrint API] Request timed out for ${endpoint}`);
    } else {
      console.warn(`[SmartPrint API] ${options.method || 'GET'} ${endpoint} failed:`, error.message);
    }
    throw error;
  }
};

export const apiService = {
  baseUrl: currentBaseUrl,

  /**
   * Health Check
   */
  async checkHealth() {
    try {
      const res = await request('/health', { timeout: 3000 });
      return res && res.success === true;
    } catch {
      return false;
    }
  },

  /**
   * Students API
   */
  async getStudents() {
    const res = await request('/students');
    return res.data || [];
  },

  async getStudent(studentId) {
    const res = await request(`/students/${studentId}`);
    return res.data;
  },

  async createStudent(studentData) {
    const res = await request('/students', {
      method: 'POST',
      body: JSON.stringify(studentData)
    });
    return res.data;
  },

  /**
   * Print Jobs API
   */
  async getPrintJobs() {
    const res = await request('/print-jobs');
    return res.data || [];
  },

  async getPrintJob(jobId) {
    const res = await request(`/print-jobs/${jobId}`);
    return res.data;
  },

  async getStudentPrintJobs(studentId) {
    const res = await request(`/students/${studentId}/print-jobs`);
    return res.data || [];
  },

  async createPrintJob(jobData) {
    const payload = {
      student_id: jobData.student_id || jobData.studentId,
      file_name: jobData.file_name || jobData.fileName || jobData.documentName || 'Document.pdf',
      copies: Math.max(1, Number(jobData.copies) || 1),
      print_type: jobData.print_type || jobData.printType || 'B&W',
      page_range: jobData.page_range || jobData.pageRange || 'All Pages'
    };

    const res = await request('/print-jobs', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return res.data;
  },

  async updatePrintJobStatus(jobId, status) {
    const res = await request(`/print-jobs/${jobId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
    return res.data;
  },

  /**
   * Notifications API
   */
  async getNotifications(studentId) {
    const res = await request(`/students/${studentId}/notifications`);
    return res.data || [];
  },

  async createNotification(notifData) {
    const res = await request('/notifications', {
      method: 'POST',
      body: JSON.stringify(notifData)
    });
    return res.data;
  },

  async markNotificationAsRead(notificationId) {
    const res = await request(`/notifications/${notificationId}/read`, {
      method: 'PATCH'
    });
    return res.data;
  },

  async markAllNotificationsAsRead(studentId) {
    return request(`/students/${studentId}/notifications/read-all`, {
      method: 'PATCH'
    });
  },

  async clearNotifications(studentId) {
    return request(`/students/${studentId}/notifications`, {
      method: 'DELETE'
    });
  }
};

export default apiService;
