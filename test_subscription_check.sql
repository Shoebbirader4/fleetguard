-- Test the subscription enforcer logic directly

-- Get the tenant_id for the user
DO $$
DECLARE
  test_tenant_id uuid;
  current_count integer;
  vehicle_limit integer;
  subscription_status text;
  subscription_plan text;
BEGIN
  -- Get tenant info
  SELECT u.tenant_id, t.vehicle_limit, t.subscription_status, t.subscription_plan
  INTO test_tenant_id, vehicle_limit, subscription_status, subscription_plan
  FROM public.users u
  INNER JOIN public.tenants t ON u.tenant_id = t.id
  WHERE u.email = 'shoebbirader@gmail.com';

  IF test_tenant_id IS NULL THEN
    RAISE NOTICE 'ERROR: User shoebbirader@gmail.com not found or has no tenant';
  ELSE
    RAISE NOTICE 'User tenant_id: %', test_tenant_id;
    RAISE NOTICE 'Subscription plan: %', subscription_plan;
    RAISE NOTICE 'Vehicle limit: %', vehicle_limit;
    RAISE NOTICE 'Subscription status: %', subscription_status;

    -- Count vehicles
    SELECT COUNT(*) INTO current_count
    FROM vehicles
    WHERE tenant_id = test_tenant_id
    AND status = 'active';

    RAISE NOTICE 'Current vehicle count: %', current_count;
    RAISE NOTICE 'Can add vehicle: %', (current_count < vehicle_limit AND subscription_status = 'active');
  END IF;
END $$;
