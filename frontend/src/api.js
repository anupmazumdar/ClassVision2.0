import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "/api";

const client = axios.create({ baseURL: BASE_URL });

// Attach JWT to every request
client.interceptors.request.use((config) => {
  const token = localStorage.getItem("cv_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Redirect to login on 401
client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("cv_token");
      localStorage.removeItem("cv_user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const login = (email, password) =>
  client.post("/auth/login", { email, password }).then((r) => r.data);

export const getMe = () => client.get("/auth/me").then((r) => r.data);

// ── Students ──────────────────────────────────────────────────────────────────
export const getStudents = () => client.get("/students").then((r) => r.data);

export const createStudent = (data) =>
  client.post("/students", data).then((r) => r.data);

export const registerFace = (studentId, images) =>
  client.post(`/students/${studentId}/register-face`, { images }).then((r) => r.data);

export const deleteStudent = (studentId) =>
  client.delete(`/students/${studentId}`);

// ── Sessions ──────────────────────────────────────────────────────────────────
export const getSessions = () => client.get("/sessions").then((r) => r.data);

export const startSession = (subject, room) =>
  client.post("/sessions", { subject, room }).then((r) => r.data);

export const stopSession = (sessionId) =>
  client.put(`/sessions/${sessionId}/stop`).then((r) => r.data);

export const getSession = (sessionId) =>
  client.get(`/sessions/${sessionId}`).then((r) => r.data);

export const deleteSession = (sessionId) =>
  client.delete(`/sessions/${sessionId}`);

// ── Attendance ────────────────────────────────────────────────────────────────
export const recognizeFaces = (image) =>
  client.post("/attendance/recognize", { image }).then((r) => r.data);

export const markAttendance = (sessionId, studentId, confidence) =>
  client
    .post(`/attendance/${sessionId}/mark`, { student_id: studentId, confidence })
    .then((r) => r.data);

// ── Attendance: unmark ────────────────────────────────────────────────────────
export const unmarkAttendance = (sessionId, studentId) =>
  client.delete(`/attendance/${sessionId}/unmark/${studentId}`);

// ── Users (admin) ─────────────────────────────────────────────────────────────
export const getUsers = () => client.get("/users").then((r) => r.data);

export const registerUser = (data) =>
  client.post("/auth/register", data).then((r) => r.data);

export const deleteUser = (userId) => client.delete(`/users/${userId}`);

// ── Reports ───────────────────────────────────────────────────────────────────
export const getStudentSummary = () =>
  client.get("/reports/student-summary").then((r) => r.data);

export const emailReport = (sessionId, to) =>
  client.post(`/reports/${sessionId}/email`, { to }).then((r) => r.data);

export const downloadPdf = (sessionId) => {
  const token = localStorage.getItem("cv_token");
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
  const token = localStorage.getItem("cv_token");
  const url = `${BASE_URL}/reports/${sessionId}/excel`;
  const a = document.createElement("a");
  a.href = url;
  a.download = `attendance_${sessionId}.xlsx`;
  // Add auth via fetch + blob for proper JWT auth
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
