// src/hooks/useTableLocks.ts
import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import TableLockService, { LockStatus, TableLock } from "@/services/tableLockService";

export const useTableLockStatus = (
  tableId: string | null,
  venueId: string | null,
  refetchInterval: number = 2000
) => {
  return useQuery({
    queryKey: ["tableLock", tableId, venueId],
    queryFn: () => TableLockService.checkLockStatus(tableId!, venueId!),
    refetchInterval: refetchInterval,
    staleTime: 100,
    gcTime: 300,
    enabled: !!tableId && !!venueId,
  });
};

export const useLockTableMutation = (venueId: string | null) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tableId: string) => {
      return await TableLockService.lockTableWithRetry(tableId, venueId!, 3, 100);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tableLock"] });
      queryClient.setQueryData(
        ["tableLock", data.table_id, venueId],
        {
          locked: true,
          lock_id: data.lock_id,
          locked_by: data.locked_by,
          expires_at: data.expires_at,
          remaining_seconds: 30,
        } as LockStatus
      );
    },
  });
};

export const useReleaseLockMutation = (venueId: string | null) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tableId: string) => {
      return await TableLockService.releaseLock(tableId, venueId!);
    },
    onSuccess: (_, tableId) => {
      queryClient.invalidateQueries({
        queryKey: ["tableLock", tableId, venueId],
      });
      queryClient.setQueryData(
        ["tableLock", tableId, venueId],
        { locked: false } as LockStatus
      );
    },
  });
};

export const useVenueLocks = (venueId: string | null) => {
  return useQuery({
    queryKey: ["venueLocks", venueId],
    queryFn: () => TableLockService.getVenueLocks(venueId!),
    refetchInterval: 5000,
    enabled: !!venueId,
  });
};

export const useLockCountdown = (expiresAt: Date | string | null) => {
  const [remaining, setRemaining] = React.useState<number>(0);

  React.useEffect(() => {
    if (!expiresAt) {
      setRemaining(0);
      return;
    }

    const calculateRemaining = () => {
      const now = Date.now();
      const expiryTime = new Date(expiresAt).getTime();
      const secs = Math.max(0, Math.floor((expiryTime - now) / 1000));
      setRemaining(secs);
    };

    calculateRemaining();
    const interval = setInterval(calculateRemaining, 100);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return remaining;
};

export default {
  useTableLockStatus,
  useLockTableMutation,
  useReleaseLockMutation,
  useVenueLocks,
  useLockCountdown,
};
