import base64
import hashlib
import hmac
import json
import math
import secrets
import time
from typing import List, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from config import ATTENDANCE_TICKET_SECRET
from repositories import attendance_repo, session_repo, student_repo
from .face_service import decode_image, recognize_faces, verify_liveness
from .session_service import verify_session_code

TICKET_EXPIRATION_SECONDS = 15


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


def generate_attendance_ticket(
    session_id: int,
    student_id: int,
    confidence: float,
    device_id: Optional[str] = None,
) -> str:
    """Generates an HMAC-SHA256 signed short-lived (15s) attendance ticket."""
    payload = {
        "session_id": session_id,
        "student_id": student_id,
        "confidence": round(confidence, 2),
        "device_id": device_id or "",
        "ts": int(time.time()),
        "nonce": secrets.token_hex(8),
    }
    payload_bytes = json.dumps(payload, sort_keys=True).encode("utf-8")
    sig = hmac.new(
        ATTENDANCE_TICKET_SECRET.encode("utf-8"),
        payload_bytes,
        hashlib.sha256,
    ).hexdigest()
    ticket_obj = {
        "payload": base64.urlsafe_b64encode(payload_bytes).decode("ascii"),
        "sig": sig,
    }
    return base64.urlsafe_b64encode(json.dumps(ticket_obj).encode("utf-8")).decode("ascii")


def verify_attendance_ticket(
    ticket: str,
    session_id: int,
    student_id: int,
) -> dict:
    """Verifies cryptographic signature and expiration of an attendance ticket."""
    try:
        raw_json = base64.urlsafe_b64decode(ticket.encode("ascii")).decode("utf-8")
        ticket_obj = json.loads(raw_json)
        payload_bytes = base64.urlsafe_b64decode(ticket_obj["payload"].encode("ascii"))
        expected_sig = hmac.new(
            ATTENDANCE_TICKET_SECRET.encode("utf-8"),
            payload_bytes,
            hashlib.sha256,
        ).hexdigest()

        if not hmac.compare_digest(ticket_obj["sig"], expected_sig):
            raise HTTPException(
                status_code=403,
                detail="Security Violation: Invalid cryptographic attendance ticket signature.",
            )

        payload = json.loads(payload_bytes.decode("utf-8"))
        if payload.get("session_id") != session_id or payload.get("student_id") != student_id:
            raise HTTPException(
                status_code=403,
                detail="Security Violation: Attendance ticket does not match the active session or student.",
            )

        elapsed = time.time() - payload.get("ts", 0)
        if elapsed > TICKET_EXPIRATION_SECONDS or elapsed < -5:
            raise HTTPException(
                status_code=403,
                detail=f"Security Violation: Attendance ticket has expired ({int(elapsed)}s elapsed, limit {TICKET_EXPIRATION_SECONDS}s). Please re-scan.",
            )

        return payload
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=403,
            detail=f"Security Violation: Corrupted attendance ticket: {e}",
        )


def recognize_and_issue_tickets(
    db: Session,
    session_id: int,
    image: str,
    frames: Optional[List[str]] = None,
    device_id: Optional[str] = None,
) -> dict:
    """Runs liveness, recognizes faces, and generates signed attendance tickets for recognized faces."""
    # 1. Anti-Spoofing Liveness check (Mandatory burst frames)
    if not frames or len(frames) < 2:
        raise HTTPException(
            status_code=400,
            detail="Anti-Spoofing Requirement: Multi-frame burst analysis required for facial check-in.",
        )

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
        raise HTTPException(
            status_code=422,
            detail=f"Failed to process burst frames for liveness: {e}",
        )

    try:
        img = decode_image(image)
    except Exception:
        raise HTTPException(status_code=422, detail="Invalid primary frame data")

    students = [s for s in student_repo.list_students(db) if s.face_encodings != "[]"]
    if not students:
        return {"recognized": [], "message": "No students with registered faces"}

    recognized = recognize_faces(img, students)

    # Attach cryptographic tickets to each recognized face
    for rec in recognized:
        ticket = generate_attendance_ticket(
            session_id=session_id,
            student_id=rec["student_id"],
            confidence=rec["confidence"],
            device_id=device_id,
        )
        rec["attendance_ticket"] = ticket

    return {"recognized": recognized, "liveness": liveness_res}


