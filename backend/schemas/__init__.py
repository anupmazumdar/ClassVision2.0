from .attendance_schema import MarkRequest, RecognizeRequest
from .auth_schema import LoginRequest, RegisterRequest
from .report_schema import EmailRequest
from .session_schema import SessionCreate
from .student_schema import FaceRegisterRequest, StudentCreate

__all__ = [
    "LoginRequest",
    "RegisterRequest",
    "StudentCreate",
    "FaceRegisterRequest",
    "SessionCreate",
    "RecognizeRequest",
    "MarkRequest",
    "EmailRequest",
]
