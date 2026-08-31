from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from middleware.jwt_middleware import get_current_user, require_admin, require_teacher_or_admin
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
    current: dict = Depends(require_teacher_or_admin),
):
    return session_service.start_session(
        db,
        subject=body.subject,
        room=body.room,
        teacher_id=int(current["sub"]),
        room_lat=body.room_lat,
        room_lng=body.room_lng,
        radius_meters=body.radius_meters or 100.0,
        require_code=bool(body.require_code),
    )


@router.get("/{session_id}/code")
def get_session_code(
    session_id: int,
    _: dict = Depends(require_teacher_or_admin),
):
    """Only teachers and admins can query the rolling code API to display on screen."""
    return session_service.get_current_session_code(session_id)


@router.put("/{session_id}/stop")
def stop_session(
    session_id: int,
    db: Session = Depends(get_db),
    current: dict = Depends(require_teacher_or_admin),
):
    return session_service.stop_session(
        db,
        session_id,
        current_user_id=int(current["sub"]),
        current_user_role=current.get("role"),
    )


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
    current: dict = Depends(require_teacher_or_admin),
):
    session_service.delete_session(
        db,
        session_id,
        current_user_id=int(current["sub"]),
        current_user_role=current.get("role"),
    )
