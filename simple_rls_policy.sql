-- Simplify RLS policy to ONLY check users table
-- This bypasses the JWT claims issue entirely

DROP POLICY IF EXISTS "Vehicles are insertable by authorized roles" ON vehicles;

CREATE POLICY "Vehicles are insertable by authorized roles"
  ON vehicles FOR INSERT
  WITH CHECK (
    -- Only check user table - no JWT claims
    tenant_id = (SELECT u.tenant_id FROM public.users u WHERE u.id = auth.uid())
    AND 
    (SELECT u.role FROM public.users u WHERE u.id = auth.uid()) IN ('company_owner', 'fleet_manager', 'super_admin')
  );

-- Also fix UPDATE policy
DROP POLICY IF EXISTS "Vehicles are updatable by authorized roles" ON vehicles;

CREATE POLICY "Vehicles are updatable by authorized roles"
  ON vehicles FOR UPDATE
  USING (
    tenant_id = (SELECT u.tenant_id FROM public.users u WHERE u.id = auth.uid())
    AND 
    (SELECT u.role FROM public.users u WHERE u.id = auth.uid()) IN ('company_owner', 'fleet_manager', 'workshop_manager', 'maintenance_engineer', 'super_admin')
  );

-- Also fix DELETE policy  
DROP POLICY IF EXISTS "Vehicles are deletable by authorized roles" ON vehicles;

CREATE POLICY "Vehicles are deletable by authorized roles"
  ON vehicles FOR DELETE
  USING (
    tenant_id = (SELECT u.tenant_id FROM public.users u WHERE u.id = auth.uid())
    AND 
    (SELECT u.role FROM public.users u WHERE u.id = auth.uid()) IN ('company_owner', 'fleet_manager', 'super_admin')
  );

-- Verify policies
SELECT tablename, policyname, cmd, with_check, qual
FROM pg_policies
WHERE tablename = 'vehicles'
ORDER BY cmd, policyname;
