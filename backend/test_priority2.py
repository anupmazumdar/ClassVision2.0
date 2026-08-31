import json
import os
from datetime import datetime

os.environ.setdefault("FACE_ENCRYPTION_KEY", "E9SSVPs9LfUYGdJv6CkE6xOyopZmKxAWHoFZPgXT7Sc=")
import numpy as np
from fastapi import HTTPException

from database import SessionLocal, engine, init_db
from models import Student
from repositories import student_repo
from services import student_service


def test_priority2_privacy_and_compliance():
    print("\n=======================================================")
    print("RUNNING PRIORITY 2: BIOMETRIC ENCRYPTION & CONSENT TEST")
    print("=======================================================")
    init_db()
    db = SessionLocal()

    try:
        # Create a test student
        enrollment = "P2_PRIVACY_001"
        st = student_repo.get_student_by_enrollment(db, enrollment)
        if st:
            student_service.delete_student(db, st.id)
        st = student_repo.create_student(db, enrollment=enrollment, name="Privacy Test Student", department="CS")

        # -------------------------------------------------------------
        # 1. TEST CONSENT ENFORCEMENT ON BIOMETRIC REGISTRATION
        # -------------------------------------------------------------
        print("\n1. Testing Mandatory Biometric Consent Enforcement...")
        # Dummy synthetic encoding payload
        dummy_encodings = [[round(float(x), 4) for x in np.random.randn(128)]]
        enc_json = json.dumps(dummy_encodings)

        # 1A: Attempting registration without consent -> HTTP 400
        try:
            # Call student_service.register_face with consent=False
            student_service.register_face(db, st.id, images=[], consent=False)
            assert False, "Should have failed without consent"
        except HTTPException as e:
            assert e.status_code == 400
            assert "Consent is required" in e.detail
            print(f"   1A. Registration without consent -> correctly rejected with HTTP 400 ({e.detail})")

        # -------------------------------------------------------------
        # 2. TEST BIOMETRIC ENCRYPTION AT REST (FERNET AES-128)
        # -------------------------------------------------------------
        print("\n2. Testing Transparent Encryption at Rest in SQLite Database...")
        # Save face encodings directly through repo and record consent
        student_repo.update_student_face_encodings(db, st, enc_json)
        student_repo.record_face_consent(db, st)

        # Inspect raw database storage directly via raw SQL connection
        with engine.connect() as conn:
            raw_row = conn.exec_driver_sql(
                "SELECT face_encodings, consent_given, consent_at FROM students WHERE id = ?",
                (st.id,),
            ).fetchone()

            raw_db_encodings = raw_row[0]
            raw_consent_given = raw_row[1]
            raw_consent_at = raw_row[2]

            # Verify that raw DB value is encrypted ciphertext (Fernet tokens begin with gAAAAA)
            print(f"   Raw DB Ciphertext sample: {raw_db_encodings[:35]}...")
            assert raw_db_encodings.startswith("gAAAAA"), "Raw database value must be a Fernet ciphertext starting with gAAAAA"
            assert not raw_db_encodings.startswith("[["), "Raw database value MUST NOT be plaintext JSON"
            print("   2A. Raw SQLite storage verified: Biometric templates stored as encrypted ciphertext.")

        # -------------------------------------------------------------
        # 3. TEST TRANSPARENT ORM DECRYPTION
        # -------------------------------------------------------------
        print("\n3. Testing Transparent ORM Decryption...")
        db.expire_all()
        student_loaded = student_repo.get_student_by_id(db, st.id)
        decrypted_json = student_loaded.face_encodings

        # Verify that ORM transparently decrypted the ciphertext back into plaintext JSON
        loaded_list = json.loads(decrypted_json)
        assert len(loaded_list) == 1
        assert len(loaded_list[0]) == 128
        assert np.allclose(loaded_list[0], dummy_encodings[0], atol=1e-3)
        print("   3A. ORM decryption verified: Decrypted face vectors match original biometric vector.")

        # -------------------------------------------------------------
        # 4. TEST CONSENT AUDIT LOGGING & METADATA
        # -------------------------------------------------------------
        print("\n4. Testing Consent Audit Fields & API Metadata...")
        assert student_loaded.consent_given is True or student_loaded.consent_given == 1
        assert student_loaded.consent_at is not None
        print(f"   4A. Consent audit recorded: consent_given={student_loaded.consent_given}, consent_at={student_loaded.consent_at}")

        # Test list_students endpoint response
        students_list = student_service.list_students(db)
        target = next((s for s in students_list if s["id"] == st.id), None)
        assert target is not None
        assert target["has_face"] is True
        assert target["consent_given"] is True
        assert target["consent_at"] is not None
        print("   4B. Student listing metadata verified with biometric & consent status.")

        # Clean up
        student_service.delete_student(db, st.id)
        print("\n=======================================================")
        print("ALL PRIORITY 2 BIOMETRIC PRIVACY TESTS PASSED!")
        print("=======================================================")

    finally:
        db.close()


if __name__ == "__main__":
    test_priority2_privacy_and_compliance()
