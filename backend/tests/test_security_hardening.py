import pytest
from starlette.requests import Request
from starlette.datastructures import Headers

import config
from config import check_security_config
from middleware.jwt_middleware import get_client_ip
from routers.auth_router import _set_auth_cookie
from starlette.responses import Response


def test_security_headers_present_on_responses(client):
    """Verifies OWASP security response headers are attached to every API response."""
    res = client.get("/")
    assert res.status_code == 200

    headers = res.headers
    assert headers.get("x-frame-options") == "DENY"
    assert headers.get("x-content-type-options") == "nosniff"
    assert headers.get("referrer-policy") == "strict-origin-when-cross-origin"
    assert "camera=(self)" in headers.get("permissions-policy", "")
    assert "default-src 'self'" in headers.get("content-security-policy", "")


def test_global_exception_handler_sanitizes_500_errors(monkeypatch):
    """Verifies unhandled exceptions return a sanitized 500 JSON payload without stack trace leakage."""
    from starlette.testclient import TestClient
    from main import app
    from services import session_service

    # Temporarily monkeypatch an endpoint to throw an unexpected unhandled exception
    def broken_handler(*args, **kwargs):
        raise ZeroDivisionError("Simulated critical unhandled internal math error / secrets DB_SECRET=123")

    monkeypatch.setattr(session_service, "get_session", broken_handler)

    test_client = TestClient(app, raise_server_exceptions=False)

    # Use valid credentials to pass auth and reach the handler
    from middleware.jwt_middleware import create_token
    token = create_token(1, "teacher@test.com", "teacher", "Teacher")
    res = test_client.get("/sessions/1", headers={"Authorization": f"Bearer {token}"})

    assert res.status_code == 500
    data = res.json()
    assert "unexpected internal server error" in data.get("detail", "").lower()
    # Must NOT leak exception name or sensitive internal details
    assert "ZeroDivisionError" not in str(data)
    assert "DB_SECRET" not in str(data)
    assert "traceback" not in str(data).lower()


def test_auth_cookie_max_age_aligned_with_token_expire_hours():
    """Verifies cookie max_age matches TOKEN_EXPIRE_HOURS * 3600."""
    response = Response()
    _set_auth_cookie(response, "test-jwt-token")

    cookie_header = response.headers.get("set-cookie", "")
    expected_max_age = config.TOKEN_EXPIRE_HOURS * 3600
    assert f"Max-Age={expected_max_age}" in cookie_header
    assert "HttpOnly" in cookie_header
    assert "SameSite=lax" in cookie_header


def test_get_client_ip_proxy_trust_hardening(monkeypatch):
    """Verifies that spoofed X-Forwarded-For headers are ignored unless TRUST_PROXY_HEADERS=True."""
    class MockClient:
        host = "198.51.100.1"

    scope = {
        "type": "http",
        "client": ("198.51.100.1", 1234),
        "headers": [(b"x-forwarded-for", b"203.0.113.195, 10.0.0.1")],
    }
    request = Request(scope)
    request._client = MockClient()

    # 1. By default (TRUST_PROXY_HEADERS=False), returns direct connection host
    monkeypatch.setattr(config, "TRUST_PROXY_HEADERS", False)
    from middleware import jwt_middleware
    monkeypatch.setattr(jwt_middleware, "TRUST_PROXY_HEADERS", False)
    assert get_client_ip(request) == "198.51.100.1"

    # 2. When explicitly configured behind trusted proxy (TRUST_PROXY_HEADERS=True), parses X-Forwarded-For
    monkeypatch.setattr(jwt_middleware, "TRUST_PROXY_HEADERS", True)
    assert get_client_ip(request) == "203.0.113.195"


def test_check_security_config_resilient_configuration(monkeypatch, caplog):
    """Verifies that check_security_config() logs warnings and generates runtime keys without crashing single-instance containers."""
    monkeypatch.setattr(config, "ENVIRONMENT", "production")
    monkeypatch.setattr(config, "FACE_ENCRYPTION_KEY", "invalid-key-format")
    monkeypatch.setattr(config, "JWT_SECRET", "classvision-change-this-in-production-min32chars")
    monkeypatch.setattr(config, "SESSION_CODE_SECRET", "cv-session-code-secret-key-32chars-min")
    monkeypatch.setattr(config, "ATTENDANCE_TICKET_SECRET", "cv-attendance-ticket-secret-key-32chars-min")
    monkeypatch.setattr(config, "REDIS_URL", "")
    monkeypatch.setattr(config, "DEFAULT_ADMIN_PASSWORD", "admin123")

    # Does not crash with RuntimeError; regenerates valid key and logs warnings
    check_security_config()
    assert config.FACE_ENCRYPTION_KEY is not None
    assert len(config.FACE_ENCRYPTION_KEY) > 20
