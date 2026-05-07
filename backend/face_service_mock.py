# Mock Face Service - For demo purposes when face_recognition not installed
import base64
import json
import random
from typing import List, Dict

try:
    import numpy as np
    from PIL import Image
    import io
    HAS_PIL = True
except ImportError:
    HAS_PIL = False
    np = None


def decode_image(b64: str):
    """Decode base64 image to numpy array (RGB) or bytes if PIL not available"""
    try:
        if "," in b64:
            b64 = b64.split(",")[1]
        img_bytes = base64.b64decode(b64)
        
        if HAS_PIL:
            pil_img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
            return np.array(pil_img)
        else:
            # Fallback: just return the bytes
            return img_bytes
    except Exception as e:
        print(f"Mock decode_image error: {e}")
        return None


def extract_encodings(image_data) -> List[List[float]]:
    """
    Mock: Generate stable encodings based on image content hash
    (simulates real face recognition)
    """
    if image_data is None:
        return []
    
    try:
        # Use image hash as seed for "reproducible" random encoding
        # This way the same image produces the same encoding
        if isinstance(image_data, bytes):
            image_hash = hash(image_data) % (2**31)
        else:
            image_hash = hash(image_data.tobytes()) % (2**31)
        
        random.seed(image_hash)
        
        # Generate one 128-d encoding per image (simplified)
        encoding = [random.uniform(-1, 1) for _ in range(128)]
        return [encoding]
    except Exception as e:
        print(f"Mock extract_encodings error: {e}")
        # Fallback: just return a random encoding
        return [[random.uniform(-1, 1) for _ in range(128)]]


def recognize_faces(image_data, students: list) -> List[dict]:
    """
    Mock: Match image against student encodings using simple similarity
    
    image_data: numpy array or bytes
    students: list of Student ORM objects with .id, .name, .enrollment, .face_encodings
    Returns: list of recognized students
    """
    if image_data is None or not students:
        return []
    
    # Extract encoding from the frame
    frame_encodings = extract_encodings(image_data)
    if not frame_encodings:
        return []
    
    frame_enc = frame_encodings[0]
    recognized = []
    
    # Check against each student's encodings
    for student in students:
        try:
            stored_encs_json = student.face_encodings
            if not stored_encs_json or stored_encs_json == "[]":
                continue
            
            stored_encs = json.loads(stored_encs_json)
            
            # Calculate similarity with each stored encoding
            max_similarity = 0
            for stored_enc in stored_encs:
                # Simple vector similarity (mock comparison)
                # Just use a simple approach without numpy if possible
                try:
                    if HAS_PIL:
                        stored_enc = np.array(stored_enc)
                        frame_enc_arr = np.array(frame_enc)
                        distance = np.linalg.norm(frame_enc_arr - stored_enc)
                        similarity = max(0, 1 - (distance / 2.0))
                    else:
                        # Fallback: compute similarity without numpy
                        distance = sum((a - b) ** 2 for a, b in zip(frame_enc, stored_enc)) ** 0.5
                        similarity = max(0, 1 - (distance / 2.0))
                except:
                    similarity = 0
                
                max_similarity = max(max_similarity, similarity)
            
            # Match threshold: 0.4 (fairly lenient for mock)
            if max_similarity > 0.4:
                recognized.append({
                    "student_id": student.id,
                    "name": student.name,
                    "enrollment": student.enrollment,
                    "confidence": round(float(max_similarity), 3),
                })
        except Exception as e:
            print(f"Mock recognize error for student {student.id}: {e}")
            continue
    
    return recognized
