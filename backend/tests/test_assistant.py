import pytest
from fastapi.testclient import TestClient
from main import app
from services import assistant_service


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def test_assistant_greeting(client):
    res = client.post("/assistant/chat", json={"message": "hello"})
    assert res.status_code == 200
    data = res.json()
    assert "UEM ClassVision" in data["reply"]
    assert len(data["suggestions"]) > 0


def test_assistant_self_checkin_query(client):
    res = client.post("/assistant/chat", json={"message": "how do students self checkin on mobile"})
    assert res.status_code == 200
    data = res.json()
    assert "Check-in Portal" in data["reply"] or "self check-in" in data["reply"].lower()
    assert data["action"] is not None
    assert data["action"]["link"] == "/checkin"


def test_assistant_geofence_query(client):
    res = client.post("/assistant/chat", json={"message": "how does 100m geofence work"})
    assert res.status_code == 200
    data = res.json()
    assert "100" in data["reply"]
    assert "geofence" in data["reply"].lower() or "gps" in data["reply"].lower()


def test_assistant_classroom_query(client):
    res = client.post("/assistant/chat", json={"message": "how can teachers upload notes and assignments"})
    assert res.status_code == 200
    data = res.json()
    assert "Classroom" in data["reply"]
    assert data["action"]["link"] == "/classroom"


def test_assistant_75_percent_rule(client):
    res = client.post("/assistant/chat", json={"message": "what is 75% attendance rule in uem"})
    assert res.status_code == 200
    data = res.json()
    assert "75%" in data["reply"]
    assert "UEM" in data["reply"]


def test_assistant_faqs_endpoint(client):
    res = client.get("/assistant/faqs")
    assert res.status_code == 200
    faqs = res.json()
    assert len(faqs) >= 3
    assert any("Attendance" in cat["category"] for cat in faqs)
