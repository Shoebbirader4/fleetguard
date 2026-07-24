# GPS Processor Edge Function

## Overview

The GPS Processor Edge Function processes real-time GPS telemetry from GPS tracking devices installed in vehicles. It validates device IDs, updates vehicle locations, stores GPS history, calculates distance traveled, and validates odometer readings.

## Requirements Satisfied

- **19.1**: Integrate with GPS devices to receive real-time location data
- **19.3**: Update vehicle location within 30 seconds
- **19.4**: Store GPS location history with timestamp, coordinates, speed, and heading
- **19.6**: Calculate total distance traveled from GPS telemetry and validate against odometer readings
- **4.6**: Validate odometer against previous readings (via odometer-validator)

## API Specification

### Endpoint

```
POST /functions/v1/gps-processor
```

### Authentication

This function is designed as a webhook endpoint for GPS devices. It uses the Supabase service role key internally (no user JWT required).

**Security Note**: In production, implement webhook authentication using:
- Shared secret validation
- IP whitelisting
- HMAC signatures
- API keys per GPS device vendor

### Request Body

```json
{
  "device_id": "GPS-12345-ABCDE",
  "timestamp": "2025-01-15T10:30:00Z",
  "latitude": 37.7749,
  "longitude": -122.4194,
  "speed": 65.5,
  "heading": 180.0,
  "odometer": 125000,
  "ignition_status": "on"
}
```

#### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `device_id` | string | Yes | GPS device identifier (must match `vehicles.gps_device_id`) |
| `timestamp` | string | Yes | ISO 8601 timestamp of GPS reading |
| `latitude` | number | Yes | Latitude in degrees (-90 to 90) |
| `longitude` | number | Yes | Longitude in degrees (-180 to 180) |
| `speed` | number | Yes | Current speed in km/h (non-negative) |
| `heading` | number | Yes | Direction of travel in degrees (0-360, 0=North) |
| `odometer` | number | No | Odometer reading from device in km (if available) |
| `ignition_status` | string | No | Ignition state: `"on"` or `"off"` |

### Response

#### Success Response (200)

```json
{
  "success": true,
  "vehicle_id": "550e8400-e29b-41d4-a716-446655440000",
  "location_updated": true,
  "odometer_updated": true,
  "distance_calculated": 15.234,
  "validation_result": {
    "valid": true,
    "anomaly_flag": false
  }
}
```

#### Vehicle Not Found (404)

```json
{
  "success": false,
  "error": "No active vehicle found with GPS device ID: GPS-12345-ABCDE"
}
```

#### Invalid Telemetry (400)

```json
{
  "error": "Invalid telemetry data",
  "details": [
    "latitude must be a number between -90 and 90",
    "timestamp must be a valid ISO 8601 date string"
  ]
}
```

## How It Works

### 1. Device Validation

- Looks up vehicle in the `vehicles` table using `gps_device_id`
- Only processes telemetry for active vehicles (`status = 'active'`)
- Returns 404 if device ID is not registered

### 2. Location Update

- Updates `vehicles.last_location` with PostGIS POINT format
- Updates `vehicles.last_gps_update` with telemetry timestamp
- Satisfies 30-second update requirement (Requirement 19.3)

### 3. GPS History Storage

- Inserts complete telemetry into `gps_history` table
- Stores: timestamp, coordinates, speed, heading, ignition status
- Enables route history replay and analytics

### 4. Distance Calculation

**Two modes:**

**Mode A: Device-Provided Odometer**
- If GPS device sends `odometer` field, use it directly
- Common in modern fleet GPS devices with OBD-II integration

**Mode B: Calculated Distance**
- Calculate distance from previous GPS location using Haversine formula
- Add distance to `current_odometer` to get new reading
- Only update if movement > 10 meters (avoids GPS drift noise)

### 5. Odometer Validation

- Calls `odometer-validator` Edge Function with new reading
- Validates reading is not decreasing
- Flags anomalies if increase > 1000 km in 24 hours
- Only updates `vehicles.current_odometer` if validation passes

## Distance Calculation

The function uses the **Haversine formula** to calculate great-circle distance between two GPS coordinates:

```
a = sin²(Δφ/2) + cos(φ1) × cos(φ2) × sin²(Δλ/2)
c = 2 × atan2(√a, √(1−a))
distance = R × c
```

Where:
- φ = latitude in radians
- λ = longitude in radians
- R = Earth's radius (6,371 km)

**Accuracy**: ±0.5% for distances up to 1000 km

## GPS Data Flow

```
GPS Device
    │
    ├─ Sends telemetry via HTTP webhook
    │
    ▼
GPS Processor Edge Function
    │
    ├─ 1. Validate device_id → Find vehicle
    ├─ 2. Update vehicle location
    ├─ 3. Insert GPS history
    ├─ 4. Calculate distance (if needed)
    │
    ▼
Odometer Validator Edge Function
    │
    ├─ Validate reading consistency
    ├─ Flag anomalies
    ├─ Update vehicles.current_odometer
    │
    ▼
Database Updated
```

## Database Schema Requirements

### vehicles table

```sql
ALTER TABLE vehicles 
  ADD COLUMN gps_device_id TEXT,
  ADD COLUMN last_location POINT, -- PostGIS geography
  ADD COLUMN last_gps_update TIMESTAMPTZ;

CREATE INDEX idx_vehicles_gps_device_id ON vehicles(gps_device_id);
```

