# SPEC.md

## UI Refinement (Members Page)
- **File:** `src/pages/Members.tsx`
- **Change:** Remove the external “+” button that appears next to the **Delivery Area / Zone** and **Rice Type** dropdowns. The `InlineAddSelect` component already provides an “Add new …” entry inside the dropdown, making the extra button redundant. No other layout changes are required.

## Geo‑spatial Delivery Zones
- **Database Migration:** Add geographic columns to `delivery_areas`.
  - **File:** `supabase/migrations/20260318_add_geo_spatial_columns.sql`
  - **SQL:**
    ```sql
    ALTER TABLE public.delivery_areas
      ADD COLUMN IF NOT EXISTS location GEOGRAPHY(Point, 4326),
      ADD COLUMN IF NOT EXISTS radius_km DOUBLE PRECISION DEFAULT 5;
    ```
- **Backend:** Existing Supabase hooks interact with `delivery_areas` via `id`, `name`, etc. No compile‑time changes are needed because the new columns are optional (`IF NOT EXISTS`). Future code can read/write `location` and `radius_km` when needed.

## Acceptance Criteria
1. The **Add Member** dialog no longer shows a separate plus button next to the two dropdown fields; the UI remains aligned and responsive at 400 px width.
2. The migration runs without errors and adds the `location` (PostGIS geography) and `radius_km` columns to `delivery_areas`.
3. Project type‑checks (`npm run build` / `tsc`) succeed.
