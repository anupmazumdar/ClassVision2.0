import React, { createContext, useContext, useState, useCallback } from "react";
import { logout } from "../api/client";

export const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }) {
  // Non-sensitive user display profile is cached for instant render.
  // Sensitive JWT auth is securely handled via httpOnly cookies.
  const [user, setUser] = useState(() => {
    try {
      const stored = sessionStorage.getItem("cv_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const signIn = useCallback((userData) => {
    sessionStorage.setItem("cv_user", JSON.stringify(userData));
    setUser(userData);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logout();
    } catch (_) {}
    sessionStorage.removeItem("cv_user");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
