// src/components/ModeSelector.tsx
// MODE SELECTOR - Switch between Mess, Restaurant, and Canteen modes
// Shows locked modes with upgrade pricing

import React from "react";
import { useAppMode } from "@/contexts/ModeContext";
import { Utensils, UtensilsCrossed, ShoppingCart, Lock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const MODE_INFO = {
  mess: {
    label: "Mess/Canteen",
    icon: <Utensils size={20} />,
    description: "Meal plans & subscriptions",
    color: "bg-blue-600 hover:bg-blue-700",
  },
  restaurant: {
    label: "Restaurant",
    icon: <UtensilsCrossed size={20} />,
    description: "Full-service dining",
    color: "bg-orange-600 hover:bg-orange-700",
  },
  canteen: {
    label: "Canteen",
    icon: <ShoppingCart size={20} />,
    description: "Quick service",
    color: "bg-green-600 hover:bg-green-700",
  },
};

interface ModeSelectorProps {
  fullScreen?: boolean; // For landing page vs sidebar
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({
  fullScreen = false,
}) => {
  const { mode, setMode, availableModes, lockedModes, isLoading } = useAppMode();

  const handleUpgradeClick = (lockedMode: string) => {
    // Navigate to pricing/subscription page with mode parameter
    window.location.href = `/pricing?mode=${lockedMode}`;
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg w-32" />
      </div>
    );
  }

  // Compact view for sidebar/header
  if (!fullScreen) {
    return (
      <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Select Mode
        </label>
        <Select value={mode} onValueChange={(value) => setMode(value as any)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableModes.map((m) => (
              <SelectItem key={m} value={m}>
                {MODE_INFO[m].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {lockedModes.length > 0 && (
          <div className="mt-3 space-y-2">
            {lockedModes.map((lockedMode) => (
              <button
                key={lockedMode}
                onClick={() => handleUpgradeClick(lockedMode)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 transition-colors text-sm"
              >
                <div className="flex items-center gap-2 text-amber-700">
                  <Lock size={14} />
                  <span>{MODE_INFO[lockedMode].label}</span>
                </div>
                <span className="text-xs text-amber-600 font-medium">Unlock</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Full screen mode selector (landing page)
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-black text-gray-900 dark:text-white mb-4">
            Select Your Operating Mode
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Choose how you want to manage your food service business
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {/* Available Modes */}
          {availableModes.map((m) => {
            const info = MODE_INFO[m];
            const isActive = mode === m;

            return (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`group relative p-8 rounded-2xl border-2 transition-all duration-300 ${
                  isActive
                    ? "border-blue-600 bg-white dark:bg-gray-800 shadow-2xl"
                    : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
              >
                {/* Badge */}
                {isActive && (
                  <Badge className="absolute top-4 right-4 bg-blue-600">
                    Active
                  </Badge>
                )}

                {/* Icon */}
                <div
                  className={`text-4xl mb-4 ${isActive ? "text-blue-600" : "text-gray-600 dark:text-gray-400"}`}
                >
                  {info.icon}
                </div>

                {/* Title */}
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {info.label}
                </h3>

                {/* Description */}
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  {info.description}
                </p>

                {/* Button */}
                <Button
                  className={`w-full ${info.color} text-white`}
                  onClick={() => setMode(m)}
                >
                  {isActive ? "Currently Active" : "Switch to"}
                </Button>
              </button>
            );
          })}

          {/* Locked Modes */}
          {lockedModes.map((lockedMode) => {
            const info = MODE_INFO[lockedMode];

            return (
              <div
                key={lockedMode}
                className="relative p-8 rounded-2xl border-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 opacity-75"
              >
                {/* Lock Overlay */}
                <div className="absolute inset-0 bg-black bg-opacity-20 rounded-2xl flex items-center justify-center">
                  <div className="text-center">
                    <Lock size={48} className="text-white mb-2 mx-auto" />
                    <p className="text-white font-bold">Locked</p>
                  </div>
                </div>

                {/* Content */}
                <div className="relative z-0 opacity-50">
                  <div className="text-4xl mb-4 text-gray-400">{info.icon}</div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {info.label}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    {info.description}
                  </p>
                </div>

                {/* Upgrade Button */}
                <Button
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white relative z-10"
                  onClick={() => handleUpgradeClick(lockedMode)}
                >
                  <Zap size={16} className="mr-2" />
                  Upgrade to Unlock
                </Button>

                {/* Price Hint */}
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3">
                  Add ${lockedMode === "restaurant" ? "49.99" : "39.99"}/month
                </p>
              </div>
            );
          })}
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 text-center">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            💡 You can switch between your active modes at any time. Upgrade to unlock additional modes and expand your business operations.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ModeSelector;
