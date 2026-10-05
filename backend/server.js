/**
 * SmartPrint AI Backend Server (STEP 10)
 * Node.js & Express REST API powered by SQLite database.
 */

import express from 'express';
import cors from 'cors';
import { initDatabase } from './database/database.js';
import studentsRouter from './routes/students.js';
import printJobsRouter from './routes/printJobs.js';
import notificationsRouter from './routes/notifications.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize SQLite database tables and seed sample data
initDatabase();

// Middleware
app.use(express.json());

// CORS configuration (allow Vite frontend development server on port 5173 and 127.0.0.1)
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or server-to-server tests)
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, true); // Permissive for local development
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS']
}));

// API Health Check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'SmartPrint AI backend is running'
  });
});

// Mount Routes
app.use('/api/students', studentsRouter);
app.use('/api/print-jobs', printJobsRouter);
app.use('/api/notifications', notificationsRouter);

// 404 handler for unmatched API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.method} ${req.originalUrl} not found`
  });
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error occurred'
  });
});

// Start server if run directly
const isDirectRun = process.argv[1] && (process.argv[1].endsWith('server.js') || process.argv[1].endsWith('server'));
if (isDirectRun && process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 SmartPrint AI Backend running on http://localhost:${PORT}`);
    console.log(`   Health Check: http://localhost:${PORT}/api/health`);
    console.log(`====================================================`);
  });
}

export default app;
