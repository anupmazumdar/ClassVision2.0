import { useState, useEffect, useCallback } from "react";
import * as api from "../api/client";

export function useAuth() {
  // Token and user state are stored in sessionStorage as an interim XSS mitigation
  // (tokens are destroyed on tab close, avoiding persistent token harvesting).
  const [user, setUser] = useState(() => {
    try {
      const stored = sessionStorage.getItem("cv_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => sessionStorage.getItem("cv_token"));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.login(email, password);
      const userData = {
        name: data.name,
        role: data.role,
      };
      sessionStorage.setItem("cv_token", data.access_token);
      sessionStorage.setItem("cv_user", JSON.stringify(userData));
      setToken(data.access_token);
      setUser(userData);
      return data;
    } catch (err) {
      const msg = err.response?.data?.detail || "Invalid login credentials";
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem("cv_token");
    sessionStorage.removeItem("cv_user");
    setToken(null);
    setUser(null);
  }, []);

  return {
    user,
    token,
    loading,
    error,
    login,
    logout,
    isAuthenticated: Boolean(token),
    isAdmin: user?.role === "admin",
  };
}
