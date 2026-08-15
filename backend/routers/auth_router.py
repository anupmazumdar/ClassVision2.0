from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from middleware.jwt_middleware import get_current_user, require_admin
from schemas.auth_schema import LoginRequest, RegisterRequest
from services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
def login(body: LoginRequest, db: Session = Depends(get_db)):
    return auth_service.login(db, body.email, body.password)


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
