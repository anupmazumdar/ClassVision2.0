/**
 * WhatsApp Integration Utilities for ClassVision 2.0
 */

export const shareToWhatsApp = (text, phone = "") => {
  const encoded = encodeURIComponent(text);
  const cleanPhone = phone ? phone.replace(/\D/g, "") : "";
  const url = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;
  window.open(url, "_blank", "noopener,noreferrer");
};

export const formatAttendanceWhatsAppMessage = ({
  subject,
  room,
  presentCount,
  totalCount,
  date,
  reportUrl = window.location.origin + "/reports",
}) => {
  const percentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
  return `📊 *UEM ClassVision — Attendance Summary*
━━━━━━━━━━━━━━━━━━━━
📚 *Subject:* ${subject || "Class Lecture"}
🏫 *Room:* ${room || "Main Hall"}
📅 *Date & Time:* ${date || new Date().toLocaleString()}
👥 *Attendance:* ${presentCount}/${totalCount} Present (${percentage}%)
━━━━━━━━━━━━━━━━━━━━
🔗 *View Detailed Attendance:* ${reportUrl}`;
};

export const formatLiveSessionWhatsAppMessage = ({
  subject,
  room,
  code,
  checkinUrl = window.location.origin + "/checkin",
}) => {
  return `🎯 *UEM ClassVision — Live Attendance Alert*
━━━━━━━━━━━━━━━━━━━━
📚 *Subject:* ${subject || "Lecture"} (${room || "Room"})
🔑 *6-Digit Code:* *${code}* (Rotates every 30s)
📍 *Geofence Notice:* 100m Classroom Boundary Active
━━━━━━━━━━━━━━━━━━━━
👉 *Self Check-in Now on Phone:* ${checkinUrl}`;
};

export const formatMaterialWhatsAppMessage = ({
  type,
  title,
  subject,
  branch,
  year,
  description,
  dueDate,
  totalMarks,
  attachmentUrl,
  classroomUrl = window.location.origin + "/classroom",
}) => {
  const typeIcons = {
    note: "📚 *Study Material / Lecture Notes*",
    pdf: "📄 *PDF / Reference Document*",
    assignment: "📝 *New Assignment Posted*",
    test: "🧪 *Class Test / Quiz Scheduled*",
    announcement: "📢 *Class Announcement*",
  };

  const header = typeIcons[type] || "📚 *Class Material Update*";
  let msg = `${header}\n━━━━━━━━━━━━━━━━━━━━\n📌 *Title:* ${title}\n📚 *Subject:* ${subject}\n🎯 *Target:* ${branch || "All Branches"} (${year || "All Years"})`;

  if (dueDate) {
    msg += `\n⏰ *Due Date / Test Date:* ${new Date(dueDate).toLocaleString()}`;
  }
  if (totalMarks) {
    msg += `\n💯 *Total Marks:* ${totalMarks}`;
  }
  if (description) {
    msg += `\n\n📖 *Details:*\n${description.slice(0, 300)}${description.length > 300 ? "…" : ""}`;
  }
  if (attachmentUrl) {
    msg += `\n\n📥 *Download Attachment:* ${attachmentUrl}`;
  }
  msg += `\n━━━━━━━━━━━━━━━━━━━━\n🌐 *Open Classroom Hub:* ${classroomUrl}`;
  return msg;
};
