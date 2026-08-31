from typing import Optional
from sqlalchemy.orm import Session

from auth import hash_password
from models import AttendanceRecord, Student
from utils.time import utc_now


def list_students(db: Session):
    return db.query(Student).order_by(Student.name).all()


def get_student_by_id(db: Session, student_id: int):
    return db.query(Student).filter(Student.id == student_id).first()


def get_student_by_enrollment(db: Session, enrollment: str):
    return db.query(Student).filter(Student.enrollment == enrollment).first()


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
    pin: Optional[str] = "1234",
    device_id: Optional[str] = None,
):
    resolved_branch = branch if branch is not None else department
    student = Student(
        enrollment=enrollment,
        name=name,
        department=resolved_branch,
        branch=resolved_branch,
        course=course or "B.Tech",
        year=year or 1,
        semester=semester or 1,
        admission_year=admission_year or 2026,
        status="active",
        pin_hash=hash_password(pin or "1234"),
        device_id=device_id,
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


def auto_promote_academic_years(db: Session, current_year: int = 2026) -> dict:
    """Automatically recalculates and updates academic year & semester based on admission year."""
    students = db.query(Student).all()
    updated_count = 0

    for s in students:
        adm_yr = s.admission_year or 2026
        diff = max(0, current_year - adm_yr)
        calc_year = min(5, diff + 1)
        calc_sem = min(10, calc_year * 2)

        max_course_years = 4
        if "M.Tech" in (s.course or "") or "MCA" in (s.course or "") or "MBA" in (s.course or ""):
            max_course_years = 2
        elif "Diploma" in (s.course or "") or "BCA" in (s.course or "") or "BBA" in (s.course or ""):
            max_course_years = 3

        if calc_year > max_course_years:
            s.status = "graduated"
            s.year = max_course_years
            s.semester = max_course_years * 2
        else:
            s.year = calc_year
            s.semester = calc_sem
            s.status = "active"

        updated_count += 1

    db.commit()
    return {"updated_count": updated_count, "current_year": current_year}


def update_student_face_encodings(db: Session, student: Student, encodings_json: str) -> None:
    student.face_encodings = encodings_json
    db.commit()


def record_face_consent(db: Session, student: Student) -> None:
    student.consent_given = True
    student.consent_at = utc_now()
    db.commit()


def get_student_by_device_id(db: Session, device_id: str) -> Optional[Student]:
    """Finds any student currently active on this device."""
    if not device_id:
        return None
    return db.query(Student).filter(Student.device_id == device_id).first()


def bind_student_device(db: Session, student: Student, device_id: str) -> None:
    student.device_id = device_id
    student.device_approval_status = "approved"
    student.pending_device_id = None
    student.pending_device_info = None
    student.device_bound_at = utc_now()
    student.last_login_at = utc_now()
    db.commit()


def request_device_switch(db: Session, student: Student, new_device_id: str, device_info: Optional[str] = None) -> None:
    student.device_approval_status = "pending_approval"
    student.pending_device_id = new_device_id
    student.pending_device_info = device_info or "Web/Mobile Browser"
    student.last_login_at = utc_now()
    db.commit()


def approve_device_switch(db: Session, student: Student) -> None:
    if student.pending_device_id:
        student.device_id = student.pending_device_id
    student.device_approval_status = "approved"
    student.pending_device_id = None
    student.pending_device_info = None
    student.device_bound_at = utc_now()
    db.commit()


def reject_device_switch(db: Session, student: Student) -> None:
    student.device_approval_status = "rejected"
    student.pending_device_id = None
    student.pending_device_info = None
    db.commit()


def list_pending_device_requests(db: Session) -> List[Student]:
    return db.query(Student).filter(Student.device_approval_status == "pending_approval").all()


def reset_student_device(db: Session, student: Student) -> None:
    student.device_id = None
    student.device_approval_status = "approved"
    student.pending_device_id = None
    student.pending_device_info = None
    student.device_bound_at = None
    db.commit()


def unbind_student_device(db: Session, student: Student) -> None:
    reset_student_device(db, student)


def delete_student_attendance(db: Session, student_id: int) -> None:
    db.query(AttendanceRecord).filter(AttendanceRecord.student_id == student_id).delete()


def delete_student(db: Session, student: Student) -> None:
    db.delete(student)
    db.commit()


def count_students(db: Session) -> int:
    return db.query(Student).count()
