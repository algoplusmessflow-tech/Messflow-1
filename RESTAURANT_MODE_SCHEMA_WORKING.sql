-- ============================================================================
-- MESSFLOW RESTAURANT TABLE LOCKING - WORKING SCHEMA
-- PostgreSQL / Supabase - COMPLETE MODE-ISOLATED IMPLEMENTATION
-- ============================================================================

-- Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CREATE SCHEMA FIRST (CRITICAL!)
-- ============================================================================

DROP SCHEMA IF EXISTS restaurants CASCADE;
CREATE SCHEMA restaurants;

-- ============================================================================
-- Step 1: Create restaurants.venues table
-- ============================================================================

CREATE TABLE restaurants.venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_venue_name UNIQUE(name, manager_id)
);

-- ============================================================================
-- Step 2: Create restaurants.venue_staff table
-- ============================================================================

CREATE TABLE restaurants.venue_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES restaurants.venues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role VARCHAR(50) DEFAULT 'staff',
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_staff_per_venue UNIQUE(venue_id, user_id)
);

-- ============================================================================
-- Step 3: Create restaurants.tables table
-- ============================================================================

CREATE TABLE restaurants.tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES restaurants.venues(id) ON DELETE CASCADE,
  table_number INTEGER NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 2,
  location_zone VARCHAR(50),
  status VARCHAR(20) DEFAULT 'available',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT check_capacity CHECK (capacity > 0),
  CONSTRAINT unique_table_per_venue UNIQUE(venue_id, table_number)
);

-- ============================================================================
-- Step 4: Create restaurants.table_locks table
-- ============================================================================

CREATE TABLE restaurants.table_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES restaurants.tables(id) ON DELETE CASCADE,
  venue_id UUID NOT NULL REFERENCES restaurants.venues(id) ON DELETE CASCADE,
  locked_by UUID NOT NULL,
  locked_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL DEFAULT NOW() + INTERVAL '30 seconds',
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT one_lock_per_table UNIQUE(table_id, venue_id),
  CONSTRAINT check_expiry CHECK (expires_at > locked_at)
);

-- ============================================================================
-- Step 5: Create restaurants.menu_items table (NEW!)
-- ============================================================================

CREATE TABLE restaurants.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES restaurants.venues(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category VARCHAR(100) NOT NULL,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  prep_time_minutes INTEGER DEFAULT 15,
  kitchen_notes TEXT,
  ingredients JSONB,
  allergens TEXT[],
  calories INTEGER,
  vegetarian BOOLEAN DEFAULT false,
  spicy BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT check_price CHECK (price >= 0),
  CONSTRAINT unique_menu_item UNIQUE(venue_id, name)
);

-- ============================================================================
-- Step 6: Create restaurants.kitchen_orders table (NEW!)
-- ============================================================================

CREATE TABLE restaurants.kitchen_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES restaurants.venues(id) ON DELETE CASCADE,
  order_number INTEGER NOT NULL,
  table_id UUID REFERENCES restaurants.tables(id),
  customer_name VARCHAR(255),
  items JSONB NOT NULL,
  special_requests TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  priority VARCHAR(20) DEFAULT 'normal',
  created_by UUID,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT check_status CHECK (status IN ('pending', 'in_progress', 'ready', 'served', 'cancelled')),
  CONSTRAINT check_priority CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
);

-- ============================================================================
-- Step 7: CREATE INDEXES (Simple - no function-based predicates)
-- ============================================================================

CREATE INDEX idx_locks_table ON restaurants.table_locks(table_id);
CREATE INDEX idx_locks_venue ON restaurants.table_locks(venue_id);
CREATE INDEX idx_locks_expires ON restaurants.table_locks(expires_at);
CREATE INDEX idx_tables_venue ON restaurants.tables(venue_id);
CREATE INDEX idx_tables_status ON restaurants.tables(venue_id, status);
CREATE INDEX idx_venue_staff_venue ON restaurants.venue_staff(venue_id);
CREATE INDEX idx_venue_staff_user ON restaurants.venue_staff(user_id);
CREATE INDEX idx_restaurant_menu_venue ON restaurants.menu_items(venue_id);
CREATE INDEX idx_restaurant_menu_active ON restaurants.menu_items(venue_id, is_active);
CREATE INDEX idx_restaurant_kitchen_orders_venue ON restaurants.kitchen_orders(venue_id);

-- ============================================================================
-- Step 8: ENABLE ROW-LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE restaurants.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants.venue_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants.table_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants.kitchen_orders ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Step 9: CREATE RLS POLICIES
-- ============================================================================

-- Venues: Users see only their venues
CREATE POLICY "Users see their own venues"
  ON restaurants.venues FOR SELECT
  USING (manager_id = auth.uid() OR id IN (
    SELECT venue_id FROM restaurants.venue_staff WHERE user_id = auth.uid()
  ));

CREATE POLICY "Managers can update their venues"
  ON restaurants.venues FOR UPDATE
  USING (manager_id = auth.uid());

