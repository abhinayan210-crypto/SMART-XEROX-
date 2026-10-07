import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => authService.getCurrentUser());
  const [token, setToken] = useState(() => authService.getToken());
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    // Synchronize local state with authService updates
    const unsubscribe = authService.subscribe((updatedUser) => {
      if (isMounted) {
        setUser(updatedUser);
        setToken(authService.getToken());
      }
    });

    // Validate active session against backend
    const checkSession = async () => {
      if (authService.getToken()) {
        try {
          const freshUser = await authService.fetchCurrentUser();
          if (isMounted && freshUser) {
            setUser(freshUser);
          }
        } catch (err) {
          console.warn('Session verification notice:', err.message);
        }
      }
      if (isMounted) {
        setLoading(false);
      }
    };

    checkSession();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const login = async (credentials) => {
    setAuthError(null);
    try {
      const result = await authService.login(credentials);
      setUser(result.user);
      setToken(result.token);
      return result;
    } catch (err) {
      setAuthError(err.message || 'Login failed');
      throw err;
    }
  };

  const register = async (userData) => {
    setAuthError(null);
    try {
      const result = await authService.register(userData);
      setUser(result.user);
      setToken(result.token);
      return result;
    } catch (err) {
      setAuthError(err.message || 'Registration failed');
      throw err;
    }
  };

  const logout = async () => {
    setAuthError(null);
    await authService.logout();
    setUser(null);
    setToken(null);
  };

  const value = {
    user,
    token,
    role: user?.role || null,
    isAuthenticated: Boolean(token && user),
    loading,
    error: authError,
    login,
    register,
    logout,
    clearError: () => setAuthError(null)
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
