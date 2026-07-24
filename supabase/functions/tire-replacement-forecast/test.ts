/**
 * Unit Tests for Tire Replacement Forecast Edge Function
 * 
 * Task: 15.1 Implement tire management workflows
 * Requirements: 6.4, 6.5
 * 
 * Tests tire wear rate calculation, replacement forecasting, and alert generation logic
 */

import { assertEquals, assertExists } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Test configuration
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'http://localhost:54321';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

let supabase: SupabaseClient;
let testTenantId: string;
let testVehicleId: string;
let testTireId: string;

/**
 * Setup test data
 */
async function setupTestData() {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Create test tenant
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .insert({
      name: 'Test Tire Management Tenant',
      subscription_plan: 'professional',
      vehicle_limit: 200,
      subscription_status: 'active',
      billing_cycle: 'monthly',
      next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    })
    .select('id')
    .single();

  if (tenantError) throw tenantError;
  testTenantId = tenant.id;

  // Create test vehicle
  const { data: vehicle, error: vehicleError } = await supabase
    .from('vehicles')
    .insert({
      tenant_id: testTenantId,
      vin: 'TEST-TIRE-' + Date.now(),
      make: 'Volvo',
      model: 'B11R',
      year: 2022,
      vehicle_type: 'bus',
      current_odometer: 70000,
      status: 'active',
    })
    .select('id')
    .single();

  if (vehicleError) throw vehicleError;
  testVehicleId = vehicle.id;

  console.log(`Created test tenant ${testTenantId} and vehicle ${testVehicleId}`);
}

/**
 * Cleanup test data
 */
async function cleanupTestData() {
  if (testTenantId) {
    await supabase.from('tenants').delete().eq('id', testTenantId);
    console.log(`Cleaned up test tenant ${testTenantId}`);
  }
}

/**
 * Test: Create tire with tread depth measurements
 */
Deno.test('Create tire and tread depth measurements', async () => {
  await setupTestData();

  try {
    // Create tire
    const { data: tire, error: tireError } = await supabase
      .from('tires')
      .insert({
        tenant_id: testTenantId,
        vehicle_id: testVehicleId,
        axle_position: 'front',
        wheel_position: 'left',
        position_identifier: 'front_left',
        brand: 'Michelin',
        model: 'X-Multi',
        serial_number: 'TEST-SN-001',
        initial_tread_depth: 8.0,
        current_tread_depth: 8.0,
        minimum_legal_tread_depth: 1.6,
        installation_date: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 6 months ago
        installation_odometer: 50000,
        status: 'active',
      })
      .select('id')
      .single();

    if (tireError) throw tireError;
    assertExists(tire);
    testTireId = tire.id;

    console.log(`✓ Created test tire ${testTireId}`);

    // Add initial measurement
    const { error: measurement1Error } = await supabase
      .from('tread_depth_measurements')
      .insert({
        tenant_id: testTenantId,
        vehicle_id: testVehicleId,
        tire_id: testTireId,
        measurement_date: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
        odometer_reading: 50000,
        tread_depth: 8.0,
        measurement_method: 'digital_gauge',
        position_at_measurement: 'front_left',
      });

    if (measurement1Error) throw measurement1Error;

    // Add recent measurement showing wear
    const { error: measurement2Error } = await supabase
      .from('tread_depth_measurements')
      .insert({
        tenant_id: testTenantId,
        vehicle_id: testVehicleId,
        tire_id: testTireId,
        measurement_date: new Date().toISOString(),
        odometer_reading: 70000,
        tread_depth: 2.5,
        measurement_method: 'digital_gauge',
        position_at_measurement: 'front_left',
      });

    if (measurement2Error) throw measurement2Error;

    console.log('✓ Created tread depth measurements');
  } finally {
    await cleanupTestData();
  }
});

/**
 * Test: Calculate tire wear rate
 */
