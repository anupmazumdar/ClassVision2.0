import pytest
from fastapi import HTTPException

from repositories import session_repo, student_repo
from services import attendance_service, session_service


def test_hmac_ticket_attendance_flow(client, teacher_headers, student_headers, db_session):
    # Setup test student and session
    session = session_repo.create_session(
        db_session,
        subject="Algorithms",
        room="Room 401",
        teacher_id=1,
        require_code=True,
    )
    student = student_repo.create_student(
        db_session,
        enrollment="ATTEND_STU_001",
        name="Attendance Student",
        department="CS",
    )

    code_info = session_service.get_current_session_code(session.id)
    current_code = code_info["code"]

    # 1A. Student role cannot access raw recognition endpoint (/attendance/recognize)
    res_rec_stu = client.post(
        "/attendance/recognize",
        json={"image": "dummy", "frames": ["dummy", "dummy"], "session_id": session.id},
        headers=student_headers,
    )
    assert res_rec_stu.status_code == 403

    # 1B. Direct curl mark WITHOUT ticket -> HTTP 403 Security Violation
    res_direct = client.post(
        f"/attendance/{session.id}/mark",
        json={"student_id": student.id, "confidence": 98.0, "code": current_code},
        headers=student_headers,
    )
    assert res_direct.status_code == 403
    assert "Missing cryptographic attendance ticket" in res_direct.json()["detail"]

    # 2. Issue valid cryptographic attendance ticket
    valid_ticket = attendance_service.generate_attendance_ticket(
        session_id=session.id,
        student_id=student.id,
        confidence=96.4,
        device_id="device-valid-mobile",
    )

    # 3. Mark attendance with valid ticket & code -> HTTP 201 Created
    res_valid_mark = client.post(
        f"/attendance/{session.id}/mark",
        json={
            "student_id": student.id,
            "attendance_ticket": valid_ticket,
            "code": current_code,
            "device_id": "device-valid-mobile",
        },
        headers=student_headers,
    )
    assert res_valid_mark.status_code in [200, 201]
    assert res_valid_mark.json()["already_present"] is False

    # 4. Duplicate attendance check -> returns already_present: True (Idempotent)
    fresh_ticket = attendance_service.generate_attendance_ticket(
        session_id=session.id,
        student_id=student.id,
        confidence=96.4,
        device_id="device-valid-mobile",
    )
    res_dup = client.post(
        f"/attendance/{session.id}/mark",
        json={
            "student_id": student.id,
            "attendance_ticket": fresh_ticket,
            "code": current_code,
            "device_id": "device-valid-mobile",
        },
        headers=student_headers,
    )
    assert res_dup.status_code in [200, 201]
    assert res_dup.json()["already_present"] is True

    # 5. Teacher manual override for student
    st_manual = student_repo.create_student(
        db_session,
        enrollment="MANUAL_STU_002",
        name="Manual Student",
        department="ECE",
    )
    res_manual = client.post(
        f"/attendance/{session.id}/manual-mark",
        json={"student_id": st_manual.id},
        headers=teacher_headers,
    )
    assert res_manual.status_code in [200, 201]
    assert "manually by teacher" in res_manual.json()["message"]

    # 6. Unmarking attendance (Teacher/Admin only)
    res_unmark = client.delete(
        f"/attendance/{session.id}/unmark/{st_manual.id}",
        headers=teacher_headers,
    )
    assert res_unmark.status_code in [200, 204]


def test_self_checkin_flow_geofence_and_code(client, db_session, monkeypatch):
    # Setup test student and session with geofence
    session = session_repo.create_session(
        db_session,
        subject="Physics 101",
        room="Room 101",
        teacher_id=1,
        room_lat=22.5726,
        room_lng=88.3639,
        radius_meters=100.0,
        require_code=True,
    )
    student = student_repo.create_student(
        db_session,
        enrollment="SELF_CHECKIN_001",
        name="Self Checkin Student",
        department="Physics",
    )

    code_info = session_service.get_current_session_code(session.id)
    current_code = code_info["code"]

    # Mock face recognition to return our student
    from services import attendance_service
    monkeypatch.setattr(
        attendance_service,
        "recognize_faces",
        lambda img, students: [{"student_id": student.id, "name": student.name, "enrollment": student.enrollment, "confidence": 98.5}],
    )
    monkeypatch.setattr(
        attendance_service,
        "decode_image",
        lambda img_b64: None,
    )

    # 1. Invalid code -> 400
    res_bad_code = client.post(
        "/attendance/self-checkin",
        json={
            "code": "000000",
            "lat": 22.5726,
            "lng": 88.3639,
            "image": "dummy_b64",
        },
    )
    assert res_bad_code.status_code == 400

    # 2. Geofence violation (> 100m away, e.g. 22.5800) -> 403
    res_out_of_bounds = client.post(
        "/attendance/self-checkin",
        json={
            "code": current_code,
            "lat": 22.6000,
            "lng": 88.3639,
            "image": "dummy_b64",
        },
    )
    assert res_out_of_bounds.status_code == 403
    assert "Geofence check failed" in res_out_of_bounds.json()["detail"]

    # 3. Valid code + inside 100m geofence -> 200 OK
    res_success = client.post(
        "/attendance/self-checkin",
        json={
            "code": current_code,
            "lat": 22.57261,  # ~10 meters away
            "lng": 88.36391,
            "image": "dummy_b64",
            "device_id": "phone-device-uuid-1",
        },
    )
    assert res_success.status_code == 200
    data = res_success.json()
    assert data["student_id"] == student.id
    assert data["already_present"] is False
    assert "successfully marked" in data["message"]

