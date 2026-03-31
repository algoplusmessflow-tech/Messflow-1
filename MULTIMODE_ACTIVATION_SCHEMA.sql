-- ============================================================================
-- MESSFLOW MULTI-MODE ACTIVATION SYSTEM
-- SuperAdmin controls which modes are available to each tenant/user
-- ============================================================================

-- Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- SCHEMA: mode_activation
-- ============================================================================

DROP SCHEMA IF EXISTS mode_activation CASCADE;
CREATE SCHEMA mode_activation;

-- ============================================================================
-- Table: mode_activation.subscription_plans
-- Define which modes are available at each plan level
-- ============================================================================

CREATE TABLE mode_activation.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  price_usd DECIMAL(10,2) NOT NULL,
  billing_cycle VARCHAR(50), -- 'monthly', 'yearly'
  max_venues INTEGER,
  available_modes TEXT[] NOT NULL, -- ARRAY['mess', 'restaurant', 'canteen']
  features JSONB, -- Additional features per plan
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT check_price CHECK (price_usd >= 0)
);

-- ============================================================================
-- Table: mode_activation.tenant_mode_access
-- Track which modes each tenant/organization has access to
-- ============================================================================

CREATE TABLE mode_activation.tenant_mode_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL, -- Organization/company ID
  manager_id UUID NOT NULL, -- User who manages this tenant
  plan_id UUID REFERENCES mode_activation.subscription_plans(id),
  active_modes TEXT[] NOT NULL DEFAULT ARRAY['mess'], -- Modes they've activated
  max_allowed_modes INTEGER DEFAULT 1, -- How many modes can be active
  activated_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP, -- Plan expiry date
  is_trial BOOLEAN DEFAULT false,
  trial_ends_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT check_modes_array CHECK (array_length(active_modes, 1) <= max_allowed_modes)
);

-- ============================================================================
-- Table: mode_activation.mode_upgrade_requests
-- Track when users request to upgrade to additional modes
-- ============================================================================

CREATE TABLE mode_activation.mode_upgrade_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mode_activation.tenant_mode_access(tenant_id),
  requested_mode VARCHAR(50) NOT NULL, -- 'restaurant' or 'canteen'
  request_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'payment_pending'
  payment_required DECIMAL(10,2),
  payment_status VARCHAR(50) DEFAULT 'unpaid', -- 'unpaid', 'paid', 'failed'
  requested_at TIMESTAMP DEFAULT NOW(),
  approved_at TIMESTAMP,
  approved_by UUID, -- SuperAdmin who approved
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT check_request_status CHECK (request_status IN ('pending', 'approved', 'rejected', 'payment_pending')),
  CONSTRAINT check_payment_status CHECK (payment_status IN ('unpaid', 'paid', 'failed'))
);

-- ============================================================================
-- Table: mode_activation.locked_modes
-- Locked modes with upgrade pricing
-- ============================================================================

CREATE TABLE mode_activation.locked_modes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mode_activation.tenant_mode_access(tenant_id),
  mode_name VARCHAR(50) NOT NULL, -- 'restaurant' or 'canteen'
  upgrade_price_usd DECIMAL(10,2) NOT NULL,
  upgrade_frequency VARCHAR(50), -- 'monthly', 'one-time'
  is_locked BOOLEAN DEFAULT true,
  unlock_request_id UUID REFERENCES mode_activation.mode_upgrade_requests(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_tenant_mode UNIQUE(tenant_id, mode_name)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_tenant_mode_access_tenant ON mode_activation.tenant_mode_access(tenant_id);
CREATE INDEX idx_tenant_mode_access_plan ON mode_activation.tenant_mode_access(plan_id);
CREATE INDEX idx_mode_upgrade_requests_tenant ON mode_activation.mode_upgrade_requests(tenant_id);
CREATE INDEX idx_mode_upgrade_requests_status ON mode_activation.mode_upgrade_requests(request_status);
CREATE INDEX idx_locked_modes_tenant ON mode_activation.locked_modes(tenant_id);
CREATE INDEX idx_locked_modes_mode ON mode_activation.locked_modes(mode_name);

-- ============================================================================
-- DEFAULT SUBSCRIPTION PLANS
-- ============================================================================

INSERT INTO mode_activation.subscription_plans (name, description, price_usd, billing_cycle, max_venues, available_modes, features) VALUES
('Starter - Mess Only', 'Perfect for cafeteria/mess management', 29.99, 'monthly', 1, ARRAY['mess'], '{"orders_per_month": 10000, "support": "email"}'),
('Pro - All Modes', 'Full access to Restaurant, Mess, and Canteen modes', 99.99, 'monthly', 5, ARRAY['mess', 'restaurant', 'canteen'], '{"orders_per_month": 100000, "support": "priority", "api_access": true}'),
('Enterprise', 'Custom pricing for large organizations', 0, 'yearly', NULL, ARRAY['mess', 'restaurant', 'canteen'], '{"custom": true, "support": "24/7"}');

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE mode_activation.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE mode_activation.tenant_mode_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE mode_activation.mode_upgrade_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE mode_activation.locked_modes ENABLE ROW LEVEL SECURITY;

-- Subscription plans - anyone can view
CREATE POLICY "Anyone can view subscription plans"
  ON mode_activation.subscription_plans FOR SELECT
  USING (true);

-- Tenant mode access - users see their own tenant's data
CREATE POLICY "Users see their tenant mode access"
  ON mode_activation.tenant_mode_access FOR SELECT
  USING (manager_id = auth.uid() OR tenant_id IN (
    SELECT tenant_id FROM mode_activation.tenant_mode_access WHERE manager_id = auth.uid()
  ));

-- Mode upgrade requests - users see their own requests
CREATE POLICY "Users see their mode upgrade requests"
  ON mode_activation.mode_upgrade_requests FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM mode_activation.tenant_mode_access WHERE manager_id = auth.uid()
  ));

