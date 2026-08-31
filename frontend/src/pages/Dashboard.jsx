import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Video,
  CheckCircle,
  Clock,
  Plus,
  Play,
  Loader2,
  BookOpen,
  Trash2,
  KeyRound,
  MapPin,
  ShieldCheck,
  Info,
  X,
} from "lucide-react";
import { getSessions, startSession, getStudents, deleteSession, getErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [sessions, setSessions] = useState([]);
  const [studentCount, setStudentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showRiskBanner, setShowRiskBanner] = useState(() => {
    return localStorage.getItem("cv_dismiss_risk_banner") !== "true";
  });
  const [startForm, setStartForm] = useState({
    show: false,
    subject: "",
    room: "",
    room_lat: null,
    room_lng: null,
    radius_meters: 100,
    enable_geofence: false,
    require_code: true,
  });
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    Promise.all([getSessions(), getStudents()])
      .then(([s, st]) => {
        setSessions(s);
        setStudentCount(st.length);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleToggleGeofence = (e) => {
    const checked = e.target.checked;
    if (checked && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setStartForm((prev) => ({
            ...prev,
            enable_geofence: true,
            room_lat: pos.coords.latitude,
            room_lng: pos.coords.longitude,
          }));
          toast.info("GPS classroom coordinates captured.");
        },
        () => {
          toast.error("Location access denied or unavailable.");
          setStartForm((prev) => ({ ...prev, enable_geofence: false }));
        },
        { enableHighAccuracy: true }
      );
    } else {
      setStartForm((prev) => ({
        ...prev,
        enable_geofence: false,
        room_lat: null,
        room_lng: null,
      }));
    }
  };

  const handleStart = async (e) => {
    e.preventDefault();
    setStarting(true);
    try {
      const session = await startSession(startForm.subject, startForm.room, {
        room_lat: startForm.enable_geofence ? startForm.room_lat : null,
        room_lng: startForm.enable_geofence ? startForm.room_lng : null,
        radius_meters: startForm.radius_meters || 100,
        require_code: startForm.require_code,
      });
      toast.success("Session started successfully!");
      navigate(`/session/${session.id}`);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to start session."));
      setStarting(false);
    }
  };

  const handleDelete = async (e, sessionId) => {
    e.stopPropagation();
    if (!confirm("Delete this session and all its attendance records?")) return;
    await deleteSession(sessionId);
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
  };

  const activeSession = sessions.find((s) => s.is_active);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Welcome back, {user?.name}</p>
        </div>
        <button
          className="btn-primary flex items-center gap-2"
          onClick={() =>
            setStartForm({
              show: true,
              subject: "",
              room: "",
              require_code: false,
              enable_geofence: false,
              room_lat: null,
              room_lng: null,
              radius_meters: 100,
            })
          }
        >
          <Plus size={16} /> New Session
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Users size={20} />} label="Students" value={studentCount} color="indigo" />
        <StatCard icon={<BookOpen size={20} />} label="Sessions" value={sessions.length} color="blue" />
        <StatCard
          icon={<CheckCircle size={20} />}
          label="Completed"
          value={sessions.filter((s) => !s.is_active).length}
          color="green"
        />
        <StatCard
          icon={<Video size={20} />}
          label="Active"
          value={sessions.filter((s) => s.is_active).length}
          color="amber"
        />
      </div>

      {/* Security Boundaries & Known Limitations Transparency Notice */}
      {showRiskBanner && (
        <div className="p-3.5 bg-gray-900/90 border border-indigo-900/60 rounded-xl text-xs flex items-start justify-between gap-3 shadow-md">
          <div className="flex items-start gap-2.5">
            <Info size={16} className="text-indigo-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-gray-300">
              <span className="font-semibold text-indigo-300">Security Transparency & System Boundaries:</span>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-gray-400">
                <li>
                  <strong className="text-gray-300">GPS Geofence:</strong> Browser coordinates can be mocked by software tools (server enforces Haversine radius math, but cannot verify OS hardware sensor integrity).
                </li>
                <li>
                  <strong className="text-gray-300">Lab Hardware Binding:</strong> Cloned lab PC OS images share identical browser fingerprints (use mobile app with hardware IDs for strict 1:1 student binding).
                </li>
              </ul>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowRiskBanner(false);
              localStorage.setItem("cv_dismiss_risk_banner", "true");
            }}
            className="text-gray-500 hover:text-gray-300 p-1 rounded transition-colors shrink-0"
            aria-label="Dismiss security notice"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Active session banner */}
      {activeSession && (
        <div
          className="card border-indigo-700 bg-indigo-900/20 flex items-center justify-between gap-4 cursor-pointer hover:border-indigo-500 transition-colors"
          onClick={() => navigate(`/session/${activeSession.id}`)}
        >
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
            <div>
              <p className="font-semibold text-indigo-300">{activeSession.subject}</p>
              <p className="text-xs text-gray-500">
                {activeSession.room && `Room ${activeSession.room} · `}
                {activeSession.present_count} present · Started{" "}
                {new Date(activeSession.started_at).toLocaleTimeString()}
              </p>
            </div>
          </div>
          <button className="btn-primary flex items-center gap-1.5 shrink-0">
            <Play size={14} /> Resume
          </button>
        </div>
      )}

      {/* New session modal */}
      {startForm.show && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="start-session-title"
            className="card w-full max-w-md"
          >
            <h2 id="start-session-title" className="text-lg font-semibold mb-4 text-gray-100">Start New Session</h2>
            <form onSubmit={handleStart} className="space-y-4">
              <div>
                <label htmlFor="session-subject" className="label">Subject *</label>
                <input
                  id="session-subject"
                  className="input"
                  placeholder="e.g. Mathematics 301"
                  value={startForm.subject}
                  onChange={(e) => setStartForm({ ...startForm, subject: e.target.value })}
                  required
                  autoFocus
                />
              </div>
              <div>
                <label htmlFor="session-room" className="label">Room (optional)</label>
                <input
                  id="session-room"
                  className="input"
                  placeholder="e.g. Room 204"
                  value={startForm.room}
                  onChange={(e) => setStartForm({ ...startForm, room: e.target.value })}
                />
              </div>

              {/* Priority 1 Security Options */}
              <div className="p-3 bg-gray-900/70 border border-gray-800 rounded-xl space-y-2.5 text-xs">
                <p className="font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-indigo-400" /> Security & Anti-Proxy Options
                </p>

                <label className="flex items-center gap-2 cursor-pointer text-gray-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={startForm.require_code}
                    onChange={(e) => setStartForm({ ...startForm, require_code: e.target.checked })}
                    className="rounded bg-gray-800 border-gray-700 text-indigo-600 focus:ring-0"
                  />
                  <KeyRound size={13} className="text-amber-400" />
                  <span>Require 30s Rotating Session Code</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-gray-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={startForm.enable_geofence}
                    onChange={handleToggleGeofence}
                    className="rounded bg-gray-800 border-gray-700 text-indigo-600 focus:ring-0"
                  />
                  <MapPin size={13} className="text-blue-400" />
                  <span>
                    GPS Geofencing Lock {startForm.room_lat ? `(GPS Locked)` : `(100m)`}
                  </span>
                </label>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  className="btn-secondary flex-1"
                  onClick={() =>
                    setStartForm({
                      show: false,
                      subject: "",
                      room: "",
                      require_code: false,
                      enable_geofence: false,
                      room_lat: null,
                      room_lng: null,
                      radius_meters: 100,
                    })
                  }
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                  disabled={starting}
                >
                  {starting ? (
                    <>
                      <Loader2 size={15} className="animate-spin" /> Starting…
                    </>
                  ) : (
                    "Start Session"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Recent sessions */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Recent Sessions</h2>
        {sessions.length === 0 ? (
          <div className="card text-center text-gray-600 py-12 text-sm">
            No sessions yet. Start one above.
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.slice(0, 10).map((s) => (
              <div
                key={s.id}
                className="card hover:border-gray-700 cursor-pointer transition-colors flex items-center justify-between gap-4 py-3"
                onClick={() => navigate(`/session/${s.id}`)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {s.is_active ? (
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-gray-700 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-gray-200 truncate">{s.subject}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                      {s.room && <span>{s.room}</span>}
                      <span>{new Date(s.started_at).toLocaleDateString()}</span>
                      <span>
                        {new Date(s.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {s.require_code && (
                        <span className="text-[10px] text-amber-400 bg-amber-950/60 border border-amber-800/60 px-1.5 py-0.2 rounded">
                          Rolling Code
                        </span>
                      )}
                      {s.room_lat && (
                        <span className="text-[10px] text-blue-400 bg-blue-950/60 border border-blue-800/60 px-1.5 py-0.2 rounded">
                          Geofenced
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-200">{s.present_count}</p>
                    <p className="text-xs text-gray-600">present</p>
                  </div>
                  {user?.role === "admin" && (
                    <button
                      onClick={(e) => handleDelete(e, s.id)}
                      className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-900/20 transition-colors"
                      title="Delete session"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  const colors = {
    indigo: "text-indigo-400 bg-indigo-900/30",
    blue: "text-blue-400 bg-blue-900/30",
    green: "text-green-400 bg-green-900/30",
    amber: "text-amber-400 bg-amber-900/30",
  };
  return (
    <div className="card flex items-center gap-3">
      <div className={`p-2.5 rounded-lg ${colors[color]}`}>{icon}</div>
      <div>
        <p className="text-xl font-bold text-gray-100">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}
