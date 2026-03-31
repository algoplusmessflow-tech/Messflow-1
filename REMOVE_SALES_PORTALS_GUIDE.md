# 🗑️ HOW TO REMOVE SALES PORTALS FROM RESTAURANT & CANTEEN MODES

## Files to Modify

### 1. Remove Sales from RestaurantSettings.tsx

**Current:** Shows Sales Portal option in tabs

**Change to:** Remove the Sales tab entirely

```typescript
// REMOVE this tab:
<TabsTrigger value="sales">
  <TrendingUp size={16} />
  Sales
</TabsTrigger>

// REMOVE this content:
<TabsContent value="sales" className="m-0">
  <SalesPortalSection />
</TabsContent>

// Keep only:
- Details
- Tables
- Tax
- Menu (Food Menu)
```

### 2. Remove Sales from Settings.tsx (Mess Mode)

**Keep:** Sales tab (Mess mode needs it for meal plan sales tracking)

**Hide:** Only for non-Mess modes

```typescript
import { useAppMode } from "@/contexts/ModeContext";

export const Settings = () => {
  const { mode } = useAppMode();
  
  return (
    <Tabs>
      <TabsList>
        {/* Always show */}
        <TabsTrigger value="details">Details</TabsTrigger>
        <TabsTrigger value="staff">Staff</TabsTrigger>
        
        {/* Mess mode only */}
        {mode === 'mess' && (
          <TabsTrigger value="sales">
            <TrendingUp size={16} />
            Sales
          </TabsTrigger>
        )}
        
        {/* Common */}
        <TabsTrigger value="pricing">Pricing</TabsTrigger>
      </TabsList>
      
      {/* Content - only render for active mode */}
      {mode === 'mess' && <TabsContent value="sales">...</TabsContent>}
    </Tabs>
  );
};
```

### 3. Update App.tsx Routes

Remove these routes:

```typescript
// ❌ DELETE:
<Route path="/sales" element={
  <ProtectedRoute>
    <SalesPortal />
  </ProtectedRoute>
} />

<Route path="/sales-person-login" element={
  <SalesPersonLogin />
} />

<Route path="/sales-analytics" element={
  <ProtectedRoute>
    <SalesAnalytics />
  </ProtectedRoute>
} />
```

### 4. Update Navigation Menu

**File:** `src/components/DesktopSidebar.tsx`

```typescript
// Conditionally show Sales only for Mess mode:

import { useAppMode } from "@/contexts/ModeContext";

export const DesktopSidebar = () => {
  const { mode } = useAppMode();

  return (
    <nav>
      {/* Common to all modes */}
      <NavLink href="/dashboard" icon={<Home />}>Dashboard</NavLink>
      
      {/* Mess mode: show all mess-specific items */}
      {mode === 'mess' && (
        <>
          <NavLink href="/members" icon={<Users />}>Members</NavLink>
          <NavLink href="/menu" icon={<Book />}>Menu</NavLink>
          <NavLink href="/kitchen" icon={<ChefHat />}>Kitchen</NavLink>
          <NavLink href="/sales" icon={<TrendingUp />}>Sales</NavLink>
          <NavLink href="/orders" icon={<ShoppingCart />}>Orders</NavLink>
        </>
      )}
      
      {/* Restaurant mode: no sales */}
      {mode === 'restaurant' && (
        <>
          <NavLink href="/restaurant/menu" icon={<UtensilsCrossed />}>
            Food Menu
          </NavLink>
          <NavLink href="/restaurant/kitchen" icon={<ChefHat />}>
            Kitchen Portal
          </NavLink>
          <NavLink href="/tables" icon={<Grid />}>Tables</NavLink>
          <NavLink href="/reservations" icon={<Calendar />}>
            Reservations
          </NavLink>
        </>
      )}
      
      {/* Canteen mode: no sales */}
      {mode === 'canteen' && (
        <>
          <NavLink href="/canteen/menu" icon={<ShoppingCart />}>Menu</NavLink>
          <NavLink href="/canteen/inventory" icon={<Package />}>
            Inventory
          </NavLink>
          <NavLink href="/canteen/orders" icon={<Order />}>Orders</NavLink>
          <NavLink href="/canteen/kitchen" icon={<ChefHat />}>
            Kitchen
          </NavLink>
        </>
      )}
      
      {/* Common to all modes */}
      <NavLink href="/settings" icon={<Settings />}>Settings</NavLink>
      <NavLink href="/reports" icon={<BarChart />}>Reports</NavLink>
    </nav>
  );
};
```

