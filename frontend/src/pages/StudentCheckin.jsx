import React, { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Camera as CameraIcon,
  CheckCircle2,
  AlertCircle,
  MapPin,
  KeyRound,
  Loader2,
  Sparkles,
  ShieldCheck,
  Smartphone,
  GraduationCap,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import Camera from "../components/Camera";
import { selfCheckin, getErrorMessage } from "../api/client";
import { getDeviceId } from "../utils/device";

export default function StudentCheckin() {
  const camRef = useRef(null);

  const [code, setCode] = useState("");
  const [location, setLocation] = useState(null);
  const [locLoading, setLocLoading] = useState(false);
  const [locError, setLocError] = useState("");

  const [checkingIn, setCheckingIn] = useState(false);
  const [error, setError] = useState("");
  const [successData, setSuccessData] = useState(null);

  // Request GPS on mount
  useEffect(() => {
    fetchLocation();
  }, []);

  const fetchLocation = () => {
    if (!navigator.geolocation) {
      setLocError("GPS Geolocation is not supported on this browser.");
      return;
    }
    setLocLoading(true);
    setLocError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
        });
        setLocLoading(false);
      },
      (err) => {
        setLocLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocError("GPS permission denied. Please allow location access in your browser settings to verify you are in class.");
        } else {
          setLocError("Could not retrieve precise GPS coordinates. Please ensure location is enabled.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSelfCheckin = async (e) => {
    e.preventDefault();
    setError("");

    if (!code || code.trim().length !== 6) {
      setError("Please enter the 6-digit session code displayed on the classroom screen.");
      return;
    }

    if (!location) {
      setError("GPS location is required. Please allow location access and retry.");
      fetchLocation();
      return;
    }

    setCheckingIn(true);

    try {
      // Capture burst sequence for liveness check
      let frames = await camRef.current?.captureSequence?.(2, 250);
      let singleImage = null;
      if (!frames || frames.length === 0) {
        singleImage = camRef.current?.capture?.();
      }

      if (!singleImage && (!frames || frames.length === 0)) {
        setError("Could not capture camera frame. Please ensure camera is active.");
        setCheckingIn(false);
        return;
      }

      const res = await selfCheckin({
        code: code.trim(),
        image: singleImage,
        frames: frames && frames.length > 0 ? frames : null,
        lat: location.lat,
        lng: location.lng,
        device_id: getDeviceId(),
      });

      setSuccessData(res);
      camRef.current?.stop();
    } catch (err) {
      setError(getErrorMessage(err, "Self check-in failed. Please try again."));
    } finally {
      setCheckingIn(false);
    }
  };

  const resetForm = () => {
    setCode("");
    setError("");
    setSuccessData(null);
    fetchLocation();
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col items-center justify-center p-4">
      {/* Top Header */}
      <div className="w-full max-w-md flex flex-col items-center mb-6">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-950/60 bg-white p-1 border border-gray-700">
            <img
              src="/uem_logo.jpg"
              alt="UEM Logo"
              className="w-full h-full object-contain"
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
          </div>
          <span className="text-xl font-bold text-gray-100">UEM ClassVision</span>
        </div>
        <p className="text-xs text-indigo-400 font-medium">Student Self-Attendance Portal</p>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md card border-gray-800 bg-gray-900/90 shadow-2xl p-5 sm:p-6 space-y-5">
        {/* SUCCESS VIEW */}
        {successData ? (
          <div className="text-center py-4 space-y-5 animate-in fade-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-green-950/80 border-2 border-green-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-green-900/30 text-green-400">
              <CheckCircle2 size={36} />
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-100">
                {successData.already_present ? "Attendance Already Marked!" : "Attendance Marked Successfully!"}
              </h2>
              <p className="text-sm text-green-400 font-medium mt-1">{successData.message}</p>
            </div>

            <div className="p-4 bg-gray-950/70 border border-gray-800 rounded-xl text-left space-y-2.5 text-xs">
              <div className="flex justify-between border-b border-gray-800/80 pb-2">
                <span className="text-gray-400">Student:</span>
                <span className="font-semibold text-gray-200">{successData.name}</span>
              </div>
              <div className="flex justify-between border-b border-gray-800/80 pb-2">
                <span className="text-gray-400">Enrollment No:</span>
                <span className="font-mono font-medium text-indigo-300">{successData.enrollment}</span>
              </div>
              <div className="flex justify-between border-b border-gray-800/80 pb-2">
                <span className="text-gray-400">Subject:</span>
                <span className="font-medium text-gray-200">{successData.subject} {successData.room && `(${successData.room})`}</span>
              </div>
              {successData.distance_meters !== null && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Classroom Distance:</span>
                  <span className="text-green-400 font-medium">{successData.distance_meters}m (Within 100m geofence)</span>
                </div>
              )}
            </div>

            <button
              onClick={resetForm}
              className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 text-sm"
            >
              <RefreshCw size={15} /> Check In for Another Class
            </button>
          </div>
        ) : (
          /* FORM VIEW */
          <form onSubmit={handleSelfCheckin} className="space-y-4">
            {/* Step 1: 6-Digit Session Code */}
            <div>
              <label htmlFor="session-code" className="label flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-semibold text-gray-200">
                  <KeyRound size={15} className="text-amber-400" /> Enter 6-Digit Session Code
                </span>
                <span className="text-[11px] text-gray-500">From Teacher's Screen</span>
              </label>
              <input
                id="session-code"
                type="text"
                maxLength={6}
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="• • • • • •"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="input text-center text-2xl font-mono tracking-widest font-bold py-3 bg-gray-950 border-gray-700 text-amber-300 placeholder-gray-700 focus:border-amber-500"
                required
                autoFocus
              />
            </div>

            {/* Step 2: Camera Feed */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="label flex items-center gap-1.5 mb-0">
                  <CameraIcon size={15} className="text-indigo-400" /> Center Your Face
                </label>
                <span className="text-[10px] text-indigo-400 bg-indigo-950/60 border border-indigo-800/60 px-1.5 py-0.5 rounded flex items-center gap-1">
                  <ShieldCheck size={11} /> Anti-Spoof Active
                </span>
              </div>
              <div className="relative rounded-xl overflow-hidden border border-gray-800 bg-gray-950 aspect-[4/3] w-full">
                <Camera ref={camRef} mirrored={true} className="w-full h-full" />
                {/* Visual Face Oval Target */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-40 h-52 border-2 border-dashed border-indigo-400/50 rounded-[50%] animate-pulse" />
                </div>
              </div>
            </div>

            {/* Step 3: GPS Geofence Status Indicator */}
            <div className="p-3 rounded-xl bg-gray-950/80 border border-gray-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <MapPin size={16} className={location ? "text-green-400" : "text-amber-400"} />
                <div>
                  {location ? (
                    <p className="text-gray-200 font-medium">GPS Ready (±{location.accuracy}m accuracy)</p>
                  ) : locLoading ? (
                    <p className="text-gray-400 flex items-center gap-1.5">
                      <Loader2 size={12} className="animate-spin text-indigo-400" /> Locating classroom GPS…
                    </p>
                  ) : (
                    <p className="text-amber-400 font-medium">Location Required (100m Geofence)</p>
                  )}
                </div>
              </div>
              {!location && !locLoading && (
                <button
                  type="button"
                  onClick={fetchLocation}
                  className="text-xs text-indigo-400 hover:text-indigo-300 underline font-semibold shrink-0"
                >
                  Enable GPS
                </button>
              )}
            </div>

            {/* Error Message Box */}
            {(error || locError) && (
              <div role="alert" className="p-3 rounded-xl bg-red-950/60 border border-red-800/80 text-red-300 text-xs flex items-start gap-2">
                <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                <p className="leading-snug">{error || locError}</p>
              </div>
            )}

            {/* Submit Check-in Button */}
            <button
              type="submit"
              disabled={checkingIn || code.length !== 6}
              className="btn-primary w-full py-3 text-base flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {checkingIn ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Verifying Face & Geofence…</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>Verify & Mark My Attendance</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer Link */}
        <div className="pt-2 border-t border-gray-800/60 flex items-center justify-between text-xs text-gray-500">
          <span>Teacher / Admin?</span>
          <Link to="/login" className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
            Teacher Login <ArrowRight size={12} />
          </Link>
        </div>
      </div>
    </div>
  );
}
