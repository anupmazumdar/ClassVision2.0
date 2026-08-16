from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from config import DATABASE_URL
from models import Base

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    Base.metadata.create_all(bind=engine)

    # Safe auto-migration for SQLite columns
    with engine.connect() as conn:
        try:
            result = conn.exec_driver_sql("PRAGMA table_info(sessions)").fetchall()
            existing_cols = {row[1] for row in result}
            if "room_lat" not in existing_cols:
                conn.exec_driver_sql("ALTER TABLE sessions ADD COLUMN room_lat FLOAT")
            if "room_lng" not in existing_cols:
                conn.exec_driver_sql("ALTER TABLE sessions ADD COLUMN room_lng FLOAT")
            if "radius_meters" not in existing_cols:
                conn.exec_driver_sql("ALTER TABLE sessions ADD COLUMN radius_meters FLOAT DEFAULT 100.0")
            if "require_code" not in existing_cols:
                conn.exec_driver_sql("ALTER TABLE sessions ADD COLUMN require_code BOOLEAN DEFAULT 0")

            st_result = conn.exec_driver_sql("PRAGMA table_info(students)").fetchall()
            st_cols = {row[1] for row in st_result}
            if "device_id" not in st_cols:
                conn.exec_driver_sql("ALTER TABLE students ADD COLUMN device_id VARCHAR")
            if "consent_given" not in st_cols:
                conn.exec_driver_sql("ALTER TABLE students ADD COLUMN consent_given BOOLEAN DEFAULT 0")
            if "consent_at" not in st_cols:
                conn.exec_driver_sql("ALTER TABLE students ADD COLUMN consent_at DATETIME")
            conn.commit()
        except Exception:
            pass
