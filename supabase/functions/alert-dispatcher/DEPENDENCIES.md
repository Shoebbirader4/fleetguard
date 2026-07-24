# Alert Dispatcher Dependencies

## Database Schema Requirements

The Alert Dispatcher function requires the `notification_jobs` table to exist. This table will be created in **Task 7.3** (Implement retry logic and delivery tracking).

### Required Schema

Until Task 7.3 is complete, you can create the table manually for testing:

```sql
-- Create notification_jobs table for message queue
CREATE TABLE notification_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  alert_id UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'sms', 'email', 'push')),
  recipient TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'sent', 'failed')),
  attempt INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX idx_notification_jobs_tenant_id ON notification_jobs(tenant_id);
CREATE INDEX idx_notification_jobs_alert_id ON notification_jobs(alert_id);
CREATE INDEX idx_notification_jobs_user_id ON notification_jobs(user_id);
CREATE INDEX idx_notification_jobs_status ON notification_jobs(status);
CREATE INDEX idx_notification_jobs_created_at ON notification_jobs(created_at DESC);

-- RLS Policy
CREATE POLICY "Tenant isolation for notification_jobs"
ON notification_jobs FOR ALL
USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Enable RLS
ALTER TABLE notification_jobs ENABLE ROW LEVEL SECURITY;

-- Add helpful comments
COMMENT ON TABLE notification_jobs IS 'Queue for multi-channel notification delivery with retry logic';
COMMENT ON COLUMN notification_jobs.channel IS 'Notification channel: whatsapp, sms, email, or push';
COMMENT ON COLUMN notification_jobs.status IS 'Job status: queued (waiting), processing (being sent), sent (delivered), failed (max retries exceeded)';
COMMENT ON COLUMN notification_jobs.attempt IS 'Number of delivery attempts (max 3)';
COMMENT ON COLUMN notification_jobs.payload IS 'Channel-specific payload with alert details and delivery parameters';
```

## Functionality Limitations

### Until Task 7.3 is Complete

The `alert-dispatcher` function will:
- ✅ Accept alert_id and user_ids
- ✅ Query user notification preferences
- ✅ Validate contact information per channel
- ✅ Create notification job records in the database
- ✅ Return delivery status

However, **notifications will not actually be sent** until:

1. **Task 7.3**: Notification jobs table and retry logic are implemented
2. **Task 7.2**: Channel-specific handlers (WhatsApp, SMS, Email, Push) are implemented

### Current Behavior

Jobs created by this function will remain in `queued` status until the processing workers are implemented in Tasks 7.2 and 7.3.

## Testing Without Dependencies

You can test the alert-dispatcher function with a mock notification_jobs table:

```bash
# 1. Create the notification_jobs table (see SQL above)
# 2. Create a test alert
# 3. Call the alert-dispatcher function
# 4. Query notification_jobs to verify jobs were created

# Example test flow:
curl -X POST https://your-project.supabase.co/functions/v1/alert-dispatcher \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "alert_id": "your-alert-uuid"
  }'

# Verify jobs were created:
# SELECT * FROM notification_jobs WHERE alert_id = 'your-alert-uuid';
```

## Related Tasks

- **Task 5.4** (Current): Create alert-dispatcher Edge Function ✅
- **Task 7.1**: Configure notification service providers (WhatsApp, SMS, Email, Push)
- **Task 7.2**: Implement channel-specific handlers in alert-dispatcher
- **Task 7.3**: Implement retry logic and delivery tracking (creates notification_jobs table)
