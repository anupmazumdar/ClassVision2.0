from sqlalchemy import Boolean, Column, DateTime, Integer, String

from utils.crypto import EncryptedText
from utils.time import utc_now
from .base import Base


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    enrollment = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    department = Column(String, default="")  # Branch/Department
    branch = Column(String, default="")  # Branch alias
    course = Column(String, default="B.Tech")  # B.Tech, M.Tech, BCA, MCA, etc.
    year = Column(Integer, default=1)  # 1, 2, 3, 4
    semester = Column(Integer, default=1)  # 1 to 8
    admission_year = Column(Integer, default=2026)  # Calendar year of admission for auto-progression
    status = Column(String, default="active")  # active, graduated, inactive
    face_encodings = Column(EncryptedText, default="[]")
    device_id = Column(String, nullable=True)  # Bound device identifier
    device_approval_status = Column(String, default="approved")  # approved, pending_approval, rejected
    pending_device_id = Column(String, nullable=True)
    pending_device_info = Column(String, nullable=True)
    device_bound_at = Column(DateTime(timezone=True), nullable=True)
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    consent_given = Column(Boolean, default=False, nullable=False)  # Biometric GDPR/Consent Flag
    consent_at = Column(DateTime(timezone=True), nullable=True)  # Consent grant timestamp
    created_at = Column(DateTime(timezone=True), default=utc_now)
