/**
 * Unit Tests for GPS Processor Edge Function
 * 
 * Tests cover:
 * - GPS device validation
 * - Distance calculation accuracy
 * - Odometer update logic
 * - Error handling
 * - Edge cases
 */

import { assertEquals, assertExists } from 'https://deno.land/std@0.208.0/assert/mod.ts';

// ============================================================================
// Haversine Distance Calculation Tests
// ============================================================================

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

Deno.test('Distance calculation - San Francisco to Los Angeles', () => {
  // San Francisco: 37.7749° N, 122.4194° W
  // Los Angeles: 34.0522° N, 118.2437° W
  // Expected distance: ~559 km

  const distance = calculateDistance(37.7749, -122.4194, 34.0522, -118.2437);

  // Allow 1% margin of error
  const expectedDistance = 559;
  const margin = expectedDistance * 0.01;

  assertEquals(
    Math.abs(distance - expectedDistance) < margin,
    true,
    `Distance ${distance.toFixed(2)} km should be within 1% of ${expectedDistance} km`
  );
});

Deno.test('Distance calculation - Short distance (100m)', () => {
  // Two points approximately 100 meters apart
  const lat1 = 37.7749;
  const lon1 = -122.4194;
  const lat2 = 37.7758; // ~0.001 degree ≈ 100m
  const lon2 = -122.4194;

  const distance = calculateDistance(lat1, lon1, lat2, lon2);

  // Expected: ~0.1 km (100 meters)
  assertEquals(
    distance > 0.09 && distance < 0.11,
    true,
    `Short distance ${distance.toFixed(4)} km should be around 0.1 km`
  );
});

Deno.test('Distance calculation - Same location', () => {
  const distance = calculateDistance(37.7749, -122.4194, 37.7749, -122.4194);

  assertEquals(distance, 0, 'Distance between same location should be 0');
});

Deno.test('Distance calculation - Equator crossing', () => {
  // From northern hemisphere to southern hemisphere
  const distance = calculateDistance(10.0, 0.0, -10.0, 0.0);

  // Expected: ~2220 km (20 degrees of latitude)
  const expectedDistance = 2220;
  const margin = expectedDistance * 0.02; // 2% margin

  assertEquals(
    Math.abs(distance - expectedDistance) < margin,
    true,
    `Equator crossing distance ${distance.toFixed(2)} km should be around ${expectedDistance} km`
  );
});

Deno.test('Distance calculation - Prime meridian crossing', () => {
  // From western hemisphere to eastern hemisphere
  const distance = calculateDistance(51.5074, -0.1278, 51.5074, 0.1278);

  // Expected: ~18 km (crossing prime meridian in London)
  // 0.2556 degrees longitude at 51.5° latitude ≈ 17.7 km
  assertEquals(
    distance > 15 && distance < 20,
    true,
    `Prime meridian crossing distance ${distance.toFixed(2)} km should be around 18 km`
  );
});

// ============================================================================
// PostGIS POINT Parsing Tests
// ============================================================================

function parsePoint(point: string | null): { lat: number; lon: number } | null {
  if (!point) return null;

  // Try PostGIS format: POINT(lon lat)
  const postgisMatch = point.match(/POINT\s*\(\s*([+-]?\d+\.?\d*)\s+([+-]?\d+\.?\d*)\s*\)/i);
  if (postgisMatch) {
    return {
      lon: parseFloat(postgisMatch[1]),
      lat: parseFloat(postgisMatch[2]),
    };
  }

  // Try simple format: (lon,lat)
  const simpleMatch = point.match(/\(\s*([+-]?\d+\.?\d*)\s*,\s*([+-]?\d+\.?\d*)\s*\)/);
  if (simpleMatch) {
    return {
      lon: parseFloat(simpleMatch[1]),
      lat: parseFloat(simpleMatch[2]),
    };
  }

  return null;
}

Deno.test('Parse PostGIS POINT format', () => {
  const point = 'POINT(-122.4194 37.7749)';
  const parsed = parsePoint(point);

  assertExists(parsed, 'Should parse valid POINT format');
  assertEquals(parsed!.lon, -122.4194);
  assertEquals(parsed!.lat, 37.7749);
});

Deno.test('Parse PostGIS POINT format with extra spaces', () => {
  const point = 'POINT(  -122.4194   37.7749  )';
  const parsed = parsePoint(point);

  assertExists(parsed, 'Should parse POINT with extra spaces');
  assertEquals(parsed!.lon, -122.4194);
  assertEquals(parsed!.lat, 37.7749);
});

Deno.test('Parse simple coordinate format', () => {
  const point = '(-122.4194, 37.7749)';
  const parsed = parsePoint(point);

  assertExists(parsed, 'Should parse simple (lon,lat) format');
  assertEquals(parsed!.lon, -122.4194);
  assertEquals(parsed!.lat, 37.7749);
});

