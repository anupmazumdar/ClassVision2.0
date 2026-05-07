import React from "react";
import { CheckCircle, Clock } from "lucide-react";

export default function AttendanceTable({ records = [], allStudents = [], showAll = false }) {
  const presentIds = new Set(records.map((r) => r.student_id));

  const rows = showAll
    ? allStudents.map((s) => ({
        ...s,
        present: presentIds.has(s.id),
        confidence: records.find((r) => r.student_id === s.id)?.confidence ?? null,
        marked_at: records.find((r) => r.student_id === s.id)?.marked_at ?? null,
      }))
    : records.map((r) => ({ ...r, present: true }));

  if (!rows.length) {
    return (
      <div className="text-center text-gray-600 py-10 text-sm">
        No records yet
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-800/60 text-gray-400 text-xs uppercase tracking-wider">
            <th className="text-left px-4 py-2.5">Name</th>
            <th className="text-left px-4 py-2.5 hidden sm:table-cell">Enrollment</th>
            <th className="text-left px-4 py-2.5 hidden md:table-cell">Dept.</th>
            <th className="text-center px-4 py-2.5">Status</th>
            <th className="text-right px-4 py-2.5 hidden sm:table-cell">Confidence</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {rows.map((r, i) => (
            <tr key={r.student_id ?? r.id ?? i} className="hover:bg-gray-800/30 transition-colors">
              <td className="px-4 py-2.5 font-medium text-gray-100">{r.name}</td>
              <td className="px-4 py-2.5 text-gray-400 hidden sm:table-cell">{r.enrollment}</td>
              <td className="px-4 py-2.5 text-gray-500 hidden md:table-cell">{r.department || "—"}</td>
              <td className="px-4 py-2.5 text-center">
                {r.present ? (
                  <span className="badge-green"><CheckCircle size={11} /> Present</span>
                ) : (
                  <span className="badge-red">Absent</span>
                )}
              </td>
              <td className="px-4 py-2.5 text-right text-gray-500 hidden sm:table-cell">
                {r.confidence != null ? `${r.confidence}%` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