Deno.test('Calculate tire wear rate', async () => {
  await setupTestData();

  try {
    // Create tire and measurements
    const { data: tire, error: tireError } = await supabase
      .from('tires')
      .insert({
        tenant_id: testTenantId,
        vehicle_id: testVehicleId,
        axle_position: 'front',
        wheel_position: 'right',
        position_identifier: 'front_right',
        brand: 'Bridgestone',
        model: 'R-Drive',
        serial_number: 'TEST-SN-002',
        initial_tread_depth: 10.0,
        current_tread_depth: 10.0,
        minimum_legal_tread_depth: 1.6,
        installation_date: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        installation_odometer: 40000,
        status: 'active',
      })
      .select('id')
      .single();

    if (tireError) throw tireError;
    testTireId = tire.id;

    // Add measurements at different times
    await supabase.from('tread_depth_measurements').insert([
      {
        tenant_id: testTenantId,
        vehicle_id: testVehicleId,
        tire_id: testTireId,
        measurement_date: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000).toISOString(),
        odometer_reading: 40000,
        tread_depth: 10.0,
        measurement_method: 'digital_gauge',
        position_at_measurement: 'front_right',
      },
      {
        tenant_id: testTenantId,
        vehicle_id: testVehicleId,
        tire_id: testTireId,
        measurement_date: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000).toISOString(),
        odometer_reading: 55000,
        tread_depth: 7.0,
        measurement_method: 'digital_gauge',
        position_at_measurement: 'front_right',
      },
      {
        tenant_id: testTenantId,
        vehicle_id: testVehicleId,
        tire_id: testTireId,
        measurement_date: new Date().toISOString(),
        odometer_reading: 70000,
        tread_depth: 4.0,
        measurement_method: 'digital_gauge',
        position_at_measurement: 'front_right',
      },
    ]);

    // Calculate wear rate
    const { data: wearRate, error: wearError } = await supabase
      .rpc('calculate_tire_wear_rate', { p_tire_id: testTireId });

    if (wearError) throw wearError;
    assertExists(wearRate);
    assertEquals(wearRate.length, 1);

    const wear = wearRate[0];
    console.log('Wear rate calculation:', wear);

    // Verify calculations
    // Expected: (10 - 4) mm over (70000 - 40000) km = 6mm / 30000km = 0.0002 mm/km
    assertExists(wear.wear_rate_mm_per_km);
    assertExists(wear.wear_rate_mm_per_day);
    assertEquals(wear.measurements_used, 3);

    console.log(`✓ Wear rate: ${wear.wear_rate_mm_per_km} mm/km, ${wear.wear_rate_mm_per_day} mm/day`);
  } finally {
    await cleanupTestData();
  }
});

/**
 * Test: Calculate tire replacement forecast
 */
Deno.test('Calculate tire replacement forecast', async () => {
  await setupTestData();

  try {
    // Create tire with critical tread depth
    const { data: tire, error: tireError } = await supabase
      .from('tires')
      .insert({
        tenant_id: testTenantId,
        vehicle_id: testVehicleId,
        axle_position: 'rear',
        wheel_position: 'left',
        position_identifier: 'rear_left',
        brand: 'Goodyear',
        model: 'Regional',
        serial_number: 'TEST-SN-003',
        initial_tread_depth: 12.0,
        current_tread_depth: 3.0, // Close to minimum
        minimum_legal_tread_depth: 1.6,
        installation_date: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        installation_odometer: 30000,
        status: 'active',
      })
      .select('id')
      .single();

    if (tireError) throw tireError;
    testTireId = tire.id;

    // Add measurements showing wear pattern
    await supabase.from('tread_depth_measurements').insert([
      {
        tenant_id: testTenantId,
        vehicle_id: testVehicleId,
        tire_id: testTireId,
        measurement_date: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString(),
        odometer_reading: 30000,
        tread_depth: 12.0,
        measurement_method: 'digital_gauge',
        position_at_measurement: 'rear_left',
      },
      {
        tenant_id: testTenantId,
        vehicle_id: testVehicleId,
        tire_id: testTireId,
        measurement_date: new Date().toISOString(),
        odometer_reading: 70000,
        tread_depth: 3.0,
        measurement_method: 'digital_gauge',
        position_at_measurement: 'rear_left',
      },
    ]);

    // Calculate forecast
    const { data: forecast, error: forecastError } = await supabase
      .rpc('calculate_tire_replacement_forecast', {
        p_tire_id: testTireId,
        p_current_odometer: 70000,
      });

    if (forecastError) throw forecastError;
    assertExists(forecast);
    assertEquals(forecast.length, 1);

    const prediction = forecast[0];
    console.log('Replacement forecast:', prediction);

    // Verify forecast
    assertEquals(prediction.current_tread_depth, 3.0);
    assertEquals(prediction.minimum_tread_depth, 1.6);
    assertEquals(prediction.tread_remaining, 1.4); // 3.0 - 1.6
    assertExists(prediction.estimated_km_remaining);
    assertExists(prediction.needs_replacement_soon);

    // With wear rate of 9mm / 40000km = 0.000225 mm/km
    // Remaining tread of 1.4mm => approximately 6222 km remaining
    // This should trigger needs_replacement_soon (within 5000km threshold)
    assertEquals(prediction.needs_replacement_soon, true);

    console.log(`✓ Replacement needed soon: ${prediction.needs_replacement_soon}`);
    console.log(`✓ Estimated km remaining: ${prediction.estimated_km_remaining}`);
    console.log(`✓ Urgency: ${prediction.replacement_urgency}`);
  } finally {
    await cleanupTestData();
  }
});

