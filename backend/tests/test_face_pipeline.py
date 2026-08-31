import base64
import io
import json
from unittest.mock import MagicMock, patch

import cv2
import numpy as np
from PIL import Image

from services import face_service


def _create_synthetic_face_image(width: int = 240, height: int = 240) -> np.ndarray:
    """Creates a synthetic RGB image with geometric facial features."""
    img = np.zeros((height, width, 3), dtype=np.uint8) + 230  # Light background

    center_x, center_y = width // 2, height // 2
    # Face boundary / skin tone
    cv2.ellipse(img, (center_x, center_y), (60, 80), 0, 0, 360, (180, 200, 240), -1)
    # Eyes
    cv2.circle(img, (center_x - 22, center_y - 20), 8, (50, 50, 50), -1)
    cv2.circle(img, (center_x + 22, center_y - 20), 8, (50, 50, 50), -1)
    # Eyeballs / highlights
    cv2.circle(img, (center_x - 20, center_y - 22), 3, (255, 255, 255), -1)
    cv2.circle(img, (center_x + 24, center_y - 22), 3, (255, 255, 255), -1)
    # Nose
    cv2.line(img, (center_x, center_y - 8), (center_x, center_y + 12), (70, 70, 70), 2)
    # Mouth
    cv2.ellipse(img, (center_x, center_y + 35), (25, 12), 0, 0, 180, (40, 40, 180), 3)

    return img


def test_real_face_detection_and_hog_pipeline():
    """Tests end-to-end decode -> HOG vector generation -> L2 normalization."""
    raw_face = _create_synthetic_face_image(240, 240)

    # 1. Convert to Base64 (both raw and data URL prefix format)
    _, buf = cv2.imencode(".png", cv2.cvtColor(raw_face, cv2.COLOR_RGB2BGR))
    b64_data = base64.b64encode(buf).decode("utf-8")
    b64_with_prefix = f"data:image/png;base64,{b64_data}"

    # 2. Test decode_image for both formats
    decoded_plain = face_service.decode_image(b64_data)
    decoded_prefixed = face_service.decode_image(b64_with_prefix)

    assert decoded_plain.shape == (240, 240, 3)
    assert decoded_prefixed.shape == (240, 240, 3)
    assert np.allclose(decoded_plain, decoded_prefixed)

    # 3. Test HOG vector extraction on grayscale
    gray = cv2.cvtColor(decoded_plain, cv2.COLOR_RGB2GRAY)
    vec = face_service._hog_vec(gray)

    # HOGDescriptor((64,64), (16,16), (8,8), (8,8), 9) -> 7*7 * 4 * 9 = 1764 dimensions
    assert isinstance(vec, np.ndarray)
    assert vec.shape == (1764,), f"Expected 1764 dimensions, got {vec.shape}"
    assert np.isclose(np.linalg.norm(vec), 1.0, atol=1e-3), "HOG vector must be L2 normalized"

    # 4. Test extract_encodings with simulated face detection
    mock_cascade = MagicMock()
    mock_cascade.detectMultiScale.return_value = [(40, 40, 160, 160)]
    with patch.object(face_service, "_CASCADE", mock_cascade):
        encodings = face_service.extract_encodings(decoded_plain)
        assert len(encodings) == 1
        assert len(encodings[0]) == 1764


def test_non_face_image_rejected():
    """Tests that images without detectable faces are correctly rejected."""
    # Pure blank black image
    blank = np.zeros((240, 240, 3), dtype=np.uint8)
    blank_encodings = face_service.extract_encodings(blank)
    assert blank_encodings == [], "Blank image must return empty encodings"

    # Pure random noise image
    np.random.seed(123)
    noise = np.random.randint(0, 255, (240, 240, 3), dtype=np.uint8)
    noise_encodings = face_service.extract_encodings(noise)
    assert noise_encodings == [], "Uniform noise image must not produce false face encodings"


