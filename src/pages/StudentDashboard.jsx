import React, { useState, useEffect } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import StatusBadge from '../components/StatusBadge';
import {
  mockCurrentUser,
  mockPricingRules
} from '../data/mockData';
import { printService } from '../services/printService';
import { getAIResponse } from '../services/aiAssistantService';

/**
 * Student Dashboard Component
 * Complete implementation for STEP 3 & STEP 5 of the AI-Powered Smart Print Tracking System.
 */
export const StudentDashboard = ({ onNavigate }) => {
  // Navigation / Tab state
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Jobs state from shared printService
  const [jobsList, setJobsList] = useState(() => printService.getStudentJobs());
  const [currentJob, setCurrentJob] = useState(() => printService.getStudentJobs()[0] || null);
  const [selectedJobForModal, setSelectedJobForModal] = useState(null);

  // Notification state
  const [notifications, setNotifications] = useState(() => printService.getNotifications('student'));
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);

  // Loading & server connection state (Step 11)
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);

  // Synchronize with printService on mount and subscribe to real-time changes
  useEffect(() => {
    let isMounted = true;

    const syncData = () => {
      if (!isMounted) return;
      const studentJobs = printService.getStudentJobs(mockCurrentUser.id);
      setJobsList(studentJobs);
      setNotifications(printService.getNotifications('student', mockCurrentUser.id));

      setCurrentJob(prev => {
        if (!prev) return studentJobs[0] || null;
        const updated = studentJobs.find(j => j.id === prev.id);
        return updated || studentJobs[0] || null;
      });
    };

    // 1. Initial cached render
    syncData();

    // 2. Initial backend fetch
    setIsLoading(true);
    printService.syncWithBackend(mockCurrentUser.id)
      .then(() => {
        if (isMounted) syncData();
      })
      .catch(err => {
        console.warn('Initial backend sync failed, using fallback:', err.message);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    // 3. Subscribe to state updates
    const unsubscribe = printService.subscribe(syncData);

    // 4. Real-time style polling (every 6 seconds) with clean up on unmount
    const pollInterval = setInterval(() => {
      printService.syncWithBackend(mockCurrentUser.id).catch(() => {});
    }, 6000);

    return () => {
      isMounted = false;
      unsubscribe();
      clearInterval(pollInterval);
    };
  }, []);

  // New Print Form state
  const [formData, setFormData] = useState({
    fileName: '',
    uploadedFile: null,
    copies: 1,
    printType: 'B&W', // 'B&W' | 'Colour'
    pageRangeType: 'all', // 'all' | 'custom'
    customPages: '',
    paperSize: 'A4', // 'A4' | 'A3'
    bindingOption: 'None'
  });
  const [submissionSuccess, setSubmissionSuccess] = useState(null);

  // AI Assistant Chat state (Step 8)
  const [chatMessages, setChatMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: 'Hello! I am your SmartPrint AI Assistant. Ask me about your print jobs, queue position, waiting time, or collection status.'
    }
  ]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Stages of print progress
  const progressStages = ['Received', 'Processing', 'Printing', 'Ready', 'Collected'];

  // Calculate live dynamic counts
  const activeJobsCount = jobsList.filter(j => j.status === 'Received' || j.status === 'Processing' || j.status === 'Printing').length;
  const printingNowCount = jobsList.filter(j => j.status === 'Printing').length;
  const readyCount = jobsList.filter(j => j.status === 'Ready').length;
  const completedCount = jobsList.filter(j => j.status === 'Collected' || j.status === 'Completed').length;
  const unreadNotifCount = notifications.filter(n => !n.read && n.isUnread !== false).length;

  // Handle Mock File Upload
  const handleFileSelect = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        fileName: file.name,
        uploadedFile: file
      }));
    }
  };

  const handleSimulateUpload = (sampleName) => {
    setFormData(prev => ({
      ...prev,
      fileName: sampleName,
      uploadedFile: { name: sampleName, size: 2450000 }
    }));
  };

  const handleRemoveFile = () => {
    setFormData(prev => ({
      ...prev,
      fileName: '',
      uploadedFile: null
    }));
  };

  // Form Field Updates
  const updateCopies = (delta) => {
    setFormData(prev => ({
      ...prev,
      copies: Math.max(1, prev.copies + delta)
    }));
  };

  // Calculate estimated cost for the new print form
  const estimatedNewCost = printService.calculateCost({
    pages: formData.pageRangeType === 'custom' && formData.customPages ? 4 : 12, // estimate
    copies: formData.copies,
    colorMode: formData.printType === 'Colour' ? 'Color' : 'B&W',
    isDoubleSided: true,
    paperSize: formData.paperSize,
    binding: formData.bindingOption
  });

  // Submit New Print Form via shared printService (Primary: Backend API, Fallback: Local)
  const handleSubmitPrint = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const docName = formData.fileName.trim() || 'Student_Document_Submission.pdf';
    setIsSubmitting(true);
    setServerError(null);

    try {
      const newJob = await printService.addPrintJob({
        documentName: docName,
        fileName: docName,
        copies: formData.copies,
        printType: formData.printType,
        pages: formData.pageRangeType === 'custom' ? (formData.customPages ? 4 : 8) : 12,
        pageRange: formData.pageRangeType === 'custom' ? (formData.customPages || 'Custom Pages') : 'All Pages',
        paperSize: formData.paperSize,
        isDoubleSided: true,
        bindingOption: formData.bindingOption,
        binding: formData.bindingOption,
        cost: estimatedNewCost,
        student: mockCurrentUser.name,
        studentId: mockCurrentUser.id
      });

      if (newJob) {
        setCurrentJob(newJob);

        // Show friendly success confirmation message
        setSubmissionSuccess({
          jobId: newJob.id,
          docName: newJob.documentName || newJob.fileName,
          pin: newJob.pickupPin
        });
      }

      // Reset Form
      setFormData({
        fileName: '',
        uploadedFile: null,
        copies: 1,
        printType: 'B&W',
        pageRangeType: 'all',
        customPages: '',
        paperSize: 'A4',
        bindingOption: 'None'
      });
    } catch (err) {
      console.error('Print submission error:', err);
      setServerError('Unable to connect to SmartPrint AI server. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // AI Assistant Query Handler (Step 8 & 11 - Uses latest backend data)
  const handleSendQuery = (textToSend) => {
    const query = (textToSend || inputQuestion).trim();
    if (!query) return;

    const userMessage = {
      id: Date.now(),
      sender: 'student',
      text: query
    };

    setChatMessages(prev => [...prev, userMessage]);
    setInputQuestion('');
    setIsTyping(true);

    // Call decoupled AI Assistant Service with latest student and system print jobs
    setTimeout(() => {
      const allJobs = printService.getPrintJobs();
      const currentStudentJobs = printService.getStudentJobs(mockCurrentUser.id);
      const reply = getAIResponse(query, currentStudentJobs, allJobs);

      setChatMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'ai',
          text: reply
        }
      ]);
      setIsTyping(false);
    }, 350);
  };

  const handleClearChat = () => {
    setChatMessages([
      {
        id: Date.now(),
        sender: 'ai',
        text: 'Chat history cleared. How can I help you with your print jobs today?'
      }
    ]);
  };

  // Helper to map status badge classes
  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'Received': return 'queued';
      case 'Processing': return 'printing';
      case 'Printing': return 'printing';
      case 'Ready': return 'ready';
      case 'Collected': return 'completed';
      default: return 'queued';
    }
  };

  // Notification Action Handlers (Step 9 & 11 - Express Backend Integration)
  const handleMarkSingleAsRead = async (e, notifId) => {
    if (e && e.stopPropagation) e.stopPropagation();
    const updated = await printService.markNotificationAsRead(notifId);
    setNotifications(updated);
  };

  const handleMarkAllAsRead = async () => {
    const updated = await printService.markNotificationsRead('student', mockCurrentUser.id);
    setNotifications(updated);
  };

  const handleClearNotifications = async () => {
    if (window.confirm('Are you sure you want to clear all notifications?')) {
      const updated = await printService.clearNotifications(mockCurrentUser.id);
      setNotifications(updated);
    }
  };

  const getNotifIcon = (type, status) => {
    if (status === 'Ready' || type === 'success') return '✅';
    if (status === 'Collected') return '📦';
    if (status === 'Printing') return '🖨️';
    if (status === 'Processing') return '⚙️';
    if (status === 'Received') return '📥';
    if (type === 'warning') return '⚠️';
    return '🔔';
  };

  return (
    <div className="student-dashboard-layout">
      {/* =========================================================================
          1. SIDEBAR
          ========================================================================= */}
      <aside className={`student-sidebar ${mobileNavOpen ? 'mobile-open' : ''}`}>
        <div className="student-sidebar-top">
          {/* Logo & Project Tag */}
          <div className="student-sidebar-brand" onClick={() => onNavigate && onNavigate('landing')}>
            <div className="brand-logo-square">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9V2h12v7"></path>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                <rect x="6" y="14" width="12" height="8" rx="1"></rect>
              </svg>
            </div>
            <div>
              <div className="brand-name-text">SmartPrint AI</div>
              <div className="brand-sub-text">Student Workspace</div>
            </div>
          </div>

          {/* Navigation Menu with Simple Line Icons */}
          <nav className="student-nav-menu">
            <button
              type="button"
              className={`student-nav-item ${activeMenu === 'dashboard' ? 'active' : ''}`}
              onClick={() => { setActiveMenu('dashboard'); setMobileNavOpen(false); }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
              <span>Dashboard</span>
            </button>

            <button
              type="button"
              className={`student-nav-item ${activeMenu === 'new-print' ? 'active' : ''}`}
              onClick={() => { setActiveMenu('new-print'); setMobileNavOpen(false); }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="12" y1="18" x2="12" y2="12"></line>
                <line x1="9" y1="15" x2="15" y2="15"></line>
              </svg>
              <span>New Print</span>
            </button>

            <button
              type="button"
              className={`student-nav-item ${activeMenu === 'my-jobs' ? 'active' : ''}`}
              onClick={() => { setActiveMenu('my-jobs'); setMobileNavOpen(false); }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              <span>My Print Jobs</span>
            </button>

            <button
              type="button"
              className={`student-nav-item ${activeMenu === 'notifications' ? 'active' : ''}`}
              onClick={() => { setActiveMenu('notifications'); setMobileNavOpen(false); }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              <span>Notifications {unreadNotifCount > 0 ? `(${unreadNotifCount})` : ''}</span>
              {unreadNotifCount > 0 && (
                <span className="sidebar-badge-count">{unreadNotifCount}</span>
              )}
            </button>

            <button
              type="button"
              className={`student-nav-item ${activeMenu === 'ai-assistant' ? 'active' : ''}`}
              onClick={() => { setActiveMenu('ai-assistant'); setMobileNavOpen(false); }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              <span>AI Assistant</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Bottom: Student Profile & Logout */}
        <div className="student-sidebar-bottom">
          <div className="sidebar-profile-card">
            <div className="sidebar-avatar-circle">AN</div>
            <div className="sidebar-profile-details">
              <div className="sidebar-profile-name">Abhinaya N</div>
              <div className="sidebar-profile-sub">STD-2026-0842</div>
            </div>
          </div>

          <button
            type="button"
            className="sidebar-logout-btn"
            onClick={() => onNavigate && onNavigate('landing')}
            title="Return to Landing Page"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            <span>Back to Landing / Logout</span>
          </button>
        </div>
      </aside>

      {/* =========================================================================
          MAIN WORKSPACE CONTENT
          ========================================================================= */}
      <div className="student-main-content">
        {/* =========================================================================
            2. TOP HEADER
            ========================================================================= */}
        <header className="student-top-header">
          <div className="header-greeting-left">
            <button
              type="button"
              className="student-mobile-toggle"
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              aria-label="Toggle navigation"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 6h16M4 12h16M4 18h16"></path>
              </svg>
            </button>

            <div>
              <h1 className="header-greeting-title">Good Morning, Student 👋</h1>
              <p className="header-greeting-subtitle">Track your print jobs and stay updated in real time.</p>
            </div>
          </div>

          <div className="header-actions-right">
            {/* Notification Bell Button */}
            <div className="notification-bell-wrapper">
              <button
                type="button"
                className="notification-bell-btn"
                onClick={() => setShowNotificationsPanel(!showNotificationsPanel)}
                aria-label="View notifications"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                {unreadNotifCount > 0 && (
                  <span className="notification-badge-dot">{unreadNotifCount}</span>
                )}
              </button>

              {/* Interactive Notification Dropdown (Step 9) */}
              {showNotificationsPanel && (
                <div className="notification-dropdown-panel">
                  <div className="notif-dropdown-header">
                    <div className="flex items-center gap-2">
                      <span className="notif-header-title">Notifications</span>
                      {unreadNotifCount > 0 && (
                        <span className="notif-header-badge">{unreadNotifCount} new</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {unreadNotifCount > 0 && (
                        <button
                          type="button"
                          className="notif-mark-read"
                          onClick={handleMarkAllAsRead}
                          title="Mark all notifications as read"
                        >
                          Mark all as read
                        </button>
                      )}
                      {notifications.length > 0 && (
                        <button
                          type="button"
                          className="notif-clear-btn"
                          onClick={handleClearNotifications}
                          title="Clear all notifications"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="notif-items-list">
                    {notifications.length === 0 ? (
                      <div className="notif-empty-state">No new notifications.</div>
                    ) : (
                      notifications.map((notif) => {
                        const isUnread = !notif.read && notif.isUnread !== false;
                        return (
                          <div key={notif.id} className={`notif-item ${isUnread ? 'unread' : ''}`}>
                            <div className="notif-item-layout">
                              <div className="notif-item-icon-circle">
                                {getNotifIcon(notif.type, notif.status)}
                              </div>
                              <div className="notif-item-content">
                                <div className="notif-item-top">
                                  <span className="notif-item-title">{notif.title}</span>
                                  <span className="notif-item-time">{notif.time}</span>
                                </div>
                                <p className="notif-item-message">{notif.message}</p>
                                {isUnread && (
                                  <div className="notif-item-actions">
                                    <button
                                      type="button"
                                      className="notif-item-mark-btn"
                                      onClick={(e) => handleMarkSingleAsRead(e, notif.id)}
                                    >
                                      Mark as Read
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Student Profile Widget */}
            <div className="header-profile-badge">
              <div className="header-avatar-circle">AN</div>
              <span className="header-profile-name">Abhinaya N</span>
            </div>
          </div>
        </header>

        {/* =========================================================================
            CONFIRMATION MESSAGE BANNER (After Submitting Print)
            ========================================================================= */}
        {submissionSuccess && (
          <div className="submission-success-banner">
            <div className="success-banner-content">
              <div className="success-banner-icon">✓</div>
              <div>
                <strong>Your print request has been received!</strong>
                <p>
                  Document “{submissionSuccess.docName}” (ID: {submissionSuccess.jobId}) is queued. Your pickup PIN is{' '}
                  <span className="pin-code-highlight">{submissionSuccess.pin}</span>.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="success-banner-close"
              onClick={() => setSubmissionSuccess(null)}
            >
              ✕
            </button>
          </div>
        )}

        {/* Server Notification / Connection Banner if backend unavailable */}
        {serverError && (
          <div className="submission-success-banner" style={{ borderColor: 'var(--color-warning, #f59e0b)', background: 'rgba(245, 158, 11, 0.1)' }}>
            <div className="success-banner-content">
              <div className="success-banner-icon" style={{ color: 'var(--color-warning, #f59e0b)' }}>⚠️</div>
              <div>
                <strong>SmartPrint AI Server Notice</strong>
                <p>{serverError}</p>
              </div>
            </div>
            <button
              type="button"
              className="success-banner-close"
              onClick={() => setServerError(null)}
            >
              ✕
            </button>
          </div>
        )}

        <div className="student-workspace-body">
          {/* =========================================================================
              3. DASHBOARD SUMMARY CARDS (4 CARDS)
              ========================================================================= */}
          <section className="student-summary-grid">
            {/* Card 1: Active Jobs */}
            <div className="summary-stat-box" onClick={() => setActiveMenu('my-jobs')}>
              <div className="stat-box-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
              </div>
              <div className="stat-box-info">
                <span className="stat-box-label">Active Jobs</span>
                <span className="stat-box-number">{activeJobsCount}</span>
              </div>
            </div>

            {/* Card 2: Printing Now */}
            <div className="summary-stat-box">
              <div className="stat-box-icon stat-icon-printing">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 6 2 18 2 18 9"></polyline>
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                  <rect x="6" y="14" width="12" height="8"></rect>
                </svg>
              </div>
              <div className="stat-box-info">
                <span className="stat-box-label">Printing Now</span>
                <span className="stat-box-number">{printingNowCount}</span>
              </div>
            </div>

            {/* Card 3: Ready for Collection */}
            <div className="summary-stat-box">
              <div className="stat-box-icon stat-icon-ready">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
              </div>
              <div className="stat-box-info">
                <span className="stat-box-label">Ready for Collection</span>
                <span className="stat-box-number">{readyCount}</span>
              </div>
            </div>

            {/* Card 4: Completed Jobs */}
            <div className="summary-stat-box">
              <div className="stat-box-icon stat-icon-completed">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <div className="stat-box-info">
                <span className="stat-box-label">Completed Jobs</span>
                <span className="stat-box-number">{completedCount}</span>
              </div>
            </div>
          </section>

          {/* =========================================================================
              4. CURRENT PRINT JOB (LARGE CARD WITH PROGRESS TRACK & SMART PREDICTION)
              ========================================================================= */}
          <section className="current-print-job-section">
            {currentJob ? (
              <Card
                title="Current Print Job"
                subtitle="Live production pipeline and real-time queue prediction"
                badge={<StatusBadge status={getStatusBadgeVariant(currentJob.status)} labelOverride={currentJob.status} />}
                headerAction={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedJobForModal(currentJob)}
                  >
                    View Details
                  </Button>
                }
              >
                <div className="current-job-body">
                  <div className="current-job-meta-row">
                    <div className="job-file-identity">
                      <div className="job-file-icon">📄</div>
                      <div>
                        <div className="job-file-name">{currentJob.documentName}</div>
                        <div className="job-file-subtext">
                          {currentJob.pageCount} pages • {currentJob.copies} {currentJob.copies > 1 ? 'copies' : 'copy'} • {currentJob.colorMode} • {currentJob.paperSize}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 items-center" style={{ flexWrap: 'wrap' }}>
                      {/* Queue Position Pill */}
                      {currentJob.status !== 'Ready' && currentJob.status !== 'Collected' && currentJob.status !== 'Completed' && (
                        <div className="current-job-queue-pill">
                          <span className="queue-pill-label">Queue Position:</span>
                          <strong className="queue-pill-number">#{currentJob.queuePosition || 1}</strong>
                        </div>
                      )}

                      {/* Estimated Waiting Time Pill */}
                      <div className="current-job-wait-pill">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"></circle>
                          <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        <span>
                          Estimated Wait: <strong>{currentJob.estimatedWaitTime}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* AI-READY DESIGN: Smart Prediction Card (Step 6 & Step 7) */}
                  <div className="smart-prediction-card">
                    <div className="smart-prediction-header">
                      <div className="smart-prediction-title-row">
                        <span className="smart-prediction-badge">✨ Smart Prediction</span>
                        <span className="smart-prediction-badge" style={{ backgroundColor: '#f0fdf4', color: '#166534', borderColor: '#bbf7d0', fontSize: '0.7rem' }}>
                          🤖 AI-Assisted Queue Analysis
                        </span>
                        <span className="smart-prediction-sub">
                          Estimated using current queue and print workload • Queue analyzed automatically
                        </span>
                      </div>
                      <span className="smart-prediction-chip">
                        Status: <strong>{currentJob.status}</strong>
                      </span>
                    </div>

                    <div className="smart-prediction-metrics-grid">
                      <div className="smart-prediction-metric-item">
                        <span className="metric-label">Queue Position</span>
                        <div className="metric-value">
                          {currentJob.status === 'Ready' 
                            ? 'Ready at Desk' 
                            : (currentJob.status === 'Collected' || currentJob.status === 'Completed' ? 'Fulfilled' : `#${currentJob.queuePosition || 1}`)}
                        </div>
                        <span className="metric-hint">
                          {currentJob.status === 'Printing' 
                            ? 'Actively on workstation' 
                            : (currentJob.status === 'Processing' ? 'Next in workstation queue' : 'Awaiting printer assignment')}
                        </span>
                      </div>

                      <div className="smart-prediction-metric-item">
                        <span className="metric-label">Estimated Waiting Time</span>
                        <div className="metric-value" style={{ color: 'var(--accent-primary)' }}>
                          {currentJob.estimatedWaitTime}
                        </div>
                        <span className="metric-hint">
                          Calculated from {currentJob.copies} {currentJob.copies > 1 ? 'copies' : 'copy'} & active shop load
                        </span>
                      </div>

                      <div className="smart-prediction-metric-item">
                        <span className="metric-label">Queue Analytics</span>
                        <div className="metric-value" style={{ fontSize: '0.95rem' }}>
                          Analyzed Automatically
                        </div>
                        <span className="metric-hint">Assigned: {currentJob.assignedPrinter || 'Pending Allocation'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Visual Progress Indicator:
                      Received → Processing → Printing → Ready → Collected */}
                  <div className="progress-tracker-container">
                    <div className="progress-tracker-bar">
                      {progressStages.map((stage, idx) => {
                        const isCompleted = idx < currentJob.stageIndex;
                        const isCurrent = idx === currentJob.stageIndex;

                        return (
                          <div
                            key={stage}
                            className={`progress-step-node ${isCurrent ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                          >
                            <div className="step-circle">
                              {isCompleted ? (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                  <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                              ) : (
                                <span>{idx + 1}</span>
                              )}
                            </div>
                            <span className="step-label">{stage}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </Card>
            ) : (
              <Card title="Current Print Job" subtitle="No active print jobs">
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  You currently have no active print orders. Start a new print request below!
                </div>
              </Card>
            )}
          </section>

          {/* TWO COLUMN WORKSPACE: New Print Request & AI Assistant */}
          <div className="dashboard-columns-grid">
            {/* =========================================================================
                5. NEW PRINT REQUEST (START A NEW PRINT)
                ========================================================================= */}
            <div className="column-left">
              <Card
                title="Start a New Print"
                subtitle="Upload your document and specify print configuration"
              >
                <form onSubmit={handleSubmitPrint} className="new-print-form">
                  {/* Upload File Box */}
                  <div className="form-group">
                    <label className="form-label">Upload File (PDF / DOCX)</label>
                    {formData.fileName ? (
                      <div className="uploaded-file-preview">
                        <div className="flex items-center gap-3">
                          <span style={{ fontSize: '1.5rem' }}>📄</span>
                          <div>
                            <div className="preview-filename">{formData.fileName}</div>
                            <div className="preview-filesize">Ready for submission</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="remove-file-btn"
                          onClick={handleRemoveFile}
                          title="Remove file"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="dropzone-box">
                        <input
                          type="file"
                          id="file-upload-input"
                          accept=".pdf,.docx,.doc,.pptx,.txt"
                          onChange={handleFileSelect}
                          style={{ display: 'none' }}
                        />
                        <label htmlFor="file-upload-input" className="dropzone-label">
                          <div className="dropzone-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                              <polyline points="17 8 12 3 7 8"></polyline>
                              <line x1="12" y1="3" x2="12" y2="15"></line>
                            </svg>
                          </div>
                          <span className="dropzone-prompt">Click to browse or drag PDF / DOCX</span>
                          <span className="dropzone-sub">Max file size: 50MB</span>
                        </label>

                        {/* Quick Mock Sample Fillers for Easy Testing */}
                        <div className="quick-sample-chips">
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Quick sample:</span>
                          <button
                            type="button"
                            className="sample-chip-btn"
                            onClick={() => handleSimulateUpload('Cloud_Computing_Assignment.pdf')}
                          >
                            + Assignment.pdf
                          </button>
                          <button
                            type="button"
                            className="sample-chip-btn"
                            onClick={() => handleSimulateUpload('Machine_Learning_Notes.docx')}
                          >
                            + ML_Notes.docx
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Form Controls Grid */}
                  <div className="form-controls-grid">
                    {/* Number of Copies */}
                    <div className="form-group">
                      <label className="form-label">Number of Copies</label>
                      <div className="copies-counter-control">
                        <button
                          type="button"
                          className="counter-btn"
                          onClick={() => updateCopies(-1)}
                          aria-label="Decrease copies"
                        >
                          -
                        </button>
                        <span className="counter-value">{formData.copies}</span>
                        <button
                          type="button"
                          className="counter-btn"
                          onClick={() => updateCopies(1)}
                          aria-label="Increase copies"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Print Type (B&W / Colour) */}
                    <div className="form-group">
                      <label className="form-label">Print Type</label>
                      <div className="segmented-chips-group">
                        <button
                          type="button"
                          className={`segmented-chip ${formData.printType === 'B&W' ? 'active' : ''}`}
                          onClick={() => setFormData({ ...formData, printType: 'B&W' })}
                        >
                          Black & White
                        </button>
                        <button
                          type="button"
                          className={`segmented-chip ${formData.printType === 'Colour' ? 'active' : ''}`}
                          onClick={() => setFormData({ ...formData, printType: 'Colour' })}
                        >
                          Colour
                        </button>
                      </div>
                    </div>

                    {/* Page Range */}
                    <div className="form-group">
                      <label className="form-label">Page Range</label>
                      <div className="segmented-chips-group">
                        <button
                          type="button"
                          className={`segmented-chip ${formData.pageRangeType === 'all' ? 'active' : ''}`}
                          onClick={() => setFormData({ ...formData, pageRangeType: 'all' })}
                        >
                          All Pages
                        </button>
                        <button
                          type="button"
                          className={`segmented-chip ${formData.pageRangeType === 'custom' ? 'active' : ''}`}
                          onClick={() => setFormData({ ...formData, pageRangeType: 'custom' })}
                        >
                          Custom
                        </button>
                      </div>
                      {formData.pageRangeType === 'custom' && (
                        <input
                          type="text"
                          className="form-input custom-range-input"
                          placeholder="e.g. 1-5, 8, 11-14"
                          value={formData.customPages}
                          onChange={(e) => setFormData({ ...formData, customPages: e.target.value })}
                        />
                      )}
                    </div>

                    {/* Paper Size */}
                    <div className="form-group">
                      <label className="form-label">Paper Size</label>
                      <div className="segmented-chips-group">
                        <button
                          type="button"
                          className={`segmented-chip ${formData.paperSize === 'A4' ? 'active' : ''}`}
                          onClick={() => setFormData({ ...formData, paperSize: 'A4' })}
                        >
                          A4 (Standard)
                        </button>
                        <button
                          type="button"
                          className={`segmented-chip ${formData.paperSize === 'A3' ? 'active' : ''}`}
                          onClick={() => setFormData({ ...formData, paperSize: 'A3' })}
                        >
                          A3 (Large)
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Submission Summary & Button */}
                  <div className="form-submit-row">
                    <div className="cost-preview-box">
                      <span className="cost-preview-label">Calculated Price:</span>
                      <span className="cost-preview-value">₹{estimatedNewCost.toFixed(2)}</span>
                    </div>

                    <Button
                      variant="primary"
                      type="submit"
                      size="md"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Submitting Print Request...' : 'Submit Print Request'}
                    </Button>
                  </div>
                </form>
              </Card>
            </div>

            {/* =========================================================================
                7. AI ASSISTANT (CHAT-STYLE CARD - STEP 8)
                ========================================================================= */}
            <div className="column-right">
              <Card
                title="SmartPrint AI Assistant"
                subtitle="Ask me about your print jobs, queue and waiting time."
                headerAction={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearChat}
                    title="Clear chat history"
                  >
                    Clear Chat
                  </Button>
                }
              >
                <div className="ai-chat-card-inner">
                  {/* Messages Area */}
                  <div className="chat-messages-container">
                    {chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`chat-bubble-row ${msg.sender === 'student' ? 'chat-student' : 'chat-ai'}`}
                      >
                        {msg.sender === 'ai' && (
                          <div className="chat-avatar-bot">🤖</div>
                        )}
                        <div className="chat-bubble-text" style={{ whiteSpace: 'pre-line' }}>
                          {msg.text}
                        </div>
                      </div>
                    ))}

                    {isTyping && (
                      <div className="chat-bubble-row chat-ai">
                        <div className="chat-avatar-bot">🤖</div>
                        <div className="chat-bubble-text typing-indicator">
                          <span>•</span><span>•</span><span>•</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Clickable Quick Questions (Step 8) */}
                  <div className="chat-prompt-suggestions">
                    <button
                      type="button"
                      className="prompt-chip"
                      onClick={() => handleSendQuery('Where is my print?')}
                    >
                      Where is my print?
                    </button>
                    <button
                      type="button"
                      className="prompt-chip"
                      onClick={() => handleSendQuery('Estimated wait?')}
                    >
                      Estimated wait?
                    </button>
                    <button
                      type="button"
                      className="prompt-chip"
                      onClick={() => handleSendQuery('Queue position?')}
                    >
                      Queue position?
                    </button>
                    <button
                      type="button"
                      className="prompt-chip"
                      onClick={() => handleSendQuery('Is my print ready?')}
                    >
                      Is my print ready?
                    </button>
                    <button
                      type="button"
                      className="prompt-chip"
                      onClick={() => handleSendQuery('My print jobs')}
                    >
                      My print jobs
                    </button>
                  </div>

                  {/* Input Form with Enter Key & Send Button */}
                  <form
                    onSubmit={(e) => { e.preventDefault(); handleSendQuery(); }}
                    className="chat-input-form"
                  >
                    <input
                      type="text"
                      className="form-input chat-input-field"
                      placeholder="Ask about your print jobs, queue, waiting time..."
                      value={inputQuestion}
                      onChange={(e) => setInputQuestion(e.target.value)}
                    />
                    <Button
                      variant="primary"
                      type="submit"
                      size="sm"
                    >
                      Send
                    </Button>
                  </form>
                </div>
              </Card>
            </div>
          </div>

          {/* =========================================================================
              6. MY PRINT JOBS (TABLE / LIST)
              ========================================================================= */}
          <section className="my-print-jobs-section">
            <Card
              title="My Print Jobs"
              subtitle="History and current requests submitted from this account"
              badge={<span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{jobsList.length} total orders</span>}
            >
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>File Name</th>
                      <th>Queue Pos</th>
                      <th>Est. Wait</th>
                      <th>Copies</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobsList.map((job) => (
                      <tr key={job.id} className={currentJob && currentJob.id === job.id ? 'current-active-row' : ''}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{job.documentName}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            ID: {job.id} • {job.colorMode} • {job.paperSize}
                          </div>
                        </td>
                        <td>
                          {job.status !== 'Ready' && job.status !== 'Collected' && job.status !== 'Completed' ? (
                            <span style={{ fontWeight: 700, color: 'var(--accent-primary)', fontFamily: 'monospace' }}>
                              #{job.queuePosition || 1}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>
                        <td>
                          <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                            {job.estimatedWaitTime}
                          </span>
                        </td>
                        <td>
                          <span>{job.copies} {job.copies > 1 ? 'copies' : 'copy'}</span>
                        </td>
                        <td>
                          <StatusBadge
                            status={getStatusBadgeVariant(job.status)}
                            labelOverride={job.status}
                          />
                        </td>
                        <td>
                          <div className="flex gap-2 items-center">
                            {job.status !== 'Collected' && (
                              <Button
                                variant={currentJob && currentJob.id === job.id ? 'primary' : 'outline'}
                                size="sm"
                                onClick={() => {
                                  setCurrentJob(job);
                                  window.scrollTo({ top: 120, behavior: 'smooth' });
                                }}
                              >
                                {currentJob && currentJob.id === job.id ? 'Tracking' : 'Track'}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedJobForModal(job)}
                            >
                              View
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </section>

          {/* =========================================================================
              8. NOTIFICATION PANEL SECTION (FULL VIEW - STEP 9)
              ========================================================================= */}
          {activeMenu === 'notifications' && (
            <section className="notifications-full-section">
              <Card
                title="Notifications"
                subtitle="Recent alerts and order updates"
                badge={unreadNotifCount > 0 ? <span className="notif-header-badge">{unreadNotifCount} unread</span> : null}
                headerAction={
                  <div className="flex items-center gap-2">
                    {unreadNotifCount > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleMarkAllAsRead}
                        title="Mark all notifications as read"
                      >
                        Mark All as Read
                      </Button>
                    )}
                    {notifications.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearNotifications}
                        title="Clear all notifications"
                      >
                        Clear Notifications
                      </Button>
                    )}
                  </div>
                }
              >
                <div className="notif-items-list-large">
                  {notifications.length === 0 ? (
                    <div className="notif-empty-state-large">No new notifications.</div>
                  ) : (
                    notifications.map((n) => {
                      const isUnread = !n.read && n.isUnread !== false;
                      return (
                        <div key={n.id} className={`notif-card-row ${isUnread ? 'unread' : ''}`}>
                          <div className="notif-icon-circle">{getNotifIcon(n.type, n.status)}</div>
                          <div style={{ flex: 1 }}>
                            <div className="flex justify-between items-center">
                              <strong style={{ color: isUnread ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                                {n.title}
                              </strong>
                              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{n.time}</span>
                            </div>
                            <p style={{ margin: '0.25rem 0 0.5rem 0', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                              {n.message}
                            </p>
                            {isUnread && (
                              <button
                                type="button"
                                className="notif-item-mark-btn"
                                onClick={(e) => handleMarkSingleAsRead(e, n.id)}
                              >
                                Mark as Read
                              </button>
                            )}
                          </div>
                          {n.status && (
                            <StatusBadge status={getStatusBadgeVariant(n.status)} labelOverride={n.status} />
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>
            </section>
          )}
        </div>
      </div>

      {/* =========================================================================
          JOB DETAILS MODAL (VIEW DETAILS)
          ========================================================================= */}
      {selectedJobForModal && (
        <div className="job-details-modal-overlay" onClick={() => setSelectedJobForModal(null)}>
          <div className="job-details-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 700 }}>{selectedJobForModal.documentName}</h3>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Job ID: {selectedJobForModal.id}</span>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedJobForModal(null)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="modal-pin-banner">
                <span className="modal-pin-label">SECURE PICKUP PIN:</span>
                <span className="modal-pin-digits">{selectedJobForModal.pickupPin}</span>
                <span className="modal-pin-hint">Show this code to the operator at the Xerox counter</span>
              </div>

              {/* Smart Prediction Notice */}
              <div className="modal-smart-prediction-banner">
                <span className="smart-prediction-badge" style={{ fontSize: '0.72rem' }}>✨ Smart Prediction</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
                  Estimated using current queue and print workload.
                </span>
              </div>

              <div className="modal-specs-grid">
                <div className="spec-row">
                  <span className="spec-label">Current Status:</span>
                  <StatusBadge status={getStatusBadgeVariant(selectedJobForModal.status)} labelOverride={selectedJobForModal.status} />
                </div>
                <div className="spec-row">
                  <span className="spec-label">Queue Position:</span>
                  <span>
                    <strong>
                      {selectedJobForModal.status !== 'Ready' && selectedJobForModal.status !== 'Collected' && selectedJobForModal.status !== 'Completed'
                        ? `#${selectedJobForModal.queuePosition || 1}`
                        : '—'}
                    </strong>
                  </span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">Estimated Wait:</span>
                  <span><strong>{selectedJobForModal.estimatedWaitTime}</strong></span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">Pages & Copies:</span>
                  <span>{selectedJobForModal.pageCount || selectedJobForModal.pages} pages × {selectedJobForModal.copies} copies</span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">Print Specification:</span>
                  <span>{selectedJobForModal.colorMode} • {selectedJobForModal.paperSize} {selectedJobForModal.isDoubleSided ? '• Duplex' : ''}</span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">Assigned Workstation:</span>
                  <span>{selectedJobForModal.assignedPrinter || 'Pending Allocation'}</span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">Total Amount:</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>₹{selectedJobForModal.cost.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedJobForModal(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
