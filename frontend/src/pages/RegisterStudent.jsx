import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Camera as CameraIcon,
  CheckCircle,
  Loader2,
  ShieldCheck,
  Trash2,
  UserPlus,
  ArrowLeft,
  ArrowRight,
  Smile,
  Eye,
  Compass,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import Camera from "../components/Camera";
import { createStudent, registerFace, getErrorMessage } from "../api/client";

const CAPTURE_GUIDELINES = [
  {
    step: 1,
    title: "Look Straight (Center)",
    desc: "Position your face directly in the center with a neutral expression.",
    icon: Eye,
    tag: "Front",
  },
  {
    step: 2,
    title: "Turn Slightly Left (~20°)",
    desc: "Rotate your head slightly to your left side so the camera captures your side profile.",
    icon: ArrowLeft,
    tag: "Left 20°",
  },
  {
    step: 3,
    title: "Turn Slightly Right (~20°)",
    desc: "Rotate your head slightly to your right side for right profile biometric mapping.",
    icon: ArrowRight,
    tag: "Right 20°",
  },
  {
    step: 4,
    title: "Natural Smile / Expression",
    desc: "Smile naturally as you would in an active classroom.",
    icon: Smile,
    tag: "Smile",
  },
  {
    step: 5,
    title: "Slight Chin Tilt (Up/Down)",
    desc: "Slightly tilt your head up or down to account for varying camera elevations.",
    icon: Compass,
    tag: "Tilt",
  },
];

