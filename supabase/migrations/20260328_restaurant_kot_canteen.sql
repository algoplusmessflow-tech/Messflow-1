-- =====================================================
-- MessFlow v2: Restaurant + KOT + Canteen Enhancement
-- Run AFTER existing migrations
-- =====================================================

-- 1. Add business_type to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_type TEXT DEFAULT 'mess';
-- Values: 'mess', 'restaurant', 'canteen', 'cloud_kitchen'

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_features JSONB DEFAULT '{}';
-- Stores mode-specific overrides: {"delivery_enabled": true, "tables_enabled": false}

-- =====================================================
-- 2. Restaurant Tables
-- =====================================================
CREATE TABLE IF NOT EXISTS public.restaurant_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                       -- "Table 1", "VIP Booth", "Counter"
  capacity INTEGER DEFAULT 4,               -- seats
  zone TEXT DEFAULT 'indoor',               -- indoor, outdoor, terrace, bar
  status TEXT DEFAULT 'available',          -- available, occupied, reserved, cleaning
  qr_code TEXT,                             -- unique QR identifier
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rest_tables_owner ON public.restaurant_tables(owner_id);
CREATE INDEX IF NOT EXISTS idx_rest_tables_status ON public.restaurant_tables(owner_id, status);

-- =====================================================
-- 3. Orders (replaces per-table billing)
-- Works for: dine-in, takeaway, delivery, canteen tokens
-- =====================================================
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  table_id UUID REFERENCES public.restaurant_tables(id) ON DELETE SET NULL,
  order_number TEXT NOT NULL,               -- ORD-001 (daily sequential)
  order_type TEXT DEFAULT 'dine_in',        -- dine_in, takeaway, delivery, canteen_token
  status TEXT DEFAULT 'open',               -- open, preparing, ready, served, paid, cancelled
  subtotal NUMERIC DEFAULT 0,
  tax_rate NUMERIC DEFAULT 5,               -- percentage
  tax_amount NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  payment_method TEXT DEFAULT 'pending',    -- pending, cash, card, online, split
  payment_status TEXT DEFAULT 'unpaid',     -- unpaid, paid, partial
  waiter_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  customer_name TEXT,
  customer_phone TEXT,
  member_id UUID REFERENCES public.members(id) ON DELETE SET NULL, -- for canteen/mess link
  pax INTEGER DEFAULT 1,                    -- number of guests
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_orders_owner ON public.orders(owner_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(owner_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_table ON public.orders(table_id);
CREATE INDEX IF NOT EXISTS idx_orders_date ON public.orders(created_at DESC);

-- =====================================================
-- 4. Order Items
-- =====================================================
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,                  -- denormalized for speed & history
  item_category TEXT,                       -- starter, main, dessert, drink
  quantity INTEGER DEFAULT 1,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,             -- qty x unit_price
  status TEXT DEFAULT 'pending',            -- pending, sent_to_kitchen, preparing, ready, served, cancelled
  special_notes TEXT,                       -- "No onion", "Extra spicy"
  kot_id UUID,                              -- links to KOT ticket
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_status ON public.order_items(status);

-- =====================================================
-- 5. KOT Tickets (Kitchen Order Tickets)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.kot_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  ticket_number TEXT NOT NULL,              -- KOT-001 (daily sequential)
  kot_type TEXT DEFAULT 'new',              -- new, modification, cancellation, refire
  status TEXT DEFAULT 'pending',            -- pending, preparing, ready, served
  printed BOOLEAN DEFAULT false,
  -- Denormalized for kitchen display speed (avoid joins)
  table_name TEXT,
  waiter_name TEXT,
  order_type TEXT DEFAULT 'dine_in',
  pax INTEGER DEFAULT 1,
  items_summary TEXT,                       -- "2x Biryani, 1x Roti" (quick glance)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kot_owner ON public.kot_tickets(owner_id);
CREATE INDEX IF NOT EXISTS idx_kot_status ON public.kot_tickets(owner_id, status);
CREATE INDEX IF NOT EXISTS idx_kot_date ON public.kot_tickets(created_at DESC);

-- =====================================================
-- 6. Menu Items (enhanced for restaurant ordering)
-- Extends the existing weekly_menus concept
-- =====================================================
CREATE TABLE IF NOT EXISTS public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'main',             -- starter, main, dessert, drink, side
  price NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  is_available BOOLEAN DEFAULT true,        -- kitchen can toggle "sold out"
  is_veg BOOLEAN DEFAULT false,
  preparation_time INTEGER DEFAULT 15,      -- minutes (for KDS time tracking)
  sort_order INTEGER DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_menu_items_owner ON public.menu_items(owner_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON public.menu_items(owner_id, category);

-- =====================================================
-- 7. Canteen Tokens (for institutional canteens)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.canteen_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  token_date DATE NOT NULL DEFAULT CURRENT_DATE,
  meal_type TEXT NOT NULL,                  -- breakfast, lunch, dinner, snack
  status TEXT DEFAULT 'unused',             -- unused, consumed, expired
  consumed_at TIMESTAMPTZ,
  scanned_by TEXT,                          -- staff who scanned
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(member_id, token_date, meal_type)  -- one token per meal per day
);

CREATE INDEX IF NOT EXISTS idx_tokens_owner ON public.canteen_tokens(owner_id);
CREATE INDEX IF NOT EXISTS idx_tokens_date ON public.canteen_tokens(owner_id, token_date);

-- =====================================================
-- 8. RLS Policies (owner-scoped, consistent pattern)
-- =====================================================
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kot_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canteen_tokens ENABLE ROW LEVEL SECURITY;

-- Restaurant Tables
CREATE POLICY "rt_auth_all" ON public.restaurant_tables FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- Orders
CREATE POLICY "orders_auth_all" ON public.orders FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
-- Anon can read orders (for customer portal / waiter portal)
CREATE POLICY "orders_anon_read" ON public.orders FOR SELECT TO anon USING (true);

-- Order Items (access via order ownership)
CREATE POLICY "oi_auth_all" ON public.order_items FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.owner_id = auth.uid())
);
CREATE POLICY "oi_anon_read" ON public.order_items FOR SELECT TO anon USING (true);

