from datetime import datetime

from sqlalchemy.orm import Session

from models import ClassSession


def list_recent_sessions(db: Session, limit: int = 50):
    return db.query(ClassSession).order_by(ClassSession.started_at.desc()).limit(limit).all()


def close_active_sessions_for_teacher(db: Session, teacher_id: int) -> None:
    db.query(ClassSession).filter(
        ClassSession.teacher_id == teacher_id,
        ClassSession.is_active == True,
    ).update({"is_active": False, "ended_at": datetime.utcnow()})


def create_session(db: Session, *, subject: str, room: str, teacher_id: int):
    session = ClassSession(subject=subject, room=room, teacher_id=teacher_id)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def get_session_by_id(db: Session, session_id: int):
    return db.query(ClassSession).filter(ClassSession.id == session_id).first()


def stop_session(db: Session, session: ClassSession) -> None:
    session.is_active = False
    session.ended_at = datetime.utcnow()
    db.commit()


def delete_session(db: Session, session: ClassSession) -> None:
    db.delete(session)
    db.commit()


def count_closed_sessions(db: Session) -> int:
    return db.query(ClassSession).filter(ClassSession.is_active == False).count()
