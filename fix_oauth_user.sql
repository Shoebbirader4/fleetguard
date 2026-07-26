-- Quick fix script to run in Supabase SQL Editor
-- This will fix your OAuth user account

-- Step 1: Update the trigger function to handle OAuth users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta_tenant_id uuid;
  meta_full_name text;
  meta_role text;
  meta_phone text;
  new_tenant_id uuid;
  is_oauth_signup boolean;
BEGIN
  meta_tenant_id := (NEW.raw_user_meta_data->>'tenant_id')::uuid;
  is_oauth_signup := (meta_tenant_id IS NULL);

  meta_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );
  meta_role := COALESCE(NEW.raw_user_meta_data->>'role', 'fleet_manager');
  meta_phone := NEW.raw_user_meta_data->>'phone';

  IF is_oauth_signup THEN
    DECLARE
      tenant_name text;
      email_domain text;
    BEGIN
      email_domain := split_part(NEW.email, '@', 2);
      
      IF email_domain NOT IN ('gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com') THEN
        tenant_name := initcap(split_part(email_domain, '.', 1)) || ' Fleet';
      ELSE
        tenant_name := meta_full_name || '''s Fleet';
      END IF;

      INSERT INTO public.tenants (
        name,
        subscription_plan,
        subscription_status,
        vehicle_limit,
        user_limit,
        storage_limit_gb,
        features
      ) VALUES (
        tenant_name,
        'starter',
        'active',
        50,
        10,
        10,
        '{"predictive_maintenance": true, "gps_tracking": true, "mobile_app": true, "basic_reports": true}'::jsonb
      )
      RETURNING id INTO new_tenant_id;

      meta_tenant_id := new_tenant_id;
    END;
  ELSE
    IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = meta_tenant_id) THEN
      RAISE EXCEPTION 'Invalid tenant_id provided: %', meta_tenant_id;
    END IF;
  END IF;

  INSERT INTO public.users (
    id,
    tenant_id,
    email,
    full_name,
    role,
    phone,
    notification_preferences,
    theme,
    locale,
    is_active
  ) VALUES (
    NEW.id,
    meta_tenant_id,
    NEW.email,
    meta_full_name,
    meta_role,
    meta_phone,
    '{
      "due_soon": ["email"],
      "overdue": ["email", "push"],
      "critical_failure_risk": ["email", "sms", "push"],
      "safety_risk": ["email", "sms", "push", "whatsapp"],
      "low_stock": ["email"],
      "document_expiry": ["email"],
      "document_expired": ["email", "push"],
      "tire_replacement_forecast": ["email"]
    }'::jsonb,
    'light',
    'en',
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    tenant_id = EXCLUDED.tenant_id,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    updated_at = now();

  RETURN NEW;
END;
$$;

-- Step 2: Fix existing OAuth users without tenant
DO $$
DECLARE
  auth_user RECORD;
  new_tenant_id uuid;
  tenant_name text;
  email_domain text;
  user_full_name text;
BEGIN
  FOR auth_user IN 
    SELECT au.id, au.email, au.raw_user_meta_data
    FROM auth.users au
    LEFT JOIN public.users pu ON au.id = pu.id
    WHERE pu.id IS NULL
  LOOP
    user_full_name := COALESCE(
      auth_user.raw_user_meta_data->>'full_name',
      auth_user.raw_user_meta_data->>'name',
      split_part(auth_user.email, '@', 1)
    );

    email_domain := split_part(auth_user.email, '@', 2);
    
    IF email_domain NOT IN ('gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com') THEN
      tenant_name := initcap(split_part(email_domain, '.', 1)) || ' Fleet';
    ELSE
      tenant_name := user_full_name || '''s Fleet';
    END IF;

    INSERT INTO public.tenants (
      name,
      subscription_plan,
      subscription_status,
      vehicle_limit,
      user_limit,
      storage_limit_gb,
      features
    ) VALUES (
      tenant_name,
      'starter',
      'active',
      50,
      10,
      10,
      '{"predictive_maintenance": true, "gps_tracking": true, "mobile_app": true, "basic_reports": true}'::jsonb
    )
    RETURNING id INTO new_tenant_id;

    INSERT INTO public.users (
      id,
      tenant_id,
      email,
      full_name,
      role,
      notification_preferences,
      theme,
      locale,
      is_active
    ) VALUES (
      auth_user.id,
      new_tenant_id,
      auth_user.email,
      user_full_name,
      'fleet_manager',
      '{
        "due_soon": ["email"],
        "overdue": ["email", "push"],
        "critical_failure_risk": ["email", "sms", "push"],
        "safety_risk": ["email", "sms", "push", "whatsapp"],
        "low_stock": ["email"],
        "document_expiry": ["email"],
        "document_expired": ["email", "push"],
        "tire_replacement_forecast": ["email"]
      }'::jsonb,
      'light',
      'en',
      true
    );

    RAISE NOTICE 'Fixed OAuth user: % with tenant: %', auth_user.email, new_tenant_id;
  END LOOP;
END $$;

-- Step 3: Verify the fix
SELECT 
  au.id,
  au.email,
  pu.tenant_id,
  t.name as tenant_name,
  CASE WHEN pu.id IS NULL THEN 'MISSING' ELSE 'EXISTS' END as user_profile_status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
LEFT JOIN public.tenants t ON pu.tenant_id = t.id;
