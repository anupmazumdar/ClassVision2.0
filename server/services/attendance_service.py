import cv2, pickle, numpy as np, face_recognition
from config import ML_PKL_PATH, FACE_TOLERANCE

def load_encodings():
    try:
        with open(ML_PKL_PATH, "rb") as f: return pickle.load(f)
    except FileNotFoundError: return None

def recognize_frame(frame, data):
    """Returns list of recognized students in frame."""
    small = cv2.resize(frame, (0,0), fx=0.25, fy=0.25)
    rgb   = cv2.cvtColor(small, cv2.COLOR_BGR2RGB)
    locs  = face_recognition.face_locations(rgb, model="hog")
    encs  = face_recognition.face_encodings(rgb, locs)
    out   = []
    for (t,r,b,l), enc in zip(locs, encs):
        dists    = face_recognition.face_distance(data["encodings"], enc)
        best_idx = np.argmin(dists)
        if dists[best_idx] < FACE_TOLERANCE:
            out.append({"id": data["ids"][best_idx], "name": data["names"][best_idx],
                        "confidence": round((1-dists[best_idx])*100, 1), "box": (t*4,r*4,b*4,l*4)})
        else:
            out.append({"id": None, "name": "Unknown", "confidence": 0, "box": (t*4,r*4,b*4,l*4)})
    return out
