from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from middleware.jwt_middleware import get_current_user, require_teacher_or_admin
from schemas.attendance_schema import ManualMarkRequest, MarkRequest, RecognizeRequest, ScanAndMarkRequest
from services import attendance_service

router = APIRouter(prefix="/attendance", tags=["attendance"])


@router.post("/recognize")
def recognize(
    body: RecognizeRequest,
    db: Session = Depends(get_db),
    _: dict = Depends(require_teacher_or_admin),
):
    if body.session_id:
        return attendance_service.recognize_and_issue_tickets(
            db,
            session_id=body.session_id,
            image=body.image,
            frames=body.frames,
            device_id=body.device_id,
        )
    return attendance_service.recognize_and_issue_tickets(
        db,
        session_id=0,
        image=body.image,
        frames=body.frames,
        device_id=body.device_id,
    )


@router.post("/{session_id}/scan-and-mark", status_code=200)
def scan_and_mark(
    session_id: int,
    body: ScanAndMarkRequest,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    """Atomic server-side check-in: Liveness + Recognition + Geofence + Code + Device Binding."""
    return attendance_service.scan_and_mark_atomic(
        db,
        session_id=session_id,
        image=body.image,
        frames=body.frames,
        lat=body.lat,
        lng=body.lng,
        code=body.code,
        device_id=body.device_id,
    )


@router.post("/{session_id}/mark", status_code=201)
def mark_attendance(
    session_id: int,
    body: MarkRequest,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    """Marks attendance verified by cryptographic attendance ticket."""
    return attendance_service.mark_attendance_with_ticket(
        db,
        session_id=session_id,
        student_id=body.student_id,
        attendance_ticket=body.attendance_ticket or "",
        lat=body.lat,
        lng=body.lng,
        code=body.code,
        device_id=body.device_id,
    )


@router.post("/{session_id}/manual-mark", status_code=201)
def manual_mark(
    session_id: int,
    body: ManualMarkRequest,
    db: Session = Depends(get_db),
    _: dict = Depends(require_teacher_or_admin),
):
    """Teacher/Admin manual attendance mark."""
    return attendance_service.manual_mark_teacher(
        db,
        session_id=session_id,
        student_id=body.student_id,
    )


@router.delete("/{session_id}/unmark/{student_id}", status_code=204)
def unmark_attendance(
    session_id: int,
    student_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(require_teacher_or_admin),
):
    attendance_service.unmark_attendance(db, session_id, student_id)
