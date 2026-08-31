import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, Loader2, QrCode, Smartphone, ShieldCheck, Lock, UserCheck, AlertTriangle } from "lucide-react";
import { login, studentLogin, getErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import RateLimitCooldown from "../components/RateLimitCooldown";

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("teacher"); // "teacher" | "student"
  const [teacherForm, setTeacherForm] = useState({ email: "", password: "" });
  const [studentEnrollment, setStudentEnrollment] = useState("");
  const [studentPin, setStudentPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rateLimited, setRateLimited] = useState(false);

  const handleTeacherSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setRateLimited(false);
    setLoading(true);
    const cleanedEmail = teacherForm.email.trim();
    try {
      const data = await login(cleanedEmail, teacherForm.password);
      signIn({ name: data.name, role: data.role, email: cleanedEmail }, data.access_token);
      navigate("/");
    } catch (err) {
      if (err.response?.status === 429) {
        setRateLimited(true);
      }
      setError(getErrorMessage(err, "Login failed. Check your email and password."));
    } finally {
      setLoading(false);
    }
  };

  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setRateLimited(false);
    setLoading(true);
    const cleanEnrollment = studentEnrollment.trim();
    const cleanPin = studentPin.trim();
    if (!cleanPin) {
      setError("Please enter your 4-6 digit security PIN.");
      setLoading(false);
      return;
    }
    try {
      const data = await studentLogin(cleanEnrollment, cleanPin, null, navigator.userAgent.slice(0, 100));
      signIn(
        {
          id: data.id,
          name: data.name,
          role: "student",
          enrollment: data.enrollment,
          course: data.course,
          branch: data.branch,
          year: data.year,
          semester: data.semester,
        },
        data.access_token
      );
      navigate("/classroom");
    } catch (err) {
      if (err.response?.status === 429) {
        setRateLimited(true);
      }
      setError(getErrorMessage(err, "Student login failed. Verify enrollment, PIN or device approval."));
    } finally {
      setLoading(false);
    }
  };

  const [showDeviceHelp, setShowDeviceHelp] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo & Branding */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3 shadow-xl shadow-indigo-950/60 bg-white p-1.5 border border-gray-700">
            <img
              src="/uem_logo.jpg"
              alt="UEM Logo"
              className="w-full h-full object-contain"
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-100">UEM ClassVision</h1>
          <p className="text-indigo-400 text-xs font-medium mt-1">Smart AI Attendance & Study Hub</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-xl bg-gray-900/90 p-1 border border-gray-800 mb-4">
          <button
            type="button"
            onClick={() => {
              setActiveTab("teacher");
              setError("");
            }}
            className={`flex-1 py-2 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
              activeTab === "teacher"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <Lock size={13} /> Teacher / Admin
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("student");
              setError("");
            }}
            className={`flex-1 py-2 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
              activeTab === "student"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <GraduationCap size={14} /> Student Portal
          </button>
        </div>

        {/* Login Card */}
        <div className="card shadow-2xl border-gray-800">
          {activeTab === "teacher" ? (
            /* TEACHER / ADMIN LOGIN */
            <form onSubmit={handleTeacherSubmit} className="space-y-4">
              <div>
                <label htmlFor="login-email" className="label">Teacher / Admin Email</label>
                <input
                  id="login-email"
                  className="input"
                  type="email"
                  placeholder="teacher@school.edu"
                  value={teacherForm.email}
                  onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })}
                  required
                  autoComplete="username"
                />
              </div>
              <div>
                <label htmlFor="login-password" className="label">Password</label>
                <input
                  id="login-password"
                  className="input"
                  type="password"
                  placeholder="••••••••"
                  value={teacherForm.password}
                  onChange={(e) => setTeacherForm({ ...teacherForm, password: e.target.value })}
                  required
                  autoComplete="current-password"
                />
              </div>

              {rateLimited ? (
                <RateLimitCooldown
                  cooldownSeconds={60}
                  onRetry={() => {
                    setRateLimited(false);
                    setError("");
                  }}
                  title="Too Many Login Attempts"
                  description="Security lock active. Please wait for the cooldown timer to finish before re-attempting authentication."
                />
              ) : error ? (
                <div role="alert" className="text-red-400 text-xs bg-red-950/50 border border-red-800 p-2.5 rounded-lg flex items-start gap-2">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              ) : null}

              <button
                type="submit"
                className="btn-primary w-full flex items-center justify-center gap-2 py-2.5"
                disabled={loading || rateLimited}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Signing in…</span>
                  </>
                ) : (
                  "Sign in as Teacher / Admin"
                )}
              </button>
            </form>
          ) : (
            /* STUDENT PORTAL LOGIN */
            <form onSubmit={handleStudentSubmit} className="space-y-4">
              <div className="p-3 bg-indigo-950/40 border border-indigo-800/60 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-xs text-indigo-300 font-semibold">
                  <span className="flex items-center gap-1.5"><Smartphone size={13} /> 1-Device Hardware Binding Active</span>
                  <button
                    type="button"
                    onClick={() => setShowDeviceHelp((h) => !h)}
                    className="text-[11px] text-indigo-400 hover:text-indigo-200 underline font-normal focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400"
                  >
                    Changed phone?
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Only your registered device can access your designated course materials, assignments & quizzes.
                </p>
              </div>

              {/* Collapsible Device Change Recovery Guide */}
              {showDeviceHelp && (
                <div className="p-3.5 bg-gray-950 border border-indigo-500/40 rounded-xl text-xs space-y-2 animate-in fade-in duration-200">
                  <div className="flex items-center gap-1.5 font-semibold text-indigo-300">
                    <ShieldCheck size={14} /> My Phone Changed — How It Works
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-gray-300 text-[11px] leading-relaxed">
                    <li>Enter your Enrollment Number & Security PIN on your new device below.</li>
                    <li>Click <strong>Access My Student Hub</strong> to submit an automatic device reset request.</li>
                    <li>Notify your class teacher or administrator to approve the request on their admin portal.</li>
                    <li>Once approved, your new phone will be instantly bound to your student account!</li>
                  </ol>
                </div>
              )}

              <div>
                <label htmlFor="student-enrollment-input" className="label">Student Enrollment / Roll Number</label>
                <input
                  id="student-enrollment-input"
                  className="input font-mono uppercase"
                  placeholder="e.g. BCA2024001 or CS2024005"
                  value={studentEnrollment}
                  onChange={(e) => setStudentEnrollment(e.target.value.toUpperCase())}
                  required
                />
              </div>

              <div>
                <label htmlFor="student-pin-input" className="label flex items-center justify-between">
                  <span>Security PIN (Second Factor)</span>
                  <span className="text-[10px] text-gray-500">4-6 Digits</span>
                </label>
                <input
                  id="student-pin-input"
                  type="password"
                  maxLength={6}
                  inputMode="numeric"
                  placeholder="••••"
                  className="input font-mono tracking-widest text-center font-bold"
                  value={studentPin}
                  onChange={(e) => setStudentPin(e.target.value.replace(/\D/g, ""))}
                  required
                />
              </div>

              {rateLimited ? (
                <RateLimitCooldown
                  cooldownSeconds={60}
                  onRetry={() => {
                    setRateLimited(false);
                    setError("");
                  }}
                  title="Too Many Student Login Attempts"
                  description="Security lock active on this device. Please wait for the cooldown timer before retrying."
                />
              ) : error ? (
                <div
                  role="alert"
                  className={`text-xs p-3 rounded-lg flex items-start gap-2 ${
                    error.toLowerCase().includes("switch") || error.toLowerCase().includes("approve")
                      ? "text-amber-300 bg-amber-950/60 border border-amber-800/80"
                      : "text-red-400 bg-red-950/50 border border-red-800"
                  }`}
                >
                  <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold leading-snug">{error}</p>
                    {(error.toLowerCase().includes("switch") || error.toLowerCase().includes("approve")) && (
                      <p className="text-[11px] text-gray-300 leading-normal">
                        Your device switch request is recorded in the admin audit queue. Ask your teacher or admin to approve your new phone.
                      </p>
                    )}
                  </div>
                </div>
              ) : null}

              <button
                type="submit"
                className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 shadow-lg shadow-indigo-900/30"
                disabled={loading || rateLimited}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Verifying Device & Signing in…</span>
                  </>
                ) : (
                  <>
                    <UserCheck size={16} />
                    <span>Access My Student Hub</span>
                  </>
                )}
              </button>
            </form>
          )}

          <div className="mt-5 pt-4 border-t border-gray-800 space-y-3 text-center">
            <div className="p-2.5 bg-gray-950/60 border border-gray-800 rounded-lg text-left text-xs text-gray-400 space-y-1">
              <span className="font-semibold text-gray-300">Default Admin Credentials:</span>
              <div className="flex items-center justify-between font-mono text-[11px] text-indigo-300">
                <span>admin@classvision.local</span>
                <span className="text-gray-400">Password: <strong className="text-indigo-300">Anup1202500</strong></span>
              </div>
            </div>

            <Link
              to="/checkin"
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400"
            >
              <QrCode size={13} />
              <span>Live Attendance Self Check-in Portal (100m Geofence) →</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
