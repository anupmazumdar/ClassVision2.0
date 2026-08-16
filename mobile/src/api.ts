import axios from "axios";
import * as Application from "expo-application";
import * as Crypto from "expo-crypto";
import { Platform } from "react-native";

// Change this to your backend server URL (e.g. http://192.168.1.50:8000 in local LAN)
export const BACKEND_URL = "http://10.0.2.2:8000"; // 10.0.2.2 points to localhost on Android Emulator

const api = axios.create({
  baseURL: BACKEND_URL,
  timeout: 10000,
});

export async function getMobileDeviceId(): Promise<string> {
  try {
    let nativeId = "";
    if (Platform.OS === "android") {
      nativeId = Application.getAndroidId() || "";
    } else if (Platform.OS === "ios") {
      nativeId = (await Application.getIosIdForVendorAsync()) || "";
    }
    const digest = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${Platform.OS}-${nativeId}-${Application.applicationName}`
    );
    return `mobile-${digest.substring(0, 16)}`;
  } catch {
    return "mobile-fallback-device-id";
  }
}

export async function scanAndMarkAttendance(
  sessionId: number,
  primaryFrameBase64: string,
  burstFramesBase64: string[],
  options: {
    lat?: number;
    lng?: number;
    code?: string;
    deviceId?: string;
  }
) {
  const payload = {
    image: primaryFrameBase64,
    frames: burstFramesBase64,
    lat: options.lat,
    lng: options.lng,
    code: options.code,
    device_id: options.deviceId,
  };

  const response = await api.post(`/attendance/${sessionId}/scan-and-mark`, payload);
  return response.data;
}

export default api;
