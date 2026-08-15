-- FleetGuard AI subscription, entitlement, and RBAC foundation
-- Plans are monthly per active vehicle and priced in INR.

CREATE TABLE IF NOT EXISTS public.subscription_plans (
  code text PRIMARY KEY,
  name text NOT NULL,
  monthly_price_inr integer NOT NULL CHECK (monthly_price_inr >= 0),
  description text NOT NULL,
  vehicle_limit integer,
  features jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.subscription_plans (code, name, monthly_price_inr, description, vehicle_limit, features, sort_order)
VALUES
  ('basic', 'Basic', 300, 'Add and monitor vehicles with component health visibility.', NULL, '{"vehicles":true,"component_health":true,"dashboard":true,"vehicle_tracking":true,"components":true,"analytics":false,"work_orders":false,"inventory":false,"gps_tracking":false,"reports":false,"team_management":false,"data_export":false,"api_access":false}'::jsonb, 1),
  ('plus', 'Basic Plus', 500, 'Everything in Basic plus maintenance planning and operational workflows.', NULL, '{"vehicles":true,"component_health":true,"dashboard":true,"vehicle_tracking":true,"components":true,"analytics":true,"work_orders":true,"inventory":true,"gps_tracking":false,"reports":true,"team_management":true,"data_export":true,"api_access":false}'::jsonb, 2),
  ('all', 'All Access', 800, 'Every FleetGuard capability for a connected fleet operation.', NULL, '{"vehicles":true,"component_health":true,"dashboard":true,"vehicle_tracking":true,"components":true,"analytics":true,"work_orders":true,"inventory":true,"gps_tracking":true,"reports":true,"team_management":true,"data_export":true,"api_access":true}'::jsonb, 3)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  monthly_price_inr = EXCLUDED.monthly_price_inr,
  description = EXCLUDED.description,
  vehicle_limit = EXCLUDED.vehicle_limit,
  features = EXCLUDED.features,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;

ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS subscription_plan_code text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS billing_currency text NOT NULL DEFAULT 'INR';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS price_per_vehicle_inr integer NOT NULL DEFAULT 300;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS billing_interval text NOT NULL DEFAULT 'monthly';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS subscription_started_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS current_period_start timestamptz NOT NULL DEFAULT date_trunc('month', now());
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS current_period_end timestamptz NOT NULL DEFAULT (date_trunc('month', now()) + interval '1 month');
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS subscription_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.tenants
SET subscription_plan_code = CASE lower(coalesce(subscription_plan, 'basic'))
  WHEN 'starter' THEN 'basic'
  WHEN 'professional' THEN 'plus'
  WHEN 'enterprise' THEN 'all'
  WHEN 'basic' THEN 'basic'
  WHEN 'plus' THEN 'plus'
  WHEN 'all' THEN 'all'
  ELSE 'basic'
END
WHERE subscription_plan_code IS NULL;

UPDATE public.tenants t
SET subscription_plan = p.code,
    billing_currency = 'INR',
    price_per_vehicle_inr = p.monthly_price_inr,
    vehicle_limit = COALESCE(p.vehicle_limit, 2147483647)
FROM public.subscription_plans p
WHERE p.code = t.subscription_plan_code;

ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS tenants_subscription_plan_code_fkey;
ALTER TABLE public.tenants ADD CONSTRAINT tenants_subscription_plan_code_fkey FOREIGN KEY (subscription_plan_code) REFERENCES public.subscription_plans(code);
ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS tenants_billing_currency_check;
ALTER TABLE public.tenants ADD CONSTRAINT tenants_billing_currency_check CHECK (billing_currency = 'INR');
ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS tenants_billing_interval_check;
ALTER TABLE public.tenants ADD CONSTRAINT tenants_billing_interval_check CHECK (billing_interval IN ('monthly', 'annual'));

CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT tenant_id FROM public.users WHERE id = auth.uid() AND is_active = true LIMIT 1 $$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT role::text FROM public.users WHERE id = auth.uid() AND is_active = true LIMIT 1 $$;

CREATE OR REPLACE FUNCTION public.has_role(required_roles text[])
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT coalesce(public.current_user_role() = ANY(required_roles), false) $$;

CREATE OR REPLACE FUNCTION public.has_feature(feature_key text, requested_tenant_id uuid DEFAULT public.current_tenant_id())
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT coalesce(
    (SELECT (p.features ->> feature_key)::boolean
     FROM public.tenants t
     JOIN public.subscription_plans p ON p.code = coalesce(t.subscription_plan_code, t.subscription_plan)
     WHERE t.id = requested_tenant_id AND t.subscription_status = 'active'), false)
$$;

CREATE OR REPLACE FUNCTION public.subscription_snapshot(requested_tenant_id uuid DEFAULT public.current_tenant_id())
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'tenant_id', t.id,
    'plan', p.code,
    'plan_name', p.name,
    'price_per_vehicle_inr', p.monthly_price_inr,
    'billing_currency', 'INR',
    'billing_interval', coalesce(t.billing_interval, 'monthly'),
    'subscription_status', t.subscription_status,
    'vehicle_count', (SELECT count(*) FROM public.vehicles v WHERE v.tenant_id = t.id AND v.status = 'active'),
    'features', p.features
  ) INTO result
  FROM public.tenants t JOIN public.subscription_plans p ON p.code = coalesce(t.subscription_plan_code, t.subscription_plan)
  WHERE t.id = requested_tenant_id;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_vehicle_entitlement()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE tenant_uuid uuid; max_vehicles integer; used_vehicles integer;
