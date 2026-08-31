import os

os.environ.setdefault("FACE_ENCRYPTION_KEY", "E9SSVPs9LfUYGdJv6CkE6xOyopZmKxAWHoFZPgXT7Sc=")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database import Base, get_db
from main import app
from middleware.jwt_middleware import create_token
from models import User
from services import auth_service

TEST_DATABASE_URL = "sqlite:///./test_classvision.db"
test_engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)
    if os.path.exists("./test_classvision.db"):
        try:
            os.remove("./test_classvision.db")
        except Exception:
            pass


@pytest.fixture
def db_session():
    connection = test_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def admin_headers(db_session):
    admin = db_session.query(User).filter(User.email == "admin_fixture@test.com").first()
    if not admin:
        auth_service.register(
            db_session,
            name="Admin User",
            email="admin_fixture@test.com",
            password="adminpassword",
            role="admin",
        )
        admin = db_session.query(User).filter(User.email == "admin_fixture@test.com").first()
    token = create_token(admin.id, admin.email, admin.role, admin.name)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def teacher_headers(db_session):
    teacher = db_session.query(User).filter(User.email == "teacher_fixture@test.com").first()
    if not teacher:
        auth_service.register(
            db_session,
            name="Teacher User",
            email="teacher_fixture@test.com",
            password="teacherpassword",
            role="teacher",
        )
        teacher = db_session.query(User).filter(User.email == "teacher_fixture@test.com").first()
    token = create_token(teacher.id, teacher.email, teacher.role, teacher.name)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def student_headers(db_session):
    student_user = db_session.query(User).filter(User.email == "student_user@test.com").first()
    if not student_user:
        auth_service.register(
            db_session,
            name="Student User",
            email="student_user@test.com",
            password="studentpassword",
            role="student",
        )
        student_user = db_session.query(User).filter(User.email == "student_user@test.com").first()
    token = create_token(student_user.id, student_user.email, student_user.role, student_user.name)
    return {"Authorization": f"Bearer {token}"}
