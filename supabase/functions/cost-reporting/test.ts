/**
 * Integration tests for cost-reporting Edge Function
 * 
 * Tests Requirements: 22.1, 22.2, 22.3, 22.4, 22.5
 */

import { assertEquals, assertExists } from 'https://deno.land/std@0.192.0/testing/asserts.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// Test configuration
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'http://localhost:54321';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
const TEST_JWT_TOKEN = Deno.env.get('TEST_JWT_TOKEN') || '';

const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/cost-reporting`;

// Helper to make authenticated requests to the function
async function callFunction(endpoint: string, params: Record<string, string> = {}) {
  const url = new URL(`${FUNCTION_URL}/${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TEST_JWT_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();
  return { status: response.status, data };
}

// ============================================================================
// Test Suite
// ============================================================================

Deno.test('Cost Reporting - Detailed Report', async () => {
  const { status, data } = await callFunction('detailed', {
    start_date: '2025-01-01',
    end_date: '2025-01-31',
  });

  assertEquals(status, 200);
  assertExists(data.report_type);
  assertEquals(data.report_type, 'detailed');
  assertExists(data.filters);
  assertExists(data.data);
});

Deno.test('Cost Reporting - Detailed Report with Filters', async () => {
  const { status, data } = await callFunction('detailed', {
    start_date: '2025-01-01',
    end_date: '2025-01-31',
    cost_categories: 'parts,labor',
    include_previous_period: 'true',
  });

  assertEquals(status, 200);
  assertEquals(data.report_type, 'detailed');
  assertEquals(data.filters.cost_categories, ['parts', 'labor']);
  assertEquals(data.filters.include_previous_period, true);
});

Deno.test('Cost Reporting - Summary Statistics', async () => {
  const { status, data } = await callFunction('summary', {
    start_date: '2025-01-01',
    end_date: '2025-01-31',
  });

  assertEquals(status, 200);
  assertEquals(data.report_type, 'summary');
  assertExists(data.period);
  assertExists(data.data);
  
  // Check that all expected fields are present
  if (data.data) {
    assertExists(data.data.total_cost);
    assertExists(data.data.average_cost_per_vehicle);
    assertExists(data.data.average_cost_per_km);
    assertExists(data.data.parts_cost);
    assertExists(data.data.labor_cost);
    assertExists(data.data.external_service_cost);
    assertExists(data.data.fuel_cost);
  }
});

Deno.test('Cost Reporting - Top Vehicles', async () => {
  const { status, data } = await callFunction('top-vehicles', {
    start_date: '2025-01-01',
    end_date: '2025-01-31',
    limit: '5',
  });

  assertEquals(status, 200);
  assertEquals(data.report_type, 'top_vehicles');
  assertEquals(data.limit, 5);
  assertExists(data.data);
  
  // Check structure of returned data
  if (data.data.length > 0) {
    const firstVehicle = data.data[0];
    assertExists(firstVehicle.vehicle_id);
    assertExists(firstVehicle.vehicle_identifier);
    assertExists(firstVehicle.total_cost);
    assertExists(firstVehicle.cost_rank);
  }
});

Deno.test('Cost Reporting - Top Components', async () => {
  const { status, data } = await callFunction('top-components', {
    start_date: '2025-01-01',
    end_date: '2025-01-31',
    limit: '5',
  });

  assertEquals(status, 200);
  assertEquals(data.report_type, 'top_components');
  assertEquals(data.limit, 5);
  assertExists(data.data);
  
  // Check structure of returned data
  if (data.data.length > 0) {
    const firstComponent = data.data[0];
    assertExists(firstComponent.component_type);
    assertExists(firstComponent.total_cost);
    assertExists(firstComponent.component_count);
    assertExists(firstComponent.cost_rank);
  }
});

Deno.test('Cost Reporting - Missing Required Parameters', async () => {
  const { status, data } = await callFunction('detailed', {});

  assertEquals(status, 400);
  assertExists(data.error);
});

Deno.test('Cost Reporting - Invalid Report Type', async () => {
  const { status, data } = await callFunction('invalid-report', {
    start_date: '2025-01-01',
    end_date: '2025-01-31',
  });

  assertEquals(status, 400);
  assertExists(data.error);
  assertExists(data.available_endpoints);
});

Deno.test('Cost Reporting - Refresh Cache', async () => {
  const { status, data } = await callFunction('refresh-cache', {});

  assertEquals(status, 200);
  assertExists(data.success);
  assertEquals(data.success, true);
});

Deno.test('Cost Reporting - Period Comparison Calculation', async () => {
  const { status, data } = await callFunction('detailed', {
    start_date: '2025-01-01',
    end_date: '2025-01-31',
    include_previous_period: 'true',
  });

  assertEquals(status, 200);
  
  // Verify that period comparison fields are included
  if (data.data.length > 0) {
    const firstEntry = data.data[0];
    assertExists(firstEntry.current_period_cost);
    assertExists(firstEntry.previous_period_cost);
    assertExists(firstEntry.cost_change);
    // cost_change_percentage may be null if previous_period_cost is 0
  }
});

// ============================================================================
// Database Function Tests (Direct SQL)
// ============================================================================

Deno.test('Database - Cost Summary Function', async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: { Authorization: `Bearer ${TEST_JWT_TOKEN}` },
    },
  });

  const { data: user } = await supabase.auth.getUser();
  const tenantId = user.user?.user_metadata?.tenant_id;

  if (!tenantId) {
    console.log('Skipping test - no tenant_id found');
    return;
  }

  const { data, error } = await supabase.rpc('get_cost_summary_statistics', {
    p_tenant_id: tenantId,
    p_start_date: '2025-01-01',
    p_end_date: '2025-01-31',
  });

  assertEquals(error, null);
  assertExists(data);
  
  if (data && data.length > 0) {
    const summary = data[0];
    assertExists(summary.total_cost);
  }
});

Deno.test('Database - Top Vehicles Function', async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: { Authorization: `Bearer ${TEST_JWT_TOKEN}` },
    },
  });

  const { data: user } = await supabase.auth.getUser();
  const tenantId = user.user?.user_metadata?.tenant_id;

  if (!tenantId) {
    console.log('Skipping test - no tenant_id found');
    return;
  }

  const { data, error } = await supabase.rpc('get_top_cost_contributors_by_vehicle', {
    p_tenant_id: tenantId,
    p_start_date: '2025-01-01',
    p_end_date: '2025-01-31',
    p_limit: 10,
  });

  assertEquals(error, null);
  assertExists(data);
});

console.log('All cost reporting tests completed!');
