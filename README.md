# ClassVision 2.0 — AI-Powered Smart Attendance & Classroom Security System

> **Built by:** Anup Mazumdar ([@anupmazumdar](https://github.com/anupmazumdar))  
> **Repository:** [https://github.com/anupmazumdar/ClassVision2.0](https://github.com/anupmazumdar/ClassVision2.0)  
> **Stack:** Python · FastAPI · React (Vite) · OpenCV · SQLite · TailwindCSS · SQLAlchemy · Cryptography  
> **Architecture:** 5-Layer Enterprise Pattern (View → Router → Service → Repository → Database)  
> **Status:** 🚀 Verified & Production-Ready

---

## 🧠 What is ClassVision 2.0?

ClassVision 2.0 is a **high-security, bypass-resistant AI attendance system** engineered for modern colleges and universities. Unlike legacy attendance systems that blindly trust client requests or fall prey to static photos, ClassVision incorporates a multi-layer biometric and cryptographic defense pipeline.

### 🛡️ Core Security & Attendance Features

1. **Atomic Facial Verification & HMAC Tickets**:
   - `POST /attendance/{session_id}/scan-and-mark` runs server-side recognition, liveness, geofencing, rolling code, and device binding in **one single atomic transaction**.
   - Standalone marking requires an **HMAC-SHA256 signed 15-second attendance ticket** issued exclusively by the server's face recognition engine — eliminating client-supplied `student_id` trust.
2. **Multi-Frame Anti-Spoofing & Liveness Detection**:
   - 2-frame micro-movement burst analysis ($250\text{ms}$ delta) and Laplacian texture variance.
   - Rejects printed photos, phone screenshots, duplicate frame uploads, and out-of-focus spoofing.
3. **30-Second Rolling TOTP Session Code**:
   - Time-sliced 6-digit rolling code displayed with a live countdown timer on the teacher's screen.
   - Decoupled `SESSION_CODE_SECRET` prevents offline code forging.
4. **GPS Classroom Geofencing**:
   - Uses the **Haversine formula** to enforce student proximity within the classroom radius (default 100m).
   - Rejects remote check-in attempts outside the physical classroom perimeter.
5. **Persistent Device Binding**:
   - Generates composite hardware + canvas + storage device fingerprints (`frontend/src/utils/device.js`).
   - Student accounts bind to their registered device on first check-in; unauthorized proxy attempts from other devices are rejected (`HTTP 403`).
6. **Strict Role-Based Access Control (RBAC)**:
   - `POST /students` & `POST /students/{id}/register-face` guarded by `require_teacher_or_admin` to prevent unauthorized face overwrites / identity hijacking.
   - `GET /sessions/{id}/code` restricted to teachers and administrators.
7. **Brute-Force Rate Limiting & Secret Decoupling**:
   - Sliding-window rate limiters on `/auth/login` (lockout after failed attempts) and session code guessing.
   - Independent cryptographic keys: `JWT_SECRET`, `SESSION_CODE_SECRET`, and `ATTENDANCE_TICKET_SECRET`.

---

## 🏗️ 5-Layer System Architecture

ClassVision strictly enforces unidirectional data flow: **View (UI) → Router (API) → Service (Business/AI) → Repository (SQL Queries) → Database**.

```
┌─────────────────────────────────────────────────────────────┐
│ 1. VIEW LAYER (frontend/src/)                               │
│    • Pages: Dashboard, Session, Students, Reports, Login     │
│    • Custom Hooks: useAuth, useStudents                     │
│    • Unified API Client: api/client.js                       │
│    • Hardware Device Fingerprinting: utils/device.js        │
├─────────────────────────────────────────────────────────────┤
│ 2. API / ROUTER LAYER (backend/routers/)                    │
│    • auth_router, student_router, session_router            │
│    • attendance_router, report_router, user_router          │
│    • Input validation via Pydantic Schemas                  │
├─────────────────────────────────────────────────────────────┤
│ 3. SERVICE LAYER (backend/services/)                        │
│    • attendance_service (atomic scan-and-mark, HMAC tickets)│
│    • face_service (OpenCV Haar/HOG recognition + liveness)  │
│    • session_service (TOTP rolling codes + Haversine GPS)   │
│    • report_service (PDF & Excel generation)                │
│    • auth_service & student_service                         │
├─────────────────────────────────────────────────────────────┤
│ 4. REPOSITORY LAYER (backend/repositories/)                 │
│    • student_repo, session_repo, attendance_repo, user_repo │
│    • Pure SQLAlchemy database operations (no business logic)│
├─────────────────────────────────────────────────────────────┤
│ 5. DATABASE & MODELS (backend/models/)                      │
│    • Student (with device_id, encodings)                    │
│    • ClassSession (with GPS coordinates, TOTP flags)        │
│    • AttendanceRecord & User tables (SQLite / PostgreSQL)   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗂️ Project Directory Structure

```
ClassVision/
├── backend/
│   ├── config.py                      # Decoupled secrets & security validation
│   ├── database.py                    # SQLite engine, session, & auto-migration
│   ├── main.py                        # FastAPI entry point & router registration
│   ├── test_priority1.py              # Automated security & anti-spoof test suite
│   ├── models/                        # DB Table Schemas
│   │   ├── student.py                 # Student model (with device_id)
│   │   ├── session.py                 # ClassSession model (with GPS & TOTP flags)
│   │   ├── attendance.py              # AttendanceRecord model
│   │   └── user.py                    # User model (roles: superadmin/admin/teacher)
│   ├── repositories/                  # Raw SQL operations
│   │   ├── student_repo.py
│   │   ├── session_repo.py
│   │   ├── attendance_repo.py
│   │   └── user_repo.py
│   ├── services/                      # Business rules & AI logic
│   │   ├── attendance_service.py      # Atomic scan-and-mark & HMAC ticket verification
│   │   ├── face_service.py            # Face recognition & burst liveness analysis
│   │   ├── session_service.py         # 30s rolling code generation & validation
│   │   ├── student_service.py
│   │   ├── auth_service.py
│   │   └── report_service.py
│   ├── routers/                       # HTTP API routes
│   │   ├── attendance_router.py
│   │   ├── session_router.py
│   │   ├── student_router.py
│   │   ├── auth_router.py
│   │   ├── report_router.py
│   │   └── user_router.py
│   ├── schemas/                       # Pydantic validation schemas
│   └── middleware/
│       └── jwt_middleware.py          # JWT, RBAC guards & brute-force rate limiters
│
├── frontend/                          # React + Vite + TailwindCSS
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js              # Unified API client with device binding
│   │   ├── hooks/
│   │   │   ├── useAuth.js             # Authentication hook
│   │   │   └── useStudents.js         # Student management hook
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx          # Live teacher dashboard & session creator
│   │   │   ├── Session.jsx            # Live camera scan, rolling code & present list
│   │   │   ├── Students.jsx           # Student directory & face status
│   │   │   ├── RegisterStudent.jsx    # Webcam enrollment & face training
│   │   │   ├── Reports.jsx            # PDF / Excel exports & email reports
│   │   │   ├── Users.jsx              # Admin user management
│   │   │   └── Login.jsx              # Secured JWT authentication
│   │   ├── components/
│   │   │   ├── Camera.jsx             # Video stream & burst capture
│   │   │   └── Navbar.jsx
│   │   └── utils/
│   │       └── device.js              # Hardware + canvas fingerprinting
│   ├── package.json
│   └── vite.config.js
│
├── legacy/                            # Archived v1 Tkinter desktop client
│   └── client/
└── README.md
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Python 3.9+** (Tested on Python 3.10, 3.11, 3.14)
- **Node.js 18+** & **npm**

---

### Step 1 — Backend Setup & Run

1. Navigate to `backend/`:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the automated security verification suite:
   ```bash
   python test_priority1.py
   ```
4. Start the FastAPI server:
   ```bash
   python main.py
   ```
   *API will run at `http://localhost:8000` (Swagger UI at `http://localhost:8000/docs`)*.

---

### Step 2 — Frontend Web Dashboard Setup

1. Open a new terminal and navigate to `frontend/`:
   ```bash
   cd frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *Web application opens at `http://localhost:5173`*.

---

## 🔑 Default Credentials

- **Email:** `admin@classvision.local`
- **Password:** `admin123`
- **Role:** `admin`

*(In production environments, set `JWT_SECRET`, `SESSION_CODE_SECRET`, and `ATTENDANCE_TICKET_SECRET` in your `.env` file.)*

---

## 🧪 Security Test Suite

Run the full automated test suite verifying all security layers:
```bash
cd backend
python test_priority1.py
```

### Verified Test Cases:
- ✅ **Secret Decoupling**: Verifies `SESSION_CODE_SECRET != JWT_SECRET != ATTENDANCE_TICKET_SECRET`.
- ✅ **Liveness Detection**: Rejects empty frames and static photo duplicate frames ($\Delta = 0.0$); passes natural micro-movements.
- ✅ **Direct Spoof Rejection**: Rejects direct curl/Postman requests without valid HMAC tickets (`HTTP 403`).
- ✅ **Cryptographic Tickets**: Validates 15-second expiration and signature authenticity.
- ✅ **Geofencing Proximity**: Passes within 19m; rejects out-of-bounds check-ins (1.4km away) with `HTTP 403`.
- ✅ **30s Rolling TOTP Code**: Validates active rolling code against session secret.
- ✅ **Device Binding**: Enforces 1 student = 1 bound device; blocks proxy check-ins from foreign devices.
- ✅ **Role-Based Overrides**: Allows authenticated teachers to execute manual attendance marking.

---

## 📄 License & Attribution

MIT License — free to use, modify, and distribute with attribution.  
Built with ❤️ by [Anup Mazumdar](https://github.com/anupmazumdar).
