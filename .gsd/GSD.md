# MessFlow — Get Shit Done (GSD) Protocol

## Project Identity
- **Name:** MessFlow (Mess Management SaaS)
- **Stack:** React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **Backend:** Supabase (PostgreSQL + Auth + RLS + Realtime)
- **Hosting:** Cloudflare Pages (SPA)
- **State:** TanStack React Query v5
- **Package Manager:** npm
- **Supabase Project ID:** wgmbwjzvgxvqvpkgmydy

## Architecture Rules

### File Structure
```
src/
├── components/          # Reusable UI components
│   ├── ui/              # shadcn/ui primitives (DO NOT EDIT)
│   ├── InlineAddSelect  # Dropdown with inline add/edit capability
│   └── *.tsx            # App-specific components
├── hooks/               # Custom React hooks (data fetching, business logic)
│   ├── useMembers.ts    # Members CRUD + realtime
│   ├── useProfile.ts    # Profile/settings
│   ├── useMapConfig.ts  # Map API config from profile
│   └── *.ts
├── integrations/
│   └── supabase/
│       ├── client.ts    # Supabase client instance
│       └── types.ts     # AUTO-GENERATED — never edit manually
├── lib/
│   ├── auth.tsx         # Auth context + provider
│   ├── format.ts        # Currency, date, expiry utilities
│   ├── geolocation.ts   # Multi-provider geocoding (Google/Mapbox/HERE/LocationIQ/OSM)
│   └── *.ts
└── pages/               # Route-level page components
    ├── Members.tsx       # Member management (1800+ lines, main CRUD page)
    ├── DeliveryZones.tsx # Zone CRUD with location lookup
    ├── DeliveryManagement.tsx # Batch delivery, driver assignment
    ├── Invoices.tsx      # Invoice management
    └── *.tsx
```

### Critical Constraints
1. **Supabase types are auto-generated.** Never edit `src/integrations/supabase/types.ts` manually. Regenerate: `npx supabase gen types typescript --project-id wgmbwjzvgxvqvpkgmydy > src/integrations/supabase/types.ts`
2. **RLS is mandatory.** Every table must have `ENABLE ROW LEVEL SECURITY` + `GRANT ALL ON table TO authenticated` + per-operation policies using `owner_id = auth.uid()`.
3. **All new columns need `as any` casts** until types are regenerated. Pattern: `await addMember.mutateAsync({ ...data } as any)`
4. **TanStack Query keys must include `user?.id`** for proper cache scoping.
5. **Mutations must invalidate their query keys** after success.
6. **CSP in index.html** must include any external API domains in `connect-src`. Google Maps also needs `script-src`.

### Content Security Policy (index.html)
Currently allowed external domains in `connect-src`:
- `*.supabase.co`, `accounts.google.com`, `api.cloudinary.com`, `cloudflareinsights.com`
- `nominatim.openstreetmap.org`, `maps.googleapis.com`, `api.mapbox.com`
- `geocode.search.hereapi.com`, `us1.locationiq.com`, `geocode.maps.co`
**If adding a new external API, you MUST add its domain to CSP in index.html.**

## Database Schema

### Members Table (Full — post 2026-03-18 migration)
| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | UUID | auto | PK |
| owner_id | UUID | - | FK auth.users |
| name | TEXT | - | required |
| phone | TEXT | - | required |
| balance | NUMERIC | 0 | outstanding amount |
| monthly_fee | NUMERIC | 0 | |
| status | member_status enum | 'active' | active/inactive |
| plan_type | plan_type enum | '3-time' | 1-time/2-time/3-time/custom |
| joining_date | TIMESTAMPTZ | now() | |
| plan_expiry_date | TIMESTAMPTZ | null | |
| selected_menu_week | INTEGER | 1 | |
| address | TEXT | null | delivery address |
| delivery_area_id | UUID | null | FK delivery_areas |
| special_notes | TEXT | null | allergies, preferences |
| meal_type | TEXT | 'both' | lunch/dinner/both/breakfast/breakfast_lunch/all_three |
| roti_quantity | INTEGER | 2 | |
| rice_type | TEXT | 'white_rice' | custom values via rice_options table |
| dietary_preference | TEXT | 'both' | veg/non_veg/both |
| pause_service | BOOLEAN | false | temporarily stop deliveries |
| skip_weekends | BOOLEAN | false | no Sat/Sun delivery |
| free_trial | BOOLEAN | false | trial period active |
| trial_days | INTEGER | null | 1/3/5/7/14/30 day trial duration |

