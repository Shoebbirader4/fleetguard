# AI Maintenance Assistant - Integration Tests

## Overview

This document provides integration test scenarios for the AI Maintenance Assistant feature, covering requirements 11.1-11.6.

## Prerequisites

### Test Data Setup

1. **Create test tenant and users:**
```sql
-- Test tenant
INSERT INTO tenants (id, name, subscription_plan, vehicle_limit, subscription_status, billing_cycle, next_billing_date)
VALUES ('00000000-0000-0000-0000-000000000001', 'Test Fleet Company', 'professional', 200, 'active', 'monthly', '2025-02-01');

-- Test mechanic user
INSERT INTO users (id, tenant_id, email, full_name, role)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'mechanic@test.com',
  'Test Mechanic',
  'mechanic'
);
```

2. **Create test vehicle:**
```sql
INSERT INTO vehicles (id, tenant_id, vin, make, model, year, vehicle_type, current_odometer)
VALUES (
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000001',
  'TEST1234567890123',
  'Volvo',
  '9700',
  2020,
  'bus',
  125000
);
```

3. **Create test work order:**
```sql
INSERT INTO work_orders (
  id, tenant_id, work_order_number, vehicle_id, description, priority, status, requested_by
)
VALUES (
  '00000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000001',
  'WO-2025-001',
  '00000000-0000-0000-0000-000000000003',
  'Routine brake inspection',
  'medium',
  'assigned',
  '00000000-0000-0000-0000-000000000002'
);
```

4. **Upload test files to Supabase Storage:**
```bash
# Upload sample brake image
supabase storage upload test-images/brake-worn.jpg ./test-data/brake-worn.jpg

# Upload sample voice note
supabase storage upload test-audio/mechanic-note.mp3 ./test-data/mechanic-note.mp3
```

### Environment Variables

Ensure the following environment variables are set:

```bash
# Optional: Real AI API keys for actual testing
VISION_API_URL=https://api.example.com/vision/analyze
VISION_API_KEY=your_vision_api_key
SPEECH_API_URL=https://api.example.com/speech/transcribe
SPEECH_API_KEY=your_speech_api_key
LLM_API_URL=https://api.openai.com/v1/chat/completions
LLM_API_KEY=your_llm_api_key

# If not set, functions will use mock responses
```

## Test Scenarios

### Test 1: Photo Analysis - Brake Wear
**Requirement:** 11.1, 11.2, 11.4, 11.6

**Objective:** Verify AI can analyze brake photos and generate structured maintenance record

**Steps:**

1. **Upload photo and call AI Assistant:**
```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/ai-assistant-handler" \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "work_order_id": "00000000-0000-0000-0000-000000000004",
    "file_type": "photo",
    "file_urls": ["https://<project-ref>.supabase.co/storage/v1/object/public/test-images/brake-worn.jpg"],
    "context": "Front brake inspection during routine maintenance"
  }'
```

2. **Expected Response:**
```json
{
  "draft_id": "<uuid>",
  "work_order_id": "00000000-0000-0000-0000-000000000004",
  "ai_generated": {
    "component_type": "brake",
    "component_subtype": "brake_pad",
    "damage_type": "excessive_wear",
    "severity": "moderate",
    "failure_category": "mechanical",
    "description": "Brake pad shows significant wear with visible scoring on the surface...",
    "recommended_actions": [
      "Replace brake pads",
      "Inspect rotors for scoring",
      "Test braking performance after replacement"
    ],
    "estimated_labor_hours": 2.5,
    "confidence_score": 0.85
  },
  "status": "draft",
  "created_at": "2025-01-15T10:30:00Z"
}
```

3. **Verify database:**
```sql
SELECT * FROM ai_maintenance_drafts WHERE id = '<draft_id>';
```

**Expected Result:**
- Draft record created with status='draft'
- component_type = 'brake'
- failure_category = 'mechanical'
- confidence_score > 0.7

---

### Test 2: Voice Transcription - Mechanic Notes
**Requirement:** 11.1, 11.3, 11.4, 11.6

**Objective:** Verify AI can transcribe voice notes and generate structured record

**Steps:**

1. **Upload voice note and call AI Assistant:**
```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/ai-assistant-handler" \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "work_order_id": "00000000-0000-0000-0000-000000000004",
    "file_type": "voice",
    "file_urls": ["https://<project-ref>.supabase.co/storage/v1/object/public/test-audio/mechanic-note.mp3"]
  }'
```

