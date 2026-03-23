# MessFlow — Production Debug Checklist
## Date: 2026-03-23

### Critical Bugs
- [x] **BUG-01**: `generateUUID is not defined` — Removed id: from inserts in DeliveryManagement.tsx
- [x] **BUG-02**: RLS "permission denied" on drivers — Fixed in MASTER_MIGRATION
- [x] **BUG-03**: RLS "permission denied" on delivery_areas — Fixed in MASTER_MIGRATION
- [x] **BUG-04**: Zone page crashes after save — try/catch on member count query
- [x] **BUG-05**: Zone member count = 0 — Fixed in MASTER_MIGRATION (adds delivery_area_id column)
- [x] **BUG-06**: Rice type creation failing — Fixed in MASTER_MIGRATION (RLS + GRANT)

### Zone-Driver Assignment Refactor (2026-03-23)
- [x] **REFACTOR-01**: Removed batch-based delivery system
- [x] **REFACTOR-02**: Created driver_zone_mapping table (many-to-many relationship)
- [x] **REFACTOR-03**: Added driver_id to delivery_areas for zone assignment
- [x] **REFACTOR-04**: Refactored useDeliveryBatches.ts - removed batch hooks, added zone-driver mapping
- [x] **REFACTOR-05**: Created MergeZonesModal for combining zones
- [x] **REFACTOR-06**: Enhanced DeliveryZoneBox with merge functionality
- [x] **REFACTOR-07**: Updated DeliveryManagement.tsx for zone-based system
- [x] **REFACTOR-08**: Refactored DriverPortal.tsx to use zone-based deliveries

### Feature Enhancements
- [x] **FEAT-01**: Meal type expanded — 6 options: lunch, dinner, both, breakfast, breakfast+lunch, all three
- [x] **FEAT-03**: Skip weekends — description text "No Sat & Sun delivery" visible in both forms
- [x] **FEAT-04**: Free trial disabled when paid — toggle grayed out when isPaid=true
- [x] **FEAT-05**: Trial period customisable — 1/3/5/7/14/30 day selector in both forms
- [x] **GSD**: Protocol file updated with complete schema, RLS patterns, CSP rules, API docs
- [x] **MASTER_MIGRATION**: Single SQL file combining ALL pending schema + RLS changes

### ⚠️ USER ACTION REQUIRED
Run this ONE file in Supabase SQL Editor:
```
supabase/migrations/20260328_final_zone_driver_migration.sql
```
Then regenerate types:
```
npx supabase gen types typescript --project-id wgmbwjzvgxvqvpkgmydy > src/integrations/supabase/types.ts
```
Then restart: `npm run dev`

### Files Modified This Session
| File | Changes |
|------|---------|
| `src/hooks/useDeliveryBatches.ts` | Removed batch hooks, added zone-driver mapping hooks |
| `src/pages/DeliveryManagement.tsx` | Zone-based system, removed batch references |
| `src/pages/DriverPortal.tsx` | Refactored for zone-based deliveries |
| `src/components/DeliveryZoneBox.tsx` | Added merge functionality |
| `src/components/MergeZonesModal.tsx` | New component for merging zones |
| `supabase/migrations/20260328_final_zone_driver_migration.sql` | Zone-driver assignment migration |
| `.gsd/CHECKLIST.md` | This file |
