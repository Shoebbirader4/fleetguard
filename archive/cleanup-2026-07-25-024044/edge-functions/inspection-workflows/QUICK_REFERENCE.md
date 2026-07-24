# Inspection Workflows - Quick Reference

## API Endpoints

### Load Checklist
```bash
GET /inspection-workflows/load-checklist?vehicle_id={uuid}
Authorization: Bearer {jwt-token}
```

**Response**:
```json
{
  "success": true,
  "checklist": {
    "id": "uuid",
    "checklist_name": "Daily Bus Inspection",
    "vehicle_type": "bus",
    "checklist_items": [...]
  }
}
```

---

### Submit Inspection
```bash
POST /inspection-workflows/submit-inspection
Authorization: Bearer {jwt-token}
Content-Type: application/json

{
  "vehicle_id": "uuid",
  "checklist_id": "uuid",
  "odometer_reading": 125000,
  "checklist_results": [
    {
      "item_id": "brake_system",
      "result": "pass",
      "notes": "Brakes OK"
    },
    {
      "item_id": "tire_condition",
      "result": "no",
      "notes": "Tire tread low",
      "photo_urls": ["https://..."]
    }
  ],
  "notes": "Overall notes"
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

---

### Calculate Status (Preview)
```bash
POST /inspection-workflows/calculate-status
Authorization: Bearer {jwt-token}
Content-Type: application/json

{
  "checklist_id": "uuid",
  "checklist_results": [...]
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

---

## Item Types

| Type | Non-Compliant When | Example |
|------|-------------------|---------|
| `yes_no` | Result is "no" | "Are tires OK?" |
| `pass_fail` | Result is "fail" | "Brake system check" |
| `numeric` | Never (info only) | "Tire pressure (PSI)" |
| `text` | Never (info only) | "Additional notes" |
| `photo` | No photos | "Damage documentation" |

---

## Status Calculation

```
PASS    = All items compliant
FAIL    = Any critical item non-compliant
WARNING = Non-critical items non-compliant
```

---

## Validation Rules

**Required for Non-Compliant Items**:
- ✅ `notes` field with description (not empty/whitespace)
- ⚠️ `photo_urls` optional but recommended

**Errors**:
- "Required item 'X' is missing"
- "Non-compliant item 'X' requires a description"

---

## Database Functions (Alternative)

```sql
-- Load checklist
SELECT * FROM get_active_checklist_for_vehicle('vehicle-uuid');

-- Validate results
SELECT * FROM validate_inspection_results(
  'checklist-uuid',
  '[{"item_id": "...", "result": "..."}]'::JSONB
);

-- Submit inspection
SELECT * FROM submit_inspection_with_validation(
  'vehicle-uuid',
  'inspector-uuid',
  'checklist-uuid',
  125000,
  '[...]'::JSONB,
  'notes'
);
```

---

## Testing

```bash
# Unit tests (17 tests)
deno test --allow-read edge-functions/inspection-workflows/inspection-logic.test.ts

# Integration tests
cd edge-functions/inspection-workflows
deno run --allow-net --allow-env test.ts
```

---

## Deployment

```bash
# Deploy Edge Function
supabase functions deploy inspection-workflows

# Apply database migration
supabase db push
```

---

## Common Use Cases

### Driver App: Daily Inspection
```typescript
// 1. Load checklist
const { checklist } = await loadChecklist(vehicleId);

// 2. Fill out items
const results = checklist.checklist_items.map(item => ({
  item_id: item.id,
  result: getUserInput(item),
  notes: item.is_non_compliant ? getDescription() : '',
  photo_urls: item.is_non_compliant ? getPhotos() : []
}));

// 3. Submit
await submitInspection(vehicleId, checklist.id, odometerReading, results);
```

### Fleet Manager: Review Failed Inspections
```typescript
const { data } = await supabase
  .from('inspections')
  .select('*, vehicle(*), inspector(*)')
  .eq('overall_status', 'fail')
  .order('inspection_date', { ascending: false });
```

---

## Alert Generation

| Status | Alert Severity | Alert Type |
|--------|---------------|------------|
| `fail` | `high` | `safety_risk` |
| `warning` | `medium` | `safety_risk` |
| `pass` | No alert | N/A |

---

## Requirements Covered

- ✅ **20.4**: Load checklist by vehicle type
- ✅ **20.5**: Mark items as compliant/non-compliant
- ✅ **20.6**: Require description for non-compliant items
