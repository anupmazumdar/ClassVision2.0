/**
 * Advanced Device Fingerprinting Utility for ClassVision.
 * Generates a stable hardware + canvas + storage fingerprint to resist simple cache clears.
 */

function generateHardwareHash() {
  try {
    const nav = window.navigator || {};
    const screen = window.screen || {};
    const parts = [
      nav.userAgent || "",
      nav.language || "",
      nav.hardwareConcurrency || 4,
      screen.width || 0,
      screen.height || 0,
      screen.colorDepth || 24,
      new Date().getTimezoneOffset(),
    ];

    // Canvas fingerprint slice
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 120;
      canvas.height = 30;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.textBaseline = "top";
        ctx.font = "14px 'Arial'";
        ctx.fillStyle = "#f60";
        ctx.fillRect(10, 1, 62, 20);
        ctx.fillStyle = "#069";
        ctx.fillText("ClassVision", 2, 15);
        parts.push(canvas.toDataURL().substring(30, 80));
      }
    } catch {
      // Ignored if canvas disabled
    }

    const str = parts.join("###");
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(36);
  } catch {
    return "hw-unknown";
  }
}

export function getDeviceId() {
  try {
    let deviceId = localStorage.getItem("cv_device_id");
    if (!deviceId) {
      const hw = generateHardwareHash();
      const randomSuffix =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID().substring(0, 8)
          : Math.random().toString(36).substring(2, 10);

      deviceId = `dev-${hw}-${randomSuffix}`;
      localStorage.setItem("cv_device_id", deviceId);
    }
    return deviceId;
  } catch {
    return "dev-" + generateHardwareHash() + "-fallback";
  }
}
