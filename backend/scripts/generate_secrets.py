#!/usr/bin/env python3
"""
ClassVision 2.0 — Production Secrets Generator
Generates cryptographically secure, decoupled random keys for production deployment.
"""

import secrets
from cryptography.fernet import Fernet


def generate_production_env():
    jwt_secret = secrets.token_hex(32)
    session_code_secret = secrets.token_hex(32)
    attendance_ticket_secret = secrets.token_hex(32)
    face_encryption_key = Fernet.generate_key().decode()

    env_content = f"""# ========================================================
# ClassVision 2.0 Production Environment Configuration
# Generated automatically by scripts/generate_secrets.py
# ========================================================

ENVIRONMENT=production
DATABASE_URL=sqlite:///./classvision.db

# Cryptographic Keys (Decoupled & High-Entropy)
JWT_SECRET={jwt_secret}
SESSION_CODE_SECRET={session_code_secret}
ATTENDANCE_TICKET_SECRET={attendance_ticket_secret}
FACE_ENCRYPTION_KEY={face_encryption_key}

# Token Lifecycle & Server Port
TOKEN_EXPIRE_HOURS=8
SERVER_HOST=0.0.0.0
SERVER_PORT=8000

# CORS Whitelist (Comma-separated production frontend domains)
CORS_ORIGINS=https://your-frontend-domain.vercel.app,http://localhost:5173

# Admin Initial Credentials
ADMIN_NAME=Super Admin
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD={secrets.token_urlsafe(16)}
"""
    print("\n=======================================================")
    print("PRODUCED SECURE PRODUCTION ENVIRONMENT KEYS:")
    print("=======================================================\n")
    print(env_content)
    print("=======================================================")
    print("Copy the above block into your backend .env file or cloud provider dashboard.\n")


if __name__ == "__main__":
    generate_production_env()
