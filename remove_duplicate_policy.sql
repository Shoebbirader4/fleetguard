-- Remove the duplicate/old policy that's causing issues
DROP POLICY IF EXISTS "vehicles_insert_with_metadata" ON vehicles;

-- Verify only one INSERT policy remains
SELECT policyname, with_check
FROM pg_policies
WHERE tablename = 'vehicles' AND cmd = 'INSERT';
