import React, { useState } from "react";
import { Download, Smartphone, X } from "lucide-react";
import { usePWAInstall } from "../hooks/usePWAInstall";

export default function InstallPrompt() {
  const { isInstallable, promptInstall } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);

  if (!isInstallable || dismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-md bg-gray-900/95 border border-indigo-500/60 backdrop-blur-md p-3.5 rounded-2xl shadow-2xl z-50 flex items-center justify-between gap-3 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-300 shrink-0">
          <Smartphone size={20} />
        </div>
        <div>
          <div className="text-xs font-semibold text-white">Install ClassVision Mobile App</div>
          <div className="text-[11px] text-gray-400">1-tap biometric check-in & offline ready</div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={promptInstall}
          className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1 shadow-lg shadow-indigo-600/30"
        >
          <Download size={12} /> Install
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="text-gray-500 hover:text-gray-300 p-1.5"
          title="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