### Other Key Tables
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `profiles` | Business settings | business_name, tax_trn, map_api_key, map_api_provider, whatsapp_api_key |
| `delivery_areas` | Named zones | name, description, owner_id, center_lat, center_lng, radius_km, driver_id |
| `rice_options` | Custom rice types per owner | name, label, sort_order, owner_id |
| `drivers` | Delivery drivers | name, phone, access_code, status |
| `driver_zone_mapping` | Driver-zone assignments | driver_id, zone_id, assigned_at (many-to-many) |
| `invoices` | Invoice records | invoice_number, member_id, total_amount, status |
| `transactions` | Payment/charge history | member_id, amount, type |

### RLS Pattern (every table)
```sql
ALTER TABLE public.TABLE ENABLE ROW LEVEL SECURITY;
CREATE POLICY "t_s" ON public.TABLE FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "t_i" ON public.TABLE FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "t_u" ON public.TABLE FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "t_d" ON public.TABLE FOR DELETE USING (owner_id = auth.uid());
GRANT ALL ON public.TABLE TO authenticated;
```
**CRITICAL: The `GRANT ALL` line is required. Without it, even correct policies will fail with "permission denied".**

## API Integration Architecture

### Map/Geocoding API
- Configured in Settings → Integrations → Map API
- Stored in `profiles`: `map_api_key`, `map_api_provider`, `custom_map_base_url`
- Used via: `import { useMapConfig } from '@/hooks/useMapConfig'` + `fetchLocationFromAddress(address, mapConfig)`
- **Google Maps uses JS Geocoder** (not REST API) to avoid CORS — script loaded dynamically
- Other providers (LocationIQ, Mapbox, HERE) use CORS-friendly REST APIs
- Default: OpenStreetMap Nominatim (free, no key needed)

### WhatsApp API
- Stored in `profiles`: `whatsapp_api_key`
- Currently uses `wa.me` links (no API integration yet)

### Custom Options (InlineAddSelect pattern)
- Rice types: `rice_options` table, managed inline from Members form
- Delivery zones: `delivery_areas` table, managed inline + dedicated /zones page
- Pattern: dropdown with + button → inline input → creates DB record → auto-selects

## Coding Standards

### Component Patterns
- Functional components with hooks only
- `useMemo` for derived data, `useState` for UI state
- Loading: `<Skeleton>` from shadcn/ui
- Error: `ErrorBoundary` wrapper
- Forms: controlled `useState`, NOT react-hook-form
- Icons: `lucide-react` only
- Dropdowns with add/edit: use `InlineAddSelect` component

### Data Fetching
```typescript
const { data, isLoading } = useQuery({
  queryKey: ['entity', user?.id],
  queryFn: async () => { /* supabase call */ },
  enabled: !!user,
  staleTime: 30000, // 30s cache for non-critical data
});
```

### Error Handling
- Supabase errors: catch → `console.error()` → `toast.error()`
- Fallback data: return `[]` or `null` on failure, never throw unhandled
- RLS errors: check GRANT exists, not just policies

## Agent Instructions
1. **Read this file + .gsd/CHECKLIST.md** before any changes
2. **NEVER create `{/* ... (same as original) ... */}` placeholders**
3. **NEVER gut existing working code** — 100% feature parity required
4. **After schema changes:** run migration SQL, then `npx supabase gen types typescript --project-id wgmbwjzvgxvqvpkgmydy > src/integrations/supabase/types.ts`
5. **After code changes:** `npm run build` to verify TypeScript
6. **Test at 400px mobile width**
7. **Keep .env out of output**
8. **New external API domain?** Add to CSP `connect-src` in index.html
9. **New table?** Add RLS policies + GRANT + add to this doc

## Common Pitfalls
- `GRANT ALL ON table TO authenticated` is REQUIRED alongside RLS policies
- Google Maps Geocoding REST API blocks CORS — use JS Geocoder instead
- CSP in index.html blocks any fetch to domains not in `connect-src`
- Don't pass `id:` in Supabase inserts — let `gen_random_uuid()` handle it
- `as any` casts needed when using columns not yet in regenerated types
- Supabase join: `table:fk_column(cols)` — PostgREST auto-resolves short aliases too
- WhatsApp phone: strip spaces/dashes, prepend `971` for UAE numbers
