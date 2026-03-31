-- ============================================================================
-- MESSFLOW MULTI-MODE CONTROL SCHEMA
-- Database for Mode Activation, Subscription Tiers, and User Controls
-- ============================================================================

-- ============================================================================
-- 1. USER SUBSCRIPTION MODES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_subscription_modes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode_name VARCHAR(50) NOT NULL,
  is_active BOOLEAN DEFAULT false,
  activated_at TIMESTAMP,
  plan_tier VARCHAR(50) DEFAULT 'free',
  max_venues INTEGER DEFAULT 1,
  max_staff INTEGER DEFAULT 5,
  features JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT valid_mode_name CHECK (mode_name IN ('restaurant', 'mess', 'canteen')),
  CONSTRAINT valid_plan_tier CHECK (plan_tier IN ('free', 'pro', 'enterprise')),
  CONSTRAINT unique_user_mode UNIQUE(user_id, mode_name)
);

CREATE INDEX idx_user_modes_user_id ON public.user_subscription_modes(user_id);
CREATE INDEX idx_user_modes_active ON public.user_subscription_modes(user_id, is_active);
CREATE INDEX idx_user_modes_plan ON public.user_subscription_modes(plan_tier);

-- ============================================================================
-- 2. MODE PRICING PLANS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.mode_pricing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode_name VARCHAR(50) NOT NULL,
  tier VARCHAR(50) NOT NULL,
  monthly_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  annual_price DECIMAL(10,2),
  max_venues INTEGER,
  max_staff INTEGER,
  features JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  billing_cycle VARCHAR(20) DEFAULT 'monthly',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT valid_mode CHECK (mode_name IN ('restaurant', 'mess', 'canteen')),
  CONSTRAINT valid_tier CHECK (tier IN ('free', 'pro', 'enterprise')),
  CONSTRAINT unique_plan UNIQUE(mode_name, tier)
);

CREATE INDEX idx_pricing_mode ON public.mode_pricing_plans(mode_name);
CREATE INDEX idx_pricing_tier ON public.mode_pricing_plans(tier);

-- ============================================================================
-- 3. USER MODE USAGE TRACKING TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_mode_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode_name VARCHAR(50) NOT NULL,
  last_accessed TIMESTAMP DEFAULT NOW(),
  total_access_count INTEGER DEFAULT 0,
  data_created_count INTEGER DEFAULT 0,
  storage_used_mb DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT valid_mode CHECK (mode_name IN ('restaurant', 'mess', 'canteen')),
  CONSTRAINT unique_user_mode_usage UNIQUE(user_id, mode_name)
);

CREATE INDEX idx_usage_user_id ON public.user_mode_usage(user_id);
CREATE INDEX idx_usage_last_accessed ON public.user_mode_usage(last_accessed);

-- ============================================================================
-- 4. MODE FEATURE FLAGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.mode_feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode_name VARCHAR(50) NOT NULL,
  tier VARCHAR(50) NOT NULL,
  feature_name VARCHAR(100) NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT valid_mode CHECK (mode_name IN ('restaurant', 'mess', 'canteen')),
  CONSTRAINT valid_tier CHECK (tier IN ('free', 'pro', 'enterprise')),
  CONSTRAINT unique_feature UNIQUE(mode_name, tier, feature_name)
);

CREATE INDEX idx_flags_mode_tier ON public.mode_feature_flags(mode_name, tier);

-- ============================================================================
-- 5. DEFAULT MODE PRICING DATA
-- ============================================================================

INSERT INTO public.mode_pricing_plans (mode_name, tier, monthly_price, annual_price, max_venues, max_staff, features, description)
VALUES 
  ('restaurant', 'free', 0, 0, 1, 3, '{"menu_items": 20, "tables": 5, "orders": 100, "reports": false}', 'Free tier for restaurants'),
  ('restaurant', 'pro', 29.99, 299.99, 3, 10, '{"menu_items": 500, "tables": 20, "orders": 1000, "reports": true, "analytics": true}', 'Pro tier for restaurants'),
  ('restaurant', 'enterprise', 99.99, 999.99, 99, 100, '{"menu_items": 9999, "tables": 99, "orders": 99999, "reports": true, "analytics": true, "api_access": true}', 'Enterprise tier for restaurants'),
  
  ('mess', 'free', 0, 0, 1, 20, '{"members": 50, "meal_plans": 5, "orders": 500, "reports": false}', 'Free tier for mess'),
  ('mess', 'pro', 19.99, 199.99, 1, 50, '{"members": 500, "meal_plans": 20, "orders": 5000, "reports": true, "analytics": true}', 'Pro tier for mess'),
  ('mess', 'enterprise', 79.99, 799.99, 99, 500, '{"members": 9999, "meal_plans": 99, "orders": 99999, "reports": true, "analytics": true, "api_access": true}', 'Enterprise tier for mess'),
  
  ('canteen', 'free', 0, 0, 1, 5, '{"inventory_items": 100, "orders": 500, "reports": false}', 'Free tier for canteen'),
  ('canteen', 'pro', 24.99, 249.99, 2, 15, '{"inventory_items": 500, "orders": 5000, "reports": true, "analytics": true}', 'Pro tier for canteen'),
  ('canteen', 'enterprise', 89.99, 899.99, 99, 100, '{"inventory_items": 9999, "orders": 99999, "reports": true, "analytics": true, "api_access": true}', 'Enterprise tier for canteen');

