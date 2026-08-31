import hashlib
import logging
import secrets
import time
from collections import defaultdict
from datetime import timedelta
from typing import Dict, Optional
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

from config import JWT_ALGORITHM, JWT_SECRET, TOKEN_EXPIRE_HOURS, REDIS_URL
from utils.time import utc_now

SECRET_KEY = JWT_SECRET
ALGORITHM = JWT_ALGORITHM

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# Distributed Redis client (optional for multi-worker production)
_redis_client = None
if REDIS_URL:
    try:
        import redis
        _redis_client = redis.from_url(REDIS_URL, decode_responses=True, socket_connect_timeout=2)
        _redis_client.ping()
        logging.info("[REDIS] Connected to distributed Redis rate limiter.")
    except Exception as _rexc:
        logging.warning(f"[REDIS] Could not connect to REDIS_URL ({_rexc}). Using in-memory fallback.")
        _redis_client = None

# In-memory sliding-window rate limiters (fallback / development)
_LOGIN_ATTEMPTS = defaultdict(list)
_CODE_ATTEMPTS = defaultdict(list)
_COMPUTE_ATTEMPTS = defaultdict(list)
_EMAIL_ATTEMPTS = defaultdict(list)
_DEVICE_CHECKIN_VELOCITY = defaultdict(list)
_REVOKED_TOKENS = set()


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


def is_token_revoked(token_id: str) -> bool:
    """Checks whether a token JTI or hash has been revoked / blacklisted."""
    if _redis_client is not None:
        try:
            return bool(_redis_client.exists(f"revoked:{token_id}"))
        except Exception:
            pass
    return token_id in _REVOKED_TOKENS


