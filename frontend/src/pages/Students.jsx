import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UserPlus, Search, CheckCircle, AlertCircle, Trash2, Loader2 } from "lucide-react";
import { getStudents, deleteStudent } from "../api";
import { useAuth } from "../App";

export default function Students() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState(null);

  const load = () => {
    setLoading(true);
    getStudents()
      .then(setStudents)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.enrollment.toLowerCase().includes(search.toLowerCase()) ||
      s.department.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete ${name}? This will also remove their attendance records.`)) return;
    setDeleting(id);
    try {
      await deleteStudent(id);
      setStudents((s) => s.filter((st) => st.id !== id));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Students</h1>
          <p className="text-gray-500 text-sm mt-0.5">{students.length} registered</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => navigate("/students/register")}>
          <UserPlus size={16} /> Register Student
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        <input
          className="input pl-9"
          placeholder="Search by name, enrollment, or department…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="animate-spin text-indigo-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-14 text-gray-600 text-sm">
          {search ? "No students match your search." : "No students registered yet."}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-800/60 text-gray-400 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">Enrollment</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Department</th>
                <th className="text-center px-4 py-3">Face</th>
                {user?.role === "admin" && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-100">
                    <div>{s.name}</div>
                    <div className="text-xs text-gray-600 sm:hidden">{s.enrollment}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-400 hidden sm:table-cell">{s.enrollment}</td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{s.department || "—"}</td>
                  <td className="px-4 py-3 text-center">
                    {s.has_face ? (
                      <span className="badge-green"><CheckCircle size={11} /> Registered</span>
                    ) : (
                      <span className="badge-red"><AlertCircle size={11} /> Missing</span>
                    )}
                  </td>
                  {user?.role === "admin" && (
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(s.id, s.name)}
                        disabled={deleting === s.id}
                        className="text-gray-600 hover:text-red-400 transition-colors p-1"
                      >
                        {deleting === s.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
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
