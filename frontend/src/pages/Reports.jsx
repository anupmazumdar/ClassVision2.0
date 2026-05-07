import React, { useState, useEffect } from "react";
import { Download, Loader2, FileSpreadsheet, Clock, Users } from "lucide-react";
import { getSessions, getSession, downloadExcel } from "../api";

export default function Reports() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    getSessions()
      .then((s) => setSessions(s.filter((x) => !x.is_active)))
      .finally(() => setLoading(false));
  }, []);

  const loadDetail = async (id) => {
    setSelected(id);
    setDetailLoading(true);
    try {
      const d = await getSession(id);
      setDetail(d);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Reports</h1>
        <p className="text-gray-500 text-sm mt-0.5">Download attendance reports for completed sessions.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="animate-spin text-indigo-500" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="card text-center py-14 text-gray-600 text-sm">
          No completed sessions yet.
        </div>
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
              <div className="card text-center py-16 text-gray-600 text-sm">
                Select a session to preview
              </div>
            )}

            {selected && detailLoading && (
              <div className="flex justify-center py-16">
                <Loader2 size={24} className="animate-spin text-indigo-500" />
              </div>
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
                  <button
                    className="btn-primary flex items-center gap-2"
                    onClick={() => downloadExcel(detail.id)}
                  >
                    <FileSpreadsheet size={15} /> Download Excel
                  </button>
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

                {/* Attendance list */}
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
      )}
    </div>
  );
}
