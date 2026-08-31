from sqlalchemy import Column, DateTime, Integer, String, Text

from utils.time import utc_now
from .base import Base


class AccessAuditLog(Base):
    """
    Immutable, Append-Only Access & Security Audit Ledger (WORM - Write Once, Read Many).
    Once created, log entries can NEVER be deleted or modified.
    Each entry is cryptographically linked to the previous log via SHA-256 hash chaining.
    """
    __tablename__ = "access_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)
    event_type = Column(String(100), nullable=False, index=True)  # STUDENT_LOGIN, DEVICE_BOUND, DEVICE_SWITCH_REQUEST, ATTENDANCE_CHECKIN, MATERIAL_ACCESS, DEVICE_APPROVED, SECURITY_BLOCKED
    actor_type = Column(String(50), nullable=False)  # student, teacher, admin, system
    actor_id = Column(String(255), nullable=False, index=True)  # Enrollment, email, or user identifier
    ip_address = Column(String(100), nullable=True)
    device_id = Column(String(255), nullable=True, index=True)
    details = Column(Text, default="{}")  # JSON or text description
    prev_hash = Column(String(64), nullable=True)  # SHA-256 hash of previous log entry
    log_hash = Column(String(64), nullable=False)  # SHA-256 tamper-evident digest of this record
