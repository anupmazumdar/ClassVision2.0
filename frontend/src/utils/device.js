/**
 * Device fingerprinting utility for ClassVision.
 * Generates and persists a unique device UUID in localStorage.
 */

export function getDeviceId() {
  try {
    let deviceId = localStorage.getItem("cv_device_id");
    if (!deviceId) {
      if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        deviceId = crypto.randomUUID();
      } else {
        deviceId =
          "dev-" +
          Math.random().toString(36).substring(2, 15) +
          "-" +
          Date.now().toString(36);
      }
      localStorage.setItem("cv_device_id", deviceId);
    }
    return deviceId;
  } catch {
    return "dev-fallback-" + Date.now();
  }
}
