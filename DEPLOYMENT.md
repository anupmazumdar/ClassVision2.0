# ClassVision 2.0 — Production Deployment Guide

This guide details step-by-step instructions for deploying **ClassVision 2.0** to production environments with strict cryptographic isolation, HTTPS enforcement, and automated database migrations.

---

## 🏗️ Architecture Overview

```
[Student / Teacher Client] (Mobile PWA / React Browser)
         │
         │ HTTPS / WSS
         ▼
[Vercel / Netlify Frontend] (SPA Vite Bundle)
         │
         │ REST API (Bearer JWT + HMAC Ticket)
         ▼
[Render / Railway Backend] (FastAPI + OpenCV + Fernet AES-128)
         │
         ▼
[Encrypted SQLite / PostgreSQL] (Biometrics Encrypted at Rest)
```

---

## 🔑 1. Generate Production Cryptographic Keys

Never deploy to production with default development secrets. Run our secret generation script:

```bash
cd backend
python scripts/generate_secrets.py
```

This generates 4 high-entropy decoupled keys:
1. `JWT_SECRET`: 64-char hex key for session authentication.
2. `SESSION_CODE_SECRET`: Dedicated secret for rolling TOTP session codes.
3. `ATTENDANCE_TICKET_SECRET`: Dedicated HMAC-SHA256 key for attendance verification tickets.
4. `FACE_ENCRYPTION_KEY`: 32-byte Fernet key for biometric encryption at rest.

---

## 🚀 2. Backend Deployment

### Option A — Render / Railway (Recommended)

1. Create a new **Web Service** connected to your GitHub repository ([ClassVision2.0](https://github.com/anupmazumdar/ClassVision2.0)).
2. Set Root Directory to `backend` (or select the root `Dockerfile`).
3. Set the Build & Start commands:
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. In the **Environment Variables** tab, add:
   ```ini
   ENVIRONMENT=production
   JWT_SECRET=<generated_jwt_secret>
   SESSION_CODE_SECRET=<generated_session_code_secret>
   ATTENDANCE_TICKET_SECRET=<generated_ticket_secret>
   FACE_ENCRYPTION_KEY=<generated_fernet_key>
   CORS_ORIGINS=https://your-frontend.vercel.app
   ADMIN_EMAIL=admin@yourdomain.com
   ADMIN_PASSWORD=<strong_admin_password>
   ```
5. Deploy the service. Your backend will be accessible via HTTPS at `https://your-app.onrender.com`.

---

### Option B — Docker Container / VPS

Run directly on any Ubuntu/Debian Linux VPS:

```bash
# Clone repository
git clone https://github.com/anupmazumdar/ClassVision2.0.git
cd ClassVision2.0

# Start with Docker Compose
docker-compose up -d --build
```

---

## ⚡ 3. Frontend Deployment (Vercel / Netlify)

1. Import your GitHub repository on **[Vercel](https://vercel.com)**.
2. Configure Project Settings:
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Add Environment Variable:
   - `VITE_API_URL`: `https://your-backend.onrender.com`
4. Click **Deploy**. Vercel will automatically configure SSL/HTTPS and PWA caching.

---

## 🧪 4. Automated Verification & Health Check

Run the comprehensive automated test suite against the codebase before pushing production releases:

```bash
cd backend
# 1. Run full Pytest suite (8 critical flows)
python -m pytest tests -v

# 2. Run security anti-spoof & rate-limiting suite
python test_priority1.py

# 3. Run biometric encryption at rest & consent suite
python test_priority2.py
```
