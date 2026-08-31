import pytest
from services import session_service


def test_session_lifecycle_and_code(client, teacher_headers, student_headers):
    # Student cannot create session
    res_forbidden = client.post(
        "/sessions",
        json={"subject": "Math 101", "room": "Room 201", "require_code": True},
        headers=student_headers,
    )
    assert res_forbidden.status_code == 403

    # Teacher creates session
    res = client.post(
        "/sessions",
        json={
            "subject": "Data Structures",
            "room": "Lab 1",
            "room_lat": 26.850000,
            "room_lng": 75.800000,
            "radius_meters": 150.0,
            "require_code": True,
        },
        headers=teacher_headers,
    )
    assert res.status_code == 201
    session_id = res.json()["id"]
    assert res.json()["subject"] == "Data Structures"
    assert res.json()["require_code"] is True

    # Teacher retrieves rolling TOTP code
    res_code = client.get(f"/sessions/{session_id}/code", headers=teacher_headers)
    assert res_code.status_code == 200
    code_data = res_code.json()
    assert len(code_data["code"]) == 6
    assert 0 < code_data["expires_in"] <= 30

    # Student cannot retrieve raw teacher session code endpoint
    res_student_code = client.get(f"/sessions/{session_id}/code", headers=student_headers)
    assert res_student_code.status_code == 403

    # Foreign teacher cannot stop another teacher's session
    from middleware.jwt_middleware import create_token
    token_foreign_teacher = create_token(user_id=999, email="other_teacher@test.com", role="teacher", name="Other Teacher")
    res_foreign_stop = client.put(f"/sessions/{session_id}/stop", headers={"Authorization": f"Bearer {token_foreign_teacher}"})
    assert res_foreign_stop.status_code == 403
    assert "permission" in res_foreign_stop.json()["detail"].lower()

    # Original teacher stops session
    res_stop = client.put(f"/sessions/{session_id}/stop", headers=teacher_headers)
    assert res_stop.status_code == 200


def test_student_session_attendance_idor_protection(client, teacher_headers, db_session):
    from repositories import student_repo
    from middleware.jwt_middleware import create_student_token

    # Setup student
    student = student_repo.create_student(
        db_session,
        enrollment="IDOR_STU_001",
        name="IDOR Student",
        department="CSE",
    )
    student_token = create_student_token(
        student_id=student.id,
        enrollment=student.enrollment,
        name=student.name,
        course="B.Tech",
        branch="CSE",
        year=1,
    )
    student_headers = {"Authorization": f"Bearer {student_token}"}

    # Teacher creates session
    res = client.post(
        "/sessions",
        json={"subject": "Discrete Math", "room": "Hall A"},
        headers=teacher_headers,
    )
    assert res.status_code == 201
    session_id = res.json()["id"]

    # Teacher manually marks student present
    res_mark = client.post(f"/attendance/{session_id}/manual-mark", json={"student_id": student.id}, headers=teacher_headers)
    assert res_mark.status_code in [200, 201]

    # Teacher gets full session roster (contains student record)
    res_teacher_view = client.get(f"/sessions/{session_id}", headers=teacher_headers)
    assert res_teacher_view.status_code == 200
    assert len(res_teacher_view.json()["attendance"]) == 1
    assert res_teacher_view.json()["attendance"][0]["student_id"] == student.id

    # Calling student gets only their own attendance record
    res_student_view = client.get(f"/sessions/{session_id}", headers=student_headers)
    assert res_student_view.status_code == 200
    assert len(res_student_view.json()["attendance"]) == 1
    assert res_student_view.json()["attendance"][0]["student_id"] == student.id

    # Foreign student (different sub) gets empty attendance array (no IDOR roster leak)
    other_token = create_student_token(student_id=99999, enrollment="OTHER001", name="Other Student", course="B.Tech", branch="CSE", year=1)
    res_other_student_view = client.get(f"/sessions/{session_id}", headers={"Authorization": f"Bearer {other_token}"})
    assert res_other_student_view.status_code == 200
    assert len(res_other_student_view.json()["attendance"]) == 0