-- Venue Staff: Users see staff for their venues
CREATE POLICY "Users see staff for their venues"
  ON restaurants.venue_staff FOR SELECT
  USING (venue_id IN (
    SELECT id FROM restaurants.venues WHERE manager_id = auth.uid()
    UNION ALL
    SELECT venue_id FROM restaurants.venue_staff WHERE user_id = auth.uid()
  ));

-- Tables: Users see tables for their venues
CREATE POLICY "Users see tables for their venues"
  ON restaurants.tables FOR SELECT
  USING (venue_id IN (
    SELECT id FROM restaurants.venues WHERE manager_id = auth.uid()
    UNION ALL
    SELECT venue_id FROM restaurants.venue_staff WHERE user_id = auth.uid()
  ));

-- Table Locks: Users see locks for their venues
CREATE POLICY "Users see locks for their venues"
  ON restaurants.table_locks FOR SELECT
  USING (venue_id IN (
    SELECT id FROM restaurants.venues WHERE manager_id = auth.uid()
    UNION ALL
    SELECT venue_id FROM restaurants.venue_staff WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete only their own locks"
  ON restaurants.table_locks FOR DELETE
  USING (locked_by = auth.uid());

CREATE POLICY "Authenticated users can create locks"
  ON restaurants.table_locks FOR INSERT
  WITH CHECK (
    auth.uid() = locked_by AND
    venue_id IN (
      SELECT id FROM restaurants.venues WHERE manager_id = auth.uid()
      UNION ALL
      SELECT venue_id FROM restaurants.venue_staff WHERE user_id = auth.uid()
    )
  );

-- Menu Items: Users see menu only for their venues
CREATE POLICY "Users see menu items for their venues"
  ON restaurants.menu_items FOR SELECT
  USING (venue_id IN (
    SELECT id FROM restaurants.venues WHERE manager_id = auth.uid()
    UNION ALL
    SELECT venue_id FROM restaurants.venue_staff WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can manage menu items in their venues"
  ON restaurants.menu_items FOR INSERT
  WITH CHECK (venue_id IN (
    SELECT id FROM restaurants.venues WHERE manager_id = auth.uid()
    UNION ALL
    SELECT venue_id FROM restaurants.venue_staff WHERE user_id = auth.uid()
  ));

-- Kitchen Orders: Staff can see and manage orders for their venue
CREATE POLICY "Users see kitchen orders for their venues"
  ON restaurants.kitchen_orders FOR SELECT
  USING (venue_id IN (
    SELECT id FROM restaurants.venues WHERE manager_id = auth.uid()
    UNION ALL
    SELECT venue_id FROM restaurants.venue_staff WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create kitchen orders"
  ON restaurants.kitchen_orders FOR INSERT
  WITH CHECK (venue_id IN (
    SELECT id FROM restaurants.venues WHERE manager_id = auth.uid()
    UNION ALL
    SELECT venue_id FROM restaurants.venue_staff WHERE user_id = auth.uid()
  ));

-- ============================================================================
-- Step 10: CREATE UTILITY FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION restaurants.get_menu_items_by_venue(p_venue_id UUID)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  description TEXT,
  price DECIMAL,
  category VARCHAR,
  image_url TEXT,
  prep_time_minutes INTEGER,
  vegetarian BOOLEAN,
  spicy BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    menu_items.id,
    menu_items.name,
    menu_items.description,
    menu_items.price,
    menu_items.category,
    menu_items.image_url,
    menu_items.prep_time_minutes,
    menu_items.vegetarian,
    menu_items.spicy
  FROM restaurants.menu_items
  WHERE venue_id = p_venue_id AND is_active = true
  ORDER BY category, name;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION restaurants.get_active_kitchen_orders(p_venue_id UUID)
RETURNS TABLE (
  id UUID,
  order_number INTEGER,
  table_id UUID,
  customer_name VARCHAR,
  items JSONB,
  status VARCHAR,
  priority VARCHAR,
  created_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ko.id,
    ko.order_number,
    ko.table_id,
    ko.customer_name,
    ko.items,
    ko.status,
    ko.priority,
    ko.created_at
  FROM restaurants.kitchen_orders ko
  WHERE ko.venue_id = p_venue_id 
    AND ko.status != 'served'
    AND ko.status != 'cancelled'
  ORDER BY ko.priority DESC, ko.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Step 11: GRANT PERMISSIONS
-- ============================================================================

GRANT USAGE ON SCHEMA restaurants TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA restaurants TO authenticated;
GRANT INSERT, UPDATE, DELETE ON restaurants.menu_items TO authenticated;
GRANT INSERT, UPDATE, DELETE ON restaurants.kitchen_orders TO authenticated;
GRANT INSERT, DELETE ON restaurants.table_locks TO authenticated;
GRANT EXECUTE ON FUNCTION restaurants.get_menu_items_by_venue(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION restaurants.get_active_kitchen_orders(UUID) TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 'Restaurant schema created successfully' as status;
SELECT table_name FROM information_schema.tables 
  WHERE table_schema = 'restaurants' 
  ORDER BY table_name;
