import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, Video, CheckCircle, Clock,
  Plus, Play, Loader2, BookOpen, Trash2,
} from "lucide-react";
import { getSessions, startSession, getStudents, deleteSession } from "../api";
import { useAuth } from "../App";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [sessions, setSessions] = useState([]);
  const [studentCount, setStudentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [startForm, setStartForm] = useState({ show: false, subject: "", room: "" });
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    Promise.all([getSessions(), getStudents()])
      .then(([s, st]) => {
        setSessions(s);
        setStudentCount(st.length);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleStart = async (e) => {
    e.preventDefault();
    setStarting(true);
    try {
      const session = await startSession(startForm.subject, startForm.room);
      navigate(`/session/${session.id}`);
    } catch {
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
          onClick={() => setStartForm({ show: true, subject: "", room: "" })}
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="card w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Start New Session</h2>
            <form onSubmit={handleStart} className="space-y-4">
              <div>
                <label className="label">Subject *</label>
                <input
                  className="input"
                  placeholder="e.g. Mathematics 301"
                  value={startForm.subject}
                  onChange={(e) => setStartForm({ ...startForm, subject: e.target.value })}
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="label">Room (optional)</label>
                <input
                  className="input"
                  placeholder="e.g. Room 204"
                  value={startForm.room}
                  onChange={(e) => setStartForm({ ...startForm, room: e.target.value })}
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  className="btn-secondary flex-1"
                  onClick={() => setStartForm({ show: false, subject: "", room: "" })}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2" disabled={starting}>
                  {starting ? <><Loader2 size={15} className="animate-spin" /> Starting…</> : "Start Session"}
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
                    <p className="text-xs text-gray-500">
                      {s.room && `${s.room} · `}
                      {new Date(s.started_at).toLocaleDateString()} ·{" "}
                      {new Date(s.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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
    blue:   "text-blue-400 bg-blue-900/30",
    green:  "text-green-400 bg-green-900/30",
    amber:  "text-amber-400 bg-amber-900/30",
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
