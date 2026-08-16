import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import os
from config import (
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
    attendance_router,
    auth_router,
    report_router,
    session_router,
    student_router,
    user_router,
)
from services import auth_service

app = FastAPI(title="ClassVision API", version="2.0.0")

# Tighten CORS in production, allow development origins locally
cors_env = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173")
allowed_origins = cors_env.split(",") if ENVIRONMENT.lower() == "production" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    check_security_config()
    init_db()
    db = SessionLocal()
    try:
        auth_service.seed_default_admin(
            db,
            name=DEFAULT_ADMIN_NAME,
            email=DEFAULT_ADMIN_EMAIL,
            password=DEFAULT_ADMIN_PASSWORD,
        )
    finally:
        db.close()


@app.get("/")
def root() -> dict:
    return {"status": "ClassVision running", "version": "2.0.0"}


app.include_router(auth_router)
app.include_router(student_router)
app.include_router(session_router)
app.include_router(attendance_router)
app.include_router(user_router)
app.include_router(report_router)


if __name__ == "__main__":
    uvicorn.run("main:app", host=SERVER_HOST, port=SERVER_PORT, reload=True)
