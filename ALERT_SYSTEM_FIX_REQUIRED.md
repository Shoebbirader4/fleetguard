# Alert System Fix Required

## 🔴 PROBLEMS FOUND

### 1. **Database Settings NOT Configured** ⚠️
The service role key is missing, which prevents cron jobs from calling edge functions.

**Status:** `app.settings.service_role_key = NO (CONFIGURE IN DASHBOARD)`

---

### 2. **Odometer Alert Functions Missing**
The `check_components_and_create_alerts()` function has issues (column ambiguity).

---

### 3. **Alert Created but Notification Jobs NOT Auto-Generated**
- ✅ Alert created successfully: `2aebaf54-36d2-448b-afa1-8301474ca728`
- ❌ Notification jobs NOT created automatically
- ❌ `trigger_alert_dispatch` trigger exists but not firing properly

---

## ✅ WHAT I DID (Testing)

1. ✅ Manually created alert for your exhaust component
2. ✅ Manually created notification job for your email: `shoebbirader@gmail.com`
3. ✅ Job status: `queued` (waiting for notification-processor cron to run)

---

## 🔧 FIXES REQUIRED

### **FIX 1: Configure Database Settings** (CRITICAL)

You need to set these in Supabase Dashboard:

1. Go to: **Supabase Dashboard** → **Settings** → **Database** → **Custom Settings** (or Database Settings)
2. Add these custom PostgreSQL settings:

```sql
app.settings.supabase_url = https://ftywwrzkbtayapfiocck.supabase.co
app.settings.service_role_key = [YOUR-SERVICE-ROLE-KEY]
```

**To find your service role key:**
- Supabase Dashboard → **Settings** → **API** → **Service role key (secret)**
- Copy the `service_role` key (NOT the `anon` key)

**Alternative: Run SQL directly**
```sql
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://ftywwrzkbtayapfiocck.supabase.co';
ALTER DATABASE postgres SET app.settings.service_role_key = 'eyJhbGc...YOUR-KEY-HERE';
```

---

### **FIX 2: Deploy Edge Functions**

The edge functions need to be deployed to your Supabase project:

```powershell
# Deploy alert-dispatcher
supabase functions deploy alert-dispatcher --linked

# Deploy notification-processor  
supabase functions deploy notification-processor --linked

# Deploy maintenance-scheduler
supabase functions deploy maintenance-scheduler --linked
```

---

### **FIX 3: Enable pg_net Extension**

The trigger uses `net.http_post()` which requires pg_net extension:

```sql
CREATE EXTENSION IF NOT EXISTS pg_net;
```

Run this in Supabase SQL Editor.

---

### **FIX 4: Re-apply Odometer Alert Migration**

The migration file exists but the function has issues. I'll create a fixed version.

---

## 🧪 TESTING STEPS (After Fixes)

### **Step 1: Verify Configuration**
```sql
SELECT * FROM check_notification_system_health();
```

Should show:
- ✅ Service role key configured: YES
- ✅ Supabase URL configured: YES

---

### **Step 2: Check if notification job was processed**
```sql
SELECT 
  id,
  channel,
  recipient,
  status,
  attempt,
  sent_at,
  error_message
FROM notification_jobs
WHERE id = '6851992b-bda3-4e2d-a277-886b32455ad7';
```

Status should change from `queued` → `sent` within 1 minute.

---

### **Step 3: Check your email**
- Check `shoebbirader@gmail.com` inbox
- Subject: `[FleetGuard] Overdue: Exhaust Replacement`
- If not in inbox, check spam folder

---

### **Step 4: Test automatic alert creation**
Update vehicle odometer to trigger new alert:

```sql
-- Update vehicle odometer to exceed threshold further
UPDATE vehicles 
SET current_odometer = 10500 
WHERE id = 'e4176de2-321e-491e-a6ff-9fa21ab042fe';

-- This should trigger the odometer alert function
-- Check if new alert was created:
SELECT * FROM alerts WHERE vehicle_id = 'e4176de2-321e-491e-a6ff-9fa21ab042fe' ORDER BY created_at DESC;
```