-- ============================================================================
-- 6. DEFAULT FEATURE FLAGS
-- ============================================================================

INSERT INTO public.mode_feature_flags (mode_name, tier, feature_name, is_enabled, description)
VALUES
  -- Restaurant features
  ('restaurant', 'free', 'video_menu', true, 'Video-style menu UI'),
  ('restaurant', 'free', 'kitchen_portal', true, 'Kitchen order system'),
  ('restaurant', 'free', 'table_management', true, 'Table management'),
  ('restaurant', 'free', 'table_locking', false, 'Advanced table locking'),
  ('restaurant', 'free', 'reservations', false, 'Online reservations'),
  ('restaurant', 'free', 'analytics', false, 'Advanced analytics'),
  
  ('restaurant', 'pro', 'video_menu', true, 'Video-style menu UI'),
  ('restaurant', 'pro', 'kitchen_portal', true, 'Kitchen order system'),
  ('restaurant', 'pro', 'table_management', true, 'Table management'),
  ('restaurant', 'pro', 'table_locking', true, 'Advanced table locking'),
  ('restaurant', 'pro', 'reservations', true, 'Online reservations'),
  ('restaurant', 'pro', 'analytics', true, 'Advanced analytics'),
  
  -- Mess features
  ('mess', 'free', 'menu', true, 'Menu management'),
  ('mess', 'free', 'members', true, 'Member management'),
  ('mess', 'free', 'orders', true, 'Order system'),
  ('mess', 'free', 'sales_portal', true, 'Sales tracking'),
  ('mess', 'free', 'analytics', false, 'Advanced analytics'),
  
  ('mess', 'pro', 'menu', true, 'Menu management'),
  ('mess', 'pro', 'members', true, 'Member management'),
  ('mess', 'pro', 'orders', true, 'Order system'),
  ('mess', 'pro', 'sales_portal', true, 'Sales tracking'),
  ('mess', 'pro', 'analytics', true, 'Advanced analytics'),
  
  -- Canteen features
  ('canteen', 'free', 'menu', true, 'Menu management'),
  ('canteen', 'free', 'inventory', true, 'Inventory tracking'),
  ('canteen', 'free', 'orders', true, 'Order system'),
  ('canteen', 'free', 'analytics', false, 'Advanced analytics'),
  
  ('canteen', 'pro', 'menu', true, 'Menu management'),
  ('canteen', 'pro', 'inventory', true, 'Inventory tracking'),
  ('canteen', 'pro', 'orders', true, 'Order system'),
  ('canteen', 'pro', 'analytics', true, 'Advanced analytics');

-- ============================================================================
-- 7. RLS POLICIES
-- ============================================================================

ALTER TABLE public.user_subscription_modes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_mode_usage ENABLE ROW LEVEL SECURITY;

-- Users see only their own modes
CREATE POLICY "Users see their own modes"
  ON public.user_subscription_modes FOR SELECT
  USING (user_id = auth.uid() OR auth.role() = 'authenticated');

CREATE POLICY "Users update their own modes"
  ON public.user_subscription_modes FOR UPDATE
  USING (user_id = auth.uid());

-- Mode usage is visible to users
CREATE POLICY "Users see their usage"
  ON public.user_mode_usage FOR SELECT
  USING (user_id = auth.uid());

-- ============================================================================
-- 8. HELPER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_active_modes(p_user_id UUID)
RETURNS TABLE (mode_name VARCHAR, is_active BOOLEAN, plan_tier VARCHAR) AS $$
BEGIN
  RETURN QUERY
  SELECT usm.mode_name, usm.is_active, usm.plan_tier
  FROM public.user_subscription_modes usm
  WHERE usm.user_id = p_user_id AND usm.is_active = true
  ORDER BY usm.created_at;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.get_mode_features(p_mode_name VARCHAR, p_tier VARCHAR)
RETURNS TABLE (feature_name VARCHAR, is_enabled BOOLEAN) AS $$
BEGIN
  RETURN QUERY
  SELECT mff.feature_name, mff.is_enabled
  FROM public.mode_feature_flags mff
  WHERE mff.mode_name = p_mode_name AND mff.tier = p_tier
  ORDER BY mff.feature_name;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.activate_user_mode(
  p_user_id UUID,
  p_mode_name VARCHAR,
  p_plan_tier VARCHAR DEFAULT 'free'
)
RETURNS boolean AS $$
BEGIN
  INSERT INTO public.user_subscription_modes (user_id, mode_name, is_active, plan_tier, activated_at)
  VALUES (p_user_id, p_mode_name, true, p_plan_tier, NOW())
  ON CONFLICT (user_id, mode_name) DO UPDATE
  SET is_active = true, plan_tier = p_plan_tier, activated_at = NOW();
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 'Multi-mode schema created successfully' as status;
SELECT COUNT(*) as total_pricing_tiers FROM public.mode_pricing_plans;
SELECT COUNT(*) as total_feature_flags FROM public.mode_feature_flags;
