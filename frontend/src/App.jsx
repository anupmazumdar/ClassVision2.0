import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

import NavBar from "./components/NavBar";
import InstallPrompt from "./components/InstallPrompt";
import { ToastProvider } from "./context/ToastContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Re-export useAuth so any legacy imports from "../App" still resolve safely
export { useAuth, AuthProvider } from "./context/AuthContext";

// Lazy-loaded route components for optimal bundle splitting
const Login = lazy(() => import("./pages/Login"));
const StudentCheckin = lazy(() => import("./pages/StudentCheckin"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Students = lazy(() => import("./pages/Students"));
const RegisterStudent = lazy(() => import("./pages/RegisterStudent"));
const Session = lazy(() => import("./pages/Session"));
const Reports = lazy(() => import("./pages/Reports"));
const Users = lazy(() => import("./pages/Users"));

// ── Protected route ───────────────────────────────────────────────────────────
function Protected({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div className="min-h-screen flex flex-col bg-gray-950 text-gray-100">
      <NavBar />
      <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full">{children}</main>
    </div>
  );
}

function RouteLoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]" role="status" aria-live="polite">
      <Loader2 size={32} className="animate-spin text-indigo-500" />
      <span className="sr-only">Loading page...</span>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Suspense fallback={<RouteLoadingFallback />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/checkin" element={<StudentCheckin />} />
                <Route path="/student-checkin" element={<StudentCheckin />} />
                <Route
                  path="/"
                  element={
                    <Protected>
                      <Dashboard />
                    </Protected>
                  }
                />
                <Route
                  path="/students"
                  element={
                    <Protected>
                      <Students />
                    </Protected>
                  }
                />
                <Route
                  path="/students/register"
                  element={
                    <Protected>
                      <RegisterStudent />
                    </Protected>
                  }
                />
                <Route
                  path="/session/:id"
                  element={
                    <Protected>
                      <Session />
                    </Protected>
                  }
                />
                <Route
                  path="/reports"
                  element={
                    <Protected>
                      <Reports />
                    </Protected>
                  }
                />
                <Route
                  path="/users"
                  element={
                    <Protected>
                      <Users />
                    </Protected>
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
            <InstallPrompt />
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
