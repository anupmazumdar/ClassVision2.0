import axios from "axios";
import { getDeviceId } from "../utils/device";

const BASE_URL = import.meta.env.VITE_API_URL || "/api";

const client = axios.create({ baseURL: BASE_URL });

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
      window.location.href = "/login";
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
