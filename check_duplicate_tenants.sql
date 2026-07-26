-- Check for duplicate tenants for the user
SELECT 
  u.id as user_id,
  u.email,
  u.tenant_id as user_tenant_id,
  t.id as tenant_id,
  t.name as tenant_name,
  t.subscription_plan,
  t.vehicle_limit
FROM public.users u
LEFT JOIN public.tenants t ON u.tenant_id = t.id
WHERE u.email = 'shoebbirader@gmail.com';

-- Check if there are multiple tenants with same properties
SELECT name, COUNT(*) as count
FROM public.tenants
WHERE name LIKE '%Humsafar%' OR name LIKE '%shoebbirader%'
GROUP BY name
HAVING COUNT(*) > 1;

-- Show all tenants created recently
SELECT id, name, created_at
FROM public.tenants
WHERE created_at > NOW() - INTERVAL '1 day'
ORDER BY created_at DESC;
