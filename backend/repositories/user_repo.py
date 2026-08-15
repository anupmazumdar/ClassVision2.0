from sqlalchemy.orm import Session

from models import User


def count_users(db: Session) -> int:
    return db.query(User).count()


def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()


def list_users(db: Session):
    return db.query(User).order_by(User.name).all()


def create_user(db: Session, *, name: str, email: str, password_hash: str, role: str):
    user = User(name=name, email=email, password_hash=password_hash, role=role)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_user_by_id(db: Session, user_id: int):
    return db.query(User).filter(User.id == user_id).first()


def delete_user(db: Session, user: User) -> None:
    db.delete(user)
    db.commit()
