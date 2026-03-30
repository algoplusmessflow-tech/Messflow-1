import React, { createContext, useContext, ReactNode } from 'react';
import { useProfile } from '@/hooks/useProfile';
import type { Database } from '@/integrations/supabase/types';

type AppMode = Database['public']['Enums']['business_type'];

interface ModeContextType {
  mode: AppMode;
  isLoadingMode: boolean;
}

const ModeContext = createContext<ModeContextType | undefined>(undefined);

export function ModeProvider({ children }: { children: ReactNode }) {
  const { profile, isLoading } = useProfile();

  // If there's no profile yet, we default to 'mess'
  const mode: AppMode = profile?.business_type || 'mess';

  return (
    <ModeContext.Provider value={{ mode, isLoadingMode: isLoading }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useAppMode() {
  const context = useContext(ModeContext);
  if (context === undefined) {
    throw new Error('useAppMode must be used within a ModeProvider');
  }
  return context;
}
