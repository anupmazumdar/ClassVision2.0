import React, { useEffect, useState } from "react";
import { Clock, RefreshCw, ShieldAlert } from "lucide-react";

/**
 * Reusable Rate-Limit Cooldown Countdown Component
 * Shown when an API returns HTTP 429 to give users a transparent, animated visual countdown.
 */
export default function RateLimitCooldown({
  cooldownSeconds = 60,
  onRetry,
  title = "Rate Limit Enforced",
  description = "Too many requests detected. Security cooldown is active to protect server resources.",
}) {
  const [remaining, setRemaining] = useState(cooldownSeconds);

  useEffect(() => {
    setRemaining(cooldownSeconds);
    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  const percentage = Math.max(0, Math.min(100, (remaining / cooldownSeconds) * 100));

  return (
    <div
      role="alert"
      aria-live="polite"
      className="p-4 bg-amber-950/70 border border-amber-800/80 rounded-2xl text-amber-200 text-sm shadow-xl space-y-3 animate-fade-in"
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
          <ShieldAlert size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-semibold text-amber-300 text-sm">{title}</h4>
            <span className="font-mono text-xs font-bold text-amber-400 bg-amber-900/60 px-2 py-0.5 rounded-full border border-amber-700/60">
              {remaining > 0 ? `${remaining}s cooldown` : "Ready"}
            </span>
          </div>
          <p className="text-xs text-amber-300/80 mt-1 leading-relaxed">{description}</p>
        </div>
      </div>

      {/* Visual Countdown Progress Bar */}
      <div className="w-full bg-gray-900/90 h-2 rounded-full overflow-hidden border border-amber-900/40">
        <div
          className="bg-gradient-to-r from-amber-500 to-amber-300 h-full transition-all duration-1000 ease-linear rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Action button */}
      {remaining === 0 && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="btn-primary w-full py-2 text-xs flex items-center justify-center gap-1.5 shadow-md"
          aria-label="Retry action after rate limit cooldown"
        >
          <RefreshCw size={13} /> Retry Now
        </button>
      )}
    </div>
  );
}
