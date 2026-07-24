# Authentication Setup Documentation

## Overview

This document explains the Supabase Auth configuration for FleetGuard AI, including:
- Password security requirements (Requirement 28.3)
- Session management (Requirement 1.5)
- JWT custom claims with tenant_id and role (Requirements 1.1, 1.5)
- Automatic user profile creation on signup

## Configuration Summary

### 1. Password Requirements (Requirement 28.3)

**Configuration**: `supabase/config.toml`

```toml
[auth]
minimum_password_length = 12
password_requirements = "lower_upper_letters_digits_symbols"
```

**Enforced Rules**:
- Minimum 12 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one digit (0-9)
- At least one special character (!@#$%^&* etc.)

**Example Valid Passwords**:
- `SecurePass123!@#`
- `FleetGuard2024$`
- `MyP@ssw0rd123`

**Example Invalid Passwords**:
- `password123` (no uppercase, no special chars)
- `PASSWORD123!` (no lowercase)
- `ShortP@ss1` (less than 12 chars)

### 2. Session Timeout (Requirement 1.5)

**Configuration**: `supabase/config.toml`

```toml
[auth]
jwt_expiry = 86400  # 24 hours in seconds
```

**Behavior**:
- JWT tokens expire after 24 hours of inactivity
- Users must re-authenticate after token expiration
- Refresh tokens can be used to extend sessions

### 3. JWT Custom Claims

**Migration**: `20250609000000_configure_auth_with_custom_claims.sql`

**Function**: `public.custom_access_token_hook`

This function is automatically called by Supabase Auth when issuing JWT tokens. It adds:
- `tenant_id`: UUID of the user's tenant/company
- `role`: User's role (e.g., 'fleet_manager', 'driver', 'mechanic')

**JWT Payload Example**:
```json
{
  "aud": "authenticated",
  "exp": 1234567890,
  "sub": "user-uuid-here",
  "email": "user@example.com",
  "tenant_id": "tenant-uuid-here",
  "role": "fleet_manager"
}
```

**Usage in RLS Policies**:
```sql
CREATE POLICY "Tenant isolation"
ON vehicles FOR ALL
USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
```

### 4. Automatic User Profile Creation

**Migration**: `20250609000000_configure_auth_with_custom_claims.sql`

**Trigger**: `on_auth_user_created` on `auth.users` table

**Function**: `public.handle_new_user()`

**How It Works**:
1. User signs up via Supabase Auth (email/password)
2. Signup request includes metadata:
   ```javascript
   {
     email: 'user@example.com',
     password: 'SecurePass123!@#',
     options: {
       data: {
         tenant_id: 'tenant-uuid',
         full_name: 'John Doe',
         role: 'driver',
         phone: '+1234567890'
       }
     }
   }
   ```
3. Auth user is created in `auth.users` table
4. Trigger fires and calls `handle_new_user()`
5. Function extracts metadata and creates profile in `public.users` table
6. User profile includes default notification preferences

**Error Handling**:
- If `tenant_id` is missing: `EXCEPTION: tenant_id is required in user metadata during signup`
- If `tenant_id` doesn't exist: `EXCEPTION: Invalid tenant_id provided`

## Implementation Guide

### For Frontend Developers

#### 1. User Signup

```typescript
import { supabase } from './supabaseClient';

async function signUp(
  email: string,
  password: string,
  tenantId: string,
  fullName: string,
  role: string,
  phone?: string
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        tenant_id: tenantId,
        full_name: fullName,
        role: role,
        phone: phone,
      },
    },
  });

  if (error) {
    console.error('Signup error:', error.message);
    return { error };
  }

  // User profile is automatically created by trigger
  return { data };
}
```

#### 2. Client-Side Password Validation

```typescript
function validatePassword(password: string): boolean {
  const minLength = 12;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(password);

  return (
    password.length >= minLength &&
    hasUpperCase &&
    hasLowerCase &&
    hasDigit &&
    hasSpecialChar
  );
}
```

#### 3. Accessing JWT Claims

```typescript
// Get current user's tenant_id and role from JWT
const { data: { session } } = await supabase.auth.getSession();

if (session) {
  const tenantId = session.user.user_metadata.tenant_id;
  const role = session.user.user_metadata.role;
  
  console.log('Tenant ID:', tenantId);
  console.log('Role:', role);
}
```

#### 4. Handling Session Expiry

```typescript
// Listen for auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    // Redirect to login page
    window.location.href = '/login';
  } else if (event === 'TOKEN_REFRESHED') {
    console.log('Session refreshed automatically');
  }
});
```

### For Backend Developers (Edge Functions)

#### 1. Accessing Claims in Edge Functions

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization')!;
  const token = authHeader.replace('Bearer ', '');
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  // Get user from JWT
  const { data: { user } } = await supabase.auth.getUser(token);
  
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Access custom claims from JWT
  const tenantId = user.user_metadata.tenant_id;
  const role = user.user_metadata.role;

  // Use claims for authorization logic
  if (role !== 'fleet_manager') {
    return new Response('Forbidden', { status: 403 });
  }

  // Proceed with business logic
  // ...
});
```

## Testing

### 1. Test Password Validation Function

```sql
-- Should return false (weak password)
SELECT validate_password_complexity('password123');