### 5. Update BottomNav.tsx (Mobile)

```typescript
import { useAppMode } from "@/contexts/ModeContext";

export const BottomNav = () => {
  const { mode } = useAppMode();

  return (
    <div className="flex gap-4">
      <NavButton icon={<Home />} href="/dashboard" />
      
      {/* Mode-specific buttons */}
      {mode === 'mess' && (
        <>
          <NavButton icon={<Users />} href="/members" />
          <NavButton icon={<TrendingUp />} href="/sales" />
        </>
      )}
      
      {mode === 'restaurant' && (
        <>
          <NavButton icon={<UtensilsCrossed />} href="/restaurant/menu" />
          <NavButton icon={<Grid />} href="/tables" />
        </>
      )}
      
      {mode === 'canteen' && (
        <>
          <NavButton icon={<ShoppingCart />} href="/canteen/menu" />
          <NavButton icon={<Package />} href="/canteen/inventory" />
        </>
      )}
      
      <NavButton icon={<Settings />} href="/settings" />
    </div>
  );
};
```

### 6. Optionally Hide SalesPortal Component

Don't delete the component, just don't render it for non-Mess modes.

```typescript
// src/pages/SalesPortal.tsx
import { useAppMode } from "@/contexts/ModeContext";
import { Navigate } from "react-router-dom";

export const SalesPortal = () => {
  const { mode } = useAppMode();

  // Prevent access from non-mess modes
  if (mode !== 'mess') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    // ... existing SalesPortal UI
  );
};
```

---

## 📋 QUICK CHECKLIST

- [ ] Remove Sales tab from `RestaurantSettings.tsx`
- [ ] Add mode check to `Settings.tsx` Sales tab (show only for Mess)
- [ ] Remove Sales routes from `App.tsx`
- [ ] Update `DesktopSidebar.tsx` with mode-based navigation
- [ ] Update `BottomNav.tsx` with mode-based navigation
- [ ] Add `useAppMode()` hook to all navigation components
- [ ] Test switching between modes
- [ ] Test that Sales portal is hidden for restaurant/canteen
- [ ] Test that Sales portal is visible for mess

---

## 🧪 Testing

### Test 1: Switch to Restaurant Mode
1. Switch to Restaurant mode
2. Verify Sales is NOT in sidebar
3. Verify Sales is NOT in settings
4. Verify Food Menu IS visible
5. Verify Kitchen Portal IS visible

### Test 2: Switch to Canteen Mode
1. Switch to Canteen mode
2. Verify Sales is NOT in sidebar
3. Verify Sales is NOT in settings
4. Verify Menu IS visible
5. Verify Inventory IS visible

### Test 3: Switch Back to Mess Mode
1. Switch to Mess mode
2. Verify Sales IS in sidebar
3. Verify Sales IS in settings
4. Verify Members IS visible
5. Verify Sales tab works

---

## 💾 Files to Modify Summary

```
src/
├── App.tsx                            ← Remove Sales routes
├── contexts/
│   └── ModeContext.tsx               ← Already updated
├── components/
│   ├── DesktopSidebar.tsx            ← Add mode check
│   ├── BottomNav.tsx                 ← Add mode check
│   └── ModeSelector.tsx              ← Already created
├── pages/
│   ├── Settings.tsx                  ← Hide Sales tab for non-Mess
│   ├── RestaurantSettings.tsx        ← Remove Sales tab
│   ├── SalesPortal.tsx               ← Add route guard (optional)
│   └── Upgrade.tsx                   ← Create new
└── services/
    └── restaurantFoodMenuService.ts  ← Already created
```

---

**Status: Ready to implement**

All changes are backward compatible. Existing Mess mode users will continue to see Sales portals.
