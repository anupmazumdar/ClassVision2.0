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

from config import ATTENDANCE_TICKET_SECRET, TICKET_EXPIRATION_SECONDS
from middleware.jwt_middleware import check_code_rate_limit, check_device_checkin_velocity, record_failed_code
from repositories import attendance_repo, session_repo, student_repo
from .face_service import decode_image, recognize_faces, verify_liveness
from .session_service import verify_session_code

# In-memory student last-known GPS location tracker: student_id -> (lat, lon, timestamp)
_STUDENT_LAST_KNOWN_GPS: dict[int, tuple[float, float, float]] = {}


def check_gps_plausibility(student_id: int, lat: float, lng: float) -> None:
    """Validates coordinate ranges and rejects impossible terrestrial travel velocities (> 1000 km/h) between consecutive check-ins."""
    if lat < -90.0 or lat > 90.0 or lng < -180.0 or lng > 180.0:
        raise HTTPException(
            status_code=400,
            detail="Invalid GPS coordinates: Latitude must be between -90 and 90, Longitude between -180 and 180.",
        )

    now = time.time()
    if student_id in _STUDENT_LAST_KNOWN_GPS:
        prev_lat, prev_lng, prev_ts = _STUDENT_LAST_KNOWN_GPS[student_id]
        dt_seconds = now - prev_ts
        if 0 < dt_seconds < 7200:  # Within past 2 hours
            distance_meters = calculate_haversine_distance(prev_lat, prev_lng, lat, lng)
            dt_hours = dt_seconds / 3600.0
            speed_kmh = (distance_meters / 1000.0) / dt_hours
            if speed_kmh > 1000.0:  # Exceeds maximum commercial aircraft / terrestrial velocity
                raise HTTPException(
                    status_code=403,
                    detail=f"GPS Anomaly Detected: Impossible travel speed ({int(speed_kmh)} km/h) detected between consecutive check-ins. Mock-location spoofing rejected.",
                )

    _STUDENT_LAST_KNOWN_GPS[student_id] = (lat, lng, now)


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
    # Validate session if session_id is provided (> 0)
    if session_id > 0:
        session = session_repo.get_session_by_id(db, session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        if not session.is_active:
            raise HTTPException(status_code=400, detail="Session is closed or not active")
    # session_id == 0 is an intentional teacher/admin preview mode without an active session

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
    client_ip: Optional[str] = None,
    caller_student_id: Optional[int] = None,
) -> dict:
    """Atomic server-side verification: liveness -> recognition -> geofence/code/device -> attendance mark."""
    session = session_repo.get_session_by_id(db, session_id)
    if not session or not session.is_active:
        raise HTTPException(status_code=400, detail="Session not found or not active")

    # 1. Rotating Code Check with IP-based Rate Limiting (5 attempts / 30s)
    if session.require_code:
        rate_key = f"{session_id}:{client_ip or device_id or 'anon'}"
        check_code_rate_limit(rate_key, max_attempts=5, window_seconds=30)
        if not code or not verify_session_code(session_id, code):
            record_failed_code(rate_key)
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
        # Authorization check: student caller can only mark their own attendance
        if caller_student_id is not None and caller_student_id != st_id:
            continue

        st = student_repo.get_student_by_id(db, st_id)
        if not st:
            continue

        # Device Binding & Anomaly Checks
        if device_id:
            check_device_checkin_velocity(device_id, st_id, max_distinct_students=3, window_seconds=300)
            if st.device_id and st.device_id != device_id:
                raise HTTPException(
                    status_code=403,
                    detail=f"Device mismatch: Account for {st.name} is bound to another device.",
                )
            elif not st.device_id:
                student_repo.bind_student_device(db, st, device_id)

        if lat is not None and lng is not None:
            check_gps_plausibility(st_id, lat, lng)

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

    if caller_student_id is not None and not marked_results:
        raise HTTPException(
            status_code=403,
            detail="Security Violation: Recognized face does not match the logged-in student account.",
        )

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
    client_ip: Optional[str] = None,
    caller_student_id: Optional[int] = None,
) -> dict:
    """Marks attendance verified by cryptographic attendance ticket with geofencing + 30s code verification."""
    # 0. Caller Student ID authorization check
    if caller_student_id is not None and caller_student_id != student_id:
        raise HTTPException(
            status_code=403,
            detail="Security Violation: Logged-in student is not authorized to submit attendance for another student account.",
        )

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

    # 2. Rotating Code Verification with IP-based Rate Limiting (5 attempts / 30s)
    if session.require_code:
        rate_key = f"{session_id}:{client_ip or device_id or 'anon'}"
        check_code_rate_limit(rate_key, max_attempts=5, window_seconds=30)
        if not code or not verify_session_code(session_id, code):
            record_failed_code(rate_key)
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

    # 4. Device ID Binding Verification
    if device_id:
        if student.device_id and student.device_id != device_id:
            raise HTTPException(
                status_code=403,
                detail="Device mismatch: Student is registered to another device. Proxy check-ins are blocked.",
            )
        elif not student.device_id:
            student_repo.bind_student_device(db, student, device_id)

    # 5. Check if already marked
    existing = attendance_repo.get_session_student_record(db, session_id, student_id)
    if existing:
        return {
            "message": "Attendance already recorded for this session",
            "student_id": student_id,
            "name": student.name,
            "enrollment": student.enrollment,
            "session_id": session_id,
            "confidence": verified_confidence,
            "already_present": True,
        }

    # Record attendance
    record = attendance_repo.create_record(
        db, session_id=session_id, student_id=student_id, confidence=verified_confidence
    )
    return {
        "message": f"Attendance marked for {student.name}",
        "student_id": student_id,
        "name": student.name,
        "enrollment": student.enrollment,
        "session_id": session_id,
        "confidence": record.confidence,
        "already_present": False,
    }


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


