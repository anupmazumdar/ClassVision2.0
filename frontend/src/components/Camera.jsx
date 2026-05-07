import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from "react";
import { Camera as CameraIcon, CameraOff, Wifi, ChevronDown } from "lucide-react";

/**
 * Camera component — wraps getUserMedia with device selection and IP camera support.
 *
 * Ref methods:
 *   capture()  — returns base64 JPEG string of current frame
 *   stop()     — stops camera stream
 */
const Camera = forwardRef(function Camera(
  { onFrame, autoCapture = false, interval = 3000, mirrored = true, className = "", autoStopMs = 0 },
  ref
) {
  const videoRef = useRef(null);
  const imgRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const autoStopTimerRef = useRef(null);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState("");
  const [ipMode, setIpMode] = useState(false);
  const [ipUrl, setIpUrl] = useState("");
  const [ipInput, setIpInput] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  // Enumerate cameras once
  useEffect(() => {
    navigator.mediaDevices?.enumerateDevices().then((devs) => {
      const cams = devs.filter((d) => d.kind === "videoinput");
      setDevices(cams);
    }).catch(() => {});
  }, []);

  // Start/restart when deviceId changes
  useEffect(() => {
    if (!ipMode) {
      stopCamera();
      startCamera(deviceId);
    }
    return () => stopCamera();
  }, [deviceId, ipMode]);

  useEffect(() => {
    if (autoCapture && ready) {
      timerRef.current = setInterval(() => {
        const frame = captureFrame();
        if (frame && onFrame) onFrame(frame);
        resetAutoStopTimer();
      }, interval);
    }
    return () => clearInterval(timerRef.current);
  }, [autoCapture, ready, interval]);

  const resetAutoStopTimer = () => {
    if (autoStopMs <= 0) return;
    clearTimeout(autoStopTimerRef.current);
    autoStopTimerRef.current = setTimeout(() => stopCamera(), autoStopMs);
  };

  const startCamera = async (selectedDeviceId) => {
    setError(null);
    try {
      const constraints = {
        video: selectedDeviceId
          ? { deviceId: { exact: selectedDeviceId }, width: { ideal: 640 }, height: { ideal: 480 } }
          : { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => setReady(true);
      }
      // Refresh device list with labels now that permission is granted
      navigator.mediaDevices.enumerateDevices().then((devs) => {
        setDevices(devs.filter((d) => d.kind === "videoinput"));
      });
    } catch {
      setError("Camera access denied or not available.");
    }
  };

  const stopCamera = () => {
    clearInterval(timerRef.current);
    clearTimeout(autoStopTimerRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setReady(false);
  };

  const captureFrame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    if (ipMode) {
      const img = imgRef.current;
      if (!img) return null;
      canvas.width = img.naturalWidth || 640;
      canvas.height = img.naturalHeight || 480;
      const ctx = canvas.getContext("2d");
      try {
        ctx.drawImage(img, 0, 0);
        return canvas.toDataURL("image/jpeg", 0.85);
      } catch {
        return null; // CORS tainted — IP camera on different origin
      }
    }

    const video = videoRef.current;
    if (!video || !ready) return null;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (mirrored) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);
    resetAutoStopTimer();
    return canvas.toDataURL("image/jpeg", 0.85);
  };

  useImperativeHandle(ref, () => ({ capture: captureFrame, stop: stopCamera }));

  const applyIpCamera = () => {
    if (!ipInput.trim()) return;
    setIpUrl(ipInput.trim());
    setIpMode(true);
    stopCamera();
    setShowSettings(false);
  };

  const switchToWebcam = () => {
    setIpMode(false);
    setIpUrl("");
    setShowSettings(false);
  };

  return (
    <div className={`relative rounded-xl overflow-hidden bg-gray-950 border border-gray-800 ${className}`}>
      {/* Video / IP cam display */}
      {ipMode && ipUrl ? (
        <img
          ref={imgRef}
          src={ipUrl}
          alt="IP Camera"
          className="w-full h-full object-cover"
          onLoad={() => setReady(true)}
          onError={() => setError("Cannot connect to IP camera. Check the URL.")}
        />
      ) : (
        <video
          ref={videoRef}
          autoPlay playsInline muted
          className={`w-full h-full object-cover ${mirrored ? "scale-x-[-1]" : ""}`}
        />
      )}

      <canvas ref={canvasRef} className="hidden" />

      {/* Loading state */}
      {!ready && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-950">
          <CameraIcon size={32} className="text-gray-700 animate-pulse" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/95 px-4">
          <CameraOff size={32} className="text-gray-500 mb-2" />
          <p className="text-gray-400 text-sm text-center">{error}</p>
          <button className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 underline"
            onClick={() => { setError(null); ipMode ? setIpMode(false) : startCamera(deviceId); }}>
            Retry
          </button>
        </div>
      )}

      {/* Settings button */}
      <button
        onClick={() => setShowSettings((s) => !s)}
        className="absolute top-2 right-2 bg-gray-900/80 backdrop-blur-sm border border-gray-700 text-gray-300 hover:text-white px-2 py-1 rounded-lg text-xs flex items-center gap-1 transition-colors"
      >
        {ipMode ? <Wifi size={12} className="text-blue-400" /> : <CameraIcon size={12} />}
        {ipMode ? "IP Cam" : devices.find((d) => d.deviceId === deviceId)?.label?.split("(")[0]?.trim() || "Camera"}
        <ChevronDown size={11} />
      </button>

      {/* Settings dropdown */}
      {showSettings && (
        <div className="absolute top-10 right-2 bg-gray-900 border border-gray-700 rounded-xl shadow-xl w-64 p-3 space-y-3 z-10">
          {/* Webcam selector */}
          <div>
            <p className="text-xs text-gray-500 font-medium mb-1.5 uppercase tracking-wider">Webcam</p>
            <div className="space-y-1">
              {devices.length === 0 && (
                <p className="text-xs text-gray-600">No cameras detected</p>
              )}
              {devices.map((d) => (
                <button
                  key={d.deviceId}
                  onClick={() => { setDeviceId(d.deviceId); setIpMode(false); setShowSettings(false); }}
                  className={`w-full text-left text-xs px-2 py-1.5 rounded-lg transition-colors ${
                    !ipMode && deviceId === d.deviceId
                      ? "bg-indigo-600 text-white"
                      : "text-gray-300 hover:bg-gray-800"
                  }`}
                >
                  {d.label || `Camera ${devices.indexOf(d) + 1}`}
                </button>
              ))}
            </div>
          </div>

          {/* IP Camera */}
          <div>
            <p className="text-xs text-gray-500 font-medium mb-1.5 uppercase tracking-wider flex items-center gap-1">
              <Wifi size={11} /> IP / Network Camera
            </p>
            <input
              className="input text-xs py-1.5"
              placeholder="http://192.168.1.x:8080/video"
              value={ipInput}
              onChange={(e) => setIpInput(e.target.value)}
            />
            <div className="flex gap-2 mt-1.5">
              <button onClick={applyIpCamera}
                className="flex-1 text-xs bg-blue-700 hover:bg-blue-600 text-white px-2 py-1.5 rounded-lg transition-colors">
                Connect
              </button>
              {ipMode && (
                <button onClick={switchToWebcam}
                  className="flex-1 text-xs btn-secondary py-1.5">
                  Use Webcam
                </button>
              )}
            </div>
            <p className="text-xs text-gray-600 mt-1">MJPEG stream URL (e.g. IP Webcam app)</p>
          </div>
        </div>
      )}
    </div>
  );
});

export default Camera;