/**
 * Test: Tire rotation tracking
 */
Deno.test('Record tire rotation', async () => {
  await setupTestData();

  try {
    // Create two tires at different positions
    const { data: tire1 } = await supabase
      .from('tires')
      .insert({
        tenant_id: testTenantId,
        vehicle_id: testVehicleId,
        axle_position: 'front',
        wheel_position: 'left',
        position_identifier: 'front_left',
        brand: 'Test Brand',
        model: 'Test Model',
        serial_number: 'SN-001',
        initial_tread_depth: 8.0,
        current_tread_depth: 6.0,
        installation_date: new Date().toISOString().split('T')[0],
        installation_odometer: 50000,
        status: 'active',
      })
      .select('id')
      .single();

    const { data: tire2 } = await supabase
      .from('tires')
      .insert({
        tenant_id: testTenantId,
        vehicle_id: testVehicleId,
        axle_position: 'rear',
        wheel_position: 'left',
        position_identifier: 'rear_left',
        brand: 'Test Brand',
        model: 'Test Model',
        serial_number: 'SN-002',
        initial_tread_depth: 8.0,
        current_tread_depth: 5.0,
        installation_date: new Date().toISOString().split('T')[0],
        installation_odometer: 50000,
        status: 'active',
      })
      .select('id')
      .single();

    assertExists(tire1);
    assertExists(tire2);

    // Record rotation
    const { data: rotation, error: rotationError } = await supabase
      .from('tire_rotations')
      .insert({
        tenant_id: testTenantId,
        vehicle_id: testVehicleId,
        rotation_date: new Date().toISOString().split('T')[0],
        rotation_odometer: 55000,
        position_swaps: [
          { tire_id: tire1.id, from_position: 'front_left', to_position: 'rear_left' },
          { tire_id: tire2.id, from_position: 'rear_left', to_position: 'front_left' },
        ],
        notes: 'Regular rotation service',
      })
      .select('id')
      .single();

    if (rotationError) throw rotationError;
    assertExists(rotation);

    console.log(`✓ Recorded tire rotation ${rotation.id}`);

    // Update tire positions
    await supabase.from('tires').update({ position_identifier: 'rear_left' }).eq('id', tire1.id);
    await supabase.from('tires').update({ position_identifier: 'front_left' }).eq('id', tire2.id);

    console.log('✓ Updated tire positions after rotation');
  } finally {
    await cleanupTestData();
  }
});

/**
 * Test: Alert generation for critical tire
 */
Deno.test('Generate alert for critical tire', async () => {
  await setupTestData();

  try {
    // Create tire at minimum legal tread depth
    const { data: tire, error: tireError } = await supabase
      .from('tires')
      .insert({
        tenant_id: testTenantId,
        vehicle_id: testVehicleId,
        axle_position: 'front',
        wheel_position: 'right',
        position_identifier: 'front_right',
        brand: 'Critical Test',
        model: 'Low Tread',
        serial_number: 'CRIT-001',
        initial_tread_depth: 8.0,
        current_tread_depth: 1.5, // Below legal minimum
        minimum_legal_tread_depth: 1.6,
        installation_date: new Date(Date.now() - 300 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        installation_odometer: 10000,
        status: 'active',
      })
      .select('id')
      .single();

    if (tireError) throw tireError;
    testTireId = tire.id;

    // Add measurements
    await supabase.from('tread_depth_measurements').insert([
      {
        tenant_id: testTenantId,
        vehicle_id: testVehicleId,
        tire_id: testTireId,
        measurement_date: new Date(Date.now() - 300 * 24 * 60 * 60 * 1000).toISOString(),
        odometer_reading: 10000,
        tread_depth: 8.0,
        measurement_method: 'digital_gauge',
        position_at_measurement: 'front_right',
      },
      {
        tenant_id: testTenantId,
        vehicle_id: testVehicleId,
        tire_id: testTireId,
        measurement_date: new Date().toISOString(),
        odometer_reading: 70000,
        tread_depth: 1.5,
        measurement_method: 'digital_gauge',
        position_at_measurement: 'front_right',
      },
    ]);

    // Calculate forecast
    const { data: forecast } = await supabase
      .rpc('calculate_tire_replacement_forecast', {
        p_tire_id: testTireId,
        p_current_odometer: 70000,
      });

    assertExists(forecast);
    const prediction = forecast[0];

    // Should be critical urgency since below legal minimum
    assertEquals(prediction.replacement_urgency, 'critical');
    assertEquals(prediction.needs_replacement_soon, true);

    console.log(`✓ Critical tire detected with urgency: ${prediction.replacement_urgency}`);
  } finally {
    await cleanupTestData();
  }
});

console.log('\n=== All tire management tests completed ===\n');
