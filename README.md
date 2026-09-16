# AI-Powered Smart Print Tracking System
> **AI Immersion College Project for Campus Xerox & Printing Shops**

An intelligent web application that streamlines college print shop operations. Students can upload print jobs, configure print parameters, receive instant cost computations, and track real-time queue status with secure 4-digit pickup PINs, while Xerox shop operators can manage hardware queues and advance print orders.

---

## 📁 Project Structure

```
smart-print-tracker/
├── index.html                  # HTML5 Entry Point with Google Fonts (Inter)
├── vite.config.js              # Vite + React build configuration
├── package.json                # Project dependencies and npm scripts
├── .gitignore                  # Git ignore rules
├── README.md                   # Project documentation & execution guide
└── src/
    ├── main.jsx                # Application React DOM bootstrap
    ├── App.jsx                 # Top-level page router & state coordinator
    ├── assets/                 # SVGs, icons, and visual assets
    │   └── logo.svg            # System logo
    ├── components/             # Reusable UI components
    │   ├── Button.jsx          # Configurable Button (primary, secondary, outline, danger)
    │   ├── Card.jsx            # Clean rounded Card container with header/footer
    │   ├── StatusBadge.jsx     # Muted status indicator (queued, printing, ready, completed)
    │   ├── Navbar.jsx          # Top navigation bar with shop status pill
    │   └── Sidebar.jsx         # Collapsible dashboard navigation
    ├── layouts/                # Structural layout wrappers
    │   └── MainLayout.jsx      # Unified layout with navbar, optional sidebar & footer
    ├── pages/                  # Application views
    │   ├── LandingPage.jsx     # Public overview, hero CTA & live queue preview
    │   ├── StudentDashboard.jsx# Student print submission, live tracker & PIN codes
    │   └── StaffDashboard.jsx  # Operator console, queue manager & hardware status
    ├── services/               # Data abstraction and business logic
    │   └── printService.js     # Mock CRUD service and print cost calculator
    ├── data/                   # Mock test data and fixtures
    │   └── mockData.js         # Realistic college print jobs, printers & pricing rules
    └── styles/                 # Modular CSS architecture
        ├── variables.css       # Design tokens (muted blue-grey palette, typography, shadows)
        ├── globals.css         # Resets, tables, forms, and layout grid helpers
        ├── components.css      # Component-level styles
        ├── pages.css           # Page-level layout styles
        └── index.css           # Global stylesheet aggregator
```

---

## 🎨 UI & Design Principles

- **Color Palette**: Muted blue-grey accents (`#334155`, `#475569`), crisp white cards (`#ffffff`), and soft off-white background (`#f8fafc`).
- **Typography**: Clean `Inter` font hierarchy with high contrast dark navy/charcoal text (`#0f172a`).
- **Status Tints**: Subtle, professional pastel badges for queue states without harsh or overwhelming colors.
- **Card Aesthetics**: Rounded corners (`12px`), micro-shadows (`0 1px 3px rgba(0,0,0,0.06)`), and clear visual division.
- **Responsiveness**: Fluid flexbox and grid layouts adaptable for mobile, tablet, and desktop viewports.

---

## 🚀 How to Run the Project Locally

### Prerequisites
Make sure [Node.js](https://nodejs.org/) (version 18 or higher) is installed on your computer.

### Step 1: Install Dependencies
Open a terminal in the project directory and run:
```bash
npm install
```

### Step 2: Start Development Server
```bash
npm run dev
```

### Step 3: Open in Browser
Open your browser and navigate to the local URL (usually [http://localhost:5173](http://localhost:5173)).

---

## ✅ What Has Been Completed (Step 1)

1. **Clean Frontend Architecture**: Created a complete, scalable folder structure (`components`, `pages`, `layouts`, `services`, `data`, `assets`, `styles`).
2. **Reusable UI Component Library**:
   - `Button`: Primary, secondary, outline, danger, ghost variants with sizes and icon support.
   - `Card`: Rounded container with title, subtitle, badges, action slots, and footer.
   - `StatusBadge`: Visual indicator supporting `queued`, `printing`, `ready`, `completed`, `cancelled`.
   - `Navbar`: Brand logo, navigation switches between views, and live counter status pill.
   - `Sidebar`: Role-aware workspace navigation for students and staff.
3. **Placeholder Pages**:
   - **Landing Page**: Project introduction, feature highlights, and live queue preview.
   - **Student Dashboard**: Submit print job modal with live price calculation, active orders table with secure pickup PINs, and print history.
   - **Staff Dashboard**: Real-time queue counters, printer hardware monitors, and status transition action buttons.
4. **Mock Data & Service Layer**:
   - `mockData.js`: Realistic college student and print job records.
   - `printService.js`: Abstracted asynchronous CRUD methods and exact print pricing calculator.
5. **Design System**: Full CSS token system adhering to clean, muted blue-grey aesthetics.

---

## 🔮 What Should Be Built Next (Phase 2 & Beyond)

1. **Authentication & Role-Based Access**:
   - College SSO / Student Email Login (Firebase Auth / Supabase Auth).
   - Dedicated protected routes for Students vs. Xerox Desk Staff.
2. **Real-time Backend & Database**:
   - Cloud Firestore / Supabase for live WebSockets status updates across student phones and operator screens.
3. **AI Document Analysis Engine**:
   - Automatic page count & ink density estimation from uploaded PDF files.
   - Smart duplex / color recommendation to save student costs.
   - OCR and automated title / summary detection.
4. **Payment Gateway Integration**:
   - UPI / QR Code / Student Campus Card wallet deduction.
5. **Automated Print Dispatch**:
   - Direct integration with local print spoolers (CUPS / Windows Print Management API) or QR code scanner at the physical Xerox kiosk.
