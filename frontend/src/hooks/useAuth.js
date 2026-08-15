import { useState, useEffect, useCallback } from "react";
import * as api from "../api/client";

export function useAuth() {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("cv_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem("cv_token"));
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
      localStorage.setItem("cv_token", data.access_token);
      localStorage.setItem("cv_user", JSON.stringify(userData));
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
    localStorage.removeItem("cv_token");
    localStorage.removeItem("cv_user");
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
