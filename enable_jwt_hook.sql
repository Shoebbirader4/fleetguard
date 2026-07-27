-- Enable the JWT custom access token hook via SQL
-- This configures Supabase Auth to call our custom_access_token_hook function

-- First, verify the hook function exists
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'custom_access_token_hook';

-- The hook must be configured in Supabase Auth settings
-- Unfortunately this cannot be done via SQL - it must be done in the dashboard or via API

-- However, we can verify the function is ready:
SELECT 
  'custom_access_token_hook function exists: ' || 
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'custom_access_token_hook'
  ) THEN 'YES ✓' ELSE 'NO ✗' END as hook_status;

-- Workaround: Update user's app_metadata directly in auth.users
-- This will make the data available in JWT immediately
UPDATE auth.users
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
  'tenant_id', (SELECT tenant_id::text FROM public.users WHERE id = auth.users.id),
  'role', (SELECT role FROM public.users WHERE id = auth.users.id)
)
WHERE email = 'shoebbirader@gmail.com';

-- Verify the update
SELECT 
  email,
  raw_app_meta_data->>'tenant_id' as app_tenant_id,
  raw_app_meta_data->>'role' as app_role,
  raw_user_meta_data->>'tenant_id' as user_tenant_id,
  raw_user_meta_data->>'role' as user_role
FROM auth.users
WHERE email = 'shoebbirader@gmail.com';
