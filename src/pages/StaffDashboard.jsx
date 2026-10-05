import React, { useState, useEffect } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import StatusBadge from '../components/StatusBadge';
import {
  mockStaffUser,
  mockPrinterUnits,
  mockStaffAnalytics
} from '../data/mockData';
import { printService } from '../services/printService';

/**
 * Staff Dashboard Component - STEP 4 & STEP 5
 * Allows Xerox shop operators to manage incoming print requests,
 * advance job statuses, track completed orders, view queue visualization,
 * and monitor live printing stations in real time.
 */
export const StaffDashboard = ({ onNavigate }) => {
  // Navigation / Tab state: 'dashboard' | 'queue' | 'active' | 'completed' | 'notifications'
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Queue state from shared printService
  const [queueJobs, setQueueJobs] = useState(() => printService.getPrintJobs());
  const [completedJobs, setCompletedJobs] = useState(() => printService.getCompletedJobs());
  const [notifications, setNotifications] = useState(() => printService.getNotifications('staff'));
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Synchronize with printService on mount and subscribe to real-time updates
  useEffect(() => {
    let isMounted = true;

    const syncData = () => {
      if (!isMounted) return;
      setQueueJobs(printService.getPrintJobs());
      setCompletedJobs(printService.getCompletedJobs());
      setNotifications(printService.getNotifications('staff'));
    };

    // 1. Initial cached render
    syncData();

    // 2. Fetch fresh queue from backend
    printService.fetchPrintJobs().then(() => {
      if (isMounted) syncData();
    }).catch(err => {
      console.warn('Backend fetch for staff queue failed, using cached:', err.message);
    });

    // 3. Subscribe to state updates
    const unsubscribe = printService.subscribe(syncData);

    // 4. Lightweight polling every 6 seconds with clean up on unmount
    const pollInterval = setInterval(() => {
      printService.fetchPrintJobs().catch(() => {});
    }, 6000);

    return () => {
      isMounted = false;
      unsubscribe();
      clearInterval(pollInterval);
    };
  }, []);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'Received' | 'Processing' | 'Printing' | 'Ready'
  const [priorityFilter, setPriorityFilter] = useState('all'); // 'all' | 'High' | 'Medium' | 'Normal'
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Interactive Overlays
  const [selectedJobForDetails, setSelectedJobForDetails] = useState(null);
  const [selectedJobForStatusUpdate, setSelectedJobForStatusUpdate] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Available status stages for progression
  const statusOptions = ['Received', 'Processing', 'Printing', 'Ready', 'Collected'];

  // STEP 7: AI-Ready Queue Analysis & Smart Job Prioritization
  const queueAnalysis = printService.analyzeQueue(queueJobs);
  const prioritizedJobs = printService.getPrioritizedQueue(queueJobs);

  // Calculate live dynamic counts
  const pendingCount = queueJobs.filter(j => j.status === 'Received' || j.status === 'Processing').length;
  const printingCount = queueJobs.filter(j => j.status === 'Printing').length;
  const readyCount = queueJobs.filter(j => j.status === 'Ready').length;
  const completedTodayCount = completedJobs.length;
  const unreadNotifCount = notifications.filter(n => n.isUnread).length;

  // Simple analytics calculations
  const totalJobsHandled = completedJobs.length + queueJobs.length;
  const colourJobsCount = completedJobs.filter(j => j.printType === 'Colour').length + queueJobs.filter(j => j.printType === 'Colour').length;
  const bwJobsCount = completedJobs.filter(j => j.printType === 'B&W').length + queueJobs.filter(j => j.printType === 'B&W').length;
  const estimatedQueueMinutes = Math.max(4, (pendingCount * 2) + (printingCount * 3));

  // Helper to show temporary toast notification
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Helper to map status to StatusBadge variant
  const getBadgeVariant = (status) => {
    switch (status) {
      case 'Received': return 'queued';
      case 'Processing': return 'printing';
      case 'Printing': return 'printing';
      case 'Ready': return 'ready';
      case 'Collected':
      case 'Completed': return 'completed';
      default: return 'queued';
    }
  };

  // 1. Process Action (Received -> Processing) via printService
  const handleProcessJob = async (jobId) => {
    setIsUpdatingStatus(true);
    try {
      const updated = await printService.updatePrintJobStatus(jobId, 'Processing');
      if (updated) {
        showToast(`Status updated to Processing. Student notification created.`);
      }
    } catch (err) {
      showToast(`Unable to update status: ${err.message}`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // 2. Status Update Action (Received -> Processing -> Printing -> Ready -> Collected) via printService
  const handleUpdateStatus = async (jobId, newStatus) => {
    setIsUpdatingStatus(true);
    try {
      const updated = await printService.updatePrintJobStatus(jobId, newStatus);
      if (updated) {
        showToast(`Status updated to ${newStatus}. Student notification created.`);
      }

      // Close modals
      setSelectedJobForStatusUpdate(null);
      if (selectedJobForDetails && selectedJobForDetails.id === jobId) {
        if (newStatus === 'Collected') {
          setSelectedJobForDetails(null);
        } else {
          setSelectedJobForDetails(prev => ({
            ...prev,
            status: newStatus,
            estimatedWaitTime: newStatus === 'Ready' ? 'Ready for Pickup' : prev.estimatedWaitTime
          }));
        }
      }
    } catch (err) {
      showToast(`Unable to update status: ${err.message}`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // 3. Quick Next Step Action
  const handleQuickNextStage = async (job) => {
    switch (job.status) {
      case 'Received':
        await handleProcessJob(job.id);
        break;
      case 'Processing':
        await handleUpdateStatus(job.id, 'Printing');
        break;
      case 'Printing':
        await handleUpdateStatus(job.id, 'Ready');
        break;
      case 'Ready':
        await handleUpdateStatus(job.id, 'Collected');
        break;
      default:
        break;
    }
  };

  // Filtered queue jobs list
  const filteredQueueJobs = queueJobs.filter(job => {
    // Tab filter
    if (activeTab === 'active' && (job.status !== 'Received' && job.status !== 'Processing' && job.status !== 'Printing')) {
      return false;
    }

    // Status filter
    const matchesStatus = statusFilter === 'all' ? true : job.status === statusFilter;

    // Search query
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = query === '' ||
      job.student.toLowerCase().includes(query) ||
      job.fileName.toLowerCase().includes(query) ||
      job.queueNo.toLowerCase().includes(query) ||
      job.id.toLowerCase().includes(query) ||
      job.pickupPin.includes(query) ||
      job.printType.toLowerCase().includes(query);

    return matchesStatus && matchesSearch;
  });

  // Filtered completed jobs
  const filteredCompletedJobs = completedJobs.filter(job => {
    const query = searchQuery.trim().toLowerCase();
    return query === '' ||
      job.student.toLowerCase().includes(query) ||
      job.fileName.toLowerCase().includes(query) ||
      job.id.toLowerCase().includes(query) ||
      job.pickupPin.includes(query);
  });

  return (
    <div className="student-dashboard-layout">
      {/* =========================================================================
          1. SIDEBAR
          ========================================================================= */}
      <aside className={`student-sidebar ${mobileNavOpen ? 'mobile-open' : ''}`}>
        <div className="student-sidebar-top">
          {/* Brand Logo & Tag */}
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
              <div className="brand-sub-text">Staff Console</div>
            </div>
          </div>

          {/* Sidebar Navigation Menu */}
          <nav className="student-nav-menu">
            <button
              type="button"
              className={`student-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => { setActiveTab('dashboard'); setMobileNavOpen(false); setStatusFilter('all'); }}
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
              className={`student-nav-item ${activeTab === 'queue' ? 'active' : ''}`}
              onClick={() => { setActiveTab('queue'); setMobileNavOpen(false); }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6"></line>
                <line x1="8" y1="12" x2="21" y2="12"></line>
                <line x1="8" y1="18" x2="21" y2="18"></line>
                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                <line x1="3" y1="18" x2="3.01" y2="18"></line>
              </svg>
              <span>Print Queue</span>
              {queueJobs.length > 0 && (
                <span className="sidebar-badge-count">{queueJobs.length}</span>
              )}
            </button>

            <button
              type="button"
              className={`student-nav-item ${activeTab === 'active' ? 'active' : ''}`}
              onClick={() => { setActiveTab('active'); setMobileNavOpen(false); }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                <rect x="6" y="14" width="12" height="8"></rect>
              </svg>
              <span>Active Jobs</span>
              {pendingCount + printingCount > 0 && (
                <span className="sidebar-badge-count" style={{ backgroundColor: '#0284c7' }}>
                  {pendingCount + printingCount}
                </span>
              )}
            </button>

            <button
              type="button"
              className={`student-nav-item ${activeTab === 'completed' ? 'active' : ''}`}
              onClick={() => { setActiveTab('completed'); setMobileNavOpen(false); }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              <span>Completed Jobs</span>
              <span className="sidebar-badge-count" style={{ backgroundColor: '#10b981' }}>
                {completedJobs.length}
              </span>
            </button>

            <button
              type="button"
              className={`student-nav-item ${activeTab === 'notifications' ? 'active' : ''}`}
              onClick={() => { setActiveTab('notifications'); setMobileNavOpen(false); }}
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
          </nav>
        </div>

        {/* Sidebar Bottom: Staff Profile & Logout */}
        <div className="student-sidebar-bottom">
          <div className="sidebar-profile-card">
            <div className="sidebar-avatar-circle" style={{ backgroundColor: '#0f172a' }}>ST</div>
            <div className="sidebar-profile-details">
              <div className="sidebar-profile-name">Print Shop Staff</div>
              <div className="sidebar-profile-sub">Operator • Central Desk</div>
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
              aria-label="Toggle navigation menu"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 6h16M4 12h16M4 18h16"></path>
              </svg>
            </button>

            <div>
              <h1 className="header-greeting-title">Staff Dashboard 🖨️</h1>
              <p className="header-greeting-subtitle">Manage print requests and keep the queue moving.</p>
            </div>
          </div>

          <div className="header-actions-right">
            {/* Notification Bell Button */}
            <div className="notification-bell-wrapper">
              <button
                type="button"
                className="notification-bell-btn"
                onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
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
              {showNotificationsDropdown && (
                <div className="notification-dropdown-panel">
                  <div className="notif-dropdown-header">
                    <span className="notif-header-title">Staff Notifications</span>
                    <button
                      type="button"
                      className="notif-mark-read"
                      onClick={() => setNotifications(notifications.map(n => ({ ...n, isUnread: false })))}
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

            {/* Staff Profile Badge */}
            <div className="header-profile-badge">
              <div className="header-avatar-circle" style={{ backgroundColor: '#0f172a' }}>ST</div>
              <span className="header-profile-name">Print Shop Staff</span>
            </div>
          </div>
        </header>

        {/* TOAST NOTIFICATION BANNER */}
        {toastMessage && (
          <div className="submission-success-banner" style={{ borderLeftColor: '#0284c7' }}>
            <div className="success-banner-content">
              <div className="success-banner-icon" style={{ backgroundColor: '#e0f2fe', color: '#0369a1' }}>ℹ️</div>
              <div>
                <strong>Queue Action Update</strong>
                <p>{toastMessage}</p>
              </div>
            </div>
            <button
              type="button"
              className="success-banner-close"
              onClick={() => setToastMessage(null)}
            >
              ✕
            </button>
          </div>
        )}

        {/* WORKSPACE MAIN BODY */}
        <div className="student-workspace-body">
          {/* =========================================================================
              3. SUMMARY CARDS (4 CARDS)
              ========================================================================= */}
          <section className="student-summary-grid">
            {/* Card 1: Pending Requests */}
            <div
              className="summary-stat-box"
              onClick={() => { setActiveTab('queue'); setStatusFilter('Received'); }}
              style={{ cursor: 'pointer' }}
            >
              <div className="stat-box-icon" style={{ backgroundColor: '#fef3c7', color: '#b45309' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </div>
              <div className="stat-box-info">
                <span className="stat-box-label">Pending Requests</span>
                <span className="stat-box-number">{pendingCount}</span>
              </div>
            </div>

            {/* Card 2: Printing Now */}
            <div
              className="summary-stat-box"
              onClick={() => { setActiveTab('queue'); setStatusFilter('Printing'); }}
              style={{ cursor: 'pointer' }}
            >
              <div className="stat-box-icon stat-icon-printing">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 6 2 18 2 18 9"></polyline>
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                  <rect x="6" y="14" width="12" height="8"></rect>
                </svg>
              </div>
              <div className="stat-box-info">
                <span className="stat-box-label">Printing Now</span>
                <span className="stat-box-number">{printingCount}</span>
              </div>
            </div>

            {/* Card 3: Ready for Collection */}
            <div
              className="summary-stat-box"
              onClick={() => { setActiveTab('queue'); setStatusFilter('Ready'); }}
              style={{ cursor: 'pointer' }}
            >
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

            {/* Card 4: Completed Today */}
            <div
              className="summary-stat-box"
              onClick={() => setActiveTab('completed')}
              style={{ cursor: 'pointer' }}
            >
              <div className="stat-box-icon stat-icon-completed">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <div className="stat-box-info">
                <span className="stat-box-label">Completed Today</span>
                <span className="stat-box-number">{completedTodayCount}</span>
              </div>
            </div>
          </section>

          {/* =========================================================================
              7. WAITING TIME & QUEUE VISUALIZATION (DASHBOARD & QUEUE TABS)
              ========================================================================= */}
          {(activeTab === 'dashboard' || activeTab === 'queue' || activeTab === 'active') && (
            <section className="current-print-job-section">
              <Card
                title="Estimated Queue Time & Live Pipeline"
                subtitle="Real-time throughput estimation and printer hardware status"
                badge={
                  <span className="status-badge status-printing">
                    <span className="status-badge-dot" />
                    <span>Live Workload: ~{estimatedQueueMinutes} mins</span>
                  </span>
                }
              >
                <div className="current-job-body">
                  <div className="current-job-meta-row">
                    <div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Estimated Queue Time
                      </span>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                        Approximately {estimatedQueueMinutes} minutes
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Based on {queueJobs.length} active print jobs currently in queue
                      </span>
                    </div>

                    <div className="current-job-wait-pill" style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', color: '#166534' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <span>Counter Status: <strong>Optimal Processing Speed</strong></span>
                    </div>
                  </div>

                  {/* AI-READY DESIGN: Smart Prediction Banner */}
                  <div className="smart-prediction-card" style={{ marginTop: '1rem', marginBottom: '1rem' }}>
                    <div className="smart-prediction-header">
                      <div className="smart-prediction-title-row">
                        <span className="smart-prediction-badge">✨ Smart Prediction</span>
                        <span className="smart-prediction-sub">Estimated using current queue and print workload.</span>
                      </div>
                      <span className="smart-prediction-chip">
                        Active Queue Load: <strong>{queueJobs.length} jobs</strong>
                      </span>
                    </div>
                  </div>

                  {/* Simple Queue Multi-Stage Pipeline Visualization */}
                  <div className="progress-tracker-container" style={{ marginTop: '0.5rem' }}>
                    <div className="progress-tracker-bar">
                      <div className={`progress-step-node ${pendingCount > 0 ? 'active' : 'completed'}`}>
                        <div className="step-circle">1</div>
                        <span className="step-label">Received ({queueJobs.filter(j => j.status === 'Received').length})</span>
                      </div>
                      <div className={`progress-step-node ${queueJobs.filter(j => j.status === 'Processing').length > 0 ? 'active' : ''}`}>
                        <div className="step-circle">2</div>
                        <span className="step-label">Processing ({queueJobs.filter(j => j.status === 'Processing').length})</span>
                      </div>
                      <div className={`progress-step-node ${printingCount > 0 ? 'active' : ''}`}>
                        <div className="step-circle">3</div>
                        <span className="step-label">Printing Now ({printingCount})</span>
                      </div>
                      <div className={`progress-step-node ${readyCount > 0 ? 'active' : ''}`}>
                        <div className="step-circle">4</div>
                        <span className="step-label">Ready for Pickup ({readyCount})</span>
                      </div>
                    </div>
                  </div>

                  {/* Active Hardware Workstations Status Bar */}
                  <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.65rem' }}>
                      Workstation Hardware Units:
                    </div>
                    <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                      {mockPrinterUnits.map((printer) => (
                        <div
                          key={printer.id}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.35rem 0.75rem',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '0.75rem',
                            backgroundColor: 'var(--bg-surface-secondary)',
                            border: '1px solid var(--border-light)'
                          }}
                        >
                          <span
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: printer.status === 'Printing' ? '#0284c7' : '#10b981'
                            }}
                          />
                          <span><strong>{printer.name}</strong></span>
                          <span style={{ color: 'var(--text-muted)' }}>({printer.status} • Paper: {printer.paperLevel})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            </section>
          )}

          {/* =========================================================================
              STEP 7: AI QUEUE INSIGHTS CARD
              ========================================================================= */}
          {(activeTab === 'dashboard' || activeTab === 'queue' || activeTab === 'active') && (
            <section className="ai-queue-insights-section" style={{ marginTop: '1.5rem' }}>
              <Card
                title="AI Queue Insights"
                subtitle="Automated workload analysis, congestion prediction, and operator recommendations"
                badge={
                  <span className="smart-prediction-badge">
                    ✨ AI-Assisted Queue Analysis
                  </span>
                }
              >
                <div className="insights-card-body">
                  <div className="insights-metrics-grid">
                    <div className="insight-metric-box">
                      <span className="insight-metric-label">Active Jobs</span>
                      <div className="insight-metric-value">{queueAnalysis.totalActiveJobs}</div>
                      <span className="insight-metric-sub">{queueAnalysis.pendingJobs} waiting • {queueAnalysis.printingJobs} printing</span>
                    </div>

                    <div className="insight-metric-box">
                      <span className="insight-metric-label">Total Copies</span>
                      <div className="insight-metric-value">{queueAnalysis.totalCopies}</div>
                      <span className="insight-metric-sub">{queueAnalysis.totalPages} estimated sheets</span>
                    </div>

                    <div className="insight-metric-box">
                      <span className="insight-metric-label">Current Workload</span>
                      <div className="insight-metric-value">
                        <span className={`workload-pill workload-${queueAnalysis.currentWorkload.toLowerCase()}`}>
                          {queueAnalysis.currentWorkload}
                        </span>
                      </div>
                      <span className="insight-metric-sub">Shop processing speed</span>
                    </div>

                    <div className="insight-metric-box">
                      <span className="insight-metric-label">Average Estimated Wait</span>
                      <div className="insight-metric-value" style={{ color: 'var(--accent-primary)' }}>
                        {queueAnalysis.averageWaitingTime}
                      </div>
                      <span className="insight-metric-sub">Per incoming print job</span>
                    </div>
                  </div>

                  {/* Dynamic Insights Bullet List */}
                  <div className="dynamic-insights-container">
                    <div className="insights-subhead">
                      <span>💡 Dynamic Queue Intelligence & Alerts:</span>
                      <span className="insights-subhead-tag">Live Generated</span>
                    </div>
                    <ul className="dynamic-insights-list">
                      {queueAnalysis.insights.map((insight, idx) => (
                        <li key={idx} className="dynamic-insight-item">
                          <span className="insight-bullet-icon">⚡</span>
                          <span>{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>
            </section>
          )}

          {/* =========================================================================
              4. MAIN PRINT QUEUE TABLE ("CURRENT PRINT QUEUE")
              ========================================================================= */}
          {(activeTab === 'dashboard' || activeTab === 'queue' || activeTab === 'active') && (
            <section className="my-print-jobs-section">
              <Card
                title="Current Print Queue"
                subtitle="Live submissions awaiting processing, printing, or student pickup with smart wait estimation"
                headerAction={
                  <div className="flex gap-2 items-center" style={{ flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Search Student, File, #001, PIN..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ width: '220px', padding: '0.35rem 0.65rem', fontSize: 'var(--font-size-xs)' }}
                    />
                  </div>
                }
              >
                {/* Status Filter Chips */}
                <div className="flex gap-2" style={{ marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                  <Button
                    size="sm"
                    variant={statusFilter === 'all' ? 'primary' : 'outline'}
                    onClick={() => setStatusFilter('all')}
                  >
                    All Queue ({queueJobs.length})
                  </Button>
                  <Button
                    size="sm"
                    variant={statusFilter === 'Received' ? 'primary' : 'outline'}
                    onClick={() => setStatusFilter('Received')}
                  >
                    Received ({queueJobs.filter(j => j.status === 'Received').length})
                  </Button>
                  <Button
                    size="sm"
                    variant={statusFilter === 'Processing' ? 'primary' : 'outline'}
                    onClick={() => setStatusFilter('Processing')}
                  >
                    Processing ({queueJobs.filter(j => j.status === 'Processing').length})
                  </Button>
                  <Button
                    size="sm"
                    variant={statusFilter === 'Printing' ? 'primary' : 'outline'}
                    onClick={() => setStatusFilter('Printing')}
                  >
                    Printing ({printingCount})
                  </Button>
                  <Button
                    size="sm"
                    variant={statusFilter === 'Ready' ? 'primary' : 'outline'}
                    onClick={() => setStatusFilter('Ready')}
                  >
                    Ready ({readyCount})
                  </Button>
                </div>

                {/* Print Queue Table */}
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Queue & Position</th>
                        <th>Est. Wait</th>
                        <th>Student</th>
                        <th>File Name</th>
                        <th>Copies</th>
                        <th>Print Type</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredQueueJobs.length === 0 ? (
                        <tr>
                          <td colSpan="8" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                            No print requests currently match your filters or search.
                          </td>
                        </tr>
                      ) : (
                        filteredQueueJobs.map((job) => (
                          <tr key={job.id}>
                            {/* Queue Position & No */}
                            <td>
                              <div className="flex items-center gap-1.5">
                                {job.status !== 'Ready' && job.status !== 'Collected' && job.status !== 'Completed' ? (
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      padding: '0.15rem 0.45rem',
                                      borderRadius: 'var(--radius-sm)',
                                      fontSize: '0.78rem',
                                      fontWeight: 800,
                                      backgroundColor: 'var(--bg-surface-secondary)',
                                      color: 'var(--accent-primary)',
                                      border: '1px solid var(--border-light)',
                                      fontFamily: 'monospace'
                                    }}
                                  >
                                    #{job.queuePosition || 1}
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>—</span>
                                )}
                                <span style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                  {job.queueNo}
                                </span>
                              </div>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                ID: {job.id}
                              </div>
                            </td>

                            {/* Estimated Waiting Time */}
                            <td>
                              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: job.status === 'Ready' ? '#166534' : 'var(--text-primary)' }}>
                                {job.status !== 'Ready' && job.status !== 'Collected' && job.status !== 'Completed'
                                  ? `#${job.queuePosition || 1} — ${job.estimatedWaitTime}`
                                  : job.estimatedWaitTime}
                              </div>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                {job.status === 'Printing' ? 'Printing live' : (job.status === 'Ready' ? 'Pickup ready' : 'Queue wait')}
                              </div>
                            </td>

                            {/* Student */}
                            <td>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{job.student}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                {job.studentId} • {job.department}
                              </div>
                            </td>

                            {/* File Name */}
                            <td>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{job.fileName}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                {job.pages} pages • {job.paperSize} {job.isDoubleSided ? '• Duplex' : ''} {job.binding !== 'None' ? `• ${job.binding}` : ''}
                              </div>
                            </td>

                            {/* Copies */}
                            <td>
                              <span style={{ fontWeight: 600 }}>{job.copies}</span>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '4px' }}>
                                {job.copies > 1 ? 'copies' : 'copy'}
                              </span>
                            </td>

                            {/* Print Type */}
                            <td>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '0.15rem 0.5rem',
                                  borderRadius: 'var(--radius-full)',
                                  fontSize: '0.72rem',
                                  fontWeight: 600,
                                  backgroundColor: job.printType === 'Colour' ? '#fae8ff' : '#f1f5f9',
                                  color: job.printType === 'Colour' ? '#86198f' : '#334155'
                                }}
                              >
                                {job.printType}
                              </span>
                            </td>

                            {/* Status */}
                            <td>
                              <StatusBadge
                                status={getBadgeVariant(job.status)}
                                labelOverride={job.status}
                              />
                            </td>

                            {/* Action Buttons */}
                            <td>
                              <div className="flex gap-2 items-center" style={{ flexWrap: 'wrap' }}>
                                {/* 1. Quick Progression Action */}
                                {job.status === 'Received' && (
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => handleProcessJob(job.id)}
                                  >
                                    ▶ Process
                                  </Button>
                                )}

                                {job.status === 'Processing' && (
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => handleQuickNextStage(job)}
                                  >
                                    🖨️ Print
                                  </Button>
                                )}

                                {job.status === 'Printing' && (
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => handleQuickNextStage(job)}
                                  >
                                    ✓ Ready
                                  </Button>
                                )}

                                {job.status === 'Ready' && (
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => handleQuickNextStage(job)}
                                  >
                                    📦 Complete
                                  </Button>
                                )}

                                {/* 2. Universal Update Status Modal Button */}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedJobForStatusUpdate(job)}
                                >
                                  Update
                                </Button>

                                {/* 3. View Details Modal Button */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedJobForDetails(job)}
                                >
                                  Details
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </section>
          )}

          {/* =========================================================================
              STEP 7: SMART JOB PRIORITY TABLE SECTION
              ========================================================================= */}
          {(activeTab === 'dashboard' || activeTab === 'queue' || activeTab === 'active') && (
            <section className="smart-job-priority-section" style={{ marginTop: '2rem' }}>
              <Card
                title="Smart Job Priority"
                subtitle="AI-recommended attention ranking to assist operator throughput without modifying queue order"
                badge={
                  <span className="smart-prediction-badge" style={{ backgroundColor: '#fef3c7', color: '#b45309', borderColor: '#fde68a' }}>
                    🎯 Smart Priority
                  </span>
                }
                headerAction={
                  <div className="flex gap-2 items-center" style={{ flexWrap: 'wrap' }}>
                    <Button
                      size="sm"
                      variant={priorityFilter === 'all' ? 'primary' : 'outline'}
                      onClick={() => setPriorityFilter('all')}
                    >
                      All Active ({prioritizedJobs.length})
                    </Button>
                    <Button
                      size="sm"
                      variant={priorityFilter === 'High' ? 'primary' : 'outline'}
                      onClick={() => setPriorityFilter('High')}
                    >
                      High ({prioritizedJobs.filter(j => j.priority === 'High').length})
                    </Button>
                    <Button
                      size="sm"
                      variant={priorityFilter === 'Medium' ? 'primary' : 'outline'}
                      onClick={() => setPriorityFilter('Medium')}
                    >
                      Medium ({prioritizedJobs.filter(j => j.priority === 'Medium').length})
                    </Button>
                    <Button
                      size="sm"
                      variant={priorityFilter === 'Normal' ? 'primary' : 'outline'}
                      onClick={() => setPriorityFilter('Normal')}
                    >
                      Normal ({prioritizedJobs.filter(j => j.priority === 'Normal').length})
                    </Button>
                  </div>
                }
              >
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Job ID</th>
                        <th>Student</th>
                        <th>File Name</th>
                        <th>Copies</th>
                        <th>Status</th>
                        <th>Estimated Wait</th>
                        <th>Priority</th>
                        <th>Reason</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prioritizedJobs.filter(j => priorityFilter === 'all' ? true : j.priority === priorityFilter).length === 0 ? (
                        <tr>
                          <td colSpan="9" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                            No active print jobs match the selected priority filter ({priorityFilter}).
                          </td>
                        </tr>
                      ) : (
                        prioritizedJobs
                          .filter(j => priorityFilter === 'all' ? true : j.priority === priorityFilter)
                          .map((job) => (
                            <tr key={job.id}>
                              {/* Job ID */}
                              <td>
                                <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                                  {job.id}
                                </span>
                                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                  {job.queueNo}
                                </div>
                              </td>

                              {/* Student */}
                              <td>
                                <div style={{ fontWeight: 600 }}>{job.student}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{job.studentId}</div>
                              </td>

                              {/* File Name */}
                              <td>
                                <div style={{ fontWeight: 600 }}>{job.fileName}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                  {job.pages} pages • {job.paperSize} {job.isDoubleSided ? '• Duplex' : ''}
                                </div>
                              </td>

                              {/* Copies */}
                              <td>
                                <span style={{ fontWeight: 600 }}>{job.copies}</span>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '4px' }}>
                                  {job.copies > 1 ? 'copies' : 'copy'}
                                </span>
                              </td>

                              {/* Status */}
                              <td>
                                <StatusBadge status={getBadgeVariant(job.status)} labelOverride={job.status} />
                              </td>

                              {/* Estimated Wait */}
                              <td>
                                <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                                  {job.estimatedWaitTime}
                                </span>
                              </td>

                              {/* Priority Level */}
                              <td>
                                <span className={`priority-pill priority-${job.priority.toLowerCase()}`}>
                                  {job.priority}
                                </span>
                              </td>

                              {/* Priority Reason */}
                              <td>
                                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                  {job.priorityReason || job.reason}
                                </span>
                              </td>

                              {/* Action */}
                              <td>
                                <div className="flex gap-2 items-center">
                                  {job.status === 'Received' && (
                                    <Button variant="primary" size="sm" onClick={() => handleProcessJob(job.id)}>
                                      ▶ Process
                                    </Button>
                                  )}
                                  {job.status === 'Processing' && (
                                    <Button variant="primary" size="sm" onClick={() => handleQuickNextStage(job)}>
                                      🖨️ Print
                                    </Button>
                                  )}
                                  {job.status === 'Printing' && (
                                    <Button variant="secondary" size="sm" onClick={() => handleQuickNextStage(job)}>
                                      ✓ Ready
                                    </Button>
                                  )}
                                  <Button variant="ghost" size="sm" onClick={() => setSelectedJobForDetails(job)}>
                                    Details
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </section>
          )}

          {/* =========================================================================
              10. SIMPLE ANALYTICS SECTION (DASHBOARD TAB)
              ========================================================================= */}
          {activeTab === 'dashboard' && (
            <section className="current-print-job-section" style={{ marginTop: '2rem' }}>
              <Card
                title="Daily Print Analytics"
                subtitle="Performance breakdown of orders fulfilled today"
              >
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-surface-secondary)', border: '1px solid var(--border-light)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Today's Print Jobs</span>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                      {completedTodayCount}
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>+ {queueJobs.length} in active queue</span>
                  </div>

                  <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-surface-secondary)', border: '1px solid var(--border-light)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Average Waiting Time</span>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                      7 min
                    </div>
                    <span style={{ fontSize: '0.7rem', color: '#166534' }}>✓ 2 min faster than average</span>
                  </div>

                  <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-surface-secondary)', border: '1px solid var(--border-light)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Colour Prints</span>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#86198f', marginTop: '0.25rem' }}>
                      8
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>High-res document jobs</span>
                  </div>

                  <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-surface-secondary)', border: '1px solid var(--border-light)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>B&W Prints</span>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#334155', marginTop: '0.25rem' }}>
                      10
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Standard text & assignments</span>
                  </div>
                </div>

                {/* Print Distribution Bar */}
                <div>
                  <div className="flex justify-between items-center" style={{ fontSize: '0.75rem', marginBottom: '0.35rem' }}>
                    <span><strong>Print Mode Distribution:</strong> B&W (56%) vs Colour (44%)</span>
                    <span style={{ color: 'var(--text-muted)' }}>18 Total Orders</span>
                  </div>
                  <div style={{ height: '8px', width: '100%', borderRadius: 'var(--radius-full)', backgroundColor: '#fae8ff', overflow: 'hidden', display: 'flex' }}>
                    <div style={{ width: '56%', backgroundColor: '#0284c7' }}></div>
                    <div style={{ width: '44%', backgroundColor: '#a855f7' }}></div>
                  </div>
                </div>
              </Card>
            </section>
          )}

          {/* =========================================================================
              8. COMPLETED JOBS SECTION (DASHBOARD & COMPLETED TABS)
              ========================================================================= */}
          {(activeTab === 'dashboard' || activeTab === 'completed') && (
            <section className="my-print-jobs-section" style={{ marginTop: '2rem' }}>
              <Card
                title="Completed Print Jobs"
                subtitle="Archive of orders printed, verified with student PIN, and handed over"
                badge={<span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{completedJobs.length} fulfilled orders</span>}
                headerAction={
                  activeTab === 'completed' ? (
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Search Completed..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ width: '200px', padding: '0.35rem 0.65rem', fontSize: 'var(--font-size-xs)' }}
                    />
                  ) : null
                }
              >
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>File Name</th>
                        <th>Student</th>
                        <th>Completed Time</th>
                        <th>Copies</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCompletedJobs.length === 0 ? (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                            No completed print records match.
                          </td>
                        </tr>
                      ) : (
                        filteredCompletedJobs.slice(0, activeTab === 'dashboard' ? 6 : undefined).map((job) => (
                          <tr key={job.id}>
                            <td>
                              <div style={{ fontWeight: 600 }}>{job.fileName}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                ID: {job.id} • {job.printType} • PIN: {job.pickupPin}
                              </div>
                            </td>
                            <td>
                              <div style={{ fontWeight: 500 }}>{job.student}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{job.studentId}</div>
                            </td>
                            <td>
                              <span style={{ fontSize: 'var(--font-size-sm)' }}>{job.completedTime}</span>
                            </td>
                            <td>
                              <span>{job.copies} {job.copies > 1 ? 'copies' : 'copy'}</span>
                            </td>
                            <td>
                              <StatusBadge status="completed" labelOverride={job.status} />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {activeTab === 'dashboard' && completedJobs.length > 6 && (
                  <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveTab('completed')}
                    >
                      View All {completedJobs.length} Completed Jobs →
                    </Button>
                  </div>
                )}
              </Card>
            </section>
          )}

          {/* =========================================================================
              9. NOTIFICATIONS TAB (FULL VIEW)
              ========================================================================= */}
          {activeTab === 'notifications' && (
            <section className="notifications-full-section">
              <Card
                title="Staff Notifications & Alerts"
                subtitle="Incoming print jobs, hardware unit alerts, and queue status history"
                headerAction={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setNotifications(notifications.map(n => ({ ...n, isUnread: false })))}
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
                      <StatusBadge status={getBadgeVariant(n.status)} labelOverride={n.status} />
                    </div>
                  ))}
                </div>
              </Card>
            </section>
          )}
        </div>
      </div>

      {/* =========================================================================
          5. STATUS MANAGEMENT MODAL / DROPDOWN
          ========================================================================= */}
      {selectedJobForStatusUpdate && (
        <div className="job-details-modal-overlay" onClick={() => setSelectedJobForStatusUpdate(null)}>
          <div className="job-details-modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 700 }}>Update Print Job Status</h3>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                  {selectedJobForStatusUpdate.fileName} ({selectedJobForStatusUpdate.queueNo})
                </span>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedJobForStatusUpdate(null)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Select new status stage for <strong>{selectedJobForStatusUpdate.student}</strong>'s print order:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {statusOptions.map((status) => {
                  const isCurrent = selectedJobForStatusUpdate.status === status;
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => handleUpdateStatus(selectedJobForStatusUpdate.id, status)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem 1rem',
                        borderRadius: 'var(--radius-md)',
                        border: isCurrent ? '2px solid var(--accent-primary)' : '1px solid var(--border-light)',
                        backgroundColor: isCurrent ? 'var(--bg-surface-secondary)' : 'var(--bg-surface)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <StatusBadge status={getBadgeVariant(status)} labelOverride={status} />
                      </div>
                      {isCurrent ? (
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                          Current Status ✓
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Click to set →
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="modal-footer">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedJobForStatusUpdate(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          6. JOB DETAILS MODAL
          ========================================================================= */}
      {selectedJobForDetails && (
        <div className="job-details-modal-overlay" onClick={() => setSelectedJobForDetails(null)}>
          <div className="job-details-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 700 }}>{selectedJobForDetails.fileName}</h3>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                  Queue: {selectedJobForDetails.queueNo} • Job ID: {selectedJobForDetails.id}
                </span>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedJobForDetails(null)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              {/* Pickup PIN Banner */}
              <div className="modal-pin-banner">
                <span className="modal-pin-label">SECURE PICKUP PIN:</span>
                <span className="modal-pin-digits">{selectedJobForDetails.pickupPin}</span>
                <span className="modal-pin-hint">Verify this PIN with student before releasing completed print</span>
              </div>

              {/* Smart Prediction Notice */}
              <div className="modal-smart-prediction-banner">
                <span className="smart-prediction-badge" style={{ fontSize: '0.72rem' }}>✨ Smart Prediction</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
                  Estimated using current queue and print workload.
                </span>
              </div>

              {/* Specs Grid */}
              <div className="modal-specs-grid">
                <div className="spec-row">
                  <span className="spec-label">Student Name:</span>
                  <span><strong>{selectedJobForDetails.student}</strong> ({selectedJobForDetails.studentId})</span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">Department:</span>
                  <span>{selectedJobForDetails.department}</span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">File Name:</span>
                  <span>{selectedJobForDetails.fileName}</span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">Number of Copies:</span>
                  <span><strong>{selectedJobForDetails.copies}</strong> {selectedJobForDetails.copies > 1 ? 'copies' : 'copy'}</span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">Print Type & Pages:</span>
                  <span>{selectedJobForDetails.printType} • {selectedJobForDetails.pages} pages • {selectedJobForDetails.paperSize}</span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">Binding Option:</span>
                  <span>{selectedJobForDetails.binding || 'None'}</span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">Submitted Time:</span>
                  <span>{selectedJobForDetails.submittedTime}</span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">Current Status:</span>
                  <StatusBadge status={getBadgeVariant(selectedJobForDetails.status)} labelOverride={selectedJobForDetails.status} />
                </div>
                <div className="spec-row">
                  <span className="spec-label">Queue Position:</span>
                  <span>
                    <strong>
                      {selectedJobForDetails.status !== 'Ready' && selectedJobForDetails.status !== 'Collected' && selectedJobForDetails.status !== 'Completed'
                        ? `#${selectedJobForDetails.queuePosition || 1}`
                        : '—'}
                    </strong>
                  </span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">Estimated Waiting Time:</span>
                  <span><strong>{selectedJobForDetails.estimatedWaitTime}</strong></span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">Assigned Workstation:</span>
                  <span>{selectedJobForDetails.assignedPrinter}</span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">Total Amount:</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>₹{selectedJobForDetails.cost ? selectedJobForDetails.cost.toFixed(2) : '0.00'}</span>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ gap: '0.5rem' }}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const current = selectedJobForDetails;
                  setSelectedJobForDetails(null);
                  setSelectedJobForStatusUpdate(current);
                }}
              >
                Update Status
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setSelectedJobForDetails(null)}
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

export default StaffDashboard;
