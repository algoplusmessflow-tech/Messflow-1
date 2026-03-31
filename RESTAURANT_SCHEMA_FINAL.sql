-- ============================================================================
-- MESSFLOW RESTAURANT TABLE LOCKING - FINAL PRODUCTION SCHEMA (FIXED)
-- PostgreSQL / Supabase
-- ============================================================================

-- Step 1: Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Step 2: Create restaurants schema
CREATE SCHEMA IF NOT EXISTS restaurants;

-- ============================================================================
-- MAIN TABLES
-- ============================================================================

-- restaurants.venues
CREATE TABLE IF NOT EXISTS restaurants.venues (
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

-- restaurants.venue_staff
CREATE TABLE IF NOT EXISTS restaurants.venue_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES restaurants.venues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role VARCHAR(50) DEFAULT 'staff',
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_staff_per_venue UNIQUE(venue_id, user_id)
);

-- restaurants.tables
CREATE TABLE IF NOT EXISTS restaurants.tables (
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
-- CORE FEATURE: restaurants.table_locks
-- ============================================================================

CREATE TABLE IF NOT EXISTS restaurants.table_locks (
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
-- INDEXES - CRITICAL FOR PERFORMANCE
-- ============================================================================

-- Create basic indexes first
CREATE INDEX IF NOT EXISTS idx_locks_table ON restaurants.table_locks(table_id);
CREATE INDEX IF NOT EXISTS idx_locks_venue ON restaurants.table_locks(venue_id);
CREATE INDEX IF NOT EXISTS idx_locks_expires ON restaurants.table_locks(expires_at);
CREATE INDEX IF NOT EXISTS idx_tables_venue ON restaurants.tables(venue_id);
CREATE INDEX IF NOT EXISTS idx_tables_status ON restaurants.tables(venue_id, status);
CREATE INDEX IF NOT EXISTS idx_venue_staff_venue ON restaurants.venue_staff(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_staff_user ON restaurants.venue_staff(user_id);

-- ============================================================================
-- CRITICAL: Create IMMUTABLE function for NOW() - FIX FOR INDEX PREDICATE
-- ============================================================================

CREATE OR REPLACE FUNCTION restaurants.now_immutable() RETURNS TIMESTAMP AS $$
  SELECT NOW();
$$ LANGUAGE SQL IMMUTABLE;

-- Now create the partial index using the immutable function
CREATE INDEX IF NOT EXISTS idx_locks_active ON restaurants.table_locks(table_id) 
  WHERE expires_at > restaurants.now_immutable();

-- ============================================================================
-- ROW-LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE restaurants.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants.venue_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants.table_locks ENABLE ROW LEVEL SECURITY;

-- VENUES Policies
CREATE POLICY "Users see their own venues"
  ON restaurants.venues FOR SELECT
  USING (manager_id = auth.uid() OR id IN (
    SELECT venue_id FROM restaurants.venue_staff WHERE user_id = auth.uid()
  ));

CREATE POLICY "Managers can update their venues"
  ON restaurants.venues FOR UPDATE
  USING (manager_id = auth.uid());

-- VENUE_STAFF Policies
CREATE POLICY "Users see staff for their venues"
  ON restaurants.venue_staff FOR SELECT
  USING (venue_id IN (
    SELECT id FROM restaurants.venues WHERE manager_id = auth.uid()
    UNION
    SELECT venue_id FROM restaurants.venue_staff WHERE user_id = auth.uid()
  ));

-- TABLES Policies
CREATE POLICY "Users see tables for their venues"
  ON restaurants.tables FOR SELECT
  USING (venue_id IN (
    SELECT id FROM restaurants.venues WHERE manager_id = auth.uid()
    UNION
    SELECT venue_id FROM restaurants.venue_staff WHERE user_id = auth.uid()
  ));

-- TABLE_LOCKS Policies
CREATE POLICY "Users see locks for their venues"
  ON restaurants.table_locks FOR SELECT
  USING (venue_id IN (
    SELECT id FROM restaurants.venues WHERE manager_id = auth.uid()
    UNION
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
      UNION
      SELECT venue_id FROM restaurants.venue_staff WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION restaurants.cleanup_expired_locks()
RETURNS TABLE(deleted_count BIGINT) AS $$
BEGIN
  DELETE FROM restaurants.table_locks 
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN QUERY SELECT deleted_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION restaurants.get_active_locks_count(p_venue_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM restaurants.table_locks
    WHERE venue_id = p_venue_id AND expires_at > NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PERMISSIONS
-- ============================================================================

GRANT SELECT ON restaurants.venues TO authenticated;
GRANT SELECT ON restaurants.venue_staff TO authenticated;
GRANT SELECT ON restaurants.tables TO authenticated;
GRANT SELECT ON restaurants.table_locks TO authenticated;
GRANT INSERT ON restaurants.table_locks TO authenticated;
GRANT DELETE ON restaurants.table_locks TO authenticated;
GRANT EXECUTE ON FUNCTION restaurants.cleanup_expired_locks() TO authenticated;
GRANT EXECUTE ON FUNCTION restaurants.get_active_locks_count(UUID) TO authenticated;

-- ============================================================================
-- VERIFICATION QUERIES (RUN THESE TO CONFIRM SETUP)
-- ============================================================================

SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'restaurants' 
ORDER BY table_name;

SELECT indexname FROM pg_indexes 
WHERE tablename IN ('venues', 'venue_staff', 'tables', 'table_locks')
ORDER BY indexname;

SELECT schemaname, tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'restaurants';
