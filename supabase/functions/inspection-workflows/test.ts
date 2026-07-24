/**
 * Test script for inspection-workflows Edge Function
 * 
 * Tests:
 * 1. Load checklist by vehicle type
 * 2. Submit inspection with validation
 * 3. Calculate inspection status
 * 4. Non-compliant item validation
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'http://localhost:54321';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/inspection-workflows`;

// Test credentials
const TEST_EMAIL = 'test-driver@fleetguard.com';
const TEST_PASSWORD = 'TestPass123!@#';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

const results: TestResult[] = [];

function addResult(name: string, passed: boolean, message: string) {
  results.push({ name, passed, message });
  console.log(`${passed ? '✅' : '❌'} ${name}: ${message}`);
}

async function runTests() {
  console.log('🚀 Starting Inspection Workflows Edge Function Tests\n');

  let authToken = '';
  let tenantId = '';
  let vehicleId = '';
  let checklistId = '';
  let userId = '';

  try {
    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Test 1: Setup - Create test user and authenticate
    console.log('\n📋 Test 1: Setup and Authentication');
    try {
      // Try to sign in first
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });

      if (signInError) {
        // If user doesn't exist, create it
        console.log('Creating test user...');
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: TEST_EMAIL,
          password: TEST_PASSWORD,
        });

        if (signUpError) throw signUpError;
        authToken = signUpData.session?.access_token || '';
        userId = signUpData.user?.id || '';
      } else {
        authToken = signInData.session?.access_token || '';
        userId = signInData.user?.id || '';
      }

      addResult('Authentication', !!authToken, 'User authenticated successfully');
    } catch (error) {
      addResult('Authentication', false, `Failed: ${error.message}`);
      throw error;
    }

    // Test 2: Setup - Get or create test data
    console.log('\n📋 Test 2: Setup Test Data');
    try {
      // Get tenant
      const { data: userData } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', userId)
        .single();

      tenantId = userData?.tenant_id || '';

      if (!tenantId) {
        throw new Error('No tenant found for user');
      }

      // Get or create test vehicle
      const { data: vehicles } = await supabase
        .from('vehicles')
        .select('id, vehicle_type')
        .eq('tenant_id', tenantId)
        .limit(1);

      if (vehicles && vehicles.length > 0) {
        vehicleId = vehicles[0].id;
      } else {
        // Create test vehicle
        const { data: newVehicle, error: vehicleError } = await supabase
          .from('vehicles')
          .insert({
            tenant_id: tenantId,
            vin: 'TEST-VIN-' + Date.now(),
            make: 'Test Make',
            model: 'Test Model',
            year: 2023,
            vehicle_type: 'bus',
            current_odometer: 100000,
          })
          .select()
          .single();

        if (vehicleError) throw vehicleError;
        vehicleId = newVehicle.id;
      }

      // Get or create test checklist
      const { data: checklists } = await supabase
        .from('inspection_checklists')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .limit(1);

      if (checklists && checklists.length > 0) {
        checklistId = checklists[0].id;
      } else {
        // Create test checklist
        const testChecklistItems = [
          {
            id: 'brake_system',
            item_name: 'Brake System',
            item_type: 'pass_fail',
            is_required: true,
            is_critical: true,
          },
          {
            id: 'tire_condition',
            item_name: 'Tire Condition',
            item_type: 'yes_no',
            is_required: true,
            is_critical: false,
          },
          {
            id: 'tire_pressure',
            item_name: 'Tire Pressure (PSI)',
            item_type: 'numeric',
            is_required: false,
            is_critical: false,
          },
          {
            id: 'damage_photo',
            item_name: 'Damage Documentation',
            item_type: 'photo',
            is_required: false,
            is_critical: false,
          },
        ];

        const { data: newChecklist, error: checklistError } = await supabase
          .from('inspection_checklists')
          .insert({
            tenant_id: tenantId,
            checklist_name: 'Test Bus Inspection',
            description: 'Test inspection checklist',
            vehicle_type: 'bus',
            checklist_items: testChecklistItems,
            is_active: true,
            created_by: userId,
          })
          .select()
          .single();

        if (checklistError) throw checklistError;
        checklistId = newChecklist.id;
      }

      addResult('Setup Test Data', true, `Vehicle: ${vehicleId}, Checklist: ${checklistId}`);
    } catch (error) {
      addResult('Setup Test Data', false, `Failed: ${error.message}`);
      throw error;
    }

    // Test 3: Load checklist by vehicle type
    console.log('\n📋 Test 3: Load Checklist by Vehicle Type');
    try {
      const response = await fetch(
        `${FUNCTION_URL}/load-checklist?vehicle_id=${vehicleId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok && data.success && data.checklist) {
        addResult('Load Checklist', true, `Loaded checklist: ${data.checklist.checklist_name}`);
      } else {
        addResult('Load Checklist', false, `Failed: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      addResult('Load Checklist', false, `Error: ${error.message}`);
    }

    // Test 4: Calculate status (all pass)
    console.log('\n📋 Test 4: Calculate Status - All Pass');
    try {
      const allPassResults = [
        {
          item_id: 'brake_system',
          result: 'pass',
          notes: 'Brakes working well',
        },
        {
          item_id: 'tire_condition',
          result: 'yes',
          notes: 'Tires in good condition',
        },
      ];

      const response = await fetch(`${FUNCTION_URL}/calculate-status`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          checklist_id: checklistId,
          checklist_results: allPassResults,
        }),
      });

      const data = await response.json();

      if (response.ok && data.overall_status === 'pass') {
        addResult('Calculate Status - All Pass', true, `Status: ${data.overall_status}, Defects: ${data.defects_reported}`);
      } else {
        addResult('Calculate Status - All Pass', false, `Expected 'pass', got: ${data.overall_status}`);
      }
    } catch (error) {
      addResult('Calculate Status - All Pass', false, `Error: ${error.message}`);
    }

    // Test 5: Calculate status (with warning)
    console.log('\n📋 Test 5: Calculate Status - With Warning');
    try {
      const warningResults = [
        {
          item_id: 'brake_system',
          result: 'pass',
          notes: 'Brakes working well',
        },
        {
          item_id: 'tire_condition',
          result: 'no',
          notes: 'Tire tread is low',
        },
      ];

      const response = await fetch(`${FUNCTION_URL}/calculate-status`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          checklist_id: checklistId,
          checklist_results: warningResults,
        }),
      });

      const data = await response.json();

      if (response.ok && data.overall_status === 'warning' && data.defects_reported === 1) {
        addResult('Calculate Status - Warning', true, `Status: ${data.overall_status}, Defects: ${data.defects_reported}`);
      } else {
        addResult('Calculate Status - Warning', false, `Expected 'warning' with 1 defect, got: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      addResult('Calculate Status - Warning', false, `Error: ${error.message}`);
    }

    // Test 6: Calculate status (critical failure)
    console.log('\n📋 Test 6: Calculate Status - Critical Failure');
    try {
      const failResults = [
        {
          item_id: 'brake_system',
          result: 'fail',
          notes: 'Brakes are not functioning properly',
        },
        {
          item_id: 'tire_condition',
          result: 'yes',
          notes: 'Tires OK',
        },
      ];

      const response = await fetch(`${FUNCTION_URL}/calculate-status`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          checklist_id: checklistId,
          checklist_results: failResults,
        }),
      });

      const data = await response.json();

      if (response.ok && data.overall_status === 'fail' && data.defects_reported === 1) {
        addResult('Calculate Status - Critical Failure', true, `Status: ${data.overall_status}, Defects: ${data.defects_reported}`);
      } else {
        addResult('Calculate Status - Critical Failure', false, `Expected 'fail' with 1 defect, got: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      addResult('Calculate Status - Critical Failure', false, `Error: ${error.message}`);
    }

    // Test 7: Validation - missing description for non-compliant item
    console.log('\n📋 Test 7: Validation - Missing Description');
    try {
      const invalidResults = [
        {
          item_id: 'brake_system',
          result: 'pass',
          notes: 'OK',
        },
        {
          item_id: 'tire_condition',
          result: 'no', // Non-compliant
          notes: '', // Missing description - should fail validation
        },
      ];

      const response = await fetch(`${FUNCTION_URL}/calculate-status`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          checklist_id: checklistId,
          checklist_results: invalidResults,
        }),
      });

      const data = await response.json();

      if (response.ok && data.validation_errors && data.validation_errors.length > 0) {
        addResult('Validation - Missing Description', true, `Validation error caught: ${data.validation_errors[0]}`);
      } else {
        addResult('Validation - Missing Description', false, 'Should have validation error for missing description');
      }
    } catch (error) {
      addResult('Validation - Missing Description', false, `Error: ${error.message}`);
    }

    // Test 8: Submit inspection successfully
    console.log('\n📋 Test 8: Submit Inspection - Success');
    try {
      const validResults = [
        {
          item_id: 'brake_system',
          result: 'pass',
          notes: 'Brakes functioning properly',
        },
        {
          item_id: 'tire_condition',
          result: 'yes',
          notes: 'All tires in good condition',
        },
        {
          item_id: 'tire_pressure',
          result: 32,
          notes: 'Average tire pressure',
        },
      ];

      const response = await fetch(`${FUNCTION_URL}/submit-inspection`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vehicle_id: vehicleId,
          checklist_id: checklistId,
          odometer_reading: 125000,
          checklist_results: validResults,
          notes: 'Overall vehicle condition is good',
        }),
      });

      const data = await response.json();

      if (response.ok && data.success && data.inspection) {
        addResult('Submit Inspection - Success', true, `Inspection created: ${data.inspection.id}, Status: ${data.inspection.overall_status}`);
      } else {
        addResult('Submit Inspection - Success', false, `Failed: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      addResult('Submit Inspection - Success', false, `Error: ${error.message}`);
    }

    // Test 9: Submit inspection with validation error
    console.log('\n📋 Test 9: Submit Inspection - Validation Error');
    try {
      const invalidResults = [
        {
          item_id: 'brake_system',
          result: 'fail', // Non-compliant
          notes: '', // Missing description
        },
      ];

      const response = await fetch(`${FUNCTION_URL}/submit-inspection`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vehicle_id: vehicleId,
          checklist_id: checklistId,
          odometer_reading: 125050,
          checklist_results: invalidResults,
        }),
      });

      const data = await response.json();

      if (!response.ok && data.error === 'Validation failed' && data.validation_errors) {
        addResult('Submit Inspection - Validation Error', true, `Validation error caught correctly`);
      } else {
        addResult('Submit Inspection - Validation Error', false, 'Should have failed validation');
      }
    } catch (error) {
      addResult('Submit Inspection - Validation Error', false, `Error: ${error.message}`);
    }

  } catch (error) {
    console.error('❌ Fatal error during tests:', error);
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const percentage = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0';

  console.log(`\nTotal Tests: ${total}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${total - passed} ❌`);
  console.log(`Success Rate: ${percentage}%`);

  if (passed === total) {
    console.log('\n🎉 All tests passed!');
  } else {
    console.log('\n⚠️  Some tests failed. Review the output above.');
    console.log('\nFailed tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  ❌ ${r.name}: ${r.message}`);
    });
  }

  Deno.exit(passed === total ? 0 : 1);
}

// Run tests
runTests();