BEGIN
  tenant_uuid := coalesce(NEW.tenant_id, public.current_tenant_id());
  SELECT coalesce(p.vehicle_limit, 2147483647) INTO max_vehicles
  FROM public.tenants t JOIN public.subscription_plans p ON p.code = coalesce(t.subscription_plan_code, t.subscription_plan)
  WHERE t.id = tenant_uuid AND t.subscription_status = 'active';
  IF max_vehicles IS NULL THEN RAISE EXCEPTION 'Active FleetGuard subscription required'; END IF;
  SELECT count(*) INTO used_vehicles FROM public.vehicles WHERE tenant_id = tenant_uuid AND status = 'active';
  IF TG_OP = 'INSERT' AND coalesce(NEW.status, 'active') = 'active' AND used_vehicles >= max_vehicles THEN
    RAISE EXCEPTION 'Vehicle limit reached for the current subscription. Upgrade to add more vehicles.' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_enforce_vehicle_entitlement ON public.vehicles;
CREATE TRIGGER trigger_enforce_vehicle_entitlement BEFORE INSERT OR UPDATE OF status ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.enforce_vehicle_entitlement();

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Subscription plans are publicly readable" ON public.subscription_plans;
CREATE POLICY "Subscription plans are publicly readable" ON public.subscription_plans FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Tenant members can read their subscription" ON public.tenants;
CREATE POLICY "Tenant members can read their subscription" ON public.tenants FOR SELECT USING (id = public.current_tenant_id());
DROP POLICY IF EXISTS "Tenant owners can update their subscription" ON public.tenants;
CREATE POLICY "Tenant owners can update their subscription" ON public.tenants FOR UPDATE USING (id = public.current_tenant_id() AND public.has_role(ARRAY['company_owner','super_admin'])) WITH CHECK (id = public.current_tenant_id() AND public.has_role(ARRAY['company_owner','super_admin']));

COMMENT ON TABLE public.subscription_plans IS 'FleetGuard per-active-vehicle monthly plans, priced in INR.';
COMMENT ON FUNCTION public.has_feature(text, uuid) IS 'Tenant-scoped subscription entitlement check for RLS and server-side business rules.';
COMMENT ON FUNCTION public.enforce_vehicle_entitlement() IS 'Database-level vehicle limit enforcement; client checks are advisory only.';

