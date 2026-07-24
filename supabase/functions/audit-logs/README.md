# Audit Logs Edge Function

## Overview

Provides API endpoints for searching and exporting audit logs with comprehensive filtering capabilities.

**Task**: 15.7 Implement audit logging  
**Requirements**: 23.3, 23.4, 23.6

## Features

- Search audit logs with filters (date range, user, entity type, operation)
- Pagination support
- CSV export functionality
- Tenant isolation enforced
- Before/after value display for UPDATE operations

## Endpoints

### GET /audit-logs

Search audit logs with filters and pagination.

**Query Parameters:**
- `startDate` (optional): ISO date string - filter logs from this date
- `endDate` (optional): ISO date string - filter logs to this date
- `userId` (optional): UUID - filter logs by user
- `entityType` (optional): String - filter by entity type (vehicles, components, etc.)
- `operation` (optional): 'create' | 'update' | 'delete' - filter by operation type
- `page` (optional): Number - page number (default: 1)
- `pageSize` (optional): Number - results per page (default: 50)

**Response:**
```json
{
  "logs": [
    {
      "id": "uuid",
      "tenant_id": "uuid",
      "user_id": "uuid",
      "user_email": "user@example.com",
      "user_name": "John Doe",
      "operation": "update",
      "entity_type": "vehicles",
      "entity_id": "uuid",
      "changed_fields": {
        "status": {
          "old_value": "active",
          "new_value": "maintenance"
        }
      },
      "timestamp": "2025-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 50,
    "total": 150,
    "totalPages": 3
  }
}
```

### GET /audit-logs/export

Export audit logs to CSV format.

**Query Parameters:**
Same as search endpoint (except page/pageSize)

**Response:**
CSV file with columns:
- Timestamp
- User Email
- User Name
- Operation
- Entity Type
- Entity ID
- Changed Fields (JSON)

## Authentication

Requires valid Supabase JWT token in Authorization header:
```
Authorization: Bearer <token>
```

## Testing

### Test Search
```bash
curl -X GET "http://localhost:54321/functions/v1/audit-logs?entityType=vehicles&operation=update" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test Export
```bash
curl -X GET "http://localhost:54321/functions/v1/audit-logs/export?startDate=2025-01-01" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o audit_logs.csv
```

## Database Triggers

Audit logs are automatically populated by database triggers on all main tables:
- vehicles
- components
- odometer_readings
- work_orders
- labor_hours
- work_order_parts
- spare_parts
- vendors
- alerts
- documents
- inspections
- inspection_checklists
- users
- tenants

See migration: `20250615000000_create_audit_logging_triggers.sql`

## RLS Policies

Audit logs table has the following RLS policies:
- **SELECT**: Same tenant users (read-only)
- **INSERT**: System/service role only (via triggers)
- **UPDATE**: BLOCKED (immutability)
- **DELETE**: BLOCKED (immutability)

Minimum retention: 7 years (per Requirement 23.2)

## Error Handling

- **401 Unauthorized**: Missing or invalid JWT token
- **400 Bad Request**: Missing tenant_id in user metadata
- **500 Internal Server Error**: Database or processing error

## Performance Considerations

- Audit logs table has indexes on:
  - tenant_id
  - user_id
  - entity_type
  - entity_id
  - timestamp
  - operation
  - Composite: (tenant_id, entity_type, timestamp)

- Pagination recommended for large result sets
- Export may be slow for large date ranges (consider limiting export size)

## Compliance

This implementation satisfies:
- **Req 23.1**: Logs all CUD operations with timestamp, user, entity type, entity ID, changed fields
- **Req 23.2**: 7+ year retention (enforced by immutable RLS policies)
- **Req 23.3**: Search with filters (date, user, entity, operation)
- **Req 23.4**: Display before/after values for updates
- **Req 23.5**: Immutability enforced by RLS (already done in Task 2.5)
- **Req 23.6**: CSV export functionality
