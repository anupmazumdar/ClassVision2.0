# ClassVision — AI-Powered Smart Attendance & Classroom Analytics System

> **Built by:** Anup Mazumdar ([@anupmazumdar](https://github.com/anupmazumdar))
> **Stack:** Python · FastAPI · React · React Native · DeepFace · MediaPipe · face_recognition · Supabase · SQLite
> **Status:** 🚧 Active Development

---

## 🧠 What is ClassVision?

ClassVision is a **college-grade AI attendance and classroom analytics system** that goes far beyond just marking who's present. It uses deep learning to:

- ✅ **Mark attendance automatically** via face recognition (dlib ResNet — 99%+ accuracy)
- 😊 **Detect student emotions** in real-time (happy, sad, angry, neutral, surprise)
- 👁️ **Track attention/awareness** — is the student looking at the board or distracted?
- 📊 **Generate live dashboard** for teachers to see class mood and engagement
- 📄 **Auto-export reports** as PDF and Excel after every session
- 🔐 **Biometric-secured** — JWT auth, AES-256 encryption, role-based access
- 🌐 **Dual network** — works on college LAN (offline-first) + syncs to cloud (Supabase)
- 📱 **Cross-platform** — Desktop app + Web dashboard + Mobile (PWA/React Native)

---

## 🗂️ Project File Structure

```
ClassVision/
│
├── 📁 server/                          # FastAPI backend
│   ├── main.py                         # App entry point, CORS, routes
│   ├── auth.py                         # JWT token gen/verify, bcrypt hashing
│   ├── models.py                       # SQLAlchemy DB models
│   ├── database.py                     # SQLite connection (LAN primary)
│   ├── sync.py                         # Supabase cloud sync (every 30s)
│   ├── config.py                       # ENV vars, constants
│   │
│   ├── 📁 services/
│   │   ├── attendance_service.py       # face_recognition + LBPH fallback
│   │   ├── emotion_service.py          # DeepFace FER model
│   │   ├── attention_service.py        # MediaPipe face mesh + head pose
│   │   └── report_service.py          # PDF (reportlab) + Excel (openpyxl)
│   │
│   ├── 📁 routers/
│   │   ├── auth_router.py              # /auth/login, /auth/register
│   │   ├── attendance_router.py        # /attendance/* CRUD
│   │   ├── session_router.py           # /session/start, /session/stop
│   │   ├── analytics_router.py         # /analytics/emotion, /analytics/attention
│   │   ├── report_router.py            # /report/pdf, /report/excel
│   │   └── admin_router.py             # /admin/users, /admin/departments
│   │
│   └── 📁 middleware/
│       ├── jwt_middleware.py            # Token validation on every request
│       ├── role_middleware.py           # admin / teacher / student check
│       └── audit_middleware.py          # Log every action (immutable)
│
├── 📁 client/                          # Desktop app (Python + Tkinter)
│   ├── attendance.py                   # Main window — entry point
│   ├── automaticAttedance.py           # face_recognition attendance taker
│   ├── takeImage.py                    # Webcam capture (50 images/student)
│   ├── trainImage.py                   # Train deep learning model (pickle)
│   ├── show_attendance.py              # View & calculate attendance %
│   ├── takemanually.py                 # Manual attendance fallback
│   ├── reset_data.py                   # Clear all training data
│   └── test.py                         # IP camera test (DroidCam support)
│
├── 📁 web/                             # React web dashboard
│   ├── 📁 src/
│   │   ├── 📁 pages/
│   │   │   ├── Login.jsx               # JWT login page
│   │   │   ├── Dashboard.jsx           # Teacher live dashboard
│   │   │   ├── AdminPanel.jsx          # Admin controls
│   │   │   ├── StudentView.jsx         # Student's own attendance
│   │   │   └── Reports.jsx             # Download PDF/Excel
│   │   │
│   │   ├── 📁 components/
│   │   │   ├── EmotionChart.jsx        # Recharts — live emotion pie
│   │   │   ├── AttentionMeter.jsx      # Gauge — class attention %
│   │   │   ├── AttendanceTable.jsx     # Real-time present/absent list
│   │   │   ├── AlertBanner.jsx         # Low attention warning
│   │   │   └── SessionControls.jsx     # Start/Stop session buttons
│   │   │
│   │   ├── 📁 hooks/
│   │   │   ├── useWebSocket.js         # Real-time updates from server
│   │   │   └── useAuth.js              # JWT token management
│   │   │
│   │   └── 📁 api/
│   │       └── client.js               # Axios base config + interceptors
│   │
│   ├── package.json
│   └── tailwind.config.js
│
├── 📁 mobile/                          # React Native / PWA
│   ├── App.jsx                         # Entry point
│   ├── 📁 screens/
│   │   ├── HomeScreen.jsx
│   │   ├── MyAttendance.jsx            # Student view
│   │   └── TeacherDashboard.jsx
│   └── package.json
│
├── 📁 database/
│   ├── local.db                        # SQLite — LAN primary
│   ├── schema.sql                      # DB init script
│   └── migrations/                     # Version-controlled schema changes
│
├── 📁 ml_models/
│   ├── TrainingImageLabel/
│   │   └── Trainner_encodings.pkl      # Saved face embeddings (pickle)
│   ├── TrainingImage/                  # Raw webcam images per student
│   ├── haarcascade_frontalface_default.xml
│   └── haarcascade_frontalface_alt.xml
│
├── 📁 StudentDetails/
│   └── studentdetails.csv              # Enrollment No, Name
│
├── 📁 Attendance/                      # Per-subject attendance CSVs
│   └── {SubjectName}/
│       └── {Subject}_{date}_{time}.csv
│
├── 📁 Reports/                         # Auto-generated PDF + Excel
│   ├── pdf/
│   └── excel/
│
├── 📁 UI_Image/                        # Tkinter UI assets
│
├── .env                                # Environment variables (never commit)
├── .env.example                        # Template for .env
├── requirements.txt                    # Python dependencies
├── docker-compose.yml                  # Optional: run server in container
└── README.md                           # This file
```

---

## 🤖 AI/ML Stack — How It Works

### 1. Face Recognition (Attendance)
- **Model:** dlib ResNet-34 via `face_recognition` library
- **Method:** 128-dimensional face embeddings stored as `.pkl`
- **Accuracy:** ~99.38% (vs LBPH ~70-80%)
- **Fallback:** OpenCV LBPH if `face_recognition` unavailable
- **Threshold:** `TOLERANCE = 0.5` (adjustable — lower = stricter)
- **Speed trick:** Frame resized to 1/4 for detection, then scaled back up

### 2. Emotion Detection
- **Model:** DeepFace with FER+ backend (pre-trained, no extra setup)
- **Labels:** `happy` | `sad` | `angry` | `neutral` | `surprise` | `fear` | `disgust`
- **Usage:** Run every 5th frame (not every frame — performance)
- **Output:** Per-student emotion + class-wide emotion distribution

### 3. Attention / Awareness Tracking
- **Library:** MediaPipe Face Mesh (468 facial landmarks)
- **Method:** Head pose estimation → yaw/pitch angles
  - `|yaw| > 30°` → looking away (LEFT/RIGHT)
  - `pitch < -15°` → looking down (PHONE/SLEEPING)
  - Otherwise → ATTENTIVE
- **Output:** Attention % per student, class average, low-attention alerts

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                          │
│  Desktop App    Web Dashboard    Mobile      Admin UI    │
│  (Tkinter)      (React)          (RN/PWA)    (React)    │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS / WebSocket
┌────────────────────────▼────────────────────────────────┐
│              FastAPI GATEWAY                             │
│     JWT Auth · Role Check · Rate Limiting                │
└──────────┬───────────┬──────────────┬───────────────────┘
           │           │              │
    ┌──────▼──┐  ┌─────▼────┐  ┌─────▼──────┐
    │Attendance│  │ Emotion  │  │ Attention  │
    │ Service  │  │ Service  │  │  Service   │
    │face_rec  │  │DeepFace  │  │MediaPipe   │
    └──────┬───┘  └────┬─────┘  └─────┬──────┘
           └───────────┴──────────────┘
                        │
        ┌───────────────▼──────────────────┐
        │          SECURITY LAYER          │
        │  AES-256 · TLS 1.3 · Audit Log  │
        └───────────────┬──────────────────┘
                        │
        ┌───────────────▼──────────────────┐
        │           DATA LAYER             │
        │  SQLite (LAN) ⟷ Supabase (Cloud) │
        │  PDF/Excel Report Engine         │
        └──────────────────────────────────┘
```

---

## 🌐 Network — LAN Primary, Cloud Backup

| Scenario | Behavior |
|----------|----------|
| College LAN available | All data stored in SQLite locally, instant |
| LAN + Internet | Auto-sync to Supabase every 30 seconds |
| Internet only (no LAN) | Direct Supabase connection |
| Offline (no network) | Stores locally, syncs when connection returns |

**LAN Server setup:** One PC on the college network runs the FastAPI server. All classroom PCs connect via local IP (e.g. `192.168.1.10:8000`).

---

## 🔐 Security & Biometrics

### Authentication
- **JWT tokens** — 8 hour expiry, refresh token support
- **bcrypt** password hashing (cost factor 12)
- **Role-based access control (RBAC):**

| Role | Permissions |
|------|------------|
| `superadmin` | Full system — users, departments, server config |
| `admin` | Teachers, students, all reports |
| `teacher` | Own classes only — attendance, dashboard, reports |
| `student` | Own attendance record (read-only) |

### Data Security
- **AES-256** encryption for all stored face embeddings
- **TLS 1.3** for all network communication
- **Immutable audit log** — every login, attendance mark, report download logged with timestamp + IP
- **No raw images stored on server** — only encrypted embeddings
- Face data stored only on local machine, never uploaded to cloud

---

## 📊 Real-Time Dashboard Features

Teacher opens web dashboard during class and sees:

```
┌─────────────────────────────────────────────────────┐
│  MATH-301 · Mon 10:00 AM · Room 204                 │
│  Present: 42/50  |  Attention: 78%  |  Mood: 😊 68%│
├─────────────────┬─────────────────┬─────────────────┤
│  Emotion Chart  │  Attention Meter │  Alerts        │
│  😊 68% Happy  │  ████████░░ 78% │  ⚠️ 5 students  │
│  😐 20% Neutral │                 │  looking away   │
│  😢 12% Sad    │                 │  for 2+ min     │
├─────────────────┴─────────────────┴─────────────────┤
│  ATTENDANCE LIST                                     │
│  ✅ Anup Mazumdar     ✅ Rahul Singh    ❌ Priya K. │
└─────────────────────────────────────────────────────┘
```

**WebSocket updates** every 2 seconds — no page refresh needed.

---

## 📄 Auto Report Generation

After each session:

**Excel report includes:**
- Sheet 1: Attendance (Present/Absent per date)
- Sheet 2: Emotion data per student per session  
- Sheet 3: Attention % per student
- Sheet 4: Summary stats

**PDF report includes:**
- Session header (subject, teacher, room, time)
- Attendance list with photos
- Emotion pie chart
- Attention bar chart
- Teacher signature area

---

## 🚀 Setup Guide

### Prerequisites
```
Python 3.9+
Node.js 18+
Visual Studio Build Tools (Windows) — required for dlib
```

### Step 1 — Clone & Install Python deps
```bash
git clone https://github.com/anupmazumdar/ClassVision
cd ClassVision

# Install Build Tools first (Windows):
# https://visualstudio.microsoft.com/downloads/ → Build Tools → C++ workload

pip install cmake
pip install dlib
pip install -r requirements.txt
```

### Step 2 — Environment setup
```bash
cp .env.example .env
# Fill in:
# SUPABASE_URL=your_url
# SUPABASE_ANON_KEY=your_key
# JWT_SECRET=your_secret_min_32_chars
# ENCRYPTION_KEY=your_aes_key
```

### Step 3 — Initialize database
```bash
cd server
python database.py --init
```

### Step 4 — Start backend server
```bash
cd server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
# Accessible on LAN at: http://192.168.x.x:8000
```

### Step 5 — Start desktop client
```bash
cd client
python attendance.py
```

### Step 6 — Start web dashboard
```bash
cd web
npm install
npm run dev
# Opens at http://localhost:5173
```

---

## 📦 Full Dependencies

```
# Core ML
face_recognition          # dlib ResNet face embeddings
deepface                  # FER emotion detection
mediapipe                 # Face mesh + attention tracking
opencv-python             # Video capture, display
opencv-contrib-python     # LBPH fallback recognizer

# Backend
fastapi                   # REST API + WebSocket
uvicorn                   # ASGI server
sqlalchemy                # ORM for SQLite
supabase                  # Cloud DB sync
python-jose[cryptography] # JWT tokens
passlib[bcrypt]           # Password hashing
python-multipart          # File uploads
pydantic                  # Data validation

# Reports
reportlab                 # PDF generation
openpyxl                  # Excel generation

# UI (desktop)
tkinter                   # Built into Python
pillow                    # Image processing
pyttsx3                   # Text-to-speech feedback

# Utilities
pandas                    # Data manipulation
numpy                     # Array operations
python-dotenv             # .env file loading
```

---

## 🗺️ Development Roadmap

### Phase 1 — Core (Current)
- [x] Face recognition attendance (LBPH)
- [x] Basic Tkinter UI
- [ ] Upgrade to face_recognition (deep learning)
- [ ] FastAPI backend setup
- [ ] JWT auth + roles

### Phase 2 — AI Features
- [ ] Emotion detection (DeepFace)
- [ ] Attention tracking (MediaPipe)
- [ ] Real-time WebSocket dashboard
- [ ] SQLite + Supabase sync

### Phase 3 — Production
- [ ] React web dashboard
- [ ] Mobile app (PWA/React Native)
- [ ] PDF/Excel auto-reports
- [ ] Admin panel
- [ ] Docker deployment
- [ ] College LAN server setup guide

### Phase 4 — Advanced
- [ ] Multi-camera support
- [ ] Voice alerts for teacher
- [ ] Cheating detection (wrong person sitting)
- [ ] Parent notification system
- [ ] Department analytics

---

## 🤝 Contributing

This is a solo project by Anup Mazumdar (MCA @ UEM Jaipur). PRs welcome for:
- Bug fixes
- UI improvements  
- New ML model integrations
- Documentation

---

## 📬 Contact

**Anup Mazumdar**
- 📧 thezeroanup0@gmail.com
- 🌐 [anupmazumdar.me](https://anupmazumdar.me)
- 💼 [linkedin.com/in/anup-mazumdar-1033b5321](https://linkedin.com/in/anup-mazumdar-1033b5321)
- 🐙 [github.com/anupmazumdar](https://github.com/anupmazumdar)

---

## 📝 License

MIT License — free to use, modify, and distribute with attribution.

---

> **Built with ❤️ for making classrooms smarter — one face at a time.**
