/**
 * Students API Routes (STEP 10 & STEP 12)
 * Handles student registration and retrieval with authentication and ownership controls.
 */

import express from 'express';
import { db } from '../database/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/students
 * List all students (Staff only)
 */
router.get('/', authenticateToken, requireRole('staff'), (req, res) => {
  try {
    const stmt = db.prepare('SELECT id, name, email, created_at FROM students ORDER BY created_at DESC');
    const students = stmt.all();
    res.json({
      success: true,
      data: students
    });
  } catch (err) {
    console.error('Error fetching students:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve students'
    });
  }
});

/**
 * GET /api/students/:id
 * Retrieve single student by ID (Owner student or Staff)
 */
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;

    // Check permissions
    if (req.user.role === 'student' && req.user.id !== id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not have permission to view other students\' profiles'
      });
    }

    const stmt = db.prepare('SELECT id, name, email, created_at FROM students WHERE id = ?');
    const student = stmt.get(id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.json({
      success: true,
      data: student
    });
  } catch (err) {
    console.error('Error fetching student:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve student details'
    });
  }
});

/**
 * POST /api/students
 * Create new student (Staff only or internal registration sync)
 */
router.post('/', authenticateToken, requireRole('staff'), (req, res) => {
  try {
    const { id, name, email } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Student name is required'
      });
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'Valid student email is required'
      });
    }

    const studentId = id && typeof id === 'string' && id.trim()
      ? id.trim()
      : `STD-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const checkStmt = db.prepare('SELECT id FROM students WHERE id = ? OR email = ?');
    const existing = checkStmt.get(studentId, email.trim());

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'A student with this ID or email already exists'
      });
    }

    const insertStmt = db.prepare('INSERT INTO students (id, name, email) VALUES (?, ?, ?)');
    insertStmt.run(studentId, name.trim(), email.trim());

    const created = db.prepare('SELECT id, name, email, created_at FROM students WHERE id = ?').get(studentId);

    res.status(201).json({
      success: true,
      message: 'Student registered successfully',
      data: created
    });
  } catch (err) {
    console.error('Error creating student:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to create student'
    });
  }
});

/**
 * GET /api/students/:studentId/print-jobs
 * Retrieve all print jobs belonging to a student (Owner or Staff)
 */
router.get('/:studentId/print-jobs', authenticateToken, (req, res) => {
  try {
    const { studentId } = req.params;

    // Check ownership
    if (req.user.role === 'student' && req.user.id !== studentId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You cannot view another student\'s print jobs'
      });
    }

    const student = db.prepare('SELECT id FROM students WHERE id = ?').get(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const stmt = db.prepare(`
      SELECT 
        id,
        student_id,
        file_name,
        copies,
        print_type,
        page_range,
        status,
        submitted_at,
        updated_at
      FROM print_jobs
      WHERE student_id = ?
      ORDER BY submitted_at DESC
    `);
    const jobs = stmt.all(studentId);

    res.json({
      success: true,
      data: jobs
    });
  } catch (err) {
    console.error('Error fetching student print jobs:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve student print jobs'
    });
  }
});

/**
 * GET /api/students/:studentId/notifications
 * Retrieve notifications belonging to a student (Owner or Staff)
 */
router.get('/:studentId/notifications', authenticateToken, (req, res) => {
  try {
    const { studentId } = req.params;

    // Check ownership
    if (req.user.role === 'student' && req.user.id !== studentId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You cannot view another student\'s notifications'
      });
    }

    const student = db.prepare('SELECT id FROM students WHERE id = ?').get(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const stmt = db.prepare(`
      SELECT 
        id,
        student_id,
        job_id,
        title,
        message,
        type,
        is_read,
        created_at
      FROM notifications
      WHERE student_id = ?
      ORDER BY created_at DESC
    `);
    const rows = stmt.all(studentId);

    const formatted = rows.map(n => ({
      ...n,
      read: Boolean(n.is_read),
      isUnread: !Boolean(n.is_read)
    }));

    res.json({
      success: true,
      data: formatted
    });
  } catch (err) {
    console.error('Error fetching student notifications:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve student notifications'
    });
  }
});

/**
 * PATCH /api/students/:studentId/notifications/read-all
 * Mark all notifications for a student as read (Owner or Staff)
 */
router.patch('/:studentId/notifications/read-all', authenticateToken, (req, res) => {
  try {
    const { studentId } = req.params;

    // Check ownership
    if (req.user.role === 'student' && req.user.id !== studentId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You cannot modify another student\'s notifications'
      });
    }

    const student = db.prepare('SELECT id FROM students WHERE id = ?').get(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const updateStmt = db.prepare('UPDATE notifications SET is_read = 1 WHERE student_id = ?');
    updateStmt.run(studentId);

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (err) {
    console.error('Error marking all notifications as read:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notifications as read'
    });
  }
});

/**
 * DELETE /api/students/:studentId/notifications
 * Clear/delete all notifications for a student (Owner or Staff)
 */
router.delete('/:studentId/notifications', authenticateToken, (req, res) => {
  try {
    const { studentId } = req.params;

    // Check ownership
    if (req.user.role === 'student' && req.user.id !== studentId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You cannot clear another student\'s notifications'
      });
    }

    const student = db.prepare('SELECT id FROM students WHERE id = ?').get(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const deleteStmt = db.prepare('DELETE FROM notifications WHERE student_id = ?');
    deleteStmt.run(studentId);

    res.json({
      success: true,
      message: 'All notifications cleared successfully'
    });
  } catch (err) {
    console.error('Error clearing student notifications:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to clear notifications'
    });
  }
});

export default router;
