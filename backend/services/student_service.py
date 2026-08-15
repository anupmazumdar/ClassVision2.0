import json

from fastapi import HTTPException
from sqlalchemy.orm import Session

from repositories import student_repo

from .face_service import decode_image, extract_encodings


def list_students(db: Session) -> list[dict]:
    students = student_repo.list_students(db)
    return [
        {
            "id": s.id,
            "enrollment": s.enrollment,
            "name": s.name,
            "department": s.department,
            "has_face": bool(json.loads(s.face_encodings or "[]")),
            "created_at": s.created_at.isoformat(),
        }
        for s in students
    ]


def create_student(db: Session, enrollment: str, name: str, department: str) -> dict:
    existing = student_repo.get_student_by_enrollment(db, enrollment)
    if existing:
        raise HTTPException(status_code=400, detail="Enrollment number already exists")

    student = student_repo.create_student(db, enrollment=enrollment, name=name, department=department)
    return {"id": student.id, "enrollment": student.enrollment, "name": student.name}


def register_face(db: Session, student_id: int, images: list[str]) -> dict:
    student = student_repo.get_student_by_id(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    all_encodings = []
    for b64 in images:
        try:
            img_array = decode_image(b64)
            all_encodings.extend(extract_encodings(img_array))
        except Exception:
            continue

    if not all_encodings:
        raise HTTPException(
            status_code=422,
            detail="No face detected in the provided image(s). Please use a clear, well-lit photo.",
        )

    student_repo.update_student_face_encodings(db, student, json.dumps(all_encodings))
    return {"message": f"Registered {len(all_encodings)} face encoding(s) for {student.name}"}


def delete_student(db: Session, student_id: int) -> None:
    student = student_repo.get_student_by_id(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    student_repo.delete_student_attendance(db, student_id)
    student_repo.delete_student(db, student)