def self_checkin_by_student(
    db: Session,
    *,
    code: str,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    image: Optional[str] = None,
    frames: Optional[List[str]] = None,
    device_id: Optional[str] = None,
    client_ip: Optional[str] = None,
    caller_student_id: Optional[int] = None,
) -> dict:
    """Self check-in for students using the 6-digit rolling session code, GPS geofence, and facial biometrics."""
    rate_key = f"self_checkin:{client_ip or device_id or 'anon'}"
    check_code_rate_limit(rate_key, max_attempts=5, window_seconds=30)

    cleaned_code = str(code).strip()
    if not cleaned_code:
        record_failed_code(rate_key)
        raise HTTPException(status_code=400, detail="Please enter the 6-digit session code.")

    # 1. Locate the active session matching this 6-digit code
    active_sessions = session_repo.list_active_sessions(db)
    matched_session = None
    for s in active_sessions:
        if verify_session_code(s.id, cleaned_code):
            matched_session = s
            break

    if not matched_session:
        record_failed_code(rate_key)
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired 6-digit session code. Please check the code currently displayed on the teacher's screen.",
        )

    # 2. Geofence Verification (if teacher configured GPS room location)
    distance_meters = None
    if matched_session.room_lat is not None and matched_session.room_lng is not None:
        if lat is None or lng is None:
            raise HTTPException(
                status_code=403,
                detail="Classroom Geofencing is active. Please enable GPS location on your device to check in.",
            )
        distance_meters = calculate_haversine_distance(
            lat, lng, matched_session.room_lat, matched_session.room_lng
        )
        max_allowed = matched_session.radius_meters or 100.0
        if distance_meters > max_allowed:
            raise HTTPException(
                status_code=403,
                detail=f"Geofence check failed: You are {int(distance_meters)}m away from the classroom (allowed radius: {int(max_allowed)}m). You must be present inside the classroom to check in.",
            )

    # 3. Biometric Face Image & Mandatory Burst-Frame Liveness Verification
    if not frames or len(frames) < 2:
        raise HTTPException(
            status_code=400,
            detail="Anti-Spoofing Requirement: Multi-frame burst capture (minimum 2 frames) required for self check-in.",
        )

    try:
        decoded_frames = [decode_image(f) for f in frames]
        liveness_res = verify_liveness(decoded_frames)
        if not liveness_res.get("is_live", False):
            raise HTTPException(
                status_code=403,
                detail=f"Anti-Spoofing check failed: {liveness_res.get('reason', 'Static photo or screen spoofing detected')}. Please capture a live selfie with natural movement.",
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to process burst frames: {e}")

    primary_img_b64 = image or frames[0]
    img_bgr = decode_image(primary_img_b64)
    all_students = student_repo.list_students(db)
    recognized = recognize_faces(img_bgr, all_students)

    if not recognized or len(recognized) == 0:
        raise HTTPException(
            status_code=400,
            detail="Face not recognized. Please ensure your face is well-lit and clearly centered, or verify you are registered in the student database.",
        )

    top_match = recognized[0]
    matched_student_id = top_match["student_id"]

    # Student caller authorization check
    if caller_student_id is not None and matched_student_id != caller_student_id:
        raise HTTPException(
            status_code=403,
            detail="Security Violation: Recognized face does not match the logged-in student account.",
        )

    student = student_repo.get_student_by_id(db, matched_student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student record not found.")

    # 4. Device Binding & Anomaly Checks
    if device_id:
        check_device_checkin_velocity(device_id, matched_student_id, max_distinct_students=3, window_seconds=300)
        if student.device_id and student.device_id != device_id:
            raise HTTPException(
                status_code=403,
                detail=f"Device mismatch: Your student profile ({student.name}) is registered to another device. Proxy check-ins from multiple devices are blocked.",
            )
        elif not student.device_id:
            student_repo.bind_student_device(db, student, device_id)

    if lat is not None and lng is not None:
        check_gps_plausibility(matched_student_id, lat, lng)

    # 5. Check if already marked in this session
    existing = attendance_repo.get_session_student_record(db, matched_session.id, matched_student_id)
    if existing:
        return {
            "message": f"Attendance already recorded for {student.name}",
            "student_id": student.id,
            "name": student.name,
            "enrollment": student.enrollment,
            "subject": matched_session.subject,
            "room": matched_session.room,
            "already_present": True,
            "confidence": top_match["confidence"],
            "distance_meters": round(distance_meters, 1) if distance_meters is not None else None,
        }

    # Record attendance
    attendance_repo.create_record(
        db,
        session_id=matched_session.id,
        student_id=matched_student_id,
        confidence=top_match["confidence"],
    )

    return {
        "message": f"Attendance successfully marked for {student.name}!",
        "student_id": student.id,
        "name": student.name,
        "enrollment": student.enrollment,
        "subject": matched_session.subject,
        "room": matched_session.room,
        "already_present": False,
        "confidence": top_match["confidence"],
        "distance_meters": round(distance_meters, 1) if distance_meters is not None else None,
    }
