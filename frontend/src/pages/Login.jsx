import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, Loader2, QrCode } from "lucide-react";
import { login, getErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const cleanedEmail = form.email.trim();
    try {
      const data = await login(cleanedEmail, form.password);
      signIn({ name: data.name, role: data.role, email: cleanedEmail }, data.access_token);
      navigate("/");
    } catch (err) {
      setError(getErrorMessage(err, "Login failed. Check your credentials."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
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
          <p className="text-indigo-400 text-xs font-medium mt-1">Smart AI Attendance System</p>
        </div>

        {/* Card */}
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="label">Email</label>
              <input
                id="login-email"
                className="input"
                type="email"
                placeholder="teacher@school.edu"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                aria-required="true"
              />
            </div>
            <div>
              <label htmlFor="login-password" className="label">Password</label>
              <input
                id="login-password"
                className="input"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                autoComplete="current-password"
                aria-required="true"
              />
            </div>

            {error && (
              <p role="alert" className="text-red-400 text-xs bg-red-950/50 border border-red-800 p-2.5 rounded-lg">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="btn-primary w-full flex items-center justify-center gap-2 py-2.5"
              disabled={loading}
              aria-label="Sign in to ClassVision"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" role="status" aria-live="polite" />
                  <span>Signing in…</span>
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-gray-800 text-center">
            <Link
              to="/checkin"
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1.5 transition-colors"
            >
              <QrCode size={13} />
              <span>Student Self Check-in Portal (100m Geofence) →</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
