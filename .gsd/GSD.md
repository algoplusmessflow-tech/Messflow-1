# MessFlow — Get Shit Done (GSD) Protocol

## Project Identity
- **Name:** MessFlow (Mess Management SaaS)
- **Stack:** React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **Backend:** Supabase (PostgreSQL + Auth + RLS + Realtime)
- **Hosting:** Cloudflare Pages (SPA)
- **State:** TanStack React Query v5
- **Package Manager:** npm

## Architecture Rules

### File Structure
```
src/
├── components/          # Reusable UI components
│   ├── ui/              # shadcn/ui primitives (DO NOT EDIT)
│   └── *.tsx            # App-specific components
├── hooks/               # Custom React hooks (data fetching, business logic)
├── integrations/
│   └── supabase/
│       ├── client.ts    # Supabase client instance
│       └── types.ts     # AUTO-GENERATED — never edit manually
├── lib/                 # Utility functions (format, auth, pdf, etc.)
└── pages/               # Route-level page components
```

### Critical Constraints
1. **Supabase types are auto-generated.** Never edit `src/integrations/supabase/types.ts` manually. Run: `npx supabase gen types typescript --project-id <PROJECT_ID> > src/integrations/supabase/types.ts`
2. **RLS is mandatory.** Every table must have Row Level Security enabled with `owner_id = auth.uid()` policies.
3. **No `useAuth()` in page components.** Auth is handled inside hooks (`useMembers`, `useProfile`, etc.). Pages get `user` only when they need it for Supabase calls not covered by hooks.
4. **All Supabase queries go through hooks.** Pages should never import `supabase` directly unless absolutely necessary (e.g., one-off queries in Invoices).
5. **TanStack Query keys must include `user?.id`** for proper cache scoping.
6. **Mutations must invalidate their query keys** after success.
7. **Realtime subscriptions** are set up in hooks, not in page components.

### Deployment Constraints (Cloudflare/cPanel)
- No `vite-plugin-compression` (not supported)
- No `<noscript>` CSS fallbacks in `<head>`
- Always zip `dist/` contents (not the folder itself) for cPanel
- Use object-based `manualChunks` in vite config
- Test on mobile, not just desktop (PageSpeed target: 90+)

## Database Schema

### Current Tables
| Table | Purpose |
|-------|---------|
| `members` | Customer/subscriber records |
| `transactions` | Payment and charge history |
| `profiles` | Business owner settings |
| `invoices` | Invoice records |
| `invoice_items` | Line items per invoice |
| `invoice_settings` | Invoice numbering/prefix config |
| `delivery_areas` | Named delivery zones |
| `drivers` | Delivery driver records |
| `delivery_batches` | Grouped delivery runs |
| `batch_deliveries` | Individual deliveries in a batch |
| `expenses` | Business expense tracking |
| `inventory` | Ingredient/supply inventory |
| `inventory_consumption` | Daily consumption logs |
| `menu` | Weekly meal menus |
| `staff` | Employee records |
| `staff_attendance` | Attendance tracking |
| `salary_payments` | Salary disbursements |
| `salary_advances` | Advance payments |
| `petty_cash_transactions` | Petty cash register |
| `notifications` | In-app notifications |
| `broadcasts` | Bulk messages |
| `security_logs` | Auth/security events |
| `user_roles` | Super admin role assignments |

### Members Table (Extended — post migration)
```sql
-- Core fields
id, owner_id, name, phone, balance, monthly_fee, status, plan_type,
joining_date, plan_expiry_date, selected_menu_week,
-- New fields (2026-03-16 migration)
address, delivery_area_id (FK → delivery_areas), special_notes,
meal_type, roti_quantity, rice_type, dietary_preference,
payment_status, pause_service, skip_weekends, free_trial
```

### Enums
- `plan_type`: '1-time' | '2-time' | '3-time' | 'custom'
- `member_status`: 'active' | 'inactive'
- `meal_type_enum`: 'lunch' | 'dinner' | 'both'
- `dietary_pref_enum`: 'veg' | 'non_veg' | 'both'
- `rice_type_enum`: 'none' | 'white_rice' | 'brown_rice' | 'jeera_rice' | 'biryani'

## Coding Standards

### Component Patterns
- Use functional components with hooks
- Prefer `useMemo` for derived data, `useState` for UI state
- Loading states: use `<Skeleton>` from shadcn/ui
- Error states: use `ErrorBoundary` wrapper
- Forms: controlled components with `useState`, not react-hook-form
- Icons: import from `lucide-react` only

### Styling
- Tailwind CSS utility classes only
- No inline styles, no CSS modules
- Use shadcn/ui components for all UI primitives
- Dark mode: use `text-foreground`, `bg-background`, `bg-muted` etc.
- Mobile-first: always test at 400px width

### Data Fetching
```typescript
// Pattern: useQuery in a custom hook
const { data, isLoading } = useQuery({
  queryKey: ['entity', user?.id],
  queryFn: async () => { /* supabase call */ },
  enabled: !!user,
});

// Pattern: mutation with cache invalidation
const mutation = useMutation({
  mutationFn: async (data) => { /* supabase call */ },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['entity', user?.id] });
    toast.success('Done!');
  },
});
```

### Error Handling
- Supabase errors: catch, log to console, show `toast.error()`
- Never throw unhandled errors in async functions
- Always provide fallback UI for missing data

## Agent Instructions
When an AI agent works on this codebase:
1. **Read this file first** before making any changes
2. **Never create placeholder comments** like `{/* ... (same as original) ... */}`
3. **Never gut existing working code** — if rewriting a file, ensure 100% feature parity
4. **Run `npm run build`** after changes to verify no TypeScript errors
5. **Check the Supabase types** match the database before writing queries
6. **Test at 400px mobile width** for all UI changes
7. **Preserve all existing imports** — don't remove unused-looking imports without verifying
8. **Keep `.env` credentials out of commits** — never log, print, or expose them

## Common Pitfalls (Learned from Experience)
- Vibe-coding agents often replace working sections with `{/* ... */}` placeholders — NEVER do this
- Supabase join syntax: use `table_name:foreign_key (columns)` not `alias (columns)`
- `plan_type` enum in Supabase must match the TypeScript enum exactly
- `date-fns` `format()` is used for date display — always import it
- WhatsApp phone formatting: strip spaces/dashes, add country code `971` for UAE
- The `useMembers` hook types come from auto-generated Supabase types — after schema changes, regenerate types before updating the hook
