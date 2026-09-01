from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from starlette.requests import Request
from starlette.responses import JSONResponse

from middleware.jwt_middleware import get_client_ip


def _get_request_ip(request: Request) -> str:
    """Extracts client IP using ClassVision's secure proxy-aware IP helper."""
    return get_client_ip(request)


limiter = Limiter(
    key_func=_get_request_ip,
    default_limits=[],
    headers_enabled=False,
)


def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """Returns uniform JSON error response when rate limit is exceeded."""
    return JSONResponse(
        status_code=429,
        content={
            "detail": f"Too many requests. Rate limit exceeded ({exc.detail}). Please wait before retrying.",
            "code": "RATE_LIMIT_EXCEEDED",
        },
    )
