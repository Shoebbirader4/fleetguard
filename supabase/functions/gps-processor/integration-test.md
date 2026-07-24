# GPS Processor Integration Test Guide

## Overview

This document provides step-by-step instructions for testing the GPS Processor Edge Function in a real Supabase environment.

## Prerequisites

1. Supabase project with deployed database schema
2. GPS Processor Edge Function deployed to Supabase
3. Odometer Validator Edge Function deployed (dependency)
4. At least one test vehicle with a GPS device ID registered
5. PostgreSQL client or Supabase Studio access

## Test Data Setup

### 1. Create Test Tenant

```sql
INSERT INTO tenants (id, name, subscription_plan, vehicle_limit, subscription_status, billing_cycle, next_billing_date)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'GPS Test Fleet',
  'professional',
  200,
  'active',
  'monthly',
  CURRENT_DATE + INTERVAL '30 days'
);
```

### 2. Create Test User

```sql
-- First, create auth user via Supabase Auth UI or API
-- Then link to users table:

INSERT INTO users (id, tenant_id, email, full_name, role)
VALUES (
  'test-user-id', -- Replace with actual auth.users.id
  '00000000-0000-0000-0000-000000000001',
  'gps-test@fleetguard.ai',
  'GPS Test User',
  'fleet_manager'
);
```

### 3. Create Test Vehicle

```sql
INSERT INTO vehicles (
  id, 
  tenant_id, 
  vin, 
  make, 
  model, 
  year, 
  vehicle_type,
  gps_device_id,
  current_odometer,
  status
)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '00000000-0000-0000-0000-000000000001',
  'TEST-VIN-GPS-001',
  'Volvo',
  'FH16',
  2023,
  'truck',
  'GPS-TEST-DEVICE-001',
  50000,
  'active'
);
```

## Integration Tests

### Test 1: Basic GPS Update (Device-Provided Odometer)

**Scenario**: GPS device sends telemetry with odometer reading

**Request**:
```bash
curl -X POST https://your-project.supabase.co/functions/v1/gps-processor \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "GPS-TEST-DEVICE-001",
    "timestamp": "2025-01-15T10:00:00Z",
    "latitude": 37.7749,
    "longitude": -122.4194,
    "speed": 65.5,
    "heading": 180.0,
    "odometer": 50100,
    "ignition_status": "on"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "vehicle_id": "11111111-1111-1111-1111-111111111111",
  "location_updated": true,
  "odometer_updated": true,
  "validation_result": {
    "valid": true,
    "anomaly_flag": false,
    "odometer_reading_id": "..."
  }
}
```

**Verification Queries**:
```sql
-- Check vehicle location updated
SELECT 
  id,
  gps_device_id,
  current_odometer,
  last_location,
  last_gps_update
FROM vehicles 
WHERE gps_device_id = 'GPS-TEST-DEVICE-001';

-- Expected: current_odometer = 50100, last_location = POINT(-122.4194 37.7749)

-- Check GPS history
SELECT * FROM gps_history 
WHERE vehicle_id = '11111111-1111-1111-1111-111111111111'
ORDER BY timestamp DESC 
LIMIT 1;

-- Expected: Latest entry with correct coordinates

-- Check odometer reading
SELECT * FROM odometer_readings
WHERE vehicle_id = '11111111-1111-1111-1111-111111111111'
ORDER BY timestamp DESC
LIMIT 1;

-- Expected: reading = 50100, source = 'gps', is_anomalous = false
```

**✅ Pass Criteria**:
- Response status: 200
- `location_updated: true`
- `odometer_updated: true`
- Vehicle `current_odometer` = 50100
- GPS history record created
- Odometer reading record created

---

### Test 2: GPS Update with Calculated Distance

**Scenario**: GPS device does not provide odometer, distance calculated from coordinates

**Request**:
```bash
curl -X POST https://your-project.supabase.co/functions/v1/gps-processor \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "GPS-TEST-DEVICE-001",
    "timestamp": "2025-01-15T11:00:00Z",
    "latitude": 37.7850,
    "longitude": -122.4094,
    "speed": 70.0,
    "heading": 180.0,
    "ignition_status": "on"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "vehicle_id": "11111111-1111-1111-1111-111111111111",
  "location_updated": true,
  "odometer_updated": true,
  "distance_calculated": 1.2345,
  "validation_result": {
    "valid": true,
    "anomaly_flag": false
  }
}
```

**Verification**:
```sql
SELECT 
  current_odometer,
  last_location
FROM vehicles 
WHERE id = '11111111-1111-1111-1111-111111111111';

-- Expected: current_odometer ≈ 50101 (50100 + calculated distance)
-- Expected: last_location = POINT(-122.4094 37.7850)
```

**✅ Pass Criteria**:
- Response includes `distance_calculated` field
- Vehicle odometer increased by ~1-2 km
- Location updated to new coordinates