export default function RegisterStudent() {
  const navigate = useNavigate();
  const camRef = useRef(null);

  const currentCalYear = new Date().getFullYear();

  const [step, setStep] = useState("info"); // info | photos | done
  const [form, setForm] = useState({
    enrollment: "",
    name: "",
    course: "B.Tech",
    branch: "Computer Science & Engineering (CSE)",
    year: 1,
    semester: 1,
    admission_year: currentCalYear,
  });
  const [student, setStudent] = useState(null);
  const [photos, setPhotos] = useState([]); // array of { frame: base64, angle: tag }
  const [currentAngleIdx, setCurrentAngleIdx] = useState(0);
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  const activeGuideline = CAPTURE_GUIDELINES[currentAngleIdx] || CAPTURE_GUIDELINES[0];
  const ActiveIcon = activeGuideline.icon;

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError("Student Name is mandatory.");
      return;
    }
    if (!form.enrollment.trim()) {
      setError("Enrollment / Roll Number is mandatory.");
      return;
    }
    if (!form.branch.trim()) {
      setError("Branch / Department is mandatory.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...form,
        department: form.branch,
        year: parseInt(form.year),
        semester: parseInt(form.semester),
        admission_year: parseInt(form.admission_year),
      };
      const s = await createStudent(payload);
      setStudent(s);
      setStep("photos");
    } catch (err) {
      setError(getErrorMessage(err, "Failed to create student."));
    } finally {
      setLoading(false);
    }
  };

  const capturePhoto = () => {
    const frame = camRef.current?.capture();
    if (!frame) return;

    if (photos.length >= 5) {
      setFeedback("All 5 multi-angle photos captured. You can retake or proceed.");
      return;
    }

    const currentGuide = CAPTURE_GUIDELINES[photos.length];
    setPhotos((prev) => [
      ...prev,
      { frame, angle: currentGuide?.tag || `Angle ${prev.length + 1}` },
    ]);
    setFeedback(`Captured ${currentGuide?.title || "angle"}`);

    if (photos.length + 1 < 5) {
      setCurrentAngleIdx(photos.length + 1);
    }
  };

  const removePhoto = (idx) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
    setCurrentAngleIdx(Math.max(0, photos.length - 2));
    setFeedback("");
  };

  const resetAllPhotos = () => {
    setPhotos([]);
    setCurrentAngleIdx(0);
    setFeedback("");
  };

  const handleRegisterBiometrics = async () => {
    if (!consent) {
      setError("Consent checkbox must be checked to register biometric facial data.");
      return;
    }
    if (photos.length === 0) {
      setError("Please capture at least 1 photo (5 recommended for accurate multi-angle recognition).");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const frames = photos.map((p) => p.frame);
      await registerFace(student.id, frames, consent);
      setStep("done");
    } catch (err) {
      setError(getErrorMessage(err, "Failed to register face biometrics."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          className="btn-secondary p-2"
          onClick={() => navigate("/students")}
          aria-label="Back to students list"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Register New Student</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            Step {step === "info" ? "1: Student Details" : step === "photos" ? "2: Multi-Angle Biometrics" : "3: Complete"}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="flex items-center gap-2">
        {["info", "photos", "done"].map((s, i) => (
          <div key={s} className="flex-1 flex items-center gap-2">
            <div
              className={`h-1.5 flex-1 rounded-full transition-all ${
                step === s || (step === "photos" && i === 0) || (step === "done" && i <= 2)
                  ? "bg-indigo-600"
                  : "bg-gray-800"
              }`}
            />
          </div>
        ))}
      </div>

      {/* Step 1: Student Information Form */}
      {step === "info" && (
        <div className="card space-y-4">
          <h2 className="text-base font-semibold text-gray-200 flex items-center gap-2">
            <UserPlus size={18} className="text-indigo-400" />
            Mandatory Student Profile Details
          </h2>

          <form onSubmit={handleCreateStudent} className="space-y-4">
            {error && (
              <p role="alert" className="text-red-400 text-xs bg-red-950/60 border border-red-800 rounded-lg p-2.5">
                {error}
              </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="student-name" className="label">Full Name *</label>
                <input
                  id="student-name"
                  className="input"
                  placeholder="e.g. Rahul Sharma"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  autoFocus
                  aria-required="true"
                />
              </div>

              <div>
                <label htmlFor="student-enrollment" className="label">Enrollment / Roll Number *</label>
                <input
                  id="student-enrollment"
                  className="input font-mono"
                  placeholder="e.g. CS2024001"
                  value={form.enrollment}
                  onChange={(e) => setForm({ ...form, enrollment: e.target.value })}
                  required
                  aria-required="true"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="student-course" className="label">Course Program *</label>
                <select
                  id="student-course"
                  className="input bg-gray-900"
                  value={form.course}
                  onChange={(e) => {
                    const c = e.target.value;
                    let maxYears = 4;
                    if (["M.Tech", "MCA", "MBA"].includes(c)) maxYears = 2;
                    else if (["BCA", "BBA", "Diploma"].includes(c)) maxYears = 3;

                    const newYear = form.year > maxYears ? 1 : form.year;
                    const newSem = (newYear * 2) - 1;
                    setForm({ ...form, course: c, year: newYear, semester: newSem });
                  }}
                  required
                >
                  <option value="B.Tech">B.Tech (4 Years • 8 Semesters)</option>
                  <option value="BCA">BCA (3 Years • 6 Semesters)</option>
                  <option value="BBA">BBA (3 Years • 6 Semesters)</option>
                  <option value="Diploma">Diploma (3 Years • 6 Semesters)</option>
                  <option value="MCA">MCA (2 Years • 4 Semesters)</option>
                  <option value="MBA">MBA (2 Years • 4 Semesters)</option>
                  <option value="M.Tech">M.Tech (2 Years • 4 Semesters)</option>
                </select>
              </div>

              <div>
                <label htmlFor="student-branch" className="label">Branch / Department *</label>
                <select
                  id="student-branch"
                  className="input bg-gray-900"
                  value={form.branch}
                  onChange={(e) => setForm({ ...form, branch: e.target.value })}
                  required
                >
                  <option value="Computer Science & Engineering (CSE)">Computer Science & Engineering (CSE)</option>
                  <option value="CSE (AI & Machine Learning)">CSE (AI & Machine Learning)</option>
                  <option value="CSE (Data Science & Analytics)">CSE (Data Science & Analytics)</option>
                  <option value="Information Technology (IT)">Information Technology (IT)</option>
                  <option value="Electronics & Communication (ECE)">Electronics & Communication (ECE)</option>
                  <option value="Electrical Engineering (EE)">Electrical Engineering (EE)</option>
                  <option value="Mechanical Engineering (ME)">Mechanical Engineering (ME)</option>
                  <option value="Civil Engineering (CE)">Civil Engineering (CE)</option>
                  <option value="Biotechnology">Biotechnology</option>
                  <option value="Basic Science & Humanities">Basic Science & Humanities</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="student-year" className="label">Academic Year *</label>
                <select
                  id="student-year"
                  className="input bg-gray-900"
                  value={form.year}
                  onChange={(e) => {
                    const y = parseInt(e.target.value);
                    setForm({ ...form, year: y, semester: (y * 2) - 1 });
                  }}
                  required
                >
                  {(() => {
                    let maxYears = 4;
                    if (["M.Tech", "MCA", "MBA"].includes(form.course)) maxYears = 2;
                    else if (["BCA", "BBA", "Diploma"].includes(form.course)) maxYears = 3;
                    return Array.from({ length: maxYears }, (_, i) => i + 1).map((y) => (
                      <option key={y} value={y}>{y}{y === 1 ? "st" : y === 2 ? "nd" : y === 3 ? "rd" : "th"} Year</option>
                    ));
                  })()}
                </select>
              </div>

              <div>
                <label htmlFor="student-semester" className="label">Current Semester *</label>
                <select
                  id="student-semester"
                  className="input bg-gray-900"
                  value={form.semester}
                  onChange={(e) => setForm({ ...form, semester: parseInt(e.target.value) })}
                  required
                >
                  {(() => {
                    let maxYears = 4;
                    if (["M.Tech", "MCA", "MBA"].includes(form.course)) maxYears = 2;
                    else if (["BCA", "BBA", "Diploma"].includes(form.course)) maxYears = 3;
                    const maxSems = maxYears * 2;
                    return Array.from({ length: maxSems }, (_, i) => i + 1).map((s) => (
                      <option key={s} value={s}>Semester {s}</option>
                    ));
                  })()}
                </select>
              </div>

              <div>
                <label htmlFor="student-admission" className="label">Admission Year *</label>
                <input
                  id="student-admission"
                  type="number"
                  min={2018}
                  max={2035}
                  className="input font-mono"
                  value={form.admission_year}
                  onChange={(e) => setForm({ ...form, admission_year: parseInt(e.target.value) })}
                  required
                />
              </div>
            </div>

            <div className="flex gap-3 pt-3">
              <button
                type="button"
                className="btn-secondary flex-1"
                onClick={() => navigate("/students")}
                aria-label="Cancel registration and return to students list"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary flex-1 flex items-center justify-center gap-2"
                disabled={loading}
                aria-label="Save student details and proceed to biometric capture"
              >
                {loading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" role="status" aria-live="polite" />
                    <span>Creating Profile…</span>
                  </>
                ) : (
                  <>
                    <UserPlus size={15} />
                    <span>Continue to Multi-Angle Biometrics →</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Step 2: Guided Multi-Angle Capture */}
      {step === "photos" && (
        <div className="space-y-4">
          {/* Active Guidance Banner */}
          <div className="bg-gradient-to-r from-indigo-950/60 to-purple-950/60 border border-indigo-700/60 rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-300 shrink-0">
                <ActiveIcon size={20} className="animate-pulse" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-indigo-400 font-semibold">
                  Photo {photos.length + 1} of 5 • {activeGuideline.title}
                </div>
                <div className="text-sm text-gray-200 mt-0.5">{activeGuideline.desc}</div>
              </div>
            </div>
            <div className="text-xs font-mono bg-indigo-900/60 px-2.5 py-1 rounded-full text-indigo-200 border border-indigo-700 shrink-0">
              {photos.length}/5 Captured
            </div>
          </div>

          {/* Camera Viewfinder with Oval Guide Overlay */}
          <div className="card relative p-3">
            <div className="relative overflow-hidden rounded-xl bg-black aspect-video">
              <Camera ref={camRef} className="w-full h-full object-cover" />

              {/* Facial Framing Guide Overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-44 h-56 border-2 border-dashed border-indigo-400/60 rounded-[50%] animate-pulse flex flex-col items-center justify-between py-4">
                  <span className="text-[10px] bg-black/60 text-indigo-300 px-2 py-0.5 rounded-full backdrop-blur-sm">
                    {activeGuideline.tag}
                  </span>
                  <span className="text-[10px] bg-black/60 text-gray-400 px-2 py-0.5 rounded-full backdrop-blur-sm">
                    Center Face Here
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Action Bar */}
            <div className="flex gap-2 mt-3">
              <button
                className="btn-primary flex-1 flex items-center justify-center gap-2 py-2.5 text-base shadow-lg shadow-indigo-600/30"
                onClick={capturePhoto}
                disabled={photos.length >= 5}
              >
                <CameraIcon size={17} /> Capture Angle ({activeGuideline.tag})
              </button>
              {photos.length > 0 && (
                <button
                  className="btn-secondary px-3 flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-400"
                  onClick={resetAllPhotos}
                  aria-label="Retake and reset all biometric photos"
                >
                  <RotateCcw size={14} /> Reset
                </button>
              )}
            </div>
          </div>

          {/* Multi-Angle Strip Checklist */}
          <div className="card space-y-3">
            <div className="flex items-center justify-between text-xs text-gray-400 font-medium">
              <span className="uppercase tracking-wider">Multi-Angle Biometric Coverage</span>
              <span>{Math.round((photos.length / 5) * 100)}% Complete</span>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {CAPTURE_GUIDELINES.map((guide, idx) => {
                const captured = photos[idx];
                const isCurrent = idx === photos.length;
                const GuideIcon = guide.icon;

                return (
                  <div
                    key={guide.step}
                    className={`relative rounded-xl border p-2 flex flex-col items-center justify-between min-h-[95px] text-center transition-all ${
                      captured
                        ? "bg-green-950/20 border-green-600/60"
                        : isCurrent
                        ? "bg-indigo-950/40 border-indigo-500 shadow-md shadow-indigo-500/10"
                        : "bg-gray-900/40 border-gray-800 opacity-60"
                    }`}
                  >
                    {captured ? (
                      <div className="relative w-full aspect-square mb-1">
                        <img
                          src={captured.frame}
                          alt={`Captured ${guide.tag} angle photo`}
                          className="w-full h-full object-cover rounded-lg border border-green-700/50"
                        />
                        <button
                          onClick={() => removePhoto(idx)}
                          className="absolute -top-1.5 -right-1.5 bg-red-600 hover:bg-red-500 text-white rounded-full p-0.5 transition-colors shadow"
                          aria-label={`Remove ${guide.tag} photo`}
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 my-auto">
                        <GuideIcon size={14} />
                      </div>
                    )}
                    <span className="text-[11px] font-medium text-gray-300">{guide.tag}</span>
                    <span className="text-[9px] text-gray-500">
                      {captured ? "Captured" : isCurrent ? "Next" : "Pending"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Biometric Privacy Consent Checkbox */}
          <div className="card bg-gray-900/80 border border-gray-800 p-3.5 rounded-xl text-xs space-y-2">
            <label className="flex items-start gap-2.5 cursor-pointer text-gray-300 hover:text-gray-100">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 rounded bg-gray-800 border-gray-700 text-indigo-600 focus:ring-0"
              />
              <span>
                <strong className="text-indigo-300 flex items-center gap-1 inline-flex">
                  <ShieldCheck size={13} className="text-green-400" /> Biometric Privacy Consent:
                </strong>{" "}
                I confirm that the student/guardian has provided explicit consent to capture, process, and securely encrypt facial biometric templates at rest (AES-128) for academic attendance verification.
              </span>
            </label>
          </div>

          {feedback && (
            <p className="text-amber-400 text-sm bg-amber-900/20 border border-amber-800 rounded-lg px-3 py-2">
              {feedback}
            </p>
          )}

          <div className="flex gap-3">
            <button className="btn-secondary flex-1" onClick={() => setStep("info")}>
              Back
            </button>
            <button
              className="btn-primary flex-1 flex items-center justify-center gap-2 py-2.5"
              onClick={handleRegisterBiometrics}
              disabled={loading || photos.length === 0 || !consent}
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> Encrypting & Enrolling…
                </>
              ) : (
                <>
                  <Sparkles size={15} /> Save & Register ({photos.length} Encodings)
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Done */}
      {step === "done" && (
        <div className="card text-center py-10 space-y-4">
          <div className="w-16 h-16 bg-green-900/40 rounded-full flex items-center justify-center mx-auto border border-green-700">
            <CheckCircle size={32} className="text-green-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-100">{student?.name} Enrolled Successfully!</h2>
            <p className="text-gray-400 text-sm mt-1">
              Multi-angle biometric vectors generated and encrypted at rest with AES-128. Ready for high-accuracy kiosk and group scanning.
            </p>
          </div>
          <div className="flex gap-3 justify-center pt-2">
            <button
              className="btn-secondary"
              onClick={() => {
                setStep("info");
                setForm({
                  enrollment: "",
                  name: "",
                  course: "B.Tech",
                  branch: "Computer Science & Engineering (CSE)",
                  year: 1,
                  semester: 1,
                  admission_year: currentCalYear,
                });
                setPhotos([]);
                setStudent(null);
                setConsent(false);
                setCurrentAngleIdx(0);
                camRef.current?.stop();
              }}
            >
              Register Another Student
            </button>
            <button
              className="btn-primary"
              onClick={() => {
                camRef.current?.stop();
                navigate("/students");
              }}
            >
              View Student Roster
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