---

## 📊 CURRENT DATA SUMMARY

### Your Vehicle:
- **Vehicle ID:** `e4176de2-321e-491e-a6ff-9fa21ab042fe`
- **Registration:** `MH20BR48151744123`
- **Current Odometer:** 9,996 km

### Your Component:
- **Component ID:** `060dd822-c114-4a76-bae1-d1a69cec49b7`
- **Type:** Exhaust
- **Installed at:** 5,000 km
- **Expected life:** 4,999 km
- **Elapsed:** 4,996 km (99.94% used) ⚠️
- **Status:** Should trigger OVERDUE alert

### Your Alert:
- **Alert ID:** `2aebaf54-36d2-448b-afa1-8301474ca728`
- **Type:** overdue
- **Severity:** high
- **Title:** "Overdue: Exhaust Replacement"
- **Status:** active ✅

### Your Notification Job:
- **Job ID:** `6851992b-bda3-4e2d-a277-886b32455ad7`
- **Channel:** email
- **Recipient:** shoebbirader@gmail.com
- **Status:** queued (waiting for cron to process)

---

## ⚡ QUICK FIX COMMANDS

Run these in order:

```powershell
# 1. Enable pg_net extension
supabase db query "CREATE EXTENSION IF NOT EXISTS pg_net;" --linked

# 2. Deploy edge functions
supabase functions deploy alert-dispatcher --linked
supabase functions deploy notification-processor --linked
supabase functions deploy maintenance-scheduler --linked

# 3. Check deployment
supabase functions list --linked
```

Then configure database settings in dashboard (can't do via CLI for custom settings).

---

## 🎯 ROOT CAUSE

The alert system has all the pieces but they're not connected properly:

1. ✅ Database tables exist
2. ✅ Triggers exist
3. ✅ Cron jobs scheduled
4. ❌ **Database settings missing** → Cron jobs can't call edge functions
5. ❌ **Edge functions not deployed** → No code to process notifications
6. ❌ **pg_net extension** → Triggers can't make HTTP calls

Once these are fixed, the full automatic flow will work:
```
Odometer update → Alert created → Trigger fires → Edge function creates notification jobs → Cron processes jobs → Email sent ✅
```

---

## 📧 Expected Email Content

Once the notification is sent, you should receive an email like this:

**From:** FleetGuard Notifications  
**To:** shoebbirader@gmail.com  
**Subject:** [FleetGuard] Overdue: Exhaust Replacement

**Body:**
> ## Fleet Alert: Overdue: Exhaust Replacement
> 
> **Severity:** HIGH
> 
> **Type:** overdue
> 
> **Description:**
> Exhaust component has exceeded its expected life of 4999 km. 4996 km have elapsed since installation. Immediate replacement recommended.
> 
> ---
> 
> _This is an automated notification from FleetGuard AI._

---

## 🔍 MONITORING QUERIES

### Check all recent alerts:
```sql
SELECT * FROM alerts ORDER BY created_at DESC LIMIT 10;
```

### Check notification pipeline:
```sql
SELECT * FROM alert_notification_pipeline ORDER BY alert_created DESC;
```

### Check cron job status:
```sql
SELECT * FROM cron_jobs_status WHERE jobname LIKE '%notification%' OR jobname LIKE '%maintenance%';
```

### Check last cron runs:
```sql
SELECT 
  j.jobname,
  jrd.status,
  jrd.return_message,
  jrd.start_time,
  jrd.end_time
FROM cron.job j
LEFT JOIN cron.job_run_details jrd ON jrd.jobid = j.jobid
WHERE j.jobname IN ('notification-processor-1min', 'maintenance-scheduler-daily')
ORDER BY jrd.start_time DESC
LIMIT 10;
```

---

**Next Steps:** 
1. Configure database settings in Supabase Dashboard
2. Deploy edge functions
3. Enable pg_net extension
4. Wait 1 minute and check your email!
