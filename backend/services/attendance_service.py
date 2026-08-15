import math
from typing import List, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from repositories import attendance_repo, session_repo, student_repo

from .face_service import decode_image, recognize_faces, verify_liveness
from .session_service import verify_session_code


def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two GPS points in meters."""
    r = 6371000.0  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return r * c


def recognize(
    db: Session,
    image: str,
    frames: Optional[List[str]] = None,
) -> dict:
    # 1. Anti-Spoofing Liveness check if burst frames provided
    liveness_info = None
    if frames and len(frames) >= 2:
        try:
            decoded_frames = [decode_image(f) for f in frames]
            liveness_res = verify_liveness(decoded_frames)
            if not liveness_res.get("is_live"):
                raise HTTPException(
                    status_code=400,
                    detail=f"Anti-Spoofing Alert: {liveness_res.get('reason')}",
                )
            liveness_info = liveness_res
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"Failed to process burst frames for liveness: {e}")

    try:
        img = decode_image(image)
    except Exception:
        raise HTTPException(status_code=422, detail="Invalid image data")

    students = [s for s in student_repo.list_students(db) if s.face_encodings != "[]"]
    if not students:
        return {"recognized": [], "message": "No students with registered faces"}

    recognized = recognize_faces(img, students)
    return {"recognized": recognized, "liveness": liveness_info}


def mark_attendance(
    db: Session,
    session_id: int,
    student_id: int,
    confidence: float,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    code: Optional[str] = None,
    device_id: Optional[str] = None,
    frames: Optional[List[str]] = None,
) -> dict:
    session = session_repo.get_session_by_id(db, session_id)
    if not session or not session.is_active:
        raise HTTPException(status_code=400, detail="Session not found or not active")

    student = student_repo.get_student_by_id(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # 1. Rotating Code Verification
    if session.require_code:
        if not code or not verify_session_code(session_id, code):
            raise HTTPException(
                status_code=400,
                detail="Invalid or expired session code. Please enter the current 6-digit code shown on screen.",
            )

    # 2. Geofencing Verification
    if session.room_lat is not None and session.room_lng is not None:
        if lat is None or lng is None:
            raise HTTPException(
                status_code=403,
                detail="Geofence check failed: Device GPS coordinates are required for this session.",
            )
        distance = calculate_haversine_distance(
            lat, lng, session.room_lat, session.room_lng
        )
        max_allowed = session.radius_meters or 100.0
        if distance > max_allowed:
            raise HTTPException(
                status_code=403,
                detail=f"Geofence check failed: You are {distance:.1f}m away from class (allowed radius: {max_allowed}m).",
            )

    # 3. Device Binding Check
    if device_id:
        if student.device_id and student.device_id != device_id:
            raise HTTPException(
                status_code=403,
                detail="Device mismatch: This student account is already bound to another registered device.",
            )
        elif not student.device_id:
            # Bind device automatically upon first genuine mark
            student_repo.bind_student_device(db, student, device_id)

    # 4. Anti-spoofing liveness check if burst frames supplied
    if frames and len(frames) >= 2:
        try:
            decoded_frames = [decode_image(f) for f in frames]
            liveness_res = verify_liveness(decoded_frames)
            if not liveness_res.get("is_live"):
                raise HTTPException(
                    status_code=400,
                    detail=f"Anti-Spoofing Alert: {liveness_res.get('reason')}",
                )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"Failed to process burst frames: {e}")

    # Check for duplicate
    existing = attendance_repo.get_session_student_record(db, session_id, student_id)
    if existing:
        return {"message": "Already marked", "already_present": True}

    attendance_repo.create_record(
        db,
        session_id=session_id,
        student_id=student_id,
        confidence=confidence,
    )
    return {"message": "Marked present", "already_present": False}


def unmark_attendance(db: Session, session_id: int, student_id: int) -> None:
    attendance_repo.delete_session_student_record(db, session_id, student_id)
