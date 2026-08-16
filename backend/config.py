import os
import logging

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./classvision.db")

# Decoupled Security Secrets
JWT_SECRET = os.getenv("JWT_SECRET", "classvision-change-this-in-production-min32chars")
SESSION_CODE_SECRET = os.getenv("SESSION_CODE_SECRET", "cv-session-code-secret-key-32chars-min")
ATTENDANCE_TICKET_SECRET = os.getenv("ATTENDANCE_TICKET_SECRET", "cv-attendance-ticket-secret-key-32chars-min")

# Biometric Encryption at Rest Key (Fernet 32-byte urlsafe base64)
FACE_ENCRYPTION_KEY = os.getenv("FACE_ENCRYPTION_KEY", "E9SSVPs9LfUYGdJv6CkE6xOyopZmKxAWHoFZPgXT7Sc=")

TOKEN_EXPIRE_HOURS = int(os.getenv("TOKEN_EXPIRE_HOURS", "8"))
JWT_ALGORITHM = "HS256"
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

SERVER_HOST = os.getenv("SERVER_HOST", "0.0.0.0")
SERVER_PORT = int(os.getenv("SERVER_PORT", "8000"))

DEFAULT_ADMIN_NAME = os.getenv("ADMIN_NAME", "Admin")
DEFAULT_ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@classvision.local")
DEFAULT_ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")


def check_security_config():
    """Validates configuration at startup and warns if default secrets are in use."""
    if ENVIRONMENT.lower() == "production":
        if "change-this" in JWT_SECRET:
            raise RuntimeError("CRITICAL SECURITY ERROR: Default JWT_SECRET detected in production environment!")
        if "cv-session-code-secret" in SESSION_CODE_SECRET:
            raise RuntimeError("CRITICAL SECURITY ERROR: Default SESSION_CODE_SECRET detected in production environment!")
        if "cv-attendance-ticket" in ATTENDANCE_TICKET_SECRET:
            raise RuntimeError("CRITICAL SECURITY ERROR: Default ATTENDANCE_TICKET_SECRET detected in production environment!")
        if "E9SSVPs9LfUYGdJv6CkE6xOyopZmKxAWHoFZPgXT7Sc=" in FACE_ENCRYPTION_KEY:
            raise RuntimeError("CRITICAL SECURITY ERROR: Default FACE_ENCRYPTION_KEY detected in production environment!")
    else:
        if "change-this" in JWT_SECRET:
            logging.warning("[SECURITY WARNING] Running with default development JWT_SECRET. Set JWT_SECRET in .env for production.")
