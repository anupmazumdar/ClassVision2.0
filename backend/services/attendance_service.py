from fastapi import HTTPException
from sqlalchemy.orm import Session

from repositories import attendance_repo, session_repo, student_repo

from .face_service import decode_image, recognize_faces


def recognize(db: Session, image: str) -> dict:
    try:
        img = decode_image(image)
    except Exception:
        raise HTTPException(status_code=422, detail="Invalid image data")

    students = [s for s in student_repo.list_students(db) if s.face_encodings != "[]"]
    if not students:
        return {"recognized": [], "message": "No students with registered faces"}

    recognized = recognize_faces(img, students)
    return {"recognized": recognized}


def mark_attendance(db: Session, session_id: int, student_id: int, confidence: float) -> dict:
    session = session_repo.get_session_by_id(db, session_id)
    if not session or not session.is_active:
        raise HTTPException(status_code=400, detail="Session not found or not active")

    existing = attendance_repo.get_session_student_record(db, session_id, student_id)
    if existing:
        return {"message": "Already marked", "already_present": True}

    attendance_repo.create_record(
        db,
        session_id=session_id,
        student_id=student_id,
        confidence=confidence,
    )
    return {"message": "Marked present", "already_present": False}


def unmark_attendance(db: Session, session_id: int, student_id: int) -> None:
    attendance_repo.delete_session_student_record(db, session_id, student_id)
