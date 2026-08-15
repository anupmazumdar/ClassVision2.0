import { useState, useEffect, useCallback } from "react";
import * as api from "../api/client";

export function useStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getStudents();
      setStudents(data);
      return data;
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to fetch students";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const addStudent = useCallback(async (data) => {
    setLoading(true);
    setError(null);
    try {
      const created = await api.createStudent(data);
      await fetchStudents();
      return created;
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to create student";
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, [fetchStudents]);

  const removeStudent = useCallback(async (studentId) => {
    setLoading(true);
    setError(null);
    try {
      await api.deleteStudent(studentId);
      setStudents((prev) => prev.filter((s) => s.id !== studentId));
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to delete student";
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const registerFaces = useCallback(async (studentId, images) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.registerFace(studentId, images);
      await fetchStudents();
      return res;
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to register face";
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, [fetchStudents]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  return {
    students,
    loading,
    error,
    fetchStudents,
    addStudent,
    removeStudent,
    registerFaces,
  };
}
