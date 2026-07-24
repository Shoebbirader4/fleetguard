# FleetGuard AI - Audit Logging Guide

## Overview

The audit logging system automatically tracks all data changes in FleetGuard AI, providing a complete and immutable audit trail for compliance, security, and troubleshooting.

**Task**: 15.7 Implement audit logging  
**Requirements**: 23.1, 23.3, 23.4, 23.6

---

## Features

✅ **Automatic Logging**: All CREATE, UPDATE, DELETE operations automatically logged  
✅ **Before/After Values**: See what changed in UPDATE operations  
✅ **Comprehensive Coverage**: 14 main tables tracked  
✅ **Immutable**: No one can modify or delete audit logs  
✅ **Search & Filter**: Find logs by date, user, entity type, operation  
✅ **CSV Export**: Export filtered logs for external analysis  
✅ **7+ Year Retention**: Compliant with long-term audit requirements  

---

## What Gets Logged

### Tracked Tables (14 total)
1. **vehicles** - Vehicle profile changes
2. **components** - Component installations, replacements
3. **odometer_readings** - Odometer updates
4. **work_orders** - Work order lifecycle
5. **labor_hours** - Labor tracking
6. **work_order_parts** - Parts consumption
7. **spare_parts** - Inventory changes
8. **vendors** - Vendor management
9. **alerts** - Alert creation, resolution
10. **documents** - Document uploads
11. **inspections** - Inspection records
12. **inspection_checklists** - Checklist configuration
13. **users** - User account changes
14. **tenants** - Tenant configuration

### Logged Information

For every operation, the system captures:
- **Timestamp**: When the change occurred
- **User**: Who made the change (email, name)
- **Operation**: CREATE, UPDATE, or DELETE
- **Entity Type**: Which table was affected
- **Entity ID**: Specific record ID
- **Changed Fields**: For UPDATEs - before and after values

---

## Accessing Audit Logs

### Web Interface

1. **Navigate to Audit Logs**
   ```
   URL: /audit-logs
   ```

2. **Apply Filters**
   - **Date Range**: Start Date and End Date
   - **Entity Type**: Select from dropdown (or "All Types")
   - **Operation**: Create, Update, Delete (or "All Operations")
   - **User**: Filter by specific user ID (optional)

3. **View Results**
   - Table shows: Timestamp, User, Operation, Entity Type, Entity ID
   - Click "Show Details" to see before/after values for UPDATEs

4. **Export to CSV**
   - Click "Export to CSV" button
   - CSV file downloads automatically
   - Filename: `audit_logs_YYYY-MM-DD.csv`

---

## Use Cases

### 1. Security Investigation
**Scenario**: Suspicious data modification  
**Steps**:
1. Set date range to incident timeframe
2. Filter by affected entity type (e.g., "vehicles")
3. Review who made changes and what was modified
4. Export report for security team

### 2. Compliance Audit
**Scenario**: Annual compliance review  
**Steps**:
1. Set date range to audit period (e.g., 2024-01-01 to 2024-12-31)
2. Export all logs to CSV
3. Provide CSV to auditors
4. Use filters to drill into specific areas if needed

### 3. Data Recovery Investigation
**Scenario**: User reports data was changed incorrectly  
**Steps**:
1. Filter by entity type (e.g., "work_orders")
2. Search for specific entity ID
3. Review UPDATE operations
4. See before/after values to identify what changed
5. Determine if change needs to be reverted

### 4. User Activity Monitoring
**Scenario**: Monitor specific user's actions  
**Steps**:
1. Filter by user ID
2. Review all operations performed by that user
3. Export report if needed

### 5. System Change Tracking
**Scenario**: Track configuration changes  
**Steps**:
1. Filter by entity types: "tenants", "inspection_checklists", "users"
2. Review administrative changes
3. Verify changes align with change management process

---

## Understanding Audit Log Details

### Operation Types

| Operation | Badge Color | Meaning |
|-----------|-------------|---------|
| CREATE | Green | New record was added |
| UPDATE | Blue | Existing record was modified |
| DELETE | Red | Record was removed |

### Changed Fields Format (UPDATE only)

When viewing UPDATE operation details, changed fields show:

```
Field Name:
  Before: old_value (shown in red with strikethrough)
  After: new_value (shown in green and bold)
```

**Example**:
```
status:
  Before: active
  After: maintenance

current_odometer:
  Before: 125000
  After: 125500
```

### System Operations

Operations performed by automated processes show:
- **User**: "System"
- **User Email**: "System"
- **User ID**: 00000000-0000-0000-0000-000000000000

Examples:
- Scheduled maintenance jobs
- GPS telemetry updates
- Automated alert generation

---

## CSV Export Format

### Columns
1. **Timestamp** - ISO 8601 format
2. **User Email** - Email of user who made change
3. **User Name** - Full name of user
4. **Operation** - CREATE, UPDATE, or DELETE
5. **Entity Type** - Table name
6. **Entity ID** - UUID of affected record
7. **Changed Fields** - JSON string of before/after values (UPDATE only)