-- Locked modes - users see their locked modes
CREATE POLICY "Users see their locked modes"
  ON mode_activation.locked_modes FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM mode_activation.tenant_mode_access WHERE manager_id = auth.uid()
  ));

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Check if a tenant can activate a mode
CREATE OR REPLACE FUNCTION mode_activation.can_activate_mode(
  p_tenant_id UUID,
  p_mode VARCHAR(50)
) RETURNS BOOLEAN AS $$
DECLARE
  v_active_count INTEGER;
  v_max_allowed INTEGER;
  v_available_modes TEXT[];
BEGIN
  -- Get tenant's access info
  SELECT 
    array_length(active_modes, 1),
    max_allowed_modes,
    sp.available_modes
  INTO v_active_count, v_max_allowed, v_available_modes
  FROM mode_activation.tenant_mode_access tma
  LEFT JOIN mode_activation.subscription_plans sp ON tma.plan_id = sp.id
  WHERE tma.tenant_id = p_tenant_id;
  
  -- Check if mode is available in plan
  IF NOT (p_mode = ANY(v_available_modes)) THEN
    RETURN false;
  END IF;
  
  -- Check if already active
  IF p_mode = ANY(SELECT unnest(active_modes) FROM mode_activation.tenant_mode_access WHERE tenant_id = p_tenant_id) THEN
    RETURN true; -- Already active
  END IF;
  
  -- Check if can add more modes
  RETURN COALESCE(v_active_count, 0) < COALESCE(v_max_allowed, 1);
END;
$$ LANGUAGE plpgsql;

-- Activate a mode for a tenant
CREATE OR REPLACE FUNCTION mode_activation.activate_mode(
  p_tenant_id UUID,
  p_mode VARCHAR(50)
) RETURNS BOOLEAN AS $$
BEGIN
  -- Check permission
  IF NOT mode_activation.can_activate_mode(p_tenant_id, p_mode) THEN
    RETURN false;
  END IF;
  
  -- Add mode to active_modes array
  UPDATE mode_activation.tenant_mode_access
  SET active_modes = array_append(active_modes, p_mode),
      updated_at = NOW()
  WHERE tenant_id = p_tenant_id
    AND NOT (p_mode = ANY(active_modes));
  
  -- Remove from locked modes if exists
  UPDATE mode_activation.locked_modes
  SET is_locked = false
  WHERE tenant_id = p_tenant_id AND mode_name = p_mode;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PERMISSIONS
-- ============================================================================

GRANT USAGE ON SCHEMA mode_activation TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA mode_activation TO authenticated;
GRANT INSERT ON mode_activation.mode_upgrade_requests TO authenticated;
GRANT EXECUTE ON FUNCTION mode_activation.can_activate_mode(UUID, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION mode_activation.activate_mode(UUID, VARCHAR) TO authenticated;

SELECT 'Multi-Mode Activation Schema Created Successfully' as status;
