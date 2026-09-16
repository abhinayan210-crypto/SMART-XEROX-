import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import StudentDashboard from './pages/StudentDashboard';
import StaffDashboard from './pages/StaffDashboard';
import Card from './components/Card';
import Button from './components/Button';

/**
 * Root Application Component
 * Coordinates Landing Page, Student Dashboard (Step 3), and Staff Dashboard (Step 4).
 */
function App() {
  const getInitialPage = () => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path === '/student') return 'student';
      if (path === '/staff') return 'staff';
    }
    return 'landing';
  };

  const [currentPage, setCurrentPage] = useState(getInitialPage);

  // Handle URL path changes & browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/student') setCurrentPage('student');
      else if (path === '/staff') setCurrentPage('staff');
      else setCurrentPage('landing');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleNavigate = (page) => {
    setCurrentPage(page);
    const targetPath = page === 'landing' ? '/' : `/${page}`;
    if (typeof window !== 'undefined' && window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="app-layout">
      {/* For landing page only, render standard top navbar */}
      {currentPage !== 'student' && currentPage !== 'staff' && (
        <Navbar activePage={currentPage} onNavigate={handleNavigate} />
      )}

      {/* Main Content Area */}
      <main className="layout-content-area">
        {/* STEP 2: Landing Page (Preserved exactly as requested) */}
        {currentPage === 'landing' && (
          <LandingPage onNavigate={handleNavigate} />
        )}

        {/* STEP 3: Complete Student Dashboard */}
        {currentPage === 'student' && (
          <StudentDashboard onNavigate={handleNavigate} />
        )}

        {/* STEP 4: Complete Staff Dashboard */}
        {currentPage === 'staff' && (
          <StaffDashboard onNavigate={handleNavigate} />
        )}
      </main>
    </div>
  );
}

export default App;