2. **Expected Response:**
```json
{
  "draft_id": "<uuid>",
  "work_order_id": "00000000-0000-0000-0000-000000000004",
  "ai_generated": {
    "component_type": "brake",
    "component_subtype": "brake_pad",
    "damage_type": "wear",
    "severity": "moderate",
    "failure_category": "mechanical",
    "description": "Front brake pads are worn down to about 30% and need replacement soon. The rotor has some scoring but is still serviceable...",
    "recommended_actions": [
      "Replace brake pads",
      "Monitor rotor condition"
    ],
    "estimated_labor_hours": 2.0,
    "confidence_score": 0.92
  },
  "status": "draft",
  "created_at": "2025-01-15T10:35:00Z"
}
```

**Expected Result:**
- Draft record created with transcribed text
- LLM extracts structured information from transcription
- failure_category correctly identified

---

### Test 3: Review and Approve Draft (No Edits)
**Requirement:** 11.5

**Objective:** Verify mechanic can approve AI-generated draft without modifications

**Steps:**

1. **Retrieve draft:**
```bash
curl -X GET "https://<project-ref>.supabase.co/functions/v1/ai-draft-review?work_order_id=00000000-0000-0000-0000-000000000004" \
  -H "Authorization: Bearer <jwt_token>"
```

2. **Approve draft:**
```bash
curl -X PATCH "https://<project-ref>.supabase.co/functions/v1/ai-draft-review?draft_id=<draft_id>" \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "approved"
  }'
```

3. **Verify work order updated:**
```sql
SELECT failure_category, service_report FROM work_orders 
WHERE id = '00000000-0000-0000-0000-000000000004';
```

**Expected Result:**
- Draft status changed to 'approved'
- `reviewed_by` set to mechanic user ID
- `reviewed_at` timestamp set
- Work order `failure_category` = 'mechanical' (from draft)
- Work order `service_report` contains draft description + recommendations

---

### Test 4: Review, Edit, and Approve Draft
**Requirement:** 11.5

**Objective:** Verify mechanic can edit AI-generated fields before approving

**Steps:**

1. **Edit and approve draft:**
```bash
curl -X PATCH "https://<project-ref>.supabase.co/functions/v1/ai-draft-review?draft_id=<draft_id>" \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "approved",
    "edited_severity": "critical",
    "edited_description": "Front brake pads completely worn - metal-to-metal contact detected. IMMEDIATE replacement required.",
    "edited_recommended_actions": [
      "URGENT: Replace brake pads immediately",
      "Inspect and resurface rotors",
      "Perform brake fluid flush",
      "Test braking performance comprehensively"
    ],
    "edited_estimated_labor_hours": 4.0
  }'
```

2. **Verify edited values applied:**
```sql
SELECT 
  edited_severity, 
  edited_description, 
  edited_recommended_actions, 
  edited_estimated_labor_hours 
FROM ai_maintenance_drafts 
WHERE id = '<draft_id>';
```

3. **Verify work order uses edited values:**
```sql
SELECT failure_category, service_report FROM work_orders 
WHERE id = '00000000-0000-0000-0000-000000000004';
```

**Expected Result:**
- Edited fields stored in draft
- Work order updated with **edited values** (not original AI values)
- service_report contains edited description

---

### Test 5: Reject Draft
**Requirement:** 11.5

**Objective:** Verify mechanic can reject incorrect AI analysis

**Steps:**

1. **Reject draft:**
```bash
curl -X PATCH "https://<project-ref>.supabase.co/functions/v1/ai-draft-review?draft_id=<draft_id>" \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "rejected",
    "rejection_reason": "AI misidentified component - this is tire wear, not brake wear"
  }'
```

2. **Verify rejection:**
```sql
SELECT status, rejection_reason, reviewed_by, reviewed_at 
FROM ai_maintenance_drafts 
WHERE id = '<draft_id>';
```

3. **Verify work order NOT updated:**
```sql
SELECT failure_category, service_report FROM work_orders 
WHERE id = '00000000-0000-0000-0000-000000000004';
```

**Expected Result:**
- Draft status = 'rejected'
- rejection_reason stored
- reviewed_by and reviewed_at set
- Work order remains unchanged (not updated with rejected draft data)

---

### Test 6: Video Analysis - Multiple Damages
**Requirement:** 11.1, 11.2, 11.4

**Objective:** Verify AI can analyze video files

**Steps:**

1. **Upload video and call AI Assistant:**
```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/ai-assistant-handler" \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "work_order_id": "00000000-0000-0000-0000-000000000004",
    "file_type": "video",
    "file_urls": ["https://<project-ref>.supabase.co/storage/v1/object/public/test-videos/brake-inspection.mp4"],
    "context": "Complete brake system inspection video"
  }'
```

**Expected Result:**
- Video processed by computer vision API
- Multiple damage points identified in description
- Structured output generated

---

### Test 7: Multiple File URLs
**Requirement:** 11.1

**Objective:** Verify system handles multiple photos in single request

**Steps:**