-- KOT Tickets
CREATE POLICY "kot_auth_all" ON public.kot_tickets FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "kot_anon_read" ON public.kot_tickets FOR SELECT TO anon USING (true);
CREATE POLICY "kot_anon_update" ON public.kot_tickets FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Menu Items
CREATE POLICY "mi_auth_all" ON public.menu_items FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "mi_anon_read" ON public.menu_items FOR SELECT TO anon USING (true);

-- Canteen Tokens
CREATE POLICY "ct_auth_all" ON public.canteen_tokens FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- =====================================================
-- 9. Grants
-- =====================================================
GRANT ALL ON public.restaurant_tables TO authenticated;
GRANT ALL ON public.orders TO authenticated;
GRANT ALL ON public.order_items TO authenticated;
GRANT ALL ON public.kot_tickets TO authenticated;
GRANT ALL ON public.menu_items TO authenticated;
GRANT ALL ON public.canteen_tokens TO authenticated;

GRANT SELECT ON public.orders TO anon;
GRANT SELECT ON public.order_items TO anon;
GRANT SELECT, UPDATE ON public.kot_tickets TO anon;
GRANT SELECT ON public.menu_items TO anon;

-- =====================================================
-- 10. Helper: Daily sequential order/KOT number generator
-- =====================================================
CREATE OR REPLACE FUNCTION public.next_order_number(p_owner_id UUID)
RETURNS TEXT AS $$
DECLARE
  today_count INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO today_count
  FROM public.orders
  WHERE owner_id = p_owner_id
    AND created_at::date = CURRENT_DATE;
  RETURN 'ORD-' || LPAD(today_count::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.next_kot_number(p_owner_id UUID)
RETURNS TEXT AS $$
DECLARE
  today_count INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO today_count
  FROM public.kot_tickets
  WHERE owner_id = p_owner_id
    AND created_at::date = CURRENT_DATE;
  RETURN 'KOT-' || LPAD(today_count::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated
GRANT EXECUTE ON FUNCTION public.next_order_number(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.next_kot_number(UUID) TO authenticated;

-- =====================================================
-- 11. Realtime: Enable for KOT (kitchen gets instant updates)
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.kot_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.restaurant_tables;

-- Verify
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename IN ('restaurant_tables','orders','order_items','kot_tickets','menu_items','canteen_tokens')
ORDER BY tablename, cmd;
