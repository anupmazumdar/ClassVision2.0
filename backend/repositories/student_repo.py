from sqlalchemy.orm import Session

from models import AttendanceRecord, Student


def list_students(db: Session):
    return db.query(Student).order_by(Student.name).all()


def get_student_by_id(db: Session, student_id: int):
    return db.query(Student).filter(Student.id == student_id).first()


def get_student_by_enrollment(db: Session, enrollment: str):
    return db.query(Student).filter(Student.enrollment == enrollment).first()


def create_student(db: Session, *, enrollment: str, name: str, department: str):
    student = Student(enrollment=enrollment, name=name, department=department)
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


def update_student_face_encodings(db: Session, student: Student, encodings_json: str) -> None:
    student.face_encodings = encodings_json
    db.commit()


def delete_student_attendance(db: Session, student_id: int) -> None:
    db.query(AttendanceRecord).filter(AttendanceRecord.student_id == student_id).delete()


def delete_student(db: Session, student: Student) -> None:
    db.delete(student)
    db.commit()


def count_students(db: Session) -> int:
    return db.query(Student).count()
