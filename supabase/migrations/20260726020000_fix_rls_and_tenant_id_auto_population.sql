-- Migration: Fix RLS policies and add tenant_id auto-population
-- Date: 2026-07-26
-- Description: This migration fixes RLS policies to check users table instead of JWT claims
--              and adds triggers to auto-populate tenant_id for all main tables

-- ============================================================================
-- VEHICLES TABLE
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_set_vehicle_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    SELECT u.tenant_id INTO NEW.tenant_id
    FROM public.users u
    WHERE u.id = auth.uid();
    
    IF NEW.tenant_id IS NULL THEN
      RAISE EXCEPTION 'Cannot determine tenant_id for user %', auth.uid();
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_auto_set_vehicle_tenant_id ON vehicles;
CREATE TRIGGER trigger_auto_set_vehicle_tenant_id
  BEFORE INSERT ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_vehicle_tenant_id();

-- Update vehicles INSERT policy
DROP POLICY IF EXISTS "Vehicles are insertable by authorized roles" ON vehicles;
CREATE POLICY "Vehicles are insertable by authorized roles"
  ON vehicles FOR INSERT
  WITH CHECK (
    (tenant_id IS NULL OR tenant_id = (SELECT u.tenant_id FROM public.users u WHERE u.id = auth.uid()))
    AND 
    (SELECT u.role FROM public.users u WHERE u.id = auth.uid()) IN ('company_owner', 'fleet_manager', 'super_admin')
  );

-- ============================================================================
-- COMPONENTS TABLE
-- ============================================================================

-- Add missing notes column
ALTER TABLE components ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE OR REPLACE FUNCTION auto_set_component_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    SELECT u.tenant_id INTO NEW.tenant_id
    FROM public.users u
    WHERE u.id = auth.uid();
    
    IF NEW.tenant_id IS NULL THEN
      RAISE EXCEPTION 'Cannot determine tenant_id for user %', auth.uid();
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_auto_set_component_tenant_id ON components;
CREATE TRIGGER trigger_auto_set_component_tenant_id
  BEFORE INSERT ON components
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_component_tenant_id();

-- Update components policies
DROP POLICY IF EXISTS "Components are viewable by same tenant" ON components;
CREATE POLICY "Components are viewable by same tenant"
  ON components FOR SELECT
  USING (
    tenant_id = (SELECT u.tenant_id FROM public.users u WHERE u.id = auth.uid())
    OR (SELECT u.role FROM public.users u WHERE u.id = auth.uid()) = 'super_admin'
  );

DROP POLICY IF EXISTS "Components are insertable by authorized roles" ON components;
CREATE POLICY "Components are insertable by authorized roles"
  ON components FOR INSERT
  WITH CHECK (
    (tenant_id IS NULL OR tenant_id = (SELECT u.tenant_id FROM public.users u WHERE u.id = auth.uid()))
    AND 
    (SELECT u.role FROM public.users u WHERE u.id = auth.uid()) IN ('company_owner', 'fleet_manager', 'workshop_manager', 'maintenance_engineer', 'super_admin')
  );

DROP POLICY IF EXISTS "Components are updatable by authorized roles" ON components;
CREATE POLICY "Components are updatable by authorized roles"
  ON components FOR UPDATE
  USING (
    tenant_id = (SELECT u.tenant_id FROM public.users u WHERE u.id = auth.uid())
    AND 
    (SELECT u.role FROM public.users u WHERE u.id = auth.uid()) IN ('company_owner', 'fleet_manager', 'workshop_manager', 'maintenance_engineer', 'mechanic', 'super_admin')
  );

DROP POLICY IF EXISTS "Components are deletable by authorized roles" ON components;
CREATE POLICY "Components are deletable by authorized roles"
  ON components FOR DELETE
  USING (
    tenant_id = (SELECT u.tenant_id FROM public.users u WHERE u.id = auth.uid())
    AND 
    (SELECT u.role FROM public.users u WHERE u.id = auth.uid()) IN ('company_owner', 'fleet_manager', 'super_admin')
  );

-- ============================================================================
-- ODOMETER_READINGS TABLE
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_set_odometer_reading_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    SELECT u.tenant_id INTO NEW.tenant_id
    FROM public.users u
    WHERE u.id = auth.uid();
    
    IF NEW.tenant_id IS NULL THEN
      RAISE EXCEPTION 'Cannot determine tenant_id for user %', auth.uid();
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_auto_set_odometer_reading_tenant_id ON odometer_readings;
CREATE TRIGGER trigger_auto_set_odometer_reading_tenant_id
  BEFORE INSERT ON odometer_readings
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_odometer_reading_tenant_id();

DROP POLICY IF EXISTS "Odometer readings are insertable by authorized roles" ON odometer_readings;
CREATE POLICY "Odometer readings are insertable by authorized roles"
  ON odometer_readings FOR INSERT
  WITH CHECK (
    (tenant_id IS NULL OR tenant_id = (SELECT u.tenant_id FROM public.users u WHERE u.id = auth.uid()))
    AND 
    (SELECT u.role FROM public.users u WHERE u.id = auth.uid()) IN ('company_owner', 'fleet_manager', 'workshop_manager', 'maintenance_engineer', 'mechanic', 'driver', 'inspector', 'super_admin')
  );

