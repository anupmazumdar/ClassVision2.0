from typing import Optional
from fastapi import HTTPException
from sqlalchemy.orm import Session

from auth import create_token, hash_password, verify_password
from middleware.jwt_middleware import create_student_token
from repositories import student_repo, user_repo
from services import audit_service


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


def student_login(
    db: Session,
    enrollment: str,
    device_id: str,
    device_info: Optional[str] = None,
    client_ip: Optional[str] = None,
) -> dict:
    """
    Authenticates a registered student with strict single-device hardware binding.
    Prevents proxy logins and enforces approval for device switching.
    """
    clean_enrollment = enrollment.strip().upper() if enrollment else ""
    if not clean_enrollment:
        raise HTTPException(status_code=400, detail="Enrollment number is required")
    if not device_id:
        raise HTTPException(status_code=400, detail="Device identifier is required for biometric/anti-proxy binding")

    student = student_repo.get_student_by_enrollment(db, clean_enrollment)
    if not student:
        audit_service.record_audit_event(
            db=db,
            event_type="UNREGISTERED_STUDENT_LOGIN_ATTEMPT",
            actor_type="unknown",
            actor_id=clean_enrollment,
            ip_address=client_ip,
            device_id=device_id,
            details={"reason": "Enrollment not found in university roster"},
        )
        raise HTTPException(status_code=404, detail="Student enrollment not registered. Please contact your instructor.")

    if student.status != "active":
        raise HTTPException(status_code=403, detail=f"Student account is currently {student.status}.")

    # 1. Check if device is already locked to another student
    other_student = student_repo.get_student_by_device_id(db, device_id)
    if other_student and other_student.id != student.id:
        student_repo.request_device_switch(db, student, device_id, device_info)
        audit_service.record_audit_event(
            db=db,
            event_type="MULTI_STUDENT_DEVICE_CONFLICT",
            actor_type="student",
            actor_id=student.enrollment,
            ip_address=client_ip,
            device_id=device_id,
            details={
                "attempted_enrollment": student.enrollment,
                "bound_to_enrollment": other_student.enrollment,
                "device_info": device_info,
            },
        )
        raise HTTPException(
            status_code=403,
            detail=f"This device is already locked to student {other_student.enrollment}. Switching accounts on this device requires Teacher/Admin approval.",
        )

    # 2. Check student's own device binding
    if not student.device_id:
        # First-time device binding
        student_repo.bind_student_device(db, student, device_id)
        audit_service.record_audit_event(
            db=db,
            event_type="DEVICE_FIRST_BOUND",
            actor_type="student",
            actor_id=student.enrollment,
            ip_address=client_ip,
            device_id=device_id,
            details={"device_info": device_info, "status": "approved"},
        )
    elif student.device_id != device_id:
        # Student attempting login from an unapproved second device
        if student.device_approval_status == "pending_approval":
            raise HTTPException(
                status_code=403,
                detail="Device change request is currently pending Teacher/Admin approval. Please ask your teacher to approve.",
            )
        else:
            student_repo.request_device_switch(db, student, device_id, device_info)
            audit_service.record_audit_event(
                db=db,
                event_type="DEVICE_SWITCH_REQUESTED",
                actor_type="student",
                actor_id=student.enrollment,
                ip_address=client_ip,
                device_id=device_id,
                details={"old_device": student.device_id, "new_device": device_id, "device_info": device_info},
            )
            raise HTTPException(
                status_code=403,
                detail="New device detected. A device switch approval request has been sent to your Teacher/Admin.",
            )

    # Issue Student Token
    token = create_student_token(
        student_id=student.id,
        enrollment=student.enrollment,
        name=student.name,
        course=student.course or "B.Tech",
        branch=student.branch or student.department or "General",
        year=student.year or 1,
    )

    audit_service.record_audit_event(
        db=db,
        event_type="STUDENT_LOGIN_SUCCESS",
        actor_type="student",
        actor_id=student.enrollment,
        ip_address=client_ip,
        device_id=device_id,
        details={"course": student.course, "branch": student.branch or student.department, "year": student.year},
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "role": "student",
        "id": student.id,
        "name": student.name,
        "enrollment": student.enrollment,
        "course": student.course or "B.Tech",
        "branch": student.branch or student.department or "General",
        "year": student.year or 1,
        "semester": student.semester or 1,
        "device_id": student.device_id,
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

