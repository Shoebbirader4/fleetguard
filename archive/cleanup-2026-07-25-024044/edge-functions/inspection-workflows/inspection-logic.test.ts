/**
 * Unit tests for inspection workflow business logic
 * 
 * Tests the core logic functions without requiring a running Edge Function
 */

import { assertEquals, assertExists } from 'https://deno.land/std@0.168.0/testing/asserts.ts';

interface ChecklistItem {
  id: string;
  item_name: string;
  item_type: 'yes_no' | 'pass_fail' | 'numeric' | 'text' | 'photo';
  is_required: boolean;
  is_critical?: boolean;
  default_value?: any;
  options?: any;
}

interface ChecklistResult {
  item_id: string;
  result: any;
  notes?: string;
  photo_urls?: string[];
}

interface InspectionStatusCalculation {
  overall_status: 'pass' | 'fail' | 'warning';
  defects_reported: number;
  errors: string[];
}

// Copy of the logic functions from index.ts for testing
function calculateInspectionStatus(
  checklistItems: ChecklistItem[],
  results: ChecklistResult[]
): InspectionStatusCalculation {
  const errors: string[] = [];
  let defectsReported = 0;
  let hasCriticalFailure = false;
  let hasWarning = false;

  const resultMap = new Map(results.map(r => [r.item_id, r]));

  for (const item of checklistItems) {
    const result = resultMap.get(item.id);

    if (item.is_required && !result) {
      errors.push(`Required item "${item.item_name}" is missing`);
      continue;
    }

    if (!result) {
      continue;
    }

    const isNonCompliant = isItemNonCompliant(item, result);

    if (isNonCompliant) {
      defectsReported++;

      if (!result.notes || result.notes.trim() === '') {
        errors.push(`Non-compliant item "${item.item_name}" requires a description`);
      }

      if (item.is_critical) {
        hasCriticalFailure = true;
      } else {
        hasWarning = true;
      }
    }
  }

  let overall_status: 'pass' | 'fail' | 'warning' = 'pass';
  
  if (hasCriticalFailure) {
    overall_status = 'fail';
  } else if (hasWarning || defectsReported > 0) {
    overall_status = 'warning';
  }

  return {
    overall_status,
    defects_reported: defectsReported,
    errors,
  };
}

function isItemNonCompliant(item: ChecklistItem, result: ChecklistResult): boolean {
  switch (item.item_type) {
    case 'yes_no':
      return result.result === 'no' || result.result === false;
    
    case 'pass_fail':
      return result.result === 'fail' || result.result === false;
    
    case 'numeric':
      return false;
    
    case 'text':
      return false;
    
    case 'photo':
      return !result.photo_urls || result.photo_urls.length === 0;
    
    default:
      return false;
  }
}

// Test: All items pass
Deno.test('Inspection Status - All Pass', () => {
  const items: ChecklistItem[] = [
    {
      id: '1',
      item_name: 'Brakes',
      item_type: 'pass_fail',
      is_required: true,
      is_critical: true,
    },
    {
      id: '2',
      item_name: 'Tires',
      item_type: 'yes_no',
      is_required: true,
      is_critical: false,
    },
  ];

  const results: ChecklistResult[] = [
    { item_id: '1', result: 'pass', notes: 'OK' },
    { item_id: '2', result: 'yes', notes: 'Good' },
  ];

  const status = calculateInspectionStatus(items, results);

  assertEquals(status.overall_status, 'pass');
  assertEquals(status.defects_reported, 0);
  assertEquals(status.errors.length, 0);
});

// Test: Critical item fails
Deno.test('Inspection Status - Critical Failure', () => {
  const items: ChecklistItem[] = [
    {
      id: '1',
      item_name: 'Brakes',
      item_type: 'pass_fail',
      is_required: true,
      is_critical: true,
    },
    {
      id: '2',
      item_name: 'Tires',
      item_type: 'yes_no',
      is_required: true,
      is_critical: false,
    },
  ];

  const results: ChecklistResult[] = [
    { item_id: '1', result: 'fail', notes: 'Brakes not working' },
    { item_id: '2', result: 'yes', notes: 'Good' },
  ];

  const status = calculateInspectionStatus(items, results);

  assertEquals(status.overall_status, 'fail');
  assertEquals(status.defects_reported, 1);
  assertEquals(status.errors.length, 0);
});

// Test: Non-critical item fails (warning)
Deno.test('Inspection Status - Warning', () => {
  const items: ChecklistItem[] = [
    {
      id: '1',
      item_name: 'Brakes',
      item_type: 'pass_fail',
      is_required: true,
      is_critical: true,
    },
    {
      id: '2',
      item_name: 'Tires',
      item_type: 'yes_no',
      is_required: true,
      is_critical: false,
    },
  ];

  const results: ChecklistResult[] = [
    { item_id: '1', result: 'pass', notes: 'OK' },
    { item_id: '2', result: 'no', notes: 'Tread is low' },
  ];

  const status = calculateInspectionStatus(items, results);

  assertEquals(status.overall_status, 'warning');
  assertEquals(status.defects_reported, 1);
  assertEquals(status.errors.length, 0);
});

