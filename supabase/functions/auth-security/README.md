# Auth Security Edge Function

**Task:** 17.3 Implement authentication security  
**Requirements:** 28.3, 28.5, 28.7

## Overview

This edge function implements enterprise-grade authentication security features including:

1. **Password Complexity Enforcement (Requirement 28.3)**
   - Minimum 12 characters
   - Must contain uppercase letters
   - Must contain lowercase letters
   - Must contain numbers
   - Must contain special characters

2. **Authentication Attempt Logging (Requirement 28.5)**
   - Logs all login attempts (successful and failed)
   - Tracks IP addresses and user agents
   - Stores metadata for security analysis

3. **Account Lockout (Requirement 28.7)**
   - Locks account after 5 failed attempts in 15 minutes
   - Locks account after 10 failed attempts in 1 hour
   - Locks account after 20 failed attempts in 24 hours
   - Notifies administrators via alerts system
   - Automatic unlock after timeout period
   - Manual unlock by administrators

## API Endpoints

### 1. Log Authentication Attempt

**Endpoint:** `POST /auth-security/log-attempt`

**Purpose:** Logs all authentication attempts for security monitoring.

**Request Body:**
```json
{
  "email": "user@example.com",
  "success": false,
  "attemptType": "login",
  "failureReason": "invalid_password",
  "userId": "uuid-optional",
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0..."
}
```

**Response:**
```json
{
  "success": true,
  "attemptId": "uuid"
}
```

**Auto-triggers:** If login fails, automatically checks for suspicious activity and locks account if needed.

---

### 2. Check Account Lockout

**Endpoint:** `GET /auth-security/check-lockout?email=user@example.com`

**Purpose:** Checks if an account is currently locked.

**Response (not locked):**
```json
{
  "locked": false
}
```

**Response (locked):**
```json
{
  "locked": true,
  "lockout_id": "uuid",
  "locked_until": "2025-01-19T15:30:00Z",
  "lock_reason": "repeated_failed_logins",
  "failed_attempts": 5,
  "time_remaining_seconds": 1234
}
```

---

### 3. Validate Password Complexity

**Endpoint:** `POST /auth-security/validate-password`

**Purpose:** Validates password meets security requirements.

**Request Body:**
```json
{
  "password": "MyPassword123!"
}
```

**Response (valid):**
```json
{
  "valid": true,
  "errors": []
}
```

**Response (invalid):**
```json
{
  "valid": false,
  "errors": [
    "Password must be at least 12 characters long",
    "Password must contain at least one special character"
  ]
}
```

---

### 4. Unlock Account (Admin Only)

**Endpoint:** `POST /auth-security/unlock-account`

**Authorization:** Required (Bearer token). User must have role: `super_admin`, `company_owner`, or `fleet_manager`.

**Request Body:**
```json
{
  "email": "user@example.com",
  "reason": "User verified via phone call"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Account unlocked successfully"
}
```

---

### 5. Cleanup Expired Lockouts (Cron Job)

**Endpoint:** `POST /auth-security/cleanup-lockouts`

**Authorization:** Requires `x-cron-secret` header with valid cron secret.

**Purpose:** Automatically unlocks accounts whose lockout period has expired.

**Response:**
```json
{
  "success": true,
  "unlockedCount": 3
}
```

**Cron Schedule:** Recommended to run every 5 minutes.

---

## Integration Guide

### Frontend Integration (Login Flow)

