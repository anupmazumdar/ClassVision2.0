from fastapi import HTTPException
from sqlalchemy.orm import Session

from repositories import attendance_repo, session_repo


def list_sessions(db: Session) -> list[dict]:
    sessions = session_repo.list_recent_sessions(db)
    result = []
    for s in sessions:
        present_count = attendance_repo.count_by_session(db, s.id)
        result.append(
            {
                "id": s.id,
                "subject": s.subject,
                "room": s.room,
                "is_active": s.is_active,
                "started_at": s.started_at.isoformat(),
                "ended_at": s.ended_at.isoformat() if s.ended_at else None,
                "present_count": present_count,
            }
        )
    return result


def start_session(db: Session, subject: str, room: str, teacher_id: int) -> dict:
    session_repo.close_active_sessions_for_teacher(db, teacher_id)
    session = session_repo.create_session(db, subject=subject, room=room, teacher_id=teacher_id)
    return {"id": session.id, "subject": session.subject, "started_at": session.started_at.isoformat()}


def stop_session(db: Session, session_id: int) -> dict:
    session = session_repo.get_session_by_id(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session_repo.stop_session(db, session)
    count = attendance_repo.count_by_session(db, session_id)
    return {"message": "Session ended", "present_count": count}


def get_session(db: Session, session_id: int) -> dict:
    session = session_repo.get_session_by_id(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    records = attendance_repo.list_session_records_with_students(db, session_id)
    attendance = [
        {
            "student_id": s.id,
            "enrollment": s.enrollment,
            "name": s.name,
            "department": s.department,
            "confidence": r.confidence,
            "marked_at": r.marked_at.isoformat(),
        }
        for r, s in records
    ]

    return {
        "id": session.id,
        "subject": session.subject,
        "room": session.room,
        "is_active": session.is_active,
        "started_at": session.started_at.isoformat(),
        "ended_at": session.ended_at.isoformat() if session.ended_at else None,
        "attendance": attendance,
    }


def delete_session(db: Session, session_id: int) -> None:
    session = session_repo.get_session_by_id(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    attendance_repo.delete_by_session(db, session_id)
    session_repo.delete_session(db, session)
