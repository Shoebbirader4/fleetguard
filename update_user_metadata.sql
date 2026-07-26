-- Update auth.users metadata with tenant_id and role
-- This ensures the JWT claims include the necessary information

UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object(
  'tenant_id', (SELECT tenant_id::text FROM public.users WHERE id = auth.users.id),
  'role', (SELECT role FROM public.users WHERE id = auth.users.id)
)
WHERE email = 'shoebbirader@gmail.com';

-- Verify the update
SELECT 
  id,
  email,
  raw_user_meta_data->>'tenant_id' as metadata_tenant_id,
  raw_user_meta_data->>'role' as metadata_role
FROM auth.users
WHERE email = 'shoebbirader@gmail.com';
