# Quick Email Notification Test Guide

## ✅ Good News: Everything is Already Deployed!

Your notification system is **fully deployed and ready** on production:

- ✅ **alert-dispatcher** - Creates notification jobs
- ✅ **notification-processor** - Sends emails (version 3, latest)
- ✅ **notification-worker** - Background processor
- ✅ **invite-user** - Sends invitation emails (version 2, latest)
- ✅ All other Edge Functions deployed

---

## Test 1: Sign Up and Receive Welcome Email 🎯

This is the **easiest and most realistic test**.

### Steps:

1. **Go to your production app**: 
   - https://your-app-url.vercel.app (check VERCEL_DEPLOYMENT_SUCCESS.md for URL)

2. **Have someone invite you** OR **create a new user invitation**:
   ```bash
   # Get your auth token first by logging into the app
   # Then call invite-user function
   
   curl -X POST https://ftywwrzkbtayapfiocck.supabase.co/functions/v1/invite-user \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "email": "YOUR_ACTUAL_EMAIL@example.com",
       "role": "maintenance_engineer",
       "full_name": "Test User"
     }'
   ```

3. **Check your email inbox** (including spam folder)

4. **Look for email from**: Supabase / FleetGuard AI

### Expected Result:
✅ You receive an invitation email with a link to join the company

---

## Test 2: Trigger a Test Alert 🚨

### Method A: Via Database (Easiest)

1. **Go to Supabase Dashboard**:
   - https://supabase.com/dashboard/project/ftywwrzkbtayapfiocck

2. **Open SQL Editor**

3. **Run this query**:
   ```sql
   -- First, get your tenant_id and user_id
   SELECT id as user_id, tenant_id, email FROM users LIMIT 1;
   
   -- Then create a test alert (replace the values)
   INSERT INTO alerts (
     tenant_id,
     alert_type,
     severity,
     title,
     description,
     status
   ) VALUES (
     'YOUR_TENANT_ID',  -- From query above
     'maintenance_due',
     'high',
     'TEST: Oil Change Due',
     'This is a test notification to verify email delivery',
     'active'
   ) RETURNING id;
   
   -- Get the alert_id from above, then dispatch it
   -- Call alert-dispatcher Edge Function via Supabase Dashboard
   ```

4. **The notification-processor will automatically pick it up** (runs every minute via cron)

5. **Check your email**

### Method B: Via Supabase Dashboard Edge Functions

1. **Go to**: Dashboard → Edge Functions → alert-dispatcher
2. **Click**: "Invoke Function"
3. **Paste this JSON**:
   ```json
   {
     "alert_id": "ALERT_ID_FROM_SQL_ABOVE"
   }
   ```
4. **Check your email**

---

## Test 3: Check Notification Job Status 📊

### Via SQL Editor:

```sql
-- See recent notification jobs
SELECT 
  id,
  channel,
  recipient,
  status,
  attempt,
  created_at,
  sent_at,
  error_message
FROM notification_jobs
ORDER BY created_at DESC
LIMIT 10;

-- Check for failed jobs
SELECT * FROM notification_jobs 
WHERE status = 'failed' 
ORDER BY created_at DESC;

-- Check pending jobs
SELECT * FROM notification_jobs 
WHERE status = 'queued' 
ORDER BY created_at DESC;
```

---

## Test 4: Run the Automated Test Script 🤖

I've created a test script for you: `test-notification-system.ts`

### Setup:

1. **Set environment variables**:
   ```bash
   # Windows (CMD)
   set SUPABASE_URL=https://ftywwrzkbtayapfiocck.supabase.co
   set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   
   # Windows (PowerShell)
   $env:SUPABASE_URL="https://ftywwrzkbtayapfiocck.supabase.co"
   $env:SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"
   ```

2. **Edit the script**:
   - Open `test-notification-system.ts`
   - Update line 14: `const TEST_EMAIL = 'your-actual-email@example.com';`

3. **Run the script**:
   ```bash
   deno run --allow-net --allow-env test-notification-system.ts
   ```

### What it does:
- ✅ Checks database connection
- ✅ Verifies all notification tables exist
- ✅ Checks Edge Functions deployment
- ✅ Lists recent notification jobs
- ✅ Can create a test notification (optional)

---

## Troubleshooting 🔧

### Problem: Not Receiving Emails

**Check 1: Email in Spam/Junk Folder**
- Supabase emails might go to spam initially
- Mark as "Not Spam" to train your email provider

