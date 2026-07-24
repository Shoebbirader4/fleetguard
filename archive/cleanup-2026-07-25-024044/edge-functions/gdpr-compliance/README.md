# GDPR Compliance Edge Function

## Overview

This edge function implements GDPR compliance features for FleetGuard AI, providing data portability and the right to deletion as required by GDPR Articles 17 and 20.

**Task:** 17.4 Implement GDPR compliance features  
**Requirement:** 28.6 - GDPR data privacy requirements

## Features

### 1. Data Export (GDPR Article 20 - Right to Data Portability)

Allows authenticated users to export all data associated with their tenant in a structured, machine-readable format (JSON).

**Endpoint:** `POST /gdpr-compliance/export-data`

**Request Body:**
```json
{
  "format": "json",
  "tables": ["vehicles", "components", "work_orders"]  // Optional: specify tables
}
```

**Response:**
```json
{
  "metadata": {
    "exportDate": "2024-01-15T10:30:00.000Z",
    "tenantId": "uuid",
    "tenantName": "Example Fleet Company",
    "exportedBy": "user@example.com",
    "format": "json",
    "tables": ["vehicles", "components", "work_orders", "..."]
  },
  "data": {
    "vehicles": {
      "records": [...],
      "count": 150
    },
    "components": {
      "records": [...],
      "count": 3500
    },
    "work_orders": {
      "records": [...],
      "count": 890
    }
    // ... all other tables
  }
}
```

**Exported Tables:**
- `vehicles` - All vehicle records
- `components` - All component records
- `odometer_readings` - All odometer readings
- `work_orders` - All work orders
- `work_order_labor` - Labor records
- `work_order_parts` - Parts consumed records
- `alerts` - All alerts
- `inspections` - All inspections
- `inspection_checklists` - Inspection templates
- `spare_parts` - Parts inventory
- `purchase_orders` - Purchase orders
- `vendors` - Vendor information
- `documents` - Document metadata (not file contents)
- `predictions` - ML predictions
- `gps_history` - GPS tracking data
- `users` - User accounts
- `audit_logs` - Complete audit trail

**Security:**
- Only authenticated users can export data
- Row-Level Security (RLS) ensures only tenant's data is exported
- Export action is logged to audit_logs
- Rate limited to 100 requests/minute per user

### 2. Data Deletion (GDPR Article 17 - Right to Erasure)

Allows company owners and super admins to delete all tenant data permanently.

**Endpoint:** `POST /gdpr-compliance/request-deletion`

**Request Body:**
```json
{
  "confirmDeletion": true,
  "reason": "Company ceased operations and requests data deletion under GDPR Article 17"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Tenant data successfully deleted",
  "deletionSummary": {
    "tenantId": "uuid",
    "totalRecords": 5420,
    "tableRecordCounts": {
      "vehicles": 150,
      "components": 3500,
      "work_orders": 890,
      "alerts": 450,
      "users": 25,
      // ... all tables
    }
  },
  "deletionDate": "2024-01-15T10:30:00.000Z",
  "note": "Audit logs have been preserved for compliance purposes (7-year retention)"
}
```

**Security:**
- Only `company_owner` and `super_admin` roles can delete tenant data
- Deletion must be explicitly confirmed (`confirmDeletion: true`)
- Deletion reason (minimum 10 characters) is required
- Deletion request is logged to audit_logs BEFORE deletion
- Audit logs are preserved for 7-year compliance retention
- CASCADE constraints automatically delete all related records

**⚠️ WARNING:** This operation is IRREVERSIBLE. All tenant data will be permanently deleted.

### 3. Data Summary

Get a summary of stored data without exporting the full dataset.

**Endpoint:** `GET /gdpr-compliance/data-summary`

**Response:**
```json
{
  "tenantId": "uuid",
  "totalRecords": 5420,
  "tableRecordCounts": {
    "vehicles": 150,
    "components": 3500,
    "work_orders": 890,
    "alerts": 450,
    "inspections": 320,
    "spare_parts": 85,
    "vendors": 15,
    "documents": 180,
    "users": 25,
    "audit_logs": 8905
  }
}
```

**Security:**
- Only authenticated users can view summary
- RLS ensures only tenant's data is counted

## Authentication

All endpoints require a valid Supabase JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

## Rate Limiting

