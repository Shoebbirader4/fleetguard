# 📍 Odometer Fetching System - Status Report

## ❌ NO AUTOMATIC ODOMETER FETCHING FROM GPS DEVICES

### Current Situation

**You do NOT have an automated system that fetches odometer readings from vehicles at 2 AM or any other time.**

---

## How the System Actually Works

### 1. GPS Processor Edge Function EXISTS ✅

**Location:** `supabase/functions/gps-processor/index.ts`

**Purpose:** 
- Receives GPS telemetry **WEBHOOKS** from external GPS devices
- Updates vehicle location in real-time
- Calculates distance traveled
- Updates odometer based on calculated distance OR device-provided reading

**How it works:**
```
GPS Device → Sends webhook → gps-processor edge function →
Updates vehicle location + odometer → Triggers alert check
```

### 2. BUT: No Scheduled GPS Fetch ❌

**Problem:** 
- GPS processor is **PASSIVE** - it only processes incoming webhooks
- There's **NO CRON JOB** that actively fetches GPS data from devices
- No scheduled task at 2 AM (or any time) to pull odometer readings

**Current cron jobs (at 2 AM):**
1. ✅ `ml-daily-predictions` - Runs ML predictions (2 AM)
2. ✅ `document-expiry-checker` - Checks document expiry (2 AM)
3. ❌ **NO GPS or odometer fetch job**

---

## How Odometer Updates Currently Work

### Manual Updates (Working ✅)
1. **User manually enters odometer** in the app
   - Driver enters reading during inspection
   - Manager updates odometer in vehicle form
   - → Triggers component health check
   - → Creates alerts if thresholds exceeded
   - → Sends notifications

### GPS Webhook Updates (Passive ✅ if configured)
1. **GPS device sends webhook** to `gps-processor` endpoint
   - Device posts telemetry data (lat, lon, speed, odometer)
   - Edge function processes it immediately
   - Updates vehicle location + odometer
   - → Triggers component health check
   - → Creates alerts if needed

### Automatic Scheduled Fetch (NOT IMPLEMENTED ❌)
- **No scheduled task** to fetch GPS data
- **No integration** with GPS provider API to poll devices
- **No 2 AM job** to update odometers

---

## What You're Missing

To have automatic odometer updates from GPS devices, you need:

### Option A: GPS Device Webhooks (BEST)
**Status:** Edge function exists, but requires GPS device configuration

**Requirements:**
1. GPS devices installed in vehicles (hardware)
2. GPS provider account (e.g., Geotab, Samsara, Verizon Connect)
3. Configure GPS provider to send webhooks to:
   ```
   https://ftywwrzkbtayapfiocck.supabase.co/functions/v1/gps-processor
   ```
4. Store GPS device ID in each vehicle record

**Pros:**
- ✅ Real-time updates (instant when vehicle moves)
- ✅ Most accurate
- ✅ Edge function already built

**Cons:**
- ❌ Requires GPS hardware (~$50-200 per device)
- ❌ Monthly GPS service fees (~$10-30 per vehicle)
- ❌ Requires GPS provider webhook configuration

---

### Option B: Scheduled GPS API Polling (ALTERNATIVE)
**Status:** NOT IMPLEMENTED - would need new cron job + API integration

**What's needed:**
1. Create new edge function: `gps-poller`
2. Integrate with GPS provider API (Geotab, Samsara, etc.)
3. Create cron job to run at 2 AM (or any interval)
4. Fetch latest GPS data for all vehicles
5. Update odometers and locations

**Implementation:**
```sql
-- Create cron job to poll GPS API daily at 2 AM
SELECT cron.schedule(
  'gps-poller-daily',
  '0 2 * * *',  -- 2:00 AM daily
  $$
  SELECT net.http_post(
    url := 'https://ftywwrzkbtayapfiocck.supabase.co/functions/v1/gps-poller',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);
```

**Pros:**
- ✅ Works with any GPS provider that has an API
- ✅ Scheduled updates guarantee fresh data

**Cons:**
- ❌ NOT CURRENTLY IMPLEMENTED
- ❌ Requires GPS provider API keys and credentials
- ❌ Less real-time (only updates once per day)
- ❌ Still requires GPS hardware

---

### Option C: Mobile App GPS (SIMPLEST FOR TESTING)
**Status:** Could be implemented in mobile app

**What's needed:**
1. Mobile app tracks GPS location while driver is active
2. App calculates distance traveled
3. App updates odometer via API when trip ends
4. No external GPS devices needed

**Pros:**
- ✅ No additional hardware
- ✅ Uses driver's phone GPS
- ✅ Can be tested immediately

**Cons:**
- ❌ Only works when driver has app open
- ❌ Less accurate than dedicated GPS device
- ❌ Battery drain on driver's phone

