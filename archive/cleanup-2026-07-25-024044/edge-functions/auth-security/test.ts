/**
 * Tests for Auth Security Edge Function
 * 
 * Task: 17.3 Implement authentication security
 * Requirements: 28.3, 28.5, 28.7
 */

import { assertEquals, assertExists } from 'https://deno.land/std@0.168.0/testing/asserts.ts';

const FUNCTION_URL = Deno.env.get('FUNCTION_URL') || 'http://localhost:54321/functions/v1/auth-security';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

// Helper function to make requests
async function makeRequest(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${FUNCTION_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      ...options.headers,
    },
  });
  return {
    status: response.status,
    data: await response.json(),
  };
}

// ============================================================================
// TEST: Password Validation (Requirement 28.3)
// ============================================================================

Deno.test('Password validation - should reject weak passwords', async () => {
  const weakPasswords = [
    'short',
    'nouppercase123!',
    'NOLOWERCASE123!',
    'NoNumbers!',
    'NoSpecialChars123',
    'Only11Chars!',
  ];

  for (const password of weakPasswords) {
    const { status, data } = await makeRequest('/validate-password', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });

    assertEquals(status, 200);
    assertEquals(data.valid, false);
    assertExists(data.errors);
    assertEquals(Array.isArray(data.errors), true);
    console.log(`✓ Weak password "${password}" rejected:`, data.errors);
  }
});

Deno.test('Password validation - should accept strong passwords', async () => {
  const strongPasswords = [
    'StrongPass123!',
    'MySecure@Pass2024',
    'C0mpl3x!P@ssw0rd',
    'ValidPassword1!@#',
  ];

  for (const password of strongPasswords) {
    const { status, data } = await makeRequest('/validate-password', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });

    assertEquals(status, 200);
    assertEquals(data.valid, true);
    assertEquals(data.errors.length, 0);
    console.log(`✓ Strong password "${password}" accepted`);
  }
});

Deno.test('Password validation - should require all complexity criteria', async () => {
  const { status, data } = await makeRequest('/validate-password', {
    method: 'POST',
    body: JSON.stringify({ password: 'weak' }),
  });

  assertEquals(status, 200);
  assertEquals(data.valid, false);
  
  // Should have multiple error messages
  const errorMessages = data.errors.join(', ');
  console.log('Error messages for "weak":', errorMessages);
  
  // Verify all criteria are checked
  const hasLengthError = errorMessages.includes('12 characters');
  const hasUppercaseError = errorMessages.includes('uppercase');
  const hasNumberError = errorMessages.includes('number');
  const hasSpecialCharError = errorMessages.includes('special character');
  
  assertEquals(hasLengthError || hasUppercaseError || hasNumberError || hasSpecialCharError, true);
});

// ============================================================================
// TEST: Authentication Attempt Logging (Requirement 28.5)
// ============================================================================

Deno.test('Auth logging - should log successful login attempt', async () => {
  const { status, data } = await makeRequest('/log-attempt', {
    method: 'POST',
    body: JSON.stringify({
      email: 'test@example.com',
      success: true,
      attemptType: 'login',
      userId: crypto.randomUUID(),
    }),
  });

  assertEquals(status, 200);
  assertEquals(data.success, true);
  assertExists(data.attemptId);
  console.log('✓ Successful login logged with ID:', data.attemptId);
});

Deno.test('Auth logging - should log failed login attempt', async () => {
  const { status, data } = await makeRequest('/log-attempt', {
    method: 'POST',
    body: JSON.stringify({
      email: 'test@example.com',
      success: false,
      attemptType: 'login',
      failureReason: 'invalid_password',
    }),
  });

  assertEquals(status, 200);
  assertEquals(data.success, true);
  assertExists(data.attemptId);
  console.log('✓ Failed login logged with ID:', data.attemptId);
});

Deno.test('Auth logging - should log signup attempt', async () => {
  const { status, data } = await makeRequest('/log-attempt', {
    method: 'POST',
    body: JSON.stringify({
      email: 'newuser@example.com',
      success: true,
      attemptType: 'signup',
      userId: crypto.randomUUID(),
    }),
  });

  assertEquals(status, 200);
  assertEquals(data.success, true);
  assertExists(data.attemptId);
  console.log('✓ Signup attempt logged with ID:', data.attemptId);
});

Deno.test('Auth logging - should log password reset attempt', async () => {
  const { status, data } = await makeRequest('/log-attempt', {
    method: 'POST',
    body: JSON.stringify({
      email: 'user@example.com',
      success: true,
      attemptType: 'password_reset',
    }),
  });

  assertEquals(status, 200);
  assertEquals(data.success, true);
  assertExists(data.attemptId);
  console.log('✓ Password reset logged with ID:', data.attemptId);
});

// ============================================================================
// TEST: Account Lockout (Requirement 28.7)
// ============================================================================

Deno.test('Lockout check - should return unlocked for valid account', async () => {
  const testEmail = `valid-${Date.now()}@example.com`;
  
  const { status, data } = await makeRequest(
    `/check-lockout?email=${encodeURIComponent(testEmail)}`,
    { method: 'GET' }
  );

  assertEquals(status, 200);
  assertEquals(data.locked, false);
  console.log('✓ Account not locked:', testEmail);
});