---

### Test 3: Invalid Device ID

**Scenario**: GPS telemetry from unregistered device

**Request**:
```bash
curl -X POST https://your-project.supabase.co/functions/v1/gps-processor \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "GPS-UNKNOWN-DEVICE",
    "timestamp": "2025-01-15T12:00:00Z",
    "latitude": 37.7749,
    "longitude": -122.4194,
    "speed": 60.0,
    "heading": 90.0
  }'
```

**Expected Response**:
```json
{
  "success": false,
  "error": "No active vehicle found with GPS device ID: GPS-UNKNOWN-DEVICE"
}
```

**✅ Pass Criteria**:
- Response status: 404
- `success: false`
- Error message indicates device not found
- No database changes

---

### Test 4: Anomalous Odometer Reading

**Scenario**: GPS provides odometer reading that increases too much (> 1000 km in 24 hours)

**Setup**:
```sql
-- Update vehicle odometer to known value
UPDATE vehicles 
SET current_odometer = 50100
WHERE id = '11111111-1111-1111-1111-111111111111';
```

**Request**:
```bash
curl -X POST https://your-project.supabase.co/functions/v1/gps-processor \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "GPS-TEST-DEVICE-001",
    "timestamp": "2025-01-15T13:00:00Z",
    "latitude": 34.0522,
    "longitude": -118.2437,
    "speed": 100.0,
    "heading": 270.0,
    "odometer": 52000,
    "ignition_status": "on"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "vehicle_id": "11111111-1111-1111-1111-111111111111",
  "location_updated": true,
  "odometer_updated": false,
  "validation_result": {
    "valid": true,
    "anomaly_flag": true,
    "reason": "Odometer increased by 1900 km in 3.0 hours (> 1000 km in 24 hours). Please confirm this reading is correct."
  }
}
```

**Verification**:
```sql
SELECT * FROM odometer_readings
WHERE vehicle_id = '11111111-1111-1111-1111-111111111111'
ORDER BY timestamp DESC
LIMIT 1;

-- Expected: is_anomalous = true, confirmed = false, anomaly_reason populated

SELECT current_odometer FROM vehicles
WHERE id = '11111111-1111-1111-1111-111111111111';

-- Expected: current_odometer still 50100 (NOT updated due to anomaly)
```

**✅ Pass Criteria**:
- Response status: 200
- `location_updated: true` (location still updated)
- `odometer_updated: false` (odometer NOT updated)
- `validation_result.anomaly_flag: true`
- Odometer reading created with `is_anomalous = true`
- Vehicle `current_odometer` unchanged

---

### Test 5: Invalid Telemetry Data

**Scenario**: GPS sends malformed data

**Request**:
```bash
curl -X POST https://your-project.supabase.co/functions/v1/gps-processor \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "GPS-TEST-DEVICE-001",
    "timestamp": "invalid-date",
    "latitude": 95.0,
    "longitude": -190.0,
    "speed": -10.0,
    "heading": 400.0
  }'
```

**Expected Response**:
```json
{
  "error": "Invalid telemetry data",
  "details": [
    "timestamp must be a valid ISO 8601 date string",
    "latitude must be a number between -90 and 90",
    "longitude must be a number between -180 and 180",
    "speed must be a non-negative number",
    "heading must be a number between 0 and 360"
  ]
}
```

**✅ Pass Criteria**:
- Response status: 400
- Error details list all validation failures
- No database changes

---

### Test 6: Stationary Vehicle (GPS Drift)

**Scenario**: Vehicle is stationary but GPS coordinates change slightly due to GPS drift

**Request**:
```bash
curl -X POST https://your-project.supabase.co/functions/v1/gps-processor \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "GPS-TEST-DEVICE-001",
    "timestamp": "2025-01-15T14:00:00Z",
    "latitude": 37.78501,
    "longitude": -122.40941,
    "speed": 0.0,
    "heading": 180.0,
    "ignition_status": "off"
  }'
```

**Expected Behavior**:
- Location updated (GPS history stored)
- Distance calculated < 10 meters (~0.01 km)
- Odometer NOT updated (distance too small)

**Verification**:
```sql
SELECT 
  current_odometer,
  last_location
FROM vehicles 
WHERE id = '11111111-1111-1111-1111-111111111111';

-- Expected: odometer unchanged (movement too small)
-- Expected: location updated to new coordinates

SELECT * FROM gps_history
WHERE vehicle_id = '11111111-1111-1111-1111-111111111111'
  AND speed = 0
ORDER BY timestamp DESC
LIMIT 1;

-- Expected: Record exists with speed = 0, ignition_status = 'off'
```

**✅ Pass Criteria**:
- Location updated
- GPS history record created
- Odometer unchanged (drift filtered out)
- No odometer reading record created

---

### Test 7: Long Journey (Distance Accumulation)