All endpoints are rate limited to **100 requests per minute per user** (Requirement 28.4).

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1705315200
```

## Deployment

### Deploy to Supabase

```bash
cd edge-functions
supabase functions deploy gdpr-compliance
```

### Set Environment Variables

Required environment variables:
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (for admin operations)

These are automatically set by Supabase when deploying.

## Testing

### Test Data Export

```bash
curl -X POST https://your-project.supabase.co/functions/v1/gdpr-compliance/export-data \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{"format": "json"}'
```

### Test Data Summary

```bash
curl -X GET https://your-project.supabase.co/functions/v1/gdpr-compliance/data-summary \
  -H "Authorization: Bearer <jwt_token>"
```

### Test Data Deletion (BE CAREFUL!)

```bash
curl -X POST https://your-project.supabase.co/functions/v1/gdpr-compliance/request-deletion \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "confirmDeletion": true,
    "reason": "Test deletion request for GDPR compliance verification"
  }'
```

⚠️ **WARNING:** Only test deletion with test data, never in production!

## GDPR Compliance Details

### GDPR Article 20 - Right to Data Portability

✅ **Compliance Status:** Fully Implemented

The data export endpoint allows users to:
- Obtain a copy of all their personal data
- Receive data in a structured, commonly used format (JSON)
- Export data for transfer to another system

### GDPR Article 17 - Right to Erasure

✅ **Compliance Status:** Fully Implemented

The data deletion endpoint allows users to:
- Request complete deletion of all personal data
- Receive confirmation of deletion
- Have data permanently removed from active systems

**Audit Log Retention:**
Per GDPR Article 17(3)(b) and legal compliance requirements, audit logs are retained for 7 years even after tenant deletion. This is a legitimate interest for:
- Compliance with legal obligations
- Establishment, exercise, or defense of legal claims
- Fraud prevention and detection

### Data Processing Records

All GDPR operations are logged:
- Export requests: logged to `audit_logs` with export metadata
- Deletion requests: logged BEFORE deletion with reason and summary
- Access to data: tracked via authentication logs

## Security Considerations

### Multi-Tenant Isolation

- Row-Level Security (RLS) policies ensure tenant data isolation
- Even with admin access, only tenant's own data can be exported
- Cross-tenant data access is prevented at the database level

### Audit Trail

- All GDPR operations are logged to `audit_logs` table
- Logs are immutable (cannot be modified or deleted by users)
- 7-year retention policy for compliance

### Authorization

- **Export:** Any authenticated user can export their tenant's data
- **Delete:** Only `company_owner` and `super_admin` roles can delete
- **Summary:** Any authenticated user can view data summary

### Data Retention

After deletion:
- ✅ All tenant records are permanently deleted (CASCADE)
- ✅ User accounts are removed
- ✅ All related data is deleted
- ⚠️ Audit logs are preserved (7-year legal retention)

## Error Handling

### Common Errors

**401 Unauthorized**
```json
{
  "error": "Missing authorization header"
}
```

**403 Forbidden**
```json
{
  "error": "Insufficient permissions. Only company_owner or super_admin can delete tenant data."
}
```

**400 Bad Request**
```json
{
  "error": "Deletion must be explicitly confirmed by setting confirmDeletion to true"
}
```

**429 Too Many Requests**
```json
{
  "error": "Rate limit exceeded. Please try again later."
}
```

### Error Recovery

- Transient errors: Retry with exponential backoff
- Rate limit errors: Wait for reset time indicated in headers
- Permission errors: Contact admin to verify role permissions

## Privacy Policy Integration

This edge function implements the technical requirements for GDPR compliance. Organizations should also:

1. **Update Privacy Policy** to include:
   - Data collection practices
   - Data storage duration
   - Data portability rights
   - Right to erasure procedures
   - Contact information for data protection officer

2. **Update Terms of Service** to include:
   - Data processing agreement
   - User rights under GDPR
   - Data deletion procedures
   - Audit log retention policy

3. **Provide User Documentation:**
   - How to export data
   - How to request data deletion
   - What data is collected and why
   - Data retention policies

## Support

For GDPR compliance questions or issues:
- Technical Support: Contact your system administrator
- Data Protection: Contact your Data Protection Officer (DPO)
- Legal Questions: Consult with legal counsel

## References

- [GDPR Article 17 - Right to Erasure](https://gdpr-info.eu/art-17-gdpr/)
- [GDPR Article 20 - Right to Data Portability](https://gdpr-info.eu/art-20-gdpr/)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [GDPR Compliance Best Practices](https://gdpr.eu/compliance/)
