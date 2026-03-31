// src/components/ModeSwitcher.tsx
// MODE SWITCHER - Switch between Mess, Restaurant, Canteen modes
// Shows locked modes with upgrade pricing buttons

import React, { useState, useEffect } from "react";
import { useAppMode } from "@/contexts/ModeContext";
import {
  Utensils,
  UtensilsCrossed,
  ShoppingCart,
  Lock,
  Zap,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

const MODES = {
  mess: {
    label: "Mess/Canteen",
    icon: <Utensils size={18} />,
    color: "bg-blue-600",
  },
  restaurant: {
    label: "Restaurant",
    icon: <UtensilsCrossed size={18} />,
    color: "bg-orange-600",
  },
  canteen: {
    label: "Canteen",
    icon: <ShoppingCart size={18} />,
    color: "bg-green-600",
  },
};

export const ModeSwitcher = () => {
  const { mode, setMode, availableModes, lockedModes } = useAppMode();

  const handleUpgrade = (lockedMode: string) => {
    window.location.href = `/pricing?mode=${lockedMode}`;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2">
          {MODES[mode as keyof typeof MODES].icon}
          <span>{MODES[mode as keyof typeof MODES].label}</span>
          <ChevronDown size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {/* Available Modes */}
        {availableModes.map((m) => (
          <DropdownMenuItem
            key={m}
            onClick={() => setMode(m as any)}
            className={mode === m ? "bg-blue-50 dark:bg-blue-900" : ""}
          >
            <div className="flex items-center gap-3 flex-1">
              {MODES[m as keyof typeof MODES].icon}
              <span>{MODES[m as keyof typeof MODES].label}</span>
              {mode === m && <Badge className="ml-auto">Active</Badge>}
            </div>
          </DropdownMenuItem>
        ))}

        {/* Separator */}
        {lockedModes.length > 0 && <DropdownMenuSeparator />}

        {/* Locked Modes */}
        {lockedModes.map((lockedMode) => (
          <DropdownMenuItem
            key={lockedMode}
            disabled
            className="opacity-50 cursor-not-allowed"
          >
            <div className="flex items-center gap-3 flex-1">
              <Lock size={18} />
              <span>{MODES[lockedMode as keyof typeof MODES].label}</span>
              <Button
                size="sm"
                variant="outline"
                className="ml-auto h-6 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  handleUpgrade(lockedMode);
                }}
              >
                <Zap size={12} className="mr-1" />
                Unlock
              </Button>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ModeSwitcher;
