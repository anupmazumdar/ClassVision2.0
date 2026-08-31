import pytest
from repositories import attendance_repo, session_repo, student_repo


def test_reports_rbac_and_exports(client, teacher_headers, student_headers, db_session):
    # Setup test attendance record
    session = session_repo.create_session(
        db_session,
        subject="Compiler Design",
        room="Room 302",
        teacher_id=1,
    )
    student = student_repo.create_student(
        db_session,
        enrollment="REPORT_STU_001",
        name="Report Student",
        department="CS",
    )
    attendance_repo.create_record(
        db_session,
        session_id=session.id,
        student_id=student.id,
        confidence=98.5,
    )

    # 1. Student role cannot access summary
    res_student_summary = client.get("/reports/student-summary", headers=student_headers)
    assert res_student_summary.status_code == 403

    # 2. Teacher role can access summary
    res_teacher_summary = client.get("/reports/student-summary", headers=teacher_headers)
    assert res_teacher_summary.status_code == 200
    assert len(res_teacher_summary.json()) >= 1

    # 3. Student role cannot trigger email report
    res_student_email = client.post(
        f"/reports/{session.id}/email",
        json={"to": "external@target.com"},
        headers=student_headers,
    )
    assert res_student_email.status_code == 403

    # 4. Student role cannot export Excel
    res_student_excel = client.get(f"/reports/{session.id}/excel", headers=student_headers)
    assert res_student_excel.status_code == 403

    # 5. Teacher role can export Excel
    res_teacher_excel = client.get(f"/reports/{session.id}/excel", headers=teacher_headers)
    assert res_teacher_excel.status_code == 200
    assert "spreadsheetml" in res_teacher_excel.headers.get("content-type", "")
    assert "attendance_Compiler_Design_" in res_teacher_excel.headers.get("content-disposition", "")


def test_email_report_rate_limiting(client, teacher_headers, db_session):
    session = session_repo.create_session(db_session, subject="AI & ML", room="Room 101", teacher_id=1)

    # First 5 email requests pass (or fail at SMTP send, returning 500/200 but not 429)
    for _ in range(5):
        res = client.post(f"/reports/{session.id}/email", json={"to": "principal@test.com"}, headers=teacher_headers)
        assert res.status_code != 429

    # 6th email request within 1 minute is rate-limited with HTTP 429
    res_rate_limited = client.post(f"/reports/{session.id}/email", json={"to": "principal@test.com"}, headers=teacher_headers)
    assert res_rate_limited.status_code == 429
    assert "rate limit" in res_rate_limited.json()["detail"].lower()
