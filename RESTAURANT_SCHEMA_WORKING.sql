-- ============================================================================
-- MESSFLOW RESTAURANT TABLE LOCKING - WORKING SCHEMA
-- PostgreSQL / Supabase - SCHEMA CREATED FIRST!
-- ============================================================================

-- Step 1: Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Step 2: CREATE SCHEMA FIRST (THIS WAS MISSING!)
DROP SCHEMA IF EXISTS restaurants CASCADE;
CREATE SCHEMA restaurants;

-- Step 3: Create restaurants.venues table
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

-- Step 4: Create restaurants.venue_staff table
CREATE TABLE restaurants.venue_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES restaurants.venues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role VARCHAR(50) DEFAULT 'staff',
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_staff_per_venue UNIQUE(venue_id, user_id)
);

-- Step 5: Create restaurants.tables table
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

-- Step 6: Create CORE FEATURE - restaurants.table_locks
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
-- STEP 7: CREATE INDEXES (Simple - no function-based predicates)
-- ============================================================================

CREATE INDEX idx_locks_table ON restaurants.table_locks(table_id);
CREATE INDEX idx_locks_venue ON restaurants.table_locks(venue_id);
CREATE INDEX idx_locks_expires ON restaurants.table_locks(expires_at);
CREATE INDEX idx_tables_venue ON restaurants.tables(venue_id);
CREATE INDEX idx_tables_status ON restaurants.tables(venue_id, status);
CREATE INDEX idx_venue_staff_venue ON restaurants.venue_staff(venue_id);
CREATE INDEX idx_venue_staff_user ON restaurants.venue_staff(user_id);

-- ============================================================================
-- STEP 8: ENABLE ROW-LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE restaurants.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants.venue_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants.table_locks ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 9: CREATE RLS POLICIES
-- ============================================================================

-- Venues Policies
CREATE POLICY "Users see their own venues"
  ON restaurants.venues FOR SELECT
  USING (manager_id = auth.uid() OR id IN (
    SELECT venue_id FROM restaurants.venue_staff WHERE user_id = auth.uid()
  ));

CREATE POLICY "Managers can update their venues"
  ON restaurants.venues FOR UPDATE
  USING (manager_id = auth.uid());

-- Venue Staff Policies
CREATE POLICY "Users see staff for their venues"
  ON restaurants.venue_staff FOR SELECT
  USING (venue_id IN (
    SELECT id FROM restaurants.venues WHERE manager_id = auth.uid()
    UNION ALL
    SELECT venue_id FROM restaurants.venue_staff WHERE user_id = auth.uid()
  ));

-- Tables Policies
CREATE POLICY "Users see tables for their venues"
  ON restaurants.tables FOR SELECT
  USING (venue_id IN (
    SELECT id FROM restaurants.venues WHERE manager_id = auth.uid()
    UNION ALL
    SELECT venue_id FROM restaurants.venue_staff WHERE user_id = auth.uid()
  ));

-- Table Locks Policies
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

-- ============================================================================
-- STEP 10: CREATE UTILITY FUNCTIONS
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
-- STEP 11: GRANT PERMISSIONS
-- ============================================================================

GRANT USAGE ON SCHEMA restaurants TO authenticated;
GRANT SELECT ON restaurants.venues TO authenticated;
GRANT SELECT ON restaurants.venue_staff TO authenticated;
GRANT SELECT ON restaurants.tables TO authenticated;
GRANT SELECT ON restaurants.table_locks TO authenticated;
GRANT INSERT ON restaurants.table_locks TO authenticated;
GRANT DELETE ON restaurants.table_locks TO authenticated;
GRANT EXECUTE ON FUNCTION restaurants.cleanup_expired_locks() TO authenticated;
GRANT EXECUTE ON FUNCTION restaurants.get_active_locks_count(UUID) TO authenticated;

-- ============================================================================
-- STEP 12: VERIFICATION
-- ============================================================================

SELECT 'Schema restaurants created successfully' as status;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'restaurants' ORDER BY table_name;