def test_liveness_rejection_of_static_spoof():
    """Tests that identical or near-identical burst frames are rejected as a static photo attack."""
    np.random.seed(42)
    textured_frame = np.random.randint(40, 220, (240, 320, 3), dtype=np.uint8)

    mock_cascade = MagicMock()
    mock_cascade.detectMultiScale.return_value = [(50, 50, 100, 100)]

    with patch.object(face_service, "_CASCADE", mock_cascade):
        # 1. Exact identical frames (motion delta == 0.0 < 0.6)
        identical_frames = [textured_frame.copy(), textured_frame.copy()]
        res_static = face_service.verify_liveness(identical_frames)

        assert res_static["is_live"] is False
        assert "Static photo detected" in res_static["reason"]
        assert res_static["score"] < 0.6

        # 2. Single frame / empty frame list
        res_single = face_service.verify_liveness([textured_frame])
        assert res_single["is_live"] is False
        assert "At least 2 burst frames required" in res_single["reason"]


def test_liveness_accepts_natural_motion():
    """Tests that genuine live micro-motion passes the liveness verification."""
    np.random.seed(42)
    frame1 = np.random.randint(40, 220, (240, 320, 3), dtype=np.uint8)

    # Frame 2 has natural localized micro-movement (e.g. eyes blinking or head moving slightly)
    frame2 = frame1.copy()
    frame2[60:140, 80:180] = (frame2[60:140, 80:180].astype(int) + 14).clip(0, 255).astype(np.uint8)

    mock_cascade = MagicMock()
    mock_cascade.detectMultiScale.return_value = [(50, 50, 100, 100)]

    with patch.object(face_service, "_CASCADE", mock_cascade):
        res_live = face_service.verify_liveness([frame1, frame2])

        assert res_live["is_live"] is True
        assert res_live["motion_score"] >= 0.6
        assert res_live["motion_score"] <= 120.0
        assert res_live["texture_score"] >= 15.0
        assert res_live["message"] == "Liveness check passed."


def test_face_recognition_matching_and_confidence():
    """Tests cosine similarity matching logic and confidence score scaling."""
    # Synthetic registered student vector (1764-dim unit vector)
    np.random.seed(99)
    vec1 = np.random.randn(1764)
    vec1 = vec1 / np.linalg.norm(vec1)

    # Create mock student with registered vector
    mock_student = MagicMock()
    mock_student.id = 101
    mock_student.name = "Alice Test"
    mock_student.enrollment = "CS2026_01"
    mock_student.face_encodings = json.dumps([vec1.tolist()])

    # 1. Query with high-similarity vector (dot product ~ 0.98 -> high confidence)
    query_vec = vec1 + np.random.normal(0, 0.005, 1764)
    query_vec = query_vec / np.linalg.norm(query_vec)

    mock_cascade = MagicMock()
    mock_cascade.detectMultiScale.return_value = [(50, 50, 100, 100)]

    dummy_image = np.zeros((200, 200, 3), dtype=np.uint8)

    with patch.object(face_service, "_face_vecs_with_boxes", return_value=[(query_vec, (50, 50, 100, 100))]):
        matches = face_service.recognize_faces(dummy_image, [mock_student])
        assert len(matches) == 1
        assert matches[0]["student_id"] == 101
        assert matches[0]["name"] == "Alice Test"
        assert matches[0]["confidence"] >= 80.0
        assert matches[0]["similarity"] >= 0.78


def test_screen_reflection_spoof_rejection():
    """Tests that screen reflection glare is detected and rejected."""
    np.random.seed(42)
    frame1 = np.random.randint(40, 220, (240, 320, 3), dtype=np.uint8)
    # Simulate screen reflection (large clipping white patch over face region)
    frame1[50:150, 50:150] = 255
    frame2 = frame1.copy()
    frame2[50:150, 50:150] = 254

    mock_cascade = MagicMock()
    mock_cascade.detectMultiScale.return_value = [(50, 50, 100, 100)]

    with patch.object(face_service, "_CASCADE", mock_cascade):
        res = face_service.verify_liveness([frame1, frame2])
        assert res["is_live"] is False
        assert "Video replay / screen spoofing detected" in res["reason"]
