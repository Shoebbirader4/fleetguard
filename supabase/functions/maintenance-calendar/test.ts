/**
 * Integration tests for Maintenance Calendar Edge Function
 * 
 * Run with: deno test --allow-net --allow-env test.ts
 */

import { assertEquals, assertExists } from 'https://deno.land/std@0.192.0/testing/asserts.ts';

// Test configuration
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'http://localhost:54321';
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/maintenance-calendar`;
const TEST_JWT = Deno.env.get('TEST_JWT_TOKEN') || '';

interface MaintenanceCalendarResponse {
  total: number;
  overdue: number;
  due_soon: number;
  items: any[];
}

/**
 * Test: Fetch 30-day maintenance calendar with valid auth
 */
Deno.test('Maintenance Calendar - Fetch 30-day calendar', async () => {
  const response = await fetch(`${FUNCTION_URL}?days=30`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${TEST_JWT}`,
      'Content-Type': 'application/json',
    },
  });

  assertEquals(response.status, 200);

  const data: MaintenanceCalendarResponse = await response.json();
  
  assertExists(data.total);
  assertExists(data.overdue);
  assertExists(data.due_soon);
  assertExists(data.items);
  
  assertEquals(typeof data.total, 'number');
  assertEquals(typeof data.overdue, 'number');
  assertEquals(typeof data.due_soon, 'number');
  assertEquals(Array.isArray(data.items), true);

  console.log(`✓ Fetched ${data.total} maintenance items (${data.overdue} overdue, ${data.due_soon} due soon)`);
});

/**
 * Test: Fetch 7-day maintenance calendar
 */
Deno.test('Maintenance Calendar - Fetch 7-day calendar', async () => {
  const response = await fetch(`${FUNCTION_URL}?days=7`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${TEST_JWT}`,
      'Content-Type': 'application/json',
    },
  });

  assertEquals(response.status, 200);

  const data: MaintenanceCalendarResponse = await response.json();
  
  assertExists(data.items);
  
  console.log(`✓ Fetched ${data.total} maintenance items for 7-day window`);
});

/**
 * Test: Fetch 90-day maintenance calendar
 */
Deno.test('Maintenance Calendar - Fetch 90-day calendar', async () => {
  const response = await fetch(`${FUNCTION_URL}?days=90`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${TEST_JWT}`,
      'Content-Type': 'application/json',
    },
  });

  assertEquals(response.status, 200);

  const data: MaintenanceCalendarResponse = await response.json();
  
  assertExists(data.items);
  
  console.log(`✓ Fetched ${data.total} maintenance items for 90-day window`);
});

/**
 * Test: Validate response structure
 */
Deno.test('Maintenance Calendar - Validate response structure', async () => {
  const response = await fetch(`${FUNCTION_URL}?days=30`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${TEST_JWT}`,
      'Content-Type': 'application/json',
    },
  });

  assertEquals(response.status, 200);

  const data: MaintenanceCalendarResponse = await response.json();
  
  if (data.items.length > 0) {
    const item = data.items[0];
    
    // Validate required fields
    assertExists(item.schedule_id);
    assertExists(item.vehicle_id);
    assertExists(item.vehicle_make);
    assertExists(item.vehicle_model);
    assertExists(item.vehicle_vin);
    assertExists(item.schedule_name);
    assertExists(item.priority);
    assertExists(item.is_overdue);
    assertExists(item.due_type);
    assertExists(item.current_odometer);
    
    // Validate field types
    assertEquals(typeof item.schedule_id, 'string');
    assertEquals(typeof item.vehicle_id, 'string');
    assertEquals(typeof item.priority, 'string');
    assertEquals(typeof item.is_overdue, 'boolean');
    assertEquals(typeof item.current_odometer, 'number');
    
    // Validate priority values
    const validPriorities = ['low', 'medium', 'high', 'critical'];
    assertEquals(validPriorities.includes(item.priority), true);
    
    // Validate due_type values
    const validDueTypes = ['date', 'odometer', 'engine_hours', 'multiple', 'unknown'];
    assertEquals(validDueTypes.includes(item.due_type), true);
    
    console.log(`✓ Response structure validated for item: ${item.schedule_name}`);
  } else {
    console.log('✓ No maintenance items to validate (empty calendar)');
  }
});

/**
 * Test: Missing authorization header
 */
Deno.test('Maintenance Calendar - Missing auth header', async () => {
  const response = await fetch(`${FUNCTION_URL}?days=30`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  assertEquals(response.status, 401);

  const data = await response.json();
  assertExists(data.error);
  assertEquals(data.error, 'Missing authorization header');

  console.log('✓ Correctly rejected request with missing auth header');
});

/**
 * Test: Invalid days parameter (too large)
 */
Deno.test('Maintenance Calendar - Invalid days parameter (too large)', async () => {
  const response = await fetch(`${FUNCTION_URL}?days=500`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${TEST_JWT}`,
      'Content-Type': 'application/json',
    },
  });

  assertEquals(response.status, 500);

  const data = await response.json();
  assertExists(data.error);

  console.log('✓ Correctly rejected invalid days parameter (too large)');
});

/**
 * Test: Invalid days parameter (negative)
 */
Deno.test('Maintenance Calendar - Invalid days parameter (negative)', async () => {
  const response = await fetch(`${FUNCTION_URL}?days=-10`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${TEST_JWT}`,
      'Content-Type': 'application/json',
    },
  });

  assertEquals(response.status, 500);

  const data = await response.json();
  assertExists(data.error);

  console.log('✓ Correctly rejected invalid days parameter (negative)');
});

/**
 * Test: Default days parameter (no parameter provided)
 */
Deno.test('Maintenance Calendar - Default days parameter', async () => {
  const response = await fetch(`${FUNCTION_URL}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${TEST_JWT}`,
      'Content-Type': 'application/json',
    },
  });

  assertEquals(response.status, 200);

  const data: MaintenanceCalendarResponse = await response.json();
  assertExists(data.items);

  console.log(`✓ Default days parameter (30) applied, fetched ${data.total} items`);
});

/**
 * Test: Verify overdue and due_soon categorization
 */
Deno.test('Maintenance Calendar - Verify categorization', async () => {
  const response = await fetch(`${FUNCTION_URL}?days=30`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${TEST_JWT}`,
      'Content-Type': 'application/json',
    },
  });

  assertEquals(response.status, 200);

  const data: MaintenanceCalendarResponse = await response.json();
  
  // Count overdue items manually
  const overdueCount = data.items.filter(item => item.is_overdue === true).length;
  assertEquals(data.overdue, overdueCount);
  
  // Count due_soon items manually (items due within 7 days that are not overdue)
  const dueSoonCount = data.items.filter(item => 
    !item.is_overdue && 
    item.days_until_due !== null && 
    item.days_until_due <= 7
  ).length;
  assertEquals(data.due_soon, dueSoonCount);

  console.log(`✓ Categorization verified: ${overdueCount} overdue, ${dueSoonCount} due soon`);
});

/**
 * Test: CORS headers
 */
Deno.test('Maintenance Calendar - CORS headers', async () => {
  const response = await fetch(`${FUNCTION_URL}`, {
    method: 'OPTIONS',
  });

  assertEquals(response.status, 200);
  
  const allowOrigin = response.headers.get('Access-Control-Allow-Origin');
  assertExists(allowOrigin);

  console.log('✓ CORS headers present in OPTIONS response');
});

console.log('\n🧪 Running Maintenance Calendar Integration Tests...\n');
