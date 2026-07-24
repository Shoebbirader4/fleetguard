/**
 * Tests for Odometer Validator Edge Function
 * 
 * Run with: deno test --allow-net --allow-env edge-functions/odometer-validator/test.ts
 */

import { assertEquals, assertExists } from 'https://deno.land/std@0.192.0/testing/asserts.ts';

// ============================================================================
// Test Utilities
// ============================================================================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'http://localhost:54321';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || 'test-anon-key';
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/odometer-validator`;

interface TestResponse {
  status: number;
  body: any;
}

async function callFunction(body: any, authToken?: string): Promise<TestResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const responseBody = await response.json();

  return {
    status: response.status,
    body: responseBody,
  };
}

// ============================================================================
// Tests
// ============================================================================

Deno.test('Odometer Validator - Missing Authorization', async () => {
  const response = await callFunction({
    vehicle_id: '123e4567-e89b-12d3-a456-426614174000',
    reading: 50000,
    source: 'manual',
  });

  assertEquals(response.status, 401);
  assertEquals(response.body.code, 'MISSING_TOKEN');
});

Deno.test('Odometer Validator - Missing Required Fields', async () => {
  const response = await callFunction(
    {
      // Missing vehicle_id, reading, source
    },
    'fake-token'
  );

  assertEquals(response.status, 400);
  assertExists(response.body.error);
});

Deno.test('Odometer Validator - Invalid Reading (Negative)', async () => {
  const response = await callFunction(
    {
      vehicle_id: '123e4567-e89b-12d3-a456-426614174000',
      reading: -100,
      source: 'manual',
    },
    'fake-token'
  );

  assertEquals(response.status, 400);
  assertEquals(response.body.error, 'Invalid reading');
});

Deno.test('Odometer Validator - Invalid Source', async () => {
  const response = await callFunction(
    {
      vehicle_id: '123e4567-e89b-12d3-a456-426614174000',
      reading: 50000,
      source: 'invalid-source',
    },
    'fake-token'
  );

  assertEquals(response.status, 400);
  assertEquals(response.body.error, 'Invalid source');
});

Deno.test('Odometer Validator - Invalid Timestamp', async () => {
  const response = await callFunction(
    {
      vehicle_id: '123e4567-e89b-12d3-a456-426614174000',
      reading: 50000,
      source: 'manual',
      timestamp: 'not-a-valid-date',
    },
    'fake-token'
  );

  assertEquals(response.status, 400);
  assertEquals(response.body.error, 'Invalid timestamp');
});

// ============================================================================
// Integration Tests (require live Supabase instance)
// ============================================================================

/**
 * NOTE: The following tests require:
 * 1. A running Supabase instance (local or remote)
 * 2. Valid JWT token with tenant_id and role
 * 3. Test data in the database (tenants, users, vehicles)
 * 
 * To run integration tests:
 * 1. Start Supabase locally: supabase start
 * 2. Get a valid JWT token from auth
 * 3. Set environment variables:
 *    - SUPABASE_URL
 *    - SUPABASE_ANON_KEY
 *    - TEST_JWT_TOKEN
 * 4. Run: deno test --allow-net --allow-env edge-functions/odometer-validator/test.ts
 */

/*
Deno.test('Odometer Validator - Valid First Reading', async () => {
  const testToken = Deno.env.get('TEST_JWT_TOKEN');
  if (!testToken) {
    console.log('Skipping integration test: TEST_JWT_TOKEN not set');
    return;
  }

  const response = await callFunction(
    {
      vehicle_id: 'test-vehicle-id',
      reading: 50000,
      source: 'manual',
    },
    testToken
  );

  assertEquals(response.status, 201);
  assertEquals(response.body.valid, true);
  assertEquals(response.body.anomaly_flag, false);
  assertExists(response.body.odometer_reading_id);
});

Deno.test('Odometer Validator - Valid Incremental Reading', async () => {
  const testToken = Deno.env.get('TEST_JWT_TOKEN');
  if (!testToken) {
    console.log('Skipping integration test: TEST_JWT_TOKEN not set');
    return;
  }

  const response = await callFunction(
    {
      vehicle_id: 'test-vehicle-id',
      reading: 50500,
      source: 'manual',
    },
    testToken
  );

  assertEquals(response.status, 201);
  assertEquals(response.body.valid, true);
  assertEquals(response.body.anomaly_flag, false);
});

Deno.test('Odometer Validator - Invalid Decreasing Reading', async () => {
  const testToken = Deno.env.get('TEST_JWT_TOKEN');
  if (!testToken) {
    console.log('Skipping integration test: TEST_JWT_TOKEN not set');
    return;
  }

  const response = await callFunction(
    {
      vehicle_id: 'test-vehicle-id',
      reading: 49000,
      source: 'manual',
    },
    testToken
  );

  assertEquals(response.status, 201);
  assertEquals(response.body.valid, false);
  assertEquals(response.body.anomaly_flag, true);
  assertExists(response.body.reason);
});

Deno.test('Odometer Validator - Anomalous Large Increase', async () => {
  const testToken = Deno.env.get('TEST_JWT_TOKEN');
  if (!testToken) {
    console.log('Skipping integration test: TEST_JWT_TOKEN not set');
    return;
  }

  const response = await callFunction(
    {
      vehicle_id: 'test-vehicle-id',
      reading: 52000, // +1500 km from previous
      source: 'manual',
      timestamp: new Date(Date.now() + 1000 * 60 * 60).toISOString(), // 1 hour later
    },
    testToken
  );

  assertEquals(response.status, 201);
  assertEquals(response.body.valid, true);
  assertEquals(response.body.anomaly_flag, true);
  assertExists(response.body.reason);
});
*/

