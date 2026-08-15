import base64
import io
import json
import os
from typing import Dict, List, Optional, Tuple

import cv2
import numpy as np
from PIL import Image

_CASCADE = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
_FACE_SIZE = (64, 64)
_HOG = cv2.HOGDescriptor(_FACE_SIZE, (16, 16), (8, 8), (8, 8), 9)
_THRESHOLD = float(os.getenv("FACE_SIMILARITY", "0.82"))


def decode_image(b64: str) -> np.ndarray:
    if "," in b64:
        b64 = b64.split(",")[1]
    img_bytes = base64.b64decode(b64)
    pil_img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    return np.array(pil_img)


def _hog_vec(gray_face: np.ndarray) -> np.ndarray:
    face = cv2.resize(gray_face, _FACE_SIZE)
    desc = _HOG.compute(face).flatten().astype(np.float64)
    norm = np.linalg.norm(desc)
    return desc / norm if norm > 0 else desc


def _face_vecs(rgb: np.ndarray) -> List[np.ndarray]:
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    faces = _CASCADE.detectMultiScale(gray, 1.1, 5, minSize=(30, 30))
    return [_hog_vec(gray[y : y + h, x : x + w]) for (x, y, w, h) in faces]


def extract_encodings(image_array: np.ndarray) -> List[List[float]]:
    return [v.tolist() for v in _face_vecs(image_array)]


def recognize_faces(image_array: np.ndarray, students: list) -> List[dict]:
    h, w = image_array.shape[:2]
    scale = 0.5 if max(h, w) > 640 else 1.0
    if scale < 1.0:
        small = np.array(Image.fromarray(image_array).resize((int(w * scale), int(h * scale))))
    else:
        small = image_array

    query_vecs = _face_vecs(small)
    if not query_vecs:
        return []

    known_vecs: List[np.ndarray] = []
    known_owners: list = []
    for s in students:
        try:
            stored = json.loads(s.face_encodings or "[]")
            for v in stored:
                known_vecs.append(np.array(v, dtype=np.float64))
                known_owners.append(s)
        except (json.JSONDecodeError, ValueError):
            continue

    if not known_vecs:
        return []

    seen_ids = set()
    results = []
    for qv in query_vecs:
        sims = [float(np.dot(qv, kv)) for kv in known_vecs]
        best_idx = int(np.argmax(sims))
        best_sim = sims[best_idx]

        if best_sim >= _THRESHOLD:
            student = known_owners[best_idx]
            if student.id not in seen_ids:
                seen_ids.add(student.id)
                results.append(
                    {
                        "student_id": student.id,
                        "name": student.name,
                        "enrollment": student.enrollment,
                        "confidence": round(best_sim * 100, 1),
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
        # Resize to same dimension if needed
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
