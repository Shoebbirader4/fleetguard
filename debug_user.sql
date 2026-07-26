-- Debug script to check user setup

-- Check user profile
SELECT 
  id,
  email,
  tenant_id,
  role,
  full_name,
  is_active
FROM public.users
WHERE email = 'shoebbirader@gmail.com';

-- Check tenant
SELECT 
  t.id,
  t.name,
  t.subscription_plan,
  t.vehicle_limit,
  t.subscription_status
FROM public.tenants t
INNER JOIN public.users u ON t.id = u.tenant_id
WHERE u.email = 'shoebbirader@gmail.com';

-- Check if custom_access_token_hook function exists
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'custom_access_token_hook';

-- Count vehicles for this tenant
SELECT COUNT(*) as vehicle_count
FROM vehicles v
INNER JOIN users u ON v.tenant_id = u.tenant_id
WHERE u.email = 'shoebbirader@gmail.com';
