/**
 * Deterministic Hardware Device Fingerprinting Engine for ClassVision.
 * Generates a stable, reproducible device signature based on hardware, WebGL, canvas, and OS metrics.
 * Does NOT use random seeds — remains identical even across Incognito windows or cleared storage.
 */

function getWebGLSignature() {
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) return "no-webgl";

    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    if (debugInfo) {
      const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || "";
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || "";
      return `${vendor}:::${renderer}`;
    }
    return gl.getParameter(gl.RENDERER) || "webgl-generic";
  } catch {
    return "webgl-err";
  }
}

function getCanvasSignature() {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "no-canvas";

    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#f60";
    ctx.fillRect(125, 1, 62, 20);

    ctx.fillStyle = "#069";
    ctx.font = "15px 'Arial', 'Helvetica', sans-serif";
    ctx.fillText("ClassVision Biometrics 2.0", 2, 15);

    ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
    ctx.font = "16pt 'Times New Roman', serif";
    ctx.fillText("Security::Deterministic", 4, 35);

    return canvas.toDataURL();
  } catch {
    return "canvas-err";
  }
}

function computeDeterministicHash(str) {
  let h1 = 0xdeadbeef ^ 0;
  let h2 = 0x41c6ce57 ^ 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const val = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return val.toString(16).padStart(12, "0");
}

export function getDeviceId() {
  try {
    // 1. Check local storage cache for instant lookup
    const cached = localStorage.getItem("cv_device_id");
    if (cached && cached.startsWith("dev-") && cached.length >= 16) {
      return cached;
    }

    // 2. Deterministic fingerprint computation
    const nav = window.navigator || {};
    const screen = window.screen || {};

    const tz = Intl?.DateTimeFormat?.().resolvedOptions?.()?.timeZone || "";
    const offset = new Date().getTimezoneOffset();

    const components = [
      nav.userAgent || "",
      nav.platform || "",
      nav.language || "",
      (nav.languages || []).join(","),
      nav.hardwareConcurrency || 4,
      nav.deviceMemory || 8,
      nav.maxTouchPoints || 0,
      screen.width || 0,
      screen.height || 0,
      screen.colorDepth || 24,
      screen.pixelDepth || 24,
      window.devicePixelRatio || 1,
      tz,
      offset,
      getWebGLSignature(),
      getCanvasSignature(),
    ];

    const rawSignature = components.join("|||");
    const deterministicHex = computeDeterministicHash(rawSignature);
    const deviceId = `dev-${deterministicHex}`;

    try {
      localStorage.setItem("cv_device_id", deviceId);
      sessionStorage.setItem("cv_device_id", deviceId);
    } catch {
      // Ignored if storage access restricted
    }

    return deviceId;
  } catch {
    return "dev-deterministic-fallback";
  }
}
