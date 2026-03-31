// src/services/tableLockService.ts
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || "",
  import.meta.env.VITE_SUPABASE_ANON_KEY || ""
);

export interface TableLock {
  lock_id: string;
  table_id: string;
  venue_id: string;
  locked_by: string;
  locked_at: string;
  expires_at: string;
  message: string;
}

export interface LockStatus {
  locked: boolean;
  lock_id?: string;
  locked_by?: string;
  expires_at?: string;
  remaining_seconds?: number;
}

export interface LockConflictDetails {
  error: string;
  locked_by: string;
  locked_at: string;
  expires_at: string;
  wait_ms: number;
}

export class LockConflictError extends Error {
  constructor(public details: LockConflictDetails) {
    super("TABLE_LOCKED");
    this.name = "LockConflictError";
  }
}

export class TableLockService {
  static async lockTable(
    tableId: string,
    venueId: string,
    ttlSeconds: number = 30
  ): Promise<TableLock> {
    if (ttlSeconds < 10 || ttlSeconds > 60) {
      throw new Error("TTL must be between 10 and 60 seconds");
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("USER_NOT_AUTHENTICATED");

      const now = new Date();
      const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

      const { data: lock, error: insertError } = await supabase
        .from("table_locks")
        .upsert(
          {
            table_id: tableId,
            venue_id: venueId,
            locked_by: user.id,
            locked_at: now.toISOString(),
            expires_at: expiresAt.toISOString(),
          },
          { onConflict: "table_id,venue_id" }
        )
        .select()
        .single();

      if (insertError) {
        const { data: existingLock } = await supabase
          .from("table_locks")
          .select("id, locked_by, locked_at, expires_at")
          .eq("table_id", tableId)
          .eq("venue_id", venueId)
          .gt("expires_at", now.toISOString())
          .maybeSingle();

        if (existingLock && existingLock.locked_by !== user.id) {
          const expiryTime = new Date(existingLock.expires_at);
          throw new LockConflictError({
            error: "TABLE_LOCKED",
            locked_by: existingLock.locked_by,
            locked_at: existingLock.locked_at,
            expires_at: existingLock.expires_at,
            wait_ms: Math.max(0, expiryTime.getTime() - now.getTime()),
          });
        }
        throw new Error("LOCK_ACQUISITION_FAILED");
      }

      return {
        lock_id: lock.id,
        table_id: lock.table_id,
        venue_id: lock.venue_id,
        locked_by: lock.locked_by,
        locked_at: lock.locked_at,
        expires_at: lock.expires_at,
        message: `Lock acquired. You have ${ttlSeconds} seconds.`,
      };
    } catch (error: any) {
      if (error instanceof LockConflictError) throw error;
      throw new Error(error.message || "LOCK_ACQUISITION_FAILED");
    }
  }

  static async checkLockStatus(
    tableId: string,
    venueId: string
  ): Promise<LockStatus> {
    try {
      const now = new Date();
      const { data: lock } = await supabase
        .from("table_locks")
        .select("id, locked_by, expires_at")
        .eq("table_id", tableId)
        .eq("venue_id", venueId)
        .gt("expires_at", now.toISOString())
        .maybeSingle();

      if (!lock) return { locked: false };

      const expiresAt = new Date(lock.expires_at);
      const remaining = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));

      return {
        locked: true,
        lock_id: lock.id,
        locked_by: lock.locked_by,
        expires_at: lock.expires_at,
        remaining_seconds: remaining,
      };
    } catch (error) {
      console.error("Failed to check lock status:", error);
      return { locked: false };
    }
  }

  static async releaseLock(tableId: string, venueId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("USER_NOT_AUTHENTICATED");

      const { data: lock } = await supabase
        .from("table_locks")
        .select("id, locked_by")
        .eq("table_id", tableId)
        .eq("venue_id", venueId)
        .maybeSingle();

      if (!lock || lock.locked_by !== user.id) throw new Error("NOT_AUTHORIZED");

      const { error: deleteError } = await supabase
        .from("table_locks")
        .delete()
        .eq("id", lock.id);

      if (deleteError) throw new Error("LOCK_RELEASE_FAILED");
    } catch (error: any) {
      throw new Error(error.message || "LOCK_RELEASE_FAILED");
    }
  }

  static async lockTableWithRetry(
    tableId: string,
    venueId: string,
    maxRetries: number = 3,
    initialDelayMs: number = 100
  ): Promise<TableLock> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.lockTable(tableId, venueId, 30);
      } catch (error: any) {
        if (error instanceof LockConflictError) {
          lastError = error;
          if (attempt < maxRetries - 1) {
            const delay = initialDelayMs * Math.pow(2, attempt) + Math.random() * 50;
            const waitTime = Math.min(delay, error.details.wait_ms);
            await new Promise((resolve) => setTimeout(resolve, waitTime));
            continue;
          }
        }
        throw error;
      }
    }
    throw lastError || new Error("LOCK_ACQUISITION_FAILED");
  }

  static async getVenueLocks(venueId: string): Promise<any[]> {
    try {
      const now = new Date();
      const { data: locks } = await supabase
        .from("table_locks")
        .select("id, table_id, locked_by, locked_at, expires_at")
        .eq("venue_id", venueId)
        .gt("expires_at", now.toISOString())
        .order("locked_at", { ascending: false });
      return locks || [];
    } catch (error) {
      console.error("Error fetching venue locks:", error);
      return [];
    }
  }

  static async cleanupExpiredLocks(): Promise<number> {
    try {
      const { data } = await supabase.rpc("cleanup_expired_locks");
      return data?.[0]?.deleted_count || 0;
    } catch (error) {
      return 0;
    }
  }
}

export default TableLockService;