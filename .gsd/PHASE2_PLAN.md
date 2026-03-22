# MessFlow — Phase 2 Complete + Phase 3 Started
## Date: 2026-03-20

### Phase 2 — All Complete
- [x] Zone km perimeter + member auto-assignment + manual text input
- [x] Delivery tab cleanup (rename, remove add area)
- [x] Customer portal — username/password auth with credential generation
- [x] Kitchen Team Portal — anonymous prep view, PDF, labels (A4/50mm/80mm)
- [x] Kitchen portal — inventory request from stock
- [x] Sales portal — tabs (Customers/Menu/Delivery), bulk delete request
- [x] Super Admin "API & Services" tab (Google OAuth, Maps, Cloudinary, WhatsApp)
- [x] usePlatformConfig shared hook
- [x] Portal links use window.location.origin
- [x] Storage limit 2.5GB, duplicate portals removed

### Phase 3 — Google Drive Integration (Complete)
- [x] `src/lib/google-drive.ts` — OAuth flow, token management, Drive upload, folder creation
- [x] `src/lib/upload-service.ts` — Unified router: Google Drive → Cloudinary fallback
- [x] `src/pages/GoogleCallback.tsx` — OAuth callback handler
- [x] `src/pages/Settings.tsx` — "Connect Google Drive" card in Storage tab
- [x] `src/hooks/useStorageManager.ts` — Uses unified upload (skips storage tracking for Drive)
- [x] `src/hooks/useMapConfig.ts` — Falls back to platform Google Maps key from SuperAdmin
- [x] CSP updated for oauth2.googleapis.com + www.googleapis.com
- [x] Route added: /auth/google/callback
- [x] FINAL_COMBINED_MIGRATION.sql — single file with ALL schema changes

### Architecture Flow
```
SuperAdmin → API & Services → Sets Google Client ID/Secret + Maps Key
                ↓
    Stored in profiles.platform_api_config (JSONB)
                ↓
    usePlatformConfig() hook reads it for any page
                ↓
User Settings → Storage tab → "Connect Google" button
                ↓
    OAuth popup → User signs in → Grants Drive access
                ↓
    Tokens saved to user's profile
                ↓
    useStorageManager → uploadReceipt → upload-service.ts
                ↓
    Checks storage_provider → 'google_drive' ? → Upload to user's Drive
                              'cloudinary'    → Upload to Cloudinary
```

### Migration Required
Run ONE file in Supabase SQL Editor:
```
supabase/migrations/FINAL_COMBINED_MIGRATION.sql
```
Then:
```
npx supabase gen types typescript --project-id wgmbwjzvgxvqvpkgmydy > src/integrations/supabase/types.ts
```

### Files Created/Modified This Sprint
| File | Action |
|------|--------|
| `src/lib/google-drive.ts` | NEW — Google Drive OAuth + upload |
| `src/lib/upload-service.ts` | NEW — Unified upload router |
| `src/lib/credentials.ts` | NEW — Portal credential generation |
| `src/pages/GoogleCallback.tsx` | NEW — OAuth callback page |
| `src/pages/KitchenPortal.tsx` | NEW — External kitchen dashboard |
| `src/pages/SalesPortal.tsx` | REWRITE — Tabs, bulk delete, menu, delivery |
| `src/pages/CustomerPortal.tsx` | MODIFIED — Username/password auth |
| `src/pages/Members.tsx` | MODIFIED — Credentials, zone select, trial days |
| `src/pages/Settings.tsx` | MODIFIED — Google Drive card, kitchen link, cleanup |
| `src/pages/SuperAdmin.tsx` | MODIFIED — API & Services tab |
| `src/pages/DeliveryZones.tsx` | REWRITE — Km perimeter, auto-assign |
| `src/pages/DeliveryManagement.tsx` | MODIFIED — Join fixes, zone rename |
| `src/hooks/useMapConfig.ts` | MODIFIED — Platform Maps key fallback |
| `src/hooks/useStorageManager.ts` | MODIFIED — Unified upload service |
| `src/hooks/useSuperAdmin.ts` | MODIFIED — updatePlatformApiConfig |
| `src/hooks/usePlatformConfig.ts` | NEW — Shared platform config hook |
| `src/lib/geolocation.ts` | MODIFIED — Haversine, dedup fix |
| `src/App.tsx` | MODIFIED — Kitchen/Google routes |
| `index.html` | MODIFIED — CSP for all APIs |
