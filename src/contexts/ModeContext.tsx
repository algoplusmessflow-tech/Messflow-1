// src/contexts/ModeContext.tsx
// APPLICATION MODE CONTEXT - Controls which mode (Mess, Restaurant, Canteen) is active
// Updated to support multi-mode activation with SuperAdmin controls

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export type AppMode = "mess" | "restaurant" | "canteen";

interface ModeContextType {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  availableModes: AppMode[];
  setAvailableModes: (modes: AppMode[]) => void;
  isLoading: boolean;
  canAccessMode: (mode: AppMode) => boolean;
  lockedModes: AppMode[]; // Modes that require upgrade
  setLockedModes: (modes: AppMode[]) => void;
  tenantId?: string;
  setTenantId: (id: string) => void;
}

const ModeContext = createContext<ModeContextType | undefined>(undefined);

interface ModeProviderProps {
  children: ReactNode;
}

export const ModeProvider: React.FC<ModeProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [mode, setModeState] = useState<AppMode>("mess");
  const [availableModes, setAvailableModes] = useState<AppMode[]>(["mess"]);
  const [lockedModes, setLockedModes] = useState<AppMode[]>(["restaurant", "canteen"]);
  const [isLoading, setIsLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string>();

  // Load user's available modes from database on auth
  useEffect(() => {
    const loadUserModes = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        // Get user's profile to find tenant_id
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, user_id')
          .eq('user_id', user.id)
          .single();

        if (profile) {
          // tenant_id in tenant_mode_access references auth.users(id) which is profile.user_id
          const tenantId = profile.user_id;
          setTenantId(tenantId);

          // Get tenant mode access via RPC function
          const { data: modeAccess, error } = await (supabase.rpc as any)(
            'get_tenant_mode_access',
            { p_tenant_id: tenantId }
          ).single();

          if (error) {
            console.error("Error fetching modes via RPC:", error);
          }

          const allModes: AppMode[] = ['mess', 'restaurant', 'canteen'];
          const activeModes = (modeAccess?.active_modes as AppMode[]) || ['mess'];
          const locked = allModes.filter(mode => !activeModes.includes(mode)) as AppMode[];

          setAvailableModes(activeModes);
          setLockedModes(locked);
          
          // Set default mode to first available
          const savedMode = localStorage.getItem("selectedMode") as AppMode;
          if (savedMode && activeModes.includes(savedMode)) {
            setModeState(savedMode);
          } else {
            setModeState(activeModes[0] || "mess");
          }
        }
      } catch (error) {
        console.error("Error loading user modes:", error);
        // Default to mess mode
        setAvailableModes(["mess"]);
        setLockedModes(["restaurant", "canteen"]);
        setModeState("mess");
      } finally {
        setIsLoading(false);
      }
    };

    loadUserModes();
  }, [user?.id]);

  // Subscribe to real-time mode changes
  useEffect(() => {
    if (!user?.id) return;

    let tenantId: string | null = null;

    // Get tenant ID for comparison
    const loadTenantId = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('user_id', user.id)
        .single();
      tenantId = profile?.user_id || null;

      if (tenantId) {
        setTenantId(tenantId);
      }
    };
    loadTenantId();

    const channel = supabase
      .channel('tenant-modes-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'mode_activation',
          table: 'tenant_mode_access',
        },
        (payload: any) => {
          // Only update if this tenant's modes changed
          if (tenantId && payload.new?.tenant_id === tenantId) {
            const allModes: AppMode[] = ['mess', 'restaurant', 'canteen'];
            const activeModes = (payload.new?.active_modes as AppMode[]) || ['mess'];
            const locked = allModes.filter(mode => !activeModes.includes(mode)) as AppMode[];

            setAvailableModes(activeModes);
            setLockedModes(locked);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const setMode = (newMode: AppMode) => {
    if (canAccessMode(newMode)) {
      setModeState(newMode);
      localStorage.setItem("selectedMode", newMode);
    }
  };

  const canAccessMode = (targetMode: AppMode): boolean => {
    return availableModes.includes(targetMode);
  };

  const value: ModeContextType = {
    mode,
    setMode,
    availableModes,
    setAvailableModes,
    isLoading,
    canAccessMode,
    lockedModes,
    setLockedModes,
    tenantId,
    setTenantId,
  };

  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
};

export const useAppMode = () => {
  const context = useContext(ModeContext);
  if (context === undefined) {
    throw new Error("useAppMode must be used within ModeProvider");
  }
  return context;
};

