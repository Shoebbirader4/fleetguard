-- Remove ALL old policies with _with_metadata suffix
DROP POLICY IF EXISTS "vehicles_insert_with_metadata" ON vehicles;
DROP POLICY IF EXISTS "vehicles_select_with_metadata" ON vehicles;
DROP POLICY IF EXISTS "vehicles_update_with_metadata" ON vehicles;
DROP POLICY IF EXISTS "vehicles_delete_with_metadata" ON vehicles;

-- Verify only the new policies remain
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'vehicles'
ORDER BY cmd, policyname;
