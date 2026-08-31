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

# Biometric Encryption at Rest Key (Fernet 32-byte urlsafe base64)
FACE_ENCRYPTION_KEY = os.getenv("FACE_ENCRYPTION_KEY", "")
if not FACE_ENCRYPTION_KEY or not FACE_ENCRYPTION_KEY.strip():
    from cryptography.fernet import Fernet
    # Generate valid ephemeral Fernet key if omitted in deployment environment
    FACE_ENCRYPTION_KEY = Fernet.generate_key().decode("utf-8")
    logging.info("[CONFIG] Generated runtime Fernet FACE_ENCRYPTION_KEY.")

# Face Recognition Matching Threshold (Tuned for multi-angle registration: 0.75-0.85)
FACE_SIMILARITY_THRESHOLD = float(os.getenv("FACE_SIMILARITY", "0.78"))

# Max Allowed Base64 Payload Character Length (~5MB raw image -> ~6.7MB Base64)
MAX_IMAGE_BASE64_CHARS = int(os.getenv("MAX_IMAGE_BASE64_CHARS", "7000000"))

TOKEN_EXPIRE_HOURS = int(os.getenv("TOKEN_EXPIRE_HOURS", "8"))
CODE_EXPIRATION_SECONDS = int(os.getenv("CODE_EXPIRATION_SECONDS", "30"))
TICKET_EXPIRATION_SECONDS = int(os.getenv("TICKET_EXPIRATION_SECONDS", "15"))
JWT_ALGORITHM = "HS256"
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

SERVER_HOST = os.getenv("SERVER_HOST", "0.0.0.0")  # nosec: B104
SERVER_PORT = int(os.getenv("SERVER_PORT", "8000"))

# Distributed Redis Cache & Rate Limiter URL (e.g. redis://default:password@host:6379)
REDIS_URL = os.getenv("REDIS_URL", "")

# Reverse Proxy IP Header Trust (Only enable if deployed behind a verified trusted reverse proxy)
TRUST_PROXY_HEADERS = os.getenv("TRUST_PROXY_HEADERS", "false").lower() in ("true", "1")

# Auth Token Transmission Mode ('cookie' for secure web, 'bearer' for React Native / mobile, 'both' for hybrid)
AUTH_MODE = os.getenv("AUTH_MODE", "cookie").lower()

DEFAULT_ADMIN_NAME = os.getenv("ADMIN_NAME", "Admin")
DEFAULT_ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@classvision.local")
DEFAULT_ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")
ADMIN_ALIAS_EMAIL = os.getenv("ADMIN_ALIAS_EMAIL", "admin@classvission.local")

# CORS Origin Allow-list
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "")
if CORS_ORIGINS:
    ALLOWED_ORIGINS = [origin.strip() for origin in CORS_ORIGINS.split(",") if origin.strip()]
else:
    # Explicit allowed origins including production frontend domains
    ALLOWED_ORIGINS = [
        "https://classvission.anupmazumdar.me",
        "https://class-vision2-0.vercel.app",
        "https://classvision.vercel.app",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]


def check_security_config():
    """Validates configuration at startup and warns if default/insecure secrets are in use.

    Validates FACE_ENCRYPTION_KEY validity and logs warnings for development defaults without
    halting single-instance cloud containers on platforms like Render.
    """
    global FACE_ENCRYPTION_KEY

    # 1. Biometric encryption key validation
    try:
        from cryptography.fernet import Fernet
        Fernet(FACE_ENCRYPTION_KEY.encode("utf-8"))
    except Exception as exc:
        from cryptography.fernet import Fernet
        FACE_ENCRYPTION_KEY = Fernet.generate_key().decode("utf-8")
        logging.warning(f"[SECURITY WARNING] FACE_ENCRYPTION_KEY was invalid ({exc}). Generated a new valid runtime key.")

    # 2. Environment-specific security audits
    if ENVIRONMENT.lower() == "production":
        if "change-this" in JWT_SECRET:
            logging.warning("[SECURITY WARNING] Default JWT_SECRET detected in production! Set JWT_SECRET in environment variables.")
        if "cv-session-code-secret" in SESSION_CODE_SECRET:
            logging.warning("[SECURITY WARNING] Default SESSION_CODE_SECRET detected in production!")
        if "cv-attendance-ticket" in ATTENDANCE_TICKET_SECRET:
            logging.warning("[SECURITY WARNING] Default ATTENDANCE_TICKET_SECRET detected in production!")
        if not REDIS_URL or not REDIS_URL.strip():
            logging.warning("[REDIS] REDIS_URL not configured. Operating in single-instance in-memory rate limiting mode.")
        if DEFAULT_ADMIN_PASSWORD == "admin123":
            logging.warning("[SECURITY WARNING] Default ADMIN_PASSWORD ('admin123') in use. Set ADMIN_PASSWORD in environment variables for security.")
    else:
        if "change-this" in JWT_SECRET:
            logging.warning("[SECURITY WARNING] Running with default development JWT_SECRET. Set JWT_SECRET in .env for production.")
        if "cv-session-code-secret" in SESSION_CODE_SECRET:
            logging.warning("[SECURITY WARNING] Running with default development SESSION_CODE_SECRET. Demo-only — do not use with real student data.")
        if "cv-attendance-ticket" in ATTENDANCE_TICKET_SECRET:
            logging.warning("[SECURITY WARNING] Running with default development ATTENDANCE_TICKET_SECRET. Demo-only — do not use with real student data.")
        if DEFAULT_ADMIN_PASSWORD == "admin123":
            logging.warning("[SECURITY WARNING] Running with default ADMIN_PASSWORD ('admin123'). Override in .env for production.")
