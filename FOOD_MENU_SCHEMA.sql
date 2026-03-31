-- ============================================================================
-- RESTAURANT FOOD MENU ITEMS SCHEMA
-- Complete food menu management for restaurants
-- ============================================================================

-- Create schema
DROP SCHEMA IF EXISTS restaurants CASCADE;
CREATE SCHEMA restaurants;

-- ============================================================================
-- Table: food_categories
-- ============================================================================

CREATE TABLE restaurants.food_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  icon_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_category UNIQUE(venue_id, name)
);

-- ============================================================================
-- Table: food_menu_items (Complete Restaurant Food Menu)
-- ============================================================================

CREATE TABLE restaurants.food_menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(100) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  cost DECIMAL(10,2), -- Cost to prepare (for margin)
  image_url TEXT,
  prep_time_minutes INTEGER NOT NULL DEFAULT 15,
  cooking_method VARCHAR(50), -- 'fry', 'grill', 'boil', 'bake', 'steam'
  temperature_f INTEGER, -- Serving temperature
  portion_size VARCHAR(50), -- '250g', '1 plate', '500ml'
  ingredients TEXT[] NOT NULL, -- Array of ingredients
  allergens TEXT[], -- Allergen warnings
  calories INTEGER,
  protein_g DECIMAL(10,2),
  carbs_g DECIMAL(10,2),
  fat_g DECIMAL(10,2),
  spicy BOOLEAN DEFAULT false,
  vegetarian BOOLEAN DEFAULT false,
  vegan BOOLEAN DEFAULT false,
  glutenfree BOOLEAN DEFAULT false,
  is_available BOOLEAN DEFAULT true,
  available_from VARCHAR(5), -- 'HH:MM' format
  available_until VARCHAR(5), -- 'HH:MM' format
  max_daily_quantity INTEGER,
  current_quantity INTEGER,
  kitchen_notes TEXT,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT check_price CHECK (price >= 0),
  CONSTRAINT check_cost CHECK (cost IS NULL OR cost >= 0),
  CONSTRAINT unique_menu_item UNIQUE(venue_id, name)
);

-- ============================================================================
-- Table: kitchen_orders (For Kitchen Portal)
-- ============================================================================

CREATE TABLE restaurants.kitchen_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL,
  order_number INTEGER NOT NULL,
  table_id UUID,
  customer_name VARCHAR(255),
  items JSONB NOT NULL, -- Array of {id, name, quantity, specialRequests}
  special_requests TEXT,
  status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, ready, served, cancelled
  priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
  created_by UUID,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT check_status CHECK (status IN ('pending', 'in_progress', 'ready', 'served', 'cancelled'))
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_food_categories_venue ON restaurants.food_categories(venue_id);
CREATE INDEX idx_food_menu_venue ON restaurants.food_menu_items(venue_id);
CREATE INDEX idx_food_menu_category ON restaurants.food_menu_items(venue_id, category);
CREATE INDEX idx_food_menu_available ON restaurants.food_menu_items(venue_id, is_available);
CREATE INDEX idx_food_menu_vegetarian ON restaurants.food_menu_items(vegetarian, spicy);
CREATE INDEX idx_kitchen_orders_venue ON restaurants.kitchen_orders(venue_id);
CREATE INDEX idx_kitchen_orders_status ON restaurants.kitchen_orders(venue_id, status);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE restaurants.food_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants.food_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants.kitchen_orders ENABLE ROW LEVEL SECURITY;

-- Food categories
CREATE POLICY "View own venue categories"
  ON restaurants.food_categories FOR SELECT
  USING (venue_id IN (SELECT id FROM restaurants.venues WHERE manager_id = auth.uid()));

-- Food menu items
CREATE POLICY "View own venue food menu"
  ON restaurants.food_menu_items FOR SELECT
  USING (venue_id IN (SELECT id FROM restaurants.venues WHERE manager_id = auth.uid()));

CREATE POLICY "Manage own venue food menu"
  ON restaurants.food_menu_items FOR INSERT
  WITH CHECK (venue_id IN (SELECT id FROM restaurants.venues WHERE manager_id = auth.uid()));

-- Kitchen orders
CREATE POLICY "View own venue kitchen orders"
  ON restaurants.kitchen_orders FOR SELECT
  USING (venue_id IN (SELECT id FROM restaurants.venues WHERE manager_id = auth.uid()));

CREATE POLICY "Create kitchen orders"
  ON restaurants.kitchen_orders FOR INSERT
  WITH CHECK (venue_id IN (SELECT id FROM restaurants.venues WHERE manager_id = auth.uid()));

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION restaurants.get_available_menu_items(p_venue_id UUID)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  description TEXT,
  category VARCHAR,
  price DECIMAL,
  prep_time_minutes INTEGER,
  vegetarian BOOLEAN,
  spicy BOOLEAN,
  calories INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fmi.id,
    fmi.name,
    fmi.description,
    fmi.category,
    fmi.price,
    fmi.prep_time_minutes,
    fmi.vegetarian,
    fmi.spicy,
    fmi.calories
  FROM restaurants.food_menu_items fmi
  WHERE fmi.venue_id = p_venue_id 
    AND fmi.is_available = true
    AND (fmi.available_from IS NULL OR CURRENT_TIME >= fmi.available_from::time)
    AND (fmi.available_until IS NULL OR CURRENT_TIME < fmi.available_until::time)
  ORDER BY fmi.category, fmi.name;
END;
$$ LANGUAGE plpgsql;

SELECT 'Food Menu Schema Created Successfully' as status;
