/**
 * Test Suite for Document Expiry Checker Edge Function
 * 
 * Tests the document expiry checking and alert generation logic
 */

import { assertEquals, assertExists } from 'https://deno.land/std@0.192.0/testing/asserts.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// ============================================================================
// Test Configuration
// ============================================================================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'http://localhost:54321';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Create a test Supabase client
 */
function createTestClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Clean up test data
 */
async function cleanupTestData(
  supabase: SupabaseClient,
  tenantId: string,
  vehicleId: string
): Promise<void> {
  // Delete test alerts
  await supabase
    .from('alerts')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('vehicle_id', vehicleId);

  // Delete test documents
  await supabase
    .from('documents')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('vehicle_id', vehicleId);
}

/**
 * Create test document
 */
async function createTestDocument(
  supabase: SupabaseClient,
  tenantId: string,
  vehicleId: string,
  userId: string,
  documentType: string,
  expiryDate: string
): Promise<string> {
  const { data, error } = await supabase
    .from('documents')
    .insert({
      tenant_id: tenantId,
      vehicle_id: vehicleId,
      document_type: documentType,
      file_name: `test-${documentType}.pdf`,
      file_url: `https://storage.supabase.co/test/${documentType}.pdf`,
      file_size: 1024000,
      expiry_date: expiryDate,
      uploaded_by: userId,
    })
    .select('id')
    .single();

  if (error) {
    throw error;
  }

  return data.id;
}

/**
 * Get alert count for a vehicle
 */
async function getAlertCount(
  supabase: SupabaseClient,
  tenantId: string,
  vehicleId: string,
  alertType: string
): Promise<number> {
  const { count, error } = await supabase
    .from('alerts')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('vehicle_id', vehicleId)
    .eq('alert_type', alertType)
    .eq('status', 'active');

  if (error) {
    throw error;
  }

  return count || 0;
}

/**
 * Invoke the document-expiry-checker function
 */