CREATE OR REPLACE FUNCTION public.normalize_tenant_subscription()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE normalized_code text;
BEGIN
  normalized_code := CASE lower(coalesce(NEW.subscription_plan_code, NEW.subscription_plan, 'basic'))
    WHEN 'starter' THEN 'basic'
    WHEN 'professional' THEN 'plus'
    WHEN 'enterprise' THEN 'all'
    ELSE lower(coalesce(NEW.subscription_plan_code, NEW.subscription_plan, 'basic'))
  END;
  IF NOT EXISTS (SELECT 1 FROM public.subscription_plans WHERE code = normalized_code) THEN normalized_code := 'basic'; END IF;
  NEW.subscription_plan_code := normalized_code;
  NEW.subscription_plan := normalized_code;
  NEW.billing_currency := 'INR';
  SELECT monthly_price_inr INTO NEW.price_per_vehicle_inr FROM public.subscription_plans WHERE code = normalized_code;
  NEW.billing_interval := coalesce(NEW.billing_interval, 'monthly');
  NEW.current_period_start := coalesce(NEW.current_period_start, date_trunc('month', now()));
  NEW.current_period_end := coalesce(NEW.current_period_end, date_trunc('month', now()) + interval '1 month');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_normalize_tenant_subscription ON public.tenants;
CREATE TRIGGER trigger_normalize_tenant_subscription BEFORE INSERT OR UPDATE OF subscription_plan, subscription_plan_code ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.normalize_tenant_subscription();

CREATE TABLE IF NOT EXISTS public.permissions (
  code text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
  role text NOT NULL,
  permission_code text NOT NULL REFERENCES public.permissions(code) ON DELETE CASCADE,
  PRIMARY KEY (role, permission_code)
);

INSERT INTO public.permissions (code, name, description) VALUES
  ('vehicles:view', 'View vehicles', 'View vehicle records and health'),
  ('vehicles:create', 'Create vehicles', 'Add vehicles to the tenant fleet'),
  ('vehicles:update', 'Update vehicles', 'Edit vehicle records and status'),
  ('components:view', 'View components', 'View component health records'),
  ('components:manage', 'Manage components', 'Create and update component health records'),
  ('work_orders:view', 'View work orders', 'View maintenance work orders'),
  ('work_orders:manage', 'Manage work orders', 'Create and manage work orders'),
  ('inventory:view', 'View inventory', 'View parts and stock levels'),
  ('inventory:manage', 'Manage inventory', 'Create parts and receive stock'),
  ('reports:view', 'View reports', 'View analytics and reports'),
  ('team:manage', 'Manage team', 'Invite users and assign roles'),
  ('billing:manage', 'Manage billing', 'Change plans and billing settings'),
  ('audit:view', 'View audit logs', 'View tenant activity logs')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO public.role_permissions (role, permission_code)
SELECT r.role, p.code FROM (VALUES
  ('company_owner'), ('fleet_manager'), ('workshop_manager'), ('maintenance_engineer'), ('mechanic'), ('driver'), ('inspector'), ('accountant'), ('auditor'), ('super_admin')
) r(role) CROSS JOIN public.permissions p
WHERE (r.role IN ('company_owner','fleet_manager','super_admin') AND p.code IN ('vehicles:view','vehicles:create','vehicles:update','components:view','components:manage','work_orders:view','work_orders:manage','inventory:view','inventory:manage','reports:view','team:manage','billing:manage','audit:view'))
   OR (r.role = 'workshop_manager' AND p.code IN ('vehicles:view','vehicles:update','components:view','components:manage','work_orders:view','work_orders:manage','inventory:view','inventory:manage','reports:view'))
   OR (r.role = 'maintenance_engineer' AND p.code IN ('vehicles:view','components:view','components:manage','work_orders:view','work_orders:manage','inventory:view','reports:view'))
   OR (r.role = 'mechanic' AND p.code IN ('vehicles:view','components:view','work_orders:view','work_orders:manage','inventory:view'))
   OR (r.role = 'driver' AND p.code IN ('vehicles:view','components:view'))
   OR (r.role = 'inspector' AND p.code IN ('vehicles:view','components:view','work_orders:view','reports:view'))
   OR (r.role = 'accountant' AND p.code IN ('vehicles:view','inventory:view','reports:view','audit:view'))
   OR (r.role = 'auditor' AND p.code IN ('vehicles:view','components:view','work_orders:view','inventory:view','reports:view','audit:view'))
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.has_permission(permission_code text, requested_tenant_id uuid DEFAULT public.current_tenant_id())
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.role_permissions rp ON rp.role = u.role::text
    WHERE u.id = auth.uid() AND u.tenant_id = requested_tenant_id AND u.is_active = true AND rp.permission_code = has_permission.permission_code
  )
