# Twilio SMS Setup Guide

## Overview

This guide walks you through setting up Twilio SMS for FleetGuard AI notifications. Twilio provides reliable SMS delivery with global coverage.

**Prerequisites:**
- A valid phone number for account verification
- Credit card for account verification (free trial credits provided)

**Estimated Setup Time:** 15-20 minutes

---

## Step 1: Create Twilio Account

### 1.1 Sign Up

1. Navigate to [Twilio Sign Up](https://www.twilio.com/try-twilio)
2. Fill in the registration form:
   - Email address
   - Password (12+ characters)
   - First and Last name
3. Click **"Start your free trial"**
4. Verify your email address (check inbox for verification link)

### 1.2 Verify Your Phone Number

1. Enter your phone number (this becomes a verified number)
2. Choose verification method: **SMS** or **Voice Call**
3. Enter the verification code received
4. Complete account setup

---

## Step 2: Get API Credentials

### 2.1 Access Account Dashboard

1. Log in to [Twilio Console](https://console.twilio.com/)
2. You'll land on the main dashboard

### 2.2 Copy Account Credentials

In the **"Account Info"** section, copy:

1. **Account SID**
   - Format: `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - This is your Twilio account identifier

2. **Auth Token**
   - Click **"Show"** to reveal the token
   - Format: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - Keep this secret - it's used to authenticate API requests

**Save these credentials securely** - you'll need them for environment variables.

---

## Step 3: Get a Twilio Phone Number

### 3.1 Buy a Phone Number

1. In the Twilio Console, navigate to:
   - **Phone Numbers → Manage → Buy a number**
   
2. Configure number search:
   - **Country**: Select your country
   - **Capabilities**: Ensure **SMS** is checked
   - **Number Type**: Any (Mobile, Local, or Toll-Free)
   
3. Click **"Search"**

4. Browse available numbers:
   - Review pricing
   - Check if SMS is supported
   - Consider getting a local number for better deliverability

5. Click **"Buy"** on your chosen number
   - Trial accounts: Uses trial credits
   - Paid accounts: Charges to your card

6. Confirm the purchase

### 3.2 Copy Your Phone Number

1. Navigate to **Phone Numbers → Manage → Active numbers**
2. Click on your purchased number
3. Copy the phone number (format: `+1234567890`)
4. Save for `TWILIO_PHONE_NUMBER` environment variable

---

## Step 4: Verify Recipient Numbers (Trial Account Only)

**Note:** If using a trial account, you must verify each recipient number before sending.

### 4.1 Add Verified Numbers

1. Navigate to **Phone Numbers → Manage → Verified Caller IDs**
2. Click **"Add a new Caller ID"** (red + button)
3. Enter the phone number to verify
4. Click **"Call Me"** or **"Text Me"** for verification
5. Enter the verification code received
6. Number is now verified and can receive SMS

**Repeat for all test recipient numbers** (no limit on verified numbers).

### 4.2 Upgrade to Remove Restriction

To send SMS to any number:
1. Navigate to **Account → Upgrade**
2. Add payment method
3. Complete billing verification
4. Trial restrictions are removed immediately

---

## Step 5: Configure Messaging Service (Recommended)

A Messaging Service provides better deliverability and advanced features.

### 5.1 Create Messaging Service

1. Navigate to **Messaging → Services**
2. Click **"Create Messaging Service"**
3. Configure the service:
   - **Friendly Name**: `FleetGuard AI Alerts`
   - **Use Case**: Select **"Notifications, Outbound only"**
4. Click **"Create Messaging Service"**

### 5.2 Add Sender Pool

1. In the Messaging Service, click **"Add Senders"**
2. Select **"Phone Number"**
3. Check the phone number you purchased in Step 3
4. Click **"Add Phone Numbers"**

### 5.3 Configure Additional Settings

1. **Validity Period**: Set to **4 hours** (messages expire if undelivered)
2. **Status Callback URL**: (Optional) For delivery status webhooks
3. **Fallback to Long Code**: Enabled (for better deliverability)

### 5.4 Copy Messaging Service SID

1. At the top of the Messaging Service page, copy the **Service SID**
   - Format: `MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
2. Save for `TWILIO_MESSAGING_SERVICE_SID` environment variable

---

## Step 6: Configure Environment Variables

Add the following to your `.env` file:

```bash
# Twilio SMS Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
# Optional: For better deliverability
TWILIO_MESSAGING_SERVICE_SID=MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Required Variables:**
- `TWILIO_ACCOUNT_SID`: From Step 2.2
- `TWILIO_AUTH_TOKEN`: From Step 2.2 (click "Show" to reveal)
- `TWILIO_PHONE_NUMBER`: From Step 3.2

**Optional Variables:**
- `TWILIO_MESSAGING_SERVICE_SID`: From Step 5.4 (recommended for production)

---

## Step 7: Test Your Setup

### 7.1 Send Test SMS via API

Use curl to test directly:

```bash
curl -X POST "https://api.twilio.com/2010-04-01/Accounts/ACxxxxx/Messages.json" \
  --data-urlencode "To=+919876543210" \
  --data-urlencode "From=+1234567890" \
  --data-urlencode "Body=Test message from FleetGuard AI" \
  -u ACxxxxx:your_auth_token
```

Replace:
- `ACxxxxx`: Your Account SID
- `your_auth_token`: Your Auth Token
- `+919876543210`: Recipient number (must be verified if trial account)
- `+1234567890`: Your Twilio phone number

### 7.2 Test via FleetGuard AI

Use the notification test endpoint:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/notification-processor/test \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "sms",
    "recipient": "+919876543210",
    "test_message": true
  }'
```

### 7.3 Check Delivery Status

1. In Twilio Console, navigate to **Monitor → Logs → Messaging**
2. Find your test message
3. Check **Status**: 
   - ✅ **Delivered**: Success
   - ⏳ **Sent**: In progress
   - ❌ **Failed**: Check error code

---

## Step 8: Production Checklist

Before going live, ensure:

- ✅ Account upgraded (if needed to send to unverified numbers)
- ✅ Messaging Service created and configured
- ✅ Phone number purchased and added to Messaging Service
- ✅ Environment variables configured correctly
- ✅ Test messages sent and delivered successfully
- ✅ Billing information added and verified
- ✅ Alert notifications configured in FleetGuard AI

---

## Troubleshooting

### Error: "Authenticate" (Error 20003)

**Cause:** Invalid Account SID or Auth Token

**Solution:**
1. Verify credentials in Twilio Console → Account Info
2. Check for typos in `.env` file
3. Ensure Auth Token is revealed (click "Show") before copying
4. Regenerate Auth Token if needed (Settings → API Keys)

### Error: "Permission to send an SMS has not been enabled" (Error 21606)

**Cause:** Trial account trying to send to unverified number

**Solution:**
1. Verify recipient number: Phone Numbers → Verified Caller IDs
2. OR upgrade account to remove restriction

### Error: "From phone number not verified" (Error 21608)

**Cause:** Sender phone number not purchased or assigned

**Solution:**
1. Verify phone number ownership in Twilio Console
2. Check that number has SMS capability
3. If using Messaging Service, ensure number is in sender pool

### Error: "Invalid 'To' phone number" (Error 21211)

**Cause:** Recipient phone number format is invalid

**Solution:**
- Use E.164 format: `+[country code][number]`
- Example: `+919876543210` (India), `+14155551234` (US)
- Remove spaces, dashes, or parentheses

### SMS not delivering

**Checklist:**
1. Verify recipient number is correct and in E.164 format
2. Check if number is verified (trial accounts)
3. Ensure sender number has SMS capability
4. Check account balance (paid accounts)
5. Review message content for prohibited keywords
6. Check carrier filtering (some carriers block automated messages)

---

## Rate Limits and Quotas

Twilio enforces sending limits to prevent abuse:

| Account Type | Limit | How to Increase |
|--------------|-------|-----------------|
| **Trial** | Limited sending | Upgrade to paid account |
| **Paid (New)** | 1 message/second | Contact support for increase |
| **Paid (Verified)** | Higher throughput | Automatic based on usage history |

**Tips:**
- Implement rate limiting in your application
- Use queuing for bulk sends
- Monitor usage in Twilio Console
- Contact support for throughput increases

---

## Cost Considerations

### SMS Pricing

Pricing varies by destination country:

| Region | Outbound SMS Cost (approx.) |
|--------|----------------------------|
| **US/Canada** | $0.0079 per message |
| **India** | $0.0068 per message |
| **UK** | $0.0098 per message |
| **Global Average** | $0.01 - $0.08 per message |

Check current pricing: [Twilio SMS Pricing](https://www.twilio.com/sms/pricing)

### Phone Number Costs

- **US Local Number**: $1.00/month
- **US Toll-Free**: $2.00/month
- **International**: Varies by country

### Messaging Service

- **No additional cost** for using Messaging Service
- Only charged for SMS sent

**Cost Optimization Tips:**
1. Use Messaging Service for better deliverability (reduces failed sends)
2. Implement retry logic to avoid duplicate sends
3. Consolidate notifications (avoid separate SMS for each alert)
4. Monitor usage and set budget alerts

---

## Security Best Practices

### 1. Protect Auth Token

- Never commit Auth Token to version control
- Store in environment variables
- Rotate token periodically (Settings → API Keys → Create new token)
- Use separate tokens for dev/staging/production

### 2. Input Validation

```typescript
function validatePhoneNumber(phone: string): boolean {
  // E.164 format validation
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phone);
}

function sanitizeMessageBody(body: string): string {
  // Remove potential injection attempts
  return body.replace(/[\r\n\t]/g, ' ').trim();
}
```

### 3. Rate Limiting

Implement application-level rate limiting:

```typescript
const rateLimiter = new Map<string, number>();
const MAX_SMS_PER_USER_PER_HOUR = 10;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userCount = rateLimiter.get(userId) || 0;
  
  if (userCount >= MAX_SMS_PER_USER_PER_HOUR) {
    return false; // Rate limit exceeded
  }
  
  rateLimiter.set(userId, userCount + 1);
  return true;
}
```

### 4. Opt-Out Management

Maintain an opt-out list:
- Honor STOP, UNSUBSCRIBE keywords
- Store opt-out preferences in database
- Check opt-out status before sending

---

## Message Content Best Practices

### Character Limits

- **Standard SMS**: 160 characters (single segment)
- **Extended SMS**: Up to 1600 characters (multiple segments, charged per segment)
- **Emoji/Unicode**: Reduces limit to 70 characters per segment

### Content Guidelines

**DO:**
- Keep messages concise and actionable
- Include alert severity in message
- Mention vehicle or asset identifier
- Provide context (e.g., "Brake pads due for replacement")

**DON'T:**
- Send promotional content via alert channel
- Include URLs without URL shortening (consumes characters)
- Use excessive formatting or emoji
- Send sensitive data (passwords, full account numbers)

### Example Alert Messages

```
[CRITICAL] Vehicle BUS-001: Engine overheating detected. Immediate attention required. - FleetGuard AI

[HIGH] Vehicle TRK-042: Brake pads at 90% wear. Schedule maintenance within 48 hours. - FleetGuard AI

[MEDIUM] Vehicle VAN-112: Oil change due in 500 km. Review maintenance schedule. - FleetGuard AI
```

---

## Monitoring and Analytics

### 1. Monitor Message Status

Navigate to **Monitor → Logs → Messaging** to view:
- Message delivery status
- Error rates
- Delivery times
- Geographic distribution

### 2. Set Up Alerts

Configure alerts for:
- High error rates (Settings → Alerts)
- Low account balance
- Rate limit approaching

### 3. Track Costs

Monitor spending:
- Dashboard → Billing → Usage
- Set usage triggers to prevent overspending
- Export usage reports for analysis

---

## Advanced Features

### 1. Delivery Status Webhooks

Configure webhooks to receive delivery updates:

```typescript
// In Messaging Service settings
const statusCallbackUrl = 'https://your-project.supabase.co/functions/v1/twilio-webhook';

// Webhook handler
Deno.serve(async (req) => {
  const formData = await req.formData();
  const messageStatus = formData.get('MessageStatus');
  const messageSid = formData.get('MessageSid');
  
  // Update notification_jobs table with delivery status
  await updateJobStatus(messageSid, messageStatus);
});
```

### 2. Short URLs

Use Twilio's short URL feature for clickable links:

```typescript
const twilioShortUrl = await twilio.shortenUrl('https://app.fleetguard.ai/alerts/123');
const message = `Alert: Engine issue detected. View: ${twilioShortUrl}`;
```

### 3. Message Scheduling

Schedule messages for later delivery:

```typescript
const scheduledTime = new Date(Date.now() + 3600000); // 1 hour from now
await twilio.messages.create({
  to: recipient,
  from: senderNumber,
  body: message,
  sendAt: scheduledTime.toISOString(),
});
```

---

## Useful Resources

- [Twilio SMS Quick Start](https://www.twilio.com/docs/sms/quickstart)
- [Twilio API Reference](https://www.twilio.com/docs/sms/api)
- [Error and Warning Dictionary](https://www.twilio.com/docs/api/errors)
- [SMS Best Practices](https://www.twilio.com/docs/sms/services/best-practices)
- [Messaging Services Guide](https://www.twilio.com/docs/messaging/services)

---

## Support

For Twilio issues:
- Twilio Help Center: [support.twilio.com](https://support.twilio.com/)
- Community Forum: [community.twilio.com](https://community.twilio.com/)
- Live Chat: Available in Twilio Console

For FleetGuard AI integration issues:
- Check Edge Function logs in Supabase Dashboard
- Review notification_jobs table for error messages
- Contact FleetGuard AI support team
