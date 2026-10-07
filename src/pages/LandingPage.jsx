import React from 'react';
import Card from '../components/Card';
import Button from '../components/Button';

/**
 * Landing Page Component for SmartPrint AI
 * Modern, minimal, and professional college AI Immersion project landing page.
 */
export const LandingPage = ({ onNavigate }) => {
  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="landing-page-container">
      {/* =========================================================================
          1. HERO SECTION
          ========================================================================= */}
      <section id="hero" className="landing-section hero-section-wrapper">
        <div className="hero-content">
          <div className="hero-badge-pill">
            <span className="badge-pulse-dot" />
            <span>AI Immersion College Project</span>
            <span className="badge-divider">•</span>
            <span>Campus Print Shop Intelligence</span>
          </div>

          <h1 className="hero-heading">
            Track Your Print. <br className="hero-br" />
            <span className="hero-heading-highlight">Skip the Wait.</span>
          </h1>

          <p className="hero-subtext">
            An AI-powered smart printing system that helps students track their print jobs in real time and helps shop staff manage print requests efficiently.
          </p>

          <div className="hero-cta-group">
            <Button
              variant="primary"
              size="lg"
              onClick={() => onNavigate && onNavigate('student')}
            >
              Track My Print →
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => scrollToSection('how-it-works')}
            >
              How It Works
            </Button>
          </div>
        </div>

        {/* Subtle, Professional Pipeline Illustration:
            Student → File Upload → AI Processing → Printer → Ready Notification */}
        <div className="pipeline-illustration-container">
          <div className="pipeline-track">
            {/* Step 1: Student */}
            <div className="pipeline-node">
              <div className="pipeline-icon-box">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
              <span className="pipeline-node-title">Student</span>
              <span className="pipeline-node-meta">Submits Request</span>
            </div>

            <div className="pipeline-connector" aria-hidden="true">
              <span className="pipeline-connector-line"></span>
              <span className="pipeline-connector-arrow">›</span>
            </div>

            {/* Step 2: File Upload */}
            <div className="pipeline-node">
              <div className="pipeline-icon-box">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="12" y1="18" x2="12" y2="12"></line>
                  <polyline points="9 15 12 12 15 15"></polyline>
                </svg>
              </div>
              <span className="pipeline-node-title">File Upload</span>
              <span className="pipeline-node-meta">PDF / DOCX</span>
            </div>

            <div className="pipeline-connector" aria-hidden="true">
              <span className="pipeline-connector-line"></span>
              <span className="pipeline-connector-arrow">›</span>
            </div>

            {/* Step 3: AI Processing */}
            <div className="pipeline-node pipeline-node-featured">
              <div className="pipeline-icon-box pipeline-icon-ai">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
                </svg>
              </div>
              <span className="pipeline-node-title">AI Processing</span>
              <span className="pipeline-node-meta">Queue & Time ML</span>
            </div>

            <div className="pipeline-connector" aria-hidden="true">
              <span className="pipeline-connector-line"></span>
              <span className="pipeline-connector-arrow">›</span>
            </div>

            {/* Step 4: Printer */}
            <div className="pipeline-node">
              <div className="pipeline-icon-box">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 6 2 18 2 18 9"></polyline>
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                  <rect x="6" y="14" width="12" height="8"></rect>
                </svg>
              </div>
              <span className="pipeline-node-title">Printer</span>
              <span className="pipeline-node-meta">Live Spooling</span>
            </div>

            <div className="pipeline-connector" aria-hidden="true">
              <span className="pipeline-connector-line"></span>
              <span className="pipeline-connector-arrow">›</span>
            </div>

            {/* Step 5: Ready Notification */}
            <div className="pipeline-node">
              <div className="pipeline-icon-box">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
              </div>
              <span className="pipeline-node-title">Ready Alert</span>
              <span className="pipeline-node-meta">PIN Handover</span>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          2. PROBLEM SECTION
          ========================================================================= */}
      <section id="problems" className="landing-section">
        <div className="section-header-center">
          <span className="section-eyebrow">The Campus Bottleneck</span>
          <h2 className="section-title">Printing Shouldn’t Mean Waiting</h2>
          <p className="section-subtitle">
            Traditional college printing counters face recurring friction points that waste student time and overwhelm staff.
          </p>
        </div>

        <div className="problems-grid">
          {/* Problem Card 1 */}
          <Card className="problem-card">
            <div className="problem-card-inner">
              <div className="problem-icon-wrapper">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  <line x1="11" y1="8" x2="11" y2="8.01"></line>
                  <line x1="11" y1="11" x2="11" y2="14"></line>
                </svg>
              </div>
              <h3 className="problem-card-title">“Where is my file?”</h3>
              <p className="problem-card-desc">
                Students have no real-time visibility into their print status after sending files to the shop.
              </p>
            </div>
          </Card>

          {/* Problem Card 2 */}
          <Card className="problem-card">
            <div className="problem-card-inner">
              <div className="problem-icon-wrapper">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </div>
              <h3 className="problem-card-title">“Uncertain Waiting Time”</h3>
              <p className="problem-card-desc">
                Students don't know how long their print job will take and are forced to stand in long physical queues.
              </p>
            </div>
          </Card>

          {/* Problem Card 3 */}
          <Card className="problem-card">
            <div className="problem-card-inner">
              <div className="problem-icon-wrapper">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  <line x1="9" y1="10" x2="9.01" y2="10"></line>
                  <line x1="12" y1="10" x2="12.01" y2="10"></line>
                  <line x1="15" y1="10" x2="15.01" y2="10"></line>
                </svg>
              </div>
              <h3 className="problem-card-title">“Repeated Enquiries”</h3>
              <p className="problem-card-desc">
                Students repeatedly ask staff whether their print is ready, interrupting ongoing print production.
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* =========================================================================
          3. SOLUTION SECTION
          ========================================================================= */}
      <section id="features" className="landing-section">
        <div className="section-header-center">
          <span className="section-eyebrow">The Modern Solution</span>
          <h2 className="section-title">Meet SmartPrint AI</h2>
          <p className="section-subtitle">
            SmartPrint AI connects students and printing staff through real-time print tracking, intelligent queue management and AI-powered assistance.
          </p>
        </div>

        <div className="solution-features-grid">
          {/* Feature 1: Live Print Tracking */}
          <Card className="solution-card">
            <div className="solution-card-body">
              <div className="solution-icon-box">
                <span className="solution-emoji">📄</span>
              </div>
              <h3 className="solution-title">Live Print Tracking</h3>
              <p className="solution-text">
                Track every print job with real-time status updates: Received → Processing → Printing → Ready → Collected.
              </p>
              <div className="solution-pill-tag">Live State Sync</div>
            </div>
          </Card>

          {/* Feature 2: Waiting Time Prediction */}
          <Card className="solution-card">
            <div className="solution-card-body">
              <div className="solution-icon-box">
                <span className="solution-emoji">⏱️</span>
              </div>
              <h3 className="solution-title">Waiting Time Prediction</h3>
              <p className="solution-text">
                Dynamic turnaround predictions calculated from active queue depth and copy volume.
              </p>
              <div className="solution-pill-tag">Smart Prediction</div>
            </div>
          </Card>

          {/* Feature 3: AI Queue Analysis */}
          <Card className="solution-card">
            <div className="solution-card-body">
              <div className="solution-icon-box">
                <span className="solution-emoji">📊</span>
              </div>
              <h3 className="solution-title">AI Queue Analysis</h3>
              <p className="solution-text">
                Automated workload classification and congestion insights to keep print center traffic running smoothly.
              </p>
              <div className="solution-pill-tag">Workload Insights</div>
            </div>
          </Card>

          {/* Feature 4: Smart Job Priority */}
          <Card className="solution-card">
            <div className="solution-card-body">
              <div className="solution-icon-box">
                <span className="solution-emoji">🎯</span>
              </div>
              <h3 className="solution-title">Smart Job Priority</h3>
              <p className="solution-text">
                Intelligent attention ranking that highlights long-waiting and high-volume orders for staff decision support.
              </p>
              <div className="solution-pill-tag">Operator Support</div>
            </div>
          </Card>

          {/* Feature 5: AI Assistant */}
          <Card className="solution-card">
            <div className="solution-card-body">
              <div className="solution-icon-box">
                <span className="solution-emoji">💬</span>
              </div>
              <h3 className="solution-title">AI Assistant</h3>
              <p className="solution-text">
                Instant answers to student questions regarding print status, queue position, estimated wait, and pickup PINs.
              </p>
              <div className="solution-pill-tag">Student Intelligence</div>
            </div>
          </Card>

          {/* Feature 6: Smart Notifications */}
          <Card className="solution-card">
            <div className="solution-card-body">
              <div className="solution-icon-box">
                <span className="solution-emoji">🔔</span>
              </div>
              <h3 className="solution-title">Smart Notifications</h3>
              <p className="solution-text">
                Automatic real-time alerts when print jobs change status and when documents are ready for counter pickup.
              </p>
              <div className="solution-pill-tag">Instant Alerts</div>
            </div>
          </Card>
        </div>
      </section>

      {/* =========================================================================
          4. HOW IT WORKS
          ========================================================================= */}
      <section id="how-it-works" className="landing-section">
        <div className="section-header-center">
          <span className="section-eyebrow">Seamless Workflow</span>
          <h2 className="section-title">How It Works</h2>
          <p className="section-subtitle">
            A simple 4-step workflow designed to save time for students and Xerox desk staff.
          </p>
        </div>

        <div className="how-it-works-container">
          <div className="steps-horizontal-grid">
            {/* Step 1 */}
            <div className="step-item">
              <div className="step-header">
                <span className="step-number">01</span>
                <div className="step-icon-circle">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                </div>
              </div>
              <h3 className="step-title">Upload File</h3>
              <p className="step-description">
                Upload your document, select pages, color preferences, and duplex settings.
              </p>
            </div>

            {/* Step 2 */}
            <div className="step-item">
              <div className="step-header">
                <span className="step-number">02</span>
                <div className="step-icon-circle">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                </div>
              </div>
              <h3 className="step-title">Track Status</h3>
              <p className="step-description">
                Monitor live queue progress and see your dynamic turnaround time.
              </p>
            </div>

            {/* Step 3 */}
            <div className="step-item">
              <div className="step-header">
                <span className="step-number">03</span>
                <div className="step-icon-circle">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                  </svg>
                </div>
              </div>
              <h3 className="step-title">Get Notification</h3>
              <p className="step-description">
                Receive an instant alert when your document is printed along with a secure pickup PIN.
              </p>
            </div>

            {/* Step 4 */}
            <div className="step-item">
              <div className="step-header">
                <span className="step-number">04</span>
                <div className="step-icon-circle">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
              </div>
              <h3 className="step-title">Collect Print</h3>
              <p className="step-description">
                Walk to the Xerox counter, verify your 4-digit PIN, and collect your prints instantly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          5. AI SECTION
          ========================================================================= */}
      <section id="ai-capabilities" className="landing-section ai-section-wrapper">
        <div className="section-header-center">
          <span className="section-eyebrow">Smart Automation</span>
          <h2 className="section-title">Powered by AI</h2>
          <p className="section-subtitle">
            Applying machine intelligence to make print workflows predictable, efficient, and conversational.
          </p>
        </div>

        <div className="ai-capabilities-grid">
          {/* AI Capability 1 */}
          <div className="ai-capability-item">
            <div className="ai-capability-bullet">
              <div className="ai-bullet-dot"></div>
            </div>
            <div className="ai-capability-content">
              <h3 className="ai-capability-title">Smart queue analysis</h3>
              <p className="ai-capability-desc">
                Dynamically analyzes document page density, paper requirements, and active printer load.
              </p>
            </div>
          </div>

          {/* AI Capability 2 */}
          <div className="ai-capability-item">
            <div className="ai-capability-bullet">
              <div className="ai-bullet-dot"></div>
            </div>
            <div className="ai-capability-content">
              <h3 className="ai-capability-title">Waiting-time prediction</h3>
              <p className="ai-capability-desc">
                Calculates precise turnaround estimates so students only walk to the shop when ready.
              </p>
            </div>
          </div>

          {/* AI Capability 3 */}
          <div className="ai-capability-item">
            <div className="ai-capability-bullet">
              <div className="ai-bullet-dot"></div>
            </div>
            <div className="ai-capability-content">
              <h3 className="ai-capability-title">Intelligent job prioritization</h3>
              <p className="ai-capability-desc">
                Schedules small urgent jobs and batch-groups duplex prints to maximize hardware efficiency.
              </p>
            </div>
          </div>

          {/* AI Capability 4 */}
          <div className="ai-capability-item">
            <div className="ai-capability-bullet">
              <div className="ai-bullet-dot"></div>
            </div>
            <div className="ai-capability-content">
              <h3 className="ai-capability-title">AI chatbot</h3>
              <p className="ai-capability-desc">
                Handles real-time queries about document formatting, printing costs, and queue position.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          6. CALL TO ACTION (CTA)
          ========================================================================= */}
      <section id="cta" className="landing-section">
        <div className="cta-card-box">
          <div className="cta-content-wrapper">
            <span className="cta-badge">Ready to print without the rush?</span>
            <h2 className="cta-heading">Stop Waiting. Start Tracking.</h2>
            <p className="cta-text">
              Know the status of your print job before you reach the counter.
            </p>
            <div className="cta-btn-wrapper">
              <Button
                variant="primary"
                size="lg"
                onClick={() => onNavigate && onNavigate('student')}
              >
                Get Started →
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          7. FOOTER
          ========================================================================= */}
      <footer className="landing-footer">
        <div className="footer-main-row">
          <div className="footer-brand-column">
            <div className="footer-brand-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: '6px' }}>
                <path d="M6 9V2h12v7"></path>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                <rect x="6" y="14" width="12" height="8" rx="1"></rect>
              </svg>
              SmartPrint AI
            </div>
            <p className="footer-tagline">“Making Print Jobs Smarter & Trackable”</p>
          </div>

          <div className="footer-nav-links">
            <button
              type="button"
              className="footer-link-btn"
              onClick={() => scrollToSection('hero')}
            >
              Home
            </button>
            <span className="footer-link-sep">|</span>
            <button
              type="button"
              className="footer-link-btn"
              onClick={() => scrollToSection('how-it-works')}
            >
              How It Works
            </button>
            <span className="footer-link-sep">|</span>
            <button
              type="button"
              className="footer-link-btn"
              onClick={() => scrollToSection('features')}
            >
              Features
            </button>
          </div>
        </div>

        <div className="footer-bottom-row">
          <span>AI Immersion College Project • Designed for Xerox & Print Center Workflows</span>
          <span>Offline Mock Prototype • React + Vite</span>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
