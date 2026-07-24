# Alert Dispatcher Edge Function

## Overview

The Alert Dispatcher Edge Function routes alerts to appropriate notification channels based on user preferences. It creates notification jobs for each enabled channel per user, which will be processed by channel-specific handlers (implemented in task 7.2).

## Requirements

Satisfies the following requirements:

- **Requirement 10.2**: Deliver alerts via WhatsApp, SMS, Email, and mobile app push notifications
- **Requirement 10.3**: Send notifications to all users with appropriate role permissions within 60 seconds
- **Requirement 10.4**: Allow users to configure notification preferences per alert type and delivery channel

## Architecture

The Alert Dispatcher follows a message queue pattern:

1. Accept alert_id and optional user_ids
2. Query alert details and user notification preferences
3. Create notification jobs in the `notification_jobs` table for each channel
4. Return delivery status tracking for each channel

**Note**: This function does NOT send notifications directly. It enqueues jobs that will be processed by channel-specific handlers implemented in task 7.2.

## API Specification

### Endpoint

```
POST /alert-dispatcher
```

### Authentication

Requires a valid JWT token in the `Authorization` header.

**Required Permission**: `alerts:create`

**Allowed Roles**:
- company_owner
- fleet_manager
- workshop_manager
- maintenance_engineer

### Request Body

```typescript
{
  alert_id: string;           // Required: UUID of the alert to dispatch
  user_ids?: string[];        // Optional: Specific users to notify. If not provided, derives from alert
  channels?: string[];        // Optional: Override channels ('whatsapp' | 'sms' | 'email' | 'push')
}
```

### Response

**Success (201 Created)**:

```json
{
  "alert_id": "uuid",
  "jobs_created": 12,
  "delivery_status": [
    {
      "user_id": "uuid",
      "channels": [
        {
          "channel": "email",
          "status": "queued",
          "job_id": "uuid"
        },
        {
          "channel": "push",
          "status": "queued",
          "job_id": "uuid"
        },
        {
          "channel": "sms",
          "status": "skipped",
          "reason": "No phone number configured"
        }
      ]
    }
  ]
}
```

**Error Responses**:

- `400 Bad Request`: Missing or invalid parameters
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: User lacks required permissions
- `404 Not Found`: Alert not found
- `500 Internal Server Error`: Server error

## User Notification Preferences

Users configure notification preferences in the `users.notification_preferences` JSONB field:

```json
{
  "due_soon": ["email", "push"],
  "overdue": ["email", "sms", "push"],
  "critical_failure_risk": ["email", "sms", "whatsapp", "push"],
  "safety_risk": ["email", "sms", "whatsapp", "push"],
  "low_stock": ["email"],
  "document_expiry": ["email", "push"],
  "document_expired": ["email", "sms"],
  "tire_replacement_forecast": ["email"]
}
```

**Default Behavior**: If no preferences are set for an alert type, the system defaults to email only.

## Role-Based Notification Routing

When `user_ids` is not provided, the function derives recipients based on alert severity:

| Severity  | Roles Notified                                                              |
|-----------|-----------------------------------------------------------------------------|
| Critical  | company_owner, fleet_manager, workshop_manager, maintenance_engineer        |
| High      | company_owner, fleet_manager, workshop_manager, maintenance_engineer        |
| Medium    | fleet_manager, workshop_manager, maintenance_engineer                       |
| Low       | maintenance_engineer, workshop_manager                                      |

## Channel Validation

Before enqueueing a notification job, the function validates that the user has the required contact information:

| Channel   | Required Field      | Validation                     |
|-----------|---------------------|--------------------------------|
| whatsapp  | phone               | Must be set and non-empty      |
| sms       | phone               | Must be set and non-empty      |
| email     | email               | Must be set and non-empty      |
| push      | fcm_token           | Must be set and non-empty      |

If validation fails, the channel is skipped with a reason in the response.

## Notification Job Schema

Jobs are created in the `notification_jobs` table (to be created in task 7.3):

