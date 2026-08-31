from models import Student, ClassroomMaterial


def test_student_first_login_binds_device(client, db_session):
    # Seed Student
    student = Student(
        name="Amit Kumar",
        enrollment="BCA2024001",
        course="BCA",
        branch="Computer Applications",
        year=2,
        semester=3,
        status="active",
    )
    db_session.add(student)
    db_session.commit()

    res = client.post(
        "/auth/student-login",
        json={"enrollment": "BCA2024001", "device_id": "device_pixel_7", "device_info": "Pixel 7 Chrome"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["role"] == "student"
    assert data["enrollment"] == "BCA2024001"
    assert data["course"] == "BCA"
    assert "access_token" in data


def test_multi_student_same_device_blocked(client, db_session):
    # Seed 2 Students
    s1 = Student(name="Amit Kumar", enrollment="BCA2024001", course="BCA", status="active")
    s2 = Student(name="Priya Sharma", enrollment="BT2024002", course="B.Tech", status="active")
    db_session.add_all([s1, s2])
    db_session.commit()

    # 1. First student logs in on phone
    res1 = client.post(
        "/auth/student-login",
        json={"enrollment": "BCA2024001", "device_id": "shared_phone_123"},
    )
    assert res1.status_code == 200

    # 2. Second student attempts login from the SAME phone
    res2 = client.post(
        "/auth/student-login",
        json={"enrollment": "BT2024002", "device_id": "shared_phone_123"},
    )
    # Must be 403 Forbidden because device is bound to BCA2024001
    assert res2.status_code == 403
    assert "already locked to student" in res2.json()["detail"]


def test_admin_approves_device_switch(client, db_session, admin_headers):
    # Seed Student
    student = Student(name="Amit Kumar", enrollment="BCA2024001", course="BCA", status="active")
    db_session.add(student)
    db_session.commit()

    # 1. Bind BCA student to phone 1
    client.post("/auth/student-login", json={"enrollment": "BCA2024001", "device_id": "phone_1"})

    # 2. BCA student attempts login from phone 2 (triggers approval request)
    res_switch = client.post("/auth/student-login", json={"enrollment": "BCA2024001", "device_id": "phone_2"})
    assert res_switch.status_code == 403

    # 3. Admin checks device requests
    reqs = client.get("/students/device-requests", headers=admin_headers).json()
    assert len(reqs) == 1
    assert reqs[0]["enrollment"] == "BCA2024001"
    assert reqs[0]["pending_device_id"] == "phone_2"

    # 4. Admin approves switch
    student_id = reqs[0]["id"]
    approve_res = client.post(f"/students/{student_id}/approve-device", headers=admin_headers)
    assert approve_res.status_code == 200

    # 5. Student can now log in on phone 2!
    res_login2 = client.post("/auth/student-login", json={"enrollment": "BCA2024001", "device_id": "phone_2"})
    assert res_login2.status_code == 200


def test_course_restricted_material_access(client, db_session):
    # Seed Student
    student = Student(name="Amit Kumar", enrollment="BCA2024001", course="BCA", branch="Computer Applications", status="active")
    db_session.add(student)

    # Seed Materials
    bca_note = ClassroomMaterial(
        title="BCA Web Dev Notes",
        material_type="note",
        subject="Web Technologies",
        course="BCA",
        branch="Computer Applications",
        year="2nd Year",
        teacher_name="Admin Teacher",
    )
    btech_note = ClassroomMaterial(
        title="B.Tech Compiler Design",
        material_type="note",
        subject="Compiler Design",
        course="B.Tech",
        branch="Computer Science & Engineering (CSE)",
        year="3rd Year",
        teacher_name="Admin Teacher",
    )
    general_note = ClassroomMaterial(
        title="Campus Orientation Handbook",
        material_type="note",
        subject="General",
        course="All",
        branch="All",
        year="All",
        teacher_name="Admin Teacher",
    )
    db_session.add_all([bca_note, btech_note, general_note])
    db_session.commit()

    # 1. Login as BCA Student
    bca_auth = client.post("/auth/student-login", json={"enrollment": "BCA2024001", "device_id": "bca_device"}).json()
    bca_headers = {"Authorization": f"Bearer {bca_auth['access_token']}"}

    # 2. Get materials -> BCA student must only see BCA materials and All-course materials
    materials_res = client.get("/materials", headers=bca_headers)
    assert materials_res.status_code == 200
    materials = materials_res.json()

    titles = [m["title"] for m in materials]
    assert "BCA Web Dev Notes" in titles
    assert "Campus Orientation Handbook" in titles
    assert "B.Tech Compiler Design" not in titles  # Must NOT be visible to BCA students


def test_immutable_audit_logs_recorded(client, db_session, admin_headers):
    # Seed Student & Login
    student = Student(name="Amit Kumar", enrollment="BCA2024001", course="BCA", status="active")
    db_session.add(student)
    db_session.commit()

    client.post("/auth/student-login", json={"enrollment": "BCA2024001", "device_id": "audit_dev_1"})

    # Admin checks audit logs
    audit_res = client.get("/audit-logs", headers=admin_headers)
    assert audit_res.status_code == 200
    data = audit_res.json()
    assert data["total"] >= 1
    events = [l["event_type"] for l in data["logs"]]
    assert "STUDENT_LOGIN_SUCCESS" in events
    # Verify cryptographic hash exists on every log
    for l in data["logs"]:
        assert "log_hash" in l
        assert len(l["log_hash"]) == 64
