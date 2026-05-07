import React, { useRef, useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Camera as CameraIcon, Square, RefreshCw,
  CheckCircle, Loader2, Download, Users,
} from "lucide-react";
import Camera from "../components/Camera";
import {
  getSession, stopSession, recognizeFaces,
  markAttendance, downloadExcel,
} from "../api";

export default function Session() {
  const { id } = useParams();
  const navigate = useNavigate();
  const camRef = useRef(null);

  const [session, setSession] = useState(null);
  const [presentMap, setPresentMap] = useState({}); // { student_id: {name, enrollment, confidence, marked_at} }
  const [scanning, setScanning] = useState(false);
  const [autoScan, setAutoScan] = useState(false);
  const [lastResult, setLastResult] = useState(null); // most recent recognize response
  const [stopping, setStopping] = useState(false);
  const [loading, setLoading] = useState(true);
  const autoRef = useRef(null);

  useEffect(() => {
    loadSession();
    return () => clearInterval(autoRef.current);
  }, [id]);

  const loadSession = async () => {
    try {
      const s = await getSession(id);
      setSession(s);
      // Pre-populate present map from existing records
      const map = {};
      s.attendance.forEach((r) => {
        map[r.student_id] = r;
      });
      setPresentMap(map);
    } finally {
      setLoading(false);
    }
  };

  // ── Auto-scan ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (autoScan) {
      autoRef.current = setInterval(() => {
        handleScan();
      }, 4000);
    } else {
      clearInterval(autoRef.current);
    }
    return () => clearInterval(autoRef.current);
  }, [autoScan]);

  const handleScan = useCallback(async () => {
    if (scanning) return;
    const frame = camRef.current?.capture();
    if (!frame) return;

    setScanning(true);
    try {
      const result = await recognizeFaces(frame);
      setLastResult(result.recognized);

      // Auto-mark everyone recognized
      for (const face of result.recognized) {
        if (!presentMap[face.student_id]) {
          const res = await markAttendance(parseInt(id), face.student_id, face.confidence);
          if (!res.already_present) {
            setPresentMap((m) => ({
              ...m,
              [face.student_id]: {
                student_id: face.student_id,
                name: face.name,
                enrollment: face.enrollment,
                confidence: face.confidence,
                marked_at: new Date().toISOString(),
              },
            }));
          }
        }
      }
    } catch {
      // Ignore scan errors silently — user can retry
    } finally {
      setScanning(false);
    }
  }, [scanning, presentMap, id]);

  const handleStop = async () => {
    if (!confirm("End this session?")) return;
    setStopping(true);
    camRef.current?.stop();
    await stopSession(parseInt(id));
    navigate("/");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!session) {
    return <div className="text-gray-500 text-center py-16">Session not found.</div>;
  }

  const presentList = Object.values(presentMap);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">{session.subject}</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {session.room && `Room ${session.room} · `}
            Started {new Date(session.started_at).toLocaleTimeString()}
            {session.is_active && (
              <span className="ml-2 inline-flex items-center gap-1 text-green-400 text-xs font-medium">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                Live
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {!session.is_active && (
            <button className="btn-secondary flex items-center gap-1.5" onClick={() => downloadExcel(parseInt(id))}>
              <Download size={14} /> Export Excel
            </button>
          )}
          {session.is_active && (
            <button className="btn-danger flex items-center gap-2" onClick={handleStop} disabled={stopping}>
              {stopping ? <Loader2 size={14} className="animate-spin" /> : <Square size={14} />}
              End Session
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Camera + controls */}
        {session.is_active && (
          <div className="space-y-3">
            <Camera ref={camRef} className="aspect-video w-full" />

            {/* Scan feedback */}
            {lastResult !== null && (
              <div className={`rounded-lg border px-4 py-2.5 text-sm ${
                lastResult.length > 0
                  ? "bg-green-900/20 border-green-800 text-green-300"
                  : "bg-gray-800 border-gray-700 text-gray-400"
              }`}>
                {lastResult.length > 0
                  ? `✓ Detected: ${lastResult.map((f) => f.name).join(", ")}`
                  : "No faces recognized in last scan"}
              </div>
            )}

            <div className="flex gap-2">
              <button
                className="btn-primary flex-1 flex items-center justify-center gap-2"
                onClick={handleScan}
                disabled={scanning}
              >
                {scanning
                  ? <><Loader2 size={15} className="animate-spin" /> Scanning…</>
                  : <><CameraIcon size={15} /> Scan Once</>}
              </button>
              <button
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors border ${
                  autoScan
                    ? "bg-amber-700/40 border-amber-600 text-amber-300 hover:bg-amber-700/60"
                    : "btn-secondary"
                }`}
                onClick={() => setAutoScan((a) => !a)}
              >
                <RefreshCw size={15} className={autoScan ? "animate-spin" : ""} />
                {autoScan ? "Auto ON" : "Auto OFF"}
              </button>
            </div>
            <p className="text-xs text-gray-600 text-center">
              Auto-scan scans every 4 seconds automatically
            </p>
          </div>
        )}

        {/* Present list */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Present
            </h2>
            <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-200">
              <Users size={14} className="text-green-400" />
              {presentList.length}
            </div>
          </div>

          {presentList.length === 0 ? (
            <div className="card text-center py-10 text-gray-600 text-sm">
              {session.is_active ? "Start scanning to mark attendance." : "No attendance recorded."}
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
              {presentList
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((r) => (
                  <div key={r.student_id} className="flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2.5">
                    <CheckCircle size={16} className="text-green-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-100 text-sm truncate">{r.name}</p>
                      <p className="text-xs text-gray-600">{r.enrollment}</p>
                    </div>
                    <span className="text-xs text-gray-500 shrink-0">{r.confidence?.toFixed(1)}%</span>
                  </div>
                ))}
            </div>
          )}

          {!session.is_active && presentList.length > 0 && (
            <button
              className="btn-secondary w-full flex items-center justify-center gap-2 mt-2"
              onClick={() => downloadExcel(parseInt(id))}
            >
              <Download size={14} /> Download Excel Report
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
