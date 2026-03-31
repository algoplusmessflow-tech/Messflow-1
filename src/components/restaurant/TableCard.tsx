// src/components/restaurant/TableCard.tsx
import React from "react";
import { Lock, LockOpen, AlertCircle, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useTableLockStatus,
  useLockTableMutation,
  useReleaseLockMutation,
  useLockCountdown,
} from "@/hooks/useTableLocks";

interface TableCardProps {
  tableId: string;
  tableNumber: number;
  capacity: number;
  venueId: string;
  status?: "available" | "occupied" | "maintenance";
  onSelect?: (tableId: string) => void;
  onLocked?: (lock: any) => void;
}

export const TableCard: React.FC<TableCardProps> = ({
  tableId,
  tableNumber,
  capacity,
  venueId,
  status = "available",
  onSelect,
  onLocked,
}) => {
  const { data: lockStatus, isLoading: lockLoading } = useTableLockStatus(
    tableId,
    venueId,
    1000
  );

  const { mutate: acquireLock, isPending: isLocking } = useLockTableMutation(
    venueId
  );

  const { mutate: releaseLock, isPending: isReleasing } =
    useReleaseLockMutation(venueId);

  const remaining = useLockCountdown(lockStatus?.expires_at || null);

  const isLocked = lockStatus?.locked;
  const userId = localStorage.getItem("user_id");
  const isMyLock = lockStatus?.locked_by === userId;
  const isOtherUserLock = isLocked && !isMyLock;
  const canBook = status === "available" && !isLocked;

  const handleLock = () => {
    acquireLock(tableId, {
      onSuccess: (lock) => {
        onSelect?.(tableId);
        onLocked?.(lock);
      },
    });
  };

  const handleRelease = () => {
    releaseLock(tableId);
  };

  return (
    <div
      className={`
        relative p-4 rounded-lg border-2 transition-all cursor-pointer
        ${
          isMyLock
            ? "border-amber-400 bg-amber-50 dark:bg-amber-950 dark:border-amber-600"
            : isOtherUserLock
            ? "border-red-300 bg-red-50 dark:bg-red-950 opacity-60 cursor-not-allowed"
            : canBook
            ? "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 hover:border-blue-400 hover:shadow-md"
            : "border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 opacity-75 cursor-not-allowed"
        }
      `}
      onClick={() => canBook && !isMyLock && handleLock()}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Table {tableNumber}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {capacity} seats
          </p>
        </div>

        <div
          className={`
            px-2 py-1 rounded-full text-xs font-semibold
            ${
              isMyLock
                ? "bg-amber-200 text-amber-800 dark:bg-amber-700 dark:text-amber-100"
                : isOtherUserLock
                ? "bg-red-200 text-red-800 dark:bg-red-700 dark:text-red-100"
                : canBook
                ? "bg-green-200 text-green-800 dark:bg-green-700 dark:text-green-100"
                : "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-100"
            }
          `}
        >
          {isMyLock ? (
            <div className="flex items-center gap-1">
              <Lock size={12} />
              My Lock
            </div>
          ) : isOtherUserLock ? (
            <div className="flex items-center gap-1">
              <Lock size={12} />
              Locked
            </div>
          ) : canBook ? (
            "Available"
          ) : (
            "Unavailable"
          )}
        </div>
      </div>

      {isMyLock && lockStatus?.expires_at && (
        <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700">
          <div className="w-1.5 h-1.5 rounded-full animate-pulse bg-amber-500" />
          <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
            {remaining}s remaining
          </span>
        </div>
      )}

      {isOtherUserLock && (
        <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 mb-3">
          <AlertCircle size={14} />
          Locked by another user
        </div>
      )}

      <Button
        variant={isMyLock ? "destructive" : "default"}
        size="sm"
        className="w-full"
        onClick={(e) => {
          e.stopPropagation();
          if (isMyLock) {
            handleRelease();
          } else {
            handleLock();
          }
        }}
        disabled={
          isOtherUserLock || isLocking || isReleasing || lockLoading
        }
      >
        {isMyLock ? (
          <div className="flex items-center gap-2">
            {isReleasing ? <Loader size={16} className="animate-spin" /> : <LockOpen size={16} />}
            Cancel Lock
          </div>
        ) : isOtherUserLock ? (
          "Unavailable"
        ) : isLocking ? (
          <div className="flex items-center gap-2">
            <Loader size={16} className="animate-spin" />
            Locking...
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Lock size={16} />
            Lock Table
          </div>
        )}
      </Button>
    </div>
  );
};

export default TableCard;
