from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from middleware.jwt_middleware import get_current_user
from schemas.attendance_schema import MarkRequest, RecognizeRequest
from services import attendance_service

router = APIRouter(prefix="/attendance", tags=["attendance"])


@router.post("/recognize")
def recognize(
    body: RecognizeRequest,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    return attendance_service.recognize(db, body.image, frames=body.frames)


@router.post("/{session_id}/mark", status_code=201)
def mark_attendance(
    session_id: int,
    body: MarkRequest,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    return attendance_service.mark_attendance(
        db,
        session_id=session_id,
        student_id=body.student_id,
        confidence=body.confidence,
        lat=body.lat,
        lng=body.lng,
        code=body.code,
        device_id=body.device_id,
        frames=body.frames,
    )


@router.delete("/{session_id}/unmark/{student_id}", status_code=204)
def unmark_attendance(
    session_id: int,
    student_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    attendance_service.unmark_attendance(db, session_id, student_id)
