# FleetGuard AI Notification Service Documentation

## Overview

This directory contains comprehensive setup guides and documentation for the FleetGuard AI multi-channel notification system.

FleetGuard AI delivers alerts through four notification channels:
- 📱 **WhatsApp Business API** - For WhatsApp messages
- 💬 **Twilio SMS** - For SMS text messages  
- 📧 **SendGrid Email** - For email notifications
- 🔔 **Firebase Cloud Messaging (FCM)** - For mobile push notifications

---

## Documentation Structure

### 📘 Setup Guides

1. **[SETUP_MASTER_GUIDE.md](./SETUP_MASTER_GUIDE.md)** - **Start Here**
   - Overview of all notification channels
   - Quick start checklist
   - Environment variables reference
   - Testing procedures
   - Cost estimates
   - Production deployment checklist

2. **[SENDGRID_EMAIL_SETUP.md](./SENDGRID_EMAIL_SETUP.md)**
   - SendGrid account creation
   - Sender authentication (single sender & domain)
   - API key generation
   - Email template design
   - Testing and troubleshooting
   - **Recommended for first-time setup** (easiest)

3. **[TWILIO_SMS_SETUP.md](./TWILIO_SMS_SETUP.md)**
   - Twilio account creation
   - Phone number purchase
   - API credentials
   - Messaging service configuration
   - Testing and troubleshooting

4. **[WHATSAPP_SETUP.md](./WHATSAPP_SETUP.md)**
   - Facebook Business App creation
   - WhatsApp Business API setup
   - Phone number configuration
   - Message template creation and approval
   - Testing and troubleshooting
   - **Note:** Template approval takes 1-2 business days

5. **[FCM_PUSH_SETUP.md](./FCM_PUSH_SETUP.md)**
   - Firebase project creation
   - Android and iOS app registration
   - APNs configuration (iOS)
   - React Native Firebase integration
   - Testing and troubleshooting

---

## Quick Start

### Prerequisites

- [ ] Access to FleetGuard AI codebase
- [ ] Supabase project set up
- [ ] `.env` file from `.env.example`

### Recommended Setup Order

**Phase 1: Email** (20 minutes)
- Easiest to set up and test
- Free tier available
- Follow: [SENDGRID_EMAIL_SETUP.md](./SENDGRID_EMAIL_SETUP.md)

**Phase 2: SMS** (15 minutes)
- Simple setup process
- Instant delivery
- Follow: [TWILIO_SMS_SETUP.md](./TWILIO_SMS_SETUP.md)

**Phase 3: Push Notifications** (30 minutes)
- Mobile app integration required
- Free service
- Follow: [FCM_PUSH_SETUP.md](./FCM_PUSH_SETUP.md)

**Phase 4: WhatsApp** (45 minutes + approval wait)
- Most complex setup
- Requires template approval (1-2 business days)
- Follow: [WHATSAPP_SETUP.md](./WHATSAPP_SETUP.md)

---

## Configuration Overview

### Environment Variables

All notification channels are configured via environment variables in `.env`:

```bash
# WhatsApp Business API
WHATSAPP_API_URL=https://graph.facebook.com/v17.0
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_API_TOKEN=your_access_token
WHATSAPP_BUSINESS_ACCOUNT_ID=your_account_id

# Twilio SMS
TWILIO_ACCOUNT_SID=ACxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# SendGrid Email
SENDGRID_API_KEY=SG.xxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@fleetguard.ai
SENDGRID_FROM_NAME=FleetGuard AI

# Firebase Cloud Messaging
FCM_SERVER_KEY=AAAAxxxxxxxxx
FCM_PROJECT_ID=your-project-id
```