**Scenario**: Vehicle travels a long distance over multiple GPS updates

**Test Sequence**:

```bash
# Update 1: Start position (San Francisco)
curl -X POST https://your-project.supabase.co/functions/v1/gps-processor \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "GPS-TEST-DEVICE-001",
    "timestamp": "2025-01-15T08:00:00Z",
    "latitude": 37.7749,
    "longitude": -122.4194,
    "speed": 80.0,
    "heading": 180.0
  }'

# Update 2: Halfway (Fresno area)
curl -X POST https://your-project.supabase.co/functions/v1/gps-processor \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "GPS-TEST-DEVICE-001",
    "timestamp": "2025-01-15T11:00:00Z",
    "latitude": 36.7378,
    "longitude": -119.7871,
    "speed": 85.0,
    "heading": 180.0
  }'

# Update 3: Destination (Los Angeles)
curl -X POST https://your-project.supabase.co/functions/v1/gps-processor \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "GPS-TEST-DEVICE-001",
    "timestamp": "2025-01-15T14:00:00Z",
    "latitude": 34.0522,
    "longitude": -118.2437,
    "speed": 0.0,
    "heading": 180.0,
    "ignition_status": "off"
  }'
```

**Verification**:
```sql
-- Check total distance accumulated
SELECT 
  MIN(timestamp) as journey_start,
  MAX(timestamp) as journey_end,
  COUNT(*) as gps_updates,
  MAX(current_odometer) - MIN(current_odometer) as total_distance_km
FROM (
  SELECT 
    v.current_odometer,
    gh.timestamp
  FROM gps_history gh
  JOIN vehicles v ON gh.vehicle_id = v.id
  WHERE gh.vehicle_id = '11111111-1111-1111-1111-111111111111'
    AND gh.timestamp >= '2025-01-15T08:00:00Z'
) journey;

-- Expected: total_distance_km ≈ 560 km (SF to LA distance)

-- Check GPS history count
SELECT COUNT(*) FROM gps_history
WHERE vehicle_id = '11111111-1111-1111-1111-111111111111'
  AND timestamp >= '2025-01-15T08:00:00Z';

-- Expected: 3 records
```

**✅ Pass Criteria**:
- All 3 GPS updates processed successfully
- Total distance accumulated ≈ 560 km (±10%)
- 3 GPS history records created
- Final speed = 0, ignition = off

---

## Performance Tests

### Test 8: High-Frequency Updates

**Scenario**: Simulate high-frequency GPS updates (every 15 seconds)

**Script**:
```bash
# Send 20 updates in rapid succession
for i in {1..20}; do
  curl -X POST https://your-project.supabase.co/functions/v1/gps-processor \
    -H "Content-Type: application/json" \
    -d "{
      \"device_id\": \"GPS-TEST-DEVICE-001\",
      \"timestamp\": \"$(date -u -Iseconds)\",
      \"latitude\": $((37 + RANDOM % 2)).$((RANDOM % 10000)),
      \"longitude\": $((122 + RANDOM % 2)).$((RANDOM % 10000)),
      \"speed\": $((RANDOM % 120)).0,
      \"heading\": $((RANDOM % 360)).0
    }" &
  sleep 0.1
done
wait
```

**Verification**:
```sql
-- Check processing latency
SELECT 
  AVG(EXTRACT(EPOCH FROM (created_at - timestamp))) as avg_processing_latency_seconds
FROM gps_history
WHERE vehicle_id = '11111111-1111-1111-1111-111111111111'
  AND created_at >= NOW() - INTERVAL '5 minutes';

-- Expected: < 2 seconds (Requirement 19.3: update within 30 seconds)
```

**✅ Pass Criteria**:
- All 20 requests processed successfully
- Average processing latency < 2 seconds
- No errors or timeouts

---

## Cleanup

After testing, clean up test data:

```sql
-- Delete test data
DELETE FROM gps_history WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM odometer_readings WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM vehicles WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM users WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM tenants WHERE id = '00000000-0000-0000-0000-000000000001';
```

## Test Summary Checklist

- [ ] Test 1: Basic GPS update with device odometer ✅
- [ ] Test 2: GPS update with calculated distance ✅
- [ ] Test 3: Invalid device ID (404) ✅
- [ ] Test 4: Anomalous odometer reading detection ✅
- [ ] Test 5: Invalid telemetry data validation ✅
- [ ] Test 6: Stationary vehicle (GPS drift filtering) ✅
- [ ] Test 7: Long journey distance accumulation ✅
- [ ] Test 8: High-frequency updates performance ✅

## Success Criteria

**All tests must:**
- Return correct HTTP status codes
- Update database records appropriately
- Handle errors gracefully
- Meet performance requirements (<30 second latency)
- Integrate correctly with odometer-validator function
- Maintain data integrity across tables
