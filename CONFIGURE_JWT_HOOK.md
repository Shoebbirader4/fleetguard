# Configure JWT Custom Access Token Hook in Supabase

## Problem
The JWT token doesn't include `tenant_id` and `role` claims, causing RLS policies to block vehicle creation.

## Solution
You need to enable the custom access token hook in Supabase Dashboard.

---

## Steps to Configure

### 1. Go to Supabase Dashboard
1. Open: https://supabase.com/dashboard/project/ftywwrzkbtayapfiocck
2. Click on "Authentication" in the left sidebar
3. Click on "Hooks" tab

### 2. Configure Custom Access Token Hook
1. Find the **"Custom Access Token"** section
2. Enable the hook
3. Select **"custom_access_token_hook"** from the dropdown (this function already exists)
4. Click **"Save"**

The hook function already exists in your database (created by migration `20250609000000_configure_auth_with_custom_claims.sql`)

---

## Alternative: Quick SQL Fix (Temporary)

If you want to test immediately without configuring the hook, you can temporarily grant broader permissions.

Run this in Supabase SQL Editor (https://supabase.com/dashboard/project/ftywwrzkbtayapfiocck/sql/new):

```sql
-- Temporary fix: Allow company_owner role to insert vehicles using user metadata
DROP POLICY IF EXISTS "Vehicles are insertable by authorized roles" ON vehicles;

CREATE POLICY "Vehicles are insertable by authorized roles"
  ON vehicles FOR INSERT
  WITH CHECK (
    -- Check JWT claims first (preferred)
    ((tenant_id = (auth.jwt() ->> 'tenant_id')::uuid 
      AND (auth.jwt() ->> 'role') IN ('company_owner', 'fleet_manager'))
     OR (auth.jwt() ->> 'role') = 'super_admin')
    OR
    -- Fallback: Check user_metadata if JWT claims not present
    (tenant_id = (
      SELECT u.tenant_id 
      FROM public.users u 
      WHERE u.id = auth.uid()
    )
    AND (
      SELECT u.role 
      FROM public.users u 
      WHERE u.id = auth.uid()
    ) IN ('company_owner', 'fleet_manager', 'super_admin'))
  );
```

This policy will:
1. First check JWT claims (if hook is configured)
2. Fall back to checking the `users` table if claims are missing

---

## Verify the Fix

After either:
- Configuring the JWT hook in dashboard, OR
- Running the SQL fix above

Try these steps:

1. **Log out** from https://fleet-guard-five.vercel.app
2. **Log back in** with your Gmail account (to get fresh token)
3. Try to **create a vehicle**

It should work! ✅

---

## Recommended Approach

**Use the JWT Hook configuration (Step 2 above)** - This is the proper, permanent solution.

The SQL fix is a temporary workaround that adds a database query on every insert, which is less performant but will work immediately.

---

## How to Check if JWT Hook is Working

After configuring the hook and logging back in, open browser console and run:

```javascript
// Get the current session
const { data } = await supabase.auth.getSession();
console.log('JWT claims:', data.session.access_token);

// Decode JWT to see claims (paste token at jwt.io)
```

You should see `tenant_id` and `role` in the JWT claims.

---

## Current User Info

- **Email**: shoebbirader@gmail.com
- **User ID**: 41e88732-ca5b-4502-9e2b-06c09d8d597c
- **Tenant ID**: a37f1d51-8b01-4f03-a8f1-7f4ac4480e2d
- **Tenant Name**: Humsafar
- **Role**: company_owner
- **Vehicle Limit**: 10 vehicles (Starter plan)
