from datetime import datetime
from typing import List, Optional
from fastapi import HTTPException
from sqlalchemy.orm import Session

from repositories import material_repo


def serialize_material(m) -> dict:
    return {
        "id": m.id,
        "title": m.title,
        "material_type": m.material_type,
        "subject": m.subject,
        "course": m.course or "All",
        "branch": m.branch or "All",
        "year": m.year or "All",
        "description": m.description or "",
        "attachment_url": m.attachment_url,
        "attachment_name": m.attachment_name,
        "due_date": m.due_date.isoformat() if m.due_date else None,
        "total_marks": m.total_marks,
        "whatsapp_group_link": m.whatsapp_group_link,
        "teacher_name": m.teacher_name or "Teacher",
        "teacher_id": m.teacher_id,
        "created_at": m.created_at.isoformat() if m.created_at else None,
        "updated_at": m.updated_at.isoformat() if m.updated_at else None,
    }


def list_materials(
    db: Session,
    *,
    material_type: Optional[str] = None,
    subject: Optional[str] = None,
    course: Optional[str] = None,
    branch: Optional[str] = None,
    year: Optional[str] = None,
    search: Optional[str] = None,
) -> List[dict]:
    items = material_repo.list_materials(
        db,
        material_type=material_type,
        subject=subject,
        course=course,
        branch=branch,
        year=year,
        search=search,
    )
    return [serialize_material(m) for m in items]


def create_material(
    db: Session,
    *,
    title: str,
    material_type: str,
    subject: str,
    course: str = "All",
    branch: str = "All",
    year: str = "All",
    description: str = "",
    attachment_url: Optional[str] = None,
    attachment_name: Optional[str] = None,
    due_date: Optional[datetime] = None,
    total_marks: Optional[int] = None,
    whatsapp_group_link: Optional[str] = None,
    current_user: Optional[dict] = None,
) -> dict:
    teacher_name = current_user.get("name", "Teacher") if current_user else "Teacher"
    teacher_id = current_user.get("id") if current_user else None

    mat = material_repo.create_material(
        db,
        title=title.strip(),
        material_type=material_type,
        subject=subject.strip(),
        course=course,
        branch=branch,
        year=year,
        description=description,
        attachment_url=attachment_url,
        attachment_name=attachment_name,
        due_date=due_date,
        total_marks=total_marks,
        whatsapp_group_link=whatsapp_group_link,
        teacher_name=teacher_name,
        teacher_id=teacher_id,
    )
    return serialize_material(mat)


def get_material(db: Session, material_id: int) -> dict:
    mat = material_repo.get_material_by_id(db, material_id)
    if not mat:
        raise HTTPException(status_code=404, detail="Material not found")
    return serialize_material(mat)


def update_material(
    db: Session,
    material_id: int,
    data: dict,
    current_user: dict,
) -> dict:
    mat = material_repo.get_material_by_id(db, material_id)
    if not mat:
        raise HTTPException(status_code=404, detail="Material not found")

    # Only admin or owner teacher can update
    if current_user.get("role") != "admin" and mat.teacher_id != current_user.get("id"):
        raise HTTPException(status_code=403, detail="Forbidden: You can only edit your own posted materials.")

    updated = material_repo.update_material(db, mat, **data)
    return serialize_material(updated)


def delete_material(
    db: Session,
    material_id: int,
    current_user: dict,
) -> None:
    mat = material_repo.get_material_by_id(db, material_id)
    if not mat:
        raise HTTPException(status_code=404, detail="Material not found")

    # Only admin or owner teacher can delete
    if current_user.get("role") != "admin" and mat.teacher_id != current_user.get("id"):
        raise HTTPException(status_code=403, detail="Forbidden: You can only delete your own posted materials.")

    material_repo.delete_material(db, mat)
