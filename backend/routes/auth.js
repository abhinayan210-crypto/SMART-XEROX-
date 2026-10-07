/**
 * SmartPrint AI Authentication Routes (STEP 12)
 * Handles registration, login, current user validation (me), and logout.
 */

import express from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../database/database.js';
import { generateToken, authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * Helper to normalize and sanitize user output (never return passwordHash)
 */
const formatUser = (userRow) => {
  return {
    id: userRow.id,
    name: userRow.name,
    email: userRow.email,
    role: userRow.role,
    createdAt: userRow.created_at || userRow.createdAt
  };
};

/**
 * POST /api/auth/register
 * Register a new student or staff user
 */
router.post('/register', (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Name is required'
      });
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'A valid email address is required'
      });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    const cleanRole = (role || 'student').toLowerCase().trim();
    if (!['student', 'staff'].includes(cleanRole)) {
      return res.status(400).json({
        success: false,
        message: 'Role must be either "student" or "staff"'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user with this email already exists
    const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(normalizedEmail);
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists'
      });
    }

    const userId = cleanRole === 'staff'
      ? `STF-2026-${Math.floor(1000 + Math.random() * 9000)}`
      : `STD-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const saltRounds = 10;
    const passwordHash = bcrypt.hashSync(password, saltRounds);
    const now = new Date().toISOString();

    // Insert user into SQLite database
    const insertStmt = db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(userId, name.trim(), normalizedEmail, passwordHash, cleanRole, now);

    // If role is student, also sync into students table
    if (cleanRole === 'student') {
      try {
        const studentExists = db.prepare('SELECT id FROM students WHERE id = ? OR LOWER(email) = LOWER(?)').get(userId, normalizedEmail);
        if (!studentExists) {
          db.prepare('INSERT INTO students (id, name, email, created_at) VALUES (?, ?, ?, ?)').run(userId, name.trim(), normalizedEmail, now);
        }
      } catch (err) {
        console.warn('Student profile sync notice:', err.message);
      }
    }

    const createdUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    const userResponse = formatUser(createdUser);
    const token = generateToken(userResponse);

    res.status(201).json({
      success: true,
      message: 'Account registered successfully',
      token,
      user: userResponse
    });
  } catch (err) {
    console.error('Error during registration:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to complete registration'
    });
  }
});

/**
 * POST /api/auth/login
 * Authenticate student or staff member with email and password
 */
router.post('/login', (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    if (!password || typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Password is required'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Look up user in SQLite database
    const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(normalizedEmail);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Verify bcrypt password hash
    const isPasswordValid = bcrypt.compareSync(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // If a role was specified in the login request (e.g. Student vs Staff tab), verify role matches
    if (role && typeof role === 'string' && role.trim()) {
      const targetRole = role.toLowerCase().trim();
      if (user.role !== targetRole) {
        return res.status(403).json({
          success: false,
          message: `Role mismatch: This account has "${user.role}" permissions, but you are attempting to log in through the "${targetRole}" portal. Please switch to the ${user.role === 'student' ? 'Student' : 'Staff'} Login tab.`
        });
      }
    }

    const userResponse = formatUser(user);
    const token = generateToken(userResponse);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: userResponse
    });
  } catch (err) {
    console.error('Error during login:', err);
    res.status(500).json({
      success: false,
      message: 'An error occurred during authentication'
    });
  }
});

/**
 * GET /api/auth/me
 * Validate current session and retrieve authenticated user profile
 */
router.get('/me', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    const user = db.prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?').get(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found'
      });
    }

    res.json({
      success: true,
      user: formatUser(user)
    });
  } catch (err) {
    console.error('Error fetching current user:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user profile'
    });
  }
});

/**
 * POST /api/auth/logout
 * Acknowledge logout request
 */
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

export default router;