```typescript
// 1. Check if account is locked before attempting login
const checkLockout = async (email: string) => {
  const response = await fetch(
    `${EDGE_FUNCTION_URL}/auth-security/check-lockout?email=${encodeURIComponent(email)}`
  );
  const lockStatus = await response.json();
  
  if (lockStatus.locked) {
    throw new Error(
      `Account is locked due to ${lockStatus.lock_reason}. ` +
      `Please try again in ${Math.ceil(lockStatus.time_remaining_seconds / 60)} minutes.`
    );
  }
};

// 2. Attempt login with Supabase Auth
const login = async (email: string, password: string) => {
  // Check lockout first
  await checkLockout(email);
  
  // Attempt login
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  // Log the attempt
  await fetch(`${EDGE_FUNCTION_URL}/auth-security/log-attempt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      success: !error,
      attemptType: 'login',
      failureReason: error?.message || null,
      userId: data?.user?.id || null
    })
  });
  
  if (error) throw error;
  return data;
};
```

### Frontend Integration (Signup Flow)

```typescript
// Validate password before signup
const validatePassword = async (password: string) => {
  const response = await fetch(`${EDGE_FUNCTION_URL}/auth-security/validate-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  });
  
  const result = await response.json();
  
  if (!result.valid) {
    throw new Error(result.errors.join('\n'));
  }
};

// Signup with validated password
const signup = async (email: string, password: string, metadata: any) => {
  // Validate password first
  await validatePassword(password);
  
  // Attempt signup
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata
    }
  });
  
  // Log the attempt
  await fetch(`${EDGE_FUNCTION_URL}/auth-security/log-attempt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      success: !error,
      attemptType: 'signup',
      failureReason: error?.message || null,
      userId: data?.user?.id || null
    })
  });
  
  if (error) throw error;
  return data;
};
```

### Admin Integration (Unlock Account)

```typescript
const unlockAccount = async (email: string, reason: string, authToken: string) => {
  const response = await fetch(`${EDGE_FUNCTION_URL}/auth-security/unlock-account`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({ email, reason })
  });
  
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to unlock account');
  }
  
  return result;
};
```

---

## Database Functions

The following PostgreSQL functions are available (created by migration):

### `log_auth_attempt()`
Logs an authentication attempt with all relevant details.

### `check_and_lock_suspicious_account()`
Analyzes failed login attempts and locks accounts when thresholds are exceeded. Automatically creates alerts for administrators.

### `is_account_locked()`
Checks if an account is currently locked and returns lockout details.

### `unlock_account()`
Allows administrators to manually unlock accounts before the timeout expires.

### `validate_password_with_details()`
Validates password complexity and returns detailed error messages.

### `cleanup_expired_lockouts()`
Automatically unlocks accounts whose lockout period has expired (called by cron).

---

## Security Considerations

1. **Rate Limiting:** The edge function itself should be rate-limited to prevent abuse.

2. **IP Tracking:** IP addresses are logged for security analysis but should be handled according to privacy regulations (GDPR, CCPA).

3. **Admin Permissions:** Only users with `super_admin`, `company_owner`, or `fleet_manager` roles can unlock accounts.

4. **Alert Notifications:** When an account is locked, an alert is created in the `alerts` table with type `security_alert` and severity `high`. Administrators should receive notifications via the multi-channel notification system.

5. **Password Validation:** Password complexity is enforced at multiple levels:
   - Client-side (immediate feedback)
   - Edge function (before signup)
   - Database function (final validation)

---

## Monitoring and Analytics

### Key Metrics to Track

1. **Failed Login Attempts:** Monitor the `auth_attempts` table for patterns
2. **Account Lockouts:** Track lockout frequency and reasons
3. **Unlock Requests:** Monitor manual unlocks by administrators
4. **IP Addresses:** Identify suspicious IP addresses with high failure rates

### Query Examples

```sql
-- Failed login attempts in last 24 hours
SELECT COUNT(*), email
FROM auth_attempts
WHERE success = false
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY email
ORDER BY COUNT(*) DESC;

-- Active lockouts
SELECT email, locked_at, locked_until, lock_reason, failed_attempts_count
FROM account_lockouts
WHERE unlocked_at IS NULL
  AND locked_until > NOW()
ORDER BY locked_at DESC;

-- Lockout statistics by reason
SELECT lock_reason, COUNT(*), AVG(failed_attempts_count)
FROM account_lockouts
WHERE locked_at > NOW() - INTERVAL '30 days'
GROUP BY lock_reason;
```

---

## Deployment

### 1. Deploy Migration
```bash
# Run the migration to create tables and functions
supabase db push
```

### 2. Deploy Edge Function
```bash
# Deploy the edge function
supabase functions deploy auth-security
```

### 3. Set Environment Variables
```bash
# Set the cron secret for automated cleanup
supabase secrets set CRON_SECRET=your-secure-random-secret
```

### 4. Configure Cron Job
Add to `supabase/config.toml`:
```toml
[functions.auth-security]
verify_jwt = false

[[functions.auth-security.cron]]
schedule = "*/5 * * * *"  # Every 5 minutes
endpoint = "/auth-security/cleanup-lockouts"
headers = { x-cron-secret = "env:CRON_SECRET" }
```

### 5. Configure Supabase Auth
In Supabase Dashboard > Authentication > Settings:
- Set minimum password length to 12
- Enable custom SMTP for email notifications (optional)
- Configure rate limiting for auth endpoints

---

## Testing

### Test Password Validation
```bash
curl -X POST https://your-project.supabase.co/functions/v1/auth-security/validate-password \
  -H "Content-Type: application/json" \
  -d '{"password": "weak"}'

# Expected: {"valid": false, "errors": [...]}

curl -X POST https://your-project.supabase.co/functions/v1/auth-security/validate-password \
  -H "Content-Type: application/json" \
  -d '{"password": "StrongPass123!@#"}'

# Expected: {"valid": true, "errors": []}
```

### Test Authentication Logging
```bash
curl -X POST https://your-project.supabase.co/functions/v1/auth-security/log-attempt \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "success": false,
    "attemptType": "login",
    "failureReason": "invalid_password"
  }'

# Expected: {"success": true, "attemptId": "uuid"}
```

### Test Lockout Check
```bash
curl "https://your-project.supabase.co/functions/v1/auth-security/check-lockout?email=test@example.com"

# Expected: {"locked": false} or {"locked": true, ...}
```

---

## Troubleshooting

### Issue: Passwords not being validated
**Solution:** Ensure the migration has been applied and the `validate_password_with_details()` function exists in the database.

### Issue: Authentication attempts not being logged
**Solution:** Check that the edge function has the correct Supabase service role key and can access the database.

### Issue: Account not locking after failed attempts
**Solution:** Verify that `check_and_lock_suspicious_account()` is being called after each failed login. Check the function logs for errors.

### Issue: Lockouts not expiring automatically
**Solution:** Ensure the cron job is configured correctly and the `cleanup_expired_lockouts()` function is being called regularly.

---

## Support

For questions or issues, refer to:
- Task 17.3 implementation in `.kiro/specs/fleetguard-ai/tasks.md`
- Requirements 28.3, 28.5, 28.7 in `.kiro/specs/fleetguard-ai/requirements.md`
- Database migration: `supabase/migrations/20260119000000_implement_authentication_security.sql`
