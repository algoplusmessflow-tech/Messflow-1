# 🎯 MESSFLOW MULTI-MODE ARCHITECTURE - COMPLETE SOLUTION

## 4 OBJECTIVES ADDRESSED

### 1. ✅ VIDEO-STYLE MENU UI (Like YouTube/Netflix)
- Premium card-based layout with video thumbnails
- Vertical scroll with infinite loading
- Category carousel at top
- Search with AI suggestions
- Drag-to-reorder categories
- Dark mode video UI

### 2. ✅ REMOVE SALES PORTALS
- Sales Portal: Only in MESS mode
- Restaurant mode: NO sales
- Canteen mode: NO sales
- Mode-specific navigation

### 3. ✅ MODE SELECTION BUTTON
- Top-level mode switcher
- Quick toggle between modes
- Visual indicator of current mode
- Keyboard shortcut support

### 4. ✅ SUPERADMIN MODE CONTROL
- Database: `user_subscription_modes` table
- SuperAdmin Dashboard: Enable/disable modes per user
- Locked modes: Show upgrade pricing
- Mode activation: 1, 2, or 3 modes per user

---

## DATABASE SCHEMA ADDITIONS

### 1. User Subscription Modes (NEW TABLE)
```sql
CREATE TABLE public.user_subscription_modes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode_name VARCHAR(50) NOT NULL, -- 'restaurant', 'mess', 'canteen'
  is_active BOOLEAN DEFAULT false,
  activated_at TIMESTAMP,
  plan_tier VARCHAR(50) DEFAULT 'free', -- 'free', 'pro', 'enterprise'
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_user_mode UNIQUE(user_id, mode_name),
  CONSTRAINT valid_mode CHECK (mode_name IN ('restaurant', 'mess', 'canteen'))
);

CREATE INDEX idx_user_modes_user_id ON public.user_subscription_modes(user_id);
CREATE INDEX idx_user_modes_active ON public.user_subscription_modes(user_id, is_active);
```

### 2. Mode Pricing Plans (NEW TABLE)
```sql
CREATE TABLE public.mode_pricing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode_name VARCHAR(50) NOT NULL UNIQUE,
  tier VARCHAR(50) NOT NULL, -- 'free', 'pro', 'enterprise'
  monthly_price DECIMAL(10,2) DEFAULT 0,
  features JSONB,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 3. Dining Menu (VIDEO-STYLE) - restaurants.menu_items
```sql
-- Update existing menu_items with video features
ALTER TABLE restaurants.menu_items ADD COLUMN video_url TEXT;
ALTER TABLE restaurants.menu_items ADD COLUMN thumbnail_url TEXT;
ALTER TABLE restaurants.menu_items ADD COLUMN display_order INTEGER DEFAULT 0;
ALTER TABLE restaurants.menu_items ADD COLUMN category_order INTEGER DEFAULT 0;
```

---

## FEATURE BREAKDOWN

### Feature 1: VIDEO-STYLE MENU UI
**Components:**
- `RestaurantMenuVideos.tsx` - Main video grid
- `CategoryCarousel.tsx` - Horizontal category scroll
- `MenuVideoCard.tsx` - Individual video card
- `MenuSearch.tsx` - AI-powered search

**Features:**
- Netflix-like grid layout
- Infinite scroll pagination
- Category carousel
- Video thumbnails
- Hover preview
- Drag reorder

### Feature 2: SALES PORTAL REMOVAL
**Logic:**
- Check user mode (REST API call)
- If mode = 'restaurant' or 'canteen': Hide sales
- If mode = 'mess': Show sales
- Update navigation dynamically

**Files:**
- `useModeContext.ts` - Get current mode
- `getSalesShouldBeHidden.ts` - Logic helper
- `DesktopSidebar.tsx` - Update navigation

### Feature 3: MODE SELECTION BUTTON
**Components:**
- `ModeSelector.tsx` - Top navbar button
- `ModeSwitchModal.tsx` - Modal with mode list
- `ModeIndicator.tsx` - Visual indicator

**Features:**
- Click to open mode list
- Show locked modes (greyed out)
- Show "Upgrade" button for locked
- Keyboard: Cmd+M to switch

### Feature 4: SUPERADMIN MODE CONTROL
**Components:**
- `SuperAdminModeControl.tsx` - Dashboard
- `UserModeManager.tsx` - User mode settings
- `ModeUpgradePricing.tsx` - Pricing modal

**Features:**
- View all users
- Enable/disable modes
- Set plan tier
- View pricing tiers

---

## ARCHITECTURE DIAGRAM

```
┌────────────────────────────────────────────────────┐
│              MESSFLOW MULTI-MODE                   │
└────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│         Mode Selector (Top Navbar)                 │
│    [Restaurant] [Mess] [Canteen] (icons)          │
└─────────────────────────────────────────────────────┘

┌──────────────┬─────────────────┬──────────────┐
│ RESTAURANT   │     MESS        │   CANTEEN    │
├──────────────┼─────────────────┼──────────────┤
│              │                 │              │
│ ✅ Menu      │ ✅ Menu         │ ✅ Menu      │
│ ✅ Kitchen   │ ✅ Sales        │ ✅ Kitchen   │
│ ✅ Orders    │ ✅ Kitchen      │ ✅ Orders    │
│ ✅ Tables    │ ✅ Members      │ ✅ Inventory │
│ ❌ Sales     │ ✅ Billing      │ ❌ Sales     │
│              │                 │              │
└──────────────┴─────────────────┴──────────────┘

┌──────────────────────────────────────┐
│     SuperAdmin Control Panel         │
├──────────────────────────────────────┤
│ User: john@example.com               │
│ ✅ Restaurant (Active)               │
│ ✅ Mess (Active)                     │
│ 🔒 Canteen (Locked - Upgrade)        │
│                                      │
│ [Enable Mode] [Disable Mode]         │
│ [View Pricing] [Assign Plan]         │
└──────────────────────────────────────┘
```

---

## IMPLEMENTATION PHASES

### Phase 1: Database Setup (1 hour)
- Create `user_subscription_modes` table
- Create `mode_pricing_plans` table
- Update `restaurants.menu_items` schema
- Add RLS policies

### Phase 2: Backend Services (2 hours)
- `useUserModes()` hook
- `getModeStatus()` API
- `checkModeActive()` helper
- Mode authorization middleware

### Phase 3: Frontend Components (3 hours)
- Video-style menu UI
- Mode selector button
- Mode context provider
- Navigation filtering

### Phase 4: SuperAdmin Dashboard (2 hours)
- Mode control panel
- User mode management
- Pricing tiers display
- Upgrade flow

---

## NEXT STEPS

1. ✅ Create database schema (SQL files)
2. ✅ Build mode services
3. ✅ Create video-style menu component
4. ✅ Remove sales portal conditionally
5. ✅ Add mode selector button
6. ✅ Build SuperAdmin panel
7. ✅ Test multi-mode flow
8. ✅ Deploy

**Total Time: ~8 hours**
**Status: READY TO BUILD**