def scan_and_mark_atomic(
    db: Session,
    session_id: int,
    image: str,
    frames: Optional[List[str]] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    code: Optional[str] = None,
    device_id: Optional[str] = None,
) -> dict:
    """Atomic server-side verification: liveness -> recognition -> geofence/code/device -> attendance mark."""
    session = session_repo.get_session_by_id(db, session_id)
    if not session or not session.is_active:
        raise HTTPException(status_code=400, detail="Session not found or not active")

    # 1. Rotating Code Check
    if session.require_code:
        if not code or not verify_session_code(session_id, code):
            raise HTTPException(
                status_code=400,
                detail="Invalid or expired session code. Please enter the current 6-digit code shown on screen.",
            )

    # 2. Geofencing Check
    if session.room_lat is not None and session.room_lng is not None:
        if lat is None or lng is None:
            raise HTTPException(
                status_code=403,
                detail="Geofence check failed: Device GPS coordinates are required for this session.",
            )
        distance = calculate_haversine_distance(lat, lng, session.room_lat, session.room_lng)
        max_allowed = session.radius_meters or 100.0
        if distance > max_allowed:
            raise HTTPException(
                status_code=403,
                detail=f"Geofence check failed: You are {distance:.1f}m away from class (allowed radius: {max_allowed}m).",
            )

    # 3. Liveness Check
    if not frames or len(frames) < 2:
        raise HTTPException(
            status_code=400,
            detail="Anti-Spoofing Requirement: Multi-frame burst capture required for facial check-in.",
        )

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

    try:
        img = decode_image(image)
    except Exception:
        raise HTTPException(status_code=422, detail="Invalid frame image data")

    students = [s for s in student_repo.list_students(db) if s.face_encodings != "[]"]
    if not students:
        return {"recognized": [], "marked": [], "message": "No students with registered faces"}

    recognized = recognize_faces(img, students)
    marked_results = []

    for face in recognized:
        st_id = face["student_id"]
        st = student_repo.get_student_by_id(db, st_id)
        if not st:
            continue

        # Device Binding Check
        if device_id:
            if st.device_id and st.device_id != device_id:
                raise HTTPException(
                    status_code=403,
                    detail=f"Device mismatch: Account for {st.name} is bound to another device.",
                )
            elif not st.device_id:
                student_repo.bind_student_device(db, st, device_id)

        # Check existing
        existing = attendance_repo.get_session_student_record(db, session_id, st_id)
        if existing:
            marked_results.append({
                "student_id": st_id,
                "name": face["name"],
                "enrollment": face["enrollment"],
                "confidence": face["confidence"],
                "already_present": True,
            })
        else:
            attendance_repo.create_record(
                db,
                session_id=session_id,
                student_id=st_id,
                confidence=face["confidence"],
            )
            marked_results.append({
                "student_id": st_id,
                "name": face["name"],
                "enrollment": face["enrollment"],
                "confidence": face["confidence"],
                "already_present": False,
            })

    return {
        "recognized": recognized,
        "marked": marked_results,
        "liveness": liveness_res,
    }


def mark_attendance_with_ticket(
    db: Session,
    session_id: int,
    student_id: int,
    attendance_ticket: str,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    code: Optional[str] = None,
    device_id: Optional[str] = None,
) -> dict:
    """Marks attendance verifying cryptographic ticket issued by server face recognition."""
    session = session_repo.get_session_by_id(db, session_id)
    if not session or not session.is_active:
        raise HTTPException(status_code=400, detail="Session not found or not active")

    student = student_repo.get_student_by_id(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # 1. Cryptographic Ticket Verification
    if not attendance_ticket:
        raise HTTPException(
            status_code=403,
            detail="Security Violation: Missing cryptographic attendance ticket. Direct manual mark via student endpoint is forbidden.",
        )
    ticket_payload = verify_attendance_ticket(attendance_ticket, session_id, student_id)
    verified_confidence = ticket_payload.get("confidence", 0.0)

    # 2. Rotating Code Verification
    if session.require_code:
        if not code or not verify_session_code(session_id, code):
            raise HTTPException(
                status_code=400,
                detail="Invalid or expired session code. Please enter the current 6-digit code shown on screen.",
            )

    # 3. Geofencing Verification
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

    # 4. Device Binding Check
    if device_id:
        if student.device_id and student.device_id != device_id:
            raise HTTPException(
                status_code=403,
                detail="Device mismatch: This student account is already bound to another registered device.",
            )
        elif not student.device_id:
            student_repo.bind_student_device(db, student, device_id)

    # Check for duplicate
    existing = attendance_repo.get_session_student_record(db, session_id, student_id)
    if existing:
        return {"message": "Already marked", "already_present": True}

    attendance_repo.create_record(
        db,
        session_id=session_id,
        student_id=student_id,
        confidence=verified_confidence,
    )
    return {"message": "Marked present", "already_present": False}


def manual_mark_teacher(
    db: Session,
    session_id: int,
    student_id: int,
) -> dict:
    """Allows an authenticated teacher/admin to manually mark a student present."""
    session = session_repo.get_session_by_id(db, session_id)
    if not session or not session.is_active:
        raise HTTPException(status_code=400, detail="Session not found or not active")

    student = student_repo.get_student_by_id(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    existing = attendance_repo.get_session_student_record(db, session_id, student_id)
    if existing:
        return {"message": "Already marked", "already_present": True}

    attendance_repo.create_record(
        db,
        session_id=session_id,
        student_id=student_id,
        confidence=0.0,
    )
    return {"message": "Marked present manually by teacher", "already_present": False}


def unmark_attendance(db: Session, session_id: int, student_id: int) -> None:
    attendance_repo.delete_session_student_record(db, session_id, student_id)
