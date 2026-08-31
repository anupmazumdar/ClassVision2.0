import pytest
from services import auth_service
from routers.auth_router import _set_auth_cookie
from starlette.responses import Response
import config


def test_login_cookie_mode_does_not_leak_raw_jwt(client, db_session):
    """Verifies that in default cookie mode, login sets httpOnly cookie and does not leak access_token in body."""
    auth_service.register(
        db_session,
        name="Auth Test User",
        email="authtest@example.com",
        password="ValidPassword123!",
        role="teacher",
    )

    response = client.post(
        "/auth/login",
        json={"email": "authtest@example.com", "password": "ValidPassword123!"},
    )
    assert response.status_code == 200
    data = response.json()
    # 1. Body MUST NOT leak raw JWT token
    assert "access_token" not in data or data.get("access_token") is None
    assert data["role"] == "teacher"
    assert data["name"] == "Auth Test User"

    # 2. httpOnly cookie is set
    assert "access_token" in response.cookies


def test_login_mobile_bearer_mode_returns_token(client, db_session):
    """Verifies that when X-Auth-Mode: bearer is requested (React Native mobile app), token is returned in body."""
    auth_service.register(
        db_session,
        name="Bearer Test User",
        email="bearertest@example.com",
        password="ValidPassword123!",
        role="teacher",
    )
    response = client.post(
        "/auth/login",
        json={"email": "bearertest@example.com", "password": "ValidPassword123!"},
        headers={"X-Auth-Mode": "bearer"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert len(data["access_token"]) > 20


def test_login_invalid_password(client, db_session):
    response = client.post(
        "/auth/login",
        json={"email": "authtest@example.com", "password": "WrongPassword!"},
    )
    assert response.status_code == 401
    assert "Invalid email or password" in response.json()["detail"]


def test_register_role_guarded(client, student_headers, admin_headers):
    # Short password (< 8 chars) rejected by Pydantic schema validation
    res_short = client.post(
        "/auth/register",
        json={"name": "New User", "email": "shortpass@test.com", "password": "pass", "role": "teacher"},
        headers=admin_headers,
    )
    assert res_short.status_code == 422

    # Student role cannot register new users
    res_student = client.post(
        "/auth/register",
        json={"name": "New User", "email": "newuser@test.com", "password": "password123", "role": "teacher"},
        headers=student_headers,
    )
    assert res_student.status_code == 403

    # Admin role can register new users with valid password
    res_admin = client.post(
        "/auth/register",
        json={"name": "New User", "email": "newuser_admin@test.com", "password": "password123", "role": "teacher"},
        headers=admin_headers,
    )
    assert res_admin.status_code == 201


def test_protected_endpoints_reject_unauthenticated_requests(client):
    """Verifies that protected routes reject requests without cookies or Bearer tokens."""
    res = client.get("/auth/me")
    assert res.status_code == 401


def test_cookie_attributes_secure_in_production(monkeypatch):
    """Verifies that the httpOnly cookie contains Secure and SameSite=Lax attributes in production."""
    monkeypatch.setattr(config, "ENVIRONMENT", "production")

    res = Response()
    _set_auth_cookie(res, "sample-token-123456")
    set_cookie_header = res.headers.get("set-cookie", "")

    assert "HttpOnly" in set_cookie_header
    assert "samesite=lax" in set_cookie_header.lower()
    assert "secure" in set_cookie_header.lower()


def test_logout_revokes_token_session(client, db_session):
    """Tests that logging out revokes the server-side JWT session, blocking subsequent requests."""
    auth_service.register(
        db_session,
        name="Logout Test User",
        email="logout_test@example.com",
        password="ValidPassword123!",
        role="teacher",
    )
    login_res = client.post(
        "/auth/login",
        json={"email": "logout_test@example.com", "password": "ValidPassword123!"},
        headers={"X-Auth-Mode": "bearer"},
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    user_headers = {"Authorization": f"Bearer {token}"}

    # 1. /auth/me works before logout
    me_res = client.get("/auth/me", headers=user_headers)
    assert me_res.status_code == 200

    # 2. Call logout with the token
    logout_res = client.post("/auth/logout", headers=user_headers)
    assert logout_res.status_code == 200
    assert "revoked" in logout_res.json()["message"]

    # 3. Subsequent requests with the revoked token are blocked with 401
    me_after_logout = client.get("/auth/me", headers=user_headers)
    assert me_after_logout.status_code == 401
    assert "Token has been revoked" in me_after_logout.json()["detail"]


def test_refresh_token_session(client, db_session):
    """Tests that authenticated users can refresh their active session token."""
    auth_service.register(
        db_session,
        name="Refresh Test User",
        email="refresh_test@example.com",
        password="ValidPassword123!",
        role="teacher",
    )
    login_res = client.post(
        "/auth/login",
        json={"email": "refresh_test@example.com", "password": "ValidPassword123!"},
        headers={"X-Auth-Mode": "bearer"},
    )
    token = login_res.json()["access_token"]
    user_headers = {"Authorization": f"Bearer {token}"}

    refresh_res = client.post("/auth/refresh", headers={**user_headers, "X-Auth-Mode": "bearer"})
    assert refresh_res.status_code == 200
    new_token = refresh_res.json()["access_token"]
    assert new_token != token

    # New token works for subsequent calls
    me_res = client.get("/auth/me", headers={"Authorization": f"Bearer {new_token}"})
    assert me_res.status_code == 200
