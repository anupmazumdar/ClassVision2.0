from fastapi import HTTPException
from sqlalchemy.orm import Session

from repositories import user_repo


def list_users(db: Session) -> list[dict]:
    users = user_repo.list_users(db)
    return [
        {
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "role": u.role,
            "created_at": u.created_at.isoformat(),
        }
        for u in users
    ]


def delete_user(db: Session, user_id: int, current_user_id: str) -> None:
    if str(user_id) == current_user_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    user = user_repo.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user_repo.delete_user(db, user)
