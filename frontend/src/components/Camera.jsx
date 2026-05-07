import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from "react";
import { Camera as CameraIcon, CameraOff } from "lucide-react";

/**
 * Camera component — wraps getUserMedia for all devices.
 *
 * Props:
 *   onFrame(base64)  — called with captured frame as base64 JPEG
 *   autoCapture      — if true, calls onFrame every `interval` ms automatically
 *   interval         — ms between auto-captures (default 3000)
 *   mirrored         — flip horizontally for selfie cameras (default true)
 *   autoStopMs       — auto-stop camera after N ms of inactivity (0 = disabled, default 0)
 *
 * Ref methods:
 *   capture()        — manually capture one frame, returns base64 string
 *   stop()           — manually stop camera stream
 */
const Camera = forwardRef(function Camera(
  { onFrame, autoCapture = false, interval = 3000, mirrored = true, className = "", autoStopMs = 0 },
  ref
) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const autoStopTimerRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    startCamera();
    
    // Auto-stop when page is hidden/tab switched
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopCamera();
      } else {
        startCamera();
      }
    };
    
    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (autoCapture && ready) {
      timerRef.current = setInterval(() => {
        const frame = captureFrame();
        if (frame && onFrame) onFrame(frame);
        resetAutoStopTimer(); // Reset timer on activity
      }, interval);
    }
    return () => clearInterval(timerRef.current);
  }, [autoCapture, ready, interval]);

  const resetAutoStopTimer = () => {
    if (autoStopMs <= 0) return;
    clearTimeout(autoStopTimerRef.current);
    autoStopTimerRef.current = setTimeout(() => {
      stopCamera();
    }, autoStopMs);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => setReady(true);
      }
    } catch (err) {
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
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setReady(false);
  };

  const captureFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !ready) return null;

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

  useImperativeHandle(ref, () => ({
    capture: captureFrame,
    stop: stopCamera,
  }));

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center bg-gray-800 rounded-xl border border-gray-700 aspect-video ${className}`}>
        <CameraOff size={36} className="text-gray-600 mb-2" />
        <p className="text-gray-500 text-sm text-center px-4">{error}</p>
      </div>
    );
  }

  return (
    <div className={`relative rounded-xl overflow-hidden bg-gray-950 border border-gray-800 ${className}`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover ${mirrored ? "scale-x-[-1]" : ""}`}
      />
      <canvas ref={canvasRef} className="hidden" />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-950">
          <CameraIcon size={32} className="text-gray-700 animate-pulse" />
        </div>
      )}
    </div>
  );
});

export default Camera;
