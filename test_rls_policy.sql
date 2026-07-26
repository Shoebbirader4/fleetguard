-- Test if the user can be found and what auth.uid() returns
SELECT 
  auth.uid() as current_user_id,
  u.id as user_table_id,
  u.email,
  u.tenant_id,
  u.role,
  CASE 
    WHEN auth.uid() IS NULL THEN 'auth.uid() is NULL - not authenticated'
    WHEN u.id IS NULL THEN 'User not found in users table'
    WHEN u.role IN ('company_owner', 'fleet_manager', 'super_admin') THEN 'Role check: PASS'
    ELSE 'Role check: FAIL - role is ' || u.role
  END as status
FROM public.users u
WHERE u.id = auth.uid();

-- Check current RLS policies on vehicles
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'vehicles' AND cmd = 'INSERT';
