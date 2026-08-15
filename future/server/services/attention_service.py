import mediapipe as mp, numpy as np, cv2

mp_mesh   = mp.solutions.face_mesh
face_mesh = mp_mesh.FaceMesh(static_image_mode=False, max_num_faces=30,
                              min_detection_confidence=0.5)

YAW_THR   = 30   # degrees
PITCH_THR = 15

def estimate_attention(frame):
    rgb  = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    res  = face_mesh.process(rgb)
    out  = []
    if not res.multi_face_landmarks: return out
    for lm in res.multi_face_landmarks:
        nose  = lm.landmark[1]
        chin  = lm.landmark[152]
        le    = lm.landmark[33]
        re    = lm.landmark[263]
        yaw   = np.degrees(np.arctan2(re.y-le.y, re.x-le.x))
        pitch = np.degrees(np.arctan2(chin.y-nose.y, 0.1)) - 70
        out.append({"attentive": abs(yaw)<YAW_THR and pitch>-PITCH_THR,
                    "yaw": round(yaw,1), "pitch": round(pitch,1)})
    return out

def class_attention_pct(states):
    if not states: return 0.0
    return round(sum(1 for s in states if s["attentive"])/len(states)*100, 1)
