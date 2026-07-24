# Odometer Validator Integration Test Guide

## Test Scenarios

This document provides test scenarios to verify the odometer-validator Edge Function implementation.

### Prerequisites

1. Supabase instance running (local or remote)
2. Test tenant created in `tenants` table
3. Test vehicle created in `vehicles` table
4. Valid JWT token with tenant_id claim

### Test Scenario 1: First Reading (No Previous Reading)

**Input:**
```json
{
  "vehicle_id": "<test-vehicle-uuid>",
  "reading": 50000,
  "source": "manual"
}
```

**Expected Output:**
```json
{
  "valid": true,
  "anomaly_flag": false,
  "odometer_reading_id": "<uuid>"
}
```

**Verification:**
- ✅ `odometer_readings` table contains new record with `reading=50000`
- ✅ `vehicles.current_odometer` updated to `50000`
- ✅ `is_anomalous=false`, `confirmed=true`

---

### Test Scenario 2: Valid Incremental Reading

**Input:**
```json
{
  "vehicle_id": "<test-vehicle-uuid>",
  "reading": 50500,
  "source": "manual"
}
```

**Expected Output:**
```json
{
  "valid": true,
  "anomaly_flag": false,
  "odometer_reading_id": "<uuid>"
}
```

**Verification:**
- ✅ New reading accepted (50500 >= 50000)
- ✅ Delta = 500 km (< 1000 km threshold)
- ✅ `vehicles.current_odometer` updated to `50500`
- ✅ `is_anomalous=false`, `confirmed=true`

---

### Test Scenario 3: Invalid Decreasing Reading (Requirement 4.2)

**Input:**
```json
{
  "vehicle_id": "<test-vehicle-uuid>",
  "reading": 49000,
  "source": "manual"
}
```

**Expected Output:**
```json
{
  "valid": false,
  "anomaly_flag": true,
  "reason": "New reading (49000 km) is less than previous reading (50500 km). Odometer readings cannot decrease.",
  "odometer_reading_id": "<uuid>"
}
```

**Verification:**
- ✅ Reading rejected (49000 < 50500)
- ✅ `odometer_readings` record created with `is_anomalous=true`, `confirmed=false`
- ✅ `vehicles.current_odometer` remains at `50500` (NOT updated)
- ✅ `anomaly_reason` contains descriptive message

---

### Test Scenario 4: Anomalous Large Increase (Requirement 4.3)

**Input:**
```json
{
  "vehicle_id": "<test-vehicle-uuid>",
  "reading": 52000,
  "source": "gps",
  "timestamp": "<1 hour after previous reading>"
}
```

**Expected Output:**
```json
{
  "valid": true,
  "anomaly_flag": true,
  "reason": "Odometer increased by 1500 km in 1.0 hours (> 1000 km in 24 hours). Please confirm this reading is correct.",
  "odometer_reading_id": "<uuid>"
}
```

**Verification:**
- ✅ Delta = 1500 km in 1 hour (> 1000 km threshold)
- ✅ Reading flagged as anomalous but still valid
- ✅ `odometer_readings` record created with `is_anomalous=true`, `confirmed=false`
- ✅ `vehicles.current_odometer` remains at `50500` (NOT updated until confirmed)
- ✅ `anomaly_reason` explains the issue

---

### Test Scenario 5: Large Increase Over 24 Hours (Should NOT Flag)

**Input:**
```json
{
  "vehicle_id": "<test-vehicle-uuid>",
  "reading": 51600,
  "source": "manual",
  "timestamp": "<25 hours after previous reading>"
}
```

**Expected Output:**
```json
{
  "valid": true,
  "anomaly_flag": false,
  "odometer_reading_id": "<uuid>"
}
```

**Verification:**
- ✅ Delta = 1100 km in 25 hours (time window > 24 hours, so NOT anomalous)
- ✅ `vehicles.current_odometer` updated to `51600`
- ✅ `is_anomalous=false`, `confirmed=true`

---

### Test Scenario 6: Missing Required Fields

**Input:**
```json
{
  "reading": 50000
}
```

**Expected Output (400 Bad Request):**
```json
{
  "error": "Missing required fields",
  "details": "vehicle_id, reading, and source are required"
}
```

---

### Test Scenario 7: Invalid Reading (Negative Number)

**Input:**
```json
{
  "vehicle_id": "<test-vehicle-uuid>",
  "reading": -100,
  "source": "manual"
}
```

**Expected Output (400 Bad Request):**
```json
{
  "error": "Invalid reading",
  "details": "Reading must be a non-negative number"
}
```

---

### Test Scenario 8: Invalid Source

**Input:**
```json
{
  "vehicle_id": "<test-vehicle-uuid>",
  "reading": 50000,
  "source": "invalid-source"
}
```

**Expected Output (400 Bad Request):**
```json
{
  "error": "Invalid source",
  "details": "Source must be one of: manual, excel, bulk, gps, api"
}
```

---

### Test Scenario 9: Missing Authorization Token

**Input:** (no Authorization header)

