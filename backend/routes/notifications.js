/**
 * Notifications API Routes (STEP 10)
 * Handles student notification retrieval, read state updating, and clearing.
 */

import express from 'express';
import { db } from '../database/database.js';

const router = express.Router();

/**
 * POST /api/notifications
 * Manually create a notification
 */
router.post('/', (req, res) => {
  try {
    const { student_id, job_id, title, message, type } = req.body;

    if (!student_id || !title || !message) {
      return res.status(400).json({
        success: false,
        message: 'student_id, title, and message are required'
      });
    }

    const notifId = `NOTIF-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const notifType = (type || 'info').trim();

    const insertStmt = db.prepare(`
      INSERT INTO notifications (id, student_id, job_id, title, message, type, is_read)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `);

    insertStmt.run(notifId, student_id.trim(), job_id || null, title.trim(), message.trim(), notifType);

    const created = db.prepare('SELECT * FROM notifications WHERE id = ?').get(notifId);

    res.status(201).json({
      success: true,
      data: {
        ...created,
        read: Boolean(created.is_read),
        isUnread: !Boolean(created.is_read)
      }
    });
  } catch (err) {
    console.error('Error creating notification:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to create notification'
    });
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark a single notification as read
 */
router.patch('/:id/read', (req, res) => {
  try {
    const { id } = req.params;

    const notif = db.prepare('SELECT * FROM notifications WHERE id = ?').get(id);
    if (!notif) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    const updateStmt = db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?');
    updateStmt.run(id);

    const updated = db.prepare('SELECT * FROM notifications WHERE id = ?').get(id);

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: {
        ...updated,
        read: true,
        isUnread: false
      }
    });
  } catch (err) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to update notification read status'
    });
  }
});

export default router;
