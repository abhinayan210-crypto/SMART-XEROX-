/**
 * Print Jobs API Routes (STEP 10)
 * Handles print job submissions, queue retrieval, and status advancement
 * with automatic student notifications.
 */

import express from 'express';
import { db } from '../database/database.js';

const router = express.Router();

const VALID_STATUSES = ['Received', 'Processing', 'Printing', 'Ready', 'Collected'];

const VALID_TRANSITIONS = {
  'Received': ['Processing'],
  'Processing': ['Printing'],
  'Printing': ['Ready'],
  'Ready': ['Collected']
};

/**
 * Helper to generate status change notification in database
 */
const createStatusNotification = (job, newStatus) => {
  try {
    const existingStmt = db.prepare(
      'SELECT id FROM notifications WHERE job_id = ? AND title LIKE ? LIMIT 1'
    );

    let title = '';
    let message = '';
    let type = 'info';

    switch (newStatus) {
      case 'Received':
        title = 'Print Request Received';
        message = `Your print request for "${job.file_name}" has been received successfully.`;
        type = 'info';
        break;
      case 'Processing':
        title = 'Print Request Processing';
        message = `Your print job for "${job.file_name}" is now being processed.`;
        type = 'info';
        break;
      case 'Printing':
        title = 'Print Job Printing';
        message = `Your print job for "${job.file_name}" is currently being printed.`;
        type = 'info';
        break;
      case 'Ready':
        title = 'Print Ready';
        message = `"${job.file_name}" is ready for collection.`;
        type = 'success';
        break;
      case 'Collected':
        title = 'Print Collected';
        message = `Your print job for "${job.file_name}" has been marked as collected.`;
        type = 'success';
        break;
      default:
        title = `Status Updated: ${newStatus}`;
        message = `Your print job for "${job.file_name}" is now ${newStatus}.`;
        type = 'info';
    }

    // Duplicate prevention: check if this status notification was already created for this job
    const alreadyExists = existingStmt.get(job.id, `%${title}%`);
    if (alreadyExists) {
      return null;
    }

    const notifId = `NOTIF-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const insertNotifStmt = db.prepare(
      'INSERT INTO notifications (id, student_id, job_id, title, message, type, is_read) VALUES (?, ?, ?, ?, ?, ?, 0)'
    );

    insertNotifStmt.run(notifId, job.student_id, job.id, title, message, type);
    return notifId;
  } catch (err) {
    console.error('Error generating status notification:', err);
    return null;
  }
};

/**
 * GET /api/print-jobs
 * Retrieve all print jobs with student metadata
 */
router.get('/', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT 
        pj.id,
        pj.student_id,
        s.name AS student_name,
        s.email AS student_email,
        pj.file_name,
        pj.copies,
        pj.print_type,
        pj.page_range,
        pj.status,
        pj.submitted_at,
        pj.updated_at
      FROM print_jobs pj
      LEFT JOIN students s ON pj.student_id = s.id
      ORDER BY pj.submitted_at DESC
    `);
    const jobs = stmt.all();

    res.json({
      success: true,
      data: jobs
    });
  } catch (err) {
    console.error('Error fetching print jobs:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve print jobs'
    });
  }
});

/**
 * GET /api/print-jobs/:id
 * Retrieve single print job
 */
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const stmt = db.prepare(`
      SELECT 
        pj.id,
        pj.student_id,
        s.name AS student_name,
        s.email AS student_email,
        pj.file_name,
        pj.copies,
        pj.print_type,
        pj.page_range,
        pj.status,
        pj.submitted_at,
        pj.updated_at
      FROM print_jobs pj
      LEFT JOIN students s ON pj.student_id = s.id
      WHERE pj.id = ?
    `);
    const job = stmt.get(id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Print job not found'
      });
    }

    res.json({
      success: true,
      data: job
    });
  } catch (err) {
    console.error('Error fetching print job:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve print job'
    });
  }
});

/**
 * POST /api/print-jobs
 * Create a new print job
 */
router.post('/', (req, res) => {
  try {
    const { student_id, file_name, copies, print_type, page_range } = req.body;

    if (!student_id || typeof student_id !== 'string' || !student_id.trim()) {
      return res.status(400).json({
        success: false,
        message: 'student_id is required'
      });
    }

    if (!file_name || typeof file_name !== 'string' || !file_name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'file_name is required'
      });
    }

    // Verify student exists
    const studentStmt = db.prepare('SELECT id FROM students WHERE id = ?');
    const student = studentStmt.get(student_id.trim());

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Associated student does not exist'
      });
    }

    const numCopies = Math.max(1, parseInt(copies, 10) || 1);
    const printTypeClean = (print_type || 'B&W').trim();
    const pageRangeClean = (page_range || 'All Pages').trim();
    const jobId = `PRT-${Date.now().toString().slice(-4)}${Math.floor(10 + Math.random() * 90)}`;
    const now = new Date().toISOString();

    const insertStmt = db.prepare(`
      INSERT INTO print_jobs (id, student_id, file_name, copies, print_type, page_range, status, submitted_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'Received', ?, ?)
    `);

    insertStmt.run(
      jobId,
      student_id.trim(),
      file_name.trim(),
      numCopies,
      printTypeClean,
      pageRangeClean,
      now,
      now
    );

    const newJob = db.prepare('SELECT * FROM print_jobs WHERE id = ?').get(jobId);

    // Automatically trigger 'Received' notification for student
    createStatusNotification(newJob, 'Received');

    res.status(201).json({
      success: true,
      message: 'Print job submitted successfully',
      data: newJob
    });
  } catch (err) {
    console.error('Error creating print job:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to create print job'
    });
  }
});

/**
 * PATCH /api/print-jobs/:id/status
 * Update print job status with validated transitions
 */
router.patch('/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || typeof status !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const newStatus = status.trim();

    if (!VALID_STATUSES.includes(newStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status "${newStatus}". Must be one of: ${VALID_STATUSES.join(', ')}`
      });
    }

    const job = db.prepare('SELECT * FROM print_jobs WHERE id = ?').get(id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Print job not found'
      });
    }

    const currentStatus = job.status;

    // Check valid status progression
    const allowedNext = VALID_TRANSITIONS[currentStatus];
    if (!allowedNext || !allowedNext.includes(newStatus)) {
      // If setting to same status, return existing without error
      if (currentStatus === newStatus) {
        return res.json({
          success: true,
          message: `Job is already in ${newStatus} status`,
          data: job
        });
      }

      return res.status(400).json({
        success: false,
        message: `Invalid status transition from "${currentStatus}" to "${newStatus}". Expected next stage: ${allowedNext ? allowedNext.join(', ') : 'None'}`
      });
    }

    const now = new Date().toISOString();
    const updateStmt = db.prepare('UPDATE print_jobs SET status = ?, updated_at = ? WHERE id = ?');
    updateStmt.run(newStatus, now, id);

    const updatedJob = db.prepare('SELECT * FROM print_jobs WHERE id = ?').get(id);

    // Automatically trigger notification for student
    createStatusNotification(updatedJob, newStatus);

    res.json({
      success: true,
      message: `Print job status updated to ${newStatus}`,
      data: updatedJob
    });
  } catch (err) {
    console.error('Error updating print job status:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to update print job status'
    });
  }
});

export default router;
