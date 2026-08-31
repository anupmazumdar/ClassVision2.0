import json
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from repositories import student_repo
from .face_service import decode_image, extract_encodings


def list_students(db: Session, caller_role: str = "teacher") -> list[dict]:
    students = student_repo.list_students(db)
    if caller_role == "student":
        # Restrict sensitive biometric & consent audit metadata from general student view
        return [
            {
                "id": s.id,
                "enrollment": s.enrollment,
                "name": s.name,
                "department": s.department or s.branch or "",
                "branch": s.branch or s.department or "",
                "course": s.course or "B.Tech",
                "year": s.year or 1,
                "semester": s.semester or 1,
                "status": s.status or "active",
            }
            for s in students
        ]

    # Full administrative & biometric metadata for teachers and admins
    return [
        {
            "id": s.id,
            "enrollment": s.enrollment,
            "name": s.name,
            "department": s.department or s.branch or "",
            "branch": s.branch or s.department or "",
            "course": s.course or "B.Tech",
            "year": s.year or 1,
            "semester": s.semester or 1,
            "admission_year": s.admission_year or 2026,
            "status": s.status or "active",
            "has_face": bool(json.loads(s.face_encodings or "[]")),
            "consent_given": bool(s.consent_given),
            "consent_at": s.consent_at.isoformat() if s.consent_at else None,
            "device_id": s.device_id,
            "created_at": s.created_at.isoformat(),
        }
        for s in students
    ]


def create_student(
    db: Session,
    *,
    enrollment: str,
    name: str,
    department: str = "",
    branch: Optional[str] = None,
    course: str = "B.Tech",
    year: int = 1,
    semester: int = 1,
    admission_year: int = 2026,
) -> dict:
    existing = student_repo.get_student_by_enrollment(db, enrollment)
    if existing:
        raise HTTPException(status_code=400, detail="Enrollment number already exists")

    resolved_branch = branch if branch is not None else department
    student = student_repo.create_student(
        db,
        enrollment=enrollment,
        name=name,
        department=resolved_branch,
        branch=resolved_branch,
        course=course or "B.Tech",
        year=year or 1,
        semester=semester or 1,
        admission_year=admission_year or 2026,
    )
    return {
        "id": student.id,
        "enrollment": student.enrollment,
        "name": student.name,
        "branch": student.branch,
        "course": student.course,
        "year": student.year,
        "semester": student.semester,
        "admission_year": student.admission_year,
    }


def auto_promote_students(db: Session, current_year: int = 2026) -> dict:
    return student_repo.auto_promote_academic_years(db, current_year=current_year)


def register_face(db: Session, student_id: int, images: list[str], consent: bool = False) -> dict:
    if not consent:
        raise HTTPException(
            status_code=400,
            detail="Biometric Compliance: Consent is required before facial biometric data can be registered.",
        )

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
    student_repo.record_face_consent(db, student)

    return {
        "message": f"Registered {len(all_encodings)} face encoding(s) for {student.name}",
        "consent_recorded": True,
    }


def delete_student(db: Session, student_id: int) -> None:
    student = student_repo.get_student_by_id(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    student_repo.delete_student_attendance(db, student_id)
    student_repo.delete_student(db, student)
