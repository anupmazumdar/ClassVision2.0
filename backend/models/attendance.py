from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer

from .base import Base


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"))
    student_id = Column(Integer, ForeignKey("students.id"))
    confidence = Column(Float, default=0.0)
    marked_at = Column(DateTime, default=datetime.utcnow)
