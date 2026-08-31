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
  Smartphone,
  Check,
  X,
  History,
  Lock,
  RotateCcw,
  AlertTriangle,
  FileSpreadsheet,
} from "lucide-react";
import {
  getStudents,
  deleteStudent,
  autoPromoteStudents,
  getDeviceRequests,
  approveDeviceRequest,
  rejectDeviceRequest,
  resetStudentDevice,
  getAuditLogs,
  getErrorMessage,
} from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const COURSES_CONFIG = [
  { id: "all", label: "All Courses", years: 4 },
  { id: "B.Tech", label: "B.Tech (4 Yrs)", years: 4 },
  { id: "BCA", label: "BCA (3 Yrs)", years: 3 },
  { id: "BBA", label: "BBA (3 Yrs)", years: 3 },
  { id: "Diploma", label: "Diploma (3 Yrs)", years: 3 },
  { id: "MCA", label: "MCA (2 Yrs)", years: 2 },
  { id: "MBA", label: "MBA (2 Yrs)", years: 2 },
  { id: "M.Tech", label: "M.Tech (2 Yrs)", years: 2 },
];

export default function Students() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const [students, setStudents] = useState([]);
  const [deviceRequests, setDeviceRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("all");
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [selectedYear, setSelectedYear] = useState("all");

  const [deleting, setDeleting] = useState(null);
  const [promoting, setPromoting] = useState(false);
  const [processingDeviceId, setProcessingDeviceId] = useState(null);

  // Modals
  const [deviceModalOpen, setDeviceModalOpen] = useState(false);
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const load = () => {
    getStudents()
      .then(setStudents)
      .finally(() => setLoading(false));

    if (user?.role === "admin" || user?.role === "teacher") {
      getDeviceRequests()
        .then(setDeviceRequests)
        .catch(() => {});
    }
  };

  useEffect(load, [user]);

  const loadAuditLogs = async () => {
    setAuditLoading(true);
    try {
      const data = await getAuditLogs({ limit: 100 });
      setAuditLogs(data.logs || []);
      setAuditModalOpen(true);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load audit logs."));
    } finally {
      setAuditLoading(false);
    }
  };

  const handleApproveDevice = async (studentId) => {
    setProcessingDeviceId(studentId);
    try {
      await approveDeviceRequest(studentId);
      toast.success("Device switch approved!");
      load();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to approve device switch."));
    } finally {
      setProcessingDeviceId(null);
    }
  };

  const handleRejectDevice = async (studentId) => {
    setProcessingDeviceId(studentId);
    try {
      await rejectDeviceRequest(studentId);
      toast.info("Device switch request rejected.");
      load();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to reject device switch."));
    } finally {
      setProcessingDeviceId(null);
    }
  };

  const handleResetDevice = async (studentId, studentName) => {
    if (!confirm(`Reset device binding for ${studentName}? They will be able to bind a new device on next login.`)) {
      return;
    }
    setProcessingDeviceId(studentId);
    try {
      await resetStudentDevice(studentId);
      toast.success(`Device binding reset for ${studentName}.`);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to reset device binding."));
    } finally {
      setProcessingDeviceId(null);
    }
  };

  const handleAutoPromote = async () => {
    if (!confirm("Automatically recalculate academic year and semester for all students based on their admission year and course duration?")) {
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

  const handleResetFilters = () => {
    setSearch("");
    setSelectedCourse("all");
    setSelectedBranch("all");
    setSelectedYear("all");
  };

  const hasActiveFilters = search || selectedCourse !== "all" || selectedBranch !== "all" || selectedYear !== "all";

  // Compute maximum years based on chosen course
  const currentCourseObj = COURSES_CONFIG.find((c) => c.id === selectedCourse);
  const maxYearsForCourse = currentCourseObj ? currentCourseObj.years : 4;

  const filtered = students.filter((s) => {
    const sCourse = (s.course || "B.Tech").toLowerCase();
    const sBranch = (s.branch || s.department || "").toLowerCase();
    const sYear = String(s.year || 1);

    const matchesSearch =
      !search.trim() ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.enrollment.toLowerCase().includes(search.toLowerCase()) ||
      sBranch.includes(search.toLowerCase());

    const matchesCourse =
      selectedCourse === "all" || sCourse === selectedCourse.toLowerCase();

    const matchesBranch =
      selectedBranch === "all" || sBranch.includes(selectedBranch.toLowerCase());

    const matchesYear =
      selectedYear === "all" || sYear === selectedYear;

    return matchesSearch && matchesCourse && matchesBranch && matchesYear;
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
            {students.length} registered students • 1-Device Binding & Immutable Audit Ledger Active
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Pending Device Switch Requests Button */}
          {deviceRequests.length > 0 && (
            <button
              className="btn-secondary flex items-center gap-1.5 text-xs text-amber-300 border-amber-800/80 bg-amber-950/40 hover:bg-amber-900/50 animate-pulse"
              onClick={() => setDeviceModalOpen(true)}
            >
              <Smartphone size={13} />
              <span>{deviceRequests.length} Device Requests</span>
            </button>
          )}

          {/* Immutable Audit Logs Button */}
          <button
            className="btn-secondary flex items-center gap-1.5 text-xs text-emerald-300 border-emerald-800/60 hover:bg-emerald-950/40"
            onClick={loadAuditLogs}
            disabled={auditLoading}
            title="Inspect Immutable Access & Security Audit Ledger"
          >
            {auditLoading ? <Loader2 size={13} className="animate-spin" /> : <History size={13} />}
            <span>Audit Logs</span>
          </button>

          {/* Auto Promote Years */}
          {user?.role === "admin" && (
            <button
              className="btn-secondary flex items-center gap-1.5 text-xs text-indigo-300 border-indigo-800/60 hover:bg-indigo-950/40"
              onClick={handleAutoPromote}
              disabled={promoting}
              title="Automatically update Year/Semester based on admission year and course duration"
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

      {/* Simplified, Easy Filter Bar */}
      <div className="card p-3.5 bg-gray-900/90 border-gray-800 space-y-3 shadow-md">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Search Input */}
          <div className="relative">
            <label htmlFor="student-search-input" className="sr-only">Search by name or roll number</label>
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            <input
              id="student-search-input"
              className="input pl-8.5 pr-8 text-xs bg-gray-950"
              placeholder="Search student name or roll…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Course Selector */}
          <div>
            <select
              className="input bg-gray-950 text-xs font-medium"
              value={selectedCourse}
              onChange={(e) => {
                const c = e.target.value;
                setSelectedCourse(c);
                const cObj = COURSES_CONFIG.find((x) => x.id === c);
                const max = cObj ? cObj.years : 4;
                if (selectedYear !== "all" && parseInt(selectedYear) > max) {
                  setSelectedYear("all");
                }
              }}
            >
              {COURSES_CONFIG.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Branch Selector */}
          <div>
            <select
              className="input bg-gray-950 text-xs"
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
            >
              <option value="all">All Branches</option>
              <option value="Computer Science">CSE (All specializations)</option>
              <option value="AI">CSE (AI & ML)</option>
              <option value="Data Science">CSE (Data Science)</option>
              <option value="Information Technology">Information Technology (IT)</option>
              <option value="Electronics">Electronics (ECE)</option>
              <option value="Electrical">Electrical (EE)</option>
              <option value="Mechanical">Mechanical (ME)</option>
              <option value="Civil">Civil (CE)</option>
              <option value="Biotechnology">Biotechnology</option>
            </select>
          </div>

          {/* Adaptive Year Selector */}
          <div className="flex items-center gap-2">
            <select
              className="input bg-gray-950 text-xs flex-1"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              <option value="all">All Academic Years</option>
              {Array.from({ length: maxYearsForCourse }, (_, i) => i + 1).map((y) => (
                <option key={y} value={String(y)}>
                  {y}{y === 1 ? "st" : y === 2 ? "nd" : y === 3 ? "rd" : "th"} Year (Sem {(y * 2) - 1}-{y * 2})
                </option>
              ))}
            </select>

            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="btn-secondary text-xs px-2.5 py-2 text-gray-400 hover:text-red-400 border-gray-700 hover:border-red-800/80 shrink-0"
                title="Reset all search filters"
              >
                <X size={14} className="inline mr-1" /> Clear
              </button>
            )}
          </div>
        </div>

        {/* Filter Stats Badge Bar */}
        <div className="flex items-center justify-between text-[11px] text-gray-400 pt-0.5 border-t border-gray-800/60">
          <span>
            Showing <strong className="text-indigo-400">{filtered.length}</strong> of <strong>{students.length}</strong> students
          </span>
          {hasActiveFilters && (
            <span className="text-gray-500 italic">
              Filters active ({selectedCourse !== "all" ? selectedCourse : "All"} • {selectedBranch !== "all" ? selectedBranch : "All"} • {selectedYear !== "all" ? `Yr ${selectedYear}` : "All Yrs"})
            </span>
          )}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="animate-spin text-indigo-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-14 text-gray-500 text-sm space-y-2">
          <p>
            {hasActiveFilters
              ? "No students match your filter criteria."
              : "No students registered yet."}
          </p>
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="btn-secondary text-xs mt-2 text-indigo-400 border-indigo-800"
            >
              Reset Filters
            </button>
          )}
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
                <th className="text-center px-4 py-3">Device Lock</th>
                <th className="text-center px-4 py-3">Biometrics</th>
                <th className="px-4 py-3 text-right">Actions</th>
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

                  {/* Device Lock Status */}
                  <td className="px-4 py-3 text-center">
                    {s.device_approval_status === "pending_approval" ? (
                      <button
                        onClick={() => setDeviceModalOpen(true)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold bg-amber-950/80 border border-amber-700/80 text-amber-300 px-2 py-0.5 rounded-full animate-pulse"
                        title="Click to view & approve device change request"
                      >
                        <Smartphone size={11} /> Switch Pending
                      </button>
                    ) : s.device_id ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-950/50 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                        <Lock size={11} /> Bound
                      </span>
                    ) : (
                      <span className="text-[11px] text-gray-500">Unbound</span>
                    )}
                  </td>

                  {/* Biometrics */}
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

                  {/* Actions */}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {s.device_id && (
                        <button
                          className="text-gray-500 hover:text-amber-400 transition-colors p-1"
                          onClick={() => handleResetDevice(s.id, s.name)}
                          disabled={processingDeviceId === s.id}
                          title="Reset Device Binding (Allow student to bind new phone)"
                        >
                          <RotateCcw size={14} />
                        </button>
                      )}

                      {user?.role === "admin" && (
                        <button
                          className="text-gray-500 hover:text-red-400 transition-colors p-1"
                          onClick={() => handleDelete(s.id, s.name)}
                          disabled={deleting === s.id}
                          title="Delete Student"
                        >
                          {deleting === s.id ? <Loader2 size={15} className="animate-spin text-red-400" /> : <Trash2 size={15} />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* DEVICE SWITCH APPROVAL MODAL */}
      {deviceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card w-full max-w-xl bg-gray-900 border-gray-800 shadow-2xl p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3 shrink-0">
              <h2 className="text-base font-bold text-gray-100 flex items-center gap-2">
                <Smartphone size={17} className="text-amber-400" /> Student Device Switch Requests
              </h2>
              <button
                onClick={() => setDeviceModalOpen(false)}
                className="text-gray-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-3 pr-1">
              {deviceRequests.length === 0 ? (
                <div className="text-center py-10 text-gray-500 text-xs">
                  No pending device switch requests. All student logins are verified.
                </div>
              ) : (
                deviceRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 rounded-xl border border-gray-800 bg-gray-950/80 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-sm text-gray-100">{req.name}</h3>
                        <p className="text-xs text-indigo-400 font-mono">
                          {req.enrollment} • {req.course} ({req.branch})
                        </p>
                      </div>
                      <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded-full font-medium">
                        Approval Required
                      </span>
                    </div>

                    <div className="text-[11px] text-gray-400 space-y-1 bg-gray-900 p-2.5 rounded-lg border border-gray-800">
                      <div>📱 <strong>New Device Info:</strong> {req.pending_device_info || "Web Browser"}</div>
                      <div className="font-mono text-[10px] text-gray-500 truncate">Device Fingerprint: {req.pending_device_id}</div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={() => handleRejectDevice(req.id)}
                        disabled={processingDeviceId === req.id}
                        className="btn-secondary text-xs text-rose-400 border-rose-900/60 hover:bg-rose-950/40 py-1 px-3"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleApproveDevice(req.id)}
                        disabled={processingDeviceId === req.id}
                        className="btn-primary text-xs py-1 px-3.5 flex items-center gap-1.5"
                      >
                        {processingDeviceId === req.id ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Check size={13} />
                        )}
                        <span>Approve Device Switch</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-gray-800 text-right shrink-0">
              <button className="btn-secondary text-xs" onClick={() => setDeviceModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMMUTABLE ACCESS & SECURITY AUDIT LOGS MODAL (Read-Only) */}
      {auditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
          <div className="card w-full max-w-3xl bg-gray-900 border-gray-800 shadow-2xl p-5 sm:p-6 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3 shrink-0">
              <div>
                <h2 className="text-base font-bold text-gray-100 flex items-center gap-2">
                  <History size={17} className="text-emerald-400" /> Immutable Access & Security Audit Ledger
                </h2>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Write-Once, Read-Many (WORM) • Cryptographically chained SHA-256 digests • Permanent & undeletable
                </p>
              </div>
              <button
                onClick={() => setAuditModalOpen(false)}
                className="text-gray-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-2 pr-1 text-xs">
              {auditLogs.length === 0 ? (
                <div className="text-center py-12 text-gray-500">No audit records logged yet.</div>
              ) : (
                auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl border border-gray-800 bg-gray-950/80 space-y-1.5 hover:border-gray-700 transition-colors"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          log.event_type.includes("BLOCKED") || log.event_type.includes("CONFLICT")
                            ? "bg-rose-950 text-rose-300 border-rose-800"
                            : log.event_type.includes("APPROVED") || log.event_type.includes("SUCCESS")
                            ? "bg-emerald-950 text-emerald-300 border-emerald-800"
                            : "bg-indigo-950 text-indigo-300 border-indigo-800"
                        }`}>
                          {log.event_type}
                        </span>
                        <span className="font-mono text-gray-200">{log.actor_id}</span>
                        <span className="text-[10px] text-gray-500 uppercase">({log.actor_type})</span>
                      </div>
                      <span className="text-[11px] text-gray-400">
                        {log.timestamp ? new Date(log.timestamp).toLocaleString() : "Recently"}
                      </span>
                    </div>

                    {/* Details and Hash */}
                    <div className="text-[11px] text-gray-400 bg-gray-900/90 p-2 rounded-lg border border-gray-800/80 space-y-0.5">
                      <div className="truncate">
                        📄 <strong>Details:</strong> {JSON.stringify(log.details)}
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono truncate">
                        🔒 <strong>SHA-256 Digest:</strong> {log.log_hash}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-gray-800 flex items-center justify-between shrink-0 text-xs text-gray-500">
              <span>{auditLogs.length} total immutable audit records stored</span>
              <button className="btn-secondary text-xs" onClick={() => setAuditModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
