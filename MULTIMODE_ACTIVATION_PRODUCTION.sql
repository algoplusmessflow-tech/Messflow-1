-- ============================================================================
-- MULTI-MODE ACTIVATION SYSTEM - SUPERADMIN CONTROL SCHEMA
-- Manages which modes are available to each tenant with upgrade pricing
-- ============================================================================

DROP SCHEMA IF EXISTS mode_activation CASCADE;
CREATE SCHEMA mode_activation;

-- ============================================================================
-- Table: subscription_plans
-- ============================================================================

CREATE TABLE mode_activation.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  price_usd DECIMAL(10,2) NOT NULL,
  billing_cycle VARCHAR(50), -- monthly, yearly
  max_venues INTEGER,
  available_modes TEXT[] NOT NULL, -- ARRAY['mess', 'restaurant', 'canteen']
  features JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT check_price CHECK (price_usd >= 0)
);

-- ============================================================================
-- Table: tenant_mode_access - WHO OWNS WHAT MODES
-- ============================================================================

CREATE TABLE mode_activation.tenant_mode_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  manager_id UUID NOT NULL,
  
  -- Current active modes
  active_modes TEXT[] NOT NULL DEFAULT ARRAY['mess'],
  max_allowed_modes INTEGER DEFAULT 1,
  
  -- Subscription
  plan_id UUID REFERENCES mode_activation.subscription_plans(id),
  
  -- Trial period
  is_trial BOOLEAN DEFAULT false,
  trial_ends_at TIMESTAMP,
  
  -- Subscription period
  subscribed_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT check_modes_array CHECK (array_length(active_modes, 1) <= max_allowed_modes),
  CONSTRAINT unique_tenant UNIQUE(tenant_id)
);

-- ============================================================================
-- Table: locked_modes - UPGRADE PRICING
-- ============================================================================

CREATE TABLE mode_activation.locked_modes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mode_activation.tenant_mode_access(tenant_id) ON DELETE CASCADE,
  mode_name VARCHAR(50) NOT NULL, -- 'restaurant' or 'canteen'
  
  -- Pricing for this locked mode
  upgrade_price_usd DECIMAL(10,2) NOT NULL,
  upgrade_frequency VARCHAR(50) DEFAULT 'monthly', -- monthly, yearly, one-time
  
  -- Status
  is_locked BOOLEAN DEFAULT true,
  unlocked_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT unique_tenant_mode UNIQUE(tenant_id, mode_name),
  CONSTRAINT check_price CHECK (upgrade_price_usd >= 0)
);

-- ============================================================================
-- Table: mode_upgrade_requests - TRACK UPGRADE REQUESTS
-- ============================================================================

CREATE TABLE mode_activation.mode_upgrade_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mode_activation.tenant_mode_access(tenant_id),
  requested_mode VARCHAR(50) NOT NULL, -- 'restaurant' or 'canteen'
  
  -- Request status
  request_status VARCHAR(50) DEFAULT 'pending', -- pending, approved, payment_processing, completed, rejected
  payment_status VARCHAR(50) DEFAULT 'unpaid', -- unpaid, paid, failed, refunded
  
  -- Pricing
  payment_required DECIMAL(10,2),
  
  -- Timing
  requested_at TIMESTAMP DEFAULT NOW(),
  approved_at TIMESTAMP,
  completed_at TIMESTAMP,
  approved_by UUID, -- SuperAdmin who approved
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT check_request_status CHECK (request_status IN ('pending', 'approved', 'payment_processing', 'completed', 'rejected')),
  CONSTRAINT check_payment_status CHECK (payment_status IN ('unpaid', 'paid', 'failed', 'refunded'))
);

-- ============================================================================
-- TABLE: mode_usage_metrics - TRACK MODE USAGE FOR ANALYTICS
-- ============================================================================

