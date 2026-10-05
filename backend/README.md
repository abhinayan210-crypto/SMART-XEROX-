# SmartPrint AI Backend API & SQLite Database

Node.js + Express REST API backend and SQLite database foundation for SmartPrint AI.

---

## 1. Quick Start

### Installation
From the project root:
```bash
cd backend
npm install
```

### Running the Server
```bash
# Start backend on http://localhost:5000
npm start

# Or directly with Node:
node server.js
```

---

## 2. Server Configuration

- **Port**: `5000` (configurable via `process.env.PORT`)
- **Base URL**: `http://localhost:5000/api`
- **CORS**: Configured for Vite frontend at `http://localhost:5173`
- **Database File**: `backend/database/smartprint.db` (initialized automatically from `schema.sql`)

---

## 3. API Endpoints

### 🩺 Health Check
| Method | Endpoint | Description | Response |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Service status check | `{ success: true, message: "SmartPrint AI backend is running" }` |

### 🎓 Students API
| Method | Endpoint | Description | Body / Params |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/students` | Get all registered students | None |
| `GET` | `/api/students/:id` | Get student by ID | `id` parameter |
| `POST` | `/api/students` | Register a new student | `{ id?, name, email }` |
| `GET` | `/api/students/:studentId/print-jobs` | Get print jobs for student | `studentId` parameter |
| `GET` | `/api/students/:studentId/notifications` | Get notifications for student | `studentId` parameter |
| `PATCH` | `/api/students/:studentId/notifications/read-all` | Mark all notifications as read | `studentId` parameter |
| `DELETE` | `/api/students/:studentId/notifications` | Clear all notifications for student | `studentId` parameter |

### 🖨️ Print Jobs API
| Method | Endpoint | Description | Body / Params |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/print-jobs` | Get all queue and historical print jobs | None |
| `GET` | `/api/print-jobs/:id` | Get single print job by ID | `id` parameter |
| `POST` | `/api/print-jobs` | Submit new print job (Auto creates `Received` notif) | `{ student_id, file_name, copies, print_type, page_range }` |
| `PATCH` | `/api/print-jobs/:id/status` | Advance status with validation and auto notif | `{ status: "Processing" \| "Printing" \| "Ready" \| "Collected" }` |

### 🔔 Notifications API
| Method | Endpoint | Description | Body / Params |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/notifications` | Create notification manually | `{ student_id, job_id, title, message, type }` |
| `PATCH` | `/api/notifications/:id/read` | Mark single notification as read | `id` parameter |

---

## 4. Status Transition Lifecycle

```
[Received] ──> [Processing] ──> [Printing] ──> [Ready] ──> [Collected]
```

- Each valid transition automatically creates a contextual notification for the target student.
- Duplicate prevention guarantees that repeated status transitions or refreshes do not produce duplicate alerts.
