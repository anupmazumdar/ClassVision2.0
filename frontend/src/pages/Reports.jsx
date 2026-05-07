import React, { useState, useEffect } from "react";
import {
  Download, Loader2, FileSpreadsheet, FileText, Clock,
  Mail, BarChart2, Send, X,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { getSessions, getSession, downloadExcel, downloadPdf, getStudentSummary, emailReport } from "../api";

export default function Reports() {
  const [tab, setTab] = useState("sessions"); // sessions | chart
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Chart
  const [summary, setSummary] = useState(null);
  const [chartLoading, setChartLoading] = useState(false);

  // Email modal
  const [emailModal, setEmailModal] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailMsg, setEmailMsg] = useState("");

  useEffect(() => {
    getSessions()
      .then((s) => setSessions(s.filter((x) => !x.is_active)))
      .finally(() => setLoading(false));
  }, []);

  const loadDetail = async (id) => {
    setSelected(id);
    setDetailLoading(true);
    try {
      setDetail(await getSession(id));
    } finally {
      setDetailLoading(false);
    }
  };

  const loadChart = async () => {
    if (summary) return;
    setChartLoading(true);
    try {
      setSummary(await getStudentSummary());
    } finally {
      setChartLoading(false);
    }
  };

  const handleTabChange = (t) => {
    setTab(t);
    if (t === "chart") loadChart();
  };

  const handleEmail = async (e) => {
    e.preventDefault();
    setEmailSending(true);
    setEmailMsg("");
    try {
      const res = await emailReport(selected, emailTo);
      setEmailMsg(res.message);
      setTimeout(() => setEmailModal(false), 2000);
    } catch (err) {
      setEmailMsg(err.response?.data?.detail || "Failed to send email.");
    } finally {
      setEmailSending(false);
    }
  };

  const pctColor = (pct) => {
    if (pct >= 75) return "#4ade80";
    if (pct >= 50) return "#facc15";
    return "#f87171";
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Reports</h1>
        <p className="text-gray-500 text-sm mt-0.5">Session reports and student attendance analytics.</p>
      </div>

      {/* Top tabs */}
      <div className="flex gap-1 border-b border-gray-800">
        {[
          { id: "sessions", label: "Session Reports", icon: FileSpreadsheet },
          { id: "chart",    label: "Attendance Chart", icon: BarChart2 },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => handleTabChange(id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === id
                ? "border-indigo-500 text-indigo-300"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* ── Sessions tab ─────────────────────────────────────────── */}
      {tab === "sessions" && (
        loading ? (
          <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-indigo-500" /></div>
        ) : sessions.length === 0 ? (
          <div className="card text-center py-14 text-gray-600 text-sm">No completed sessions yet.</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Session list */}
            <div className="lg:col-span-1 space-y-2">
              {sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => loadDetail(s.id)}
                  className={`w-full text-left card py-3 transition-colors hover:border-gray-700 ${
                    selected === s.id ? "border-indigo-600 bg-indigo-900/10" : ""
                  }`}
                >
                  <p className="font-medium text-gray-200 text-sm">{s.subject}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(s.started_at).toLocaleDateString()} ·{" "}
                    {new Date(s.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <p className="text-xs text-green-400 mt-1">{s.present_count} present</p>
                </button>
              ))}
            </div>

            {/* Detail panel */}
            <div className="lg:col-span-2">
              {!selected && (
                <div className="card text-center py-16 text-gray-600 text-sm">Select a session to preview</div>
              )}
              {selected && detailLoading && (
                <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-indigo-500" /></div>
              )}
              {selected && !detailLoading && detail && (
                <div className="card space-y-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-100">{detail.subject}</h2>
                      <p className="text-gray-500 text-sm">
                        {detail.room && `${detail.room} · `}
                        {new Date(detail.started_at).toLocaleDateString("en-IN", {
                          weekday: "long", year: "numeric", month: "long", day: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <button className="btn-secondary flex items-center gap-1.5 text-sm py-1.5"
                        onClick={() => { setEmailModal(true); setEmailMsg(""); setEmailTo(""); }}>
                        <Mail size={14} /> Email
                      </button>
                      <button className="btn-secondary flex items-center gap-1.5 text-sm py-1.5"
                        onClick={() => downloadPdf(detail.id)}>
                        <FileText size={14} /> PDF
                      </button>
                      <button className="btn-primary flex items-center gap-1.5 text-sm py-1.5"
                        onClick={() => downloadExcel(detail.id)}>
                        <FileSpreadsheet size={14} /> Excel
                      </button>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-gray-800 rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-green-400">{detail.attendance.length}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Present</p>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-3 text-center">
                      <Clock size={18} className="text-gray-500 mx-auto mb-1" />
                      <p className="text-xs text-gray-500">
                        {new Date(detail.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        {detail.ended_at && " – " + new Date(detail.ended_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-indigo-400">
                        {detail.attendance.length > 0
                          ? Math.round(detail.attendance.reduce((a, r) => a + r.confidence, 0) / detail.attendance.length)
                          : 0}%
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">Avg. Confidence</p>
                    </div>
                  </div>

                  {/* Attendance table */}
                  <div className="overflow-x-auto rounded-lg border border-gray-800">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-800/60 text-gray-400 text-xs uppercase tracking-wider">
                          <th className="text-left px-4 py-2.5">Name</th>
                          <th className="text-left px-4 py-2.5 hidden sm:table-cell">Enrollment</th>
                          <th className="text-right px-4 py-2.5">Confidence</th>
                          <th className="text-right px-4 py-2.5 hidden md:table-cell">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {detail.attendance.map((r, i) => (
                          <tr key={i} className="hover:bg-gray-800/20">
                            <td className="px-4 py-2.5 font-medium text-gray-200">{r.name}</td>
                            <td className="px-4 py-2.5 text-gray-500 hidden sm:table-cell">{r.enrollment}</td>
                            <td className="px-4 py-2.5 text-right text-gray-400">{r.confidence?.toFixed(1)}%</td>
                            <td className="px-4 py-2.5 text-right text-gray-600 hidden md:table-cell">
                              {new Date(r.marked_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      )}

      {/* ── Chart tab ────────────────────────────────────────────── */}
      {tab === "chart" && (
        chartLoading ? (
          <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-indigo-500" /></div>
        ) : !summary ? null : summary.students.length === 0 ? (
          <div className="card text-center py-14 text-gray-600 text-sm">No student data yet.</div>
        ) : (
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-100">Student-wise Attendance</h2>
                <p className="text-xs text-gray-500 mt-0.5">Based on {summary.total_sessions} completed session(s)</p>
              </div>
              <div className="flex gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-green-400 inline-block" /> ≥75%</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-yellow-400 inline-block" /> 50-74%</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-400 inline-block" /> &lt;50%</span>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={Math.max(300, summary.students.length * 36)}>
              <BarChart data={summary.students} layout="vertical" margin={{ left: 20, right: 40, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`}
                  tick={{ fill: "#9ca3af", fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" width={130}
                  tick={{ fill: "#d1d5db", fontSize: 12 }} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: "rgba(99,102,241,0.08)" }}
                  contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8 }}
                  labelStyle={{ color: "#f3f4f6", fontWeight: 600 }}
                  formatter={(val, _, { payload }) =>
                    [`${val}%  (${payload.present}/${payload.total} sessions)`, "Attendance"]
                  }
                />
                <Bar dataKey="pct" radius={[0, 4, 4, 0]} maxBarSize={22}>
                  {summary.students.map((s) => (
                    <Cell key={s.id} fill={pctColor(s.pct)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Table below chart */}
            <div className="overflow-x-auto rounded-lg border border-gray-800 mt-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-800/60 text-gray-400 text-xs uppercase tracking-wider">
                    <th className="text-left px-4 py-2.5">Name</th>
                    <th className="text-left px-4 py-2.5 hidden sm:table-cell">Enrollment</th>
                    <th className="text-left px-4 py-2.5 hidden md:table-cell">Department</th>
                    <th className="text-right px-4 py-2.5">Sessions</th>
                    <th className="text-right px-4 py-2.5">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {summary.students.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-800/20">
                      <td className="px-4 py-2.5 font-medium text-gray-200">{s.name}</td>
                      <td className="px-4 py-2.5 text-gray-500 hidden sm:table-cell">{s.enrollment}</td>
                      <td className="px-4 py-2.5 text-gray-500 hidden md:table-cell">{s.department || "—"}</td>
                      <td className="px-4 py-2.5 text-right text-gray-400">{s.present}/{s.total}</td>
                      <td className="px-4 py-2.5 text-right font-semibold" style={{ color: pctColor(s.pct) }}>
                        {s.pct}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* Email modal */}
      {emailModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="card w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-100 flex items-center gap-2"><Mail size={16} className="text-indigo-400" /> Send Report</h2>
              <button onClick={() => setEmailModal(false)} className="text-gray-500 hover:text-gray-300"><X size={18} /></button>
            </div>
            <form onSubmit={handleEmail} className="space-y-3">
              <div>
                <label className="label">Recipient Email</label>
                <input className="input" type="email" placeholder="teacher@college.edu"
                  value={emailTo} onChange={(e) => setEmailTo(e.target.value)} required autoFocus />
              </div>
              {emailMsg && (
                <p className={`text-sm px-3 py-2 rounded-lg border ${
                  emailMsg.startsWith("Report sent")
                    ? "text-green-400 bg-green-900/20 border-green-800"
                    : "text-red-400 bg-red-900/20 border-red-800"
                }`}>{emailMsg}</p>
              )}
              <div className="flex gap-3 pt-1">
                <button type="button" className="btn-secondary flex-1" onClick={() => setEmailModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2" disabled={emailSending}>
                  {emailSending ? <><Loader2 size={14} className="animate-spin" /> Sending…</> : <><Send size={14} /> Send</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