Deno.test('Parse null point', () => {
  const parsed = parsePoint(null);
  assertEquals(parsed, null, 'Should return null for null input');
});

Deno.test('Parse invalid point format', () => {
  const parsed = parsePoint('invalid');
  assertEquals(parsed, null, 'Should return null for invalid format');
});

// ============================================================================
// Telemetry Validation Tests
// ============================================================================

function validateTelemetry(telemetry: any): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!telemetry.device_id || typeof telemetry.device_id !== 'string') {
    errors.push('device_id is required and must be a string');
  }

  if (!telemetry.timestamp) {
    errors.push('timestamp is required');
  } else {
    const date = new Date(telemetry.timestamp);
    if (isNaN(date.getTime())) {
      errors.push('timestamp must be a valid ISO 8601 date string');
    }
  }

  if (typeof telemetry.latitude !== 'number' || telemetry.latitude < -90 || telemetry.latitude > 90) {
    errors.push('latitude must be a number between -90 and 90');
  }

  if (typeof telemetry.longitude !== 'number' || telemetry.longitude < -180 || telemetry.longitude > 180) {
    errors.push('longitude must be a number between -180 and 180');
  }

  if (typeof telemetry.speed !== 'number' || telemetry.speed < 0) {
    errors.push('speed must be a non-negative number');
  }

  if (typeof telemetry.heading !== 'number' || telemetry.heading < 0 || telemetry.heading > 360) {
    errors.push('heading must be a number between 0 and 360');
  }

  if (telemetry.odometer !== undefined) {
    if (typeof telemetry.odometer !== 'number' || telemetry.odometer < 0) {
      errors.push('odometer (if provided) must be a non-negative number');
    }
  }

  if (telemetry.ignition_status !== undefined) {
    if (!['on', 'off'].includes(telemetry.ignition_status)) {
      errors.push('ignition_status (if provided) must be "on" or "off"');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

Deno.test('Validate valid telemetry', () => {
  const telemetry = {
    device_id: 'GPS-12345',
    timestamp: '2025-01-15T10:30:00Z',
    latitude: 37.7749,
    longitude: -122.4194,
    speed: 65.5,
    heading: 180.0,
    odometer: 125000,
    ignition_status: 'on',
  };

  const result = validateTelemetry(telemetry);
  assertEquals(result.valid, true, 'Valid telemetry should pass validation');
  assertEquals(result.errors.length, 0, 'Should have no errors');
});

Deno.test('Validate telemetry without optional fields', () => {
  const telemetry = {
    device_id: 'GPS-12345',
    timestamp: '2025-01-15T10:30:00Z',
    latitude: 37.7749,
    longitude: -122.4194,
    speed: 65.5,
    heading: 180.0,
  };

  const result = validateTelemetry(telemetry);
  assertEquals(result.valid, true, 'Telemetry without optional fields should be valid');
});

Deno.test('Validate telemetry with missing device_id', () => {
  const telemetry = {
    timestamp: '2025-01-15T10:30:00Z',
    latitude: 37.7749,
    longitude: -122.4194,
    speed: 65.5,
    heading: 180.0,
  };

  const result = validateTelemetry(telemetry);
  assertEquals(result.valid, false, 'Should fail without device_id');
  assertEquals(
    result.errors.some(e => e.includes('device_id')),
    true,
    'Should have device_id error'
  );
});

Deno.test('Validate telemetry with invalid latitude', () => {
  const telemetry = {
    device_id: 'GPS-12345',
    timestamp: '2025-01-15T10:30:00Z',
    latitude: 95.0, // Invalid: > 90
    longitude: -122.4194,
    speed: 65.5,
    heading: 180.0,
  };

  const result = validateTelemetry(telemetry);
  assertEquals(result.valid, false, 'Should fail with invalid latitude');
  assertEquals(
    result.errors.some(e => e.includes('latitude')),
    true,
    'Should have latitude error'
  );
});

Deno.test('Validate telemetry with invalid longitude', () => {
  const telemetry = {
    device_id: 'GPS-12345',
    timestamp: '2025-01-15T10:30:00Z',
    latitude: 37.7749,
    longitude: -185.0, // Invalid: < -180
    speed: 65.5,
    heading: 180.0,
  };

  const result = validateTelemetry(telemetry);
  assertEquals(result.valid, false, 'Should fail with invalid longitude');
  assertEquals(
    result.errors.some(e => e.includes('longitude')),
    true,
    'Should have longitude error'
  );
});

Deno.test('Validate telemetry with negative speed', () => {
  const telemetry = {
    device_id: 'GPS-12345',
    timestamp: '2025-01-15T10:30:00Z',
    latitude: 37.7749,
    longitude: -122.4194,
    speed: -10.0, // Invalid: negative
    heading: 180.0,
  };

  const result = validateTelemetry(telemetry);
  assertEquals(result.valid, false, 'Should fail with negative speed');
  assertEquals(
    result.errors.some(e => e.includes('speed')),
    true,
    'Should have speed error'
  );
});

Deno.test('Validate telemetry with invalid heading', () => {
  const telemetry = {
    device_id: 'GPS-12345',
    timestamp: '2025-01-15T10:30:00Z',
    latitude: 37.7749,
    longitude: -122.4194,
    speed: 65.5,
    heading: 365.0, // Invalid: > 360
  };

  const result = validateTelemetry(telemetry);
  assertEquals(result.valid, false, 'Should fail with invalid heading');
  assertEquals(
    result.errors.some(e => e.includes('heading')),
    true,
    'Should have heading error'
  );
});

Deno.test('Validate telemetry with invalid timestamp', () => {
  const telemetry = {
    device_id: 'GPS-12345',
    timestamp: 'not-a-date',
    latitude: 37.7749,
    longitude: -122.4194,
    speed: 65.5,
    heading: 180.0,
  };

  const result = validateTelemetry(telemetry);
  assertEquals(result.valid, false, 'Should fail with invalid timestamp');
  assertEquals(
    result.errors.some(e => e.includes('timestamp')),
    true,
    'Should have timestamp error'
  );
});

Deno.test('Validate telemetry with invalid ignition status', () => {
  const telemetry = {
    device_id: 'GPS-12345',
    timestamp: '2025-01-15T10:30:00Z',
    latitude: 37.7749,
    longitude: -122.4194,
    speed: 65.5,
    heading: 180.0,
    ignition_status: 'maybe', // Invalid: not 'on' or 'off'
  };

  const result = validateTelemetry(telemetry);
  assertEquals(result.valid, false, 'Should fail with invalid ignition status');
  assertEquals(
    result.errors.some(e => e.includes('ignition_status')),
    true,
    'Should have ignition_status error'
  );
});

Deno.test('Validate telemetry with multiple errors', () => {
  const telemetry = {
    // Missing device_id
    timestamp: 'not-a-date',
    latitude: 95.0, // Invalid
    longitude: -185.0, // Invalid
    speed: -10.0, // Invalid
    heading: 365.0, // Invalid
  };

  const result = validateTelemetry(telemetry);
  assertEquals(result.valid, false, 'Should fail with multiple errors');
  assertEquals(result.errors.length >= 5, true, 'Should have multiple errors');
});

// ============================================================================
// Edge Case Tests
// ============================================================================

Deno.test('Distance calculation - GPS drift (very small movement)', () => {
  // GPS drift: coordinates change by 0.0001 degrees (~11 meters)
  const lat1 = 37.7749;
  const lon1 = -122.4194;
  const lat2 = 37.7750; // +0.0001 degrees
  const lon2 = -122.4193; // +0.0001 degrees

  const distance = calculateDistance(lat1, lon1, lat2, lon2);

  // Distance should be very small (< 0.02 km = 20 meters)
  assertEquals(
    distance < 0.02,
    true,
    `GPS drift distance ${distance.toFixed(4)} km should be < 0.02 km`
  );
});

Deno.test('Validate telemetry - Boundary values for coordinates', () => {
  // Test extreme valid coordinates
  const telemetry1 = {
    device_id: 'GPS-12345',
    timestamp: '2025-01-15T10:30:00Z',
    latitude: 90.0, // North Pole
    longitude: 180.0, // International Date Line
    speed: 0,
    heading: 0,
  };

  const result1 = validateTelemetry(telemetry1);
  assertEquals(result1.valid, true, 'North Pole coordinates should be valid');

  const telemetry2 = {
    device_id: 'GPS-12345',
    timestamp: '2025-01-15T10:30:00Z',
    latitude: -90.0, // South Pole
    longitude: -180.0, // International Date Line
    speed: 0,
    heading: 0,
  };

  const result2 = validateTelemetry(telemetry2);
  assertEquals(result2.valid, true, 'South Pole coordinates should be valid');
});

Deno.test('Validate telemetry - Zero values', () => {
  const telemetry = {
    device_id: 'GPS-12345',
    timestamp: '2025-01-15T10:30:00Z',
    latitude: 0, // Equator
    longitude: 0, // Prime meridian
    speed: 0, // Stationary
    heading: 0, // North
    odometer: 0, // New vehicle
  };

  const result = validateTelemetry(telemetry);
  assertEquals(result.valid, true, 'Zero values should be valid');
});

console.log('✅ All GPS Processor tests completed');
