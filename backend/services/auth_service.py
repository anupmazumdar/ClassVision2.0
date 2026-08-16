from fastapi import HTTPException
from sqlalchemy.orm import Session

from auth import create_token, hash_password, verify_password
from repositories import user_repo


def login(db: Session, email: str, password: str) -> dict:
    user = user_repo.get_user_by_email(db, email)
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_token(user.id, user.email, user.role, user.name)
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role,
        "name": user.name,
    }


def register(db: Session, name: str, email: str, password: str, role: str) -> dict:
    existing = user_repo.get_user_by_email(db, email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = user_repo.create_user(
        db,
        name=name,
        email=email,
        password_hash=hash_password(password),
        role=role,
    )
    return {"id": user.id, "name": user.name, "email": user.email, "role": user.role}


def seed_default_admin(db: Session, *, name: str, email: str, password: str) -> None:
    if user_repo.count_users(db) > 0:
        return

    # Seed default Admin
    user_repo.create_user(
        db,
        name=name,
        email=email,
        password_hash=hash_password(password),
        role="admin",
    )

    # Seed default Demo Student
    user_repo.create_user(
        db,
        name="Demo Student",
        email="student@classvision.local",
        password_hash=hash_password("student123"),
        role="student",
    )
