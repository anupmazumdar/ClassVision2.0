from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from middleware.jwt_middleware import get_current_user, require_admin, require_teacher_or_admin
from schemas.student_schema import FaceRegisterRequest, StudentCreate
from services import student_service

router = APIRouter(prefix="/students", tags=["students"])


@router.get("")
def list_students(db: Session = Depends(get_db), _: dict = Depends(get_current_user)):
    return student_service.list_students(db)


@router.post("", status_code=201)
def create_student(
    body: StudentCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_teacher_or_admin),
):
    return student_service.create_student(db, body.enrollment, body.name, body.department)


@router.post("/{student_id}/register-face")
def register_face(
    student_id: int,
    body: FaceRegisterRequest,
    db: Session = Depends(get_db),
    _: dict = Depends(require_teacher_or_admin),
):
    return student_service.register_face(db, student_id, body.images)


@router.delete("/{student_id}", status_code=204)
def delete_student(
    student_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
):
    student_service.delete_student(db, student_id)