**Check 2: Verify User Email in Database**
```sql
SELECT id, email, notification_preferences 
FROM users 
WHERE email = 'your-email@example.com';
```

**Check 3: Check Notification Job Status**
```sql
SELECT * FROM notification_jobs 
WHERE recipient = 'your-email@example.com'
ORDER BY created_at DESC;
```

**Check 4: Check Supabase Email Settings**
- Go to: Dashboard → Authentication → Email Templates
- Verify "Invite user" template is enabled
- Check rate limits (should be OK with default settings)

**Check 5: Verify Cron Jobs are Running**
```sql
SELECT * FROM cron.job WHERE jobname LIKE '%notification%';
```

### Problem: Notification Jobs Stuck in "queued" Status

**Cause**: notification-processor cron job not running

**Solution**:
1. Go to Dashboard → Database → Cron Jobs
2. Check if `notification-processor` job exists
3. If not, run migration: `99999999999999_configure_cron_jobs.sql`
4. Manually trigger: Dashboard → Edge Functions → notification-processor → Invoke

### Problem: "Failed" Status in Notification Jobs

**Check the error**:
```sql
SELECT error_message FROM notification_jobs 
WHERE status = 'failed' 
ORDER BY created_at DESC 
LIMIT 5;
```

**Common Errors**:
- "Supabase email not configured" → Verify SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Edge Function secrets
- "No email address configured" → User has no email in database
- Rate limit exceeded → Wait a bit, Supabase has email rate limits

---

## Expected Behavior ✅

### When Everything Works:

1. **User invites someone** → `invite-user` Edge Function called
2. **Invitation record created** → Row added to `user_invitations` table
3. **Email sent** → Supabase Auth sends invitation email
4. **Recipient receives email** → Within 60 seconds
5. **Email contains** → Company name, inviter name, invitation link

### For Alerts:

1. **Alert created** → Row added to `alerts` table
2. **Alert dispatcher called** → Creates notification jobs
3. **Notification processor runs** → Every 1 minute via cron
4. **Email sent** → To all relevant users
5. **Job status updated** → `queued` → `sent` (or `failed` with error)

---

## Environment Variables Checklist

### Required (Should Already Be Set):
- ✅ `SUPABASE_URL` - Your Supabase project URL
- ✅ `SUPABASE_ANON_KEY` - Public anon key
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Service role key (for Edge Functions)

### Optional (For Enhanced Features):
- ⚠️ `FCM_SERVER_KEY` - For push notifications (not required for email)
- 🔒 `TWILIO_*` - For SMS (paid feature, disabled)
- 🔒 `WHATSAPP_*` - For WhatsApp (paid feature, disabled)

### Email Configuration (Already Using Defaults):
- ✅ `EMAIL_FROM` - Default: `noreply@fleetguard.ai`
- ✅ `EMAIL_FROM_NAME` - Default: `FleetGuard AI`

---

## Quick Reference: Supabase Dashboard URLs

- **Project Dashboard**: https://supabase.com/dashboard/project/ftywwrzkbtayapfiocck
- **SQL Editor**: https://supabase.com/dashboard/project/ftywwrzkbtayapfiocck/sql
- **Edge Functions**: https://supabase.com/dashboard/project/ftywwrzkbtayapfiocck/functions
- **Authentication**: https://supabase.com/dashboard/project/ftywwrzkbtayapfiocck/auth/users
- **Cron Jobs**: https://supabase.com/dashboard/project/ftywwrzkbtayapfiocck/database/cron-jobs

---

## Next Steps After Testing

Once you've confirmed emails are working:

1. **Configure email templates** (optional):
   - Dashboard → Authentication → Email Templates
   - Customize invitation email with your branding

2. **Set up custom domain email** (optional):
   - Use your own SMTP server for branded emails
   - Update `config.toml` with SMTP settings

3. **Enable push notifications** (optional):
   - Create Firebase project
   - Add FCM_SERVER_KEY to environment

4. **Monitor notification delivery**:
   - Set up alerts for failed notifications
   - Review notification_jobs table regularly

---

## Summary

**Your system is READY!** 🎉

- ✅ All Edge Functions deployed
- ✅ Email notifications configured
- ✅ Supabase Auth email service active (FREE)
- ✅ Retry logic with 3 attempts
- ✅ Critical alert escalation enabled

**To test**: Just sign up with your real email or have someone invite you!

**Need help?** Review `NOTIFICATION_SYSTEM_VERIFICATION.md` for the complete guide.
