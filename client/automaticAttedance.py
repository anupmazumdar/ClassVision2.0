import tkinter as tk
from tkinter import *
import os, cv2
import csv
import pickle
import numpy as np
import face_recognition
from PIL import ImageTk, Image
import pandas as pd
import datetime
import time
import tkinter.ttk as tkk

haarcasecade_path = "haarcascade_frontalface_default.xml"
trainimagelabel_path = "TrainingImageLabel\\Trainner.yml"   # kept for compatibility
trainimage_path = "TrainingImage"
studentdetail_path = "StudentDetails\\studentdetails.csv"
attendance_path = "Attendance"

# Derived pickle path — matches trainImage.py
PKL_PATH = os.path.join("TrainingImageLabel", "Trainner_encodings.pkl")
TOLERANCE = 0.5   # Lower = stricter. 0.5 is good; try 0.45 for stricter matching


def load_encodings():
    """Load saved face encodings from pickle file."""
    if not os.path.exists(PKL_PATH):
        return None
    with open(PKL_PATH, "rb") as f:
        return pickle.load(f)


def subjectChoose(text_to_speech):

    def FillAttendance():
        sub = tx.get()
        if sub == "":
            text_to_speech("Please enter the subject name!!!")
            return

        # Load encodings
        data = load_encodings()
        if data is None:
            msg = "Model not found. Please train the model first."
            Notifica.configure(text=msg, bg="#000000", fg="#FF4444",
                               width=33, font=("Segoe UI", 13, "bold"))
            Notifica.place(x=20, y=250)
            text_to_speech(msg)
            return

        known_encodings = data["encodings"]
        known_ids       = data["ids"]
        known_names     = data["names"]

        df = pd.read_csv(studentdetail_path)
        cam = cv2.VideoCapture(0)

        col_names  = ["Enrollment", "Name"]
        attendance = pd.DataFrame(columns=col_names)

        # Run recognition for 20 seconds
        end_time = time.time() + 20
        Subject  = sub

        while True:
            ret, frame = cam.read()
            if not ret:
                break

            # Resize for speed (process at 1/4 size, display full)
            small_frame = cv2.resize(frame, (0, 0), fx=0.25, fy=0.25)
            rgb_small   = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)

            # Detect faces & compute encodings
            face_locations = face_recognition.face_locations(rgb_small, model="hog")
            face_encodings = face_recognition.face_encodings(rgb_small, face_locations)

            for (top, right, bottom, left), face_enc in zip(face_locations, face_encodings):
                # Scale back up
                top    *= 4; right  *= 4
                bottom *= 4; left   *= 4

                # Compare with known encodings
                distances  = face_recognition.face_distance(known_encodings, face_enc)
                best_idx   = np.argmin(distances)
                best_dist  = distances[best_idx]

                if best_dist < TOLERANCE:
                    enroll_id = known_ids[best_idx]
                    name      = known_names[best_idx]
                    label     = f"{enroll_id} - {name}"
                    color     = (0, 220, 0)   # Green — recognised

                    # Add to attendance (avoid duplicates)
                    if enroll_id not in attendance["Enrollment"].values:
                        attendance.loc[len(attendance)] = [enroll_id, name]
                else:
                    label = "Unknown"
                    color = (0, 30, 255)   # Red — not recognised

                # Draw box + label
                cv2.rectangle(frame, (left, top), (right, bottom), color, 2)
                cv2.rectangle(frame, (left, bottom - 28), (right, bottom), color, cv2.FILLED)
                cv2.putText(frame, label, (left + 6, bottom - 6),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)

            # Show confidence bar (optional overlay)
            remaining = max(0, int(end_time - time.time()))
            cv2.putText(frame, f"Time left: {remaining}s | Press Q to stop",
                        (10, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (0, 210, 255), 2)

            cv2.imshow("ClassVision — Taking Attendance...", frame)
            if cv2.waitKey(1) & 0xFF == ord("q"):
                break
            if time.time() > end_time:
                break

        cam.release()
        cv2.destroyAllWindows()

        if attendance.empty:
            msg = "No face recognised. Try again or retrain the model."
            text_to_speech(msg)
            Notifica.configure(text=msg, bg="#000000", fg="#FF4444",
                               width=33, font=("Segoe UI", 12, "bold"))
            Notifica.place(x=20, y=250)
            return

        # Save CSV
        ts        = time.time()
        date      = datetime.datetime.fromtimestamp(ts).strftime("%Y-%m-%d")
        timeStamp = datetime.datetime.fromtimestamp(ts).strftime("%H:%M:%S")
        Hour, Minute, Second = timeStamp.split(":")

        attendance[date] = 1
        path = os.path.join(attendance_path, Subject)
        if not os.path.exists(path):
            os.makedirs(path)

        fileName = (f"{path}/{Subject}_{date}_{Hour}-{Minute}-{Second}.csv")
        attendance.drop_duplicates(["Enrollment"], keep="first", inplace=True)
        attendance.to_csv(fileName, index=False)

        m = f"Attendance saved: {len(attendance)} student(s) marked for {Subject}"
        Notifica.configure(text=m, bg="#000000", fg="#00FFFF",
                           width=33, relief=RIDGE, bd=5,
                           font=("Segoe UI", 12, "bold"))
        Notifica.place(x=20, y=250)
        text_to_speech(m)

        # Show table
        import tkinter
        root = tkinter.Tk()
        root.title(f"Attendance — {Subject}")
        root.configure(background="#000000")
        with open(fileName, newline="") as file:
            reader = csv.reader(file)
            for r_idx, row in enumerate(reader):
                for c_idx, cell in enumerate(row):
                    tkinter.Label(root, width=12, height=1, fg="#00FFFF",
                                  font=("Segoe UI", 13, "bold"), bg="#000000",
                                  text=cell, relief=tkinter.RIDGE
                                  ).grid(row=r_idx, column=c_idx)
        root.mainloop()

    # ── Subject chooser window ──────────────────────────────────────────────
    subject = Tk()
    subject.title("ClassVision — Take Attendance")
    subject.geometry("580x320")
    subject.resizable(False, False)
    subject.configure(background="#000000")

    tk.Label(subject, bg="#000000", relief=RIDGE, bd=10,
             font=("Segoe UI", 30)).pack(fill=X)
    tk.Label(subject, text="Enter the Subject Name", bg="#000000",
             fg="#39FF14", font=("Segoe UI", 25, "bold")).place(x=80, y=15)

    Notifica = tk.Label(subject, text="", bg="#050505", fg="#00FFFF",
                        width=33, height=2, font=("Segoe UI", 13, "bold"))

    def open_folder():
        sub = tx.get()
        if sub == "":
            text_to_speech("Please enter the subject name!!!")
        else:
            try:
                os.startfile(f"Attendance\\{sub}")
            except Exception:
                pass

    tk.Label(subject, text="Enter Subject", width=12, height=1,
             bg="#000000", fg="#00FFFF", bd=5, relief=RIDGE,
             font=("Segoe UI", 18, "bold")).place(x=40, y=105)

    tx = tk.Entry(subject, width=18, bd=5, bg="#000000", fg="#00FFFF",
                  relief=RIDGE, font=("Segoe UI", 22, "bold"),
                  insertbackground="#00FFFF")
    tx.place(x=230, y=105)

    tk.Button(subject, text="Fill Attendance", command=FillAttendance,
              bd=7, font=("Segoe UI", 14, "bold"), bg="#000000", fg="#00FFFF",
              height=2, width=15, relief=RIDGE).place(x=80, y=180)

    tk.Button(subject, text="Check Sheets", command=open_folder,
              bd=7, font=("Segoe UI", 14, "bold"), bg="#000000", fg="#00FFFF",
              height=2, width=15, relief=RIDGE).place(x=300, y=180)

    subject.mainloop()
