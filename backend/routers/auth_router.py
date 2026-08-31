from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from database import get_db
from middleware.jwt_middleware import (
    check_login_rate_limit,
    get_client_ip,
    get_current_user,
    record_failed_login,
    require_admin,
)
from schemas.auth_schema import LoginRequest, RegisterRequest
from services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
def login(request: Request, body: LoginRequest, db: Session = Depends(get_db)):
    client_ip = get_client_ip(request)
    check_login_rate_limit(client_ip)

    try:
        result = auth_service.login(db, body.email, body.password)
        return result
    except HTTPException:
        record_failed_login(client_ip)
        raise


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
