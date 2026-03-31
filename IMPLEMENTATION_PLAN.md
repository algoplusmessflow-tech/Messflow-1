# 🎯 MESSFLOW MODE-ISOLATED ARCHITECTURE

## OBJECTIVES BREAKDOWN

### 1. **SEPARATE MENU MANAGEMENT PER MODE**
- ✅ Restaurant Mode: `restaurants.menu_items` table (video-style UI)
- ✅ Mess Mode: `mess.menu_items` table (existing)
- ✅ Canteen Mode: `canteen.menu_items` table (new)
- ✅ **ZERO data sharing** between modes

### 2. **MODE-SPECIFIC KITCHEN PORTALS**
- ✅ Restaurant Kitchen Portal (mode: restaurant)
- ✅ Mess Kitchen Portal (mode: mess)
- ✅ Canteen Kitchen Portal (mode: canteen)
- ✅ Each has own data schema, UI, and logic

### 3. **ISOLATED SETTINGS PER MODE**
- ✅ Restaurant Settings: Menu, Tables, Taxes, Details
- ✅ Mess Settings: Members, Plans, Pricing
- ✅ Canteen Settings: Inventory, Pricing
- ✅ **NO shared portals** (Sales, Customer, Driver)

---

## ARCHITECTURE LAYERS

### Layer 1: Database Schema (Mode-Isolated)
```
restaurants.* (Restaurant mode)
├── venues
├── tables
├── menu_items       ← NEW (video-style)
├── kitchen_orders   ← NEW (standalone)
├── table_locks
└── reservations

mess.* (Mess mode - existing)
├── members
├── meal_plans
├── menu_items       ← Separate from restaurant
└── kitchen_prep

canteen.* (Canteen mode - NEW)
├── inventory
├── menu_items       ← Separate schema
├── daily_sales
└── kitchen_orders
```

### Layer 2: Services (Mode-Specific)
```
services/
├── restaurant/
│   ├── restaurantMenuService.ts
│   ├── restaurantKitchenService.ts
│   └── restaurantTableService.ts
├── mess/
│   ├── messMenuService.ts
│   ├── messKitchenService.ts
│   └── messMemberService.ts
└── canteen/
    ├── canteenMenuService.ts
    ├── canteenInventoryService.ts
    └── canteenKitchenService.ts
```

### Layer 3: Components (Mode-Specific)
```
components/
├── restaurant/
│   ├── RestaurantMenuManager.tsx      ← Video-style
│   ├── RestaurantKitchenPortal.tsx
│   └── RestaurantSettings.tsx
├── mess/
│   ├── MessMenuManager.tsx
│   ├── MessKitchenPortal.tsx
│   └── MessSettings.tsx
└── canteen/
    ├── CanteenMenuManager.tsx
    ├── CanteenKitchenPortal.tsx
    └── CanteenSettings.tsx
```

### Layer 4: Pages (Mode-Router)
```
pages/
├── RestaurantHome.tsx     (routes to /restaurant/menu, /restaurant/kitchen, /restaurant/settings)
├── MessHome.tsx           (routes to /mess/menu, /mess/kitchen, /mess/settings)
├── CanteenHome.tsx        (routes to /canteen/menu, /canteen/kitchen, /canteen/settings)
└── ModeSelector.tsx       (initial mode selection)
```

---

## DATABASE SCHEMA CHANGES

### restaurants.menu_items (Video-Style UI)
```sql
CREATE TABLE restaurants.menu_items (
  id UUID PRIMARY KEY,
  venue_id UUID REFERENCES restaurants.venues,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category VARCHAR(100),
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  prep_time_minutes INTEGER,
  kitchen_notes TEXT,
  ingredients JSONB,
  allergens JSONB,
  calories INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### restaurants.kitchen_orders (Standalone)
```sql
CREATE TABLE restaurants.kitchen_orders (
  id UUID PRIMARY KEY,
  venue_id UUID REFERENCES restaurants.venues,
  order_number INTEGER,
  table_id UUID REFERENCES restaurants.tables,
  items JSONB NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  priority VARCHAR(20) DEFAULT 'normal',
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);
```

---

## IMPLEMENTATION PHASES

### Phase 1: Database Schema
- ✅ Create mode-isolated tables
- ✅ Add RLS policies per mode
- ✅ Create indexes for performance

### Phase 2: Backend Services
- ✅ RestaurantMenuService
- ✅ RestaurantKitchenService
- ✅ Mode-specific TypeScript types

### Phase 3: Frontend Components
- ✅ Video-style Restaurant Menu UI
- ✅ Mode-specific Kitchen Portals
- ✅ Isolated Settings pages

### Phase 4: Integration & Testing
- ✅ Test data isolation
- ✅ Test mode switching
- ✅ End-to-end flows

---

## KEY DELIVERABLES

1. **Mode-Isolated SQL Schema** ✅
2. **Restaurant Menu Service** ✅
3. **Restaurant Menu UI (Video-Style)** ✅
4. **Restaurant Kitchen Portal** ✅
5. **Restaurant Settings (No Sales/Customer)** ✅
6. **Mess & Canteen Updates** ✅
7. **Mode Router Logic** ✅
8. **Testing & Documentation** ✅