**Expected Output (401 Unauthorized):**
```json
{
  "error": "Missing authorization token",
  "code": "MISSING_TOKEN"
}
```

---

### Test Scenario 10: Invalid/Expired Token

**Input:** (invalid JWT in Authorization header)

**Expected Output (403 Forbidden):**
```json
{
  "error": "Invalid or expired token",
  "code": "INVALID_TOKEN"
}
```

---

## Manual Testing with cURL

### Setup Environment Variables
```bash
export SUPABASE_URL="<your-supabase-url>"
export JWT_TOKEN="<your-jwt-token>"
export VEHICLE_ID="<test-vehicle-uuid>"
```

### Test 1: First Reading
```bash
curl -X POST "$SUPABASE_URL/functions/v1/odometer-validator" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"vehicle_id\": \"$VEHICLE_ID\",
    \"reading\": 50000,
    \"source\": \"manual\"
  }"
```

### Test 2: Valid Incremental Reading
```bash
curl -X POST "$SUPABASE_URL/functions/v1/odometer-validator" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"vehicle_id\": \"$VEHICLE_ID\",
    \"reading\": 50500,
    \"source\": \"manual\"
  }"
```

### Test 3: Invalid Decreasing Reading
```bash
curl -X POST "$SUPABASE_URL/functions/v1/odometer-validator" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"vehicle_id\": \"$VEHICLE_ID\",
    \"reading\": 49000,
    \"source\": \"manual\"
  }"
```

### Test 4: Anomalous Large Increase
```bash
curl -X POST "$SUPABASE_URL/functions/v1/odometer-validator" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"vehicle_id\": \"$VEHICLE_ID\",
    \"reading\": 52000,
    \"source\": \"gps\",
    \"timestamp\": \"$(date -u -d '+1 hour' +%Y-%m-%dT%H:%M:%SZ)\"
  }"
```

---

## Database Verification Queries

### Check Odometer Readings
```sql
SELECT 
  id,
  vehicle_id,
  reading,
  timestamp,
  source,
  is_anomalous,
  anomaly_reason,
  confirmed,
  created_at
FROM odometer_readings
WHERE vehicle_id = '<test-vehicle-uuid>'
ORDER BY timestamp DESC;
```

### Check Vehicle Current Odometer
```sql
SELECT 
  id,
  vin,
  current_odometer,
  updated_at
FROM vehicles
WHERE id = '<test-vehicle-uuid>';
```

### Count Anomalous Readings
```sql
SELECT 
  COUNT(*) as total_readings,
  SUM(CASE WHEN is_anomalous THEN 1 ELSE 0 END) as anomalous_readings
FROM odometer_readings
WHERE vehicle_id = '<test-vehicle-uuid>';
```

---

## Requirements Validation Checklist

### Requirement 4.2: Validate new reading >= previous reading
- [ ] Test Scenario 3 passes (decreasing reading rejected)
- [ ] `valid=false` and `anomaly_flag=true` for decreasing readings
- [ ] Vehicle odometer NOT updated for decreasing readings

### Requirement 4.3: Flag anomalies if delta > 1000km in 24 hours
- [ ] Test Scenario 4 passes (large increase flagged)
- [ ] `valid=true` and `anomaly_flag=true` for anomalous increases
- [ ] Vehicle odometer NOT updated until anomaly confirmed
- [ ] `anomaly_reason` provides clear explanation

### Additional Requirements
- [ ] Update `vehicles.current_odometer` on successful validation (Scenario 2)
- [ ] Store readings with timestamp, source, submitting user
- [ ] Return validation result with anomaly flag and reason
- [ ] Proper authentication and tenant isolation enforced

---

## Performance Testing

### Load Test Scenario
```bash
# Submit 100 readings sequentially
for i in {1..100}; do
  reading=$((50000 + i * 10))
  curl -X POST "$SUPABASE_URL/functions/v1/odometer-validator" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"vehicle_id\": \"$VEHICLE_ID\",
      \"reading\": $reading,
      \"source\": \"api\"
    }"
done
```

**Expected Results:**
- Average response time: < 300ms
- All requests successful (201 status)
- Readings stored in correct order
- Vehicle odometer = 51990 (last reading)

---

## Edge Cases

### Edge Case 1: Simultaneous Submissions
- Submit two readings at the exact same timestamp
- Expected: Both accepted, order determined by database insertion

### Edge Case 2: Zero Delta
- Previous: 50000 km
- New: 50000 km (same reading)
- Expected: Valid (not anomalous)

### Edge Case 3: Exactly 1000 km in 24 hours
- Previous: 50000 km at T
- New: 51000 km at T+24h
- Expected: Valid (not anomalous) - threshold is "> 1000 km"

### Edge Case 4: Very Old Timestamp
- Submit reading with timestamp from 1 year ago
- Expected: Valid if reading >= previous reading at that timestamp

---

## Conclusion

This test guide ensures comprehensive validation of the odometer-validator Edge Function implementation against requirements 4.2 and 4.3. All scenarios should be tested before considering the task complete.
