import os
from contextlib import asynccontextmanager
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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
    assistant_router,
    attendance_router,
    auth_router,
    material_router,
    report_router,
    session_router,
    student_router,
    user_router,
)
from services import auth_service


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
        )
    finally:
        db.close()
    yield


app = FastAPI(title="ClassVision API", version="2.0.0", lifespan=lifespan)

# CORS configuration supporting custom domains, Vercel deployments, and localhost
cors_env = os.getenv("CORS_ORIGINS", "")
explicit_origins = [o.strip() for o in cors_env.split(",") if o.strip() and o.strip() != "*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=explicit_origins if explicit_origins else ["*"] if ENVIRONMENT.lower() != "production" else [],
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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


if __name__ == "__main__":
    uvicorn.run("main:app", host=SERVER_HOST, port=SERVER_PORT, reload=True)
