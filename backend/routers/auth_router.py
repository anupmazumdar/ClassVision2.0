from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from config import ENVIRONMENT, TOKEN_EXPIRE_HOURS
from database import get_db
from middleware.jwt_middleware import (
    check_login_rate_limit,
    create_student_token,
    create_token,
    get_client_ip,
    get_current_user,
    record_failed_login,
    require_admin,
    revoke_token,
)
from schemas.auth_schema import LoginRequest, RegisterRequest, StudentLoginRequest
from services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


def _is_secure_cookie() -> bool:
    return ENVIRONMENT.lower() == "production"


def _set_auth_cookie(response: Response, token: str) -> None:
    """Sets a secure, httpOnly JWT cookie whose max_age strictly aligns with JWT lifetime."""
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=_is_secure_cookie(),
        samesite="lax",
        max_age=int(TOKEN_EXPIRE_HOURS * 3600),
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
            pin=body.pin,
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
def logout(request: Request, response: Response):
    """Clears the authentication httpOnly cookie and revokes the server-side JWT session."""
    token = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1].strip()
    if not token:
        token = request.cookies.get("access_token")

    if token:
        revoke_token(token)

    response.delete_cookie(
        key="access_token",
        path="/",
        httponly=True,
        secure=_is_secure_cookie(),
        samesite="lax",
    )
    return {"message": "Logged out successfully and session revoked"}


@router.post("/refresh")
def refresh(request: Request, response: Response, current: dict = Depends(get_current_user)):
    """Refreshes the current authenticated user's access token session."""
    if current.get("role") == "student":
        new_token = create_student_token(
            student_id=int(current["sub"]),
            enrollment=current.get("enrollment", ""),
            name=current.get("name", ""),
            course=current.get("course", "B.Tech"),
            branch=current.get("branch", "General"),
            year=current.get("year", 1),
        )
    else:
        new_token = create_token(
            user_id=int(current["sub"]),
            email=current.get("email", ""),
            role=current.get("role", "teacher"),
            name=current.get("name", ""),
        )
    _set_auth_cookie(response, new_token)
    return {"access_token": new_token, "user": current}


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
