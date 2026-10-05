-- SmartPrint AI Database Schema (STEP 10)
-- SQLite Schema for Students, Print Jobs, and Notifications

PRAGMA foreign_keys = ON;

-- 1. Students Table
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Print Jobs Table
CREATE TABLE IF NOT EXISTS print_jobs (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  copies INTEGER NOT NULL DEFAULT 1,
  print_type TEXT NOT NULL DEFAULT 'B&W',
  page_range TEXT DEFAULT 'All Pages',
  status TEXT NOT NULL DEFAULT 'Received' CHECK (status IN ('Received', 'Processing', 'Printing', 'Ready', 'Collected')),
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- 3. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  job_id TEXT,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning')),
  is_read INTEGER NOT NULL DEFAULT 0 CHECK (is_read IN (0, 1)),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES print_jobs(id) ON DELETE SET NULL
);

-- Indexes for optimal lookup performance
CREATE INDEX IF NOT EXISTS idx_print_jobs_student_id ON print_jobs(student_id);
CREATE INDEX IF NOT EXISTS idx_print_jobs_status ON print_jobs(status);
CREATE INDEX IF NOT EXISTS idx_notifications_student_id ON notifications(student_id);
CREATE INDEX IF NOT EXISTS idx_notifications_job_id ON notifications(job_id);