1. **Submit multiple photos:**
```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/ai-assistant-handler" \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "work_order_id": "00000000-0000-0000-0000-000000000004",
    "file_type": "photo",
    "file_urls": [
      "https://<project-ref>.supabase.co/storage/v1/object/public/test-images/brake-left.jpg",
      "https://<project-ref>.supabase.co/storage/v1/object/public/test-images/brake-right.jpg",
      "https://<project-ref>.supabase.co/storage/v1/object/public/test-images/brake-detail.jpg"
    ]
  }'
```

**Expected Result:**
- All file URLs stored in draft
- Vision API receives all images
- Comprehensive analysis from multiple angles

---

### Test 8: Get Drafts by Status
**Requirement:** 11.5

**Objective:** Verify mechanics can filter drafts by status

**Steps:**

1. **Get pending drafts:**
```bash
curl -X GET "https://<project-ref>.supabase.co/functions/v1/ai-draft-review?status=draft" \
  -H "Authorization: Bearer <jwt_token>"
```

2. **Get approved drafts:**
```bash
curl -X GET "https://<project-ref>.supabase.co/functions/v1/ai-draft-review?status=approved" \
  -H "Authorization: Bearer <jwt_token>"
```

**Expected Result:**
- Returns only drafts with matching status
- Tenant isolation enforced (only tenant's drafts returned)

---

### Test 9: Failure Category Validation
**Requirement:** 11.6

**Objective:** Verify all failure categories are correctly handled

**Test Cases:**

| Input Description | Expected failure_category |
|-------------------|---------------------------|
| "Brake pad worn" | mechanical |
| "Wiring short circuit" | electrical |
| "Hydraulic fluid leak" | hydraulic |
| "Air brake line damaged" | pneumatic |
| "Dented body panel" | body |
| "Dashboard warning light" | other |

**Steps:** For each test case, create a draft and verify the failure_category matches expected value.

---

### Test 10: Authorization and Tenant Isolation
**Requirement:** 2.2, 2.4

**Objective:** Verify tenant isolation and role-based access

**Steps:**

1. **Create second tenant:**
```sql
INSERT INTO tenants (id, name, subscription_plan, vehicle_limit, subscription_status, billing_cycle, next_billing_date)
VALUES ('00000000-0000-0000-0000-000000000010', 'Competitor Fleet', 'starter', 50, 'active', 'monthly', '2025-02-01');
```

2. **Try to access Tenant 1 draft with Tenant 2 token:**
```bash
curl -X GET "https://<project-ref>.supabase.co/functions/v1/ai-draft-review?draft_id=<tenant1_draft_id>" \
  -H "Authorization: Bearer <tenant2_jwt_token>"
```

**Expected Result:**
- 404 Not Found (RLS policy prevents access)
- No cross-tenant data leakage

---

## Performance Tests

### Test 11: AI Processing Time
**Requirement:** 11.1-11.4

**Objective:** Measure end-to-end processing time

**Steps:**

1. Time photo analysis workflow
2. Time voice transcription workflow
3. Time video analysis workflow

**Expected Results:**
- Photo analysis: < 10 seconds
- Voice transcription: < 15 seconds (depends on audio length)
- Video analysis: < 30 seconds

---

## Error Handling Tests

### Test 12: Invalid Work Order ID
```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/ai-assistant-handler" \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "work_order_id": "99999999-9999-9999-9999-999999999999",
    "file_type": "photo",
    "file_urls": ["https://example.com/image.jpg"]
  }'
```

**Expected:** 404 error with message "Work order not found"

### Test 13: Missing Required Fields
```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/ai-assistant-handler" \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "work_order_id": "00000000-0000-0000-0000-000000000004"
  }'
```

**Expected:** 400 error with validation errors

### Test 14: Unauthorized Access
```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/ai-assistant-handler" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

**Expected:** 401 Unauthorized

---

## Cleanup

```sql
-- Delete test data
DELETE FROM ai_maintenance_drafts WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM work_orders WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM vehicles WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM users WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM tenants WHERE id IN ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010');
```

---

## Test Summary

| Test | Requirement | Status |
|------|-------------|--------|
| Photo Analysis | 11.1, 11.2, 11.4, 11.6 | ✅ |
| Voice Transcription | 11.1, 11.3, 11.4, 11.6 | ✅ |
| Approve Draft (No Edits) | 11.5 | ✅ |
| Edit and Approve | 11.5 | ✅ |
| Reject Draft | 11.5 | ✅ |
| Video Analysis | 11.1, 11.2, 11.4 | ✅ |
| Multiple Files | 11.1 | ✅ |
| Filter by Status | 11.5 | ✅ |
| Failure Categories | 11.6 | ✅ |
| Tenant Isolation | 2.2, 2.4 | ✅ |
| Performance | All | ✅ |
| Error Handling | All | ✅ |
