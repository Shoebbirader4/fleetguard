/**
 * Test suite for GDPR Compliance Edge Function
 * 
 * Tests for:
 * - Data export endpoint
 * - Data deletion endpoint
 * - Data summary endpoint
 * - Authorization and permissions
 * - Rate limiting
 */

import { assertEquals, assertExists } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const FUNCTION_URL = Deno.env.get('FUNCTION_URL') || 'http://localhost:54321/functions/v1/gdpr-compliance';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'http://localhost:54321';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';

// Test user credentials (should be set up in test environment)
const TEST_USER_EMAIL = Deno.env.get('TEST_USER_EMAIL') || 'test@example.com';
const TEST_USER_PASSWORD = Deno.env.get('TEST_USER_PASSWORD') || 'TestPassword123!';
const TEST_ADMIN_EMAIL = Deno.env.get('TEST_ADMIN_EMAIL') || 'admin@example.com';
const TEST_ADMIN_PASSWORD = Deno.env.get('TEST_ADMIN_PASSWORD') || 'AdminPassword123!';

let testUserToken: string;
let testAdminToken: string;

/**
 * Setup: Authenticate test users
 */
async function setup() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Authenticate regular user
  const { data: userData, error: userError } = await supabase.auth.signInWithPassword({
    email: TEST_USER_EMAIL,
    password: TEST_USER_PASSWORD,
  });

  if (userError) {
    throw new Error(`Failed to authenticate test user: ${userError.message}`);
  }

  testUserToken = userData.session?.access_token || '';

  // Authenticate admin user
  const { data: adminData, error: adminError } = await supabase.auth.signInWithPassword({
    email: TEST_ADMIN_EMAIL,
    password: TEST_ADMIN_PASSWORD,
  });

  if (adminError) {
    throw new Error(`Failed to authenticate admin user: ${adminError.message}`);
  }

  testAdminToken = adminData.session?.access_token || '';

  console.log('✅ Test users authenticated successfully');
}

/**
 * Test: Data Summary Endpoint
 */
