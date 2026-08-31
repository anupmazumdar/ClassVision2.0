"""Locust load-testing script for ClassVision 2.0.

Simulates 30-50 concurrent students performing high-concurrency self check-in,
burst biometric frame verification, and classroom geofence validation.

Usage:
    pip install locust
    locust -f locustfile.py --host=http://127.0.0.1:8000 --users=50 --spawn-rate=10 --run-time=1m
"""

import json
import random
from locust import HttpUser, between, task

# Minimal synthetic 1x1 test image base64
DUMMY_IMAGE_B64 = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
)


class StudentCheckinUser(HttpUser):
    wait_time = between(1, 3)

    def on_start(self):
        self.student_id = random.randint(1, 500)
        self.enrollment = f"STU{self.student_id:04d}"
        self.pin = "1234"
        self.device_id = f"load-test-device-{self.student_id}"
        self.token = None

        # Authenticate student
        res = self.client.post(
            "/auth/student-login",
            json={
                "enrollment": self.enrollment,
                "pin": self.pin,
                "device_id": self.device_id,
                "device_info": "Locust Load Generator/1.0",
            },
        )
        if res.status_code == 200:
            data = res.json()
            self.token = data.get("access_token")

    @task(3)
    def self_checkin_flow(self):
        """Simulates geofenced biometric check-in burst."""
        headers = {"Authorization": f"Bearer {self.token}"} if self.token else {}
        self.client.post(
            "/attendance/self-checkin",
            json={
                "code": "123456",
                "image": DUMMY_IMAGE_B64,
                "frames": [DUMMY_IMAGE_B64, DUMMY_IMAGE_B64],
                "lat": 22.5726,
                "lng": 88.3639,
                "device_id": self.device_id,
            },
            headers=headers,
            name="/attendance/self-checkin (burst)",
        )

    @task(1)
    def query_classroom_materials(self):
        """Simulates browsing course materials during class."""
        headers = {"Authorization": f"Bearer {self.token}"} if self.token else {}
        self.client.get("/materials?course=B.Tech&year=1", headers=headers, name="/materials")
