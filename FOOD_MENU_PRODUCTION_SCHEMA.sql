-- ============================================================================
-- RESTAURANT FOOD MENU MANAGEMENT - PRODUCTION SCHEMA
-- Complete food item management (NOT UI-dependent)
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS restaurants CASCADE;

-- ============================================================================
-- Table: food_menu_items - COMPLETE FOOD MENU MANAGEMENT
-- ============================================================================

CREATE TABLE IF NOT EXISTS restaurants.food_menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL,
  
  -- Basic Info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  
  -- Pricing & Cost
  price DECIMAL(10,2) NOT NULL,
  cost DECIMAL(10,2), -- Cost to prepare (profit margin tracking)
  
  -- Preparation
  prep_time_minutes INTEGER NOT NULL DEFAULT 15,
  cooking_method VARCHAR(50), -- fry, grill, boil, bake, steam
  portion_weight_grams INTEGER,
  
  -- Nutritional Info (Complete tracking)
  calories INTEGER,
  protein_g DECIMAL(10,2),
  carbs_g DECIMAL(10,2),
  fat_g DECIMAL(10,2),
  fiber_g DECIMAL(10,2),
  sodium_mg INTEGER,
  
  -- Ingredients & Allergens (Stored as JSONB for flexibility)
  ingredients JSONB, -- [{name: "chicken", quantity: 500, unit: "g"}]
  allergens TEXT[], -- dairy, gluten, peanuts, shellfish, etc.
  
  -- Dietary Flags
  vegetarian BOOLEAN DEFAULT false,
  vegan BOOLEAN DEFAULT false,
  glutenfree BOOLEAN DEFAULT false,
  spicy BOOLEAN DEFAULT false,
  sugar_free BOOLEAN DEFAULT false,
  
  -- Availability Control
  is_available BOOLEAN DEFAULT true,
  available_from_time TIME, -- e.g., 12:00
  available_until_time TIME, -- e.g., 22:00
  
  -- Inventory
  current_quantity INTEGER DEFAULT 0,
  max_daily_quantity INTEGER,
  reorder_at_quantity INTEGER,
  
  -- Media
  image_url TEXT,
  
  -- Notes
  kitchen_notes TEXT, -- Special preparation instructions
  tags TEXT[], -- tags like "bestseller", "new", "promotion"
  
  -- Metadata
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT check_price CHECK (price >= 0),
  CONSTRAINT check_cost CHECK (cost IS NULL OR cost >= 0),
  CONSTRAINT unique_menu_item UNIQUE(venue_id, name)
);

-- ============================================================================
-- Table: food_categories - ORGANIZE MENU ITEMS
-- ============================================================================

CREATE TABLE IF NOT EXISTS restaurants.food_categories (
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
-- Table: food_item_variants - SIZE, SPICE, CUSTOMIZATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS restaurants.food_item_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  food_item_id UUID NOT NULL REFERENCES restaurants.food_menu_items(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL, -- "Small", "Medium", "Large", "Extra Spicy"
  price_modifier DECIMAL(10,2) DEFAULT 0, -- + or - price adjustment
  description TEXT,
  prep_time_modifier INTEGER DEFAULT 0, -- +/- minutes
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- Table: kitchen_orders - KOT TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS restaurants.kitchen_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL,
  order_number INTEGER NOT NULL,
  table_id UUID,
  customer_name VARCHAR(255),
  
  -- Order items (stored as JSONB for flexibility)
  items JSONB NOT NULL, -- [{item_id, variant_id, quantity, special_requests}]
  
  -- Order metadata
  special_requests TEXT,
  status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, ready, served, cancelled
  priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
  
  -- Timing
  created_by UUID,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT check_status CHECK (status IN ('pending', 'in_progress', 'ready', 'served', 'cancelled'))
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_food_items_venue ON restaurants.food_menu_items(venue_id);
CREATE INDEX IF NOT EXISTS idx_food_items_category ON restaurants.food_menu_items(venue_id, category);
CREATE INDEX IF NOT EXISTS idx_food_items_available ON restaurants.food_menu_items(venue_id, is_available);
CREATE INDEX IF NOT EXISTS idx_food_items_vegetarian ON restaurants.food_menu_items(vegetarian, vegan);
CREATE INDEX IF NOT EXISTS idx_categories_venue ON restaurants.food_categories(venue_id);
CREATE INDEX IF NOT EXISTS idx_kitchen_orders_venue ON restaurants.kitchen_orders(venue_id, status);
CREATE INDEX IF NOT EXISTS idx_kitchen_orders_created ON restaurants.kitchen_orders(created_at DESC);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE restaurants.food_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants.food_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants.food_item_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants.kitchen_orders ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their venue food items"
  ON restaurants.food_menu_items FOR SELECT
  USING (true); -- Will be managed by application logic

CREATE POLICY "Users can insert food items in their venue"
  ON restaurants.food_menu_items FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Get available menu items with all details
CREATE OR REPLACE FUNCTION restaurants.get_available_menu_items(p_venue_id UUID)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  description TEXT,
  category VARCHAR,
  price DECIMAL,
  prep_time_minutes INTEGER,
  vegetarian BOOLEAN,
  vegan BOOLEAN,
  calories INTEGER,
  current_quantity INTEGER
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
    fmi.vegan,
    fmi.calories,
    fmi.current_quantity
  FROM restaurants.food_menu_items fmi
  WHERE fmi.venue_id = p_venue_id 
    AND fmi.is_available = true
    AND (fmi.available_from_time IS NULL OR CURRENT_TIME >= fmi.available_from_time)
    AND (fmi.available_until_time IS NULL OR CURRENT_TIME < fmi.available_until_time)
    AND (fmi.current_quantity IS NULL OR fmi.current_quantity > 0)
  ORDER BY fmi.category, fmi.name;
END;
$$ LANGUAGE plpgsql;

-- Calculate menu profitability
CREATE OR REPLACE FUNCTION restaurants.get_menu_profitability(p_venue_id UUID)
RETURNS TABLE (
  item_name VARCHAR,
  price DECIMAL,
  cost DECIMAL,
  profit DECIMAL,
  profit_margin DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fmi.name,
    fmi.price,
    fmi.cost,
    (fmi.price - COALESCE(fmi.cost, 0))::DECIMAL,
    CASE 
      WHEN fmi.cost > 0 THEN ((fmi.price - fmi.cost) / fmi.price * 100)::DECIMAL
      ELSE NULL
    END
  FROM restaurants.food_menu_items fmi
  WHERE fmi.venue_id = p_venue_id
  ORDER BY (fmi.price - COALESCE(fmi.cost, 0)) DESC;
END;
$$ LANGUAGE plpgsql;

SELECT 'Food Menu Schema Created Successfully' as status;
