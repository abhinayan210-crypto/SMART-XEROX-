import React, { useState } from 'react';
import Button from './Button';
import { useAuth } from '../context/AuthContext';

/**
 * Navbar Component for SmartPrint AI
 * Features:
 * - Brand logo & name: "SmartPrint AI"
 * - Navigation links: Home, How It Works, Features
 * - Action buttons: "Student Login", "Staff Login", or User Profile & Dashboard if logged in
 * - Responsive mobile menu
 */
export const Navbar = ({ activePage = 'landing', onNavigate }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();

  const handleNavClick = (sectionId) => {
    setMobileMenuOpen(false);
    if (activePage !== 'landing') {
      if (onNavigate) onNavigate('landing');
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      } else if (sectionId === 'hero') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const handleLogout = async () => {
    setMobileMenuOpen(false);
    await logout();
    if (onNavigate) onNavigate('login');
  };

  return (
    <header className="navbar">
      <div className="container navbar-container">
        {/* Brand Logo & Name */}
        <div 
          className="navbar-brand" 
          onClick={() => handleNavClick('hero')}
          style={{ cursor: 'pointer' }}
        >
          <div className="navbar-brand-logo">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9V2h12v7"></path>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
              <rect x="6" y="14" width="12" height="8" rx="1"></rect>
              <circle cx="18" cy="11" r="1" fill="currentColor"></circle>
            </svg>
          </div>
          <div className="navbar-brand-text">
            <span className="navbar-brand-title">SmartPrint AI</span>
            <span className="navbar-brand-subtitle">AI Immersion Project</span>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="desktop-nav">
          <ul className="navbar-nav">
            <li>
              <button
                type="button"
                className="nav-link"
                onClick={() => handleNavClick('hero')}
              >
                Home
              </button>
            </li>
            <li>
              <button
                type="button"
                className="nav-link"
                onClick={() => handleNavClick('how-it-works')}
              >
                How It Works
              </button>
            </li>
            <li>
              <button
                type="button"
                className="nav-link"
                onClick={() => handleNavClick('features')}
              >
                Features
              </button>
            </li>
          </ul>
        </nav>

        {/* Header Action Buttons */}
        <div className="navbar-actions">
          {isAuthenticated && user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onNavigate && onNavigate(user.role === 'staff' ? 'staff' : 'student')}
              >
                {user.role === 'staff' ? 'Staff Dashboard' : 'Student Dashboard'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
              >
                Logout
              </Button>
            </div>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate && onNavigate('login', { role: 'student' })}
              >
                Student Login
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate && onNavigate('login', { role: 'staff' })}
              >
                Staff Login
              </Button>
            </>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            className="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {mobileMenuOpen ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="mobile-dropdown-menu">
          <button
            type="button"
            className="mobile-nav-link"
            onClick={() => handleNavClick('hero')}
          >
            Home
          </button>
          <button
            type="button"
            className="mobile-nav-link"
            onClick={() => handleNavClick('how-it-works')}
          >
            How It Works
          </button>
          <button
            type="button"
            className="mobile-nav-link"
            onClick={() => handleNavClick('features')}
          >
            Features
          </button>
          <div className="mobile-nav-divider" />
          <div className="mobile-nav-actions">
            {isAuthenticated && user ? (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    if (onNavigate) onNavigate(user.role === 'staff' ? 'staff' : 'student');
                  }}
                >
                  {user.role === 'staff' ? 'Staff Dashboard' : 'Student Dashboard'}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleLogout}
                >
                  Logout ({user.name || user.email})
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    if (onNavigate) onNavigate('login', { role: 'student' });
                  }}
                >
                  Student Login
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    if (onNavigate) onNavigate('login', { role: 'staff' });
                  }}
                >
                  Staff Login
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
