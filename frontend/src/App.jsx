import React, { createContext, useContext, useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import RegisterStudent from "./pages/RegisterStudent";
import Session from "./pages/Session";
import Reports from "./pages/Reports";
import Users from "./pages/Users";
import NavBar from "./components/NavBar";

// ── Auth context ──────────────────────────────────────────────────────────────
export const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("cv_user") || "null");
    } catch {
      return null;
    }
  });

  const signIn = (userData, token) => {
    localStorage.setItem("cv_token", token);
    localStorage.setItem("cv_user", JSON.stringify(userData));
    setUser(userData);
  };

  const signOut = () => {
    localStorage.removeItem("cv_token");
    localStorage.removeItem("cv_user");
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

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
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
      </BrowserRouter>
    </AuthProvider>
  );
}
