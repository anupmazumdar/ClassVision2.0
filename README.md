# ClassVision 2.0 — AI-Powered Smart Attendance & Classroom Security System

> **Built by:** Anup Mazumdar ([@anupmazumdar](https://github.com/anupmazumdar))  
> **Repository:** [https://github.com/anupmazumdar/ClassVision2.0](https://github.com/anupmazumdar/ClassVision2.0)  
> **Stack:** Python · FastAPI · React (Vite) · OpenCV · SQLite · TailwindCSS · SQLAlchemy · Cryptography (Fernet AES-128)  
> **Architecture:** 5-Layer Enterprise Pattern (View → Router → Service → Repository → Database)  
> **Status:** 🚀 Verified, Hardened & GDPR/Privacy-Compliant

---

## 🧠 What is ClassVision 2.0?

ClassVision 2.0 is a **high-security, bypass-resistant AI attendance system** engineered for modern educational institutions. Unlike legacy attendance systems that blindly trust client requests or fall prey to static photos and proxy sign-ins, ClassVision incorporates a multi-tier cryptographic and biometric defense pipeline.

### 🛡️ Core Security & Privacy Capabilities

1. **Atomic Facial Verification & HMAC Tickets**:
   - `POST /attendance/{session_id}/scan-and-mark` runs server-side recognition, liveness, geofencing, rolling code, and device binding in **one single atomic transaction**.
   - Standalone marking requires an **HMAC-SHA256 signed 15-second attendance ticket** issued exclusively by the server's face recognition engine — eliminating client-supplied `student_id` trust.
2. **Biometric Encryption at Rest (Fernet AES-128-CBC + HMAC)**:
   - Facial feature embeddings are transparently encrypted before being committed to the database disk storage via SQLAlchemy `TypeDecorator` (`EncryptedText`).
   - Prevents data leakage even in the event of physical SQLite file compromise.
3. **Mandatory Biometric Consent & Audit Timestamping**:
   - Strict GDPR / data privacy compliance: Face registration is rejected (`HTTP 400`) unless explicit student/guardian consent is provided.
   - Audits exact consent grant timestamp (`consent_at`) in the database.
4. **Multi-Frame Anti-Spoofing & Liveness Detection**:
   - 2-frame micro-movement burst analysis ($250\text{ms}$ delta) and Laplacian texture variance.
   - Rejects printed photos, phone screenshots, duplicate frame uploads, and out-of-focus spoofing.
5. **30-Second Rolling TOTP Session Code**:
   - Time-sliced 6-digit rolling code displayed with a live countdown timer on the teacher's screen.
   - Decoupled `SESSION_CODE_SECRET` with brute-force rate limiting (lockout on $\ge 5$ attempts).
6. **GPS Classroom Geofencing**:
   - Uses the **Haversine formula** to enforce student proximity within the classroom radius (default 100m).
   - Rejects remote check-in attempts outside the physical classroom perimeter.
7. **Deterministic Hardware Device Binding**:
   - Generates composite hardware + WebGL + canvas device fingerprints (`frontend/src/utils/device.js`).
   - Student accounts bind to their registered device on first check-in; unauthorized proxy attempts from foreign devices are rejected (`HTTP 403`).
8. **Strict Role-Based Access Control (RBAC)**:
   - `POST /students`, `POST /students/{id}/register-face`, `GET /reports/*`, `POST /reports/*/email` guarded by `require_teacher_or_admin` to prevent unauthorized face overwrites, data scraping, and SMTP relays.

---

## 🏗️ 5-Layer System Architecture

ClassVision strictly enforces unidirectional data flow: **View (UI) → Router (API) → Service (Business/AI) → Repository (SQL Queries) → Database**.

```
┌─────────────────────────────────────────────────────────────┐
│ 1. VIEW LAYER (frontend/src/)                               │
│    • Pages: Dashboard, Session, Students, Reports, Login     │
│    • Custom Hooks: useAuth, useStudents                     │
│    • Unified API Client: api/client.js (device + consent)   │
│    • Deterministic Hardware Fingerprinting: utils/device.js │
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
│    • auth_service & student_service (consent enforcement)   │
├─────────────────────────────────────────────────────────────┤
│ 4. REPOSITORY LAYER (backend/repositories/)                 │
│    • student_repo, session_repo, attendance_repo, user_repo │
│    • Pure SQLAlchemy database operations (no business logic)│
├─────────────────────────────────────────────────────────────┤
│ 5. DATABASE & MODELS (backend/models/)                      │
│    • Student (with device_id, EncryptedText face encodings) │
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
│   ├── test_priority1.py              # Security, anti-spoof & rate-limiting test suite
│   ├── test_priority2.py              # Biometric encryption at rest & consent test suite
│   ├── utils/
│   │   └── crypto.py                  # Fernet AES-128 SQLAlchemy EncryptedText
│   ├── models/                        # DB Table Schemas
│   │   ├── student.py                 # Student model (EncryptedText, consent fields)
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
│   │   ├── student_service.py         # Consent validation & student management
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
│   │   │   └── client.js              # Unified API client with device binding & consent
│   │   ├── hooks/
│   │   │   ├── useAuth.js             # Authentication hook
│   │   │   └── useStudents.js         # Student management hook
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx          # Live teacher dashboard & session creator
│   │   │   ├── Session.jsx            # Live camera scan, rolling code & present list
│   │   │   ├── Students.jsx           # Student directory, encrypted face & consent badges
│   │   │   ├── RegisterStudent.jsx    # Webcam enrollment with biometric consent checkbox
│   │   │   ├── Reports.jsx            # PDF / Excel exports & email reports
│   │   │   ├── Users.jsx              # Admin user management
│   │   │   └── Login.jsx              # Secured JWT authentication
│   │   ├── components/
│   │   │   ├── Camera.jsx             # Video stream & burst capture
│   │   │   └── Navbar.jsx
│   │   └── utils/
│   │       └── device.js              # Deterministic hardware + canvas fingerprinting
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
3. Run the automated test suites:
   ```bash
   # Priority 1: Security, Anti-Spoof, Rate Limiting & RBAC
   python test_priority1.py

   # Priority 2: Biometric Encryption at Rest & Consent
   python test_priority2.py
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

*(In production environments, set `JWT_SECRET`, `SESSION_CODE_SECRET`, `ATTENDANCE_TICKET_SECRET`, and `FACE_ENCRYPTION_KEY` in your `.env` file.)*

---

## 🧪 Comprehensive Automated Test Suites

Run both test suites to verify system integrity:

```bash
cd backend
python test_priority1.py
python test_priority2.py
```

### Verified Priority 1 Capabilities:
- ✅ **Secret Decoupling**: Independent cryptographic keys for JWT, session code, and attendance tickets.
- ✅ **Liveness Detection**: Multi-frame micro-movement analysis rejecting static photos ($\Delta = 0.0$).
- ✅ **Atomic Server Verification**: Single-request liveness + face recognition + geofence + rolling code + device check.
- ✅ **Cryptographic Tickets**: 15s HMAC-SHA256 tokens preventing client-spoofed `student_id` marking.
- ✅ **Classroom Geofencing**: Haversine formula rejecting out-of-bounds check-ins (1.4km away).
- ✅ **30s Rolling Code Rate Limiting**: 5-attempt lockout preventing brute-force code guessing (`HTTP 429`).
- ✅ **Deterministic Device Binding**: Prevents proxy check-in across browser sessions / clear storage.
- ✅ **Report Access Control**: Student accounts blocked from full-class reports and SMTP relaying (`HTTP 403`).

### Verified Priority 2 Capabilities:
- ✅ **Encryption at Rest**: Raw SQLite database inspection verifies `face_encodings` stored as AES-128 Fernet ciphertext (`gAAAAA...`).
- ✅ **Transparent Decryption**: SQLAlchemy ORM transparently yields original float embedding arrays on read.
- ✅ **Consent Enforcement**: Face registration rejected with `HTTP 400` without explicit consent flag.
- ✅ **Audit Trail**: Exact UTC consent timestamp recorded in database and exposed in student listings.

---

## 📄 License & Attribution

MIT License — free to use, modify, and distribute with attribution.  
Built with ❤️ by [Anup Mazumdar](https://github.com/anupmazumdar).
