#!/usr/bin/env bash
# MESSFLOW ARCHITECTURE - VISUAL GUIDE

cat << 'EOF'

╔══════════════════════════════════════════════════════════════════════════════╗
║               MESSFLOW MULTI-MODE ARCHITECTURE DIAGRAM                       ║
║                         (After All Fixes Applied)                           ║
╚══════════════════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────────────────┐
│                          USER APPLICATION LAYER                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│  │   Mess Mode      │  │ Restaurant Mode  │  │   Canteen Mode   │          │
│  │  (Blue 🔵)       │  │  (Orange 🟠)     │  │   (Green 🟢)     │          │
│  ├──────────────────┤  ├──────────────────┤  ├──────────────────┤          │
│  │ Dashboard        │  │ Dashboard        │  │ Dashboard        │          │
│  │ Members          │  │ Food Menu        │  │ Menu             │          │
│  │ Menu             │  │ Kitchen Portal   │  │ Inventory        │          │
│  │ Kitchen          │  │ Tables           │  │ Orders           │          │
│  │ Sales ✅         │  │ Reservations     │  │ Kitchen Portal   │          │
│  │ Reports          │  │ Orders           │  │ Settings         │          │
│  │ Settings         │  │ Settings         │  │                  │          │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘          │
│         ▲                      ▲                       ▲                     │
│         │                      │                       │                     │
└─────────┼──────────────────────┼───────────────────────┼────────────────────┘
          │                      │                       │
          └──────────────────────┴───────────────────────┘
                    ModeIndicator.tsx
                  (Color-coded display)
                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      MODE CONTEXT & STATE LAYER                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                        ModeContext (React)                                  │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │ • Current active mode (mess/restaurant/canteen)                    │    │
│  │ • Available modes (based on tenant plan)                           │    │
│  │ • Locked modes (with upgrade pricing)                             │    │
│  │ • Max allowed modes (based on subscription)                       │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SUPERADMIN MODE MANAGEMENT LAYER                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│           SuperAdminModeActivation.tsx                                      │
│  ┌─────────────────────────────────────────────────────────────┐           │
│  │ • View all tenants                                          │           │
│  │ • See active modes per tenant                              │           │
│  │ • Click "Manage" button → Dialog opens                    │           │
│  │ • Activate new modes (if within limit)                    │           │
│  │ • View locked modes with pricing                          │           │
│  │ • Call activate_mode() function                           │           │
│  └─────────────────────────────────────────────────────────────┘           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DATABASE LAYER (Supabase)                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  mode_activation schema                                                     │
│  ┌──────────────────────────┐                                              │
│  │ subscription_plans       │                                              │
│  │ ├─ id (UUID)             │                                              │
│  │ ├─ name (Starter/Pro)    │                                              │
│  │ ├─ available_modes[]     │                                              │
│  │ └─ price_usd             │                                              │
│  └──────────────────────────┘                                              │
│                ▼                                                             │
│  ┌──────────────────────────┐                                              │
│  │ tenant_mode_access       │ ◄─ Main table                                │
│  │ ├─ tenant_id             │                                              │
│  │ ├─ active_modes[]        │                                              │
│  │ ├─ max_allowed_modes     │                                              │
│  │ ├─ plan_id (FK)          │                                              │
│  │ └─ expires_at            │                                              │
│  └──────────────────────────┘                                              │
│         ▲         ▲                                                         │
│         │         │                                                         │
│  ┌──────┴─────┐  ┌─────────────────┐                                       │
│  │ locked_    │  │ mode_upgrade_   │                                       │
│  │ modes      │  │ requests        │                                       │
│  │ ├─ mode    │  │ ├─ requested_   │                                       │
│  │ ├─ price   │  │ │  mode         │                                       │
│  │ └─ is_locked
│  │            │  │ ├─ status       │                                       │
│  └────────────┘  │ └─ payment_req  │                                       │
│                  └─────────────────┘                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

DATABASE FUNCTIONS:
  • can_activate_mode(tenant_id, mode) → BOOLEAN
  • activate_mode(tenant_id, mode) → BOOLEAN

RLS POLICIES:
  • Users see their own tenant data
  • SuperAdmin sees all tenants
  • Proper multi-tenant isolation

═════════════════════════════════════════════════════════════════════════════

FLOW: ACTIVATING A NEW MODE
─────────────────────────────────────────────────────────────────────────────

1. SuperAdmin navigates to /super-admin/mode-activation
                              ▼
2. Component loads tenant list from database
                              ▼
3. SuperAdmin clicks "Manage" on a tenant
                              ▼
4. Dialog opens showing:
   • Active modes (Blue/Orange/Green badges)
   • Available modes to activate
                              ▼
5. SuperAdmin clicks "Activate Restaurant"
                              ▼
6. Component calls activate_mode(tenant_id, "restaurant")
                              ▼
7. Database function executes:
   • Checks if mode available in plan
   • Checks if under max_allowed_modes
   • Adds mode to active_modes array
   • Unlocks mode in locked_modes table
                              ▼
8. Component refreshes
   • Restaurant now shows as active ✅
   • User can switch to Restaurant mode
   • Navigation updates for new mode

═════════════════════════════════════════════════════════════════════════════

COLOR SCHEME & ICONS:
─────────────────────────────────────────────────────────────────────────────

Mess Mode:
  Color: Blue 🔵 (#3B82F6)
  Icon: 🥘 (Utensils)
  Description: Meal plans & subscriptions

Restaurant Mode:
  Color: Orange 🟠 (#F97316)
  Icon: 🍴 (UtensilsCrossed)
  Description: Full-service dining

Canteen Mode:
  Color: Green 🟢 (#22C55E)
  Icon: 🛒 (ShoppingCart)
  Description: Quick service orders

═════════════════════════════════════════════════════════════════════════════

TECH STACK:
─────────────────────────────────────────────────────────────────────────────

Frontend:
  • React 18 + TypeScript
  • TailwindCSS for styling
  • shadcn/ui for components
  • React Context for state
  • React Query for data

Backend:
  • Supabase (PostgreSQL)
  • Row Level Security (RLS)
  • Real-time updates
  • PostgreSQL functions

═════════════════════════════════════════════════════════════════════════════

EOF
