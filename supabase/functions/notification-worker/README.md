# Notification Worker

Background worker Edge Function that processes queued notification jobs created by the alert-dispatcher.

## Purpose

This function continuously processes notification jobs from the `notification_jobs` table and delivers them through the appropriate channels (WhatsApp, SMS, Email, Push).

## How It Works

1. **Fetch Queued Jobs**: Retrieves jobs with `status='queued'` from the database
2. **Exponential Backoff**: Respects retry delays (1min, 5min, 15min) based on attempt count
3. **Channel Routing**: Routes each job to the appropriate handler (WhatsApp, SMS, Email, Push)
4. **Status Update**: Updates job status to `sent` or `failed` based on delivery result
5. **Retry Logic**: Automatically retries failed jobs up to 3 times

## Invocation Methods

### 1. Cron Job (Recommended)

Configure in `supabase/config.toml`:

```toml
[edge_runtime.functions.notification-worker]
verify_jwt = false

[edge_runtime.cron]
notification_worker = "* * * * *"  # Run every minute
```

### 2. Manual Trigger

```bash
curl -X POST https://your-project.supabase.co/functions/v1/notification-worker \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

### 3. Webhook (from alert-dispatcher)

The alert-dispatcher can optionally trigger this function after creating jobs:

```typescript
await fetch('https://your-project.supabase.co/functions/v1/notification-worker', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
  },
});
```

## Environment Variables

The notification worker requires the following environment variables:

### WhatsApp (WhatsApp Business API)

```bash
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_API_TOKEN=your_whatsapp_access_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
```

### SMS (Twilio)

```bash
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

### Email (SendGrid)

```bash
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@fleetguard.ai
SENDGRID_FROM_NAME=FleetGuard AI
```

### Push Notifications (Firebase Cloud Messaging)

```bash
FCM_SERVER_KEY=your_fcm_server_key
```

## Channel Handlers

### WhatsApp Handler

- Uses WhatsApp Business API
- Sends template messages for structured notifications
- Requires pre-approved message templates
- Format: `alert_notification` template with title and description parameters

**Example Template Setup:**
```
Template Name: alert_notification
Category: ALERT_UPDATE
Language: English
Body: *{{1}}* - {{2}}
```

### SMS Handler

- Uses Twilio API
- Sends plain text messages
- Format: `[SEVERITY] Title: Description`
- Example: `[HIGH] Brake Maintenance Due: Vehicle ABC-123 requires brake inspection within 5 days.`

### Email Handler

- Uses SendGrid API
- Sends HTML formatted emails with FleetGuard branding
- Includes severity badge, alert details, and call-to-action button
- Responsive design for mobile and desktop

### Push Notification Handler

- Uses Firebase Cloud Messaging (FCM)
- Sends push notifications to mobile apps
- Includes notification title, body, and custom data payload
- Supports high-priority delivery for critical alerts

## Retry Logic

The worker implements exponential backoff for failed deliveries:

| Attempt | Delay    | Total Time |
|---------|----------|------------|
| 1       | 0 sec    | 0 sec      |
| 2       | 1 min    | 1 min      |
| 3       | 5 min    | 6 min      |
| Failed  | -        | -          |

After 3 failed attempts, jobs are marked as `status='failed'` and will not be retried.

## Monitoring

### Check Job Status

```sql
-- View pending jobs
SELECT channel, COUNT(*) 
FROM notification_jobs 
WHERE status = 'queued'
GROUP BY channel;

-- View failed jobs
SELECT * 
FROM notification_jobs 
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 10;

-- View success rate by channel
SELECT 
  channel,
  COUNT(*) FILTER (WHERE status = 'sent') as sent,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'sent') / COUNT(*), 2) as success_rate
FROM notification_jobs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY channel;
```

### Logs

View Edge Function logs in Supabase Dashboard:
- Functions → notification-worker → Logs

Look for:
- `[Handler] Starting to process queued jobs...`
- `[Handler] Found X queued jobs`
- `[WhatsApp/SMS/Email/Push Handler] Message sent successfully`
- `[Handler] Job X completed successfully`
- `[Handler] Job X failed, will retry`

## Error Handling

Common errors and solutions:

| Error | Cause | Solution |
|-------|-------|----------|
| `WhatsApp API credentials not configured` | Missing env vars | Set `WHATSAPP_API_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` |
| `Twilio API credentials not configured` | Missing env vars | Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` |
| `SendGrid API key not configured` | Missing env vars | Set `SENDGRID_API_KEY` |
| `FCM server key not configured` | Missing env vars | Set `FCM_SERVER_KEY` |
| `Template not found` | WhatsApp template not approved | Create and approve template in Meta Business Manager |
| `Invalid phone number` | Phone format incorrect | Ensure phone number includes country code (e.g., 919876543210) |

## Testing

### Test Individual Channels

Create test jobs manually:

```sql
-- Test WhatsApp
INSERT INTO notification_jobs (tenant_id, alert_id, user_id, channel, recipient, payload)
SELECT 
  tenant_id,
  id as alert_id,
  (SELECT id FROM users WHERE role = 'fleet_manager' LIMIT 1) as user_id,
  'whatsapp' as channel,
  '919876543210' as recipient,
  jsonb_build_object(
    'template', 'alert_notification',
    'title', 'Test Alert',
    'description', 'This is a test notification'
  ) as payload
FROM alerts LIMIT 1;

-- Trigger worker
-- Then check job status
SELECT * FROM notification_jobs ORDER BY created_at DESC LIMIT 1;
```

## Requirements Coverage

- ✅ **Requirement 10.2**: Deliver alerts via WhatsApp, SMS, Email, and mobile app push notifications
- ✅ **Requirement 10.3**: Send notifications to all users with appropriate role permissions within 60 seconds
- ✅ **Requirement 10.5**: Track alert delivery status and retry failed deliveries up to 3 times

## Integration with Alert Dispatcher

The notification worker works in tandem with the alert-dispatcher:

1. **Alert Dispatcher**: Creates notification jobs in `notification_jobs` table
2. **Notification Worker**: Processes queued jobs and delivers messages
3. **Status Tracking**: Both functions update job status throughout the lifecycle

```
User/System
    ↓
Alert Generated
    ↓
alert-dispatcher (creates jobs)
    ↓
notification_jobs table (queued)
    ↓
notification-worker (processes jobs)
    ↓
External APIs (WhatsApp/Twilio/SendGrid/FCM)
    ↓
Delivered (status=sent)
```

## Deployment

1. Deploy the notification-worker function:
```bash
supabase functions deploy notification-worker
```

2. Set environment variables:
```bash
supabase secrets set WHATSAPP_API_TOKEN=xxx
supabase secrets set TWILIO_ACCOUNT_SID=xxx
# ... etc
```

3. Configure cron job in `config.toml`

4. Test with manual trigger

## Future Enhancements

- [ ] Support for multiple WhatsApp templates (maintenance, critical, due-soon, etc.)
- [ ] SMS fallback for failed WhatsApp deliveries
- [ ] Email click tracking and open rates
- [ ] Push notification click tracking
- [ ] Webhook callbacks for delivery confirmations
- [ ] Rate limiting per channel (e.g., max 100 SMS per hour)
- [ ] Cost tracking per channel per tenant
- [ ] A/B testing for message formats
