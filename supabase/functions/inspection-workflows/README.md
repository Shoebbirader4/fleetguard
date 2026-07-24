# Inspection Workflows Edge Function

## Overview

Handles inspection checklist loading and submission workflows for the FleetGuard AI platform.

**Requirements Covered**: 20.4, 20.5, 20.6

## Features

- **Load Checklist by Vehicle Type** (Requirement 20.4)
  - Automatically loads the appropriate inspection checklist based on vehicle type
  - Prioritizes vehicle-specific checklists over generic 'all' type checklists
  - Returns active checklists only

- **Submit Inspection Results** (Requirement 20.5)
  - Validates checklist results against checklist items
  - Marks items as compliant/non-compliant based on responses
  - Calculates overall inspection status (pass/fail/warning)
  - Creates safety alerts for failed or warning inspections

- **Non-Compliant Item Validation** (Requirement 20.6)
  - Requires description (notes) for all non-compliant items
  - Supports optional photo URLs for documentation
  - Returns validation errors if requirements not met

## API Endpoints

### 1. Load Checklist for Vehicle

**Endpoint**: `GET /inspection-workflows/load-checklist?vehicle_id={id}`

**Description**: Loads the active inspection checklist for a vehicle based on its vehicle type.

**Query Parameters**:
- `vehicle_id` (required): UUID of the vehicle

**Response**:
```json
{
  "success": true,
  "checklist": {
    "id": "uuid",
    "checklist_name": "Daily Bus Inspection",
    "description": "Pre-trip inspection checklist for buses",
    "vehicle_type": "bus",
    "checklist_items": [
      {
        "id": "item1",
        "item_name": "Brake System",
        "item_type": "pass_fail",
        "is_required": true,
        "is_critical": true
      },
      {
        "id": "item2",
        "item_name": "Tire Condition",
        "item_type": "yes_no",
        "is_required": true,
        "is_critical": false
      }
    ]
  }
}
```

**Error Responses**:
- `400`: Missing vehicle_id
- `404`: Vehicle not found or no active checklist for vehicle type

### 2. Submit Inspection

**Endpoint**: `POST /inspection-workflows/submit-inspection`

**Description**: Submits completed inspection results with validation.

**Request Body**:
```json
{
  "vehicle_id": "uuid",
  "checklist_id": "uuid",
  "odometer_reading": 125000,
  "checklist_results": [
    {
      "item_id": "item1",
      "result": "pass",
      "notes": "Brakes functioning properly"
    },
    {
      "item_id": "item2",
      "result": "no",
      "notes": "Left front tire has low tread depth",
      "photo_urls": ["https://storage.example.com/tire-photo.jpg"]
    }
  ],
  "notes": "Overall vehicle condition acceptable with tire replacement needed"
}
```

**Response**:
```json
{
  "success": true,
  "inspection": {
    "id": "uuid",
    "overall_status": "warning",
    "defects_reported": 1
  }
}
```

**Validation Rules**:
- All required checklist items must have results
- Non-compliant items MUST have a description (notes field)
- Non-compliant items MAY have photo_urls for documentation

**Error Responses**:
- `400`: Missing required fields or validation errors
- `404`: Vehicle or checklist not found

### 3. Calculate Status (Preview)

**Endpoint**: `POST /inspection-workflows/calculate-status`

**Description**: Previews the inspection status calculation without saving.

**Request Body**:
```json
{
  "checklist_id": "uuid",
  "checklist_results": [
    {
      "item_id": "item1",
      "result": "pass"
    },
    {
      "item_id": "item2",
      "result": "no",
      "notes": "Issue description"
    }
  ]
}
```

**Response**:
```json
{
  "overall_status": "warning",
  "defects_reported": 1,
  "validation_errors": []
}
```

## Checklist Item Types

The function supports 5 item types as per Requirement 20.2:

1. **yes_no**: Boolean response (Yes/No)
   - Non-compliant: "no" or false
   - Use for: "Are tires in good condition?"

2. **pass_fail**: Binary assessment (Pass/Fail)
   - Non-compliant: "fail" or false
   - Use for: "Brake system check"

3. **numeric**: Numeric measurement
   - Always compliant (informational)
   - Use for: "Tire pressure (PSI)", "Fuel level (%)"

4. **text**: Free-form text note
   - Always compliant (informational)
   - Use for: "Additional observations"

5. **photo**: Photo required
   - Non-compliant: Missing photo_urls
   - Use for: "Damage documentation"

## Overall Status Calculation Logic

