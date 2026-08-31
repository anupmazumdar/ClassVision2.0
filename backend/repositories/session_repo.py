from typing import Optional

from sqlalchemy.orm import Session

from models import ClassSession
from utils.time import utc_now


def list_recent_sessions(db: Session, limit: int = 50):
    return db.query(ClassSession).order_by(ClassSession.started_at.desc()).limit(limit).all()


def close_active_sessions_for_teacher(db: Session, teacher_id: int) -> None:
    db.query(ClassSession).filter(
        ClassSession.teacher_id == teacher_id,
        ClassSession.is_active == True,
    ).update({"is_active": False, "ended_at": utc_now()})


def create_session(
    db: Session,
    *,
    subject: str,
    room: str,
    teacher_id: int,
    room_lat: Optional[float] = None,
    room_lng: Optional[float] = None,
    radius_meters: float = 100.0,
    require_code: bool = False,
):
    session = ClassSession(
        subject=subject,
        room=room,
        teacher_id=teacher_id,
        room_lat=room_lat,
        room_lng=room_lng,
        radius_meters=radius_meters,
        require_code=require_code,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def get_session_by_id(db: Session, session_id: int):
    return db.query(ClassSession).filter(ClassSession.id == session_id).first()


def stop_session(db: Session, session: ClassSession) -> None:
    session.is_active = False
    session.ended_at = utc_now()
    db.commit()


def delete_session(db: Session, session: ClassSession) -> None:
    db.delete(session)
    db.commit()


def count_closed_sessions(db: Session) -> int:
    return db.query(ClassSession).filter(ClassSession.is_active == False).count()
