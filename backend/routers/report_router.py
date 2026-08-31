from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from database import get_db
from middleware.jwt_middleware import check_email_rate_limit, get_client_ip, require_teacher_or_admin
from schemas.report_schema import EmailRequest
from services import report_service

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/student-summary")
def student_summary(
    db: Session = Depends(get_db),
    _: dict = Depends(require_teacher_or_admin),
):
    """Only teachers and admins can view full student attendance summaries."""
    return report_service.get_student_summary(db)


@router.get("/{session_id}/pdf")
def export_pdf(
    session_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(require_teacher_or_admin),
):
    """Only teachers and admins can export session PDF reports."""
    return report_service.export_pdf(db, session_id)


@router.get("/{session_id}/excel")
def export_excel(
    session_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(require_teacher_or_admin),
):
    """Only teachers and admins can export session Excel spreadsheets."""
    return report_service.export_excel(db, session_id)


@router.post("/{session_id}/email")
def email_report(
    session_id: int,
    body: EmailRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin),
):
    """Only teachers and admins can send attendance reports via email."""
    client_ip = get_client_ip(request)
    rate_key = f"{current_user.get('sub')}:{client_ip}"
    check_email_rate_limit(rate_key, max_requests=5, window_seconds=60)
    return report_service.email_report(db, session_id, body.to)
