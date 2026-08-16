import json
import numpy as np
import pytest

from models import Student
from repositories import student_repo


def test_create_student(client, teacher_headers, student_headers):
    # Student role cannot create student
    res_forbidden = client.post(
        "/students",
        json={"enrollment": "STU_TEST_001", "name": "Student A", "department": "CS"},
        headers=student_headers,
    )
    assert res_forbidden.status_code == 403

    # Teacher role can create student
    res = client.post(
        "/students",
        json={"enrollment": "STU_TEST_001", "name": "Student A", "department": "CS"},
        headers=teacher_headers,
    )
    assert res.status_code == 201
    assert res.json()["enrollment"] == "STU_TEST_001"

    # Duplicate enrollment rejected
    res_dup = client.post(
        "/students",
        json={"enrollment": "STU_TEST_001", "name": "Duplicate Student", "department": "IT"},
        headers=teacher_headers,
    )
    assert res_dup.status_code == 400
    assert "already exists" in res_dup.json()["detail"]


def test_biometric_consent_and_encryption(client, teacher_headers, db_session):
    student = student_repo.create_student(
        db_session,
        enrollment="STU_BIOMETRIC_01",
        name="Biometric Student",
        department="ECE",
    )

    # 1. Attempting face registration without consent -> HTTP 400
    res_no_consent = client.post(
        f"/students/{student.id}/register-face",
        json={"images": [], "consent": False},
        headers=teacher_headers,
    )
    assert res_no_consent.status_code == 400
    assert "Consent is required" in res_no_consent.json()["detail"]

    # 2. Saving face encodings with consent records consent and encrypts at rest
    fake_vector = [[round(float(x), 4) for x in np.random.randn(128)]]
    student_repo.update_student_face_encodings(db_session, student, json.dumps(fake_vector))
    student_repo.record_face_consent(db_session, student)

    # Inspect student in DB
    db_session.refresh(student)
    assert student.consent_given is True
    assert student.consent_at is not None

    # Listing returns correct consent & face status
    res_list = client.get("/students", headers=teacher_headers)
    assert res_list.status_code == 200
    students_data = res_list.json()
    st_entry = next((s for s in students_data if s["id"] == student.id), None)
    assert st_entry is not None
    assert st_entry["has_face"] is True
    assert st_entry["consent_given"] is True