def revoke_token(token: str) -> None:
    """Revokes a JWT token on logout, invalidating server-side session."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM], options={"verify_exp": False})
        jti = payload.get("jti") or hashlib.sha256(token.encode()).hexdigest()
        exp = payload.get("exp", 0)
        remaining = max(60, int(exp - time.time()))
        if _redis_client is not None:
            try:
                _redis_client.setex(f"revoked:{jti}", remaining, "1")
            except Exception:
                pass
        _REVOKED_TOKENS.add(jti)
    except Exception:
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        _REVOKED_TOKENS.add(token_hash)


def create_token(user_id: int, email: str, role: str, name: str) -> str:
    payload = {
        "jti": secrets.token_hex(16),
        "sub": str(user_id),
        "email": email,
        "role": role,
        "name": name,
        "exp": utc_now() + timedelta(hours=TOKEN_EXPIRE_HOURS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def create_student_token(student_id: int, enrollment: str, name: str, course: str, branch: str, year: int) -> str:
    payload = {
        "jti": secrets.token_hex(16),
        "sub": str(student_id),
        "enrollment": enrollment,
        "role": "student",
        "name": name,
        "course": course,
        "branch": branch,
        "year": year,
        "exp": utc_now() + timedelta(hours=TOKEN_EXPIRE_HOURS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        jti = payload.get("jti") or hashlib.sha256(token.encode()).hexdigest()
        if is_token_revoked(jti):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has been revoked",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return payload
    except HTTPException:
        raise
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user(request: Request) -> Dict:
    # 1. Explicit Authorization header takes priority (standard for API clients & test suites)
    token = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1].strip()

    # 2. Ambient httpOnly cookie (standard for browser web apps)
    if not token:
        token = request.cookies.get("access_token")

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
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
    if _redis_client is not None:
        try:
            key = f"rate:login:{client_ip}"
            count = _redis_client.get(key)
            if count and int(count) >= max_attempts:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many failed login attempts. Please wait 1 minute.",
                )
            return
        except HTTPException:
            raise
        except Exception as e:
            logging.debug(f"[REDIS] Error checking login rate limit: {e}")

    now = time.time()
    attempts = [t for t in _LOGIN_ATTEMPTS[client_ip] if now - t < window_seconds]
    if len(attempts) >= max_attempts:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed login attempts. Please wait 1 minute.",
        )
    _LOGIN_ATTEMPTS[client_ip] = attempts


def record_failed_login(client_ip: str, window_seconds: int = 60):
    if _redis_client is not None:
        try:
            key = f"rate:login:{client_ip}"
            pipe = _redis_client.pipeline()
            pipe.incr(key)
            pipe.expire(key, window_seconds)
            pipe.execute()
            return
        except Exception as e:
            logging.debug(f"[REDIS] Error recording failed login: {e}")

    _LOGIN_ATTEMPTS[client_ip].append(time.time())


def check_code_rate_limit(key: str, max_attempts: int = 5, window_seconds: int = 30):
    if _redis_client is not None:
        try:
            rkey = f"rate:code:{key}"
            count = _redis_client.get(rkey)
            if count and int(count) >= max_attempts:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many invalid code attempts. Please wait before retrying.",
                )
            return
        except HTTPException:
            raise
        except Exception as e:
            logging.debug(f"[REDIS] Error checking code rate limit: {e}")

    now = time.time()
    attempts = [t for t in _CODE_ATTEMPTS[key] if now - t < window_seconds]
    if len(attempts) >= max_attempts:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many invalid code attempts. Please wait before retrying.",
        )
    _CODE_ATTEMPTS[key] = attempts


def record_failed_code(key: str, window_seconds: int = 30):
    if _redis_client is not None:
        try:
            rkey = f"rate:code:{key}"
            pipe = _redis_client.pipeline()
            pipe.incr(rkey)
            pipe.expire(rkey, window_seconds)
            pipe.execute()
            return
        except Exception as e:
            logging.debug(f"[REDIS] Error recording failed code: {e}")

    _CODE_ATTEMPTS[key].append(time.time())


def check_compute_rate_limit(client_ip: str, max_requests: int = 30, window_seconds: int = 60):
    """Limits compute-heavy face recognition / OpenCV requests per IP to protect against DoS attacks."""
    if _redis_client is not None:
        try:
            key = f"rate:compute:{client_ip}"
            count = _redis_client.incr(key)
            if count == 1:
                _redis_client.expire(key, window_seconds)
            if count > max_requests:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many facial recognition requests. Please wait a moment before trying again.",
                )
            return
        except HTTPException:
            raise
        except Exception as e:
            logging.debug(f"[REDIS] Error in compute rate limit: {e}")

    now = time.time()
    attempts = [t for t in _COMPUTE_ATTEMPTS[client_ip] if now - t < window_seconds]
    if len(attempts) >= max_requests:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many facial recognition requests. Please wait a moment before trying again.",
        )
    attempts.append(now)
    _COMPUTE_ATTEMPTS[client_ip] = attempts


def check_email_rate_limit(key: str, max_requests: int = 5, window_seconds: int = 60):
    """Limits attendance report email dispatches per caller/IP to prevent spamming."""
    if _redis_client is not None:
        try:
            rkey = f"rate:email:{key}"
            count = _redis_client.incr(rkey)
            if count == 1:
                _redis_client.expire(rkey, window_seconds)
            if count > max_requests:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Email rate limit reached. Please wait 1 minute before sending another report.",
                )
            return
        except HTTPException:
            raise
        except Exception as e:
            logging.debug(f"[REDIS] Error in email rate limit: {e}")

    now = time.time()
    attempts = [t for t in _EMAIL_ATTEMPTS[key] if now - t < window_seconds]
    if len(attempts) >= max_requests:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Email rate limit reached. Please wait 1 minute before sending another report.",
        )
    attempts.append(now)
    _EMAIL_ATTEMPTS[key] = attempts


def check_device_checkin_velocity(device_id: str, student_id: int, max_distinct_students: int = 3, window_seconds: int = 300):
    """Anomaly detection: Blocks a single hardware device from rapidly submitting check-ins for multiple different students."""
    if not device_id:
        return

    now = time.time()
    recent = [(sid, ts) for sid, ts in _DEVICE_CHECKIN_VELOCITY[device_id] if now - ts < window_seconds]
    distinct_students = {sid for sid, _ in recent}
    distinct_students.add(student_id)

    if len(distinct_students) > max_distinct_students:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Security Anomaly: Excessive distinct student check-ins detected from this device. Please wait {window_seconds // 60} minutes.",
        )

    recent.append((student_id, now))
    _DEVICE_CHECKIN_VELOCITY[device_id] = recent