The function calculates overall inspection status as follows:

- **PASS**: All items are compliant (no defects)
- **FAIL**: Any critical item is non-compliant
- **WARNING**: Non-critical items are non-compliant

### Critical Items

Checklist items can be marked as `is_critical: true`:
- Critical items cause inspection to FAIL if non-compliant
- Examples: Brake system, steering system, tire condition
- Non-critical items only cause WARNING status
- Examples: Mirror adjustment, wiper condition, interior cleanliness

## Alert Generation

The function automatically creates alerts for:

- **Failed Inspections** (severity: high)
  - Alert type: `safety_risk`
  - Title: "Vehicle Inspection Failed"
  - Description includes defect count

- **Warning Inspections** (severity: medium)
  - Alert type: `safety_risk`
  - Title: "Vehicle Inspection Warning"
  - Description includes defect count

## Authentication

All endpoints require authentication via JWT token in the `Authorization` header:

```
Authorization: Bearer <supabase-jwt-token>
```

The function uses the authenticated user's ID as the `inspector_id` for inspection records.

## Deployment

Deploy using Supabase CLI:

```bash
supabase functions deploy inspection-workflows
```

## Environment Variables

Required:
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anonymous key (for RLS)

## Testing

Test the endpoints using curl:

```bash
# Load checklist
curl -X GET "https://<project-ref>.supabase.co/functions/v1/inspection-workflows/load-checklist?vehicle_id=<vehicle-id>" \
  -H "Authorization: Bearer <jwt-token>"

# Submit inspection
curl -X POST "https://<project-ref>.supabase.co/functions/v1/inspection-workflows/submit-inspection" \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "vehicle_id": "uuid",
    "checklist_id": "uuid",
    "odometer_reading": 125000,
    "checklist_results": [
      {
        "item_id": "item1",
        "result": "pass",
        "notes": "All good"
      }
    ]
  }'
```

## Database Schema

### inspection_checklists table
```sql
CREATE TABLE inspection_checklists (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  checklist_name TEXT NOT NULL,
  description TEXT,
  vehicle_type TEXT NOT NULL, -- 'bus', 'truck', 'van', 'construction', 'custom', 'all'
  checklist_items JSONB NOT NULL, -- Array of checklist items
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
```

### inspections table
```sql
CREATE TABLE inspections (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  vehicle_id UUID NOT NULL,
  inspector_id UUID NOT NULL,
  checklist_id UUID NOT NULL,
  inspection_date TIMESTAMPTZ NOT NULL,
  odometer_reading INTEGER NOT NULL,
  overall_status TEXT NOT NULL, -- 'pass', 'fail', 'warning'
  checklist_results JSONB NOT NULL, -- Array of results
  defects_reported INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL
);
```

## Example Workflow

1. **Driver opens inspection app**
   - App calls `GET /load-checklist?vehicle_id={id}`
   - Receives checklist items to fill out

2. **Driver completes checklist**
   - For each item, records result
   - For non-compliant items, adds description and optional photo

3. **Driver previews status (optional)**
   - App calls `POST /calculate-status`
   - Shows preview of pass/fail/warning status

4. **Driver submits inspection**
   - App calls `POST /submit-inspection`
   - Receives confirmation with final status
   - If failed/warning, alert is automatically created

## Business Logic

### Non-Compliance Detection

The function determines non-compliance based on item type:

| Item Type | Non-Compliant When |
|-----------|-------------------|
| yes_no | Result is "no" or false |
| pass_fail | Result is "fail" or false |
| numeric | Never (informational only) |
| text | Never (informational only) |
| photo | No photo_urls provided |

### Validation Requirements

For non-compliant items (Requirement 20.6):
- **MUST** have `notes` field with description
- **MAY** have `photo_urls` array for documentation
- Empty or missing notes causes validation error

## Error Handling

The function returns detailed validation errors:

```json
{
  "error": "Validation failed",
  "validation_errors": [
    "Required item 'Brake System' is missing",
    "Non-compliant item 'Tire Condition' requires a description"
  ]
}
```

## Integration Points

- **Mobile Apps**: Driver app, Inspector app
- **Web Frontend**: Fleet manager inspection review
- **Alerts System**: Automatic alert creation for failures
- **Audit Logging**: All inspections logged via database triggers

## Future Enhancements

- Support for numeric threshold validation
- Support for conditional items (show item B only if item A fails)
- Inspection scheduling and reminders
- Historical compliance trends per vehicle
- Bulk inspection submission for multiple vehicles
