# ClassVision v2 — Setup Guide

## Prerequisites
- Python 3.9+
- Node.js 18+
- Windows: Visual Studio Build Tools (for dlib)

---

## Backend Setup

### 1. Install dlib (Windows only — skip on Linux/Mac)
```bash
pip install cmake wheel
pip install dlib
```
If that fails, download a pre-compiled wheel:
→ https://github.com/jloh02/dlib/releases
```bash
pip install dlib-19.22.99-cp39-cp39-win_amd64.whl
```

### 2. Install Python dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 3. Configure environment
```bash
cp .env.example .env
# Edit .env — change JWT_SECRET and ADMIN_PASSWORD
```

### 4. Run the backend
```bash
python main.py
# Server starts at http://localhost:8000
# API docs at http://localhost:8000/docs
```

On first run, a default admin account is created:
- Email: `admin@classvision.local`
- Password: `admin123`

**Change these in `.env` before going live.**

---

## Frontend Setup

### 1. Install dependencies
```bash
cd frontend
npm install
```

### 2. Configure environment
```bash
cp .env.example .env.local
# Default uses Vite proxy → no changes needed for local dev
```

### 3. Run the frontend
```bash
npm run dev
# Opens at http://localhost:5173
```

---

## Usage Flow

1. **Login** → `admin@classvision.local` / `admin123`
2. **Register students** → Students → Register Student
   - Enter enrollment number, name, department
   - Capture 1–5 face photos via camera
   - Student is immediately ready for attendance
3. **Start a session** → Dashboard → New Session
   - Enter subject name and room
4. **Take attendance** → The session page opens
   - Click **Scan Once** or enable **Auto** (every 4 seconds)
   - Recognized students are automatically marked present
5. **End session** → Click "End Session"
6. **Download report** → Reports → select session → Download Excel

---

## Network (LAN deployment)

Run the backend on a server PC on the college LAN:
```bash
# In backend/.env
SERVER_HOST=0.0.0.0
SERVER_PORT=8000
```

On classroom PCs / phones, open the web dashboard:
```
http://192.168.x.x:5173
```

Or build the frontend for production:
```bash
cd frontend
npm run build
# Serve the dist/ folder with nginx or Python's http.server
```

---

## Mobile / All Devices

The web app is a PWA — on Android/iOS:
1. Open in Chrome/Safari
2. Tap "Add to Home Screen"
3. Launches as a full-screen app with camera access
