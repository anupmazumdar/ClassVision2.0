from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from middleware.jwt_middleware import get_current_user, require_teacher_or_admin
from schemas.material_schema import MaterialCreate, MaterialUpdate
from services import material_service

router = APIRouter(prefix="/materials", tags=["materials"])


@router.get("")
def list_materials(
    material_type: Optional[str] = Query(default=None),
    subject: Optional[str] = Query(default=None),
    course: Optional[str] = Query(default=None),
    branch: Optional[str] = Query(default=None),
    year: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return material_service.list_materials(
        db,
        material_type=material_type,
        subject=subject,
        course=course,
        branch=branch,
        year=year,
        search=search,
        current_user=current_user,
    )


@router.post("", status_code=201)
def create_material(
    body: MaterialCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin),
):
    return material_service.create_material(
        db,
        title=body.title,
        material_type=body.material_type,
        subject=body.subject,
        course=body.course or "All",
        branch=body.branch or "All",
        year=body.year or "All",
        description=body.description or "",
        attachment_url=body.attachment_url,
        attachment_name=body.attachment_name,
        due_date=body.due_date,
        total_marks=body.total_marks,
        whatsapp_group_link=body.whatsapp_group_link,
        current_user=current_user,
    )


@router.get("/{material_id}")
def get_material(
    material_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return material_service.get_material(db, material_id, current_user=current_user)


@router.put("/{material_id}")
def update_material(
    material_id: int,
    body: MaterialUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin),
):
    update_data = body.model_dump(exclude_unset=True)
    return material_service.update_material(db, material_id, update_data, current_user)


@router.delete("/{material_id}", status_code=204)
def delete_material(
    material_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin),
):
    material_service.delete_material(db, material_id, current_user)
