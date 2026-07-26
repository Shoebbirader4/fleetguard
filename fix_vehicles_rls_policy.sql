-- Fix RLS policy to allow vehicle insertion using user table lookup
-- This is a fallback for when JWT claims are not configured

DROP POLICY IF EXISTS "Vehicles are insertable by authorized roles" ON vehicles;

CREATE POLICY "Vehicles are insertable by authorized roles"
  ON vehicles FOR INSERT
  WITH CHECK (
    -- Check JWT claims first (preferred, works when hook is configured)
    ((tenant_id = (auth.jwt() ->> 'tenant_id')::uuid 
      AND (auth.jwt() ->> 'role') IN ('company_owner', 'fleet_manager'))
     OR (auth.jwt() ->> 'role') = 'super_admin')
    OR
    -- Fallback: Check user table if JWT claims not present (works now)
    (tenant_id = (
      SELECT u.tenant_id 
      FROM public.users u 
      WHERE u.id = auth.uid()
    )
    AND (
      SELECT u.role 
      FROM public.users u 
      WHERE u.id = auth.uid()
    ) IN ('company_owner', 'fleet_manager', 'super_admin'))
  );

-- Also update the UPDATE policy with same fallback
DROP POLICY IF EXISTS "Vehicles are updatable by authorized roles" ON vehicles;

CREATE POLICY "Vehicles are updatable by authorized roles"
  ON vehicles FOR UPDATE
  USING (
    -- Check JWT claims first
    ((tenant_id = (auth.jwt() ->> 'tenant_id')::uuid 
      AND (auth.jwt() ->> 'role') IN ('company_owner', 'fleet_manager', 'workshop_manager', 'maintenance_engineer'))
     OR (auth.jwt() ->> 'role') = 'super_admin')
    OR
    -- Fallback: Check user table
    (tenant_id = (
      SELECT u.tenant_id 
      FROM public.users u 
      WHERE u.id = auth.uid()
    )
    AND (
      SELECT u.role 
      FROM public.users u 
      WHERE u.id = auth.uid()
    ) IN ('company_owner', 'fleet_manager', 'workshop_manager', 'maintenance_engineer', 'super_admin'))
  );

-- Also fix DELETE policy
DROP POLICY IF EXISTS "Vehicles are deletable by authorized roles" ON vehicles;

CREATE POLICY "Vehicles are deletable by authorized roles"
  ON vehicles FOR DELETE
  USING (
    -- Check JWT claims first
    ((tenant_id = (auth.jwt() ->> 'tenant_id')::uuid 
      AND (auth.jwt() ->> 'role') IN ('company_owner', 'fleet_manager'))
     OR (auth.jwt() ->> 'role') = 'super_admin')
    OR
    -- Fallback: Check user table
    (tenant_id = (
      SELECT u.tenant_id 
      FROM public.users u 
      WHERE u.id = auth.uid()
    )
    AND (
      SELECT u.role 
      FROM public.users u 
      WHERE u.id = auth.uid()
    ) IN ('company_owner', 'fleet_manager', 'super_admin'))
  );
