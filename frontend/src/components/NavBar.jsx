import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard, Users, Video, FileText,
  LogOut, Menu, X, GraduationCap, UserCog, BookOpen,
  Contrast,
} from "lucide-react";

const baseLinks = [
  { to: "/",          label: "Dashboard",  icon: LayoutDashboard },
  { to: "/students",  label: "Students",   icon: Users },
  { to: "/classroom", label: "Classroom",  icon: BookOpen },
  { to: "/reports",   label: "Reports",    icon: FileText },
];

export default function NavBar() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [highContrast, setHighContrast] = useState(() => {
    return localStorage.getItem("cv_high_contrast") === "true";
  });

  useEffect(() => {
    if (highContrast) {
      document.documentElement.classList.add("high-contrast");
    } else {
      document.documentElement.classList.remove("high-contrast");
    }
    localStorage.setItem("cv_high_contrast", highContrast.toString());
  }, [highContrast]);

  const links = user?.role === "admin"
    ? [...baseLinks, { to: "/users", label: "Users", icon: UserCog }]
    : baseLinks;

  const handleSignOut = () => {
    signOut();
    navigate("/login");
  };

  return (
    <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-40" role="banner">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
        {/* Logo */}
        <Link to="/" aria-label="ClassVision Homepage" className="flex items-center gap-2.5 font-bold text-gray-100 text-lg group">
          <img
            src="/uem_logo.jpg"
            alt="UEM Logo"
            className="w-8 h-8 rounded-lg object-contain bg-white/95 p-0.5 shadow-sm border border-gray-700"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
          <span className="bg-gradient-to-r from-indigo-400 to-indigo-200 bg-clip-text text-transparent group-hover:from-indigo-300 group-hover:to-white transition-colors">
            UEM ClassVision
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Main Navigation">
          {links.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              aria-current={location.pathname === to ? "page" : undefined}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === to
                  ? "bg-indigo-600 text-white"
                  : "text-gray-400 hover:text-gray-100 hover:bg-gray-800"
              }`}
            >
              <Icon size={15} aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="hidden md:flex items-center gap-3">
          {/* Wall Kiosk High Contrast Toggle */}
          <button
            type="button"
            onClick={() => setHighContrast((prev) => !prev)}
            title="Toggle High-Contrast Wall Kiosk Display Mode"
            aria-label="Toggle High-Contrast Wall Kiosk Display Mode"
            aria-pressed={highContrast}
            className={`p-1.5 rounded-lg border transition-colors flex items-center gap-1 text-xs font-medium ${
              highContrast
                ? "bg-amber-400 text-black border-amber-300 shadow-sm"
                : "bg-gray-800 text-gray-400 hover:text-white border-gray-700"
            }`}
          >
            <Contrast size={14} aria-hidden="true" />
            <span className="text-[11px] font-semibold">{highContrast ? "Kiosk Contrast: ON" : "Kiosk Contrast"}</span>
          </button>

          <span className="text-xs text-gray-500">{user?.name}</span>
          <button
            onClick={handleSignOut}
            aria-label="Sign out of ClassVision"
            className="btn-secondary text-sm py-1.5 flex items-center gap-1.5"
          >
            <LogOut size={14} aria-hidden="true" /> Sign out
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-gray-400 hover:text-gray-100"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={open}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden bg-gray-900 border-t border-gray-800 px-4 py-3 space-y-1">
          {links.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === to
                  ? "bg-indigo-600 text-white"
                  : "text-gray-400 hover:text-gray-100 hover:bg-gray-800"
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
          <div className="pt-2 border-t border-gray-800 flex items-center justify-between">
            <span className="text-xs text-gray-500">{user?.name}</span>
            <button
              onClick={handleSignOut}
              aria-label="Sign out of ClassVision"
              className="text-sm text-red-400 flex items-center gap-1"
            >
              <LogOut size={14} /> Sign out
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
