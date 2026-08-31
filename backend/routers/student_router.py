from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from middleware.jwt_middleware import get_current_user, require_admin, require_teacher_or_admin
from schemas.student_schema import FaceRegisterRequest, StudentCreate
from services import student_service

router = APIRouter(prefix="/students", tags=["students"])


@router.get("")
def list_students(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    role = current_user.get("role", "student")
    return student_service.list_students(db, caller_role=role)


@router.post("", status_code=201)
def create_student(
    body: StudentCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_teacher_or_admin),
):
    return student_service.create_student(
        db,
        enrollment=body.enrollment,
        name=body.name,
        department=body.department or body.branch or "",
        branch=body.branch or body.department or "",
        course=body.course or "B.Tech",
        year=body.year or 1,
        semester=body.semester or 1,
        admission_year=body.admission_year or 2026,
    )


@router.post("/auto-promote")
def auto_promote_students(
    current_year: int = Query(default=2026),
    db: Session = Depends(get_db),
    _: dict = Depends(require_teacher_or_admin),
):
    """Recalculate and auto-promote all student academic years and semesters based on admission year."""
    return student_service.auto_promote_students(db, current_year=current_year)


@router.post("/{student_id}/register-face")
def register_face(
    student_id: int,
    body: FaceRegisterRequest,
    db: Session = Depends(get_db),
    _: dict = Depends(require_teacher_or_admin),
):
    return student_service.register_face(db, student_id, body.images, consent=body.consent)


@router.get("/device-requests")
def list_device_requests(
    db: Session = Depends(get_db),
    _: dict = Depends(require_teacher_or_admin),
):
    return student_service.list_device_requests(db)


@router.post("/{student_id}/approve-device")
def approve_device(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin),
):
    return student_service.approve_device_request(db, student_id, approver=current_user)


@router.post("/{student_id}/reject-device")
def reject_device(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin),
):
    return student_service.reject_device_request(db, student_id, approver=current_user)


@router.post("/{student_id}/reset-device")
def reset_device(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin),
):
    return student_service.reset_student_device(db, student_id, approver=current_user)


@router.delete("/{student_id}", status_code=204)
def delete_student(
    student_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
):
    student_service.delete_student(db, student_id)