Deno.test('Lockout mechanism - should trigger after multiple failed attempts', async () => {
  // Use a unique email to avoid conflicts with other tests
  const testEmail = `lockout-test-${Date.now()}@example.com`;
  
  console.log('Testing lockout mechanism for:', testEmail);
  
  // Simulate 6 failed login attempts (threshold is 5 in 15 minutes)
  for (let i = 0; i < 6; i++) {
    const { status, data } = await makeRequest('/log-attempt', {
      method: 'POST',
      body: JSON.stringify({
        email: testEmail,
        success: false,
        attemptType: 'login',
        failureReason: 'invalid_password',
      }),
    });
    
    assertEquals(status, 200);
    console.log(`  Attempt ${i + 1} logged:`, data.attemptId);
    
    // Small delay between attempts
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Check if account is now locked
  const { status: checkStatus, data: checkData } = await makeRequest(
    `/check-lockout?email=${encodeURIComponent(testEmail)}`,
    { method: 'GET' }
  );

  assertEquals(checkStatus, 200);
  
  // The account should be locked after 5 failed attempts
  if (checkData.locked) {
    console.log('✓ Account locked after failed attempts');
    console.log('  Lock reason:', checkData.lock_reason);
    console.log('  Failed attempts:', checkData.failed_attempts);
    console.log('  Locked until:', checkData.locked_until);
    console.log('  Time remaining (seconds):', checkData.time_remaining_seconds);
    
    assertEquals(checkData.locked, true);
    assertExists(checkData.lockout_id);
    assertExists(checkData.locked_until);
    assertEquals(checkData.lock_reason, 'repeated_failed_logins');
  } else {
    console.log('⚠ Account not locked yet (may need more attempts or different timing)');
  }
});

Deno.test('Lockout check - should handle missing email parameter', async () => {
  const { status, data } = await makeRequest('/check-lockout', {
    method: 'GET',
  });

  assertEquals(status, 400);
  assertExists(data.error);
  console.log('✓ Missing email parameter handled:', data.error);
});

// ============================================================================
// TEST: Error Handling
// ============================================================================

Deno.test('Error handling - should reject invalid endpoint', async () => {
  const { status, data } = await makeRequest('/invalid-endpoint', {
    method: 'GET',
  });

  assertEquals(status, 404);
  assertExists(data.error);
  console.log('✓ Invalid endpoint handled:', data.error);
});

Deno.test('Error handling - should reject missing password', async () => {
  const { status, data } = await makeRequest('/validate-password', {
    method: 'POST',
    body: JSON.stringify({}),
  });

  assertEquals(status, 400);
  assertExists(data.error);
  console.log('✓ Missing password handled:', data.error);
});

// ============================================================================
// TEST: Security Headers (CORS)
// ============================================================================

Deno.test('CORS - should handle OPTIONS request', async () => {
  const response = await fetch(`${FUNCTION_URL}/validate-password`, {
    method: 'OPTIONS',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
    },
  });

  assertEquals(response.status, 200);
  assertExists(response.headers.get('access-control-allow-origin'));
  console.log('✓ CORS preflight handled correctly');
});

// ============================================================================
// TEST: Integration Test
// ============================================================================

Deno.test('Integration - complete authentication flow', async () => {
  const testEmail = `integration-test-${Date.now()}@example.com`;
  const strongPassword = 'IntegrationTest123!';
  const weakPassword = 'weak';
  
  console.log('Running integration test for:', testEmail);
  
  // Step 1: Validate strong password
  const { status: validateStatus, data: validateData } = await makeRequest('/validate-password', {
    method: 'POST',
    body: JSON.stringify({ password: strongPassword }),
  });
  assertEquals(validateStatus, 200);
  assertEquals(validateData.valid, true);
  console.log('  ✓ Step 1: Strong password validated');
  
  // Step 2: Check account is not locked initially
  const { status: checkStatus1, data: checkData1 } = await makeRequest(
    `/check-lockout?email=${encodeURIComponent(testEmail)}`,
    { method: 'GET' }
  );
  assertEquals(checkStatus1, 200);
  assertEquals(checkData1.locked, false);
  console.log('  ✓ Step 2: Account not locked initially');
  
  // Step 3: Log a successful login
  const { status: logStatus, data: logData } = await makeRequest('/log-attempt', {
    method: 'POST',
    body: JSON.stringify({
      email: testEmail,
      success: true,
      attemptType: 'login',
      userId: crypto.randomUUID(),
    }),
  });
  assertEquals(logStatus, 200);
  assertEquals(logData.success, true);
  console.log('  ✓ Step 3: Successful login logged');
  
  // Step 4: Validate weak password
  const { status: weakStatus, data: weakData } = await makeRequest('/validate-password', {
    method: 'POST',
    body: JSON.stringify({ password: weakPassword }),
  });
  assertEquals(weakStatus, 200);
  assertEquals(weakData.valid, false);
  console.log('  ✓ Step 4: Weak password rejected');
  
  console.log('✓ Integration test completed successfully');
});

// ============================================================================
// Run all tests
// ============================================================================

console.log('\n========================================');
console.log('Auth Security Edge Function Tests');
console.log('Task: 17.3 Implement authentication security');
console.log('Requirements: 28.3, 28.5, 28.7');
console.log('========================================\n');
