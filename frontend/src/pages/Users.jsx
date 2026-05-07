import React, { useState, useEffect } from "react";
import { UserCog, UserPlus, Trash2, Loader2, Shield, BookOpen } from "lucide-react";
import { getUsers, registerUser, deleteUser } from "../api";
import { useAuth } from "../App";
import { useNavigate } from "react-router-dom";

const EMPTY_FORM = { name: "", email: "", password: "", role: "teacher" };

export default function Users() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user?.role !== "admin") { navigate("/"); return; }
    load();
  }, []);

  const load = () => {
    setLoading(true);
    getUsers().then(setUsers).finally(() => setLoading(false));
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await registerUser(form);
      setShowForm(false);
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to register user.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete user "${name}"?`)) return;
    setDeleting(id);
    try {
      await deleteUser(id);
      setUsers((u) => u.filter((x) => x.id !== id));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Users</h1>
          <p className="text-gray-500 text-sm mt-0.5">{users.length} registered</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowForm(true)}>
          <UserPlus size={16} /> Add Teacher
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-indigo-500" /></div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-800/60 text-gray-400 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">Email</th>
                <th className="text-center px-4 py-3">Role</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-100">{u.name}</td>
                  <td className="px-4 py-3 text-gray-400 hidden sm:table-cell">{u.email}</td>
                  <td className="px-4 py-3 text-center">
                    {u.role === "admin" ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-300 bg-indigo-900/30 border border-indigo-700 px-2 py-0.5 rounded-full">
                        <Shield size={10} /> Admin
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-300 bg-blue-900/20 border border-blue-700 px-2 py-0.5 rounded-full">
                        <BookOpen size={10} /> Teacher
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {u.email !== user?.email && (
                      <button
                        onClick={() => handleDelete(u.id, u.name)}
                        disabled={deleting === u.id}
                        className="text-gray-600 hover:text-red-400 transition-colors p-1"
                      >
                        {deleting === u.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add user modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="card w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <UserCog size={18} className="text-indigo-400" /> Add User
            </h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="label">Full Name *</label>
                <input className="input" placeholder="e.g. Dr. Sharma" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <label className="label">Email *</label>
                <input className="input" type="email" placeholder="teacher@college.edu" value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div>
                <label className="label">Password *</label>
                <input className="input" type="password" placeholder="Min 6 characters" value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
              </div>
              <div>
                <label className="label">Role</label>
                <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="teacher">Teacher</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {error && (
                <p className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">{error}</p>
              )}
              <div className="flex gap-3 pt-1">
                <button type="button" className="btn-secondary flex-1" onClick={() => { setShowForm(false); setError(""); setForm(EMPTY_FORM); }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2" disabled={saving}>
                  {saving ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : "Add User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
