# AI Draft Review Edge Function

## Overview

The AI Draft Review Edge Function provides endpoints for mechanics to review, edit, approve, or reject AI-generated maintenance drafts.

**Requirements**: 11.5 - Allow mechanic to review and edit before saving

## Endpoints

### GET Endpoints

#### 1. Get Draft by ID
```http
GET /ai-draft-review?draft_id=<uuid>
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "id": "uuid",
  "tenant_id": "uuid",
  "work_order_id": "uuid",
  "file_type": "photo",
  "file_urls": ["url1", "url2"],
  "component_type": "brake",
  "component_subtype": "brake_pad",
  "damage_type": "excessive_wear",
  "severity": "moderate",
  "failure_category": "mechanical",
  "description": "Brake pad shows significant wear...",
  "recommended_actions": ["Replace brake pads", "Inspect rotors"],
  "estimated_labor_hours": 2.5,
  "confidence_score": 0.85,
  "status": "draft",
  "reviewed_by": null,
  "reviewed_at": null,
  "edited_component_type": null,
  ...
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-01-15T10:30:00Z"
}
```

#### 2. Get Drafts by Work Order
```http
GET /ai-draft-review?work_order_id=<uuid>
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "drafts": [
    { "id": "...", "status": "draft", ... },
    { "id": "...", "status": "approved", ... }
  ],
  "count": 2
}
```

#### 3. Get Drafts by Status
```http
GET /ai-draft-review?status=<draft|reviewed|approved|rejected>
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "drafts": [
    { "id": "...", "status": "draft", ... }
  ],
  "count": 1
}
```

#### 4. Get Recent Drafts (no filter)
```http
GET /ai-draft-review
Authorization: Bearer <jwt_token>
```

**Response:** Returns up to 50 most recent drafts for the tenant.

### PATCH Endpoint

#### Update/Review Draft
```http
PATCH /ai-draft-review?draft_id=<uuid>
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "status": "reviewed",
  "edited_component_type": "brake",
  "edited_description": "Front brake pads worn to 20%, immediate replacement required",
  "edited_estimated_labor_hours": 3.0
}
```

**Fields (all optional):**
- `status`: 'draft' | 'reviewed' | 'approved' | 'rejected'
- `edited_component_type`: string
- `edited_component_subtype`: string
- `edited_damage_type`: string
- `edited_severity`: 'minor' | 'moderate' | 'severe' | 'critical'
- `edited_failure_category`: 'mechanical' | 'electrical' | 'hydraulic' | 'pneumatic' | 'body' | 'other'
- `edited_description`: string
- `edited_recommended_actions`: string[]
- `edited_estimated_labor_hours`: number
- `rejection_reason`: string (required if status is 'rejected')

**Response:** Updated draft object

### DELETE Endpoint

#### Delete Draft
```http
DELETE /ai-draft-review?draft_id=<uuid>
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "message": "Draft deleted successfully",
  "draft_id": "uuid"
}
```

## Workflow

### 1. Mechanic Captures Data
- Mechanic takes photos/videos or records voice notes
- Files are uploaded to Supabase Storage
- Mechanic calls `/ai-assistant-handler` with file URLs

### 2. AI Processing
- AI Assistant Handler processes files:
  - Computer vision analyzes photos/videos
  - Speech-to-text transcribes voice notes
  - LLM generates structured maintenance record
- Draft is saved to `ai_maintenance_drafts` table with status='draft'

### 3. Mechanic Review
- Mechanic retrieves draft via `/ai-draft-review?work_order_id=<uuid>`
- Mechanic reviews AI-generated fields
- Mechanic can:
  - **Accept as-is**: PATCH with `status: 'approved'`
  - **Edit and approve**: PATCH with edited fields + `status: 'approved'`
  - **Reject**: PATCH with `status: 'rejected'` and `rejection_reason`

### 4. Auto-Apply to Work Order
- When status changes to 'approved', database trigger automatically:
  - Updates work order `failure_category` with final value
  - Updates work order `service_report` with final description + recommendations
  - Uses edited values if provided, otherwise uses AI-generated values

## Authorization

**Allowed Roles:**
- company_owner
- fleet_manager
- workshop_manager
- maintenance_engineer
- mechanic

All operations are tenant-isolated via RLS policies.

## Examples

### Example 1: Approve Draft As-Is
```bash
curl -X PATCH "https://<project-ref>.supabase.co/functions/v1/ai-draft-review?draft_id=123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{"status": "approved"}'
```

### Example 2: Edit and Approve
```bash
curl -X PATCH "https://<project-ref>.supabase.co/functions/v1/ai-draft-review?draft_id=123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "approved",
    "edited_severity": "critical",
    "edited_description": "Brake pads completely worn - metal-to-metal contact detected. IMMEDIATE replacement required.",
    "edited_estimated_labor_hours": 4.0
  }'
```

### Example 3: Reject Draft
```bash
curl -X PATCH "https://<project-ref>.supabase.co/functions/v1/ai-draft-review?draft_id=123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "rejected",
    "rejection_reason": "AI misidentified component - this is tire wear, not brake wear"
  }'
```

## Error Handling

**400 Bad Request:**
- Missing required parameters
- Invalid enum values
- Validation errors

**401 Unauthorized:**
- Missing or invalid JWT token

**403 Forbidden:**
- User lacks required permissions

**404 Not Found:**
- Draft ID not found
- Draft belongs to different tenant

**500 Internal Server Error:**
- Database errors
- Unexpected errors

## Database Schema

The function operates on the `ai_maintenance_drafts` table:

```sql
CREATE TABLE ai_maintenance_drafts (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  work_order_id UUID NOT NULL REFERENCES work_orders(id),
  
  -- AI-generated fields
  component_type TEXT NOT NULL,
  component_subtype TEXT,
  damage_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('minor', 'moderate', 'severe', 'critical')),
  failure_category TEXT NOT NULL CHECK (failure_category IN ('mechanical', 'electrical', 'hydraulic', 'pneumatic', 'body', 'other')),
  description TEXT NOT NULL,
  recommended_actions TEXT[],
  estimated_labor_hours DECIMAL(5, 2),
  confidence_score DECIMAL(4, 3) NOT NULL,
  
  -- Review workflow
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'reviewed', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  
  -- Edited fields (if mechanic modifies)
  edited_component_type TEXT,
  edited_component_subtype TEXT,
  edited_damage_type TEXT,
  edited_severity TEXT,
  edited_failure_category TEXT,
  edited_description TEXT,
  edited_recommended_actions TEXT[],
  edited_estimated_labor_hours DECIMAL(5, 2),
  
  rejection_reason TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## Testing

See `integration-test.md` for integration test scenarios.
