import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../App";
import {
  LayoutDashboard, Users, Video, FileText,
  LogOut, Menu, X, GraduationCap,
} from "lucide-react";

const links = [
  { to: "/",         label: "Dashboard", icon: LayoutDashboard },
  { to: "/students", label: "Students",  icon: Users },
  { to: "/reports",  label: "Reports",   icon: FileText },
];

export default function NavBar() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleSignOut = () => {
    signOut();
    navigate("/login");
  };

  return (
    <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 font-bold text-indigo-400 text-lg">
          <GraduationCap size={22} />
          ClassVision
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {links.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === to
                  ? "bg-indigo-600 text-white"
                  : "text-gray-400 hover:text-gray-100 hover:bg-gray-800"
              }`}
            >
              <Icon size={15} />
              {label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="hidden md:flex items-center gap-3">
          <span className="text-xs text-gray-500">{user?.name}</span>
          <button onClick={handleSignOut} className="btn-secondary text-sm py-1.5 flex items-center gap-1.5">
            <LogOut size={14} /> Sign out
          </button>
        </div>

        {/* Mobile hamburger */}
        <button className="md:hidden text-gray-400 hover:text-gray-100" onClick={() => setOpen(!open)}>
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
            <button onClick={handleSignOut} className="text-sm text-red-400 flex items-center gap-1">
              <LogOut size={14} /> Sign out
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
