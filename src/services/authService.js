/**
 * SmartPrint AI Frontend Authentication Service (STEP 12)
 * Manages user authentication, token storage, login/registration API calls,
 * session restoration, and role determination.
 */

const TOKEN_KEY = 'smartprint_auth_token';
const USER_KEY = 'smartprint_auth_user';

let currentBaseUrl = typeof window !== 'undefined' && window.__API_BASE_URL__ 
  ? window.__API_BASE_URL__ 
  : (typeof process !== 'undefined' && process.env && process.env.API_BASE_URL ? process.env.API_BASE_URL : 'http://localhost:5000/api');

let authListeners = [];

const notifyListeners = (user) => {
  authListeners.forEach(listener => {
    try {
      listener(user);
    } catch (err) {
      console.error('Auth listener error:', err);
    }
  });
};

let memoryToken = null;
let memoryUser = null;

export const authService = {
  baseUrl: currentBaseUrl,

  /**
   * Subscribe to authentication state changes
   */
  subscribe(listener) {
    authListeners.push(listener);
    return () => {
      authListeners = authListeners.filter(l => l !== listener);
    };
  },

  /**
   * Get stored JWT token
   */
  getToken() {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem(TOKEN_KEY) || memoryToken;
    }
    return memoryToken;
  },

  /**
   * Set JWT token
   */
  setToken(token) {
    memoryToken = token || null;
    if (typeof window !== 'undefined' && window.localStorage) {
      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }
    }
  },

  /**
   * Get cached user profile from localStorage
   */
  getCurrentUser() {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = localStorage.getItem(USER_KEY);
      if (raw) {
        try {
          return JSON.parse(raw);
        } catch {}
      }
    }
    return memoryUser;
  },

  /**
   * Save user profile to localStorage
   */
  setUser(user) {
    memoryUser = user || null;
    if (typeof window !== 'undefined' && window.localStorage) {
      if (user) {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(USER_KEY);
      }
    }
    notifyListeners(user);
  },

  /**
   * Check if user is authenticated with a valid session
   */
  isAuthenticated() {
    return Boolean(this.getToken() && this.getCurrentUser());
  },

  /**
   * Get current authenticated user role ('student' | 'staff' | null)
   */
  getUserRole() {
    const user = this.getCurrentUser();
    return user ? user.role : null;
  },

  /**
   * Authenticate with email & password
   */
  async login({ email, password, role }) {
    const base = this.baseUrl || currentBaseUrl;
    const url = `${base}/auth/login`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password, role })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || 'Login failed. Please check your credentials.');
      }

      const { token, user } = data;
      this.setToken(token);
      this.setUser(user);

      return { success: true, token, user };
    } catch (error) {
      console.warn('[SmartPrint Auth] Login failed:', error.message);
      throw error;
    }
  },

  /**
   * Register a new account
   */
  async register({ name, email, password, role = 'student' }) {
    const base = this.baseUrl || currentBaseUrl;
    const url = `${base}/auth/register`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, email, password, role })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      const { token, user } = data;
      this.setToken(token);
      this.setUser(user);

      return { success: true, token, user };
    } catch (error) {
      console.warn('[SmartPrint Auth] Registration failed:', error.message);
      throw error;
    }
  },

  /**
   * Validate token and fetch fresh user profile from backend
   */
  async fetchCurrentUser() {
    const token = this.getToken();
    if (!token) {
      this.setUser(null);
      return null;
    }

    const base = this.baseUrl || currentBaseUrl;
    const url = `${base}/auth/me`;

    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          this.logout();
        }
        return null;
      }

      const data = await response.json();
      if (data && data.user) {
        this.setUser(data.user);
        return data.user;
      }
      return null;
    } catch (err) {
      console.warn('[SmartPrint Auth] Failed to fetch current user from API:', err.message);
      // Fallback to cached user if offline
      return this.getCurrentUser();
    }
  },

  /**
   * Log out user, remove token & user from localStorage, and notify listeners
   */
  async logout() {
    const token = this.getToken();
    const base = this.baseUrl || currentBaseUrl;

    if (token) {
      try {
        await fetch(`${base}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }).catch(() => {});
      } catch (_) {}
    }

    this.setToken(null);
    this.setUser(null);

    return { success: true };
  }
};

export default authService;
