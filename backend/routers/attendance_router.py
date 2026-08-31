from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from database import get_db
from middleware.jwt_middleware import (
    check_compute_rate_limit,
    get_client_ip,
    get_current_user,
    require_teacher_or_admin,
)
from schemas.attendance_schema import ManualMarkRequest, MarkRequest, RecognizeRequest, ScanAndMarkRequest, SelfCheckinRequest
from services import attendance_service

router = APIRouter(prefix="/attendance", tags=["attendance"])


@router.post("/self-checkin", status_code=200)
def student_self_checkin(
    request: Request,
    body: SelfCheckinRequest,
    db: Session = Depends(get_db),
):
    """Public self check-in endpoint for students using 6-digit rolling code, GPS geofencing, and facial biometrics."""
    client_ip = get_client_ip(request)
    check_compute_rate_limit(client_ip)

    caller_student_id = None
    try:
        current_user = get_current_user(request)
        if current_user.get("role") == "student":
            caller_student_id = int(current_user["sub"])
    except Exception:
        pass

    return attendance_service.self_checkin_by_student(
        db,
        code=body.code,
        lat=body.lat,
        lng=body.lng,
        image=body.image,
        frames=body.frames,
        device_id=body.device_id,
        client_ip=client_ip,
        caller_student_id=caller_student_id,
    )


@router.post("/recognize")
def recognize(
    request: Request,
    body: RecognizeRequest,
    db: Session = Depends(get_db),
    _: dict = Depends(require_teacher_or_admin),
):
    client_ip = get_client_ip(request)
    check_compute_rate_limit(client_ip)

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
    request: Request,
    body: ScanAndMarkRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Atomic server-side check-in: Liveness + Recognition + Geofence + Code + Device Binding."""
    client_ip = get_client_ip(request)
    check_compute_rate_limit(client_ip)

    caller_student_id = int(current_user["sub"]) if current_user.get("role") == "student" else None
    return attendance_service.scan_and_mark_atomic(
        db,
        session_id=session_id,
        image=body.image,
        frames=body.frames,
        lat=body.lat,
        lng=body.lng,
        code=body.code,
        device_id=body.device_id,
        client_ip=client_ip,
        caller_student_id=caller_student_id,
    )


@router.post("/{session_id}/mark", status_code=201)
def mark_attendance(
    session_id: int,
    request: Request,
    body: MarkRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Marks attendance verified by cryptographic attendance ticket."""
    client_ip = get_client_ip(request)
    caller_student_id = int(current_user["sub"]) if current_user.get("role") == "student" else None
    return attendance_service.mark_attendance_with_ticket(
        db,
        session_id=session_id,
        student_id=body.student_id,
        attendance_ticket=body.attendance_ticket or "",
        lat=body.lat,
        lng=body.lng,
        code=body.code,
        device_id=body.device_id,
        client_ip=client_ip,
        caller_student_id=caller_student_id,
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
