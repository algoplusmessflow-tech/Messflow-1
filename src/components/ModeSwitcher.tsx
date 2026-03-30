import React from 'react';
import { useAuth } from '@/lib/auth';
import { useProfile } from '@/hooks/useProfile';
import { useAppMode } from '@/contexts/ModeContext';
import { cn } from '@/lib/utils';
import { Store, UtensilsCrossed, Coffee } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type AppMode = Database['public']['Enums']['business_type'];

export function ModeSwitcher({ isMobile = false }: { isMobile?: boolean }) {
  const { mode, isLoadingMode } = useAppMode();
  const { user } = useAuth();
  const { updateProfile } = useProfile();

  const handleModeChange = (newMode: AppMode) => {
    if (newMode !== mode && newMode !== 'cloud_kitchen') {
      updateProfile.mutate({ business_type: newMode });
    }
  };

  const modes: { id: AppMode; label: string; icon: any }[] = [
    { id: 'mess', label: 'Mess', icon: Store },
    { id: 'restaurant', label: 'Restaurant', icon: UtensilsCrossed },
    { id: 'canteen', label: 'Canteen', icon: Coffee }
  ];

  if (isLoadingMode) return null;

  return (
    <div className={cn(
      "flex p-1 bg-muted/50 rounded-lg overflow-hidden border border-border/50",
      isMobile ? "w-full" : "w-full"
    )}>
      {modes.map((m) => {
        const isActive = mode === m.id;
        const Icon = m.icon;
        
        return (
          <button
            key={m.id}
            disabled={updateProfile.isPending}
            onClick={() => handleModeChange(m.id)}
            className={cn(
              "flex-1 flex flex-col xl:flex-row items-center justify-center p-2 text-xs font-medium transition-all rounded-md gap-1.5",
              isActive 
                ? "bg-background text-foreground shadow-sm ring-1 ring-border" 
                : "text-muted-foreground hover:text-foreground hover:bg-background/50",
              updateProfile.isPending && "opacity-50 cursor-not-allowed"
            )}
            title={m.label}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className={cn(
              "truncate",
              isMobile ? "block" : "hidden xl:block"
            )}>
              {m.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
