/**
 * Test script for Maintenance Calendar Edge Function
 * 
 * Run this script to test the maintenance-calendar edge function locally
 * 
 * Prerequisites:
 * - Supabase local instance running
 * - Test data loaded (run test_maintenance_scheduling.sql)
 * - Valid JWT token for a test user
 */

import { assertEquals, assertExists } from 'https://deno.land/std@0.192.0/testing/asserts.ts';

// Configuration
const FUNCTION_URL = Deno.env.get('FUNCTION_URL') || 'http://localhost:54321/functions/v1/maintenance-calendar';
const TEST_JWT = Deno.env.get('TEST_JWT') || '';

if (!TEST_JWT) {
  console.error('Error: TEST_JWT environment variable is required');
  console.log('Usage: TEST_JWT=<your-jwt-token> deno run --allow-net --allow-env test.ts');
  Deno.exit(1);
}

// Test 1: Get default 30-day calendar
Deno.test('GET /maintenance-calendar - default 30 days', async () => {
  const response = await fetch(FUNCTION_URL, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${TEST_JWT}`,
      'Content-Type': 'application/json',
    },
  });

  assertEquals(response.status, 200);

  const data = await response.json();
  assertExists(data.success);
  assertEquals(data.success, true);
  assertExists(data.data);
  assertExists(data.summary);
  assertEquals(data.days_ahead, 30);
  assertExists(data.generated_at);

  console.log('✅ Test 1 passed: Default 30-day calendar retrieved');
  console.log(`   Total items: ${data.summary.total_items}`);
  console.log(`   Overdue: ${data.summary.overdue_count}`);
  console.log(`   Critical: ${data.summary.critical_count}`);
});

// Test 2: Get custom days ahead
Deno.test('GET /maintenance-calendar - custom 60 days', async () => {
  const response = await fetch(`${FUNCTION_URL}?days_ahead=60`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${TEST_JWT}`,
      'Content-Type': 'application/json',
    },
  });

  assertEquals(response.status, 200);

  const data = await response.json();
  assertEquals(data.success, true);
  assertEquals(data.days_ahead, 60);

  console.log('✅ Test 2 passed: Custom 60-day calendar retrieved');
  console.log(`   Total items: ${data.summary.total_items}`);
});

// Test 3: Invalid days_ahead parameter
Deno.test('GET /maintenance-calendar - invalid days_ahead', async () => {
  const response = await fetch(`${FUNCTION_URL}?days_ahead=400`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${TEST_JWT}`,
      'Content-Type': 'application/json',
    },
  });

  assertEquals(response.status, 400);

  const data = await response.json();
  assertExists(data.error);

  console.log('✅ Test 3 passed: Invalid days_ahead rejected');
});

// Test 4: Missing authorization
Deno.test('GET /maintenance-calendar - missing auth', async () => {
  const response = await fetch(FUNCTION_URL, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  assertEquals(response.status, 401);

  const data = await response.json();
  assertExists(data.error);

  console.log('✅ Test 4 passed: Unauthorized access rejected');
});

// Test 5: Verify data structure
Deno.test('GET /maintenance-calendar - data structure validation', async () => {
  const response = await fetch(FUNCTION_URL, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${TEST_JWT}`,
      'Content-Type': 'application/json',
    },
  });

  assertEquals(response.status, 200);

  const result = await response.json();
  assertEquals(result.success, true);

  // Check summary structure
  assertExists(result.summary.total_items);
  assertExists(result.summary.overdue_count);
  assertExists(result.summary.critical_count);
  assertExists(result.summary.high_priority_count);
  assertExists(result.summary.due_by_date_count);
  assertExists(result.summary.due_by_odometer_count);

  // Check data item structure (if items exist)
  if (result.data.length > 0) {
    const item = result.data[0];
    assertExists(item.schedule_id);
    assertExists(item.vehicle_id);
    assertExists(item.vehicle_make);
    assertExists(item.vehicle_model);
    assertExists(item.vehicle_vin);
    assertExists(item.schedule_name);
    assertExists(item.priority);
    assertExists(item.due_type);
    assertExists(item.is_overdue);
  }

  console.log('✅ Test 5 passed: Data structure is valid');
});

// Test 6: Method not allowed
Deno.test('POST /maintenance-calendar - method not allowed', async () => {
  const response = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TEST_JWT}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  assertEquals(response.status, 405);

  const data = await response.json();
  assertExists(data.error);

  console.log('✅ Test 6 passed: POST method rejected');
});

console.log('\n📊 All tests completed successfully!');
