import pytest
from repositories import student_repo


def test_student_mandatory_fields_and_auto_promote(client, teacher_headers, db_session):
    # 1. Create student with course, branch, year, semester, admission_year
    res = client.post(
        "/students",
        json={
            "enrollment": "CSE2024001",
            "name": "Arjun Kumar",
            "branch": "Computer Science & Engineering",
            "course": "B.Tech",
            "year": 1,
            "semester": 1,
            "admission_year": 2024,
        },
        headers=teacher_headers,
    )
    assert res.status_code == 201
    data = res.json()
    assert data["enrollment"] == "CSE2024001"
    assert data["branch"] == "Computer Science & Engineering"
    assert data["course"] == "B.Tech"

    # 2. Test auto-promotion: in 2026, 2024 admission should be Year 3 (Sem 6)
    res_promote = client.post(
        "/students/auto-promote?current_year=2026",
        headers=teacher_headers,
    )
    assert res_promote.status_code == 200
    assert res_promote.json()["updated_count"] >= 1

    # Verify student list shows updated year
    res_list = client.get("/students", headers=teacher_headers)
    students = res_list.json()
    arjun = next(s for s in students if s["enrollment"] == "CSE2024001")
    assert arjun["year"] == 3
    assert arjun["semester"] == 6


def test_classroom_materials_crud_and_whatsapp_link(client, teacher_headers, student_headers):
    # 1. Teacher creates a Study Note with WhatsApp link
    res_create = client.post(
        "/materials",
        json={
            "title": "Unit 2: Graph Theory & BFS/DFS",
            "material_type": "note",
            "subject": "Data Structures & Algorithms",
            "course": "B.Tech",
            "branch": "Computer Science & Engineering",
            "year": "2nd Year",
            "description": "Comprehensive notes covering graph traversals, adjacency matrices and adjacency lists.",
            "attachment_url": "https://example.com/notes-graph-theory.pdf",
            "attachment_name": "Graph_Theory_Unit2.pdf",
            "whatsapp_group_link": "https://chat.whatsapp.com/sampleUEMGroup",
        },
        headers=teacher_headers,
    )
    assert res_create.status_code == 201
    mat = res_create.json()
    mat_id = mat["id"]
    assert mat["title"] == "Unit 2: Graph Theory & BFS/DFS"
    assert mat["material_type"] == "note"
    assert mat["whatsapp_group_link"] == "https://chat.whatsapp.com/sampleUEMGroup"

    # 2. Student can list and view materials
    res_list = client.get("/materials?material_type=note", headers=student_headers)
    assert res_list.status_code == 200
    items = res_list.json()
    assert any(m["id"] == mat_id for m in items)

    # 3. Teacher creates an Assignment
    res_assign = client.post(
        "/materials",
        json={
            "title": "Assignment 3: Dijkstra Algorithm Implementation",
            "material_type": "assignment",
            "subject": "Data Structures & Algorithms",
            "course": "B.Tech",
            "branch": "Computer Science & Engineering",
            "year": "2nd Year",
            "description": "Implement Dijkstra's shortest path algorithm in C++ or Python.",
            "total_marks": 20,
        },
        headers=teacher_headers,
    )
    assert res_assign.status_code == 201
    assert res_assign.json()["total_marks"] == 20

    # 4. Student cannot delete materials -> 403
    res_del_stu = client.delete(f"/materials/{mat_id}", headers=student_headers)
    assert res_del_stu.status_code == 403

    # 5. Teacher deletes material -> 204
    res_del = client.delete(f"/materials/{mat_id}", headers=teacher_headers)
    assert res_del.status_code == 204
