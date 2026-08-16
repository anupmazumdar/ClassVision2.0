import sys
import numpy as np
import cv2
from unittest.mock import MagicMock, patch
from fastapi import HTTPException

from database import SessionLocal, init_db
from models import Student, ClassSession, User
from repositories import student_repo, session_repo, user_repo, attendance_repo
from services import attendance_service, session_service, student_service, face_service

def test_priority1_security():
    print("\n--- RUNNING PRIORITY 1 SECURITY & ANTI-SPOOFING TESTS ---")
    init_db()
    db = SessionLocal()

    try:
        # Create teacher
        teacher = user_repo.get_user_by_email(db, "teacher_p1@test.com")
        if not teacher:
            teacher = user_repo.create_user(
                db,
                name="Security Prof",
                email="teacher_p1@test.com",
                password_hash="fakehash",
                role="teacher",
            )

        # -------------------------------------------------------------
        # 1. TEST LIVENESS / ANTI-SPOOFING (MOTION DELTA & TEXTURE)
        # -------------------------------------------------------------
        print("\n1. Testing Liveness / Anti-Spoofing Algorithm...")
        
        # Test 1A: Non-face / Empty frame rejection (with real un-mocked Cascade)
        empty_frame = np.zeros((240, 320, 3), dtype=np.uint8)
        res_noface = face_service.verify_liveness([empty_frame, empty_frame])
        assert res_noface["is_live"] is False
        assert "Face not continuously detected" in res_noface["reason"]
        print("   1A. No-face frame -> correctly rejected ('Face not continuously detected').")

        # Create realistic texture frame for face region testing
        np.random.seed(42)
        textured_frame = np.random.randint(50, 200, (240, 320, 3), dtype=np.uint8)
        
        mock_cascade = MagicMock()
        mock_cascade.detectMultiScale.return_value = [(50, 50, 100, 100)]

        with patch.object(face_service, '_CASCADE', mock_cascade):
            # Test 1B: Exact Duplicate Static Photo (avg_diff == 0.0 < 0.6)
            static_frames = [textured_frame.copy(), textured_frame.copy()]
            res_static = face_service.verify_liveness(static_frames)
            assert res_static["is_live"] is False, "Duplicate frame should be rejected by motion check"
            assert "Static photo detected" in res_static["reason"], f"Unexpected reason: {res_static}"
            assert res_static["score"] == 0.0
            print(f"   1B. Static duplicate photo (delta={res_static['score']}) -> correctly rejected ('Static photo detected').")

            # Test 1C: Genuine Live Motion (subtle micro-movement, delta around 3.0-10.0)
            live_frame_2 = textured_frame.copy()
            # Add slight realistic micro-movement delta in sub-region
            live_frame_2[60:150, 60:150] = (live_frame_2[60:150, 60:150].astype(int) + 12).clip(0, 255).astype(np.uint8)
            res_live = face_service.verify_liveness([textured_frame, live_frame_2])
            assert res_live["is_live"] is True, f"Live frames failed: {res_live}"
            assert res_live["motion_score"] > 0.6 and res_live["motion_score"] < 120.0
            print(f"   1C. Genuine live micro-movement (motion_score={res_live['motion_score']}, texture_score={res_live['texture_score']}) -> PASSED ('Liveness check passed').")

            # Test 1D: Extreme Camera Shake / Scene Swapping (avg_diff > 120.0)
            shake_frame = np.full((240, 320, 3), 255, dtype=np.uint8)
            res_shake = face_service.verify_liveness([np.zeros((240, 320, 3), dtype=np.uint8), shake_frame])
            assert res_shake["is_live"] is False
            assert "Excessive camera shake" in res_shake["reason"]
            print(f"   1D. Sudden scene swap (delta={res_shake['score']}) -> correctly rejected ('Excessive camera shake').")

        # -------------------------------------------------------------
        # 2. TEST GEOFENCING
        # -------------------------------------------------------------
        print("\n2. Testing Geofencing Logic (Haversine Distance)...")
        # Classroom located at Lat 26.850000, Lng 75.800000 (Jaipur)
        classroom_lat = 26.850000
        classroom_lng = 75.800000
        
        # Close by (~19m away)
        student_near_lat = 26.850150
        student_near_lng = 75.800100
        dist_near = attendance_service.calculate_haversine_distance(
            student_near_lat, student_near_lng, classroom_lat, classroom_lng
        )
        assert dist_near < 50.0, f"Distance {dist_near} should be within 50m"
        print(f"   Nearby distance: {dist_near:.1f}m -> OK")

        # Far away (~923m away)
        student_far_lat = 26.857000
        student_far_lng = 75.805000
        dist_far = attendance_service.calculate_haversine_distance(
            student_far_lat, student_far_lng, classroom_lat, classroom_lng
        )
        assert dist_far > 500.0, f"Distance {dist_far} should be > 500m"
        print(f"   Far away distance: {dist_far:.1f}m -> Correctly calculated as out-of-range")

        # Create Geofenced session
        session_geo = session_repo.create_session(
            db,
            subject="Geofenced Security Class",
            room="Room 404",
            teacher_id=teacher.id,
            room_lat=classroom_lat,
            room_lng=classroom_lng,
            radius_meters=100.0,
            require_code=False,
        )

        # Create student
        st = student_repo.get_student_by_enrollment(db, "GEO001")
        if st:
            student_service.delete_student(db, st.id)
        st = student_repo.create_student(db, enrollment="GEO001", name="Geofence Student", department="CS")

        # Test attendance mark outside geofence (should throw 403)
        try:
            attendance_service.mark_attendance(
                db,
                session_id=session_geo.id,
                student_id=st.id,
                confidence=99.0,
                lat=student_far_lat,
                lng=student_far_lng,
            )
            assert False, "Should have failed geofence check"
        except HTTPException as e:
            assert e.status_code == 403
            print(f"   -> Geofence out-of-bounds rejected with HTTP 403 ({e.detail})")

        # Test attendance mark inside geofence (should pass)
        mark_near = attendance_service.mark_attendance(
            db,
            session_id=session_geo.id,
            student_id=st.id,
            confidence=99.0,
            lat=student_near_lat,
            lng=student_near_lng,
        )
        assert mark_near["already_present"] is False
        print("   -> Geofence in-bounds accepted successfully.")

        # -------------------------------------------------------------
        # 3. TEST ROTATING SESSION CODE
        # -------------------------------------------------------------
        print("\n3. Testing 30s Rotating Session Code...")
        session_code_test = session_repo.create_session(
            db,
            subject="TOTP Protected Class",
            room="Lab 2",
            teacher_id=teacher.id,
            require_code=True,
        )

        code_info = session_service.get_current_session_code(session_code_test.id)
        valid_code = code_info["code"]
        print(f"   Generated live code: {valid_code} (expires in {code_info['expires_in']}s)")

        st2 = student_repo.get_student_by_enrollment(db, "CODE002")
        if st2:
            student_service.delete_student(db, st2.id)
        st2 = student_repo.create_student(db, enrollment="CODE002", name="Code Student", department="IT")

        # Test with bad code (should throw 400)
        try:
            attendance_service.mark_attendance(
                db,
                session_id=session_code_test.id,
                student_id=st2.id,
                confidence=95.0,
                code="000000" if valid_code != "000000" else "111111",
            )
            assert False, "Should have failed bad code check"
        except HTTPException as e:
            assert e.status_code == 400
            print(f"   -> Invalid rotating code rejected with HTTP 400 ({e.detail})")

        # Test with valid code (should pass)
        mark_code = attendance_service.mark_attendance(
            db,
            session_id=session_code_test.id,
            student_id=st2.id,
            confidence=95.0,
            code=valid_code,
        )
        assert mark_code["already_present"] is False
        print("   -> Valid rotating code accepted successfully.")

        # -------------------------------------------------------------
        # 4. TEST DEVICE BINDING
        # -------------------------------------------------------------
        print("\n4. Testing Device Binding...")
        st3 = student_repo.get_student_by_enrollment(db, "DEV003")
        if st3:
            student_service.delete_student(db, st3.id)
        st3 = student_repo.create_student(db, enrollment="DEV003", name="Device Student", department="ECE")

        session_plain = session_repo.create_session(
            db,
            subject="Standard Class",
            room="Hall A",
            teacher_id=teacher.id,
        )

        # First mark binds device-uuid-aaa
        attendance_service.mark_attendance(
            db,
            session_id=session_plain.id,
            student_id=st3.id,
            confidence=90.0,
            device_id="device-uuid-aaa",
        )
        db.refresh(st3)
        assert st3.device_id == "device-uuid-aaa", "Device should be bound on first check-in"
        print(f"   Bound student to device: {st3.device_id}")

        # Another session: try marking with a different device
        session_plain2 = session_repo.create_session(
            db,
            subject="Standard Class 2",
            room="Hall B",
            teacher_id=teacher.id,
        )
        try:
            attendance_service.mark_attendance(
                db,
                session_id=session_plain2.id,
                student_id=st3.id,
                confidence=90.0,
                device_id="device-uuid-ILLEGAL-PROXY",
            )
            assert False, "Should have failed device mismatch check"
        except HTTPException as e:
            assert e.status_code == 403
            print(f"   -> Device mismatch proxy attempt rejected with HTTP 403 ({e.detail})")

        # Clean up test entities
        student_service.delete_student(db, st.id)
        student_service.delete_student(db, st2.id)
        student_service.delete_student(db, st3.id)
        session_service.delete_session(db, session_geo.id)
        session_service.delete_session(db, session_code_test.id)
        session_service.delete_session(db, session_plain.id)
        session_service.delete_session(db, session_plain2.id)
        print("\nALL PRIORITY 1 SECURITY & ANTI-SPOOFING TESTS PASSED PERFECTLY!")

    finally:
        db.close()

if __name__ == "__main__":
    test_priority1_security()
