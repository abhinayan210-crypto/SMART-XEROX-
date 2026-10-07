import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import StudentDashboard from './pages/StudentDashboard';
import StaffDashboard from './pages/StaffDashboard';
import LoginPage from './pages/LoginPage';
import { AuthProvider, useAuth } from './context/AuthContext';

/**
 * Main Application Routing & Role-Based Guard Controller (STEP 12)
 */
function AppContent() {
  const { user, isAuthenticated, loading } = useAuth();

  const getInitialPage = () => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path === '/student') return 'student';
      if (path === '/staff') return 'staff';
      if (path === '/login') return 'login';
    }
    return 'landing';
  };

  const [currentPage, setCurrentPage] = useState(getInitialPage);
  const [loginInitialRole, setLoginInitialRole] = useState('student');
  const [accessDeniedNotice, setAccessDeniedNotice] = useState(null);

  /**
   * Protected Navigation Handler with Role Access Enforcement
   */
  const handleNavigate = useCallback((page, options = {}) => {
    if (options && options.role) {
      setLoginInitialRole(options.role);
    }

    if (page === 'student') {
      if (!isAuthenticated) {
        setAccessDeniedNotice('Please log in as a Student to access the Student Workspace.');
        setLoginInitialRole('student');
        setCurrentPage('login');
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.history.pushState({}, '', '/login');
        }
        return;
      }
      if (user && user.role !== 'student') {
        setAccessDeniedNotice('Access Denied: Staff operators cannot access the Student Workspace.');
        setCurrentPage('staff');
        if (typeof window !== 'undefined' && window.location.pathname !== '/staff') {
          window.history.pushState({}, '', '/staff');
        }
        return;
      }
      setAccessDeniedNotice(null);
      setCurrentPage('student');
      if (typeof window !== 'undefined' && window.location.pathname !== '/student') {
        window.history.pushState({}, '', '/student');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (page === 'staff') {
      if (!isAuthenticated) {
        setAccessDeniedNotice('Please log in as Staff to access the Staff Operations Console.');
        setLoginInitialRole('staff');
        setCurrentPage('login');
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.history.pushState({}, '', '/login');
        }
        return;
      }
      if (user && user.role !== 'staff') {
        setAccessDeniedNotice('Access Denied: Students are not authorized to access the Staff Operations Console.');
        setCurrentPage('student');
        if (typeof window !== 'undefined' && window.location.pathname !== '/student') {
          window.history.pushState({}, '', '/student');
        }
        return;
      }
      setAccessDeniedNotice(null);
      setCurrentPage('staff');
      if (typeof window !== 'undefined' && window.location.pathname !== '/staff') {
        window.history.pushState({}, '', '/staff');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (page === 'login') {
      setAccessDeniedNotice(null);
      setCurrentPage('login');
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.history.pushState({}, '', '/login');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Landing Page
    setAccessDeniedNotice(null);
    setCurrentPage('landing');
    if (typeof window !== 'undefined' && window.location.pathname !== '/') {
      window.history.pushState({}, '', '/');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [isAuthenticated, user]);

  // Route guarding on load & popstate (browser back/forward)
  useEffect(() => {
    if (loading) return;

    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/student') {
        handleNavigate('student');
      } else if (path === '/staff') {
        handleNavigate('staff');
      } else if (path === '/login') {
        setCurrentPage('login');
      } else {
        setCurrentPage('landing');
      }
    };

    // Initial check for guarded routes
    const path = window.location.pathname;
    if (path === '/student' && (!isAuthenticated || (user && user.role !== 'student'))) {
      handleNavigate('student');
    } else if (path === '/staff' && (!isAuthenticated || (user && user.role !== 'staff'))) {
      handleNavigate('staff');
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [loading, isAuthenticated, user, handleNavigate]);

  return (
    <div className="app-layout">
      {/* Top Navbar rendered for Landing & Login pages */}
      {(currentPage === 'landing') && (
        <Navbar activePage={currentPage} onNavigate={handleNavigate} />
      )}

      {/* Global Access Denied Toast if redirected while logged in */}
      {accessDeniedNotice && (currentPage === 'student' || currentPage === 'staff') && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#991b1b',
          padding: '0.85rem 1.25rem',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(15, 23, 42, 0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: '0.85rem',
          fontWeight: '500'
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>{accessDeniedNotice}</span>
          <button
            type="button"
            onClick={() => setAccessDeniedNotice(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#991b1b',
              cursor: 'pointer',
              fontWeight: 'bold',
              marginLeft: '0.5rem'
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="layout-content-area">
        {/* Landing Page */}
        {currentPage === 'landing' && (
          <LandingPage onNavigate={handleNavigate} />
        )}

        {/* STEP 12: Login Page */}
        {currentPage === 'login' && (
          <LoginPage
            onNavigate={handleNavigate}
            initialRole={loginInitialRole}
            accessDeniedMessage={accessDeniedNotice}
          />
        )}

        {/* STEP 3 & STEP 12: Protected Student Dashboard */}
        {currentPage === 'student' && (
          <StudentDashboard onNavigate={handleNavigate} />
        )}

        {/* STEP 4 & STEP 12: Protected Staff Dashboard */}
        {currentPage === 'staff' && (
          <StaffDashboard onNavigate={handleNavigate} />
        )}
      </main>
    </div>
  );
}

/**
 * Root Application Component with AuthProvider Context
 */
export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
