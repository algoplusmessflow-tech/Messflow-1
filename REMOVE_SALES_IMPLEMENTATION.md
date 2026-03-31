# 🔧 HOW TO REMOVE SALES PORTALS (Restaurant & Canteen Only)

## OBJECTIVE
- ✅ Keep Sales for **Mess mode** (needed for meal plan tracking)
- ✅ Remove Sales from **Restaurant mode**
- ✅ Remove Sales from **Canteen mode**
- ✅ Conditional navigation based on active mode

---

## STEP 1: Update DesktopSidebar.tsx

**Location:** `src/components/DesktopSidebar.tsx`

```typescript
import { useAppMode } from "@/contexts/ModeContext";

export const DesktopSidebar = () => {
  const { mode } = useAppMode();

  return (
    <nav className="space-y-2">
      {/* ALWAYS SHOW */}
      <NavItem href="/dashboard" icon={<Home />} label="Dashboard" />
      
      {/* MESS MODE SPECIFIC */}
      {mode === 'mess' && (
        <>
          <NavItem href="/members" icon={<Users />} label="Members" />
          <NavItem href="/menu" icon={<Book />} label="Menu" />
          <NavItem href="/kitchen" icon={<ChefHat />} label="Kitchen" />
          <NavItem href="/orders" icon={<ShoppingCart />} label="Orders" />
          {/* 🔴 SALES - ONLY FOR MESS MODE */}
          <NavItem href="/sales" icon={<TrendingUp />} label="Sales" />
          <NavItem href="/reports" icon={<BarChart />} label="Reports" />
        </>
      )}
      
      {/* RESTAURANT MODE SPECIFIC - NO SALES */}
      {mode === 'restaurant' && (
        <>
          <NavItem href="/restaurant/menu" icon={<UtensilsCrossed />} label="Food Menu" />
          <NavItem href="/restaurant/kitchen" icon={<ChefHat />} label="Kitchen Portal" />
          <NavItem href="/tables" icon={<Grid />} label="Tables" />
          <NavItem href="/reservations" icon={<Calendar />} label="Reservations" />
          {/* ✅ NO SALES */}
        </>
      )}
      
      {/* CANTEEN MODE SPECIFIC - NO SALES */}
      {mode === 'canteen' && (
        <>
          <NavItem href="/canteen/menu" icon={<ShoppingCart />} label="Menu" />
          <NavItem href="/canteen/inventory" icon={<Package />} label="Inventory" />
          <NavItem href="/canteen/orders" icon={<Order />} label="Orders" />
          {/* ✅ NO SALES */}
        </>
      )}
      
      {/* COMMON */}
      <NavItem href="/settings" icon={<Settings />} label="Settings" />
    </nav>
  );
};
```

---

## STEP 2: Update Settings.tsx

**Location:** `src/pages/Settings.tsx`

```typescript
import { useAppMode } from "@/contexts/ModeContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Settings = () => {
  const { mode } = useAppMode();

  return (
    <Tabs defaultValue="general">
      <TabsList>
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="staff">Staff</TabsTrigger>
        
        {/* 🔴 ONLY SHOW SALES TAB FOR MESS MODE */}
        {mode === 'mess' && (
          <TabsTrigger value="sales">
            <TrendingUp size={16} className="mr-2" />
            Sales Configuration
          </TabsTrigger>
        )}
        
        <TabsTrigger value="billing">Billing</TabsTrigger>
      </TabsList>
      
      {/* Render only when mode is mess */}
      {mode === 'mess' && (
        <TabsContent value="sales">
          {/* Existing Sales settings */}
        </TabsContent>
      )}
    </Tabs>
  );
};
```

---

## STEP 3: Update RestaurantSettings.tsx

**Location:** `src/pages/RestaurantSettings.tsx`

```typescript
export const RestaurantSettings = () => {
  return (
    <Tabs defaultValue="details">
      <TabsList>
        <TabsTrigger value="details">Details</TabsTrigger>
        <TabsTrigger value="tables">Tables</TabsTrigger>
        <TabsTrigger value="tax">Tax</TabsTrigger>
        <TabsTrigger value="menu">Menu</TabsTrigger>
        {/* 🔴 REMOVE THIS:
        <TabsTrigger value="sales">Sales</TabsTrigger>
        */}
      </TabsList>
      
      {/* Remove this content:
      <TabsContent value="sales">
        <SalesPortal />
      </TabsContent>
      */}
    </Tabs>
  );
};
```

