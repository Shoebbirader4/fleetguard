-- Temporarily disable RLS on vehicles table for testing
ALTER TABLE vehicles DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'vehicles';
