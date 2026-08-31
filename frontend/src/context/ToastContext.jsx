import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

const ToastContext = createContext(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "info", duration = 4000) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (msg, duration) => addToast(msg, "success", duration),
    error: (msg, duration) => addToast(msg, "error", duration),
    info: (msg, duration) => addToast(msg, "info", duration),
    warning: (msg, duration) => addToast(msg, "warning", duration),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast Notification Container */}
      <aside
        aria-label="Notifications"
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((t) => {
          let bgClass = "bg-gray-900 border-gray-700 text-gray-100";
          let Icon = Info;
          let iconColor = "text-blue-400";

          if (t.type === "success") {
            bgClass = "bg-green-950/90 border-green-700/80 text-green-100";
            Icon = CheckCircle;
            iconColor = "text-green-400";
          } else if (t.type === "error") {
            bgClass = "bg-red-950/90 border-red-700/80 text-red-100";
            Icon = AlertCircle;
            iconColor = "text-red-400";
          } else if (t.type === "warning") {
            bgClass = "bg-amber-950/90 border-amber-700/80 text-amber-100";
            Icon = AlertTriangle;
            iconColor = "text-amber-400";
          }

          return (
            <div
              key={t.id}
              role="alert"
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-xl backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${bgClass}`}
            >
              <Icon size={18} className={`shrink-0 mt-0.5 ${iconColor}`} />
              <p className="text-sm font-medium flex-1 break-words leading-snug">{t.message}</p>
              <button
                onClick={() => removeToast(t.id)}
                aria-label="Dismiss notification"
                className="text-gray-400 hover:text-white transition-colors p-0.5 rounded-md hover:bg-white/10"
              >
                <X size={15} />
              </button>
            </div>
          );
        })}
      </aside>
    </ToastContext.Provider>
  );
}
