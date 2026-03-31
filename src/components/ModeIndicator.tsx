// src/components/ModeIndicator.tsx
// MODE INDICATOR - Visual indicator showing current active mode

import React from "react";
import { useAppMode } from "@/contexts/ModeContext";
import { Utensils, UtensilsCrossed, ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const MODE_STYLES = {
  mess: {
    label: "Mess",
    icon: <Utensils size={16} />,
    bgColor: "bg-blue-50 dark:bg-blue-900/30",
    textColor: "text-blue-700 dark:text-blue-300",
    borderColor: "border-blue-200 dark:border-blue-800",
    badgeColor: "bg-blue-600 hover:bg-blue-700",
  },
  restaurant: {
    label: "Restaurant",
    icon: <UtensilsCrossed size={16} />,
    bgColor: "bg-orange-50 dark:bg-orange-900/30",
    textColor: "text-orange-700 dark:text-orange-300",
    borderColor: "border-orange-200 dark:border-orange-800",
    badgeColor: "bg-orange-600 hover:bg-orange-700",
  },
  canteen: {
    label: "Canteen",
    icon: <ShoppingCart size={16} />,
    bgColor: "bg-green-50 dark:bg-green-900/30",
    textColor: "text-green-700 dark:text-green-300",
    borderColor: "border-green-200 dark:border-green-800",
    badgeColor: "bg-green-600 hover:bg-green-700",
  },
};

interface ModeIndicatorProps {
  className?: string;
  compact?: boolean;
}

export const ModeIndicator: React.FC<ModeIndicatorProps> = ({
  className = "",
  compact = false,
}) => {
  const { mode } = useAppMode();
  const modeStyle = MODE_STYLES[mode as keyof typeof MODE_STYLES];

  if (compact) {
    return (
      <Badge className={`${modeStyle.badgeColor} text-white gap-1`}>
        {modeStyle.icon}
        {modeStyle.label}
      </Badge>
    );
  }

  return (
    <div
      className={`
        ${modeStyle.bgColor}
        ${modeStyle.textColor}
        ${modeStyle.borderColor}
        border rounded-lg px-4 py-2 flex items-center gap-2
        ${className}
      `}
    >
      {modeStyle.icon}
      <span className="font-medium text-sm">{modeStyle.label} Mode</span>
    </div>
  );
};

export const ModeHeader: React.FC<{ className?: string }> = ({
  className = "",
}) => {
  const { mode } = useAppMode();
  const modeStyle = MODE_STYLES[mode as keyof typeof MODE_STYLES];

  return (
    <div
      className={`
        ${modeStyle.bgColor}
        ${modeStyle.borderColor}
        border-b py-3 px-6
        ${className}
      `}
    >
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className={`${modeStyle.textColor} text-2xl`}>
            {modeStyle.icon}
          </div>
          <div>
            <h1 className={`${modeStyle.textColor} font-bold text-lg`}>
              {modeStyle.label}
            </h1>
            <p className={`text-xs ${modeStyle.textColor} opacity-75`}>
              {mode === "mess" && "Meal Plans & Subscriptions"}
              {mode === "restaurant" && "Full-Service Dining"}
              {mode === "canteen" && "Quick Service Orders"}
            </p>
          </div>
        </div>
        <Badge className={`${modeStyle.badgeColor} text-white`}>Active</Badge>
      </div>
    </div>
  );
};

export const ModeBreadcrumb: React.FC = () => {
  const { mode } = useAppMode();
  const modeStyle = MODE_STYLES[mode as keyof typeof MODE_STYLES];

  return (
    <div className="flex items-center gap-2 text-sm mb-4">
      <div className="flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded">
        {modeStyle.icon}
        <span className="font-medium">{modeStyle.label}</span>
      </div>
    </div>
  );
};

export default ModeIndicator;