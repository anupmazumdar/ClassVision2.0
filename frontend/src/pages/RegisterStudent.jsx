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

  const [step, setStep] = useState("info"); // info | photos | done
  const [form, setForm] = useState({ enrollment: "", name: "", department: "" });
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
    setLoading(true);
    try {
      const s = await createStudent(form);
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
    const newPhotos = [...photos, { frame, angle: currentGuide.tag, title: currentGuide.title }];
    setPhotos(newPhotos);
    setFeedback("");

    if (newPhotos.length < 5) {
      setCurrentAngleIdx(newPhotos.length);
    }
  };

  const removePhoto = (i) => {
    const next = photos.filter((_, idx) => idx !== i);
    setPhotos(next);
    setCurrentAngleIdx(next.length);
  };

  const resetAllPhotos = () => {
    setPhotos([]);
    setCurrentAngleIdx(0);
    setFeedback("");
  };

  const handleRegisterFace = async () => {
    if (photos.length === 0) {
      setFeedback("Please capture at least 1 photo (all 5 angles recommended for high accuracy).");
      return;
    }
    if (!consent) {
      setFeedback("Biometric consent is required before registering facial data.");
      return;
    }
    setLoading(true);
    setFeedback("");
    try {
      const frameList = photos.map((p) => p.frame);
      await registerFace(student.id, frameList, consent);
      camRef.current?.stop();
      setStep("done");
    } catch (err) {
      setFeedback(getErrorMessage(err, "Face registration failed. Ensure face is clear and well-lit."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
          <UserPlus className="text-indigo-400" /> Multi-Angle Face Registration
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Guided 5-angle biometric enrollment for high-accuracy recognition and anti-spoof defense.
        </p>
      </div>

      {/* Step Progress Bar */}
      <div className="flex items-center gap-2 text-xs font-medium">
        {["info", "photos", "done"].map((s, i) => (
          <React.Fragment key={s}>
            <div
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border transition-all ${
                step === s
                  ? "bg-indigo-600/90 border-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                  : i < ["info", "photos", "done"].indexOf(step)
                  ? "bg-green-950/40 border-green-700 text-green-400"
                  : "border-gray-800 text-gray-500 bg-gray-900/40"
              }`}
            >
              {i < ["info", "photos", "done"].indexOf(step) ? <CheckCircle size={13} /> : <span>{i + 1}</span>}
              {s === "info" ? "Student Details" : s === "photos" ? "Biometric Capture" : "Enrolled"}
            </div>
            {i < 2 && <div className="flex-1 h-px bg-gray-800" />}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: Info */}
      {step === "info" && (
        <div className="card">
          <form onSubmit={handleCreateStudent} className="space-y-4">
            {error && (
              <p role="alert" className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            <div>
              <label htmlFor="student-enrollment" className="label">Enrollment Number *</label>
              <input
                id="student-enrollment"
                className="input"
                placeholder="e.g. CS2024001"
                value={form.enrollment}
                onChange={(e) => setForm({ ...form, enrollment: e.target.value })}
                required
                autoFocus
                aria-required="true"
              />
            </div>
            <div>
              <label htmlFor="student-name" className="label">Full Name *</label>
              <input
                id="student-name"
                className="input"
                placeholder="e.g. Alex Johnson"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                aria-required="true"
              />
            </div>
            <div>
              <label htmlFor="student-department" className="label">Department / Branch (optional)</label>
              <input
                id="student-department"
                className="input"
                placeholder="e.g. Computer Science & Engineering"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
              />
            </div>
            <div className="flex gap-3 pt-2">
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
                    <span>Creating…</span>
                  </>
                ) : (
                  <>
                    <UserPlus size={15} />
                    <span>Continue to Biometrics</span>
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
                  title="Retake All"
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
                          alt={guide.tag}
                          className="w-full h-full object-cover rounded-lg border border-green-700/50"
                        />
                        <button
                          onClick={() => removePhoto(idx)}
                          className="absolute -top-1.5 -right-1.5 bg-red-600 hover:bg-red-500 text-white rounded-full p-0.5 transition-colors shadow"
                          title="Remove photo"
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
              onClick={handleRegisterFace}
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
                setForm({ enrollment: "", name: "", department: "" });
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
