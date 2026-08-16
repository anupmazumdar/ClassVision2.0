import hashlib
import time
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from config import SESSION_CODE_SECRET
from repositories import attendance_repo, session_repo

CODE_ROTATION_WINDOW = 30  # seconds


def _generate_code(session_id: int, time_step: int) -> str:
    seed = f"{session_id}:{SESSION_CODE_SECRET}:{time_step}".encode()
    digest = hashlib.sha256(seed).hexdigest()
    # Pick a 6-digit integer from the hash
    num = int(digest[:8], 16) % 1000000
    return f"{num:06d}"


def get_current_session_code(session_id: int) -> dict:
    now = int(time.time())
    current_step = now // CODE_ROTATION_WINDOW
    expires_in = CODE_ROTATION_WINDOW - (now % CODE_ROTATION_WINDOW)
    code = _generate_code(session_id, current_step)
    return {
        "code": code,
        "expires_in": expires_in,
        "window_seconds": CODE_ROTATION_WINDOW,
    }


def verify_session_code(session_id: int, code: str) -> bool:
    if not code:
        return False
    clean_code = str(code).strip()
    now = int(time.time())
    current_step = now // CODE_ROTATION_WINDOW
    # Check current window and previous window (grace period for network latency)
    for step in (current_step, current_step - 1):
        if _generate_code(session_id, step) == clean_code:
            return True
    return False


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
                "room_lat": s.room_lat,
                "room_lng": s.room_lng,
                "radius_meters": s.radius_meters,
                "require_code": s.require_code,
            }
        )
    return result


def start_session(
    db: Session,
    subject: str,
    room: str,
    teacher_id: int,
    room_lat: Optional[float] = None,
    room_lng: Optional[float] = None,
    radius_meters: float = 100.0,
    require_code: bool = False,
) -> dict:
    session_repo.close_active_sessions_for_teacher(db, teacher_id)
    session = session_repo.create_session(
        db,
        subject=subject,
        room=room,
        teacher_id=teacher_id,
        room_lat=room_lat,
        room_lng=room_lng,
        radius_meters=radius_meters,
        require_code=require_code,
    )
    return {
        "id": session.id,
        "subject": session.subject,
        "started_at": session.started_at.isoformat(),
        "require_code": session.require_code,
        "room_lat": session.room_lat,
        "room_lng": session.room_lng,
        "radius_meters": session.radius_meters,
    }


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
        "room_lat": session.room_lat,
        "room_lng": session.room_lng,
        "radius_meters": session.radius_meters,
        "require_code": session.require_code,
        "attendance": attendance,
    }


def delete_session(db: Session, session_id: int) -> None:
    session = session_repo.get_session_by_id(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    attendance_repo.delete_by_session(db, session_id)
    session_repo.delete_session(db, session)
