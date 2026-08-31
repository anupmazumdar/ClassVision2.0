import pytest
from services import auth_service


def test_login_success(client, db_session):
    # Ensure test user exists
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
    assert "access_token" in data
    assert data["role"] == "teacher"
    assert data["name"] == "Auth Test User"


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
