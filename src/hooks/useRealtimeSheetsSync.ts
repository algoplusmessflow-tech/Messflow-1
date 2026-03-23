/**
 * Real-time Google Sheets sync hook.
 * Subscribes to member INSERT/UPDATE/DELETE events via Supabase Realtime.
 * Debounces changes and syncs to the user's Google Sheets backup.
 * 
 * Architecture:
 * - Listens to members table changes for the current user
 * - Debounces by 10 seconds to avoid API rate limits during bulk operations
 * - Only syncs if Google Drive is connected and provider_token exists
 * - Runs the full backup (members + menu + expenses) on each sync
 */

import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { getGoogleAccessToken } from '@/lib/google-drive';

const DEBOUNCE_MS = 10000; // 10 seconds — prevents rate limiting on bulk member changes

export function useRealtimeSheetsSync() {
  const { user } = useAuth();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncingRef = useRef(false);

  useEffect(() => {
    if (!user) return;

    const doSync = async () => {
      if (syncingRef.current) return;
      // Check if Google is connected before syncing
      const token = await getGoogleAccessToken();
      if (!token) return;

      // Check if user has Drive enabled
      const { data } = await supabase
        .from('profiles')
        .select('storage_provider, google_connected')
        .eq('user_id', user.id)
        .single();
      const p = data as any;
      if (p?.storage_provider !== 'google_drive' || !p?.google_connected) return;

      syncingRef.current = true;
      try {
        const { backupMembersToSheets } = await import('@/lib/google-sheets-backup');
        await backupMembersToSheets(user.id);
        console.log('[SheetsSync] Backup completed');
      } catch (err) {
        console.warn('[SheetsSync] Backup failed:', err);
      } finally {
        syncingRef.current = false;
      }
    };

    const scheduleSync = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(doSync, DEBOUNCE_MS);
    };

    // Subscribe to member changes for this user
    const channel = supabase
      .channel('sheets-sync-members')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'members',
          filter: `owner_id=eq.${user.id}`,
        },
        () => {
          console.log('[SheetsSync] Member change detected, scheduling backup...');
          scheduleSync();
        }
      )
      .subscribe();

    // Initial sync on mount (if Google is connected)
    scheduleSync();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [user]);
}