---

## STEP 4: Update MobileBottomNav.tsx

**Location:** `src/components/MobileBottomNav.tsx`

```typescript
import { useAppMode } from "@/contexts/ModeContext";

export const MobileBottomNav = () => {
  const { mode } = useAppMode();

  return (
    <div className="fixed bottom-0 left-0 right-0 flex gap-2 p-2 bg-white border-t">
      <NavButton icon={<Home />} href="/dashboard" label="Home" />
      
      {mode === 'mess' && (
        <>
          <NavButton icon={<Users />} href="/members" label="Members" />
          <NavButton icon={<TrendingUp />} href="/sales" label="Sales" />
        </>
      )}
      
      {mode === 'restaurant' && (
        <>
          <NavButton icon={<UtensilsCrossed />} href="/restaurant/menu" label="Menu" />
          <NavButton icon={<Grid />} href="/tables" label="Tables" />
        </>
      )}
      
      {mode === 'canteen' && (
        <>
          <NavButton icon={<ShoppingCart />} href="/canteen/menu" label="Menu" />
          <NavButton icon={<Package />} href="/canteen/inventory" label="Inventory" />
        </>
      )}
      
      <NavButton icon={<Settings />} href="/settings" label="Settings" />
    </div>
  );
};
```

---

## STEP 5: Create Route Guard for Sales Portal

**Location:** `src/pages/SalesPortal.tsx` (Update existing)

```typescript
import { useAppMode } from "@/contexts/ModeContext";
import { Navigate } from "react-router-dom";

export const SalesPortal = () => {
  const { mode } = useAppMode();

  // Only Mess mode can access Sales portal
  if (mode !== 'mess') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    // ... existing SalesPortal UI
  );
};
```

---

## STEP 6: Remove Sales Routes from App.tsx

**Location:** `src/App.tsx`

```typescript
// ❌ DELETE these routes if they exist:
/*
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
*/
```

---

## 📋 CHECKLIST

- [ ] Update `DesktopSidebar.tsx` - Add `useAppMode()` hook
- [ ] Add condition for Sales: `{mode === 'mess' && <NavItem ... />}`
- [ ] Update `Settings.tsx` - Conditionally show Sales tab
- [ ] Update `MobileBottomNav.tsx` - Mode-based navigation
- [ ] Update `SalesPortal.tsx` - Add route guard
- [ ] Update `RestaurantSettings.tsx` - Remove Sales tab
- [ ] Test: Switch to Restaurant mode → Sales hidden
- [ ] Test: Switch to Canteen mode → Sales hidden
- [ ] Test: Switch to Mess mode → Sales visible

---

## 🧪 TESTING

### Test 1: Mess Mode (Sales VISIBLE)
1. Switch to Mess mode
2. Sidebar shows: Dashboard, Members, Menu, Kitchen, **Sales**, Reports
3. Settings shows: General, Staff, **Sales Configuration**, Billing
4. Click Sales → Works

### Test 2: Restaurant Mode (Sales HIDDEN)
1. Switch to Restaurant mode
2. Sidebar shows: Dashboard, Food Menu, Kitchen Portal, Tables, Reservations
3. Settings shows: Details, Tables, Tax, Menu (NO Sales)
4. Try to access /sales → Redirected to /dashboard

### Test 3: Canteen Mode (Sales HIDDEN)
1. Switch to Canteen mode
2. Sidebar shows: Dashboard, Menu, Inventory, Orders
3. Settings shows: General (NO Sales)
4. Try to access /sales → Redirected to /dashboard

---

## 💾 FILES MODIFIED

```
✅ src/components/DesktopSidebar.tsx
✅ src/pages/Settings.tsx
✅ src/pages/RestaurantSettings.tsx
✅ src/components/MobileBottomNav.tsx
✅ src/pages/SalesPortal.tsx
✅ src/App.tsx
```

---

**Result:** Sales portals are completely hidden from Restaurant and Canteen modes while remaining fully functional for Mess mode.