---

## Current Workflow (What IS Working)

### Scenario: Manual Odometer Update
```
1. Driver completes daily inspection
   → Enters current odometer reading: 55,000 km
   
2. App saves reading to odometer_readings table
   → Trigger fires: trigger_odometer_component_check
   
3. System checks ALL components for that vehicle:
   Component: Oil Filter
   - Installed at: 50,000 km
   - Expected life: 5,000 km
   - Current: 55,000 km
   - Usage: 5,000 km (100% used!)
   
4. Alert created automatically:
   → Title: "Overdue: Oil Filter Replacement"
   → Severity: high
   → Description: "Has exceeded expected life of 5,000 km"
   
5. Trigger dispatches notification:
   → Calls alert-dispatcher edge function
   → Creates notification_jobs for email/push
   
6. Cron processes notification (every 1 minute):
   → notification-processor sends email
   → Fleet manager receives email ✅
```

**This is working!** ✅

---

## Recommendations

### For Production Use:

**1. Configure GPS Webhooks (if you have GPS devices)**
   - Contact your GPS provider
   - Set up webhook to: `https://ftywwrzkbtayapfiocck.supabase.co/functions/v1/gps-processor`
   - Add `gps_device_id` to each vehicle in database
   - Test with one vehicle first

**2. OR: Use Manual Odometer Entry (current system)**
   - Train drivers to enter odometer during daily inspections
   - Works perfectly with existing notification system
   - No additional cost
   - **This is what's currently functional!**

**3. OR: Implement GPS API Polling (requires development)**
   - Create `gps-poller` edge function
   - Integrate with GPS provider API
   - Add cron job for scheduled fetching
   - Estimated development: 2-3 days

---

## Testing the Current System (Manual Entry)

You can test the working system right now:

### Test 1: Manual Odometer Update

```sql
-- 1. Find a vehicle
SELECT id, registration_number, current_odometer 
FROM vehicles 
WHERE tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
LIMIT 1;

-- 2. Add a test component near threshold
INSERT INTO components (
  tenant_id,
  vehicle_id,
  component_type,
  installation_date,
  installation_odometer,
  expected_life_km,
  status
) VALUES (
  (SELECT tenant_id FROM users WHERE id = auth.uid()),
  'YOUR_VEHICLE_ID_HERE',
  'oil_filter',
  CURRENT_DATE,
  50000,
  5000,
  'active'
);

-- 3. Update odometer past threshold
UPDATE vehicles 
SET current_odometer = 55000
WHERE id = 'YOUR_VEHICLE_ID_HERE';

-- 4. Check if alert was created (should happen instantly!)
SELECT * FROM alerts 
WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '1 minute'
ORDER BY created_at DESC;

-- 5. Check if notification jobs were created
SELECT * FROM notification_jobs 
WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '2 minutes'
ORDER BY created_at DESC;

-- 6. Wait 1 minute, then check email inbox!
```

---

## Summary

| Feature | Status | Notes |
|---------|--------|-------|
| Manual odometer entry | ✅ WORKING | Users enter readings manually |
| Automatic alert creation | ✅ WORKING | Triggers when threshold exceeded |
| Automatic notifications | ✅ WORKING | Emails sent to fleet manager |
| GPS webhook processor | ✅ EXISTS | Ready for GPS device webhooks |
| Scheduled GPS fetch (2 AM) | ❌ NOT IMPLEMENTED | Would need new cron job + API |
| GPS device integration | ⚠️ REQUIRES SETUP | Need GPS hardware & provider |

---

## Answer to Your Question

**Q:** *"Is the app currently fetching fresh odometer readings from vehicles at 2 AM?"*

**A:** **NO.** 

There is **NO scheduled task at 2 AM** (or any time) that fetches odometer readings from GPS devices.

**What runs at 2 AM:**
- ML daily predictions (analyzes existing data)
- Document expiry checker (checks document dates)

**What you need for automatic GPS odometer updates:**
1. GPS devices installed in vehicles
2. GPS provider webhook configured to send to your edge function
3. **OR** build a new cron job that polls GPS provider API

**What IS working right now:**
- Manual odometer entry by drivers/managers
- Automatic alert creation when thresholds exceeded  
- Automatic email notifications to fleet managers
- **This is fully functional!** ✅

---

## Next Steps

**Choose one:**

### A. Continue with manual entry (RECOMMENDED)
- Already working
- No additional cost
- Reliable and tested

### B. Set up GPS webhooks
- Contact GPS provider for webhook configuration
- Add device IDs to vehicle records
- Test with one vehicle

### C. Build GPS polling system
- Requires development work
- Needs GPS provider API credentials
- Estimated 2-3 days to implement

Let me know which direction you want to go!