### Example CSV
```csv
Timestamp,User Email,User Name,Operation,Entity Type,Entity ID,Changed Fields
2025-01-15T10:30:00Z,john@company.com,John Doe,UPDATE,vehicles,550e8400-e29b-41d4-a716-446655440000,"{""status"":{""old_value"":""active"",""new_value"":""maintenance""}}"
2025-01-15T09:15:00Z,jane@company.com,Jane Smith,CREATE,work_orders,660e8400-e29b-41d4-a716-446655440001,
```

---

## API Access (for Developers)

### Search Endpoint
```http
GET /functions/v1/audit-logs?startDate=2025-01-01&entityType=vehicles
Authorization: Bearer <jwt_token>
```

### Export Endpoint
```http
GET /functions/v1/audit-logs/export?startDate=2025-01-01&endDate=2025-01-31
Authorization: Bearer <jwt_token>
```

**Parameters**:
- `startDate` (optional) - ISO date string
- `endDate` (optional) - ISO date string
- `userId` (optional) - UUID
- `entityType` (optional) - Table name
- `operation` (optional) - create | update | delete
- `page` (optional) - Page number (search only)
- `pageSize` (optional) - Results per page (search only)

See `edge-functions/audit-logs/README.md` for full API documentation.

---

## Security & Permissions

### Who Can View Audit Logs?
- ✅ Read-only Auditor
- ✅ Company Owner
- ✅ Fleet Manager
- ✅ Super Admin

### Who Can Modify Audit Logs?
- ❌ **No one** - Audit logs are immutable

### Data Isolation
- Users can only view audit logs for their own tenant
- Cross-tenant access is impossible (enforced by RLS)

### Authentication
- JWT token required for all API access
- Web UI requires authenticated session

---

## Performance Tips

### For Large Datasets
1. **Use Date Filters**: Limit search to specific timeframes
2. **Filter by Entity Type**: Narrow down to specific tables
3. **Export in Chunks**: For large exports, use multiple date ranges
4. **Pagination**: Use pagination for browsing large result sets

### Recommended Limits
- **Web Search**: Default 50 records per page (configurable)
- **CSV Export**: Recommend limiting to 1-year periods for large tenants
- **API Calls**: Rate limited to 100 requests/minute per user

---

## Troubleshooting

### Issue: No audit logs appear
**Possible Causes**:
1. Filters too restrictive - try removing filters
2. No data changes in selected timeframe
3. RLS policy issue - verify user has correct permissions

**Solution**: Check filters and date range

### Issue: Changed fields showing "null"
**Cause**: Operation is CREATE or DELETE (not UPDATE)

**Explanation**: Only UPDATE operations have changed fields

### Issue: Export fails or takes too long
**Cause**: Too many records to export

**Solution**: Add date range filters to limit export size

### Issue: "System" user in logs
**Explanation**: Automated system operations (scheduled jobs, GPS updates)

**Action**: This is normal and expected for system-generated changes

---

## Compliance & Retention

### Regulatory Compliance
- **SOC 2**: Complete audit trail for all data changes ✅
- **GDPR**: User activity tracking and data modification history ✅
- **ISO 27001**: Security event logging ✅
- **Industry Standards**: 7+ year retention requirement ✅

### Retention Policy
- **Minimum**: 7 years (per Requirement 23.2)
- **Actual**: Indefinite (no automatic deletion)
- **Deletion**: Only Super Admin can delete (via manual SQL - not recommended)

### Immutability
- No user (including Super Admin) can modify existing audit logs via UI/API
- Database policies enforce immutability
- Only database triggers can insert new logs

---

## Best Practices

### For Auditors
1. **Regular Exports**: Export logs monthly for offline archive
2. **Spot Checks**: Review random samples regularly
3. **Anomaly Detection**: Look for unusual patterns (e.g., mass deletions)
4. **User Activity**: Monitor high-privilege user actions

### For Fleet Managers
1. **Incident Investigation**: Use audit logs to trace issues
2. **Training**: Review logs to identify user mistakes
3. **Verification**: Confirm critical changes were made correctly

### For System Administrators
1. **Security Monitoring**: Review system user actions
2. **Change Management**: Track configuration changes
3. **Backup Verification**: Use logs to verify backup/restore operations

---

## FAQs

**Q: Can I delete audit logs?**  
A: No, audit logs are immutable for compliance. Only database-level deletion by Super Admin is possible (not recommended).

**Q: How long are audit logs stored?**  
A: Minimum 7 years (per requirements). Currently stored indefinitely.

**Q: Can I see who viewed audit logs?**  
A: No, audit logs only track data modifications (CUD), not read operations.

**Q: What if I need to export millions of records?**  
A: Use API with date range filters to export in chunks. Web UI export is limited to filtered results.

**Q: Are password changes logged?**  
A: User table changes are logged, but password hashes are not visible in changed fields (security).

**Q: Can I restore from audit logs?**  
A: Audit logs show what changed but don't automatically restore. Use before/after values to manually revert changes if needed.

---

## Support

For technical support or questions:
- **Documentation**: `/docs/AUDIT_LOGGING_GUIDE.md`
- **API Docs**: `/edge-functions/audit-logs/README.md`
- **Completion Summary**: `/TASK_15.7_AUDIT_LOGGING_COMPLETION.md`

---

**Last Updated**: January 2025  
**Version**: 1.0  
**Status**: Production Ready
