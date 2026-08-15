import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./classvision.db")
JWT_SECRET = os.getenv("JWT_SECRET", "classvision-change-this-in-production-min32chars")
TOKEN_EXPIRE_HOURS = int(os.getenv("TOKEN_EXPIRE_HOURS", "8"))
JWT_ALGORITHM = "HS256"
SERVER_HOST = os.getenv("SERVER_HOST", "0.0.0.0")
SERVER_PORT = int(os.getenv("SERVER_PORT", "8000"))

DEFAULT_ADMIN_NAME = os.getenv("ADMIN_NAME", "Admin")
DEFAULT_ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@classvision.local")
DEFAULT_ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")
