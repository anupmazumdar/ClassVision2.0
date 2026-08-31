import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  UserPlus,
  Search,
  CheckCircle,
  AlertCircle,
  Trash2,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  Filter,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import { getStudents, deleteStudent, autoPromoteStudents, getErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export default function Students() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [selectedYear, setSelectedYear] = useState("all");
  const [selectedCourse, setSelectedCourse] = useState("all");
  const [deleting, setDeleting] = useState(null);
  const [promoting, setPromoting] = useState(false);

  const load = () => {
    getStudents()
      .then(setStudents)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleAutoPromote = async () => {
    if (!confirm("Automatically recalculate academic year and semester for all students based on their admission year?")) {
      return;
    }
    setPromoting(true);
    try {
      const res = await autoPromoteStudents();
      toast.success(`Academic years updated for ${res.updated_count} students!`);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to auto-promote students."));
    } finally {
      setPromoting(false);
    }
  };

  const filtered = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.enrollment.toLowerCase().includes(search.toLowerCase()) ||
      (s.branch || s.department || "").toLowerCase().includes(search.toLowerCase());

    const matchesBranch =
      selectedBranch === "all" || (s.branch || s.department || "").toLowerCase().includes(selectedBranch.toLowerCase());

    const matchesYear =
      selectedYear === "all" || String(s.year || 1) === selectedYear;

    const matchesCourse =
      selectedCourse === "all" || (s.course || "B.Tech").toLowerCase() === selectedCourse.toLowerCase();

    return matchesSearch && matchesBranch && matchesYear && matchesCourse;
  });

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete ${name}? All attendance records will be removed.`)) return;
    setDeleting(id);
    try {
      await deleteStudent(id);
      setStudents((prev) => prev.filter((s) => s.id !== id));
      toast.success(`Student ${name} deleted.`);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to delete student."));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <GraduationCap className="text-indigo-400" /> Students Directory
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {students.length} registered students • Academic Year auto-progression active
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {user?.role === "admin" && (
            <button
              className="btn-secondary flex items-center gap-1.5 text-xs text-indigo-300 border-indigo-800/60 hover:bg-indigo-950/40"
              onClick={handleAutoPromote}
              disabled={promoting}
              title="Automatically update Year/Semester based on admission year"
            >
              {promoting ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              <span>Auto-Update Years</span>
            </button>
          )}
          <button className="btn-primary flex items-center gap-2" onClick={() => navigate("/students/register")}>
            <UserPlus size={16} /> Register Student
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search */}
        <div className="relative">
          <label htmlFor="student-search-input" className="sr-only">Search students</label>
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input
            id="student-search-input"
            className="input pl-9 text-xs"
            placeholder="Search by name or enrollment…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Course Filter */}
        <select
          className="input bg-gray-900 text-xs"
          value={selectedCourse}
          onChange={(e) => setSelectedCourse(e.target.value)}
        >
          <option value="all">All Courses</option>
          <option value="B.Tech">B.Tech</option>
          <option value="M.Tech">M.Tech</option>
          <option value="BCA">BCA</option>
          <option value="MCA">MCA</option>
          <option value="BBA">BBA</option>
          <option value="MBA">MBA</option>
          <option value="Diploma">Diploma</option>
        </select>

        {/* Branch Filter */}
        <select
          className="input bg-gray-900 text-xs"
          value={selectedBranch}
          onChange={(e) => setSelectedBranch(e.target.value)}
        >
          <option value="all">All Branches</option>
          <option value="Computer Science">CSE / CS</option>
          <option value="AI">AI & Machine Learning</option>
          <option value="Data Science">Data Science</option>
          <option value="Information Technology">IT</option>
          <option value="Electronics">ECE</option>
          <option value="Electrical">EE</option>
          <option value="Mechanical">ME</option>
          <option value="Civil">CE</option>
        </select>

        {/* Year Filter */}
        <select
          className="input bg-gray-900 text-xs"
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
        >
          <option value="all">All Academic Years</option>
          <option value="1">1st Year (Sem 1-2)</option>
          <option value="2">2nd Year (Sem 3-4)</option>
          <option value="3">3rd Year (Sem 5-6)</option>
          <option value="4">4th Year (Sem 7-8)</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="animate-spin text-indigo-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-14 text-gray-500 text-sm">
          {search || selectedBranch !== "all" || selectedYear !== "all"
            ? "No students match your filter criteria."
            : "No students registered yet."}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-800 bg-gray-900/60 shadow-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-800/80 text-gray-400 text-xs uppercase tracking-wider border-b border-gray-800">
                <th className="text-left px-4 py-3">Student Name</th>
                <th className="text-left px-4 py-3">Enrollment No</th>
                <th className="text-left px-4 py-3">Course & Branch</th>
                <th className="text-center px-4 py-3">Academic Year</th>
                <th className="text-center px-4 py-3">Biometrics</th>
                <th className="text-center px-4 py-3">Consent</th>
                {user?.role === "admin" && <th className="px-4 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-gray-800/40 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-100">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-indigo-950/80 border border-indigo-700/60 text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0">
                        {s.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <div>{s.name}</div>
                        <div className="text-[11px] text-gray-500 sm:hidden font-mono">{s.enrollment}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-indigo-300 font-mono text-xs">{s.enrollment}</td>
                  <td className="px-4 py-3 text-gray-300 text-xs">
                    <div className="font-medium text-gray-200">{s.course || "B.Tech"}</div>
                    <div className="text-[11px] text-gray-400">{s.branch || s.department || "General"}</div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-gray-800 border border-gray-700 text-gray-200 px-2 py-0.5 rounded-full">
                      Year {s.year || 1} • Sem {s.semester || 1}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {s.has_face ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-400 font-medium">
                        <CheckCircle size={14} /> Enrolled
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-400">
                        <AlertCircle size={14} /> Pending
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {s.consent_given ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-400" title="Biometric Consent Granted">
                        <ShieldCheck size={14} />
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500" title="No Consent">
                        <ShieldAlert size={14} />
                      </span>
                    )}
                  </td>
                  {user?.role === "admin" && (
                    <td className="px-4 py-3 text-right">
                      <button
                        className="text-gray-500 hover:text-red-400 transition-colors p-1"
                        onClick={() => handleDelete(s.id, s.name)}
                        disabled={deleting === s.id}
                        title="Delete Student"
                      >
                        {deleting === s.id ? <Loader2 size={15} className="animate-spin text-red-400" /> : <Trash2 size={15} />}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
