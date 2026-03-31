// src/lib/getNavigationItems.ts
// MODE-AWARE NAVIGATION BUILDER
// Hides/shows menu items based on current mode

import {
  Home,
  UtensilsCrossed,
  Zap,
  Users,
  TrendingUp,
  Settings,
  BookOpen,
  BarChart3,
  ShoppingCart,
  Clock,
  FileText,
} from "lucide-react";
import { Mode } from "@/contexts/ModeContext";

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: typeof Home; // Any icon component
  badge?: string;
  modes: Mode[]; // Which modes this nav item appears in
  children?: NavItem[];
}

export const navigationItems: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: Home,
    modes: ["restaurant", "mess", "canteen"],
  },

  // ============================================================================
  // RESTAURANT MODE
  // ============================================================================
  {
    id: "restaurant",
    label: "Restaurant",
    href: "#",
    icon: UtensilsCrossed,
    modes: ["restaurant"],
    children: [
      {
        id: "menu",
        label: "Menu",
        href: "/restaurant/menu",
        icon: BookOpen,
        modes: ["restaurant"],
      },
      {
        id: "kitchen",
        label: "Kitchen Portal",
        href: "/restaurant/kitchen",
        icon: Zap,
        modes: ["restaurant"],
      },
      {
        id: "orders",
        label: "Orders",
        href: "/restaurant/orders",
        icon: ShoppingCart,
        modes: ["restaurant"],
      },
      {
        id: "tables",
        label: "Tables",
        href: "/restaurant/tables",
        icon: Clock,
        modes: ["restaurant"],
      },
      {
        id: "reservations",
        label: "Reservations",
        href: "/restaurant/reservations",
        icon: Calendar,
        modes: ["restaurant"],
      },
    ],
  },

  // ============================================================================
  // MESS MODE
  // ============================================================================
  {
    id: "mess",
    label: "Mess",
    href: "#",
    icon: Users,
    modes: ["mess"],
    children: [
      {
        id: "menu",
        label: "Menu",
        href: "/mess/menu",
        icon: BookOpen,
        modes: ["mess"],
      },
      {
        id: "kitchen",
        label: "Kitchen",
        href: "/mess/kitchen",
        icon: Zap,
        modes: ["mess"],
      },
      {
        id: "members",
        label: "Members",
        href: "/mess/members",
        icon: Users,
        modes: ["mess"],
      },
      {
        id: "orders",
        label: "Orders",
        href: "/mess/orders",
        icon: ShoppingCart,
        modes: ["mess"],
      },
      {
        id: "sales", // ✅ ONLY appears in MESS mode
        label: "Sales & Billing",
        href: "/mess/sales",
        icon: TrendingUp,
        badge: "New",
        modes: ["mess"], // ✅ NOT in restaurant or canteen
      },
    ],
  },

  // ============================================================================
  // CANTEEN MODE
  // ============================================================================
  {
    id: "canteen",
    label: "Canteen",
    href: "#",
    icon: ShoppingCart,
    modes: ["canteen"],
    children: [
      {
        id: "menu",
        label: "Menu",
        href: "/canteen/menu",
        icon: BookOpen,
        modes: ["canteen"],
      },
      {
        id: "kitchen",
        label: "Kitchen",
        href: "/canteen/kitchen",
        icon: Zap,
        modes: ["canteen"],
      },
      {
        id: "inventory",
        label: "Inventory",
        href: "/canteen/inventory",
        icon: ShoppingCart,
        modes: ["canteen"],
      },
      {
        id: "orders",
        label: "Orders",
        href: "/canteen/orders",
        icon: FileText,
        modes: ["canteen"],
      },
    ],
  },

  // ============================================================================
  // COMMON (All modes)
  // ============================================================================
  {
    id: "analytics",
    label: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    modes: ["restaurant", "mess", "canteen"],
  },
  {
    id: "settings",
    label: "Settings",
    href: "/settings",
    icon: Settings,
    modes: ["restaurant", "mess", "canteen"],
  },
];

/**
 * Filter navigation items based on current mode
 * @param currentMode Current active mode
 * @returns Navigation items visible in this mode
 */
export function getNavigationForMode(currentMode: Mode): NavItem[] {
  return navigationItems
    .filter((item) => item.modes.includes(currentMode))
    .map((item) => ({
      ...item,
      // Recursively filter children
      children: item.children
        ? item.children.filter((child) => child.modes.includes(currentMode))
        : undefined,
    }))
    .filter(
      (item) => !item.children || item.children.length > 0 || !item.children
    );
}

/**
 * Check if navigation item should be shown
 * @param itemId Navigation item ID
 * @param currentMode Current active mode
 * @returns Whether item should be visible
 */
export function shouldShowNavItem(itemId: string, currentMode: Mode): boolean {
  const allItems = navigationItems.flatMap((item) => [
    item,
    ...(item.children || []),
  ]);

  const navItem = allItems.find((item) => item.id === itemId);
  return navItem ? navItem.modes.includes(currentMode) : false;
}

export default getNavigationForMode;
