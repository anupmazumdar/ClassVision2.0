import os
from dotenv import load_dotenv
load_dotenv()

SUPABASE_URL     = os.getenv("SUPABASE_URL")
SUPABASE_KEY     = os.getenv("SUPABASE_ANON_KEY")
JWT_SECRET       = os.getenv("JWT_SECRET", "change-me")
SERVER_HOST      = os.getenv("SERVER_HOST", "0.0.0.0")
SERVER_PORT      = int(os.getenv("SERVER_PORT", 8000))
SYNC_INTERVAL    = int(os.getenv("SYNC_INTERVAL_SECONDS", 30))
ML_PKL_PATH      = "ml_models/TrainingImageLabel/Trainner_encodings.pkl"
TRAIN_IMG_PATH   = "ml_models/TrainingImage"
HAAR_PATH        = "ml_models/haarcascade_frontalface_default.xml"
FACE_TOLERANCE   = float(os.getenv("FACE_TOLERANCE", 0.5))
EMOTION_INTERVAL = int(os.getenv("EMOTION_FRAME_INTERVAL", 5))
