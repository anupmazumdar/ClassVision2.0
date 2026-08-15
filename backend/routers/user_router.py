from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from middleware.jwt_middleware import require_admin
from services import user_service

router = APIRouter(prefix="/users", tags=["users"])


@router.get("")
def list_users(db: Session = Depends(get_db), _: dict = Depends(require_admin)):
    return user_service.list_users(db)


@router.delete("/{user_id}", status_code=204)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current: dict = Depends(require_admin),
):
    user_service.delete_user(db, user_id, current["sub"])
