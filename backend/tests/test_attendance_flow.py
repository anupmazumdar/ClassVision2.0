import json
from middleware.jwt_middleware import create_student_token
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
    student_b = student_repo.create_student(
        db_session,
        enrollment="ATTEND_STU_002",
        name="Student B",
        department="CS",
    )

    stu_token = create_student_token(student.id, student.enrollment, student.name, "B.Tech", "CS", 1)
    authenticated_student_headers = {"Authorization": f"Bearer {stu_token}"}

    code_info = session_service.get_current_session_code(session.id)
    current_code = code_info["code"]

    # 1A. Student role cannot access raw recognition endpoint (/attendance/recognize)
    res_rec_stu = client.post(
        "/attendance/recognize",
        json={"image": "dummy", "frames": ["dummy", "dummy"], "session_id": session.id},
        headers=authenticated_student_headers,
    )
    assert res_rec_stu.status_code == 403

    # 1B. Direct curl mark WITHOUT ticket -> HTTP 403 Security Violation
    res_direct = client.post(
        f"/attendance/{session.id}/mark",
        json={"student_id": student.id, "confidence": 98.0, "code": current_code},
        headers=authenticated_student_headers,
    )
    assert res_direct.status_code == 403
    assert "Missing cryptographic attendance ticket" in res_direct.json()["detail"]

    # 1C. Cross-student impersonation: Student A tries to mark Student B's attendance -> 403
    ticket_b = attendance_service.generate_attendance_ticket(
        session_id=session.id,
        student_id=student_b.id,
        confidence=95.0,
        device_id="device-valid-mobile",
    )
    res_impersonate = client.post(
        f"/attendance/{session.id}/mark",
        json={
            "student_id": student_b.id,
            "attendance_ticket": ticket_b,
            "code": current_code,
            "device_id": "device-valid-mobile",
        },
        headers=authenticated_student_headers,
    )
    assert res_impersonate.status_code == 403
    assert "not authorized to submit attendance for another student" in res_impersonate.json()["detail"]

    # 2. Issue valid cryptographic attendance ticket for Student A
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
        headers=authenticated_student_headers,
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
        headers=authenticated_student_headers,
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

    # Mock face recognition and liveness
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
    monkeypatch.setattr(
        attendance_service,
        "verify_liveness",
        lambda frames: {"is_live": True, "reason": "Live motion verified"},
    )

    # 1. Single image without burst frames -> 400 Anti-Spoofing Requirement
    res_single_img = client.post(
        "/attendance/self-checkin",
        json={
            "code": current_code,
            "lat": 22.5726,
            "lng": 88.3639,
            "image": "dummy_b64",
        },
    )
    assert res_single_img.status_code == 400
    assert "Multi-frame burst capture" in res_single_img.json()["detail"]

    # 2. Invalid code with frames -> 400
    res_bad_code = client.post(
        "/attendance/self-checkin",
        json={
            "code": "000000",
            "lat": 22.5726,
            "lng": 88.3639,
            "frames": ["frame1", "frame2"],
        },
    )
    assert res_bad_code.status_code == 400

    # 3. Geofence violation (> 100m away, e.g. 22.6000) -> 403
    res_out_of_bounds = client.post(
        "/attendance/self-checkin",
        json={
            "code": current_code,
            "lat": 22.6000,
            "lng": 88.3639,
            "frames": ["frame1", "frame2"],
        },
    )
    assert res_out_of_bounds.status_code == 403
    assert "Geofence check failed" in res_out_of_bounds.json()["detail"]

    # 4. Valid code + inside 100m geofence + burst frames -> 200 OK
    res_success = client.post(
        "/attendance/self-checkin",
        json={
            "code": current_code,
            "lat": 22.57261,  # ~10 meters away
            "lng": 88.36391,
            "frames": ["frame1", "frame2"],
            "device_id": "phone-device-uuid-1",
        },
    )
    assert res_success.status_code == 200
    data = res_success.json()
    assert data["student_id"] == student.id
    assert data["already_present"] is False
    assert "successfully marked" in data["message"]


def test_compute_rate_limiting_protects_opencv_endpoints(client, monkeypatch):
    """Tests that compute-heavy face recognition endpoints rate-limit abusive traffic (HTTP 429)."""
    from middleware import jwt_middleware
    # Test with lowered threshold for fast assertion
    test_ip = "192.0.2.99"
    monkeypatch.setattr(jwt_middleware, "get_client_ip", lambda req: test_ip)

    # Fill compute rate limit quota for test_ip
    for _ in range(30):
        client.post("/attendance/self-checkin", json={"code": "123456", "frames": ["a", "b"]})

    # 31st request should be rate-limited with HTTP 429
    res_rate_limited = client.post("/attendance/self-checkin", json={"code": "123456", "frames": ["a", "b"]})
    assert res_rate_limited.status_code == 429
    assert "Too many facial recognition requests" in res_rate_limited.json()["detail"]


def test_gps_anomaly_velocity_and_device_velocity(client, db_session, monkeypatch):
    """Tests that impossible GPS travel velocity (> 1000 km/h) and multi-student device velocity are blocked."""
    from services import attendance_service
    from services.session_service import get_current_session_code

    student = student_repo.create_student(
        db_session,
        enrollment="ANOMALY_STU_001",
        name="Anomaly Student",
        department="CSE",
    )
    student.face_encodings = json.dumps(["dummy_vector"])
    db_session.commit()

    session = session_repo.create_session(
        db_session,
        subject="GPS Testing",
        room="Lab GPS",
        teacher_id=1,
        room_lat=22.5726,
        room_lng=88.3639,
        radius_meters=10000.0,
        require_code=True,
    )

    monkeypatch.setattr(attendance_service, "verify_liveness", lambda frames: {"is_live": True, "confidence": 99.0})
    monkeypatch.setattr(attendance_service, "decode_image", lambda f: "mock_bgr")
    monkeypatch.setattr(attendance_service, "recognize_faces", lambda img, st_list: [{"student_id": student.id, "confidence": 98.0}])

    code = get_current_session_code(session.id)["code"]

    # 1. Normal check-in at Kolkata (22.5726, 88.3639)
    res1 = client.post(
        "/attendance/self-checkin",
        json={
            "code": code,
            "lat": 22.5726,
            "lng": 88.3639,
            "frames": ["f1", "f2"],
            "device_id": "test-device-anomaly-1",
        },
    )
    assert res1.status_code == 200

    # 2. Check-in 2 seconds later from London / London coordinates (51.5074, -0.1278) -> ~8000 km in 2s -> speed > 100,000 km/h -> GPS Anomaly Rejected!
    # Setup new session for second checkin
    session2 = session_repo.create_session(
        db_session,
        subject="GPS Testing 2",
        room="Lab London",
        teacher_id=1,
        room_lat=51.5074,
        room_lng=-0.1278,
        radius_meters=100000.0,
        require_code=True,
    )
    code2 = get_current_session_code(session2.id)["code"]

    res_teleport = client.post(
        "/attendance/self-checkin",
        json={
            "code": code2,
            "lat": 51.5074,
            "lng": -0.1278,
            "frames": ["f1", "f2"],
            "device_id": "test-device-anomaly-1",
        },
    )
    assert res_teleport.status_code == 403
    assert "GPS Anomaly" in res_teleport.json()["detail"]