### gps_history table

```sql
CREATE TABLE gps_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  speed DECIMAL(6, 2) NOT NULL, -- km/h
  heading DECIMAL(5, 2) NOT NULL, -- degrees
  ignition_status TEXT CHECK (ignition_status IN ('on', 'off')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_gps_history_vehicle_id ON gps_history(vehicle_id);
CREATE INDEX idx_gps_history_timestamp ON gps_history(timestamp DESC);
```

## Integration Examples

### GPS Device Webhook Configuration

Most GPS tracking devices support configurable HTTP webhooks. Configure your device to send POST requests to:

```
https://your-project.supabase.co/functions/v1/gps-processor
```

### Example Device Configurations

**1. Teltonika GPS Trackers**
```
Server: your-project.supabase.co
Port: 443
Protocol: HTTPS
Path: /functions/v1/gps-processor
Method: POST
```

**2. Queclink GPS Devices**
```json
{
  "protocol": "HTTP",
  "url": "https://your-project.supabase.co/functions/v1/gps-processor",
  "method": "POST",
  "interval": 60
}
```

### Testing with curl

```bash
curl -X POST https://your-project.supabase.co/functions/v1/gps-processor \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "TEST-GPS-001",
    "timestamp": "2025-01-15T10:30:00Z",
    "latitude": 37.7749,
    "longitude": -122.4194,
    "speed": 65.5,
    "heading": 180.0,
    "odometer": 125000,
    "ignition_status": "on"
  }'
```

## Performance Considerations

### Throughput

- Designed to handle 10,000 vehicles reporting every 15 minutes
- Processing time: ~200-500ms per telemetry update
- Concurrent processing: up to 100 requests/second

### Optimizations

1. **Batch Processing**: For high-volume fleets, consider batching telemetry updates
2. **Async Validation**: Odometer validation could be queued for async processing
3. **Database Indexes**: Ensure indexes exist on `gps_device_id` and `vehicle_id`
4. **Distance Threshold**: Only calculates distance if movement > 10 meters

## Error Handling

### Common Errors

| Error | Status | Cause | Solution |
|-------|--------|-------|----------|
| Device not found | 404 | `device_id` not registered | Register device in `vehicles.gps_device_id` |
| Invalid coordinates | 400 | Lat/lon out of range | Verify GPS device configuration |
| Odometer validation failed | 200* | Anomalous reading detected | Check vehicle or device for issues |
| Service unavailable | 500 | Database or network error | Retry with exponential backoff |

*Note: Anomalous readings return 200 but with `validation_result.anomaly_flag = true`

### Retry Strategy

GPS devices should implement:
- Exponential backoff: 1 min, 5 min, 15 min
- Maximum 3 retry attempts
- Queue telemetry locally during connectivity loss

## Security Recommendations

### Production Deployment

1. **Webhook Authentication**
   - Implement shared secret validation
   - Use HMAC signatures for message integrity
   - Validate `X-Device-Signature` header

2. **IP Whitelisting**
   - Restrict access to known GPS provider IPs
   - Use Supabase Edge Function IP filtering

3. **Rate Limiting**
   - Limit requests per device_id: 5 requests/minute
   - Detect and block replay attacks

4. **Monitoring**
   - Alert on unregistered device_id attempts
   - Track processing latency
   - Monitor validation failure rates

### Example Authentication Check

```typescript
const expectedSignature = await crypto.subtle.digest(
  'SHA-256',
  new TextEncoder().encode(sharedSecret + JSON.stringify(telemetry))
);

const providedSignature = req.headers.get('X-Device-Signature');

if (expectedSignature !== providedSignature) {
  return unauthorizedResponse('Invalid signature');
}
```

## Monitoring and Debugging

### Key Metrics to Track

- **Telemetry received**: Count per device, per hour
- **Processing latency**: Time from webhook receipt to database update
- **Validation failures**: Anomaly rate per vehicle
- **Device activity**: Last seen timestamp per device

### Logs

Enable detailed logging for debugging:

```typescript
console.log('[GPS Processor] Received telemetry:', {
  device_id: telemetry.device_id,
  timestamp: telemetry.timestamp,
  location: `${telemetry.latitude},${telemetry.longitude}`,
});
```

View logs in Supabase dashboard or using CLI:

```bash
supabase functions logs gps-processor
```

## Testing

See `test.ts` for unit tests covering:
- Device validation
- Distance calculation accuracy
- Odometer update logic
- Error handling
- Edge cases (GPS drift, stationary vehicle, long intervals)

Run tests:
```bash
deno test --allow-all supabase/functions/gps-processor/test.ts
```

## Related Functions

- **odometer-validator**: Called to validate calculated odometer readings
- **maintenance-scheduler**: Uses GPS data to calculate component wear
- **alert-dispatcher**: Notified when GPS device goes offline

## Future Enhancements

- [ ] Geofencing: Alert when vehicle enters/exits defined zones
- [ ] Speed limit enforcement: Alert on speeding violations
- [ ] Route deviation detection: Alert when vehicle deviates from assigned route
- [ ] Idle time tracking: Monitor engine-on but not moving scenarios
- [ ] Fuel consumption estimation: Correlate GPS data with fuel efficiency
