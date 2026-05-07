import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera as CameraIcon, CheckCircle, Loader2, Trash2, UserPlus } from "lucide-react";
import Camera from "../components/Camera";
import { createStudent, registerFace } from "../api";

export default function RegisterStudent() {
  const navigate = useNavigate();
  const camRef = useRef(null);

  const [step, setStep] = useState("info"); // info | photos | done
  const [form, setForm] = useState({ enrollment: "", name: "", department: "" });
  const [student, setStudent] = useState(null);
  const [photos, setPhotos] = useState([]); // base64 strings
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const s = await createStudent(form);
      setStudent(s);
      setStep("photos");
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to create student.");
    } finally {
      setLoading(false);
    }
  };

  const capturePhoto = () => {
    const frame = camRef.current?.capture();
    if (!frame) return;
    if (photos.length >= 5) {
      setFeedback("Max 5 photos. Remove one to recapture.");
      return;
    }
    setPhotos((p) => [...p, frame]);
    setFeedback("");
  };

  const removePhoto = (i) => setPhotos((p) => p.filter((_, idx) => idx !== i));

  const handleRegisterFace = async () => {
    if (photos.length === 0) {
      setFeedback("Capture at least 1 photo.");
      return;
    }
    setLoading(true);
    setFeedback("");
    try {
      await registerFace(student.id, photos);
      // Stop camera before moving to done step
      camRef.current?.stop();
      setStep("done");
    } catch (err) {
      setFeedback(err.response?.data?.detail || "Face registration failed. Ensure face is visible and well-lit.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Register Student</h1>
        <p className="text-gray-500 text-sm mt-1">Add student info, then capture their face photo(s).</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-xs font-medium">
        {["info", "photos", "done"].map((s, i) => (
          <React.Fragment key={s}>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border transition-colors ${
              step === s
                ? "bg-indigo-600 border-indigo-500 text-white"
                : i < ["info","photos","done"].indexOf(step)
                  ? "bg-green-900/30 border-green-700 text-green-400"
                  : "border-gray-700 text-gray-500"
            }`}>
              {i < ["info","photos","done"].indexOf(step) ? <CheckCircle size={12} /> : <span>{i + 1}</span>}
              {s === "info" ? "Student Info" : s === "photos" ? "Face Photos" : "Done"}
            </div>
            {i < 2 && <div className="flex-1 h-px bg-gray-800" />}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: Info */}
      {step === "info" && (
        <div className="card">
          <form onSubmit={handleCreateStudent} className="space-y-4">
            <div>
              <label className="label">Enrollment Number *</label>
              <input
                className="input"
                placeholder="e.g. 2301001"
                value={form.enrollment}
                onChange={(e) => setForm({ ...form, enrollment: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Full Name *</label>
              <input
                className="input"
                placeholder="e.g. Anup Mazumdar"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Department</label>
              <input
                className="input"
                placeholder="e.g. Computer Science"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
              />
            </div>
            {error && (
              <p className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            <div className="flex gap-3 pt-1">
              <button type="button" className="btn-secondary flex-1" onClick={() => navigate("/students")}>
                Cancel
              </button>
              <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2" disabled={loading}>
                {loading ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
                {loading ? "Creating…" : "Next: Capture Face"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Step 2: Face photos */}
      {step === "photos" && (
        <div className="space-y-4">
          <div className="card">
            <p className="text-sm text-gray-400 mb-3">
              <span className="font-medium text-gray-200">{student?.name}</span> — Capture 1–5 clear face photos.
              Good lighting, face centered. More photos = better accuracy.
            </p>
            <Camera ref={camRef} className="aspect-video w-full" />
            <div className="flex gap-3 mt-3">
              <button className="btn-primary flex-1 flex items-center justify-center gap-2" onClick={capturePhoto}>
                <CameraIcon size={15} /> Capture ({photos.length}/5)
              </button>
            </div>
          </div>

          {/* Captured photos */}
          {photos.length > 0 && (
            <div className="card">
              <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider font-medium">
                Captured Photos
              </p>
              <div className="grid grid-cols-5 gap-2">
                {photos.map((p, i) => (
                  <div key={i} className="relative group">
                    <img src={p} alt={`capture ${i+1}`} className="w-full aspect-square object-cover rounded-lg border border-gray-700" />
                    <button
                      onClick={() => removePhoto(i)}
                      className="absolute -top-1.5 -right-1.5 bg-red-600 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {feedback && (
            <p className="text-amber-400 text-sm bg-amber-900/20 border border-amber-800 rounded-lg px-3 py-2">
              {feedback}
            </p>
          )}

          <div className="flex gap-3">
            <button className="btn-secondary flex-1" onClick={() => setStep("info")}>Back</button>
            <button
              className="btn-primary flex-1 flex items-center justify-center gap-2"
              onClick={handleRegisterFace}
              disabled={loading || photos.length === 0}
            >
              {loading ? <><Loader2 size={15} className="animate-spin" /> Registering…</> : "Register Face"}
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
            <h2 className="text-lg font-semibold text-gray-100">{student?.name} registered!</h2>
            <p className="text-gray-500 text-sm mt-1">Face recognized from {photos.length} photo(s). Ready for attendance.</p>
          </div>
          <div className="flex gap-3 justify-center">
            <button className="btn-secondary" onClick={() => { setStep("info"); setForm({ enrollment:"",name:"",department:""}); setPhotos([]); setStudent(null); camRef.current?.stop(); }}>
              Register Another
            </button>
            <button className="btn-primary" onClick={() => { camRef.current?.stop(); navigate("/students"); }}>
              View Students
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
