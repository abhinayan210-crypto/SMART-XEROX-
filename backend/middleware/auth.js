/**
 * SmartPrint AI Backend Authentication Middleware (STEP 12)
 * JWT verification, Token generation, and Role-Based Access Control (RBAC).
 */

import jwt from 'jsonwebtoken';

export const JWT_SECRET = process.env.JWT_SECRET || 'smartprint-secret-key-2026-ai-project-auth';
export const JWT_EXPIRES_IN = '24h';

/**
 * Generate a signed JWT token for an authenticated user
 */
export const generateToken = (user) => {
  const payload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * Middleware: Verify JWT in Authorization header
 * Expected header format: "Authorization: Bearer <token>"
 */
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  let token = null;

  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && /^Bearer$/i.test(parts[0])) {
      token = parts[1];
    } else if (parts.length === 1) {
      token = parts[0];
    }
  }

  // Also check query param fallback for direct media or testing if necessary
  if (!token && req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication token required. Please log in.'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: err.name === 'TokenExpiredError' 
        ? 'Session token expired. Please log in again.' 
        : 'Invalid authentication token.'
    });
  }
};

/**
 * Middleware: Restrict access to specific roles (e.g. 'staff', 'student')
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Role "${req.user.role}" is not authorized for this resource.`
      });
    }

    next();
  };
};

export default {
  JWT_SECRET,
  generateToken,
  authenticateToken,
  requireRole
};
