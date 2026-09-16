import React, { useState, useEffect } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import StatusBadge from '../components/StatusBadge';
import {
  mockCurrentUser,
  mockPricingRules
} from '../data/mockData';
import { printService } from '../services/printService';

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

  // Synchronize with printService on mount and subscribe to real-time changes
  useEffect(() => {
    const syncData = () => {
      const studentJobs = printService.getStudentJobs();
      setJobsList(studentJobs);
      setNotifications(printService.getNotifications('student'));

      setCurrentJob(prev => {
        if (!prev) return studentJobs[0] || null;
        const updated = studentJobs.find(j => j.id === prev.id);
        return updated || studentJobs[0] || null;
      });
    };

    syncData();
    const unsubscribe = printService.subscribe(syncData);
    return () => unsubscribe();
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

  // AI Assistant Chat state
  const [chatMessages, setChatMessages] = useState([
    {
      id: 1,
      sender: 'student',
      text: 'Is my project report ready?'
    },
    {
      id: 2,
      sender: 'ai',
      text: 'Your Project_Report.pdf is currently ready for collection at Counter 1 (PIN: 9024). Your AI_Immersion_Report.pdf is currently printing with an estimated waiting time of 6 minutes.'
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
  const unreadNotifCount = notifications.filter(n => n.isUnread).length;

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

  // Submit New Print Form via shared printService
  const handleSubmitPrint = (e) => {
    e.preventDefault();
    const docName = formData.fileName.trim() || 'Student_Document_Submission.pdf';

    const newJob = printService.addPrintJob({
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
      cost: estimatedNewCost
    });

    setCurrentJob(newJob);

    // Show friendly success confirmation message
    setSubmissionSuccess({
      jobId: newJob.id,
      docName: newJob.documentName || newJob.fileName,
      pin: newJob.pickupPin
    });

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
  };

  // AI Assistant Query Handler
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

    // Generate intelligent contextual response
    setTimeout(() => {
      let reply = '';
      const lower = query.toLowerCase();

      if (lower.includes('project_report') || lower.includes('project report')) {
        reply = `Your Project_Report.pdf is Ready for collection at Counter 1! Your pickup PIN is 9024.`;
      } else if (lower.includes('ai_immersion') || lower.includes('immersion') || lower.includes('report') || lower.includes('current')) {
        reply = `Your AI_Immersion_Report.pdf is currently in the Printing stage on Xerox WorkCentre 7845. Estimated waiting time is 6 minutes.`;
      } else if (lower.includes('ready') || lower.includes('pickup') || lower.includes('collection')) {
        const readyJobs = jobsList.filter(j => j.status === 'Ready');
        if (readyJobs.length > 0) {
          reply = `You have ${readyJobs.length} job ready for pickup: ${readyJobs.map(j => `${j.documentName} (PIN: ${j.pickupPin})`).join(', ')}.`;
        } else {
          reply = `You currently have no jobs ready for pickup. Your active jobs are being processed in the queue.`;
        }
      } else if (lower.includes('wait') || lower.includes('time') || lower.includes('how long')) {
        reply = `The average waiting time at the Xerox counter is currently ~6 minutes with 2 active jobs in your queue.`;
      } else if (lower.includes('pin') || lower.includes('code')) {
        reply = `Your active pickup PINs are: ${jobsList.map(j => `${j.documentName}: ${j.pickupPin}`).join(' | ')}.`;
      } else if (lower.includes('rate') || lower.includes('price') || lower.includes('cost')) {
        reply = `College Xerox rates: B&W is ₹1.00/single page (₹1.50 duplex), Color is ₹5.00/page, Spiral Binding is ₹20.00.`;
      } else if (lower.includes('status') || lower.includes('where')) {
        reply = `Current Status: "${currentJob.documentName}" is at the [${currentJob.status}] stage. Assigned to: ${currentJob.assignedPrinter}.`;
      } else {
        reply = `I am tracking ${jobsList.length} print jobs for you. "${currentJob.documentName}" is currently ${currentJob.status}. You can ask about waiting times, rates, or pickup PINs!`;
      }

      setChatMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'ai',
          text: reply
        }
      ]);
      setIsTyping(false);
    }, 600);
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
              <span>Notifications</span>
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

              {/* Interactive Notification Dropdown */}
              {showNotificationsPanel && (
                <div className="notification-dropdown-panel">
                  <div className="notif-dropdown-header">
                    <span className="notif-header-title">Notifications</span>
                    <button
                      type="button"
                      className="notif-mark-read"
                      onClick={() => {
                        const updated = printService.markNotificationsRead('student');
                        setNotifications(updated);
                      }}
                    >
                      Mark all as read
                    </button>
                  </div>
                  <div className="notif-items-list">
                    {notifications.map((notif) => (
                      <div key={notif.id} className={`notif-item ${notif.isUnread ? 'unread' : ''}`}>
                        <div className="notif-item-top">
                          <span className="notif-item-title">{notif.title}</span>
                          <span className="notif-item-time">{notif.time}</span>
                        </div>
                        <p className="notif-item-message">{notif.message}</p>
                      </div>
                    ))}
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
              4. CURRENT PRINT JOB (LARGE CARD WITH PROGRESS TRACK)
              ========================================================================= */}
          <section className="current-print-job-section">
            <Card
              title="Current Print Job"
              subtitle="Live production pipeline and real-time status monitoring"
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

                  <div className="current-job-wait-pill">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <span>Estimated waiting time: <strong>{currentJob.estimatedWaitTime}</strong></span>
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
                    >
                      Submit Print Request
                    </Button>
                  </div>
                </form>
              </Card>
            </div>

            {/* =========================================================================
                7. AI ASSISTANT (CHAT-STYLE CARD)
                ========================================================================= */}
            <div className="column-right">
              <Card
                title="SmartPrint AI Assistant 🤖"
                subtitle="Ask me about your print jobs."
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
                        <div className="chat-bubble-text">
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

                  {/* Quick Prompts */}
                  <div className="chat-prompt-suggestions">
                    <button
                      type="button"
                      className="prompt-chip"
                      onClick={() => handleSendQuery('Is my project report ready?')}
                    >
                      “Is my report ready?”
                    </button>
                    <button
                      type="button"
                      className="prompt-chip"
                      onClick={() => handleSendQuery('What is my wait time?')}
                    >
                      “What is my wait time?”
                    </button>
                    <button
                      type="button"
                      className="prompt-chip"
                      onClick={() => handleSendQuery('What is my pickup PIN?')}
                    >
                      “What is my pickup PIN?”
                    </button>
                  </div>

                  {/* Input Form */}
                  <form
                    onSubmit={(e) => { e.preventDefault(); handleSendQuery(); }}
                    className="chat-input-form"
                  >
                    <input
                      type="text"
                      className="form-input chat-input-field"
                      placeholder="Ask about your print..."
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
                      <th>Date</th>
                      <th>Copies</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobsList.map((job) => (
                      <tr key={job.id} className={currentJob.id === job.id ? 'current-active-row' : ''}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{job.documentName}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            ID: {job.id} • {job.colorMode} • {job.paperSize}
                          </div>
                        </td>
                        <td>{job.date}</td>
                        <td>{job.copies}</td>
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
                                variant={currentJob.id === job.id ? 'primary' : 'outline'}
                                size="sm"
                                onClick={() => {
                                  setCurrentJob(job);
                                  window.scrollTo({ top: 120, behavior: 'smooth' });
                                }}
                              >
                                {currentJob.id === job.id ? 'Tracking' : 'Track'}
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
              8. NOTIFICATION PANEL SECTION (FULL VIEW)
              ========================================================================= */}
          {activeMenu === 'notifications' && (
            <section className="notifications-full-section">
              <Card
                title="Notifications"
                subtitle="Recent alerts and order updates"
                headerAction={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const updated = printService.markNotificationsRead('student');
                      setNotifications(updated);
                    }}
                  >
                    Mark all as read
                  </Button>
                }
              >
                <div className="notif-items-list-large">
                  {notifications.map((n) => (
                    <div key={n.id} className="notif-card-row">
                      <div className="notif-icon-circle">🔔</div>
                      <div style={{ flex: 1 }}>
                        <div className="flex justify-between items-center">
                          <strong>{n.title}</strong>
                          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{n.time}</span>
                        </div>
                        <p style={{ margin: '0.25rem 0 0 0', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                          {n.message}
                        </p>
                      </div>
                      <StatusBadge status={getStatusBadgeVariant(n.status)} labelOverride={n.status} />
                    </div>
                  ))}
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

              <div className="modal-specs-grid">
                <div className="spec-row">
                  <span className="spec-label">Current Status:</span>
                  <StatusBadge status={getStatusBadgeVariant(selectedJobForModal.status)} labelOverride={selectedJobForModal.status} />
                </div>
                <div className="spec-row">
                  <span className="spec-label">Estimated Wait:</span>
                  <span><strong>{selectedJobForModal.estimatedWaitTime}</strong></span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">Pages & Copies:</span>
                  <span>{selectedJobForModal.pageCount} pages × {selectedJobForModal.copies} copies</span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">Print Specification:</span>
                  <span>{selectedJobForModal.colorMode} • {selectedJobForModal.paperSize} {selectedJobForModal.isDoubleSided ? '• Duplex' : ''}</span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">Assigned Workstation:</span>
                  <span>{selectedJobForModal.assignedPrinter}</span>
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
