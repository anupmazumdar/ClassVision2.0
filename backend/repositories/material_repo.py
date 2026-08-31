from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session

from models.material import ClassroomMaterial


def list_materials(
    db: Session,
    *,
    material_type: Optional[str] = None,
    subject: Optional[str] = None,
    course: Optional[str] = None,
    branch: Optional[str] = None,
    year: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
) -> List[ClassroomMaterial]:
    query = db.query(ClassroomMaterial)

    if material_type and material_type != "all":
        query = query.filter(ClassroomMaterial.material_type == material_type)

    if subject and subject != "all":
        query = query.filter(ClassroomMaterial.subject.ilike(f"%{subject}%"))

    if course and course != "All" and course != "all":
        query = query.filter((ClassroomMaterial.course == course) | (ClassroomMaterial.course == "All"))

    if branch and branch != "All" and branch != "all":
        query = query.filter((ClassroomMaterial.branch == branch) | (ClassroomMaterial.branch == "All"))

    if year and year != "All" and year != "all":
        query = query.filter((ClassroomMaterial.year == year) | (ClassroomMaterial.year == "All"))

    if search:
        pattern = f"%{search}%"
        query = query.filter(
            ClassroomMaterial.title.ilike(pattern)
            | ClassroomMaterial.description.ilike(pattern)
            | ClassroomMaterial.subject.ilike(pattern)
        )

    return query.order_by(ClassroomMaterial.created_at.desc()).limit(limit).all()


def get_material_by_id(db: Session, material_id: int) -> Optional[ClassroomMaterial]:
    return db.query(ClassroomMaterial).filter(ClassroomMaterial.id == material_id).first()


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
    teacher_name: str = "Teacher",
    teacher_id: Optional[int] = None,
) -> ClassroomMaterial:
    mat = ClassroomMaterial(
        title=title,
        material_type=material_type,
        subject=subject,
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
    db.add(mat)
    db.commit()
    db.refresh(mat)
    return mat


def update_material(db: Session, material: ClassroomMaterial, **kwargs) -> ClassroomMaterial:
    for key, value in kwargs.items():
        if value is not None and hasattr(material, key):
            setattr(material, key, value)
    db.commit()
    db.refresh(material)
    return material


def delete_material(db: Session, material: ClassroomMaterial) -> None:
    db.delete(material)
    db.commit()
