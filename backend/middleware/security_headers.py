import os
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from config import ENVIRONMENT


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Adds standard OWASP recommended security headers to every HTTP response."""

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)

        # Standard OWASP headers
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(self), geolocation=(self), microphone=()"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "img-src 'self' data: blob: https:; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline'; "
            "connect-src 'self' https: ws: wss:; "
            "frame-ancestors 'none';"
        )

        # HSTS only in production over HTTPS
        if ENVIRONMENT.lower() == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"

        return response
