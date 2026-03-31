// src/components/restaurant/LockCountdown.tsx
import React from "react";
import { Clock, AlertTriangle } from "lucide-react";

interface LockCountdownProps {
  expiresAt: Date;
  remainingSeconds: number;
  onExpired?: () => void;
  compact?: boolean;
}

export const LockCountdown: React.FC<LockCountdownProps> = ({
  expiresAt,
  remainingSeconds,
  onExpired,
  compact = false,
}) => {
  const isWarning = remainingSeconds < 10;
  const isExpired = remainingSeconds === 0;

  React.useEffect(() => {
    if (isExpired && onExpired) {
      onExpired();
    }
  }, [isExpired, onExpired]);

  if (compact) {
    return (
      <div
        className={`
          inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
          ${
            isWarning
              ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200"
              : "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200"
          }
        `}
      >
        <div
          className={`w-1.5 h-1.5 rounded-full animate-pulse ${
            isWarning ? "bg-red-500" : "bg-amber-500"
          }`}
        />
        <span>{remainingSeconds}s</span>
      </div>
    );
  }

  return (
    <div
      className={`
        flex items-center gap-3 px-3 py-2 rounded-lg border
        ${
          isWarning
            ? "border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20"
            : "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20"
        }
      `}
    >
      {isWarning ? (
        <AlertTriangle
          size={18}
          className="text-red-600 dark:text-red-400 flex-shrink-0"
        />
      ) : (
        <Clock
          size={18}
          className="text-amber-600 dark:text-amber-400 flex-shrink-0 animate-pulse"
        />
      )}

      <div className="flex-1">
        <p
          className={`text-sm font-semibold ${
            isWarning
              ? "text-red-700 dark:text-red-300"
              : "text-amber-700 dark:text-amber-300"
          }`}
        >
          {remainingSeconds === 0 ? (
            "Lock Expired"
          ) : isWarning ? (
            <span className="animate-pulse">
              Hurry! Lock expires in {remainingSeconds}s
            </span>
          ) : (
            `Lock expires in ${remainingSeconds}s`
          )}
        </p>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
          Complete your reservation before lock expires
        </p>
      </div>
    </div>
  );
};

export default LockCountdown;