See [SETUP_MASTER_GUIDE.md](./SETUP_MASTER_GUIDE.md#environment-variables-reference) for complete configuration.

---

## System Architecture

### Notification Flow

```
Alert Generated
    ↓
alert-dispatcher (Edge Function)
    ↓
Create notification_jobs
    ↓
notification-worker (Edge Function)
    ↓
Channel Handlers (WhatsApp/SMS/Email/Push)
    ↓
Update job status (sent/failed)
```

### Key Components

1. **alert-dispatcher** - Creates notification jobs based on alert and user preferences
2. **notification-worker** - Processes queued jobs and calls channel handlers
3. **handlers.ts** - Channel-specific delivery implementations
4. **config.ts** - Configuration validation and management
5. **notification_jobs table** - Job queue and delivery tracking

---

## Testing

### Quick Test Commands

After configuring a channel, test it using:

```bash
# Test email
curl -X POST https://your-project.supabase.co/functions/v1/alert-dispatcher \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"alert_id": "test", "channels": ["email"]}'

# Test SMS
curl -X POST https://your-project.supabase.co/functions/v1/alert-dispatcher \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"alert_id": "test", "channels": ["sms"]}'

# Test WhatsApp
curl -X POST https://your-project.supabase.co/functions/v1/alert-dispatcher \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"alert_id": "test", "channels": ["whatsapp"]}'

# Test push
curl -X POST https://your-project.supabase.co/functions/v1/alert-dispatcher \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"alert_id": "test", "channels": ["push"]}'
```

### Validation

Check configuration status:

```typescript
import { validateNotificationConfig } from '../supabase/functions/shared/notifications/config.ts';

const validation = validateNotificationConfig();
console.log(`Configured: ${validation.configuredChannels.join(', ')}`);
console.log(`Unconfigured: ${validation.unconfiguredChannels.join(', ')}`);
```

---

## Troubleshooting

### Common Issues

#### Environment Variables Not Loaded

**Solution:**
1. Verify `.env` file exists in project root
2. Restart Supabase local development
3. For deployed functions, update environment variables in Supabase Dashboard

#### Notifications Not Sending

**Checklist:**
- [ ] Environment variables configured correctly
- [ ] Channel-specific credentials valid
- [ ] Recipient has valid contact information
- [ ] Check `notification_jobs` table for errors
- [ ] Review Edge Function logs

#### Delivery Failures

Check the `notification_jobs` table:

```sql
SELECT channel, status, error_message, attempt
FROM notification_jobs
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 10;
```

### Channel-Specific Issues

- **Email Issues**: See [SENDGRID_EMAIL_SETUP.md - Troubleshooting](./SENDGRID_EMAIL_SETUP.md#troubleshooting)
- **SMS Issues**: See [TWILIO_SMS_SETUP.md - Troubleshooting](./TWILIO_SMS_SETUP.md#troubleshooting)
- **WhatsApp Issues**: See [WHATSAPP_SETUP.md - Troubleshooting](./WHATSAPP_SETUP.md#troubleshooting)
- **Push Issues**: See [FCM_PUSH_SETUP.md - Troubleshooting](./FCM_PUSH_SETUP.md#troubleshooting)

---

## Cost Overview

### Estimated Monthly Costs (1000 alerts/month)

| Channel | Cost per Message | Monthly Cost (1000 alerts) |
|---------|-----------------|----------------------------|
| **Email** (SendGrid) | $0 (free tier) | **$0** |
| **SMS** (Twilio) | ~$0.0079 | **~$8** |
| **WhatsApp** | ~$0.01 | **~$10** |
| **Push** (FCM) | $0 (free) | **$0** |

**Total estimated cost: ~$18/month for 1000 alerts across all channels**

See [SETUP_MASTER_GUIDE.md - Cost Estimation](./SETUP_MASTER_GUIDE.md#cost-estimation) for detailed breakdown.

---

## Monitoring

### Check Delivery Rates

```sql
-- Delivery rate by channel (last 7 days)
SELECT 
  channel,
  COUNT(*) as total,
  SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as delivered,
  ROUND(100.0 * SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) / COUNT(*), 2) as delivery_rate
FROM notification_jobs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY channel;
```

### Monitor Failed Jobs

```sql
-- Failed jobs summary
SELECT 
  channel,
  error_message,
  COUNT(*) as count
FROM notification_jobs
WHERE status = 'failed'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY channel, error_message
ORDER BY count DESC;
```

---

## Best Practices

### 1. Channel Priority

Use appropriate channels based on alert severity:

- **Critical Alerts**: SMS + Push + WhatsApp
- **High Priority**: Email + Push
- **Medium Priority**: Email
- **Low Priority**: Email (batch daily digest)

### 2. Rate Limiting

Implement rate limits to prevent spam:
- Maximum 10 SMS per user per day
- Maximum 50 emails per user per day
- Respect user preferences and opt-outs

### 3. User Preferences

Allow users to configure:
- Which channels to receive notifications on
- Alert types they want to be notified about
- Quiet hours (no notifications during sleep hours)
- Frequency preferences (instant vs. digest)

### 4. Security

- Store API keys in environment variables only
- Never commit credentials to version control
- Rotate API keys periodically
- Use service accounts for production
- Implement input validation

---

## Production Deployment

### Pre-Deployment Checklist

- [ ] All channels tested in development
- [ ] Environment variables configured for production
- [ ] Domain authentication completed (Email)
- [ ] WhatsApp templates approved
- [ ] Monitoring dashboards set up
- [ ] Error alerting configured
- [ ] Budget alerts configured
- [ ] User preferences UI implemented
- [ ] Unsubscribe functionality implemented
- [ ] Privacy policy updated

### Deployment Steps

1. **Configure Production Environment Variables**
   - Update Supabase Edge Function secrets
   - Verify all credentials are for production accounts

2. **Deploy Edge Functions**
   ```bash
   supabase functions deploy alert-dispatcher
   supabase functions deploy notification-worker
   ```

3. **Set Up Cron Job**
   - Configure notification-worker to run every minute
   - Use Supabase Cron or external scheduler

4. **Monitor Deployment**
   - Check Edge Function logs
   - Verify notifications are being sent
   - Monitor delivery rates

---

## Support

### Internal Resources

- **Code Location**: `supabase/functions/alert-dispatcher/`, `supabase/functions/notification-worker/`
- **Configuration**: `supabase/functions/shared/notifications/config.ts`
- **Handlers**: `supabase/functions/alert-dispatcher/handlers.ts`

### External Documentation

- [WhatsApp Business Platform](https://developers.facebook.com/docs/whatsapp)
- [Twilio API Documentation](https://www.twilio.com/docs)
- [SendGrid API Documentation](https://docs.sendgrid.com/)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)

### Getting Help

1. **Check Documentation**: Review the relevant setup guide
2. **Check Logs**: Review Edge Function logs in Supabase Dashboard
3. **Check Database**: Query `notification_jobs` table for errors
4. **External Service Status**: Check status pages for Twilio, SendGrid, etc.
5. **Contact Support**: Reach out to FleetGuard AI development team

---

## Contributing

When updating documentation:

1. Keep guides up-to-date with latest API versions
2. Test all commands and code snippets
3. Include troubleshooting for common issues
4. Add cost information for new features
5. Update the master guide with any changes

---

## Changelog

### Version 1.0 (January 2024)
- Initial documentation for all four notification channels
- Setup guides for WhatsApp, SMS, Email, and Push notifications
- Configuration validation module
- Master setup guide with quick start
- Troubleshooting and monitoring guides

---

**Last Updated:** January 2024  
**Maintained By:** FleetGuard AI Development Team  
**Questions?** Contact the development team or open an issue