$$;

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permission catalog is readable" ON public.permissions;
CREATE POLICY "Permission catalog is readable" ON public.permissions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Role permissions are readable" ON public.role_permissions;
CREATE POLICY "Role permissions are readable" ON public.role_permissions FOR SELECT TO authenticated USING (true);

COMMENT ON FUNCTION public.has_permission(text, uuid) IS 'Tenant-scoped RBAC permission check for frontend gates, RPCs, and RLS policies.';

-- Seven-day trial: limited to three active vehicles and visibility/component health.
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS trial_started_at timestamptz;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS trial_vehicle_limit integer NOT NULL DEFAULT 3;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS trial_used boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.start_fleetguard_trial()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.trial_started_at IS NULL AND coalesce(NEW.trial_used, false) = false THEN
    NEW.trial_started_at := now();
    NEW.trial_ends_at := now() + interval '7 days';
    NEW.trial_vehicle_limit := 3;
    NEW.subscription_status := 'trialing';
    NEW.billing_currency := 'INR';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fleetguard_trial_active(requested_tenant_id uuid DEFAULT public.current_tenant_id())
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenants
    WHERE id = requested_tenant_id
      AND subscription_status = 'trialing'
      AND trial_ends_at IS NOT NULL
      AND trial_ends_at > now()
      AND trial_used = false
  )
$$;

CREATE OR REPLACE FUNCTION public.expire_fleetguard_trial()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF OLD.subscription_status = 'trialing' AND OLD.trial_ends_at IS NOT NULL AND OLD.trial_ends_at <= now() THEN
    NEW.subscription_status := 'expired';
    NEW.trial_used := true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_start_fleetguard_trial ON public.tenants;
CREATE TRIGGER trigger_start_fleetguard_trial BEFORE INSERT ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.start_fleetguard_trial();
DROP TRIGGER IF EXISTS trigger_expire_fleetguard_trial ON public.tenants;
CREATE TRIGGER trigger_expire_fleetguard_trial BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.expire_fleetguard_trial();

