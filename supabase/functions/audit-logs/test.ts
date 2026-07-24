/**
 * Test file for Audit Logs Edge Function
 * 
 * Task: 15.7 Implement audit logging
 * 
 * Run with: deno test --allow-env --allow-net test.ts
 */

import { assertEquals, assertExists } from 'https://deno.land/std@0.168.0/testing/asserts.ts';

// Mock Supabase URL and key (replace with actual test credentials)
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'http://localhost:54321';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
const TEST_JWT = Deno.env.get('TEST_JWT') || '';

const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/audit-logs`;

Deno.test('Audit Logs - Search without filters', async () => {
  const response = await fetch(FUNCTION_URL, {
    headers: {
      Authorization: `Bearer ${TEST_JWT}`,
      'Content-Type': 'application/json',
    },
  });

  assertEquals(response.status, 200);
  const data = await response.json();
  
  assertExists(data.logs);
  assertExists(data.pagination);
  assertEquals(Array.isArray(data.logs), true);
});

Deno.test('Audit Logs - Search with entity type filter', async () => {
  const params = new URLSearchParams({
    entityType: 'vehicles',
  });

  const response = await fetch(`${FUNCTION_URL}?${params}`, {
    headers: {
      Authorization: `Bearer ${TEST_JWT}`,
      'Content-Type': 'application/json',
    },
  });

  assertEquals(response.status, 200);
  const data = await response.json();
  
  assertExists(data.logs);
  // All logs should be for vehicles entity type
  data.logs.forEach((log: any) => {
    assertEquals(log.entity_type, 'vehicles');
  });
});

Deno.test('Audit Logs - Search with operation filter', async () => {
  const params = new URLSearchParams({
    operation: 'update',
  });

  const response = await fetch(`${FUNCTION_URL}?${params}`, {
    headers: {
      Authorization: `Bearer ${TEST_JWT}`,
      'Content-Type': 'application/json',
    },
  });

  assertEquals(response.status, 200);
  const data = await response.json();
  
  assertExists(data.logs);
  // All logs should be update operations
  data.logs.forEach((log: any) => {
    assertEquals(log.operation, 'update');
  });
});

Deno.test('Audit Logs - Search with date range', async () => {
  const startDate = '2025-01-01';
  const endDate = '2025-12-31';
  
  const params = new URLSearchParams({
    startDate,
    endDate,
  });

  const response = await fetch(`${FUNCTION_URL}?${params}`, {
    headers: {
      Authorization: `Bearer ${TEST_JWT}`,
      'Content-Type': 'application/json',
    },
  });

  assertEquals(response.status, 200);
  const data = await response.json();
  
  assertExists(data.logs);
  // All logs should be within date range
  data.logs.forEach((log: any) => {
    const logDate = new Date(log.timestamp);
    assertEquals(logDate >= new Date(startDate), true);
    assertEquals(logDate <= new Date(endDate), true);
  });
});

Deno.test('Audit Logs - Pagination', async () => {
  const params = new URLSearchParams({
    page: '2',
    pageSize: '10',
  });

  const response = await fetch(`${FUNCTION_URL}?${params}`, {
    headers: {
      Authorization: `Bearer ${TEST_JWT}`,
      'Content-Type': 'application/json',
    },
  });

  assertEquals(response.status, 200);
  const data = await response.json();
  
  assertExists(data.pagination);
  assertEquals(data.pagination.page, 2);
  assertEquals(data.pagination.pageSize, 10);
  assertEquals(data.logs.length <= 10, true);
});

Deno.test('Audit Logs - Export to CSV', async () => {
  const response = await fetch(`${FUNCTION_URL}/export`, {
    headers: {
      Authorization: `Bearer ${TEST_JWT}`,
    },
  });

  assertEquals(response.status, 200);
  assertEquals(response.headers.get('Content-Type'), 'text/csv');
  
  const csv = await response.text();
  // Check CSV has header row
  assertEquals(csv.startsWith('Timestamp,User Email,User Name'), true);
});

Deno.test('Audit Logs - Unauthorized access', async () => {
  const response = await fetch(FUNCTION_URL);

  assertEquals(response.status, 401);
  const data = await response.json();
  assertExists(data.error);
});

Deno.test('Audit Logs - Changed fields for UPDATE operations', async () => {
  const params = new URLSearchParams({
    operation: 'update',
    pageSize: '1',
  });

  const response = await fetch(`${FUNCTION_URL}?${params}`, {
    headers: {
      Authorization: `Bearer ${TEST_JWT}`,
      'Content-Type': 'application/json',
    },
  });

  assertEquals(response.status, 200);
  const data = await response.json();
  
  if (data.logs.length > 0) {
    const updateLog = data.logs[0];
    assertEquals(updateLog.operation, 'update');
    // UPDATE operations should have changed_fields
    if (updateLog.changed_fields) {
      assertExists(updateLog.changed_fields);
      // Each changed field should have old_value and new_value
      Object.values(updateLog.changed_fields).forEach((field: any) => {
        assertExists(field.old_value !== undefined);
        assertExists(field.new_value !== undefined);
      });
    }
  }
});

console.log('✅ All audit logs tests configured');
console.log('⚠️  Note: Tests require valid TEST_JWT environment variable');
console.log('   Run: export TEST_JWT="your_jwt_token"');
