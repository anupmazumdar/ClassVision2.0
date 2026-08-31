from fastapi import HTTPException
from sqlalchemy.orm import Session

from auth import create_token, hash_password, verify_password
from repositories import user_repo


def login(db: Session, email: str, password: str) -> dict:
    cleaned_email = email.strip().lower() if email else ""
    user = user_repo.get_user_by_email(db, cleaned_email)
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
    cleaned_email = email.strip().lower() if email else ""
    existing = user_repo.get_user_by_email(db, cleaned_email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = user_repo.create_user(
        db,
        name=name.strip(),
        email=cleaned_email,
        password_hash=hash_password(password),
        role=role,
    )
    return {"id": user.id, "name": user.name, "email": user.email, "role": user.role}


def seed_default_admin(db: Session, *, name: str, email: str, password: str) -> None:
    cleaned_email = email.strip().lower()
    admin = user_repo.get_user_by_email(db, cleaned_email)
    if not admin:
        user_repo.create_user(
            db,
            name=name,
            email=cleaned_email,
            password_hash=hash_password(password),
            role="admin",
        )

    # Also seed alias with double-s 'classvission' so custom domain typos don't fail
    alt_email = "admin@classvission.local"
    if cleaned_email != alt_email and not user_repo.get_user_by_email(db, alt_email):
        user_repo.create_user(
            db,
            name=name,
            email=alt_email,
            password_hash=hash_password(password),
            role="admin",
        )
