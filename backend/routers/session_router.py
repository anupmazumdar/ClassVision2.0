from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from middleware.jwt_middleware import get_current_user, require_admin
from schemas.session_schema import SessionCreate
from services import session_service

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.get("")
def list_sessions(db: Session = Depends(get_db), _: dict = Depends(get_current_user)):
    return session_service.list_sessions(db)


@router.post("", status_code=201)
def start_session(
    body: SessionCreate,
    db: Session = Depends(get_db),
    current: dict = Depends(get_current_user),
):
    return session_service.start_session(db, body.subject, body.room, int(current["sub"]))


@router.put("/{session_id}/stop")
def stop_session(
    session_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    return session_service.stop_session(db, session_id)


@router.get("/{session_id}")
def get_session(
    session_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    return session_service.get_session(db, session_id)


@router.delete("/{session_id}", status_code=204)
def delete_session(
    session_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
):
    session_service.delete_session(db, session_id)
