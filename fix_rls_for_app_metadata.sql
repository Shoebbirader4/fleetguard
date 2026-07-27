-- Fix RLS policy to check app_metadata from JWT
-- Supabase puts app_metadata claims at the root level of JWT

DROP POLICY IF EXISTS "Vehicles are insertable by authorized roles" ON vehicles;

CREATE POLICY "Vehicles are insertable by authorized roles"
  ON vehicles FOR INSERT
  WITH CHECK (
    -- Check root-level JWT claims (from app_metadata)
    ((tenant_id::text = (auth.jwt() ->> 'tenant_id')) 
     AND (auth.jwt() ->> 'role') IN ('company_owner', 'fleet_manager', 'super_admin'))
    OR
    -- Fallback: Check user table directly
    (tenant_id = (SELECT u.tenant_id FROM public.users u WHERE u.id = auth.uid())
     AND (SELECT u.role FROM public.users u WHERE u.id = auth.uid()) IN ('company_owner', 'fleet_manager', 'super_admin'))
  );

-- Verify the policy
SELECT policyname, with_check
FROM pg_policies
WHERE tablename = 'vehicles' AND cmd = 'INSERT';
