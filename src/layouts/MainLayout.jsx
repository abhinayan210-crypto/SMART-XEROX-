import React from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';

/**
 * Main Layout Component
 * Provides structural framing, navigation header, optional sidebar, and footer.
 */
export const MainLayout = ({
  children,
  activePage = 'landing',
  onNavigate,
  showSidebar = false,
  sidebarRole = 'student',
  activeTab = 'overview',
  onTabChange,
  currentUser
}) => {
  return (
    <div className="app-layout">
      {/* Top Navigation */}
      <Navbar activePage={activePage} onNavigate={onNavigate} />

      {/* Main Body Area */}
      <div className="layout-main-wrapper">
        {showSidebar && (
          <Sidebar
            role={sidebarRole}
            activeTab={activeTab}
            onTabChange={onTabChange}
            user={currentUser}
          />
        )}

        <main className="layout-content-area">
          {children}
        </main>
      </div>

      {/* Professional Minimal Footer */}
      <footer className="app-footer">
        <div className="container footer-content">
          <div>
            <strong>AI-Powered Smart Print Tracking System</strong> • AI Immersion College Project
          </div>
          <div>
            Built with React & Vite • Offline Mock Mode
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;