// Test: Missing required item
Deno.test('Validation - Missing Required Item', () => {
  const items: ChecklistItem[] = [
    {
      id: '1',
      item_name: 'Brakes',
      item_type: 'pass_fail',
      is_required: true,
      is_critical: true,
    },
    {
      id: '2',
      item_name: 'Tires',
      item_type: 'yes_no',
      is_required: true,
      is_critical: false,
    },
  ];

  const results: ChecklistResult[] = [
    { item_id: '1', result: 'pass', notes: 'OK' },
    // Missing item 2
  ];

  const status = calculateInspectionStatus(items, results);

  assertEquals(status.errors.length, 1);
  assertEquals(status.errors[0], 'Required item "Tires" is missing');
});

// Test: Non-compliant item missing description
Deno.test('Validation - Non-compliant Missing Description', () => {
  const items: ChecklistItem[] = [
    {
      id: '1',
      item_name: 'Brakes',
      item_type: 'pass_fail',
      is_required: true,
      is_critical: true,
    },
  ];

  const results: ChecklistResult[] = [
    { item_id: '1', result: 'fail', notes: '' }, // Missing notes
  ];

  const status = calculateInspectionStatus(items, results);

  assertEquals(status.errors.length, 1);
  assertEquals(status.errors[0], 'Non-compliant item "Brakes" requires a description');
  assertEquals(status.defects_reported, 1);
});

// Test: Non-compliant item with whitespace-only description
Deno.test('Validation - Non-compliant Whitespace Description', () => {
  const items: ChecklistItem[] = [
    {
      id: '1',
      item_name: 'Tires',
      item_type: 'yes_no',
      is_required: true,
      is_critical: false,
    },
  ];

  const results: ChecklistResult[] = [
    { item_id: '1', result: 'no', notes: '   ' }, // Whitespace only
  ];

  const status = calculateInspectionStatus(items, results);

  assertEquals(status.errors.length, 1);
  assertEquals(status.errors[0], 'Non-compliant item "Tires" requires a description');
});

// Test: Yes/No item type - compliant
Deno.test('Item Type - Yes/No Compliant', () => {
  const item: ChecklistItem = {
    id: '1',
    item_name: 'Lights Working',
    item_type: 'yes_no',
    is_required: true,
    is_critical: false,
  };

  const result: ChecklistResult = {
    item_id: '1',
    result: 'yes',
    notes: 'All lights working',
  };

  const isNonCompliant = isItemNonCompliant(item, result);
  assertEquals(isNonCompliant, false);
});

// Test: Yes/No item type - non-compliant
Deno.test('Item Type - Yes/No Non-compliant', () => {
  const item: ChecklistItem = {
    id: '1',
    item_name: 'Lights Working',
    item_type: 'yes_no',
    is_required: true,
    is_critical: false,
  };

  const result: ChecklistResult = {
    item_id: '1',
    result: 'no',
    notes: 'Left headlight not working',
  };

  const isNonCompliant = isItemNonCompliant(item, result);
  assertEquals(isNonCompliant, true);
});

// Test: Pass/Fail item type - compliant
Deno.test('Item Type - Pass/Fail Compliant', () => {
  const item: ChecklistItem = {
    id: '1',
    item_name: 'Brake Test',
    item_type: 'pass_fail',
    is_required: true,
    is_critical: true,
  };

  const result: ChecklistResult = {
    item_id: '1',
    result: 'pass',
    notes: 'Brakes working properly',
  };

  const isNonCompliant = isItemNonCompliant(item, result);
  assertEquals(isNonCompliant, false);
});

// Test: Pass/Fail item type - non-compliant
Deno.test('Item Type - Pass/Fail Non-compliant', () => {
  const item: ChecklistItem = {
    id: '1',
    item_name: 'Brake Test',
    item_type: 'pass_fail',
    is_required: true,
    is_critical: true,
  };

  const result: ChecklistResult = {
    item_id: '1',
    result: 'fail',
    notes: 'Brake response is slow',
  };

  const isNonCompliant = isItemNonCompliant(item, result);
  assertEquals(isNonCompliant, true);
});

// Test: Numeric item type - always compliant
Deno.test('Item Type - Numeric Always Compliant', () => {
  const item: ChecklistItem = {
    id: '1',
    item_name: 'Tire Pressure',
    item_type: 'numeric',
    is_required: false,
    is_critical: false,
  };

  const result: ChecklistResult = {
    item_id: '1',
    result: 28,
    notes: 'Measured tire pressure',
  };

  const isNonCompliant = isItemNonCompliant(item, result);
  assertEquals(isNonCompliant, false);
});

