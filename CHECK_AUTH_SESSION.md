# Check Your Authentication Session

## The 401 error means your auth token is invalid or expired

### Step 1: Open Browser Console (F12)

### Step 2: Run these commands:

```javascript
// Check if you have a session
const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
console.log('Session:', sessionData.session);
console.log('Session Error:', sessionError);

// Check if you can get user
const { data: userData, error: userError } = await supabase.auth.getUser();
console.log('User:', userData.user);
console.log('User Error:', userError);

// Check token expiry
if (sessionData.session) {
  const expiresAt = sessionData.session.expires_at;
  const now = Math.floor(Date.now() / 1000);
  const isExpired = expiresAt < now;
  console.log('Token expires at:', new Date(expiresAt * 1000));
  console.log('Is expired:', isExpired);
  console.log('Time until expiry:', Math.floor((expiresAt - now) / 60), 'minutes');
}
```

### Step 3: Interpret Results

**If session is NULL or expired:**
→ You need to log out and log back in

**If user error shows "Invalid token" or "JWT expired":**
→ Your token is invalid, log out and log back in

**If everything looks good:**
→ The issue is with how the token is being sent to the Edge Function

---

## Quick Fix: Force Re-authentication

### Method 1: Clear Everything (Recommended)
```javascript
// Run in browser console
localStorage.clear();
sessionStorage.clear();
await supabase.auth.signOut();
location.reload();
// Then log in again
```

### Method 2: Just Sign Out
1. Click your profile
2. Click "Logout"
3. Log in again

---

## After Re-login, Try Driver Form Again

The 401 error should be gone if the issue was an expired token.

---

## If Still Getting 401 After Fresh Login

Then check the browser console for the detailed error. The Edge Function now returns:
```json
{
  "error": "Unauthorized",
  "details": "Specific error message",
  "debug": {
    "hasAuthHeader": true/false,
    "errorCode": "error_code_here"
  }
}
```

This will tell us exactly why authentication is failing.
