import React, { useRef, useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Camera as CameraIcon,
  Square,
  RefreshCw,
  CheckCircle,
  Loader2,
  Download,
  Users,
  UserCheck,
  UserX,
  KeyRound,
  MapPin,
  ShieldCheck,
  AlertTriangle,
  Smartphone,
  Maximize2,
  Sparkles,
  Zap,
  Volume2,
  VolumeX,
  Share2,
  MessageSquare,
} from "lucide-react";
import Camera from "../components/Camera";
import {
  getSession,
  stopSession,
  scanAndMark,
  manualMarkAttendance,
  unmarkAttendance,
  downloadExcel,
  getStudents,
  getSessionCode,
  getErrorMessage,
} from "../api/client";
import { getDeviceId } from "../utils/device";
import { useToast } from "../context/ToastContext";
import { shareToWhatsApp, formatLiveSessionWhatsAppMessage, formatAttendanceWhatsAppMessage } from "../utils/whatsapp";

function playSuccessChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880.0, ctx.currentTime + 0.08); // A5
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // Ignored if audio not allowed by browser autoplay
  }
}

export default function Session() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const camRef = useRef(null);
  const containerRef = useRef(null);

  const [session, setSession] = useState(null);
  const [allStudents, setAllStudents] = useState([]);
  const [presentMap, setPresentMap] = useState({});
  const [scanning, setScanning] = useState(false);
  const [autoScan, setAutoScan] = useState(false);
  const [scanMode, setScanMode] = useState("group"); // "group" | "kiosk"
  const [lastResult, setLastResult] = useState(null);
  const [kioskSuccess, setKioskSuccess] = useState(null); // { name, enrollment, confidence }
  const [stopping, setStopping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rightTab, setRightTab] = useState("present"); // present | all
  const [marking, setMarking] = useState(null);
  const [liveCodeInfo, setLiveCodeInfo] = useState({ code: "------", expires_in: 30 });
  const [userLocation, setUserLocation] = useState(null);
  const [antiSpoofAlert, setAntiSpoofAlert] = useState("");
  const [livenessEnabled, setLivenessEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const deviceId = getDeviceId();
  const autoRef = useRef(null);
  const codeTimerRef = useRef(null);
  const kioskResetTimerRef = useRef(null);

  const loadSession = useCallback(async () => {
    try {
      const s = await getSession(id);
      setSession(s);
      const map = {};
      s.attendance.forEach((r) => {
        map[r.student_id] = r;
      });
      setPresentMap(map);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // GPS coords
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        () => {},
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, []);

  // Poll for live rotating code
  const fetchLiveCode = useCallback(async () => {
    try {
      const data = await getSessionCode(parseInt(id));
      setLiveCodeInfo(data);
    } catch {
      // Ignored if not authorized
    }
  }, [id]);

  useEffect(() => {
    Promise.all([loadSession(), getStudents().then(setAllStudents)]);

    fetchLiveCode();
    codeTimerRef.current = setInterval(fetchLiveCode, 5000);

    return () => {
      clearInterval(autoRef.current);
      clearInterval(codeTimerRef.current);
      clearTimeout(kioskResetTimerRef.current);
    };
  }, [id, loadSession, fetchLiveCode]);

  const handleScan = useCallback(async () => {
    if (scanning) return;
    setAntiSpoofAlert("");

    let frame = null;
    let burstFrames = null;

    if (livenessEnabled && camRef.current?.captureSequence) {
      burstFrames = await camRef.current.captureSequence(2, 250);
      frame = burstFrames?.[0];
    } else {
      frame = camRef.current?.capture();
      burstFrames = [frame, frame];
    }

    if (!frame) return;
    setScanning(true);

    try {
      const result = await scanAndMark(parseInt(id), frame, burstFrames, {
        lat: userLocation?.lat,
        lng: userLocation?.lng,
        code: liveCodeInfo.code,
        device_id: deviceId,
      });

      setLastResult(result.recognized);

      if (result.marked && result.marked.length > 0) {
        setPresentMap((prev) => {
          const next = { ...prev };
          for (const m of result.marked) {
            next[m.student_id] = {
              student_id: m.student_id,
              name: m.name,
              enrollment: m.enrollment,
              confidence: m.confidence,
              marked_at: new Date().toISOString(),
            };
          }
          return next;
        });

        // Trigger Kiosk Celebration Modal for the single student
        const firstMarked = result.marked[0];
        if (soundEnabled) {
          playSuccessChime();
        }

        if (scanMode === "kiosk") {
          setKioskSuccess(firstMarked);
          clearTimeout(kioskResetTimerRef.current);
          kioskResetTimerRef.current = setTimeout(() => {
            setKioskSuccess(null);
          }, 2800);
        }
      }
    } catch (err) {
      const errorMsg = getErrorMessage(err, "Recognition scan failed.");
      if (
        errorMsg.includes("Anti-Spoofing") ||
        errorMsg.includes("Geofence") ||
        errorMsg.includes("code") ||
        errorMsg.includes("Device") ||
        errorMsg.includes("Security")
      ) {
        setAntiSpoofAlert(errorMsg);
      }
    } finally {
      setScanning(false);
    }
  }, [scanning, livenessEnabled, id, userLocation, liveCodeInfo, deviceId, scanMode, soundEnabled]);

  // Auto-scan cycle
  useEffect(() => {
    if (autoScan || scanMode === "kiosk") {
      const interval = scanMode === "kiosk" ? 2800 : 4000;
      autoRef.current = setInterval(() => {
        if (!kioskSuccess) {
          handleScan();
        }
      }, interval);
    } else {
      clearInterval(autoRef.current);
    }
    return () => clearInterval(autoRef.current);
  }, [autoScan, scanMode, handleScan, kioskSuccess]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  const handleManualMark = async (student) => {
    setMarking(student.id);
    try {
      const res = await manualMarkAttendance(parseInt(id), student.id);
      if (!res.already_present) {
        setPresentMap((m) => ({
          ...m,
          [student.id]: {
            student_id: student.id,
            name: student.name,
            enrollment: student.enrollment,
            confidence: 0,
            marked_at: new Date().toISOString(),
          },
        }));
        toast.success(`Marked ${student.name} present.`);
      } else {
        toast.info(`${student.name} is already marked present.`);
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to mark attendance manually."));
    } finally {
      setMarking(null);
    }
  };

  const handleUnmark = async (studentId) => {
    setMarking(studentId);
    try {
      await unmarkAttendance(parseInt(id), studentId);
      setPresentMap((m) => {
        const next = { ...m };
        delete next[studentId];
        return next;
      });
      toast.info("Attendance entry removed.");
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to remove attendance."));
    } finally {
      setMarking(null);
    }
  };

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
    <div ref={containerRef} className="space-y-5 bg-gray-950 p-2 sm:p-0 rounded-2xl">
      {/* Header Bar */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            {session.subject}
            {scanMode === "kiosk" && (
              <span className="text-xs font-semibold uppercase tracking-wider bg-amber-950/80 text-amber-300 border border-amber-700/80 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Zap size={12} /> Kiosk Mode
              </span>
            )}
          </h1>
          <div className="flex items-center gap-3 text-gray-400 text-xs sm:text-sm mt-1 flex-wrap">
            {session.room && <span>Room {session.room}</span>}
            <span>Started {new Date(session.started_at).toLocaleTimeString()}</span>
            {session.is_active && (
              <span className="inline-flex items-center gap-1 text-green-400 text-xs font-medium bg-green-950/60 border border-green-800/80 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                Live Session
              </span>
            )}
            {session.room_lat && (
              <span className="inline-flex items-center gap-1 text-blue-400 text-xs bg-blue-950/50 border border-blue-800/60 px-2 py-0.5 rounded-full">
                <MapPin size={12} /> Geofence {session.radius_meters || 100}m
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          {/* Mode Switcher Tabs */}
          {session.is_active && (
            <div className="flex rounded-xl bg-gray-900 border border-gray-800 p-1 text-xs">
              <button
                onClick={() => {
                  setScanMode("group");
                  setAutoScan(false);
                }}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  scanMode === "group"
                    ? "bg-indigo-600 text-white shadow"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                Group Scan
              </button>
              <button
                onClick={() => {
                  setScanMode("kiosk");
                  setAutoScan(true);
                }}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1 ${
                  scanMode === "kiosk"
                    ? "bg-amber-600 text-white shadow"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                <Zap size={13} /> 1-by-1 Kiosk
              </button>
            </div>
          )}

          {/* Rotating Session Code Badge */}
          {session.is_active && (
            <div className="flex items-center gap-2 bg-indigo-950/80 border border-indigo-700/70 rounded-xl px-3 py-1.5 text-indigo-200 shadow-inner min-w-[130px]">
              <KeyRound size={15} className="text-indigo-400 animate-pulse shrink-0" />
              <div className="text-left w-full">
                <div className="text-[10px] uppercase font-semibold text-indigo-400 tracking-wider flex items-center justify-between gap-1">
                  <span>Self Check-in</span>
                  <span className="text-amber-400 font-mono text-[10px]">{liveCodeInfo.expires_in}s</span>
                </div>
                <div className="text-base font-mono font-bold tracking-widest text-amber-300 leading-tight">
                  {liveCodeInfo.code}
                </div>
                {/* 30s Visual Countdown Progress Bar */}
                <div className="w-full bg-gray-800 h-1 rounded-full mt-1 overflow-hidden">
                  <div
                    className="bg-amber-400 h-full transition-all duration-1000 ease-linear"
                    style={{ width: `${Math.max(0, Math.min(100, (liveCodeInfo.expires_in / 30) * 100))}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          <button
            onClick={toggleFullscreen}
            className="btn-secondary p-2 text-gray-400 hover:text-white"
            title="Toggle Fullscreen"
          >
            <Maximize2 size={16} />
          </button>

          {!session.is_active && (
            <button
              className="btn-secondary flex items-center gap-1.5"
              onClick={() => downloadExcel(parseInt(id))}
            >
              <Download size={14} /> Export Excel
            </button>
          )}

          {session.is_active && (
            <button
              className="btn-danger flex items-center gap-2"
              onClick={handleStop}
              disabled={stopping}
            >
              {stopping ? <Loader2 size={14} className="animate-spin" /> : <Square size={14} />}
              End Session
            </button>
          )}
        </div>
      </div>

      {/* Student Mobile Self Check-in Guidance Banner with WhatsApp Share */}
      {session.is_active && (
        <div className="flex items-center justify-between gap-3 bg-indigo-950/40 border border-indigo-800/60 text-indigo-200 px-4 py-2.5 rounded-xl text-xs flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
            <span>
              <strong>Student Mobile Self Check-in:</strong> Students can check in at <span className="text-amber-300 font-mono font-semibold">/checkin</span> with code <strong className="text-amber-300 font-mono tracking-wider">{liveCodeInfo.code}</strong> (100m Geofence).
            </span>
          </div>

          <button
            onClick={() => {
              const text = formatLiveSessionWhatsAppMessage({
                subject: session.subject,
                room: session.room,
                code: liveCodeInfo.code,
              });
              shareToWhatsApp(text);
            }}
            className="flex items-center gap-1.5 bg-green-950/70 hover:bg-green-900/60 text-green-400 border border-green-800/70 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shadow-sm"
            title="Broadcast Live Code to WhatsApp Group"
          >
            <Share2 size={13} />
            <span>Share to WhatsApp Group</span>
          </button>
        </div>
      )}

      {/* Security alert banner */}
      {antiSpoofAlert && (
        <div className="flex items-center gap-3 bg-red-950/70 border border-red-700 text-red-200 px-4 py-3 rounded-xl text-sm animate-shake">
          <AlertTriangle size={20} className="text-red-400 shrink-0" />
          <span>{antiSpoofAlert}</span>
        </div>
      )}

      {/* Main Grid View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Camera + Viewfinder */}
        {session.is_active && (
          <div className="space-y-3">
            <div className="relative rounded-2xl overflow-hidden border border-gray-800 bg-black aspect-video flex items-center justify-center">
              <Camera ref={camRef} className="w-full h-full object-cover" />

              {/* Kiosk Mode Overlay: Biometric Framing Oval */}
              {scanMode === "kiosk" && !kioskSuccess && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                  <div className="w-48 h-64 border-2 border-dashed border-amber-400/70 rounded-[50%] animate-pulse flex flex-col items-center justify-between py-4 backdrop-brightness-110">
                    <span className="text-[10px] bg-black/70 text-amber-300 font-semibold px-2.5 py-0.5 rounded-full border border-amber-500/50 uppercase tracking-widest backdrop-blur-md">
                      Align Face
                    </span>
                    <span className="text-[11px] bg-black/70 text-gray-300 px-2 py-0.5 rounded-full backdrop-blur-md">
                      1-by-1 Kiosk Check-In
                    </span>
                  </div>
                </div>
              )}

              {/* Kiosk Mode Celebration Card (When Student Verified) */}
              {kioskSuccess && (
                <div className="absolute inset-0 bg-gray-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in z-20">
                  <div className="w-20 h-20 bg-green-500/20 border-2 border-green-400 rounded-full flex items-center justify-center mb-3 text-green-400 shadow-xl shadow-green-500/30 animate-bounce">
                    <CheckCircle size={44} />
                  </div>
                  <span className="text-xs uppercase tracking-widest font-semibold text-green-400 bg-green-950/80 px-3 py-1 rounded-full border border-green-800 mb-2">
                    Verified Present
                  </span>
                  <h2 className="text-2xl font-bold text-white mb-1">{kioskSuccess.name}</h2>
                  <p className="text-sm text-gray-400 font-mono mb-3">{kioskSuccess.enrollment}</p>
                  <div className="flex items-center gap-2 text-xs text-indigo-300 bg-indigo-950/60 px-3 py-1.5 rounded-lg border border-indigo-800/60">
                    <Sparkles size={13} className="text-indigo-400" />
                    Biometric Match: {kioskSuccess.confidence}% Confidence
                  </div>
                  <div className="w-48 bg-gray-800 h-1.5 rounded-full mt-4 overflow-hidden">
                    <div className="bg-green-400 h-full w-full animate-shrink-bar" />
                  </div>
                  <span className="text-[10px] text-gray-500 mt-2">Ready for next student…</span>
                </div>
              )}

              {/* Auto-scanning live pulse badge */}
              {autoScan && (
                <div className="absolute top-3 right-3 bg-amber-950/90 border border-amber-500/80 text-amber-300 text-xs px-3 py-1 rounded-full flex items-center gap-1.5 shadow-lg backdrop-blur-md z-10 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="font-semibold">Auto-Scan Loop Active</span>
                </div>
              )}

              {/* Scanning status pill */}
              {scanning && (
                <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md border border-indigo-500/50 text-indigo-300 text-xs px-3 py-1 rounded-full flex items-center gap-1.5 shadow-lg z-10">
                  <Loader2 size={13} className="animate-spin text-indigo-400" /> Verifying Biometrics…
                </div>
              )}
            </div>

            {/* Controls & Security info row */}
            <div className="flex items-center justify-between px-1 text-xs text-gray-400 flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer hover:text-gray-200 transition-colors">
                  <input
                    type="checkbox"
                    checked={livenessEnabled}
                    onChange={(e) => setLivenessEnabled(e.target.checked)}
                    aria-label="Toggle anti-spoof burst liveness detection"
                    className="rounded bg-gray-800 border-gray-700 text-indigo-600 focus:ring-0"
                  />
                  <ShieldCheck size={14} className="text-green-400" />
                  Anti-Spoof Burst
                </label>

                <button
                  onClick={() => setSoundEnabled((s) => !s)}
                  className="flex items-center gap-1 hover:text-gray-200 transition-colors"
                  aria-label={soundEnabled ? "Mute attendance sound chime" : "Unmute attendance sound chime"}
                >
                  {soundEnabled ? (
                    <>
                      <Volume2 size={14} className="text-indigo-400" /> Sound ON
                    </>
                  ) : (
                    <>
                      <VolumeX size={14} className="text-gray-500" /> Sound OFF
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-gray-400" title={`Bound Device ID: ${deviceId}`}>
                  <Smartphone size={12} className="text-indigo-400" />
                  Dev: {deviceId.substring(0, 10)}…
                </span>
                {userLocation && (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <MapPin size={12} /> GPS Active
                  </span>
                )}
              </div>
            </div>

            {/* Group Mode Result Banner */}
            {scanMode === "group" && lastResult !== null && (
              <div
                className={`rounded-lg border px-4 py-2.5 text-sm ${
                  lastResult.length > 0
                    ? "bg-green-900/20 border-green-800 text-green-300"
                    : "bg-gray-800 border-gray-700 text-gray-400"
                }`}
              >
                {lastResult.length > 0
                  ? `✓ Recognized: ${lastResult.map((f) => f.name).join(", ")}`
                  : "No registered faces recognized in frame"}
              </div>
            )}

            {/* Scan Action Buttons */}
            <div className="flex gap-2">
              <button
                className="btn-primary flex-1 flex items-center justify-center gap-2 py-2.5"
                onClick={handleScan}
                disabled={scanning}
                aria-label={scanMode === "kiosk" ? "Check-in student biometrically" : "Scan and mark attendance once"}
              >
                {scanning ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Analyzing Frame…
                  </>
                ) : (
                  <>
                    <CameraIcon size={15} />
                    {scanMode === "kiosk" ? "Check-In Student" : "Scan Once & Mark"}
                  </>
                )}
              </button>

              {scanMode === "group" && (
                <button
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors border ${
                    autoScan
                      ? "bg-amber-700/40 border-amber-600 text-amber-300 hover:bg-amber-700/60 shadow-lg shadow-amber-900/30"
                      : "btn-secondary"
                  }`}
                  onClick={() => setAutoScan((a) => !a)}
                  aria-label={autoScan ? "Turn off continuous auto-scanning" : "Turn on continuous auto-scanning"}
                >
                  <RefreshCw size={15} className={autoScan ? "animate-spin text-amber-400" : ""} />
                  {autoScan ? "Auto-Scanning ON (Live)" : "Enable Auto-Scan"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Right Panel: Present / All Students Roster */}
        <div className="space-y-3">
          {/* Tabs */}
          <div className="flex gap-1 border-b border-gray-800">
            {[
              { id: "present", label: `Present (${presentList.length})`, icon: CheckCircle },
              { id: "all", label: `All Students (${allStudents.length})`, icon: Users },
            ].map(({ id: tid, label, icon: Icon }) => (
              <button
                key={tid}
                onClick={() => setRightTab(tid)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                  rightTab === tid
                    ? "border-indigo-500 text-indigo-300"
                    : "border-transparent text-gray-500 hover:text-gray-300"
                }`}
              >
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>

          {/* Present Tab */}
          {rightTab === "present" &&
            (presentList.length === 0 ? (
              <div className="card text-center py-10 text-gray-500 text-sm">
                {session.is_active ? "No students marked yet. Align faces with camera." : "No attendance recorded."}
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[480px] overflow-y-auto pr-1">
                {presentList
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((r) => (
                    <div
                      key={r.student_id}
                      className="flex items-center gap-3 bg-gray-900/90 border border-gray-800/80 rounded-xl px-3 py-2.5 hover:border-gray-700 transition-colors"
                    >
                      <CheckCircle size={16} className="text-green-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-100 text-sm truncate">{r.name}</p>
                        <p className="text-xs text-gray-500">{r.enrollment}</p>
                      </div>
                      <span className="text-xs text-gray-400 shrink-0 bg-gray-800/80 px-2 py-0.5 rounded-md border border-gray-700">
                        {r.confidence > 0 ? `${r.confidence?.toFixed(1)}%` : "Manual"}
                      </span>
                      {session.is_active && (
                        <button
                          onClick={() => handleUnmark(r.student_id)}
                          disabled={marking !== null || scanning}
                          className="text-gray-500 hover:text-red-400 transition-colors p-1 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-400"
                          title="Remove Attendance"
                        >
                          {marking === r.student_id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <UserX size={13} />
                          )}
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            ))}

          {/* All Students Tab (Teacher Manual Override) */}
          {rightTab === "all" && (
            <div className="space-y-1.5 max-h-[480px] overflow-y-auto pr-1">
              {allStudents
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((s) => {
                  const isPresent = Boolean(presentMap[s.id]);
                  return (
                    <div
                      key={s.id}
                      className="flex items-center gap-3 bg-gray-900/80 border border-gray-800 rounded-xl px-3 py-2"
                    >
                      <div
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          isPresent ? "bg-green-400" : "bg-gray-600"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-200 text-sm truncate">{s.name}</p>
                        <p className="text-xs text-gray-500">{s.enrollment}</p>
                      </div>
                      {session.is_active && (
                        <button
                          onClick={() => (isPresent ? handleUnmark(s.id) : handleManualMark(s))}
                          disabled={marking !== null || scanning}
                          className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed ${
                            isPresent
                              ? "bg-red-950/60 border border-red-800 text-red-300 hover:bg-red-900/60"
                              : "bg-indigo-950/60 border border-indigo-800 text-indigo-300 hover:bg-indigo-900/60"
                          }`}
                        >
                          {marking === s.id ? (
                            <Loader2 size={11} className="animate-spin" />
                          ) : isPresent ? (
                            "Unmark"
                          ) : (
                            "Manual Mark"
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