CREATE OR REPLACE FUNCTION public.has_feature(feature_key text, requested_tenant_id uuid DEFAULT public.current_tenant_id())
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE enabled boolean;
BEGIN
  IF public.fleetguard_trial_active(requested_tenant_id) THEN
    RETURN feature_key IN ('vehicles', 'component_health', 'dashboard', 'vehicle_tracking', 'components');
  END IF;
  SELECT (p.features ->> feature_key)::boolean INTO enabled
  FROM public.tenants t JOIN public.subscription_plans p ON p.code = coalesce(t.subscription_plan_code, t.subscription_plan)
  WHERE t.id = requested_tenant_id AND t.subscription_status = 'active';
  RETURN coalesce(enabled, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.subscription_snapshot(requested_tenant_id uuid DEFAULT public.current_tenant_id())
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE result jsonb; tenant_row public.tenants%ROWTYPE; plan_row public.subscription_plans%ROWTYPE; is_trial boolean;
BEGIN
  SELECT * INTO tenant_row FROM public.tenants WHERE id = requested_tenant_id;
  is_trial := public.fleetguard_trial_active(requested_tenant_id);
  SELECT * INTO plan_row FROM public.subscription_plans WHERE code = coalesce(tenant_row.subscription_plan_code, tenant_row.subscription_plan, 'basic');
  SELECT jsonb_build_object(
    'tenant_id', tenant_row.id,
    'plan', CASE WHEN is_trial THEN 'trial' ELSE plan_row.code END,
    'plan_name', CASE WHEN is_trial THEN '7-day trial' ELSE plan_row.name END,
    'price_per_vehicle_inr', CASE WHEN is_trial THEN 0 ELSE plan_row.monthly_price_inr END,
    'billing_currency', 'INR',
    'billing_interval', coalesce(tenant_row.billing_interval, 'monthly'),
    'subscription_status', CASE WHEN is_trial THEN 'trialing' ELSE tenant_row.subscription_status END,
    'trial_started_at', tenant_row.trial_started_at,
    'trial_ends_at', tenant_row.trial_ends_at,
    'trial_vehicle_limit', tenant_row.trial_vehicle_limit,
    'vehicle_count', (SELECT count(*) FROM public.vehicles v WHERE v.tenant_id = tenant_row.id AND v.status = 'active'),
    'features', CASE WHEN is_trial THEN '{"vehicles":true,"component_health":true,"dashboard":true,"vehicle_tracking":true,"components":true,"analytics":false,"work_orders":false,"inventory":false,"gps_tracking":false,"reports":false,"team_management":false,"data_export":false,"api_access":false}'::jsonb ELSE plan_row.features END
  ) INTO result;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_vehicle_entitlement()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE tenant_uuid uuid; max_vehicles integer; used_vehicles integer; tenant_status text;
BEGIN
  tenant_uuid := coalesce(NEW.tenant_id, public.current_tenant_id());
  SELECT t.subscription_status, CASE WHEN t.subscription_status = 'trialing' THEN t.trial_vehicle_limit ELSE coalesce(p.vehicle_limit, 2147483647) END INTO tenant_status, max_vehicles
  FROM public.tenants t LEFT JOIN public.subscription_plans p ON p.code = coalesce(t.subscription_plan_code, t.subscription_plan)
  WHERE t.id = tenant_uuid AND (t.subscription_status = 'active' OR (t.subscription_status = 'trialing' AND t.trial_ends_at > now() AND t.trial_used = false));
  IF tenant_status IS NULL THEN RAISE EXCEPTION 'Active FleetGuard subscription or trial required'; END IF;
  SELECT count(*) INTO used_vehicles FROM public.vehicles WHERE tenant_id = tenant_uuid AND status = 'active';
  IF TG_OP = 'INSERT' AND coalesce(NEW.status, 'active') = 'active' AND used_vehicles >= max_vehicles THEN
    RAISE EXCEPTION 'Vehicle limit reached. Your 7-day trial is limited to 3 vehicles; upgrade to continue.' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.subscription_snapshot(requested_tenant_id uuid DEFAULT public.current_tenant_id())
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE result jsonb; tenant_row public.tenants%ROWTYPE; plan_row public.subscription_plans%ROWTYPE; is_trial boolean; is_paid boolean;
BEGIN
  SELECT * INTO tenant_row FROM public.tenants WHERE id = requested_tenant_id;
  is_trial := public.fleetguard_trial_active(requested_tenant_id);
  is_paid := tenant_row.subscription_status = 'active';
  SELECT * INTO plan_row FROM public.subscription_plans WHERE code = coalesce(tenant_row.subscription_plan_code, tenant_row.subscription_plan, 'basic');
  SELECT jsonb_build_object(
    'tenant_id', tenant_row.id,
    'plan', CASE WHEN is_trial THEN 'trial' ELSE coalesce(plan_row.code, 'basic') END,
    'plan_name', CASE WHEN is_trial THEN '7-day trial' WHEN is_paid THEN coalesce(plan_row.name, 'Basic') ELSE 'Trial expired' END,
    'price_per_vehicle_inr', CASE WHEN is_trial OR NOT is_paid THEN 0 ELSE plan_row.monthly_price_inr END,
    'billing_currency', 'INR',
    'billing_interval', coalesce(tenant_row.billing_interval, 'monthly'),
    'subscription_status', CASE WHEN is_trial THEN 'trialing' WHEN is_paid THEN 'active' ELSE 'expired' END,
    'trial_started_at', tenant_row.trial_started_at,
    'trial_ends_at', tenant_row.trial_ends_at,
    'trial_vehicle_limit', tenant_row.trial_vehicle_limit,
    'vehicle_count', (SELECT count(*) FROM public.vehicles v WHERE v.tenant_id = tenant_row.id AND v.status = 'active'),
    'features', CASE WHEN is_trial THEN '{"vehicles":true,"component_health":true,"dashboard":true,"vehicle_tracking":true,"components":true,"analytics":false,"work_orders":false,"inventory":false,"gps_tracking":false,"reports":false,"team_management":false,"data_export":false,"api_access":false}'::jsonb WHEN is_paid THEN coalesce(plan_row.features, '{}'::jsonb) ELSE '{}'::jsonb END
  ) INTO result;
  RETURN result;
END;
$$;
