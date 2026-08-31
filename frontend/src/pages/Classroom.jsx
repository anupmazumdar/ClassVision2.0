import React, { useState, useEffect } from "react";
import {
  BookOpen,
  FileText,
  FileCode,
  Calendar,
  Clock,
  Plus,
  Search,
  Download,
  ExternalLink,
  MessageSquare,
  Share2,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Megaphone,
  GraduationCap,
  Sparkles,
  Users,
  ShieldCheck,
  X,
} from "lucide-react";
import { getMaterials, createMaterial, deleteMaterial, getErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { shareToWhatsApp, formatMaterialWhatsAppMessage } from "../utils/whatsapp";

const TYPE_CONFIG = {
  all: { label: "All Hub", icon: BookOpen, color: "text-indigo-400" },
  note: { label: "Study Notes & Docs", icon: BookOpen, color: "text-blue-400", bg: "bg-blue-950/60 border-blue-800" },
  pdf: { label: "PDFs & Materials", icon: FileText, color: "text-amber-400", bg: "bg-amber-950/60 border-amber-800" },
  assignment: { label: "Assignments", icon: FileCode, color: "text-emerald-400", bg: "bg-emerald-950/60 border-emerald-800" },
  test: { label: "Tests & Quizzes", icon: Calendar, color: "text-purple-400", bg: "bg-purple-950/60 border-purple-800" },
  announcement: { label: "Announcements", icon: Megaphone, color: "text-rose-400", bg: "bg-rose-950/60 border-rose-800" },
};

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

export default function Classroom() {
  const { user } = useAuth();
  const toast = useToast();

  const isStudent = user?.role === "student";
  const isTeacherOrAdmin = user?.role === "teacher" || user?.role === "admin";

  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [filterCourse, setFilterCourse] = useState(isStudent ? user?.course || "all" : "all");
  const [filterBranch, setFilterBranch] = useState("all");
  const [filterYear, setFilterYear] = useState("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [posting, setPosting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [form, setForm] = useState({
    title: "",
    material_type: "note",
    subject: "",
    course: "All",
    branch: "All",
    year: "All",
    description: "",
    attachment_url: "",
    attachment_name: "",
    due_date: "",
    total_marks: "",
    whatsapp_group_link: "",
  });

  const load = () => {
    setLoading(true);
    getMaterials()
      .then(setMaterials)
      .catch((err) => toast.error(getErrorMessage(err, "Failed to load materials.")))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  // Compute maximum years based on chosen course filter
  const currentCourseObj = COURSES_CONFIG.find((c) => c.id === filterCourse);
  const maxFilterYears = currentCourseObj ? currentCourseObj.years : 4;

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.subject.trim()) {
      toast.error("Title and Subject are required.");
      return;
    }

    setPosting(true);
    try {
      const payload = {
        ...form,
        total_marks: form.total_marks ? parseInt(form.total_marks) : null,
        due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
      };
      const created = await createMaterial(payload);
      toast.success(`${created.material_type.toUpperCase()} posted successfully!`);
      setModalOpen(false);
      setForm({
        title: "",
        material_type: "note",
        subject: "",
        course: "All",
        branch: "All",
        year: "All",
        description: "",
        attachment_url: "",
        attachment_name: "",
        due_date: "",
        total_marks: "",
        whatsapp_group_link: "",
      });
      load();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to post material."));
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this study material/assignment?")) return;
    setDeletingId(id);
    try {
      await deleteMaterial(id);
      setMaterials((prev) => prev.filter((m) => m.id !== id));
      toast.success("Material deleted.");
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to delete material."));
    } finally {
      setDeletingId(null);
    }
  };

  const handleShareWhatsApp = (mat) => {
    const text = formatMaterialWhatsAppMessage({
      type: mat.material_type,
      title: mat.title,
      subject: mat.subject,
      branch: mat.branch,
      year: mat.year,
      description: mat.description,
      dueDate: mat.due_date,
      totalMarks: mat.total_marks,
      attachmentUrl: mat.attachment_url,
    });
    shareToWhatsApp(text);
  };

  const handleResetFilters = () => {
    setSearch("");
    if (!isStudent) {
      setFilterCourse("all");
    }
    setFilterBranch("all");
    setFilterYear("all");
  };

  const hasActiveFilters = search || (filterCourse !== "all" && !isStudent) || filterBranch !== "all" || filterYear !== "all";

  const filteredMaterials = materials.filter((m) => {
    const matchesTab = activeTab === "all" || m.material_type === activeTab;
    const matchesSearch =
      !search.trim() ||
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.subject.toLowerCase().includes(search.toLowerCase()) ||
      (m.description || "").toLowerCase().includes(search.toLowerCase());

    const matchesCourse =
      filterCourse === "all" || m.course === "All" || m.course.toLowerCase() === filterCourse.toLowerCase();

    const matchesBranch =
      filterBranch === "all" || m.branch === "All" || m.branch.toLowerCase().includes(filterBranch.toLowerCase());

    const matchesYear =
      filterYear === "all" || m.year === "All" || m.year.toLowerCase().includes(filterYear.toLowerCase());

    return matchesTab && matchesSearch && matchesCourse && matchesBranch && matchesYear;
  });

  return (
    <div className="space-y-6">
      {/* Student Designated Banner */}
      {isStudent && (
        <div className="card bg-gradient-to-r from-indigo-950/80 via-purple-950/60 to-gray-900 border-indigo-700/60 p-4 shadow-xl">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-md">
                {user?.name?.charAt(0) || "S"}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-gray-100">{user?.name}</h2>
                  <span className="text-[10px] font-semibold bg-emerald-950 border border-emerald-800 text-emerald-300 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                    <ShieldCheck size={11} /> Device Bound & Verified
                  </span>
                </div>
                <p className="text-xs text-indigo-300 mt-0.5 font-mono">
                  Enrollment: {user?.enrollment} • Course: <strong className="text-white">{user?.course || "BCA"}</strong> • Year {user?.year || 1}
                </p>
              </div>
            </div>
            <div className="text-[11px] text-gray-400 bg-gray-900/80 border border-gray-800 px-3 py-1.5 rounded-lg">
              🔒 Viewing designated materials exclusively for <strong>{user?.course || "BCA"}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2.5">
            <BookOpen className="text-indigo-400" /> Study Materials & Assignments
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">
            Notes, PDFs, Homework Assignments, Test Schedules & 1-Click WhatsApp Broadcasts
          </p>
        </div>

        {isTeacherOrAdmin && (
          <button
            className="btn-primary flex items-center gap-2 shadow-lg shadow-indigo-600/30"
            onClick={() => setModalOpen(true)}
          >
            <Plus size={16} /> Post Material / Assignment
          </button>
        )}
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs sm:text-sm border-b border-gray-800">
        {Object.entries(TYPE_CONFIG).map(([key, config]) => {
          const Icon = config.icon;
          const count =
            key === "all"
              ? materials.length
              : materials.filter((m) => m.material_type === key).length;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-medium transition-all whitespace-nowrap ${
                activeTab === key
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/40"
                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-900"
              }`}
            >
              <Icon size={15} />
              <span>{config.label}</span>
              <span className={`text-[11px] px-1.5 py-0.2 rounded-full ${activeTab === key ? "bg-indigo-700 text-white" : "bg-gray-800 text-gray-400"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Simplified Filter Bar */}
      <div className="card p-3.5 bg-gray-900/90 border-gray-800 space-y-3 shadow-md">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Search */}
          <div className="relative">
            <label htmlFor="material-search" className="sr-only">Search materials</label>
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            <input
              id="material-search"
              className="input pl-8.5 pr-8 text-xs bg-gray-950"
              placeholder="Search notes, tests, assignments…"
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

          {/* Course */}
          <div>
            <select
              className="input bg-gray-950 text-xs font-medium"
              value={filterCourse}
              disabled={isStudent}
              onChange={(e) => {
                const c = e.target.value;
                setFilterCourse(c);
                const cObj = COURSES_CONFIG.find((x) => x.id === c);
                const max = cObj ? cObj.years : 4;
                if (filterYear !== "all" && parseInt(filterYear) > max) {
                  setFilterYear("all");
                }
              }}
            >
              {COURSES_CONFIG.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Branch */}
          <div>
            <select
              className="input bg-gray-950 text-xs"
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
            >
              <option value="all">All Branches</option>
              <option value="Computer Science">CSE (All branches)</option>
              <option value="AI">CSE (AI & ML)</option>
              <option value="Data Science">CSE (Data Science)</option>
              <option value="Information Technology">IT</option>
              <option value="Electronics">ECE</option>
              <option value="Electrical">EE</option>
              <option value="Mechanical">ME</option>
              <option value="Civil">CE</option>
              <option value="Biotechnology">Biotechnology</option>
            </select>
          </div>

          {/* Adaptive Year */}
          <div className="flex items-center gap-2">
            <select
              className="input bg-gray-950 text-xs flex-1"
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
            >
              <option value="all">All Academic Years</option>
              {Array.from({ length: maxFilterYears }, (_, i) => i + 1).map((y) => (
                <option key={y} value={`${y}${y === 1 ? "st" : y === 2 ? "nd" : y === 3 ? "rd" : "th"} Year`}>
                  {y}{y === 1 ? "st" : y === 2 ? "nd" : y === 3 ? "rd" : "th"} Year
                </option>
              ))}
            </select>

            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="btn-secondary text-xs px-2.5 py-2 text-gray-400 hover:text-red-400 border-gray-700 hover:border-red-800/80 shrink-0"
                title="Reset filters"
              >
                <X size={14} className="inline mr-1" /> Clear
              </button>
            )}
          </div>
        </div>

        {/* Filter info */}
        <div className="flex items-center justify-between text-[11px] text-gray-400 pt-0.5 border-t border-gray-800/60">
          <span>
            Showing <strong className="text-indigo-400">{filteredMaterials.length}</strong> of <strong>{materials.length}</strong> materials
          </span>
          {isStudent && (
            <span className="text-emerald-400 font-medium">
              🔒 Filtered for {user?.course || "Your Program"}
            </span>
          )}
        </div>
      </div>

      {/* Materials Feed */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={32} className="animate-spin text-indigo-500" />
        </div>
      ) : filteredMaterials.length === 0 ? (
        <div className="card text-center py-16 text-gray-500 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-gray-900 flex items-center justify-center mx-auto text-gray-600">
            <BookOpen size={24} />
          </div>
          <p className="text-sm">
            {hasActiveFilters ? "No materials match your filter criteria." : "No study materials or assignments found for your program."}
          </p>
          {hasActiveFilters ? (
            <button className="btn-secondary text-xs text-indigo-400 border-indigo-800" onClick={handleResetFilters}>
              Reset Filters
            </button>
          ) : isTeacherOrAdmin && (
            <button className="btn-secondary text-xs" onClick={() => setModalOpen(true)}>
              + Post First Material
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMaterials.map((m) => {
            const config = TYPE_CONFIG[m.material_type] || TYPE_CONFIG.note;
            const Icon = config.icon;
            return (
              <div
                key={m.id}
                className="card border-gray-800 bg-gray-900/80 hover:border-gray-700 transition-all flex flex-col justify-between space-y-4 p-5 shadow-lg"
              >
                <div className="space-y-3">
                  {/* Top Bar */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${config.bg || "bg-gray-800 border-gray-700 text-gray-300"}`}>
                        <Icon size={12} className="inline mr-1" />
                        {m.material_type}
                      </span>
                      <span className="text-xs text-indigo-400 font-medium bg-indigo-950/60 border border-indigo-800/60 px-2 py-0.5 rounded-full">
                        {m.subject}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* WhatsApp Share Button */}
                      <button
                        onClick={() => handleShareWhatsApp(m)}
                        className="text-green-400 hover:text-green-300 bg-green-950/50 border border-green-800/60 hover:bg-green-900/40 p-1.5 rounded-lg transition-colors"
                        title="Share to Class WhatsApp Group"
                        aria-label="Share to WhatsApp"
                      >
                        <Share2 size={14} />
                      </button>

                      {/* Delete button (Teacher/Admin only) */}
                      {isTeacherOrAdmin && (
                        <button
                          onClick={() => handleDelete(m.id, m.title)}
                          disabled={deletingId === m.id}
                          className="text-gray-500 hover:text-red-400 p-1.5 rounded-lg transition-colors"
                          title="Delete"
                          aria-label="Delete material"
                        >
                          {deletingId === m.id ? (
                            <Loader2 size={14} className="animate-spin text-red-400" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-base font-bold text-gray-100">{m.title}</h3>
                    {m.description && (
                      <p className="text-gray-400 text-xs mt-1.5 whitespace-pre-line line-clamp-3 leading-relaxed">
                        {m.description}
                      </p>
                    )}
                  </div>

                  {/* Metadata Chips: Due Date & Marks */}
                  <div className="flex flex-wrap gap-2 text-[11px] pt-1">
                    {m.due_date && (
                      <span className="inline-flex items-center gap-1 bg-amber-950/60 text-amber-300 border border-amber-800/80 px-2.5 py-0.5 rounded-full font-medium">
                        <Clock size={11} /> Due: {new Date(m.due_date).toLocaleDateString()} {new Date(m.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                    {m.total_marks && (
                      <span className="inline-flex items-center gap-1 bg-emerald-950/60 text-emerald-300 border border-emerald-800/80 px-2.5 py-0.5 rounded-full font-medium">
                        💯 Marks: {m.total_marks}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
                      {m.course || "All Courses"} • {m.branch || "All Branches"} • {m.year || "All Years"}
                    </span>
                  </div>
                </div>

                {/* Footer Bar */}
                <div className="pt-3 border-t border-gray-800/80 flex items-center justify-between gap-2 text-xs text-gray-500">
                  <span>By {m.teacher_name}</span>

                  <div className="flex items-center gap-2">
                    {m.attachment_url && (
                      <a
                        href={m.attachment_url}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1 text-indigo-300 border-indigo-800/60 hover:bg-indigo-950/50"
                      >
                        <Download size={12} /> {m.attachment_name || "Download / View PDF"}
                      </a>
                    )}
                    {m.whatsapp_group_link && (
                      <a
                        href={m.whatsapp_group_link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1 font-medium bg-green-950/40 border border-green-800/50 px-2 py-1 rounded-lg"
                      >
                        <MessageSquare size={12} /> Join WhatsApp Group
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* POST MATERIAL MODAL (Teachers/Admins only) */}
      {modalOpen && isTeacherOrAdmin && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center p-3 sm:p-6 overflow-y-auto">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="post-material-title"
            className="card w-full max-w-xl bg-gray-900 border-gray-800 shadow-2xl p-5 sm:p-6 my-auto max-h-[90vh] flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-gray-800 pb-3 shrink-0">
              <h2 id="post-material-title" className="text-lg font-bold text-gray-100 flex items-center gap-2">
                <Sparkles size={18} className="text-indigo-400" /> Post New Material / Assignment
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-white p-1"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="overflow-y-auto pr-1.5 space-y-4 text-xs sm:text-sm flex-1 pt-2">
              {/* Type Picker */}
              <div>
                <label className="label">Material Category *</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { key: "note", label: "📚 Study Notes", desc: "Notes & Lectures" },
                    { key: "pdf", label: "📄 PDF / Document", desc: "Syllabus / Reference" },
                    { key: "assignment", label: "📝 Assignment", desc: "Homework / Due Date" },
                    { key: "test", label: "🧪 Test / Quiz", desc: "Exam Schedule & Marks" },
                    { key: "announcement", label: "📢 Announcement", desc: "Class Notice" },
                  ].map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setForm({ ...form, material_type: t.key })}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        form.material_type === t.key
                          ? "bg-indigo-600/30 border-indigo-500 text-white shadow"
                          : "bg-gray-950/60 border-gray-800 text-gray-400 hover:text-gray-200"
                      }`}
                    >
                      <div className="font-semibold text-xs text-gray-200">{t.label}</div>
                      <div className="text-[10px] text-gray-500">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title & Subject */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="mat-title" className="label">Material / Assignment Title *</label>
                  <input
                    id="mat-title"
                    className="input bg-gray-950"
                    placeholder="e.g. Unit 3 - Tree Traversals Notes"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="mat-subject" className="label">Subject *</label>
                  <input
                    id="mat-subject"
                    className="input bg-gray-950"
                    placeholder="e.g. Data Structures & Algorithms"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Course, Branch, Year Targeting */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="mat-course" className="label">Course Target</label>
                  <select
                    id="mat-course"
                    className="input bg-gray-950 text-xs"
                    value={form.course}
                    onChange={(e) => {
                      const c = e.target.value;
                      let max = 4;
                      if (["M.Tech", "MCA", "MBA"].includes(c)) max = 2;
                      else if (["BCA", "BBA", "Diploma"].includes(c)) max = 3;
                      setForm({ ...form, course: c, year: "All" });
                    }}
                  >
                    <option value="All">All Courses</option>
                    <option value="B.Tech">B.Tech (4 Years)</option>
                    <option value="BCA">BCA (3 Years)</option>
                    <option value="BBA">BBA (3 Years)</option>
                    <option value="Diploma">Diploma (3 Years)</option>
                    <option value="MCA">MCA (2 Years)</option>
                    <option value="MBA">MBA (2 Years)</option>
                    <option value="M.Tech">M.Tech (2 Years)</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="mat-branch" className="label">Branch Target</label>
                  <select
                    id="mat-branch"
                    className="input bg-gray-950 text-xs"
                    value={form.branch}
                    onChange={(e) => setForm({ ...form, branch: e.target.value })}
                  >
                    <option value="All">All Branches</option>
                    <option value="Computer Science & Engineering (CSE)">CSE</option>
                    <option value="CSE (AI & Machine Learning)">CSE (AI/ML)</option>
                    <option value="CSE (Data Science)">CSE (Data Science)</option>
                    <option value="Information Technology (IT)">IT</option>
                    <option value="Electronics & Communication (ECE)">ECE</option>
                    <option value="Electrical Engineering (EE)">EE</option>
                    <option value="Mechanical Engineering (ME)">ME</option>
                    <option value="Civil Engineering (CE)">CE</option>
                    <option value="Biotechnology">Biotechnology</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="mat-year" className="label">Academic Year Target</label>
                  <select
                    id="mat-year"
                    className="input bg-gray-950 text-xs"
                    value={form.year}
                    onChange={(e) => setForm({ ...form, year: e.target.value })}
                  >
                    <option value="All">All Years</option>
                    {(() => {
                      let max = 4;
                      if (["M.Tech", "MCA", "MBA"].includes(form.course)) max = 2;
                      else if (["BCA", "BBA", "Diploma"].includes(form.course)) max = 3;
                      return Array.from({ length: max }, (_, i) => i + 1).map((y) => (
                        <option key={y} value={`${y}${y === 1 ? "st" : y === 2 ? "nd" : y === 3 ? "rd" : "th"} Year`}>
                          {y}{y === 1 ? "st" : y === 2 ? "nd" : y === 3 ? "rd" : "th"} Year
                        </option>
                      ));
                    })()}
                  </select>
                </div>
              </div>

              {/* Description / Content */}
              <div>
                <label htmlFor="mat-desc" className="label">Instructions / Content Notes</label>
                <textarea
                  id="mat-desc"
                  rows={3}
                  className="input bg-gray-950 font-sans text-xs sm:text-sm"
                  placeholder="Enter details, syllabus guidelines, homework instructions, or reading material overview…"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              {/* Attachment Link & Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="mat-url" className="label">Attachment / Google Drive PDF Link</label>
                  <input
                    id="mat-url"
                    type="url"
                    className="input bg-gray-950 font-mono text-xs"
                    placeholder="https://drive.google.com/file/... or PDF URL"
                    value={form.attachment_url}
                    onChange={(e) => setForm({ ...form, attachment_url: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="mat-filename" className="label">File Display Name</label>
                  <input
                    id="mat-filename"
                    className="input bg-gray-950 text-xs"
                    placeholder="e.g. Trees_Handout_Unit3.pdf"
                    value={form.attachment_name}
                    onChange={(e) => setForm({ ...form, attachment_name: e.target.value })}
                  />
                </div>
              </div>

              {/* Assignment / Test specifics */}
              {(form.material_type === "assignment" || form.material_type === "test") && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-gray-950/80 rounded-xl border border-gray-800">
                  <div>
                    <label htmlFor="mat-due" className="label">
                      {form.material_type === "test" ? "Test Date & Time" : "Submission Due Date"}
                    </label>
                    <input
                      id="mat-due"
                      type="datetime-local"
                      className="input bg-gray-900 text-xs"
                      value={form.due_date}
                      onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label htmlFor="mat-marks" className="label">Total Marks (Optional)</label>
                    <input
                      id="mat-marks"
                      type="number"
                      min={0}
                      className="input bg-gray-900 text-xs"
                      placeholder="e.g. 20 or 100"
                      value={form.total_marks}
                      onChange={(e) => setForm({ ...form, total_marks: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* Class WhatsApp Group Link */}
              <div>
                <label htmlFor="mat-wa" className="label flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-green-400">
                    <MessageSquare size={13} /> Class WhatsApp Group Invite Link (Optional)
                  </span>
                  <span className="text-[10px] text-gray-500">Auto-attach for students</span>
                </label>
                <input
                  id="mat-wa"
                  type="url"
                  className="input bg-gray-950 font-mono text-xs"
                  placeholder="https://chat.whatsapp.com/..."
                  value={form.whatsapp_group_link}
                  onChange={(e) => setForm({ ...form, whatsapp_group_link: e.target.value })}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-3 shrink-0 border-t border-gray-800/80 mt-2">
                <button
                  type="button"
                  className="btn-secondary flex-1"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={posting}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {posting ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Posting Material…</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={15} />
                      <span>Publish & Broadcast</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
