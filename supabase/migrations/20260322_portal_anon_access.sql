-- =====================================================
-- MESSFLOW — Portal Access Policies (anon role)
-- Date: 2026-03-22
-- 
-- Portals (Customer, Driver, Kitchen, Sales) are PUBLIC pages.
-- They use the Supabase anon key (no auth session).
-- These policies grant limited read access for portal functionality.
-- =====================================================

-- ═══ PROFILES: anon can read for portal slug resolution ═══
DO $x$ BEGIN
  CREATE POLICY "profiles_anon_read_portal" ON public.profiles FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $x$;
GRANT SELECT ON public.profiles TO anon;

-- ═══ MEMBERS: anon can read + insert for portal login and self-registration ═══
DO $x$ BEGIN
  CREATE POLICY "members_anon_read_portal" ON public.members FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $x$;
DO $x$ BEGIN
  CREATE POLICY "members_anon_insert_register" ON public.members FOR INSERT TO anon WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $x$;
GRANT SELECT, INSERT ON public.members TO anon;

-- ═══ MENU: anon can read for sales portal menu view ═══
DO $x$ BEGIN
  CREATE POLICY "menu_anon_read_portal" ON public.menu FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $x$;
GRANT SELECT ON public.menu TO anon;

-- ═══ DELIVERY_AREAS: anon can read for sales/driver portal ═══
DO $x$ BEGIN
  CREATE POLICY "delivery_areas_anon_read" ON public.delivery_areas FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $x$;
GRANT SELECT ON public.delivery_areas TO anon;

-- ═══ DRIVERS: anon can read for driver/sales portal ═══
DO $x$ BEGIN
  CREATE POLICY "drivers_anon_read_portal" ON public.drivers FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $x$;
GRANT SELECT ON public.drivers TO anon;

-- ═══ INVOICES: anon can read for customer portal ═══
DO $x$ BEGIN
  CREATE POLICY "invoices_anon_read_portal" ON public.invoices FOR SELECT TO anon USING (true);
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_object THEN NULL; END $x$;
DO $x$ BEGIN EXECUTE 'GRANT SELECT ON public.invoices TO anon'; EXCEPTION WHEN undefined_table THEN NULL; END $x$;

-- ═══ INVOICE_ITEMS: anon can read for customer portal ═══
DO $x$ BEGIN
  CREATE POLICY "invoice_items_anon_read" ON public.invoice_items FOR SELECT TO anon USING (true);
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_object THEN NULL; END $x$;
DO $x$ BEGIN EXECUTE 'GRANT SELECT ON public.invoice_items TO anon'; EXCEPTION WHEN undefined_table THEN NULL; END $x$;

-- ═══ SALES_PERSONS: anon can read + insert for sales portal ═══
DO $x$ BEGIN
  CREATE POLICY "sales_persons_anon_read" ON public.sales_persons FOR SELECT TO anon USING (true);
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_object THEN NULL; END $x$;
DO $x$ BEGIN
  CREATE POLICY "sales_persons_anon_insert" ON public.sales_persons FOR INSERT TO anon WITH CHECK (true);
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_object THEN NULL; END $x$;
DO $x$ BEGIN EXECUTE 'GRANT SELECT, INSERT ON public.sales_persons TO anon'; EXCEPTION WHEN undefined_table THEN NULL; END $x$;

-- ═══ DELETION_REQUESTS: anon can insert (sales portal delete requests) ═══
DO $x$ BEGIN
  CREATE POLICY "deletion_requests_anon_insert" ON public.deletion_requests FOR INSERT TO anon WITH CHECK (true);
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_object THEN NULL; END $x$;
DO $x$ BEGIN EXECUTE 'GRANT INSERT ON public.deletion_requests TO anon'; EXCEPTION WHEN undefined_table THEN NULL; END $x$;

-- ═══ BATCH_DELIVERIES: anon can read + update (driver portal marks deliveries) ═══
DO $x$ BEGIN
  CREATE POLICY "batch_deliveries_anon_read" ON public.batch_deliveries FOR SELECT TO anon USING (true);
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_object THEN NULL; END $x$;
DO $x$ BEGIN
  CREATE POLICY "batch_deliveries_anon_update" ON public.batch_deliveries FOR UPDATE TO anon USING (true) WITH CHECK (true);
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_object THEN NULL; END $x$;
DO $x$ BEGIN EXECUTE 'GRANT SELECT, UPDATE ON public.batch_deliveries TO anon'; EXCEPTION WHEN undefined_table THEN NULL; END $x$;

-- ═══ DELIVERY_BATCHES: anon can read for driver portal ═══
DO $x$ BEGIN
  CREATE POLICY "delivery_batches_anon_read" ON public.delivery_batches FOR SELECT TO anon USING (true);
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_object THEN NULL; END $x$;
DO $x$ BEGIN EXECUTE 'GRANT SELECT ON public.delivery_batches TO anon'; EXCEPTION WHEN undefined_table THEN NULL; END $x$;

-- ═══ INVENTORY: anon can read for kitchen portal ═══
DO $x$ BEGIN
  CREATE POLICY "inventory_anon_read" ON public.inventory FOR SELECT TO anon USING (true);
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_object THEN NULL; END $x$;
DO $x$ BEGIN EXECUTE 'GRANT SELECT ON public.inventory TO anon'; EXCEPTION WHEN undefined_table THEN NULL; END $x$;

-- ═══ INVENTORY_CONSUMPTION: anon can insert (kitchen portal requests) ═══
DO $x$ BEGIN
  CREATE POLICY "inventory_consumption_anon_insert" ON public.inventory_consumption FOR INSERT TO anon WITH CHECK (true);
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_object THEN NULL; END $x$;
DO $x$ BEGIN EXECUTE 'GRANT INSERT ON public.inventory_consumption TO anon'; EXCEPTION WHEN undefined_table THEN NULL; END $x$;