```sql
CREATE TABLE notification_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  alert_id UUID NOT NULL REFERENCES alerts(id),
  user_id UUID NOT NULL REFERENCES users(id),
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'sms', 'email', 'push')),
  recipient TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'processing', 'sent', 'failed')),
  attempt INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## Payload Formats

### WhatsApp

```json
{
  "alert_id": "uuid",
  "alert_type": "overdue",
  "severity": "high",
  "title": "Overdue: Brake Replacement",
  "description": "...",
  "user_name": "John Doe",
  "template": "alert_notification",
  "params": ["Overdue: Brake Replacement", "..."]
}
```

### SMS

```json
{
  "alert_id": "uuid",
  "alert_type": "overdue",
  "severity": "high",
  "title": "Overdue: Brake Replacement",
  "description": "...",
  "user_name": "John Doe",
  "body": "[HIGH] Overdue: Brake Replacement: ..."
}
```

### Email

```json
{
  "alert_id": "uuid",
  "alert_type": "overdue",
  "severity": "high",
  "title": "Overdue: Brake Replacement",
  "description": "...",
  "user_name": "John Doe",
  "template_id": "alert_template",
  "subject": "[FleetGuard] Overdue: Brake Replacement",
  "html_content": "<h2>Fleet Alert: ...</h2>..."
}
```

### Push Notification

```json
{
  "alert_id": "uuid",
  "alert_type": "overdue",
  "severity": "high",
  "title": "Overdue: Brake Replacement",
  "description": "...",
  "user_name": "John Doe",
  "notification": {
    "title": "Overdue: Brake Replacement",
    "body": "..."
  },
  "data": {
    "alert_id": "uuid",
    "alert_type": "overdue",
    "severity": "high"
  }
}
```

## Usage Examples

### Example 1: Dispatch Alert to All Eligible Users

```bash
curl -X POST https://your-project.supabase.co/functions/v1/alert-dispatcher \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "alert_id": "123e4567-e89b-12d3-a456-426614174000"
  }'
```

### Example 2: Dispatch Alert to Specific Users

```bash
curl -X POST https://your-project.supabase.co/functions/v1/alert-dispatcher \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "alert_id": "123e4567-e89b-12d3-a456-426614174000",
    "user_ids": [
      "user-uuid-1",
      "user-uuid-2"
    ]
  }'
```

### Example 3: Override Channels (Send via Email Only)

```bash
curl -X POST https://your-project.supabase.co/functions/v1/alert-dispatcher \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "alert_id": "123e4567-e89b-12d3-a456-426614174000",
    "channels": ["email"]
  }'
```

## Integration with Maintenance Scheduler

The `maintenance-scheduler` Edge Function (task 5.3) creates alerts when components are due or overdue. Those alerts can be automatically dispatched using this function:

```typescript
// In maintenance-scheduler after creating an alert
const alertId = createdAlert.id;

// Dispatch notification to all eligible users
await fetch('https://your-project.supabase.co/functions/v1/alert-dispatcher', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    alert_id: alertId,
  }),
});
```

## Testing

See `test.ts` for unit tests.

Run tests locally:

```bash
cd supabase/functions/alert-dispatcher
deno test --allow-env --allow-net test.ts
```

## Future Enhancements

- **Task 7.3**: Implement retry logic and delivery tracking with exponential backoff (✅ Implemented in notification-worker)
- Support for multiple WhatsApp templates (maintenance, critical, due-soon, etc.)
- SMS fallback for failed WhatsApp deliveries
- Email click tracking and open rates
- Push notification click tracking

## Channel-Specific Handlers (Task 7.2 - ✅ Completed)

The channel-specific handlers are implemented in:
- `handlers.ts` - Channel delivery functions (WhatsApp, SMS, Email, Push)
- `notification-worker/index.ts` - Background worker that processes queued jobs

See [handlers.ts](./handlers.ts) and [notification-worker README](../notification-worker/README.md) for details.

## Dependencies

- `@supabase/supabase-js@2.39.3`
- `../shared/auth/permissions.ts`
- `../_shared/auth-middleware.ts`

## Environment Variables

- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key (for bypassing RLS)

## Related Documentation

- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Requirements Document](../../../.kiro/specs/fleetguard-ai/requirements.md) - Requirement 10
- [Design Document](../../../.kiro/specs/fleetguard-ai/design.md) - Multi-Channel Notification System
