from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from middleware.jwt_middleware import require_teacher_or_admin
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
    db: Session = Depends(get_db),
    _: dict = Depends(require_teacher_or_admin),
):
    """Only teachers and admins can send attendance reports via email."""
    return report_service.email_report(db, session_id, body.to)
