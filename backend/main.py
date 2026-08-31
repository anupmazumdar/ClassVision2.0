import os
from contextlib import asynccontextmanager
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import (
    ADMIN_ALIAS_EMAIL,
    ALLOWED_ORIGINS,
    DEFAULT_ADMIN_EMAIL,
    DEFAULT_ADMIN_NAME,
    DEFAULT_ADMIN_PASSWORD,
    ENVIRONMENT,
    SERVER_HOST,
    SERVER_PORT,
    check_security_config,
)
from database import SessionLocal, init_db
from routers import (
    assistant_router,
    attendance_router,
    audit_router,
    auth_router,
    material_router,
    report_router,
    session_router,
    student_router,
    user_router,
)
import logging
from starlette.requests import Request
from starlette.responses import JSONResponse

from middleware.security_headers import SecurityHeadersMiddleware
from services import auth_service

logger = logging.getLogger("classvision.api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    check_security_config()
    # In production, database schema migrations are managed via Alembic:
    # alembic upgrade head
    init_db()
    db = SessionLocal()
    try:
        auth_service.seed_default_admin(
            db,
            name=DEFAULT_ADMIN_NAME,
            email=DEFAULT_ADMIN_EMAIL,
            password=DEFAULT_ADMIN_PASSWORD,
            alias_email=ADMIN_ALIAS_EMAIL,
        )
    finally:
        db.close()
    yield


app = FastAPI(title="ClassVision API", version="2.0.0", lifespan=lifespan)

# Add OWASP standard security response headers
app.add_middleware(SecurityHeadersMiddleware)

# Environment-driven explicit CORS origin configuration with credential support
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With", "X-Auth-Mode"],
)


@app.exception_handler(Exception)
async def global_unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catches unhandled exceptions, logs full traceback server-side, and returns a sanitized generic 500 JSON response."""
    logger.exception("Unhandled server error on %s %s: %s", request.method, request.url.path, exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected internal server error occurred. A diagnostic report has been logged."},
    )


@app.get("/")
def root() -> dict:
    return {"status": "ClassVision running", "version": "2.0.0"}


app.include_router(auth_router)
app.include_router(student_router)
app.include_router(session_router)
app.include_router(attendance_router)
app.include_router(user_router)
app.include_router(report_router)
app.include_router(material_router)
app.include_router(assistant_router)
app.include_router(audit_router)


if __name__ == "__main__":
    uvicorn.run("main:app", host=SERVER_HOST, port=SERVER_PORT, reload=True)
