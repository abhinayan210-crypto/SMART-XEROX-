/**
 * SQLite Database Connection & Initialization (STEP 10)
 * Uses official SQLite WASM engine (sql.js) with persistent on-disk storage
 * to smartprint.db, matching standard SQLite query semantics.
 */

import initSqlJs from 'sql.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DB_PATH = path.join(__dirname, 'smartprint.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

// Initialize sql.js engine
const SQL = await initSqlJs();

// Load existing SQLite database file from disk if present, else create new
let rawDb = fs.existsSync(DB_PATH)
  ? new SQL.Database(fs.readFileSync(DB_PATH))
  : new SQL.Database();

let inTransaction = false;

/**
 * Persist database state to smartprint.db file
 */
export const persistToDisk = () => {
  if (inTransaction) return;
  try {
    const data = rawDb.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  } catch (err) {
    console.error('Error saving SQLite database to disk:', err);
  }
};

/**
 * Database wrapper exposing better-sqlite3 compatible API
 */
export const db = {
  exec(sql) {
    rawDb.exec(sql);
    persistToDisk();
  },
  prepare(sql) {
    return {
      all(...params) {
        const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
        const stmt = rawDb.prepare(sql);
        if (flatParams.length > 0) stmt.bind(flatParams);
        const rows = [];
        while (stmt.step()) {
          rows.push(stmt.getAsObject());
        }
        stmt.free();
        return rows;
      },
      get(...params) {
        const rows = this.all(...params);
        return rows.length > 0 ? rows[0] : undefined;
      },
      run(...params) {
        const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
        rawDb.run(sql, flatParams);
        persistToDisk();
        return { changes: rawDb.getRowsModified() };
      }
    };
  },
  pragma(pragmaStr) {
    try {
      rawDb.exec(`PRAGMA ${pragmaStr}`);
    } catch (_) {}
  },
  transaction(fn) {
    return (...args) => {
      inTransaction = true;
      try {
        rawDb.exec('BEGIN TRANSACTION');
        const result = fn(...args);
        rawDb.exec('COMMIT');
        inTransaction = false;
        persistToDisk();
        return result;
      } catch (err) {
        try {
          rawDb.exec('ROLLBACK');
        } catch (_) {}
        inTransaction = false;
        throw err;
      }
    };
  }
};

// Enable foreign keys
db.pragma('foreign_keys = ON');

/**
 * Initialize database schema and seed initial mock data if empty
 */
export const initDatabase = () => {
  try {
    const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf-8');
    db.exec(schemaSql);

    // Check if students table is empty, seed initial data safely
    const studentCountStmt = db.prepare('SELECT COUNT(*) AS count FROM students');
    const { count } = studentCountStmt.get();

    if (count === 0) {
      console.log('🌱 Seeding initial sample data for development...');

      const insertStudent = db.prepare(
        'INSERT INTO students (id, name, email) VALUES (?, ?, ?)'
      );
      const insertJob = db.prepare(
        'INSERT INTO print_jobs (id, student_id, file_name, copies, print_type, page_range, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
      );
      const insertNotif = db.prepare(
        'INSERT INTO notifications (id, student_id, job_id, title, message, type, is_read) VALUES (?, ?, ?, ?, ?, ?, ?)'
      );

      const seedTransaction = db.transaction(() => {
        // Sample Students
        insertStudent.run('STD-2026-0842', 'Abhinaya N', 'abhinaya.n@college.edu');
        insertStudent.run('STD-2026-0120', 'Student 2', 'student2@college.edu');
        insertStudent.run('STD-2026-0492', 'Student 3', 'student3@college.edu');

        // Sample Print Jobs
        insertJob.run('PRT-1001', 'STD-2026-0842', 'AI_Immersion_Report.pdf', 2, 'Colour', 'All Pages', 'Printing');
        insertJob.run('PRT-1002', 'STD-2026-0120', 'Assignment.pdf', 1, 'B&W', 'All Pages', 'Processing');
        insertJob.run('PRT-1003', 'STD-2026-0492', 'Project_Report.pdf', 3, 'Colour', 'All Pages', 'Received');

        // Sample Notifications
        insertNotif.run('NOTIF-01', 'STD-2026-0842', 'PRT-1001', 'Print Job Printing', 'Your print job for "AI_Immersion_Report.pdf" is currently being printed.', 'info', 0);
        insertNotif.run('NOTIF-02', 'STD-2026-0842', 'PRT-1001', 'Print Request Received', 'Your print request for "AI_Immersion_Report.pdf" has been received successfully.', 'info', 1);
      });

      seedTransaction();
      console.log('✓ Initial seed completed successfully.');
    }
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
};

export default db;
