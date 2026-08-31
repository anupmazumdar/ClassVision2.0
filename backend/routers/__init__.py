from .assistant_router import router as assistant_router
from .attendance_router import router as attendance_router
from .audit_router import router as audit_router
from .auth_router import router as auth_router
from .material_router import router as material_router
from .report_router import router as report_router
from .session_router import router as session_router
from .student_router import router as student_router
from .user_router import router as user_router

__all__ = [
    "auth_router",
    "student_router",
    "session_router",
    "attendance_router",
    "report_router",
    "user_router",
    "material_router",
    "assistant_router",
    "audit_router",
]
