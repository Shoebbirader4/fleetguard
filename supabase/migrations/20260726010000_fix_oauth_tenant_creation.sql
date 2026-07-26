-- Migration: Fix OAuth user signup to auto-create tenant
-- Description: When users sign up via OAuth (Google, etc.), they don't have tenant_id
--              in metadata. This migration fixes the trigger to auto-create a tenant
--              for OAuth users and properly set up their user profile.

-- ============================================================================
-- UPDATED USER PROFILE AUTO-CREATION TRIGGER
-- ============================================================================

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
  -- Check if this is an OAuth signup (no tenant_id in metadata)
  meta_tenant_id := (NEW.raw_user_meta_data->>'tenant_id')::uuid;
  is_oauth_signup := (meta_tenant_id IS NULL);

  -- Extract metadata
  meta_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1) -- Use email prefix as fallback
  );
  meta_role := COALESCE(NEW.raw_user_meta_data->>'role', 'fleet_manager'); -- Default OAuth users to fleet_manager
  meta_phone := NEW.raw_user_meta_data->>'phone';

  -- If OAuth signup, auto-create a tenant for this user
  IF is_oauth_signup THEN
    -- Generate tenant name from email domain or full name
    DECLARE
      tenant_name text;
      email_domain text;
    BEGIN
      email_domain := split_part(NEW.email, '@', 2);
      
      -- Use domain name if not a common email provider
      IF email_domain NOT IN ('gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com') THEN
        tenant_name := initcap(split_part(email_domain, '.', 1)) || ' Fleet';
      ELSE
        tenant_name := meta_full_name || '''s Fleet';
      END IF;

      -- Create new tenant
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
        50,   -- Starter plan vehicle limit
        10,   -- Starter plan user limit
        10,   -- 10 GB storage
        '{"predictive_maintenance": true, "gps_tracking": true, "mobile_app": true, "basic_reports": true}'::jsonb
      )
      RETURNING id INTO new_tenant_id;

      meta_tenant_id := new_tenant_id;

      RAISE NOTICE 'Auto-created tenant % for OAuth user %', new_tenant_id, NEW.email;
    END;
  ELSE
    -- Regular signup with tenant_id provided
    -- Validate that the tenant exists
    IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = meta_tenant_id) THEN
      RAISE EXCEPTION 'Invalid tenant_id provided: %', meta_tenant_id;
    END IF;
  END IF;

  -- Insert user profile
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

COMMENT ON FUNCTION public.handle_new_user IS 'Automatically creates user profile and tenant (if OAuth signup) when auth user signs up';

-- ============================================================================
-- HELPER FUNCTION: Fix existing OAuth users without tenant
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fix_oauth_users_without_tenant()
RETURNS TABLE (
  user_id uuid,
  email text,
  tenant_id uuid,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  auth_user RECORD;
  new_tenant_id uuid;
  tenant_name text;
  email_domain text;
BEGIN
  -- Find auth users who don't have a profile in users table
  FOR auth_user IN 
    SELECT au.id, au.email, au.raw_user_meta_data
    FROM auth.users au
    LEFT JOIN public.users pu ON au.id = pu.id
    WHERE pu.id IS NULL
  LOOP
    -- Extract name from metadata or email
    DECLARE
      user_full_name text;
    BEGIN
      user_full_name := COALESCE(
        auth_user.raw_user_meta_data->>'full_name',
        auth_user.raw_user_meta_data->>'name',
        split_part(auth_user.email, '@', 1)
      );

      email_domain := split_part(auth_user.email, '@', 2);
      
      -- Generate tenant name
      IF email_domain NOT IN ('gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com') THEN
        tenant_name := initcap(split_part(email_domain, '.', 1)) || ' Fleet';
      ELSE
        tenant_name := user_full_name || '''s Fleet';
      END IF;

      -- Create tenant
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

      -- Create user profile
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

      -- Return result
      user_id := auth_user.id;
      email := auth_user.email;
      tenant_id := new_tenant_id;
      status := 'fixed';
      RETURN NEXT;

    END;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.fix_oauth_users_without_tenant IS 'One-time fix for existing OAuth users who signed up before this migration';

-- ============================================================================
-- RUN THE FIX FOR EXISTING USERS
-- ============================================================================

-- Fix any existing OAuth users who don't have tenants
SELECT * FROM public.fix_oauth_users_without_tenant();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check if any auth users are missing from users table
-- SELECT 
--   au.id,
--   au.email,
--   CASE WHEN pu.id IS NULL THEN 'MISSING' ELSE 'EXISTS' END as user_profile_status
-- FROM auth.users au
-- LEFT JOIN public.users pu ON au.id = pu.id;

