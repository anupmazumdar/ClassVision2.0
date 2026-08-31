import React, { createContext, useContext, useState, useCallback } from "react";

export const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }) {
  // Token and user state are stored in sessionStorage as an interim XSS mitigation
  // (tokens are purged on tab close, avoiding persistent cross-session harvesting).
  const [user, setUser] = useState(() => {
    try {
      const stored = sessionStorage.getItem("cv_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const signIn = useCallback((userData, token) => {
    sessionStorage.setItem("cv_token", token);
    sessionStorage.setItem("cv_user", JSON.stringify(userData));
    setUser(userData);
  }, []);

  const signOut = useCallback(() => {
    sessionStorage.removeItem("cv_token");
    sessionStorage.removeItem("cv_user");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
