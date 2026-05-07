from sqlalchemy import Column, String, Integer, Float, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id         = Column(Integer, primary_key=True)
    name       = Column(String(100), nullable=False)
    email      = Column(String(150), unique=True, nullable=False)
    password   = Column(String(200), nullable=False)
    role       = Column(String(20), default="student")  # superadmin/admin/teacher/student
    enrollment = Column(String(30), unique=True, nullable=True)
    department = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active  = Column(Boolean, default=True)

class Session(Base):
    __tablename__ = "sessions"
    id         = Column(Integer, primary_key=True)
    subject    = Column(String(100), nullable=False)
    teacher_id = Column(Integer, ForeignKey("users.id"))
    room       = Column(String(50))
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at   = Column(DateTime, nullable=True)
    is_active  = Column(Boolean, default=True)

class AttendanceRecord(Base):
    __tablename__ = "attendance"
    id         = Column(Integer, primary_key=True)
    session_id = Column(Integer, ForeignKey("sessions.id"))
    enrollment = Column(String(30))
    name       = Column(String(100))
    timestamp  = Column(DateTime, default=datetime.utcnow)
    confidence = Column(Float, nullable=True)

class EmotionRecord(Base):
    __tablename__ = "emotions"
    id         = Column(Integer, primary_key=True)
    session_id = Column(Integer, ForeignKey("sessions.id"))
    emotion    = Column(String(20))
    timestamp  = Column(DateTime, default=datetime.utcnow)

class AttentionRecord(Base):
    __tablename__ = "attention"
    id           = Column(Integer, primary_key=True)
    session_id   = Column(Integer, ForeignKey("sessions.id"))
    is_attentive = Column(Boolean)
    yaw          = Column(Float)
    pitch        = Column(Float)
    timestamp    = Column(DateTime, default=datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id         = Column(Integer, primary_key=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=True)
    action     = Column(String(100))
    detail     = Column(Text, nullable=True)
    ip_address = Column(String(50), nullable=True)
    timestamp  = Column(DateTime, default=datetime.utcnow)