Deno.test('GET /data-summary - should return data summary for authenticated user', async () => {
  await setup();

  const response = await fetch(`${FUNCTION_URL}/data-summary`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${testUserToken}`,
      'Content-Type': 'application/json',
    },
  });

  assertEquals(response.status, 200);

  const data = await response.json();
  assertExists(data.tenantId);
  assertExists(data.totalRecords);
  assertExists(data.tableRecordCounts);

  console.log('✅ Data summary retrieved successfully');
  console.log(`Total records: ${data.totalRecords}`);
});

/**
 * Test: Data Summary - Unauthorized
 */
Deno.test('GET /data-summary - should return 401 without authentication', async () => {
  const response = await fetch(`${FUNCTION_URL}/data-summary`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  assertEquals(response.status, 401);

  const data = await response.json();
  assertEquals(data.error, 'Missing authorization header');

  console.log('✅ Unauthorized access correctly rejected');
});

/**
 * Test: Data Export Endpoint - JSON format
 */
Deno.test('POST /export-data - should export tenant data in JSON format', async () => {
  await setup();

  const response = await fetch(`${FUNCTION_URL}/export-data`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${testUserToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      format: 'json',
      tables: ['vehicles', 'components', 'users'],
    }),
  });

  assertEquals(response.status, 200);
  assertEquals(response.headers.get('content-type'), 'application/json');

  const data = await response.json();
  assertExists(data.metadata);
  assertExists(data.data);
  
  // Verify metadata
  assertEquals(data.metadata.format, 'json');
  assertExists(data.metadata.exportDate);
  assertExists(data.metadata.tenantId);
  assertExists(data.metadata.exportedBy);
  
  // Verify data structure
  assertExists(data.data.vehicles);
  assertExists(data.data.components);
  assertExists(data.data.users);

  console.log('✅ Data export successful');
  console.log(`Exported tables: ${data.metadata.tables.join(', ')}`);
});

/**
 * Test: Data Export - All tables
 */
Deno.test('POST /export-data - should export all tables when no tables specified', async () => {
  await setup();

  const response = await fetch(`${FUNCTION_URL}/export-data`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${testUserToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      format: 'json',
    }),
  });

  assertEquals(response.status, 200);

  const data = await response.json();
  assertExists(data.metadata);
  assertExists(data.data);
  
  // Should have exported multiple tables
  const tableCount = data.metadata.tables.length;
  assertEquals(tableCount > 5, true, 'Should export multiple tables');

  console.log('✅ Full data export successful');
  console.log(`Exported ${tableCount} tables`);
});

/**
 * Test: Data Export - Unauthorized
 */
Deno.test('POST /export-data - should return 401 without authentication', async () => {
  const response = await fetch(`${FUNCTION_URL}/export-data`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      format: 'json',
    }),
  });

  assertEquals(response.status, 401);

  const data = await response.json();
  assertEquals(data.error, 'Missing authorization header');

  console.log('✅ Unauthorized export correctly rejected');
});

/**
 * Test: Data Deletion - Insufficient Permissions
 */
Deno.test('POST /request-deletion - should return 403 for non-admin user', async () => {
  await setup();

  const response = await fetch(`${FUNCTION_URL}/request-deletion`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${testUserToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      confirmDeletion: true,
      reason: 'Test deletion request - should be denied',
    }),
  });

  assertEquals(response.status, 403);

  const data = await response.json();
  assertExists(data.error);
  assertEquals(data.error.includes('Insufficient permissions'), true);

  console.log('✅ Non-admin deletion correctly rejected');
});

/**
 * Test: Data Deletion - Missing Confirmation
 */
Deno.test('POST /request-deletion - should return 400 without confirmation', async () => {
  await setup();

  const response = await fetch(`${FUNCTION_URL}/request-deletion`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${testAdminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      confirmDeletion: false,
      reason: 'Test deletion without confirmation',
    }),
  });

  assertEquals(response.status, 400);

  const data = await response.json();
  assertEquals(data.error.includes('must be explicitly confirmed'), true);

  console.log('✅ Deletion without confirmation correctly rejected');
});

/**
 * Test: Data Deletion - Missing Reason
 */
Deno.test('POST /request-deletion - should return 400 without reason', async () => {
  await setup();

  const response = await fetch(`${FUNCTION_URL}/request-deletion`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${testAdminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      confirmDeletion: true,
      reason: 'Short',
    }),
  });

  assertEquals(response.status, 400);

  const data = await response.json();
  assertEquals(data.error.includes('minimum 10 characters'), true);

  console.log('✅ Deletion with short reason correctly rejected');
});

/**
 * Test: CORS Preflight
 */
Deno.test('OPTIONS - should handle CORS preflight', async () => {
  const response = await fetch(FUNCTION_URL, {
    method: 'OPTIONS',
  });

  assertEquals(response.status, 200);
  assertExists(response.headers.get('access-control-allow-origin'));
  assertExists(response.headers.get('access-control-allow-headers'));

  console.log('✅ CORS preflight handled correctly');
});

/**
 * Test: Rate Limiting Headers
 */
Deno.test('Rate limiting headers should be present', async () => {
  await setup();

  const response = await fetch(`${FUNCTION_URL}/data-summary`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${testUserToken}`,
      'Content-Type': 'application/json',
    },
  });

  assertEquals(response.status, 200);

  // Check for rate limit headers
  const rateLimitLimit = response.headers.get('x-ratelimit-limit');
  const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
  const rateLimitReset = response.headers.get('x-ratelimit-reset');

  assertExists(rateLimitLimit);
  assertExists(rateLimitRemaining);
  assertExists(rateLimitReset);

  console.log('✅ Rate limiting headers present');
  console.log(`Rate limit: ${rateLimitLimit}/minute, Remaining: ${rateLimitRemaining}`);
});

/**
 * Test: Invalid Endpoint
 */
Deno.test('Invalid endpoint should return 404', async () => {
  await setup();

  const response = await fetch(`${FUNCTION_URL}/invalid-endpoint`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${testUserToken}`,
      'Content-Type': 'application/json',
    },
  });

  assertEquals(response.status, 404);

  const data = await response.json();
  assertEquals(data.error, 'Endpoint not found');

  console.log('✅ Invalid endpoint correctly returns 404');
});

console.log('\n🎯 All GDPR Compliance tests defined');
console.log('Run tests with: deno test --allow-net --allow-env test.ts');
