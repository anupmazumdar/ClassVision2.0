import time
from collections import defaultdict
from datetime import timedelta
from typing import Dict, Optional
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

from config import JWT_ALGORITHM, JWT_SECRET, TOKEN_EXPIRE_HOURS
from utils.time import utc_now

SECRET_KEY = JWT_SECRET
ALGORITHM = JWT_ALGORITHM

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# In-memory sliding-window rate limiters
_LOGIN_ATTEMPTS = defaultdict(list)
_CODE_ATTEMPTS = defaultdict(list)


def get_client_ip(request: Request) -> str:
    """Extracts client IP, prioritizing X-Forwarded-For when deployed behind a reverse proxy (e.g. Nginx, Cloudflare, Traefik).

    SECURITY NOTE:
    In production environments, ensure that your edge reverse proxy or load balancer strips/overwrites
    untrusted client-supplied X-Forwarded-For headers to prevent client IP spoofing attacks.
    """
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        # First IP in comma-separated list is the client IP
        return forwarded.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_token(user_id: int, email: str, role: str, name: str) -> str:
    payload = {
        "sub": str(user_id),
        "email": email,
        "role": role,
        "name": name,
        "exp": utc_now() + timedelta(hours=TOKEN_EXPIRE_HOURS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )


def get_current_user(token: str = Depends(oauth2_scheme)) -> Dict:
    return decode_token(token)


def require_admin(user: Dict = Depends(get_current_user)) -> Dict:
    if user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return user


def require_teacher_or_admin(user: Dict = Depends(get_current_user)) -> Dict:
    if user.get("role") not in ("admin", "teacher"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Teacher or Admin access required",
        )
    return user


def check_login_rate_limit(client_ip: str, max_attempts: int = 5, window_seconds: int = 60):
    now = time.time()
    attempts = [t for t in _LOGIN_ATTEMPTS[client_ip] if now - t < window_seconds]
    if len(attempts) >= max_attempts:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed login attempts. Please wait 1 minute.",
        )
    _LOGIN_ATTEMPTS[client_ip] = attempts


def record_failed_login(client_ip: str):
    _LOGIN_ATTEMPTS[client_ip].append(time.time())


def check_code_rate_limit(key: str, max_attempts: int = 5, window_seconds: int = 30):
    now = time.time()
    attempts = [t for t in _CODE_ATTEMPTS[key] if now - t < window_seconds]
    if len(attempts) >= max_attempts:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many invalid code attempts. Please wait before retrying.",
        )
    _CODE_ATTEMPTS[key] = attempts


def record_failed_code(key: str):
    _CODE_ATTEMPTS[key].append(time.time())
