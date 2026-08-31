import os
import cv2
import pickle
import numpy as np
import face_recognition
from PIL import Image


def TrainImage(haarcasecade_path, trainimage_path, trainimagelabel_path, message, text_to_speech):
    """
    Instead of LBPH, we now use face_recognition (dlib ResNet-based model)
    to generate 128-d face embeddings and save them as a pickle file.
    trainimagelabel_path is now used as the pickle save path (e.g. TrainingImageLabel/encodings.pkl)
    """
    known_encodings = []
    known_ids = []
    known_names = []

    # trainimagelabel_path — save as .pkl instead of .yml
    pkl_path = os.path.splitext(trainimagelabel_path)[0] + "_encodings.pkl"

    student_dirs = [d for d in os.listdir(trainimage_path)
                    if os.path.isdir(os.path.join(trainimage_path, d))]

    if not student_dirs:
        msg = "No training images found. Please take images first."
        message.configure(text=msg)
        text_to_speech(msg)
        return

    total = 0
    for student_dir in student_dirs:
        # folder name format: "EnrollmentNo_Name"
        parts = student_dir.split("_", 1)
        if len(parts) < 2:
            continue
        enrollment = parts[0]
        name = parts[1]

        student_path = os.path.join(trainimage_path, student_dir)
        image_files = [f for f in os.listdir(student_path)
                       if f.lower().endswith(('.jpg', '.jpeg', '.png'))]

        for img_file in image_files:
            img_path = os.path.join(student_path, img_file)
            # face_recognition needs RGB image
            img = face_recognition.load_image_file(img_path)
            encodings = face_recognition.face_encodings(img)

            if encodings:
                # Take first face found in image
                known_encodings.append(encodings[0])
                known_ids.append(int(enrollment))
                known_names.append(name)
                total += 1

        message.configure(text=f"Processing: {name} ({total} encodings so far...)")
        message.update()

    if not known_encodings:
        msg = "No faces detected in training images. Check image quality."
        message.configure(text=msg)
        text_to_speech(msg)
        return

    # Save encodings to pickle
    data = {
        "encodings": known_encodings,
        "ids": known_ids,
        "names": known_names
    }
    os.makedirs(os.path.dirname(pkl_path), exist_ok=True)
    with open(pkl_path, "wb") as f:
        pickle.dump(data, f)

    res = f"Training complete! {total} face encodings saved for {len(student_dirs)} students."
    message.configure(text=res)
    text_to_speech(res)
    print(f"[TrainImage] Saved encodings to: {pkl_path}")
