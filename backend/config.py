import os
import logging
from pathlib import Path
from dotenv import load_dotenv

# Explicitly resolve and load .env file from backend/ directory or root directory
_backend_env = Path(__file__).resolve().parent / ".env"
_root_env = Path(__file__).resolve().parent.parent / ".env"

if _backend_env.exists():
    load_dotenv(dotenv_path=_backend_env)
elif _root_env.exists():
    load_dotenv(dotenv_path=_root_env)
else:
    load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./classvision.db")

# Decoupled Security Secrets
JWT_SECRET = os.getenv("JWT_SECRET", "classvision-change-this-in-production-min32chars")
SESSION_CODE_SECRET = os.getenv("SESSION_CODE_SECRET", "cv-session-code-secret-key-32chars-min")
ATTENDANCE_TICKET_SECRET = os.getenv("ATTENDANCE_TICKET_SECRET", "cv-attendance-ticket-secret-key-32chars-min")

# Biometric Encryption at Rest Key (Fernet 32-byte urlsafe base64) — MUST NOT have committed default
FACE_ENCRYPTION_KEY = os.getenv("FACE_ENCRYPTION_KEY", "")

# Face Recognition Matching Threshold (Tuned for multi-angle registration: 0.75-0.85)
FACE_SIMILARITY_THRESHOLD = float(os.getenv("FACE_SIMILARITY", "0.78"))

# Max Allowed Base64 Payload Character Length (~5MB raw image -> ~6.7MB Base64)
MAX_IMAGE_BASE64_CHARS = int(os.getenv("MAX_IMAGE_BASE64_CHARS", "7000000"))

TOKEN_EXPIRE_HOURS = int(os.getenv("TOKEN_EXPIRE_HOURS", "8"))
JWT_ALGORITHM = "HS256"
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

SERVER_HOST = os.getenv("SERVER_HOST", "0.0.0.0")
SERVER_PORT = int(os.getenv("SERVER_PORT", "8000"))

# Optional Distributed Redis Cache & Rate Limiter URL (e.g. redis://default:password@host:6379)
REDIS_URL = os.getenv("REDIS_URL", "")

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
