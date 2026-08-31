import React, { createContext, useContext, useState, Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

import NavBar from "./components/NavBar";
import InstallPrompt from "./components/InstallPrompt";
import { ToastProvider } from "./context/ToastContext";

// Lazy-loaded route components for optimal bundle splitting
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Students = lazy(() => import("./pages/Students"));
const RegisterStudent = lazy(() => import("./pages/RegisterStudent"));
const Session = lazy(() => import("./pages/Session"));
const Reports = lazy(() => import("./pages/Reports"));
const Users = lazy(() => import("./pages/Users"));

// ── Auth context ──────────────────────────────────────────────────────────────
export const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

function AuthProvider({ children }) {
  // Token and user state are stored in sessionStorage as an interim XSS mitigation
  // (tokens are purged on tab close, avoiding persistent cross-session harvesting).
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("cv_user") || "null");
    } catch {
      return null;
    }
  });

  const signIn = (userData, token) => {
    sessionStorage.setItem("cv_token", token);
    sessionStorage.setItem("cv_user", JSON.stringify(userData));
    setUser(userData);
  };

  const signOut = () => {
    sessionStorage.removeItem("cv_token");
    sessionStorage.removeItem("cv_user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Protected route ───────────────────────────────────────────────────────────
function Protected({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div className="min-h-screen flex flex-col">
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
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Suspense fallback={<RouteLoadingFallback />}>
            <Routes>
              <Route path="/login" element={<Login />} />
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
  );
}
