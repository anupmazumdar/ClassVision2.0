import axios from "axios";
import { getDeviceId } from "../utils/device";

const BASE_URL = import.meta.env.VITE_API_URL || "/api";

const client = axios.create({ baseURL: BASE_URL });

export function getErrorMessage(err, fallback = "An error occurred. Please try again.") {
  if (!err) return fallback;
  const detail = err.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (item?.msg) return item.msg;
        return JSON.stringify(item);
      })
      .join("; ");
  }
  if (detail && typeof detail === "object") {
    return detail.msg || JSON.stringify(detail);
  }
  return err.message || fallback;
}

// Token and user state are stored in sessionStorage as an interim XSS mitigation
// (tokens are purged on tab close, avoiding persistent token harvesting).
client.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("cv_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      sessionStorage.removeItem("cv_token");
      sessionStorage.removeItem("cv_user");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export const login = (email, password) =>
  client.post("/auth/login", { email, password }).then((r) => r.data);

export const getMe = () => client.get("/auth/me").then((r) => r.data);

export const getStudents = () => client.get("/students").then((r) => r.data);

export const createStudent = (data) =>
  client.post("/students", data).then((r) => r.data);

export const registerFace = (studentId, images, consent = false) =>
  client.post(`/students/${studentId}/register-face`, { images, consent }).then((r) => r.data);

export const deleteStudent = (studentId) => client.delete(`/students/${studentId}`);

export const getSessions = () => client.get("/sessions").then((r) => r.data);

export const startSession = (subject, room, extra = {}) =>
  client
    .post("/sessions", {
      subject,
      room,
      room_lat: extra.room_lat ?? null,
      room_lng: extra.room_lng ?? null,
      radius_meters: extra.radius_meters ?? 100.0,
      require_code: extra.require_code ?? false,
    })
    .then((r) => r.data);

export const getSessionCode = (sessionId) =>
  client.get(`/sessions/${sessionId}/code`).then((r) => r.data);

export const stopSession = (sessionId) =>
  client.put(`/sessions/${sessionId}/stop`).then((r) => r.data);

export const getSession = (sessionId) =>
  client.get(`/sessions/${sessionId}`).then((r) => r.data);

export const deleteSession = (sessionId) => client.delete(`/sessions/${sessionId}`);

export const recognizeFaces = (image, frames = null, sessionId = null) =>
  client
    .post("/attendance/recognize", {
      image,
      frames,
      session_id: sessionId,
      device_id: getDeviceId(),
    })
    .then((r) => r.data);

export const selfCheckin = ({ code, image, frames = null, lat = null, lng = null, device_id = null }) => {
  const resolvedDeviceId = device_id !== null ? device_id : getDeviceId();
  return client
    .post("/attendance/self-checkin", {
      code,
      image,
      frames,
      lat,
      lng,
      device_id: resolvedDeviceId,
    })
    .then((r) => r.data);
};

export const scanAndMark = (sessionId, image, frames = null, extra = {}) => {
  const resolvedDeviceId =
    extra.device_id !== undefined ? extra.device_id : getDeviceId();
  return client
    .post(`/attendance/${sessionId}/scan-and-mark`, {
      image,
      frames,
      lat: extra.lat ?? null,
      lng: extra.lng ?? null,
      code: extra.code ?? null,
      device_id: resolvedDeviceId,
    })
    .then((r) => r.data);
};

export const markAttendance = (sessionId, studentId, confidence, extra = {}) => {
  const resolvedDeviceId =
    extra.device_id !== undefined ? extra.device_id : getDeviceId();
  return client
    .post(`/attendance/${sessionId}/mark`, {
      student_id: studentId,
      attendance_ticket: extra.attendance_ticket ?? null,
      confidence,
      lat: extra.lat ?? null,
      lng: extra.lng ?? null,
      code: extra.code ?? null,
      device_id: resolvedDeviceId,
    })
    .then((r) => r.data);
};

export const manualMarkAttendance = (sessionId, studentId) =>
  client
    .post(`/attendance/${sessionId}/manual-mark`, { student_id: studentId })
    .then((r) => r.data);

export const unmarkAttendance = (sessionId, studentId) =>
  client.delete(`/attendance/${sessionId}/unmark/${studentId}`);

export const getUsers = () => client.get("/users").then((r) => r.data);

export const registerUser = (data) =>
  client.post("/auth/register", data).then((r) => r.data);

export const deleteUser = (userId) => client.delete(`/users/${userId}`);

export const getStudentSummary = () =>
  client.get("/reports/student-summary").then((r) => r.data);

export const emailReport = (sessionId, to) =>
  client.post(`/reports/${sessionId}/email`, { to }).then((r) => r.data);

export const downloadPdf = (sessionId) => {
  const token = sessionStorage.getItem("cv_token");
  const url = `${BASE_URL}/reports/${sessionId}/pdf`;
  fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    .then((res) => res.blob())
    .then((blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `attendance_${sessionId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    });
};

export const downloadExcel = (sessionId) => {
  const token = sessionStorage.getItem("cv_token");
  const url = `${BASE_URL}/reports/${sessionId}/excel`;
  const a = document.createElement("a");
  a.href = url;
  a.download = `attendance_${sessionId}.xlsx`;
  fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    .then((res) => res.blob())
    .then((blob) => {
      const blobUrl = URL.createObjectURL(blob);
      a.href = blobUrl;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    });
};

export const autoPromoteStudents = (currentYear = new Date().getFullYear()) =>
  client.post(`/students/auto-promote?current_year=${currentYear}`).then((r) => r.data);

export const getMaterials = (params = {}) =>
  client.get("/materials", { params }).then((r) => r.data);

export const createMaterial = (data) =>
  client.post("/materials", data).then((r) => r.data);

export const updateMaterial = (materialId, data) =>
  client.put(`/materials/${materialId}`, data).then((r) => r.data);

export const deleteMaterial = (materialId) =>
  client.delete(`/materials/${materialId}`);

export const askAssistant = (message, history = []) =>
  client.post("/assistant/chat", { message, history }).then((r) => r.data);

export const getAssistantFaqs = () =>
  client.get("/assistant/faqs").then((r) => r.data);

export const studentLogin = (enrollment, device_id = null, device_info = "Web Browser") => {
  const resolvedDeviceId = device_id || getDeviceId();
  return client
    .post("/auth/student-login", {
      enrollment,
      device_id: resolvedDeviceId,
      device_info,
    })
    .then((r) => r.data);
};

export const getDeviceRequests = () =>
  client.get("/students/device-requests").then((r) => r.data);

export const approveDeviceRequest = (studentId) =>
  client.post(`/students/${studentId}/approve-device`).then((r) => r.data);

export const rejectDeviceRequest = (studentId) =>
  client.post(`/students/${studentId}/reject-device`).then((r) => r.data);

export const resetStudentDevice = (studentId) =>
  client.post(`/students/${studentId}/reset-device`).then((r) => r.data);

export const getAuditLogs = (params = {}) =>
  client.get("/audit-logs", { params }).then((r) => r.data);


