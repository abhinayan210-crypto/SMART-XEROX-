# SmartPrint AI – AI-Powered Smart Print Tracking System
> **AI Immersion College Project for Campus Xerox & Printing Centers**

[![Production Build](https://img.shields.io/badge/Production%20Build-Passing-brightgreen)](https://github.com/abhinayan210-crypto/SMART-XEROX)
[![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61dafb)](https://vitejs.dev/)
[![Backend](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-339933)](https://nodejs.org/)
[![Database](https://img.shields.io/badge/Database-SQLite%20(sql.js)-003b57)](https://sqlite.org/)
[![Auth](https://img.shields.io/badge/Auth-JWT%20%2B%20bcrypt-ff69b4)](https://jwt.io/)

**SmartPrint AI** is an end-to-end intelligent print-job orchestration and queue tracking platform designed to eliminate counter congestion at campus Xerox shops. It bridges students and print shop operators through real-time pipeline visibility, predictive turnaround estimation, automated queue workload analysis, and natural-language AI assistance.

---

## 📌 Problem Statement

Traditional college printing centers suffer from chronic operational bottlenecks:
1. **Zero Visibility ("Where is my print?"):** Students hand over USB drives or emails without knowing when their job enters production.
2. **Uncertain Turnaround Times:** Students crowd counter areas waiting indefinitely for multi-copy or spiral-bound documents.
3. **Repeated Operator Inquiries:** Constant manual status checks disrupt printing staff, slowing down overall shop throughput.
4. **Counter Congestion & Collection Errors:** Misplaced documents and chaotic pickup queues lead to misplaced prints.

---

## 💡 Solution

SmartPrint AI replaces physical waiting with digital transparency:
- **Digital Job Dispatch:** Students upload documents and customize page ranges, color modes, duplex settings, and binding.
- **Predictive Turnaround:** Machine-assisted waiting-time estimations compute dynamic turnaround based on active shop throughput.
- **AI-Assisted Queue Analysis:** Operators receive live congestion metrics and advisory attention flags for long-waiting batches.
- **Student AI Assistant:** 24/7 natural-language assistant answers student queries on status, queue depth, wait times, and pickup PINs.
- **Secure PIN Collection:** 4-digit pickup verification ensures documents are collected by the rightful owner.

---

## ✨ Key Features

| Category | Highlights |
| :--- | :--- |
| **Live Pipeline Tracking** | 5-stage progression: `Received → Processing → Printing → Ready → Collected` with real-time UI synchronization. |
| **Role-Based Dashboards** | Dedicated student submission portal and staff operator command center. |
| **Real-Time Notifications** | Automatic alerts triggered on every status advancement with instant pickup banners on `Ready`. |
| **Secure Authentication** | JWT-based auth, bcrypt password hashing, and strict database ownership isolation. |
| **Transparent Cost Calculator** | Instant calculation based on sheet count, simplex/duplex, color mode, and finishing options. |
| **Clean Aesthetic Design** | Built with modern dark navy / blue-grey styling, responsive layout grids, and full keyboard accessibility. |

---

## 🤖 AI Features

1. **Waiting Time Prediction (`waitingTimeService.js`):**
   - Calculates turnaround estimates based on active queue position, page volume, copy multipliers, and printer throughput.
   - Automatically recalculates on job submission, status changes, and order pickups.
2. **AI-Assisted Queue Analysis (`queueAnalysisService.js`):**
   - Classifies print center traffic into `Low`, `Moderate`, or `High` workload.
   - Generates contextual natural-language summaries (e.g., *"Queue workload is currently moderate. Several jobs are waiting, so students may experience a short delay."*).
3. **Smart Job Prioritization (`queueAnalysisService.js`):**
   - Evaluates queue depth and copy volume to generate advisory attention tiers (`High`, `Medium`, `Normal`) for staff decision support.
4. **Student AI Assistant (`aiAssistantService.js`):**
   - Answers natural language questions (`"Where is my print?"`, `"Is my print ready?"`, `"Queue position?"`, `"Estimated wait?"`).
   - Scoped strictly to the authenticated student's documents.

---

## 🛠️ Technology Stack

- **Frontend:** React 18, Vite 5, Vanilla CSS Design System (CSS custom properties, flexbox/grid)
- **Backend:** Node.js (v18+), Express 4, CORS, JSON Web Tokens (`jsonwebtoken`), Password Hashing (`bcryptjs`)
- **Database:** SQLite (sql.js WASM engine) with persistent disk storage (`smartprint.db`)
- **Testing:** Native Node.js test runners & assertion suites

---

## 🔄 System Workflow

```
[Student Uploads PDF/DOCX]
           │
           ▼
[SQLite DB: Job Created (Status: Received) + 4-Digit PIN Generated]
           │
           ▼
[Staff Dashboard Queue Updates + Turnaround Time Recalculated]
           │
           ├─► Staff clicks "Process"   ──► Status: Processing
           ├─► Staff clicks "Print"     ──► Status: Printing
           └─► Staff clicks "Ready"     ──► Status: Ready
                                                  │
                                                  ▼
                        [Student Receives "Print Ready" Alert Banner]
                                                  │
                                                  ▼
                        [Student Verifies PIN at Counter 1]
                                                  │
                                                  ▼
                        [Staff Marks "Collected" -> Order Fulfilled]
```

---

## 👥 User Roles & Features

### 🎓 Student Features
- **Document Submission Form:** File upload with custom page ranges, paper sizes (A4/A3), color modes (B&W/Color), and binding.
- **Live Active Job Tracker:** Visual multi-step progress bar, queue position pill, and estimated turnaround badge.
- **My Print Jobs Table:** Complete historical record of past and active submissions.
- **AI Assistant Chat:** Interactive assistant with quick-query chips and real-time response generation.
- **Ready for Collection Alert:** Highlighted pickup banner with 4-digit PIN verification.

### 🖨️ Staff Operator Features
- **Central Print Queue:** Live queue filterable by status (`Received`, `Processing`, `Printing`, `Ready`) and searchable by Student/PIN.
- **One-Click Progression:** Instant status triggers (`▶ Process`, `🖨️ Print`, `✓ Ready`, `📦 Complete`).
- **AI Queue Insights Card:** Live workload level, active jobs count, total copies, average turnaround, and dynamic natural language insights.
- **Smart Job Priority:** Advisory attention ranking with clear justifications for operator decision support.
- **Hardware Workstation Monitor:** Real-time printer status (Paper levels, Spooling state).

---

## 🚀 Running the Project Locally

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18.0.0 or higher)
- npm (version 9.0.0 or higher)

### 1. Clone the Repository
```bash
git clone https://github.com/abhinayan210-crypto/SMART-XEROX.git
cd SMART-XEROX
```

### 2. Run the Backend Server
Open a terminal and execute:
```bash
# Navigate to backend directory and install dependencies (if first time)
cd backend
npm install

# Start Express & SQLite server on port 5000
npm start
```
*Backend will be running at `http://localhost:5000` with health check at `http://localhost:5000/api/health`.*

### 3. Run the Frontend Client
In a second terminal from the project root:
```bash
# Install root dependencies (if first time)
npm install

# Start Vite development server
npm run dev
```
*Open your browser and navigate to `http://localhost:5173`.*

---

## 🔐 Demo Accounts (Development & Evaluation)

> **Note:** These credentials are provided exclusively for local demonstration and evaluation.

| Role | Email | Password | Student / Staff ID |
| :--- | :--- | :--- | :--- |
| **Student** | `student@smartprint.com` | `Student@123` | `STD-2026-0842` |
| **Staff Operator** | `staff@smartprint.com` | `Staff@123` | `STF-2026-0001` |

---

## 📁 Project Structure

```
SMART-XEROX/
├── backend/
│   ├── database/
│   │   ├── database.js          # SQLite connection and disk persistence
│   │   ├── schema.sql           # Tables (users, students, print_jobs, notifications)
│   │   └── smartprint.db        # SQLite database file
│   ├── middleware/
│   │   └── auth.js              # JWT validation & role authorization
│   ├── routes/
│   │   ├── auth.js              # /api/auth (login, register, me, logout)
│   │   ├── students.js          # /api/students
│   │   ├── printJobs.js         # /api/print-jobs
│   │   └── notifications.js     # /api/notifications
│   ├── package.json             # Backend dependencies
│   ├── server.js                # Express app entry point
│   └── test.js                  # Backend API & Auth unit tests
├── src/
│   ├── components/              # Button, Card, Navbar, Sidebar, StatusBadge
│   ├── context/
│   │   └── AuthContext.jsx      # React auth context & useAuth hook
│   ├── data/
│   │   └── mockData.js          # Seed fixtures & pricing rules
│   ├── pages/
│   │   ├── LandingPage.jsx      # Public presentation & features
│   │   ├── LoginPage.jsx        # Role-based login & demo switcher
│   │   ├── StudentDashboard.jsx # Student portal & AI Assistant
│   │   └── StaffDashboard.jsx   # Operator command desk & AI Queue Insights
│   ├── services/
│   │   ├── aiAssistantService.js    # Intent detection & response engine
│   │   ├── apiService.js            # Central API client with JWT injection
│   │   ├── authService.js           # Client authentication & session storage
│   │   ├── notificationService.js   # Notification dispatch & read tracker
│   │   ├── printService.js          # Shared print operations coordinator
│   │   ├── queueAnalysisService.js  # Workload analysis & prioritization
│   │   └── waitingTimeService.js    # Turnaround time calculations
│   ├── styles/
│   │   ├── globals.css          # Base resets & table styles
│   │   ├── pages.css            # Responsive dashboard layouts
│   │   └── variables.css        # CSS color tokens & design variables
│   ├── App.jsx                  # Protected router & access guard
│   └── main.jsx                 # Vite React DOM bootstrap
├── dist/                        # Production build output
├── package.json                 # Frontend dependencies & npm scripts
├── vite.config.js               # Vite bundler configuration
└── README.md                    # Project documentation
```

---

## 🧪 Testing & Verification

Run the comprehensive test suites directly from the terminal:

```bash
# 1. Backend REST API & Authentication Test Suite (14 Tests)
node backend/test.js

# 2. Frontend Waiting Time Service Unit Tests (5 Tests)
node src/services/waitingTimeService.test.js

# 3. Queue Analysis & Prioritization Unit Tests (6 Tests)
node src/services/queueAnalysisService.test.js

# 4. AI Assistant Service Unit Tests (13 Tests)
node src/services/aiAssistantService.test.js

# 5. Notification Service Unit Tests (8 Tests)
node src/services/notificationService.test.js

# 6. Full End-to-End & Cross-Role Integration Suite (7 Sections)
node src/services/apiIntegration.test.js

# 7. Production Build Validation
npm run build
```

---

## 🚢 Deployment Preparation

- **Frontend:** Compatible with [Vercel](https://vercel.com), [Netlify](https://netlify.com), or [Cloudflare Pages]. Set `VITE_API_URL` to point to the production backend API URL.
- **Backend:** Compatible with [Render](https://render.com), [Railway](https://railway.app), or any Node.js VPS. Set `PORT`, `JWT_SECRET`, and `CLIENT_URL` environment variables.
- **Database:** Uses SQLite (`smartprint.db`). For containerized environments (Render/Railway), attach a persistent volume or migrate to PostgreSQL for distributed multi-instance clustering.

---

## 🔮 Future Enhancements

- **Payment Gateway Integration:** Direct UPI / campus smart-card payment gateway before job release.
- **Hardware Telemetry Integration:** Direct integration with printer SNMP protocols for live page counter tracking.
- **Cloud LLM Provider Integration:** Seamless plug-in interface for OpenAI / Gemini API in `aiAssistantService.js`.

---

## 🌐 GitHub Repository

- **Repository:** [https://github.com/abhinayan210-crypto/SMART-XEROX.git](https://github.com/abhinayan210-crypto/SMART-XEROX.git)
