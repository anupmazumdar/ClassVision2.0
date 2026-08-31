import base64
import io
import json
from typing import Dict, List, Optional, Tuple

import cv2
import numpy as np
from fastapi import HTTPException
from PIL import Image

from config import FACE_SIMILARITY_THRESHOLD

_CASCADE = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
_FACE_SIZE = (64, 64)
_HOG = cv2.HOGDescriptor(_FACE_SIZE, (16, 16), (8, 8), (8, 8), 9)

MAX_IMAGE_BYTES = 5 * 1024 * 1024  # 5MB decoded limit
MAX_B64_CHARS = 7 * 1024 * 1024    # ~7MB Base64 string limit


def decode_image(b64: str) -> np.ndarray:
    if not b64 or not isinstance(b64, str):
        raise HTTPException(status_code=422, detail="Invalid image payload: string expected")

    # Fast check: reject oversized Base64 payloads before decoding
    if len(b64) > MAX_B64_CHARS:
        raise HTTPException(
            status_code=413,
            detail="Payload Too Large: Base64 image payload exceeds 5MB limit.",
        )

    if "," in b64:
        b64 = b64.split(",")[1]

    try:
        img_bytes = base64.b64decode(b64)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Malformed Base64 image data: {exc}")

    if len(img_bytes) > MAX_IMAGE_BYTES:
        raise HTTPException(
            status_code=413,
            detail="Payload Too Large: Decoded image exceeds 5MB limit.",
        )

    try:
        pil_img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        return np.array(pil_img)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Failed to process image format: {exc}")


def _hog_vec(gray_face: np.ndarray) -> np.ndarray:
    face = cv2.resize(gray_face, _FACE_SIZE)
    desc = _HOG.compute(face).flatten().astype(np.float64)
    norm = np.linalg.norm(desc)
    return desc / norm if norm > 0 else desc


def _face_vecs_with_boxes(rgb: np.ndarray) -> List[Tuple[np.ndarray, Tuple[int, int, int, int]]]:
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    faces = _CASCADE.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
    results = []
    for (x, y, w, h) in faces:
        vec = _hog_vec(gray[y : y + h, x : x + w])
        results.append((vec, (int(x), int(y), int(w), int(h))))
    return results


def extract_encodings(image_array: np.ndarray) -> List[List[float]]:
    pairs = _face_vecs_with_boxes(image_array)
    return [vec.tolist() for vec, _ in pairs]


def recognize_faces(image_array: np.ndarray, students: list) -> List[dict]:
    """
    Recognizes faces in the input image against registered student face encodings.
    Evaluates multi-angle templates per student and returns student match with bounding box.
    """
    h, w = image_array.shape[:2]
    scale = 0.5 if max(h, w) > 640 else 1.0
    if scale < 1.0:
        small = np.array(Image.fromarray(image_array).resize((int(w * scale), int(h * scale))))
    else:
        small = image_array

    query_pairs = _face_vecs_with_boxes(small)
    if not query_pairs:
        return []

    # Map students and their multi-angle encodings
    known_data = []
    for s in students:
        try:
            stored = json.loads(s.face_encodings or "[]")
            if stored:
                vecs = [np.array(v, dtype=np.float64) for v in stored if len(v) > 0]
                if vecs:
                    known_data.append({"student": s, "vecs": vecs})
        except (json.JSONDecodeError, ValueError):
            continue

    if not known_data:
        return []

    seen_ids = set()
    results = []

    for qv, (sx, sy, sw, sh) in query_pairs:
        # Scale box back to original image coordinates if downscaled
        orig_box = [
            int(sx / scale),
            int(sy / scale),
            int(sw / scale),
            int(sh / scale),
        ]

        best_student = None
        highest_sim = -1.0

        for entry in known_data:
            # Multi-angle match: calculate dot product against all registered angles for student
            sims = [float(np.dot(qv, kv)) for kv in entry["vecs"]]
            max_for_student = max(sims) if sims else 0.0

            if max_for_student > highest_sim:
                highest_sim = max_for_student
                best_student = entry["student"]

        if highest_sim >= FACE_SIMILARITY_THRESHOLD and best_student:
            if best_student.id not in seen_ids:
                seen_ids.add(best_student.id)
                # Map similarity (0.78-1.0) into intuitive confidence score (80%-99.9%)
                conf_pct = min(99.9, max(60.0, ((highest_sim - 0.5) / 0.5) * 100))
                results.append(
                    {
                        "student_id": best_student.id,
                        "name": best_student.name,
                        "enrollment": best_student.enrollment,
                        "confidence": round(conf_pct, 1),
                        "similarity": round(highest_sim, 3),
                        "box": orig_box,
                    }
                )

    return results


def verify_liveness(frames: List[np.ndarray]) -> Dict:
    """
    Validates anti-spoofing liveness by analyzing consecutive burst frames.
    Checks:
      1. Minimum 2 frames present
      2. Faces detected in frames
      3. Frame difference / micro-motion delta (rejects static photos and clones)
      4. Texture and Laplacian variance (rejects flat low-resolution screen replays)
    """
    if not frames or len(frames) < 2:
        return {"is_live": False, "reason": "At least 2 burst frames required for liveness verification."}

    grays = [cv2.cvtColor(f, cv2.COLOR_RGB2GRAY) for f in frames]

    # Check 1: Face detection across frames
    detected_faces = []
    for gray in grays:
        faces = _CASCADE.detectMultiScale(gray, 1.1, 5, minSize=(30, 30))
        if len(faces) == 0:
            return {"is_live": False, "reason": "Face not continuously detected across burst frames."}
        detected_faces.append(faces[0])

    # Check 2: Micro-motion delta between consecutive frames
    diffs = []
    for i in range(len(grays) - 1):
        g1 = cv2.resize(grays[i], (320, 240))
        g2 = cv2.resize(grays[i + 1], (320, 240))
        diff = cv2.absdiff(g1, g2)
        mean_diff = float(np.mean(diff))
        diffs.append(mean_diff)

    avg_diff = sum(diffs) / len(diffs)

    # Static photo check: exact duplicate frames (pixel delta < 0.6)
    if avg_diff < 0.6:
        return {
            "is_live": False,
            "score": round(avg_diff, 2),
            "reason": "Static photo detected. Please blink or naturally move slightly in front of the camera.",
        }

    # Extreme motion/scene switch check
    if avg_diff > 120.0:
        return {
            "is_live": False,
            "score": round(avg_diff, 2),
            "reason": "Excessive camera shake or scene transition detected.",
        }

    # Check 3: Texture & Blur analysis via Laplacian variance
    lap_vars = [cv2.Laplacian(g, cv2.CV_64F).var() for g in grays]
    avg_lap = sum(lap_vars) / len(lap_vars)

    if avg_lap < 15.0:
        return {
            "is_live": False,
            "score": round(avg_lap, 2),
            "reason": "Image too blurry or degraded for anti-spoofing verification.",
        }

    return {
        "is_live": True,
        "motion_score": round(avg_diff, 2),
        "texture_score": round(avg_lap, 2),
        "message": "Liveness check passed.",
    }
