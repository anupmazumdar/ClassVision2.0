import os
import logging

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./classvision.db")

# Decoupled Security Secrets
JWT_SECRET = os.getenv("JWT_SECRET", "classvision-change-this-in-production-min32chars")
SESSION_CODE_SECRET = os.getenv("SESSION_CODE_SECRET", "cv-session-code-secret-key-32chars-min")
ATTENDANCE_TICKET_SECRET = os.getenv("ATTENDANCE_TICKET_SECRET", "cv-attendance-ticket-secret-key-32chars-min")

# Biometric Encryption at Rest Key (Fernet 32-byte urlsafe base64) — MUST NOT have committed default
FACE_ENCRYPTION_KEY = os.getenv("FACE_ENCRYPTION_KEY", "")

# Face Recognition Matching Threshold (Tuned for multi-angle registration: 0.75-0.85)
FACE_SIMILARITY_THRESHOLD = float(os.getenv("FACE_SIMILARITY", "0.78"))

TOKEN_EXPIRE_HOURS = int(os.getenv("TOKEN_EXPIRE_HOURS", "8"))
JWT_ALGORITHM = "HS256"
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

SERVER_HOST = os.getenv("SERVER_HOST", "0.0.0.0")
SERVER_PORT = int(os.getenv("SERVER_PORT", "8000"))

DEFAULT_ADMIN_NAME = os.getenv("ADMIN_NAME", "Admin")
DEFAULT_ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@classvision.local")
DEFAULT_ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")


def check_security_config():
    """Validates configuration at startup and warns if default/insecure secrets are in use.

    Fail-fast immediately on missing or invalid FACE_ENCRYPTION_KEY in any environment.
    """
    # 1. Biometric encryption key is strictly mandatory in all environments
    if not FACE_ENCRYPTION_KEY or not FACE_ENCRYPTION_KEY.strip():
        raise RuntimeError(
            "CRITICAL SECURITY ERROR: FACE_ENCRYPTION_KEY is required and not set in environment! "
            "Generate one using 'python scripts/generate_secrets.py' and set it in your .env file."
        )
    try:
        from cryptography.fernet import Fernet
        Fernet(FACE_ENCRYPTION_KEY.encode("utf-8"))
    except Exception as exc:
        raise RuntimeError(
            f"CRITICAL SECURITY ERROR: FACE_ENCRYPTION_KEY is invalid: {exc}. "
            "Generate a valid 32-byte urlsafe base64 key using 'python scripts/generate_secrets.py'."
        )

    # 2. Environment-specific validations
    if ENVIRONMENT.lower() == "production":
        if "change-this" in JWT_SECRET:
            raise RuntimeError("CRITICAL SECURITY ERROR: Default JWT_SECRET detected in production environment!")
        if "cv-session-code-secret" in SESSION_CODE_SECRET:
            raise RuntimeError("CRITICAL SECURITY ERROR: Default SESSION_CODE_SECRET detected in production environment!")
        if "cv-attendance-ticket" in ATTENDANCE_TICKET_SECRET:
            raise RuntimeError("CRITICAL SECURITY ERROR: Default ATTENDANCE_TICKET_SECRET detected in production environment!")
    else:
        if "change-this" in JWT_SECRET:
            logging.warning("[SECURITY WARNING] Running with default development JWT_SECRET. Set JWT_SECRET in .env for production.")
        if "cv-session-code-secret" in SESSION_CODE_SECRET:
            logging.warning("[SECURITY WARNING] Running with default development SESSION_CODE_SECRET. Demo-only — do not use with real student data.")
        if "cv-attendance-ticket" in ATTENDANCE_TICKET_SECRET:
            logging.warning("[SECURITY WARNING] Running with default development ATTENDANCE_TICKET_SECRET. Demo-only — do not use with real student data.")
