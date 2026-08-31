from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from database import get_db
from middleware.jwt_middleware import (
    check_login_rate_limit,
    get_client_ip,
    get_current_user,
    record_failed_login,
    require_admin,
)
from schemas.auth_schema import LoginRequest, RegisterRequest, StudentLoginRequest
from services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_auth_cookie(response: Response, token: str) -> None:
    """Sets a secure, httpOnly JWT cookie with 7-day expiration."""
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=False,  # Allow local development; in production reverse proxies manage TLS
        samesite="lax",
        max_age=86400 * 7,
        path="/",
    )


@router.post("/login")
def login(request: Request, response: Response, body: LoginRequest, db: Session = Depends(get_db)):
    client_ip = get_client_ip(request)
    check_login_rate_limit(client_ip)

    try:
        result = auth_service.login(db, body.email, body.password)
        if "access_token" in result:
            _set_auth_cookie(response, result["access_token"])
        return result
    except HTTPException:
        record_failed_login(client_ip)
        raise


@router.post("/student-login")
def student_login(request: Request, response: Response, body: StudentLoginRequest, db: Session = Depends(get_db)):
    client_ip = get_client_ip(request)
    check_login_rate_limit(client_ip)

    try:
        result = auth_service.student_login(
            db=db,
            enrollment=body.enrollment,
            device_id=body.device_id,
            device_info=body.device_info,
            client_ip=client_ip,
        )
        if "access_token" in result:
            _set_auth_cookie(response, result["access_token"])
        return result
    except HTTPException:
        record_failed_login(client_ip)
        raise


@router.post("/logout")
def logout(response: Response):
    """Clears the authentication httpOnly cookie."""
    response.delete_cookie(key="access_token", path="/", httponly=True, samesite="lax")
    return {"message": "Logged out successfully"}


@router.post("/register", status_code=201)
def register(
    body: RegisterRequest,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
):
    return auth_service.register(db, body.name, body.email, body.password, body.role)


@router.get("/me")
def me(current: dict = Depends(get_current_user)):
    return current