CREATE TABLE mode_activation.mode_usage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  mode_name VARCHAR(50) NOT NULL,
  
  -- Usage metrics
  daily_active_users INTEGER DEFAULT 0,
  orders_processed INTEGER DEFAULT 0,
  revenue_usd DECIMAL(10,2),
  
  -- Date
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT unique_tenant_mode_date UNIQUE(tenant_id, mode_name, metric_date)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_tenant_access_manager ON mode_activation.tenant_mode_access(manager_id);
CREATE INDEX idx_locked_modes_tenant ON mode_activation.locked_modes(tenant_id);
CREATE INDEX idx_upgrade_requests_tenant ON mode_activation.mode_upgrade_requests(tenant_id);
CREATE INDEX idx_upgrade_requests_status ON mode_activation.mode_upgrade_requests(request_status);
CREATE INDEX idx_usage_metrics_tenant_date ON mode_activation.mode_usage_metrics(tenant_id, metric_date);

-- ============================================================================
-- DEFAULT SUBSCRIPTION PLANS
-- ============================================================================

INSERT INTO mode_activation.subscription_plans (name, description, price_usd, billing_cycle, max_venues, available_modes, features) VALUES
('Starter - Mess Only', 'Perfect for cafeteria/mess management', 29.99, 'monthly', 1, ARRAY['mess'], '{"support": "email", "api": false}'),
('Pro - All Modes', 'Full access to all modes (Mess, Restaurant, Canteen)', 99.99, 'monthly', 5, ARRAY['mess', 'restaurant', 'canteen'], '{"support": "priority", "api": true, "analytics": true}'),
('Enterprise', 'Custom pricing for large organizations', 0, 'yearly', NULL, ARRAY['mess', 'restaurant', 'canteen'], '{"custom": true, "support": "24/7"}');

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE mode_activation.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE mode_activation.tenant_mode_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE mode_activation.locked_modes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mode_activation.mode_upgrade_requests ENABLE ROW LEVEL SECURITY;

-- Subscription plans: everyone can view
CREATE POLICY "Anyone can view subscription plans"
  ON mode_activation.subscription_plans FOR SELECT
  USING (true);

-- Tenant access: users see their own
CREATE POLICY "Users see their own tenant access"
  ON mode_activation.tenant_mode_access FOR SELECT
  USING (manager_id = auth.uid());

-- Locked modes: users see their own
CREATE POLICY "Users see their own locked modes"
  ON mode_activation.locked_modes FOR SELECT
  USING (tenant_id IN (SELECT id FROM mode_activation.tenant_mode_access WHERE manager_id = auth.uid()));

-- Upgrade requests: users see their own
CREATE POLICY "Users see their own upgrade requests"
  ON mode_activation.mode_upgrade_requests FOR SELECT
  USING (tenant_id IN (SELECT id FROM mode_activation.tenant_mode_access WHERE manager_id = auth.uid()));

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Check if tenant can activate a mode
CREATE OR REPLACE FUNCTION mode_activation.can_activate_mode(
  p_tenant_id UUID,
  p_mode VARCHAR(50)
) RETURNS BOOLEAN AS $$
DECLARE
  v_active_count INTEGER;
  v_max_allowed INTEGER;
  v_available_modes TEXT[];
BEGIN
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
    RETURN true;
  END IF;
  
  -- Check if can add more modes
  RETURN COALESCE(v_active_count, 0) < COALESCE(v_max_allowed, 1);
END;
$$ LANGUAGE plpgsql;

-- Activate a mode for tenant
CREATE OR REPLACE FUNCTION mode_activation.activate_mode(
  p_tenant_id UUID,
  p_mode VARCHAR(50)
) RETURNS BOOLEAN AS $$
BEGIN
  IF NOT mode_activation.can_activate_mode(p_tenant_id, p_mode) THEN
    RETURN false;
  END IF;
  
  UPDATE mode_activation.tenant_mode_access
  SET active_modes = array_append(active_modes, p_mode),
      updated_at = NOW()
  WHERE tenant_id = p_tenant_id
    AND NOT (p_mode = ANY(active_modes));
  
  UPDATE mode_activation.locked_modes
  SET is_locked = false, unlocked_at = NOW()
  WHERE tenant_id = p_tenant_id AND mode_name = p_mode;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT USAGE ON SCHEMA mode_activation TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA mode_activation TO authenticated;
GRANT INSERT ON mode_activation.mode_upgrade_requests TO authenticated;
GRANT EXECUTE ON FUNCTION mode_activation.can_activate_mode(UUID, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION mode_activation.activate_mode(UUID, VARCHAR) TO authenticated;

SELECT 'Multi-Mode Activation Schema Created Successfully' as status;