// Test: Text item type - always compliant
Deno.test('Item Type - Text Always Compliant', () => {
  const item: ChecklistItem = {
    id: '1',
    item_name: 'General Notes',
    item_type: 'text',
    is_required: false,
    is_critical: false,
  };

  const result: ChecklistResult = {
    item_id: '1',
    result: 'Vehicle is clean and ready',
    notes: 'Additional comments',
  };

  const isNonCompliant = isItemNonCompliant(item, result);
  assertEquals(isNonCompliant, false);
});

// Test: Photo item type - compliant with photos
Deno.test('Item Type - Photo Compliant', () => {
  const item: ChecklistItem = {
    id: '1',
    item_name: 'Damage Documentation',
    item_type: 'photo',
    is_required: false,
    is_critical: false,
  };

  const result: ChecklistResult = {
    item_id: '1',
    result: true,
    notes: 'Photos taken',
    photo_urls: ['https://example.com/photo1.jpg'],
  };

  const isNonCompliant = isItemNonCompliant(item, result);
  assertEquals(isNonCompliant, false);
});

// Test: Photo item type - non-compliant without photos
Deno.test('Item Type - Photo Non-compliant', () => {
  const item: ChecklistItem = {
    id: '1',
    item_name: 'Damage Documentation',
    item_type: 'photo',
    is_required: false,
    is_critical: false,
  };

  const result: ChecklistResult = {
    item_id: '1',
    result: true,
    notes: 'Photo required',
    photo_urls: [],
  };

  const isNonCompliant = isItemNonCompliant(item, result);
  assertEquals(isNonCompliant, true);
});

// Test: Multiple defects counting
Deno.test('Multiple Defects Counting', () => {
  const items: ChecklistItem[] = [
    {
      id: '1',
      item_name: 'Brakes',
      item_type: 'pass_fail',
      is_required: true,
      is_critical: true,
    },
    {
      id: '2',
      item_name: 'Tires',
      item_type: 'yes_no',
      is_required: true,
      is_critical: false,
    },
    {
      id: '3',
      item_name: 'Lights',
      item_type: 'yes_no',
      is_required: true,
      is_critical: false,
    },
  ];

  const results: ChecklistResult[] = [
    { item_id: '1', result: 'pass', notes: 'OK' },
    { item_id: '2', result: 'no', notes: 'Tire worn' },
    { item_id: '3', result: 'no', notes: 'Light broken' },
  ];

  const status = calculateInspectionStatus(items, results);

  assertEquals(status.defects_reported, 2);
  assertEquals(status.overall_status, 'warning');
});

// Test: Optional items don't affect status
Deno.test('Optional Items Not Required', () => {
  const items: ChecklistItem[] = [
    {
      id: '1',
      item_name: 'Brakes',
      item_type: 'pass_fail',
      is_required: true,
      is_critical: true,
    },
    {
      id: '2',
      item_name: 'Interior Cleanliness',
      item_type: 'yes_no',
      is_required: false, // Optional
      is_critical: false,
    },
  ];

  const results: ChecklistResult[] = [
    { item_id: '1', result: 'pass', notes: 'OK' },
    // Optional item 2 not filled
  ];

  const status = calculateInspectionStatus(items, results);

  assertEquals(status.overall_status, 'pass');
  assertEquals(status.errors.length, 0);
});

// Test: Complex scenario - mixed results
Deno.test('Complex Scenario - Mixed Results', () => {
  const items: ChecklistItem[] = [
    {
      id: '1',
      item_name: 'Brake System',
      item_type: 'pass_fail',
      is_required: true,
      is_critical: true,
    },
    {
      id: '2',
      item_name: 'Steering System',
      item_type: 'pass_fail',
      is_required: true,
      is_critical: true,
    },
    {
      id: '3',
      item_name: 'Tire Condition',
      item_type: 'yes_no',
      is_required: true,
      is_critical: false,
    },
    {
      id: '4',
      item_name: 'Tire Pressure',
      item_type: 'numeric',
      is_required: false,
      is_critical: false,
    },
    {
      id: '5',
      item_name: 'General Notes',
      item_type: 'text',
      is_required: false,
      is_critical: false,
    },
  ];

  const results: ChecklistResult[] = [
    { item_id: '1', result: 'pass', notes: 'Brakes OK' },
    { item_id: '2', result: 'pass', notes: 'Steering OK' },
    { item_id: '3', result: 'no', notes: 'Front left tire has low tread' },
    { item_id: '4', result: 32, notes: 'PSI measurement' },
    { item_id: '5', result: 'Vehicle is clean', notes: 'Additional notes' },
  ];

  const status = calculateInspectionStatus(items, results);

  assertEquals(status.overall_status, 'warning');
  assertEquals(status.defects_reported, 1);
  assertEquals(status.errors.length, 0);
});

console.log('✅ All unit tests defined successfully');
