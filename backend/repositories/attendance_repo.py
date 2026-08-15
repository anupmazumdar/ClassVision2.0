from sqlalchemy.orm import Session

from models import AttendanceRecord, Student


def count_by_session(db: Session, session_id: int) -> int:
    return db.query(AttendanceRecord).filter(AttendanceRecord.session_id == session_id).count()


def count_by_student(db: Session, student_id: int) -> int:
    return db.query(AttendanceRecord).filter(AttendanceRecord.student_id == student_id).count()


def get_session_student_record(db: Session, session_id: int, student_id: int):
    return db.query(AttendanceRecord).filter(
        AttendanceRecord.session_id == session_id,
        AttendanceRecord.student_id == student_id,
    ).first()


def create_record(db: Session, *, session_id: int, student_id: int, confidence: float):
    record = AttendanceRecord(session_id=session_id, student_id=student_id, confidence=confidence)
    db.add(record)
    db.commit()
    return record


def delete_session_student_record(db: Session, session_id: int, student_id: int) -> bool:
    record = get_session_student_record(db, session_id, student_id)
    if not record:
        return False
    db.delete(record)
    db.commit()
    return True


def delete_by_session(db: Session, session_id: int) -> None:
    db.query(AttendanceRecord).filter(AttendanceRecord.session_id == session_id).delete()


def list_session_records_with_students(db: Session, session_id: int):
    return (
        db.query(AttendanceRecord, Student)
        .join(Student, AttendanceRecord.student_id == Student.id)
        .filter(AttendanceRecord.session_id == session_id)
        .order_by(Student.name)
        .all()
    )
