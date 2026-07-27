-- Add SELECT policy for vehicles
CREATE POLICY "Vehicles are viewable by tenant users"
  ON vehicles FOR SELECT
  USING (
    tenant_id = (SELECT u.tenant_id FROM public.users u WHERE u.id = auth.uid())
  );

-- Verify all policies
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'vehicles'
ORDER BY cmd, policyname;
