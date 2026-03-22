# MessFlow — Production Debug Checklist
## Date: 2026-03-18

### Critical Bugs
- [x] **BUG-01**: `generateUUID is not defined` — Removed id: from inserts in DeliveryManagement.tsx
- [x] **BUG-02**: RLS "permission denied" on drivers — Fixed in MASTER_MIGRATION
- [x] **BUG-03**: RLS "permission denied" on delivery_areas — Fixed in MASTER_MIGRATION
- [x] **BUG-04**: Zone page crashes after save — try/catch on member count query
- [x] **BUG-05**: Zone member count = 0 — Fixed in MASTER_MIGRATION (adds delivery_area_id column)
- [x] **BUG-06**: Rice type creation failing — Fixed in MASTER_MIGRATION (RLS + GRANT)

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
supabase/migrations/20260318_MASTER_MIGRATION.sql
```
Then regenerate types:
```
npx supabase gen types typescript --project-id wgmbwjzvgxvqvpkgmydy > src/integrations/supabase/types.ts
```
Then restart: `npm run dev`

### Files Modified This Session
| File | Changes |
|------|---------|
| `src/pages/DeliveryManagement.tsx` | Removed generateUUID() calls |
| `src/pages/DeliveryZones.tsx` | Error handling, location lookup with useMapConfig |
| `src/pages/Members.tsx` | Meal type expanded, trial days, skip weekends descriptions |
| `src/lib/geolocation.ts` | Multi-provider geocoding with Google JS Geocoder |
| `src/hooks/useMapConfig.ts` | Map API config from profile |
| `src/components/InlineAddSelect.tsx` | Reusable dropdown with inline add/edit |
| `src/pages/Settings.tsx` | Map API save error handling |
| `index.html` | CSP connect-src + script-src for geocoding APIs |
| `.gsd/GSD.md` | Complete protocol documentation |
| `.gsd/CHECKLIST.md` | This file |
| `CLAUDE.md` | Root-level agent instructions |
| `supabase/migrations/20260318_MASTER_MIGRATION.sql` | All-in-one migration |
