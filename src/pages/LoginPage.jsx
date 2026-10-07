import React, { useState, useEffect } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';

/**
 * SmartPrint AI Login Page (STEP 12)
 * Clean, professional role-based authentication portal.
 */
export const LoginPage = ({ onNavigate, initialRole = 'student', accessDeniedMessage = null }) => {
  const { login, isAuthenticated, user, role: currentRole } = useAuth();

  const [activeRole, setActiveRole] = useState(initialRole || 'student');
  const [email, setEmail] = useState(
    initialRole === 'staff' ? 'staff@smartprint.com' : 'student@smartprint.com'
  );
  const [password, setPassword] = useState(
    initialRole === 'staff' ? 'Staff@123' : 'Student@123'
  );
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [deniedAlert, setDeniedAlert] = useState(accessDeniedMessage);

  // If already authenticated, redirect to appropriate portal
  useEffect(() => {
    if (isAuthenticated && user && !accessDeniedMessage) {
      if (user.role === 'staff') {
        onNavigate && onNavigate('staff');
      } else {
        onNavigate && onNavigate('student');
      }
    }
  }, [isAuthenticated, user, accessDeniedMessage, onNavigate]);

  // Sync role change with default demo credentials
  const handleRoleChange = (newRole) => {
    setActiveRole(newRole);
    setErrorMessage(null);
    setDeniedAlert(null);
    if (newRole === 'staff') {
      setEmail('staff@smartprint.com');
      setPassword('Staff@123');
    } else {
      setEmail('student@smartprint.com');
      setPassword('Student@123');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setDeniedAlert(null);

    if (!email.trim()) {
      setErrorMessage('Please enter your email address');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password');
      return;
    }

    setIsLoading(true);

    try {
      const result = await login({
        email: email.trim(),
        password,
        role: activeRole
      });

      if (result && result.user) {
        if (result.user.role === 'staff') {
          onNavigate && onNavigate('staff');
        } else {
          onNavigate && onNavigate('student');
        }
      }
    } catch (err) {
      setErrorMessage(err.message || 'Invalid credentials. Please verify your email and password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillDemo = (roleType) => {
    setActiveRole(roleType);
    setErrorMessage(null);
    setDeniedAlert(null);
    if (roleType === 'student') {
      setEmail('student@smartprint.com');
      setPassword('Student@123');
    } else {
      setEmail('staff@smartprint.com');
      setPassword('Staff@123');
    }
  };

  return (
    <div className="login-page-wrapper">
      <div className="login-card-container">
        {/* Header / Brand */}
        <div className="login-header">
          <div 
            className="login-brand-logo" 
            onClick={() => onNavigate && onNavigate('landing')}
            title="Return to Home"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9V2h12v7"></path>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
              <rect x="6" y="14" width="12" height="8" rx="1"></rect>
              <circle cx="18" cy="11" r="1" fill="currentColor"></circle>
            </svg>
          </div>
          <h1 className="login-title">SmartPrint AI</h1>
          <p className="login-subtitle">Secure Role-Based Authentication Portal</p>
        </div>

        {/* Role Selector Tabs */}
        <div className="login-role-selector" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeRole === 'student'}
            className={`login-role-tab ${activeRole === 'student' ? 'active' : ''}`}
            onClick={() => handleRoleChange('student')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <span>Student Login</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeRole === 'staff'}
            className={`login-role-tab ${activeRole === 'staff' ? 'active' : ''}`}
            onClick={() => handleRoleChange('staff')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
            <span>Staff Login</span>
          </button>
        </div>

        {/* Access Denied Warning Banner */}
        {deniedAlert && (
          <div className="login-alert warning" role="alert">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>{deniedAlert}</span>
          </div>
        )}

        {/* Error Message Banner */}
        {errorMessage && (
          <div className="login-alert error" role="alert">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Main Login Form */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">
              {activeRole === 'staff' ? 'Staff Email Address' : 'Student Email Address'}
            </label>
            <div className="input-with-icon">
              <span className="input-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
              </span>
              <input
                id="login-email"
                type="email"
                className="form-input"
                placeholder={activeRole === 'staff' ? 'staff@smartprint.com' : 'student@smartprint.com'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">
              Password
            </label>
            <div className="input-with-icon">
              <span className="input-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              </span>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide password' : 'Show password'}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="login-submit-btn"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="btn-loading-content">
                <svg className="spinner-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                </svg>
                Authenticating...
              </span>
            ) : (
              <span>Login to {activeRole === 'staff' ? 'Staff Console' : 'Student Portal'}</span>
            )}
          </Button>
        </form>

        {/* Demo Accounts Quick-Fill Helper */}
        <div className="login-demo-section">
          <div className="demo-header-label">Demo Testing Accounts (Click to Fill):</div>
          <div className="demo-buttons-grid">
            <button
              type="button"
              className={`demo-fill-btn ${activeRole === 'student' ? 'selected' : ''}`}
              onClick={() => handleFillDemo('student')}
            >
              <div className="demo-btn-role">Student Demo</div>
              <div className="demo-btn-creds">student@smartprint.com • Student@123</div>
            </button>

            <button
              type="button"
              className={`demo-fill-btn ${activeRole === 'staff' ? 'selected' : ''}`}
              onClick={() => handleFillDemo('staff')}
            >
              <div className="demo-btn-role">Staff Demo</div>
              <div className="demo-btn-creds">staff@smartprint.com • Staff@123</div>
            </button>
          </div>
        </div>

        {/* Back Link */}
        <div className="login-footer">
          <button
            type="button"
            className="back-home-link"
            onClick={() => onNavigate && onNavigate('landing')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            <span>Back to SmartPrint AI Home</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