async function invokeFunctionManually(supabase: SupabaseClient): Promise<any> {
  // Since we're testing locally, we'll directly execute the logic
  // In production, you would use: supabase.functions.invoke('document-expiry-checker')
  
  const response = await fetch(`${SUPABASE_URL}/functions/v1/document-expiry-checker`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  return await response.json();
}

// ============================================================================
// Test Cases
// ============================================================================

Deno.test('Document Expiry Checker - Expiring Document Alert', async () => {
  const supabase = createTestClient();
  
  // Test data
  const tenantId = '00000000-0000-0000-0000-000000000001';
  const vehicleId = '00000000-0000-0000-0000-000000000002';
  const userId = '00000000-0000-0000-0000-000000000003';
  
  try {
    // Clean up any existing test data
    await cleanupTestData(supabase, tenantId, vehicleId);
    
    // Create a document expiring in 15 days
    const today = new Date();
    const expiryDate = new Date(today);
    expiryDate.setDate(expiryDate.getDate() + 15);
    
    const documentId = await createTestDocument(
      supabase,
      tenantId,
      vehicleId,
      userId,
      'insurance',
      expiryDate.toISOString().split('T')[0]
    );
    
    assertExists(documentId, 'Test document should be created');
    
    // Invoke the function
    const result = await invokeFunctionManually(supabase);
    
    assertEquals(result.success, true, 'Function should execute successfully');
    
    // Check that an expiry warning alert was created
    const alertCount = await getAlertCount(supabase, tenantId, vehicleId, 'document_expiry');
    
    assertEquals(alertCount >= 1, true, 'At least one expiry warning alert should be created');
    
  } finally {
    // Clean up test data
    await cleanupTestData(supabase, tenantId, vehicleId);
  }
});

Deno.test('Document Expiry Checker - Expired Document Alert', async () => {
  const supabase = createTestClient();
  
  // Test data
  const tenantId = '00000000-0000-0000-0000-000000000001';
  const vehicleId = '00000000-0000-0000-0000-000000000002';
  const userId = '00000000-0000-0000-0000-000000000003';
  
  try {
    // Clean up any existing test data
    await cleanupTestData(supabase, tenantId, vehicleId);
    
    // Create a document that expired 5 days ago
    const today = new Date();
    const expiryDate = new Date(today);
    expiryDate.setDate(expiryDate.getDate() - 5);
    
    const documentId = await createTestDocument(
      supabase,
      tenantId,
      vehicleId,
      userId,
      'fitness_certificate',
      expiryDate.toISOString().split('T')[0]
    );
    
    assertExists(documentId, 'Test document should be created');
    
    // Invoke the function
    const result = await invokeFunctionManually(supabase);
    
    assertEquals(result.success, true, 'Function should execute successfully');
    
    // Check that an expired document alert was created
    const alertCount = await getAlertCount(supabase, tenantId, vehicleId, 'document_expired');
    
    assertEquals(alertCount >= 1, true, 'At least one expired document alert should be created');
    
  } finally {
    // Clean up test data
    await cleanupTestData(supabase, tenantId, vehicleId);
  }
});

Deno.test('Document Expiry Checker - No Duplicate Alerts', async () => {
  const supabase = createTestClient();
  
  // Test data
  const tenantId = '00000000-0000-0000-0000-000000000001';
  const vehicleId = '00000000-0000-0000-0000-000000000002';
  const userId = '00000000-0000-0000-0000-000000000003';
  
  try {
    // Clean up any existing test data
    await cleanupTestData(supabase, tenantId, vehicleId);
    
    // Create a document expiring in 15 days
    const today = new Date();
    const expiryDate = new Date(today);
    expiryDate.setDate(expiryDate.getDate() + 15);
    
    await createTestDocument(
      supabase,
      tenantId,
      vehicleId,
      userId,
      'pollution_certificate',
      expiryDate.toISOString().split('T')[0]
    );
    
    // Invoke the function first time
    await invokeFunctionManually(supabase);
    
    const alertCountBefore = await getAlertCount(supabase, tenantId, vehicleId, 'document_expiry');
    
    // Invoke the function second time (should not create duplicate alerts)
    await invokeFunctionManually(supabase);
    
    const alertCountAfter = await getAlertCount(supabase, tenantId, vehicleId, 'document_expiry');
    
    assertEquals(
      alertCountBefore,
      alertCountAfter,
      'Alert count should not increase on second invocation (no duplicates)'
    );
    
  } finally {
    // Clean up test data
    await cleanupTestData(supabase, tenantId, vehicleId);
  }
});

Deno.test('Document Expiry Checker - No Alert for Future Documents', async () => {
  const supabase = createTestClient();
  
  // Test data
  const tenantId = '00000000-0000-0000-0000-000000000001';
  const vehicleId = '00000000-0000-0000-0000-000000000002';
  const userId = '00000000-0000-0000-0000-000000000003';
  
  try {
    // Clean up any existing test data
    await cleanupTestData(supabase, tenantId, vehicleId);
    
    // Create a document expiring in 60 days (beyond 30-day warning period)
    const today = new Date();
    const expiryDate = new Date(today);
    expiryDate.setDate(expiryDate.getDate() + 60);
    
    await createTestDocument(
      supabase,
      tenantId,
      vehicleId,
      userId,
      'warranty',
      expiryDate.toISOString().split('T')[0]
    );
    
    // Invoke the function
    await invokeFunctionManually(supabase);
    
    // Check that no alert was created
    const alertCount = await getAlertCount(supabase, tenantId, vehicleId, 'document_expiry');
    
    assertEquals(alertCount, 0, 'No alert should be created for documents expiring beyond 30 days');
    
  } finally {
    // Clean up test data
    await cleanupTestData(supabase, tenantId, vehicleId);
  }
});

Deno.test('Document Expiry Checker - Multiple Document Types', async () => {
  const supabase = createTestClient();
  
  // Test data
  const tenantId = '00000000-0000-0000-0000-000000000001';
  const vehicleId = '00000000-0000-0000-0000-000000000002';
  const userId = '00000000-0000-0000-0000-000000000003';
  
  try {
    // Clean up any existing test data
    await cleanupTestData(supabase, tenantId, vehicleId);
    
    const today = new Date();
    
    // Create multiple documents with different expiry dates
    const expiryDate1 = new Date(today);
    expiryDate1.setDate(expiryDate1.getDate() + 10);
    await createTestDocument(
      supabase,
      tenantId,
      vehicleId,
      userId,
      'insurance',
      expiryDate1.toISOString().split('T')[0]
    );
    
    const expiryDate2 = new Date(today);
    expiryDate2.setDate(expiryDate2.getDate() + 20);
    await createTestDocument(
      supabase,
      tenantId,
      vehicleId,
      userId,
      'rc_book',
      expiryDate2.toISOString().split('T')[0]
    );
    
    const expiryDate3 = new Date(today);
    expiryDate3.setDate(expiryDate3.getDate() - 3);
    await createTestDocument(
      supabase,
      tenantId,
      vehicleId,
      userId,
      'fitness_certificate',
      expiryDate3.toISOString().split('T')[0]
    );
    
    // Invoke the function
    const result = await invokeFunctionManually(supabase);
    
    assertEquals(result.success, true, 'Function should execute successfully');
    
    // Check that multiple alerts were created
    const expiryAlertCount = await getAlertCount(supabase, tenantId, vehicleId, 'document_expiry');
    const expiredAlertCount = await getAlertCount(supabase, tenantId, vehicleId, 'document_expired');
    
    assertEquals(expiryAlertCount >= 2, true, 'At least 2 expiry warning alerts should be created');
    assertEquals(expiredAlertCount >= 1, true, 'At least 1 expired document alert should be created');
    
  } finally {
    // Clean up test data
    await cleanupTestData(supabase, tenantId, vehicleId);
  }
});

// ============================================================================
// Run Tests
// ============================================================================

console.log('Running Document Expiry Checker tests...');
console.log('Make sure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in environment');
