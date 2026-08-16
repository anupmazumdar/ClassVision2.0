import base64
import json
import time
from unittest.mock import MagicMock, patch

import cv2
import numpy as np
from fastapi import HTTPException

from config import ATTENDANCE_TICKET_SECRET, JWT_SECRET, SESSION_CODE_SECRET
from database import SessionLocal, init_db
from middleware.jwt_middleware import require_teacher_or_admin
from models import ClassSession, Student, User
from repositories import attendance_repo, session_repo, student_repo, user_repo
from services import attendance_service, face_service, session_service, student_service


def test_hardened_security():
    print("\n=======================================================")
    print("RUNNING CLASSVISION HARDENED SECURITY & ANTI-SPOOF TEST")
    print("=======================================================")
    init_db()
    db = SessionLocal()

    try:
        # Create Teacher & Student users
        teacher = user_repo.get_user_by_email(db, "prof_hardened@test.com")
        if not teacher:
            teacher = user_repo.create_user(
                db,
                name="Prof Hardened",
                email="prof_hardened@test.com",
                password_hash="fakehash",
                role="teacher",
            )

        # -------------------------------------------------------------
        # 1. SECRET DECOUPLING VERIFICATION
        # -------------------------------------------------------------
        print("\n1. Testing Secret Decoupling...")
        assert SESSION_CODE_SECRET != JWT_SECRET, "SESSION_CODE_SECRET should be distinct from JWT_SECRET"
        assert ATTENDANCE_TICKET_SECRET != JWT_SECRET, "ATTENDANCE_TICKET_SECRET should be distinct from JWT_SECRET"
        print("   -> Secrets are properly decoupled into dedicated cryptographic keys.")

        # -------------------------------------------------------------
        # 2. LIVENESS CHECK & ANTI-SPOOFING (MOTION DELTA + TEXTURE)
        # -------------------------------------------------------------
        print("\n2. Testing Liveness & Anti-Spoofing Algorithm...")
        
        # 2A: Empty/No-face rejection
        empty_frame = np.zeros((240, 320, 3), dtype=np.uint8)
        res_noface = face_service.verify_liveness([empty_frame, empty_frame])
        assert res_noface["is_live"] is False
        assert "Face not continuously detected" in res_noface["reason"]
        print("   2A. No-face frame -> correctly rejected ('Face not continuously detected').")

        # 2B: Duplicate Static Photo rejection (avg_diff == 0.0 < 0.6)
        np.random.seed(42)
        textured_frame = np.random.randint(50, 200, (240, 320, 3), dtype=np.uint8)
        mock_cascade = MagicMock()
        mock_cascade.detectMultiScale.return_value = [(50, 50, 100, 100)]

        with patch.object(face_service, "_CASCADE", mock_cascade):
            static_frames = [textured_frame.copy(), textured_frame.copy()]
            res_static = face_service.verify_liveness(static_frames)
            assert res_static["is_live"] is False
            assert "Static photo detected" in res_static["reason"]
            assert res_static["score"] == 0.0
            print(f"   2B. Static duplicate photo (delta={res_static['score']}) -> correctly rejected ('Static photo detected').")

            # 2C: Live natural micro-movement
            live_frame_2 = textured_frame.copy()
            live_frame_2[60:150, 60:150] = (live_frame_2[60:150, 60:150].astype(int) + 12).clip(0, 255).astype(np.uint8)
            res_live = face_service.verify_liveness([textured_frame, live_frame_2])
            assert res_live["is_live"] is True
            print(f"   2C. Genuine live micro-movement (motion_score={res_live['motion_score']}) -> PASSED.")

        # -------------------------------------------------------------
        # 3. DIRECT SPOOF REJECTION & HMAC ATTENDANCE TICKET
        # -------------------------------------------------------------
        print("\n3. Testing Direct Curl/Postman Spoof Rejection & HMAC Tickets...")
        session_ticket_test = session_repo.create_session(
            db,
            subject="Secure Cryptography 101",
            room="Lab 3",
            teacher_id=teacher.id,
            require_code=False,
        )

        st_crypto = student_repo.get_student_by_enrollment(db, "CRYPTO_01")
        if st_crypto:
            student_service.delete_student(db, st_crypto.id)
        st_crypto = student_repo.create_student(db, enrollment="CRYPTO_01", name="Crypto Student", department="CS")

        # 3A: Direct mark attempt WITHOUT ticket (e.g. from curl or Postman)
        try:
            attendance_service.mark_attendance_with_ticket(
                db,
                session_id=session_ticket_test.id,
                student_id=st_crypto.id,
                attendance_ticket="",
            )
            assert False, "Should have failed without cryptographic ticket"
        except HTTPException as e:
            assert e.status_code == 403
            print(f"   3A. Direct curl mark without ticket -> correctly rejected with HTTP 403 ({e.detail[:40]}...)")

        # 3B: Forged ticket attempt (invalid HMAC signature)
        forged_ticket = base64.urlsafe_b64encode(
            json.dumps({
                "payload": base64.urlsafe_b64encode(json.dumps({
                    "session_id": session_ticket_test.id,
                    "student_id": st_crypto.id,
                    "confidence": 99.0,
                    "ts": int(time.time()),
                }).encode()).decode(),
                "sig": "fake_forged_hmac_signature_0000000000000000",
            }).encode()
        ).decode()

        try:
            attendance_service.mark_attendance_with_ticket(
                db,
                session_id=session_ticket_test.id,
                student_id=st_crypto.id,
                attendance_ticket=forged_ticket,
            )
            assert False, "Should have failed forged ticket check"
        except HTTPException as e:
            assert e.status_code == 403
            print(f"   3B. Forged HMAC ticket -> correctly rejected with HTTP 403 ({e.detail})")

        # 3C: Valid server-generated ticket -> should pass
        valid_ticket = attendance_service.generate_attendance_ticket(
            session_id=session_ticket_test.id,
            student_id=st_crypto.id,
            confidence=94.5,
        )
        mark_res = attendance_service.mark_attendance_with_ticket(
            db,
            session_id=session_ticket_test.id,
            student_id=st_crypto.id,
            attendance_ticket=valid_ticket,
        )
        assert mark_res["already_present"] is False
        print("   3C. Valid server-issued HMAC attendance ticket -> accepted successfully.")

        # -------------------------------------------------------------
        # 4. GEOFENCING & 30s ROTATING CODE & DEVICE BINDING
        # -------------------------------------------------------------
        print("\n4. Testing Geofencing, Rotating TOTP Code, and Device Binding...")
        session_full_sec = session_repo.create_session(
            db,
            subject="Full Security Session",
            room="Room 500",
            teacher_id=teacher.id,
            room_lat=26.850000,
            room_lng=75.800000,
            radius_meters=100.0,
            require_code=True,
        )

        code_info = session_service.get_current_session_code(session_full_sec.id)
        current_code = code_info["code"]

        st_sec = student_repo.get_student_by_enrollment(db, "SEC_STUDENT")
        if st_sec:
            student_service.delete_student(db, st_sec.id)
        st_sec = student_repo.create_student(db, enrollment="SEC_STUDENT", name="Secure Student", department="IT")

        # Ticket for secure student
        ticket_sec = attendance_service.generate_attendance_ticket(
            session_id=session_full_sec.id,
            student_id=st_sec.id,
            confidence=96.0,
            device_id="device-alpha-primary",
        )

        # 4A: Wrong GPS Location (> 100m)
        try:
            attendance_service.mark_attendance_with_ticket(
                db,
                session_id=session_full_sec.id,
                student_id=st_sec.id,
                attendance_ticket=ticket_sec,
                lat=26.860000,  # > 1km away
                lng=75.810000,
                code=current_code,
                device_id="device-alpha-primary",
            )
            assert False, "Should have failed geofence"
        except HTTPException as e:
            assert e.status_code == 403
            print(f"   4A. Geofence violation -> correctly rejected with HTTP 403 ({e.detail[:45]}...)")

        # 4B: Correct GPS (19m), Correct Code, First Device -> Success
        ticket_sec_fresh = attendance_service.generate_attendance_ticket(
            session_id=session_full_sec.id,
            student_id=st_sec.id,
            confidence=96.0,
            device_id="device-alpha-primary",
        )
        mark_sec_res = attendance_service.mark_attendance_with_ticket(
            db,
            session_id=session_full_sec.id,
            student_id=st_sec.id,
            attendance_ticket=ticket_sec_fresh,
            lat=26.850150,
            lng=75.800100,
            code=current_code,
            device_id="device-alpha-primary",
        )
        assert mark_sec_res["already_present"] is False
        db.refresh(st_sec)
        assert st_sec.device_id == "device-alpha-primary"
        print("   4B. Valid GPS + Code + Device Binding check -> accepted successfully.")

        # 4C: Proxy check-in attempt on different session from unauthorized device
        session_full_sec_2 = session_repo.create_session(
            db,
            subject="Session 2",
            room="Room 501",
            teacher_id=teacher.id,
            require_code=False,
        )
        ticket_proxy = attendance_service.generate_attendance_ticket(
            session_id=session_full_sec_2.id,
            student_id=st_sec.id,
            confidence=96.0,
            device_id="device-ILLEGAL-PROXY",
        )
        try:
            attendance_service.mark_attendance_with_ticket(
                db,
                session_id=session_full_sec_2.id,
                student_id=st_sec.id,
                attendance_ticket=ticket_proxy,
                device_id="device-ILLEGAL-PROXY",
            )
            assert False, "Should have failed device mismatch"
        except HTTPException as e:
            assert e.status_code == 403
            print(f"   4C. Device proxy attempt -> correctly rejected with HTTP 403 ({e.detail})")

        # -------------------------------------------------------------
        # 5. SESSION CODE BRUTE-FORCE RATE LIMITING
        # -------------------------------------------------------------
        print("\n5. Testing Session-Code Brute-Force Rate Limiting...")
        session_rate_test = session_repo.create_session(
            db,
            subject="Rate Limited Class",
            room="Room 502",
            teacher_id=teacher.id,
            require_code=True,
        )
        st_rate = student_repo.get_student_by_enrollment(db, "RATE_01")
        if st_rate:
            student_service.delete_student(db, st_rate.id)
        st_rate = student_repo.create_student(db, enrollment="RATE_01", name="Rate Student", department="CS")

        rate_device = "device-brute-tester"
        ticket_rate = attendance_service.generate_attendance_ticket(
            session_id=session_rate_test.id,
            student_id=st_rate.id,
            confidence=95.0,
            device_id=rate_device,
        )

        # Send 5 wrong code guesses
        for attempt_i in range(5):
            try:
                attendance_service.mark_attendance_with_ticket(
                    db,
                    session_id=session_rate_test.id,
                    student_id=st_rate.id,
                    attendance_ticket=ticket_rate,
                    code="000000",
                    device_id=rate_device,
                )
            except HTTPException as e:
                assert e.status_code == 400

        # 6th attempt should now be rate limited with HTTP 429
        try:
            attendance_service.mark_attendance_with_ticket(
                db,
                session_id=session_rate_test.id,
                student_id=st_rate.id,
                attendance_ticket=ticket_rate,
                code="000000",
                device_id=rate_device,
            )
            assert False, "6th attempt should have triggered HTTP 429 rate limit"
        except HTTPException as e:
            assert e.status_code == 429, f"Expected 429, got {e.status_code}"
            print(f"   5A. Brute-force code guessing correctly locked out with HTTP 429 ({e.detail})")

        # -------------------------------------------------------------
        # 6. TEACHER MANUAL MARK
        # -------------------------------------------------------------
        print("\n6. Testing Teacher/Admin Manual Mark Override...")
        st_manual = student_repo.get_student_by_enrollment(db, "MANUAL_01")
        if st_manual:
            student_service.delete_student(db, st_manual.id)
        st_manual = student_repo.create_student(db, enrollment="MANUAL_01", name="Manual Student", department="ECE")

        man_res = attendance_service.manual_mark_teacher(db, session_full_sec_2.id, st_manual.id)
        assert man_res["already_present"] is False
        print("   6A. Teacher manual override -> recorded present with 0 confidence.")

        # -------------------------------------------------------------
        # 7. REPORT & PRIVACY ROLE-BASED ACCESS CONTROL (RBAC)
        # -------------------------------------------------------------
        print("\n7. Testing Report & Privacy Role-Based Access Control...")
        student_user = {"sub": "999", "role": "student", "email": "student@test.com"}
        teacher_user = {"sub": "100", "role": "teacher", "email": "teacher@test.com"}
        admin_user = {"sub": "1", "role": "admin", "email": "admin@test.com"}

        # Student role must be blocked from report downloads / summary / email relays
        try:
            require_teacher_or_admin(student_user)
            assert False, "Student role should be denied access to reports"
        except HTTPException as e:
            assert e.status_code == 403
            print(f"   7A. Student access to reports/privacy endpoints -> correctly blocked ({e.detail})")

        # Teacher & Admin roles must pass
        assert require_teacher_or_admin(teacher_user) == teacher_user
        assert require_teacher_or_admin(admin_user) == admin_user
        print("   7B. Teacher & Admin access to reports -> successfully authorized.")

        # Clean up
        student_service.delete_student(db, st_crypto.id)
        student_service.delete_student(db, st_sec.id)
        student_service.delete_student(db, st_rate.id)
        student_service.delete_student(db, st_manual.id)
        session_service.delete_session(db, session_ticket_test.id)
        session_service.delete_session(db, session_full_sec.id)
        session_service.delete_session(db, session_full_sec_2.id)
        session_service.delete_session(db, session_rate_test.id)

        print("\n=======================================================")
        print("ALL CRITICAL HARDENED SECURITY CHECKS PASSED PERFECTLY!")
        print("=======================================================")

    finally:
        db.close()


if __name__ == "__main__":
    test_hardened_security()
