# Diagnose 401 Auth Issue

## Run These Commands in Browser Console (F12)

### Step 1: Check if you're actually logged in
```javascript
const { data: session } = await supabase.auth.getSession();
console.log('Has session:', !!session.session);
console.log('Session:', session);
```

### Step 2: Check the actual user
```javascript
const { data: user, error } = await supabase.auth.getUser();
console.log('User:', user);
console.log('Error:', error);
```

### Step 3: Check auth store
```javascript
const authUser = window.useAuthStore?.getState?.()?.user;
console.log('Auth Store User:', authUser);
```

### Step 4: Try calling the Edge Function manually with detailed logging
```javascript
// This will show us exactly what's being sent
const { data, error } = await supabase.functions.invoke('invite-user', {
  body: {
    email: 'test@example.com',
    full_name: 'Test Driver',
    role: 'driver'
  }
});

console.log('Response:', data);
console.log('Error:', error);
```

### Step 5: Check the response body for details
If you get an error, expand it in the console and look for:
- `error.context.body` - This should contain the detailed error message from our Edge Function
- The error should now show: `{ error: "Unauthorized", details: "...", debug: {...} }`

---

## What to Look For:

### If session is NULL:
→ You're not actually logged in. Log in again.

### If user error shows "Invalid JWT":
→ Your token is malformed. Clear storage and log in again.

### If you see "User profile not found":
→ Your user exists in Supabase Auth but not in the `users` table
→ This is the OAuth issue we fixed earlier - you might need to sign up again

### If debug shows `hasAuthHeader: false`:
→ The authorization header isn't being sent
→ This means the supabase client isn't including the session token

---

## Most Likely Cause:

Based on the persistent 401 errors, I suspect your user account was created via OAuth but the `users` table entry wasn't created properly (the OAuth tenant creation bug we fixed).

## To Verify:

```sql
-- Run this in Supabase SQL Editor
-- Replace 'your-email@example.com' with your actual email

SELECT 
  u.id as user_id,
  u.email,
  u.tenant_id,
  u.role,
  u.full_name,
  t.name as tenant_name
FROM users u
LEFT JOIN tenants t ON u.tenant_id = t.id
WHERE u.email = 'your-email@example.com';
```

If this returns NO ROWS, then your user doesn't exist in the users table, which explains the 401 error!

---

## Quick Fix if User Missing from users Table:

If the SQL above returns no rows, you need to create your user properly:

### Option 1: Sign up again with email/password (not OAuth)
1. Log out
2. Go to /signup
3. Create account with email/password
4. This will properly create the users table entry

### Option 2: Manually create the user entry (if you want to keep OAuth)
Run this SQL (replace values):
```sql
INSERT INTO users (
  id,
  email,
  full_name,
  role,
  tenant_id
) VALUES (
  'YOUR_AUTH_USER_ID', -- Get from auth.users table
  'your-email@example.com',
  'Your Name',
  'company_owner',
  'YOUR_TENANT_ID' -- Get from tenants table
);
```