-- ============================================================================
-- WORK_ORDERS TABLE
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_set_work_order_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    SELECT u.tenant_id INTO NEW.tenant_id
    FROM public.users u
    WHERE u.id = auth.uid();
    
    IF NEW.tenant_id IS NULL THEN
      RAISE EXCEPTION 'Cannot determine tenant_id for user %', auth.uid();
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_auto_set_work_order_tenant_id ON work_orders;
CREATE TRIGGER trigger_auto_set_work_order_tenant_id
  BEFORE INSERT ON work_orders
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_work_order_tenant_id();

DROP POLICY IF EXISTS "Work orders are insertable by authorized roles" ON work_orders;
CREATE POLICY "Work orders are insertable by authorized roles"
  ON work_orders FOR INSERT
  WITH CHECK (
    (tenant_id IS NULL OR tenant_id = (SELECT u.tenant_id FROM public.users u WHERE u.id = auth.uid()))
    AND 
    (SELECT u.role FROM public.users u WHERE u.id = auth.uid()) IN ('company_owner', 'fleet_manager', 'workshop_manager', 'maintenance_engineer', 'mechanic', 'super_admin')
  );

-- ============================================================================
-- INSPECTIONS TABLE
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_set_inspection_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    SELECT u.tenant_id INTO NEW.tenant_id
    FROM public.users u
    WHERE u.id = auth.uid();
    
    IF NEW.tenant_id IS NULL THEN
      RAISE EXCEPTION 'Cannot determine tenant_id for user %', auth.uid();
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_auto_set_inspection_tenant_id ON inspections;
CREATE TRIGGER trigger_auto_set_inspection_tenant_id
  BEFORE INSERT ON inspections
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_inspection_tenant_id();

DROP POLICY IF EXISTS "Inspections are insertable by authorized roles" ON inspections;
CREATE POLICY "Inspections are insertable by authorized roles"
  ON inspections FOR INSERT
  WITH CHECK (
    (tenant_id IS NULL OR tenant_id = (SELECT u.tenant_id FROM public.users u WHERE u.id = auth.uid()))
    AND 
    (SELECT u.role FROM public.users u WHERE u.id = auth.uid()) IN ('company_owner', 'fleet_manager', 'workshop_manager', 'maintenance_engineer', 'inspector', 'super_admin')
  );

-- ============================================================================
-- DOCUMENTS TABLE
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_set_document_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    SELECT u.tenant_id INTO NEW.tenant_id
    FROM public.users u
    WHERE u.id = auth.uid();
    
    IF NEW.tenant_id IS NULL THEN
      RAISE EXCEPTION 'Cannot determine tenant_id for user %', auth.uid();
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_auto_set_document_tenant_id ON documents;
CREATE TRIGGER trigger_auto_set_document_tenant_id
  BEFORE INSERT ON documents
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_document_tenant_id();

DROP POLICY IF EXISTS "Documents are insertable by authorized roles" ON documents;
CREATE POLICY "Documents are insertable by authorized roles"
  ON documents FOR INSERT
  WITH CHECK (
    (tenant_id IS NULL OR tenant_id = (SELECT u.tenant_id FROM public.users u WHERE u.id = auth.uid()))
    AND 
    (SELECT u.role FROM public.users u WHERE u.id = auth.uid()) IN ('company_owner', 'fleet_manager', 'workshop_manager', 'maintenance_engineer', 'accountant', 'super_admin')
  );

-- ============================================================================
-- ALERTS TABLE
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_set_alert_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    SELECT u.tenant_id INTO NEW.tenant_id
    FROM public.users u
    WHERE u.id = auth.uid();
    
    IF NEW.tenant_id IS NULL THEN
      RAISE EXCEPTION 'Cannot determine tenant_id for user %', auth.uid();
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_auto_set_alert_tenant_id ON alerts;
CREATE TRIGGER trigger_auto_set_alert_tenant_id
  BEFORE INSERT ON alerts
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_alert_tenant_id();

DROP POLICY IF EXISTS "Alerts are insertable by system" ON alerts;
CREATE POLICY "Alerts are insertable by system"
  ON alerts FOR INSERT
  WITH CHECK (
    (tenant_id IS NULL OR tenant_id = (SELECT u.tenant_id FROM public.users u WHERE u.id = auth.uid()))
    OR auth.role() = 'service_role'
  );

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION auto_set_vehicle_tenant_id() IS 'Auto-populates tenant_id from users table on vehicle INSERT';
COMMENT ON FUNCTION auto_set_component_tenant_id() IS 'Auto-populates tenant_id from users table on component INSERT';
COMMENT ON FUNCTION auto_set_odometer_reading_tenant_id() IS 'Auto-populates tenant_id from users table on odometer_reading INSERT';
COMMENT ON FUNCTION auto_set_work_order_tenant_id() IS 'Auto-populates tenant_id from users table on work_order INSERT';
COMMENT ON FUNCTION auto_set_inspection_tenant_id() IS 'Auto-populates tenant_id from users table on inspection INSERT';
COMMENT ON FUNCTION auto_set_document_tenant_id() IS 'Auto-populates tenant_id from users table on document INSERT';
COMMENT ON FUNCTION auto_set_alert_tenant_id() IS 'Auto-populates tenant_id from users table on alert INSERT';

COMMENT ON COLUMN components.notes IS 'Additional notes about the component installation, warranty, or maintenance';
