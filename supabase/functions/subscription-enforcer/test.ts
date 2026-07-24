/**
 * Tests for Subscription Enforcer Edge Function
 * 
 * Run with: deno test --allow-net --allow-env supabase/functions/subscription-enforcer/test.ts
 */

import { assertEquals, assertExists } from 'https://deno.land/std@0.192.0/testing/asserts.ts';

// ============================================================================
// Test Utilities
// ============================================================================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'http://localhost:54321';
const _ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || 'test-anon-key';
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/subscription-enforcer`;

interface TestResponse {
  status: number;
  // deno-lint-ignore no-explicit-any
  body: any;
}

// deno-lint-ignore no-explicit-any
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
// Unit Tests
// ============================================================================

Deno.test('Subscription Enforcer - Missing Authorization', async () => {
  const response = await callFunction({
    tenant_id: '123e4567-e89b-12d3-a456-426614174000',
  });

  assertEquals(response.status, 401);
  assertEquals(response.body.code, 'MISSING_TOKEN');
});

Deno.test('Subscription Enforcer - Missing tenant_id', async () => {
  const response = await callFunction(
    {
      // Missing tenant_id
    },
    'fake-token'
  );

  assertEquals(response.status, 400);
  assertExists(response.body.error);
  assertEquals(response.body.details, 'tenant_id is required');
});

Deno.test('Subscription Enforcer - Method Not Allowed (GET)', async () => {
  const response = await fetch(FUNCTION_URL, {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer fake-token',
    },
  });

  assertEquals(response.status, 405);
  const body = await response.json();
  assertEquals(body.error, 'Method not allowed. Use POST.');
});

Deno.test('Subscription Enforcer - CORS Preflight', async () => {
  const response = await fetch(FUNCTION_URL, {
    method: 'OPTIONS',
  });

  assertEquals(response.status, 204);
  assertExists(response.headers.get('Access-Control-Allow-Origin'));
  assertExists(response.headers.get('Access-Control-Allow-Methods'));
});

// ============================================================================
// Integration Tests (require live Supabase instance)
// ============================================================================

/**
 * NOTE: The following tests require:
 * 1. A running Supabase instance (local or remote)
 * 2. Valid JWT token with tenant_id and role
 * 3. Test data in the database (tenants with subscription plans, vehicles)
 * 
 * To run integration tests:
 * 1. Start Supabase locally: supabase start
 * 2. Get a valid JWT token from auth
 * 3. Set environment variables:
 *    - SUPABASE_URL
 *    - SUPABASE_ANON_KEY
 *    - TEST_JWT_TOKEN
 *    - TEST_TENANT_ID
 * 4. Run: deno test --allow-net --allow-env supabase/functions/subscription-enforcer/test.ts
 */

/*
Deno.test('Subscription Enforcer - Starter Plan Within Limit', async () => {
  const testToken = Deno.env.get('TEST_JWT_TOKEN');
  const testTenantId = Deno.env.get('TEST_TENANT_ID');
  
  if (!testToken || !testTenantId) {
    console.log('Skipping integration test: TEST_JWT_TOKEN or TEST_TENANT_ID not set');
    return;
  }

  const response = await callFunction(
    {
      tenant_id: testTenantId,
    },
    testToken
  );

  assertEquals(response.status, 200);
  assertEquals(response.body.subscription_plan, 'starter');
  assertEquals(response.body.vehicle_limit, 50);
  assertExists(response.body.current_count);
  assertExists(response.body.allowed);
  
  // If within limit, should be allowed
  if (response.body.current_count < 50) {
    assertEquals(response.body.allowed, true);
  }
});

Deno.test('Subscription Enforcer - Starter Plan At Limit', async () => {
  const testToken = Deno.env.get('TEST_JWT_TOKEN');
  const testTenantId = Deno.env.get('TEST_TENANT_ID_AT_LIMIT');
  
  if (!testToken || !testTenantId) {
    console.log('Skipping integration test: TEST_JWT_TOKEN or TEST_TENANT_ID_AT_LIMIT not set');
    return;
  }

  const response = await callFunction(
    {
      tenant_id: testTenantId,
    },
    testToken
  );

  assertEquals(response.status, 200);
  assertEquals(response.body.allowed, false);
  assertEquals(response.body.current_count, 50);
  assertEquals(response.body.vehicle_limit, 50);
  assertExists(response.body.upgrade_message);
  assertEquals(
    response.body.upgrade_message.includes('Starter plan'),
    true
  );
});

Deno.test('Subscription Enforcer - Professional Plan Within Limit', async () => {
  const testToken = Deno.env.get('TEST_JWT_TOKEN_PRO');
  const testTenantId = Deno.env.get('TEST_TENANT_ID_PRO');
  
  if (!testToken || !testTenantId) {
    console.log('Skipping integration test: TEST_JWT_TOKEN_PRO or TEST_TENANT_ID_PRO not set');
    return;
  }

  const response = await callFunction(
    {
      tenant_id: testTenantId,
    },
    testToken
  );

  assertEquals(response.status, 200);
  assertEquals(response.body.subscription_plan, 'professional');
  assertEquals(response.body.vehicle_limit, 200);
  assertExists(response.body.current_count);
  
  // If within limit, should be allowed
  if (response.body.current_count < 200) {
    assertEquals(response.body.allowed, true);
  }
});

Deno.test('Subscription Enforcer - Enterprise Plan Unlimited', async () => {
  const testToken = Deno.env.get('TEST_JWT_TOKEN_ENT');
  const testTenantId = Deno.env.get('TEST_TENANT_ID_ENT');
  
  if (!testToken || !testTenantId) {
    console.log('Skipping integration test: TEST_JWT_TOKEN_ENT or TEST_TENANT_ID_ENT not set');
    return;
  }

  const response = await callFunction(
    {
      tenant_id: testTenantId,
    },
    testToken
  );

  assertEquals(response.status, 200);
  assertEquals(response.body.subscription_plan, 'enterprise');
  assertEquals(response.body.allowed, true);
  // Enterprise has unlimited vehicles
  assertEquals(response.body.vehicle_limit > 1000, true);
});

Deno.test('Subscription Enforcer - Cross-Tenant Access Denied', async () => {
  const testToken = Deno.env.get('TEST_JWT_TOKEN');
  const otherTenantId = Deno.env.get('TEST_OTHER_TENANT_ID');
  
  if (!testToken || !otherTenantId) {
    console.log('Skipping integration test: TEST_JWT_TOKEN or TEST_OTHER_TENANT_ID not set');
    return;
  }

  const response = await callFunction(
    {
      tenant_id: otherTenantId, // Different tenant from auth token
    },
    testToken
  );

  assertEquals(response.status, 403);
  assertExists(response.body.error);
});

Deno.test('Subscription Enforcer - Suspended Subscription', async () => {
  const testToken = Deno.env.get('TEST_JWT_TOKEN_SUSPENDED');
  const testTenantId = Deno.env.get('TEST_TENANT_ID_SUSPENDED');
  
  if (!testToken || !testTenantId) {
    console.log('Skipping integration test: TEST_JWT_TOKEN_SUSPENDED or TEST_TENANT_ID_SUSPENDED not set');
    return;
  }

  const response = await callFunction(
    {
      tenant_id: testTenantId,
    },
    testToken
  );

  assertEquals(response.status, 200);
  // Suspended subscriptions should not allow adding vehicles
  assertEquals(response.body.allowed, false);
});
*/
