import logging
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from config import DATABASE_URL
from models import Base

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA busy_timeout=5000")
        cursor.close()
else:
    # PostgreSQL / production dialect configuration with connection pooling
    engine = create_engine(
        DATABASE_URL,
        pool_size=20,
        max_overflow=10,
        pool_pre_ping=True,
        pool_recycle=3600,
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initializes tables for development/testing environments.

    In production deployments, manage declarative schema updates via Alembic:
        alembic upgrade head
    """
    Base.metadata.create_all(bind=engine)
    # Ensure newly added columns exist in existing SQLite databases
    try:
        with engine.begin() as conn:
            if engine.dialect.name == "sqlite":
                res = conn.exec_driver_sql("PRAGMA table_info(students)")
                existing_cols = {row[1] for row in res.fetchall()}
                if existing_cols:
                    if "branch" not in existing_cols:
                        conn.exec_driver_sql("ALTER TABLE students ADD COLUMN branch VARCHAR DEFAULT ''")
                    if "course" not in existing_cols:
                        conn.exec_driver_sql("ALTER TABLE students ADD COLUMN course VARCHAR DEFAULT 'B.Tech'")
                    if "year" not in existing_cols:
                        conn.exec_driver_sql("ALTER TABLE students ADD COLUMN year INTEGER DEFAULT 1")
                    if "semester" not in existing_cols:
                        conn.exec_driver_sql("ALTER TABLE students ADD COLUMN semester INTEGER DEFAULT 1")
                    if "admission_year" not in existing_cols:
                        conn.exec_driver_sql("ALTER TABLE students ADD COLUMN admission_year INTEGER DEFAULT 2026")
                    if "status" not in existing_cols:
                        conn.exec_driver_sql("ALTER TABLE students ADD COLUMN status VARCHAR DEFAULT 'active'")
                    if "device_approval_status" not in existing_cols:
                        conn.exec_driver_sql("ALTER TABLE students ADD COLUMN device_approval_status VARCHAR DEFAULT 'approved'")
                    if "pending_device_id" not in existing_cols:
                        conn.exec_driver_sql("ALTER TABLE students ADD COLUMN pending_device_id VARCHAR")
                    if "pending_device_info" not in existing_cols:
                        conn.exec_driver_sql("ALTER TABLE students ADD COLUMN pending_device_info VARCHAR")
                    if "device_bound_at" not in existing_cols:
                        conn.exec_driver_sql("ALTER TABLE students ADD COLUMN device_bound_at DATETIME")
                    if "last_login_at" not in existing_cols:
                        conn.exec_driver_sql("ALTER TABLE students ADD COLUMN last_login_at DATETIME")
                    if "pin_hash" not in existing_cols:
                        conn.exec_driver_sql("ALTER TABLE students ADD COLUMN pin_hash VARCHAR")
    except Exception:
        pass