-- Should return true (strong password)
SELECT validate_password_complexity('SecurePass123!@#');
```

### 2. Test User Signup Flow

```javascript
// Test valid signup
const result = await signUp(
  'test@example.com',
  'SecurePass123!@#',
  'existing-tenant-uuid',
  'Test User',
  'driver',
  '+1234567890'
);
console.log('Signup result:', result);

// Verify user profile was created
const { data: users } = await supabase
  .from('users')
  .select('*')
  .eq('email', 'test@example.com');
console.log('User profile:', users[0]);
```

### 3. Test JWT Claims

```javascript
// Sign in
const { data: { session } } = await supabase.auth.signInWithPassword({
  email: 'test@example.com',
  password: 'SecurePass123!@#',
});

// Decode JWT to inspect claims
const payload = JSON.parse(atob(session.access_token.split('.')[1]));
console.log('JWT Claims:', payload);
console.log('Tenant ID:', payload.tenant_id);
console.log('Role:', payload.role);
```

### 4. Test RLS Policies with JWT Claims

```javascript
// After signing in, try to query vehicles
const { data: vehicles, error } = await supabase
  .from('vehicles')
  .select('*');

// Should only return vehicles for the user's tenant
console.log('Vehicles:', vehicles);
console.log('Error:', error); // Should be null if RLS is working
```

## Production Deployment

### Supabase Dashboard Configuration

After applying the migration, you need to configure the custom access token hook in the Supabase dashboard:

1. Go to **Authentication** > **Hooks** in Supabase dashboard
2. Find **Custom Access Token Hook**
3. Enable the hook
4. Set URI: `pg-functions://postgres/public/custom_access_token_hook`
5. Save changes

Alternatively, this can be configured via CLI using `supabase/config.toml`:

```toml
[auth.hook.custom_access_token]
enabled = true
uri = "pg-functions://postgres/public/custom_access_token_hook"
```

### Environment Variables

No additional environment variables are required for this auth setup. The configuration is handled via:
- `supabase/config.toml` for local development
- Supabase dashboard settings for production

## Security Considerations

### 1. JWT Claims Security

- JWT claims are **read-only** from the client perspective
- Claims are populated by the database function, not client input
- RLS policies trust JWT claims because they're server-generated

### 2. User Metadata Validation

The `handle_new_user()` function validates:
- `tenant_id` is provided and exists in the `tenants` table
- Role is one of the allowed values (enforced by CHECK constraint)

### 3. Password Security

- Passwords are hashed by Supabase Auth (bcrypt)
- Plain-text passwords are never stored
- Client-side validation provides UX feedback
- Server-side validation enforces security

### 4. Session Management

- 24-hour token expiry balances security and UX
- Refresh tokens allow seamless session extension
- `enable_refresh_token_rotation = true` prevents token replay attacks

## Troubleshooting

### Issue: "tenant_id is required in user metadata during signup"

**Cause**: Signup request missing `tenant_id` in metadata

**Solution**: Ensure client code includes tenant_id:
```javascript
options: {
  data: {
    tenant_id: 'your-tenant-uuid',
    // ... other fields
  }
}
```

### Issue: "Invalid tenant_id provided"

**Cause**: `tenant_id` doesn't exist in `tenants` table

**Solution**: Create tenant first, then use its ID for signup

### Issue: JWT doesn't contain tenant_id or role

**Cause**: Custom access token hook not enabled

**Solution**: 
1. Check `supabase/config.toml` has hook enabled
2. Apply config: `supabase db push`
3. Verify function exists: `SELECT proname FROM pg_proc WHERE proname = 'custom_access_token_hook';`

### Issue: RLS policies blocking all access

**Cause**: JWT claims not being read correctly

**Solution**:
1. Verify user has profile in `public.users` table
2. Check JWT payload contains `tenant_id` claim
3. Test RLS policy manually:
   ```sql
   SELECT (auth.jwt() ->> 'tenant_id')::uuid;
   ```

## References

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Custom Claims with Database Hooks](https://supabase.com/docs/guides/auth/auth-hooks)
- [Password Requirements Configuration](https://supabase.com/docs/guides/auth/passwords)
