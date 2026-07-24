# SendGrid Email Setup Guide

## Overview

This guide walks you through setting up SendGrid for FleetGuard AI email notifications. SendGrid provides reliable email delivery with advanced analytics and template management.

**Prerequisites:**
- A business email address
- Access to your domain's DNS settings (for domain authentication)

**Estimated Setup Time:** 20-30 minutes

---

## Step 1: Create SendGrid Account

### 1.1 Sign Up

1. Navigate to [SendGrid Sign Up](https://signup.sendgrid.com/)
2. Fill in the registration form:
   - Email address
   - Password
   - Full name
   - Company name
3. Click **"Create Account"**
4. Check your email and verify your account

### 1.2 Complete Account Setup

1. Log in to [SendGrid Dashboard](https://app.sendgrid.com/)
2. Complete the onboarding questionnaire:
   - **Role**: Developer
   - **Reason**: Transactional emails
   - **Email volume**: Select expected monthly volume
3. Click **"Get Started"**

---

## Step 2: Complete Sender Authentication

Proper sender authentication improves email deliverability and prevents emails from going to spam.

### Option A: Single Sender Verification (Quick Start)

**Best for:** Development and testing

1. Navigate to **Settings → Sender Authentication**
2. Click **"Get Started"** under **"Single Sender Verification"**
3. Click **"Create New Sender"**
4. Fill in sender details:
   - **From Name**: `FleetGuard AI`
   - **From Email**: `noreply@yourdomain.com` or your email
   - **Reply To**: `support@fleetguard.ai` or your support email
   - **Company Address**: Your business address (required by CAN-SPAM)
   - **City, State, ZIP**: Complete address details
   - **Country**: Your country
   - **Nickname**: `FleetGuard Alerts` (internal reference)
5. Click **"Save"**
6. Check your email inbox for verification link
7. Click the verification link
8. Sender is now verified ✅

### Option B: Domain Authentication (Recommended for Production)

**Best for:** Production use and high deliverability

Domain authentication sets up SPF, DKIM, and DMARC records for your domain.

#### 2.1 Start Domain Authentication

1. Navigate to **Settings → Sender Authentication**
2. Click **"Get Started"** under **"Authenticate Your Domain"**
3. Select your DNS provider (or choose "Other" if not listed)

#### 2.2 Enter Domain Information

1. Enter your domain: `fleetguard.ai` (or your actual domain)
2. Choose **"No"** for "Would you also like to brand your links?"
   - Unless you want email links to use your domain
3. Click **"Next"**

#### 2.3 Add DNS Records

SendGrid will generate DNS records. You need to add these to your domain's DNS settings.

**Example DNS Records:**

| Type | Host/Name | Value | TTL |
|------|-----------|-------|-----|
| CNAME | `em1234.yourdomain.com` | `u1234567.wl134.sendgrid.net` | 300 |
| CNAME | `s1._domainkey.yourdomain.com` | `s1.domainkey.u1234567.wl134.sendgrid.net` | 300 |
| CNAME | `s2._domainkey.yourdomain.com` | `s2.domainkey.u1234567.wl134.sendgrid.net` | 300 |

#### 2.4 Add Records to Your DNS

**For Cloudflare:**
1. Log in to Cloudflare
2. Select your domain
3. Go to **DNS** tab
4. Click **"Add record"**
5. Add each CNAME record provided by SendGrid
6. Disable proxy (click orange cloud to turn it gray)

**For GoDaddy:**
1. Log in to GoDaddy
2. Go to **My Products → Domains**
3. Click **DNS** next to your domain
4. Click **"Add"** and select **CNAME**
5. Add each record provided by SendGrid

**For Other Providers:**
- Follow your DNS provider's documentation for adding CNAME records

#### 2.5 Verify Domain Authentication

1. Return to SendGrid
2. Click **"Verify"** button
3. SendGrid will check DNS records
   - ✅ **Verified**: Authentication complete
   - ⏳ **Pending**: DNS not propagated yet (wait 24-48 hours)
   - ❌ **Failed**: Check DNS records for errors

**Note:** DNS propagation can take up to 48 hours. You can check propagation status using [WhatsMyDNS.net](https://www.whatsmydns.net/)

---

## Step 3: Create API Key

### 3.1 Generate API Key

1. Navigate to **Settings → API Keys**
2. Click **"Create API Key"**
3. Configure API key:
   - **API Key Name**: `FleetGuard AI Production`
   - **API Key Permissions**: 
     - Select **"Restricted Access"**
     - Under **Mail Send**, enable: **Mail Send** (required)
     - Optional: Enable **Mail Settings**, **Tracking**, **Stats** for analytics
4. Click **"Create & View"**

### 3.2 Save API Key

**IMPORTANT:** Copy the API key immediately and save it securely.

```
SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**You will not be able to view this key again.**

If you lose it, you'll need to create a new API key.

---

## Step 4: Create Email Templates

SendGrid Dynamic Templates allow you to design reusable email templates.

### 4.1 Create Alert Template

1. Navigate to **Email API → Dynamic Templates**
2. Click **"Create a Dynamic Template"**
3. Name: `Fleet Alert Notification`
4. Click **"Create"**
5. Click **"Add Version"**
6. Select **"Blank Template"**
7. Choose **"Code Editor"** (for HTML)

### 4.2 Design Template

**Template HTML:**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{subject}}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background-color: #1a1a2e;
      color: #ffffff;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .severity-badge {
      display: inline-block;
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      margin: 20px 0;
    }
    .severity-critical { background-color: #dc2626; color: #ffffff; }
    .severity-high { background-color: #ea580c; color: #ffffff; }
    .severity-medium { background-color: #f59e0b; color: #ffffff; }
    .severity-low { background-color: #10b981; color: #ffffff; }
    .content {
      padding: 30px;
    }
    .alert-title {
      font-size: 20px;
      font-weight: 600;
      color: #1a1a2e;
      margin: 0 0 15px 0;
    }
    .alert-description {
      font-size: 16px;
      line-height: 1.6;
      color: #4b5563;
      margin: 0 0 25px 0;
    }
    .details-box {
      background-color: #f9fafb;
      border-radius: 6px;
      padding: 20px;
      margin: 25px 0;
    }
    .detail-row {
      display: flex;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .detail-row:last-child {
      border-bottom: none;
    }
    .detail-label {
      font-weight: 600;
      color: #374151;
      flex: 0 0 120px;
    }
    .detail-value {
      color: #6b7280;
      flex: 1;
    }
    .cta-button {
      display: block;
      width: fit-content;
      margin: 30px auto;
      padding: 14px 32px;
      background-color: #2563eb;
      color: #ffffff;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 16px;
      text-align: center;
    }
    .footer {
      background-color: #f9fafb;
      padding: 20px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
    }
    .footer p {
      margin: 5px 0;
      font-size: 12px;
      color: #6b7280;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>🚛 FleetGuard AI</h1>
      <div class="severity-badge severity-{{severity}}">
        {{severity}} Alert
      </div>
    </div>

    <!-- Content -->
    <div class="content">
      <h2 class="alert-title">{{alert_title}}</h2>
      <p class="alert-description">{{alert_description}}</p>

      <!-- Alert Details -->
      <div class="details-box">
        <div class="detail-row">
          <span class="detail-label">Alert Type:</span>
          <span class="detail-value">{{alert_type}}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Vehicle:</span>
          <span class="detail-value">{{vehicle_identifier}}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Time:</span>
          <span class="detail-value">{{timestamp}}</span>
        </div>
        {{#component_name}}
        <div class="detail-row">
          <span class="detail-label">Component:</span>
          <span class="detail-value">{{component_name}}</span>
        </div>
        {{/component_name}}
      </div>

      <!-- Call to Action -->
      <a href="{{dashboard_link}}" class="cta-button">View in Dashboard</a>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>This is an automated notification from FleetGuard AI.</p>
      <p>© {{current_year}} FleetGuard AI. All rights reserved.</p>
      <p>
        <a href="{{unsubscribe_link}}" style="color: #6b7280;">Unsubscribe</a> | 
        <a href="mailto:support@fleetguard.ai" style="color: #6b7280;">Contact Support</a>
      </p>
    </div>
  </div>
</body>
</html>
```

### 4.3 Add Test Data

In the **Test Data** section (right panel), add sample data:

```json
{
  "subject": "Critical Alert: Engine Overheating",
  "severity": "critical",
  "alert_title": "Engine Overheating Detected",
  "alert_description": "Vehicle BUS-001 engine temperature has exceeded safe operating limits. Immediate action required to prevent damage.",
  "alert_type": "critical_failure_risk",
  "vehicle_identifier": "BUS-001",
  "timestamp": "2024-01-15 14:30:00",
  "component_name": "Engine Cooling System",
  "dashboard_link": "https://app.fleetguard.ai/alerts/12345",
  "current_year": "2024",
  "unsubscribe_link": "https://app.fleetguard.ai/settings/notifications"
}
```

### 4.4 Preview and Save

1. Click **"Preview"** to see how the email looks
2. Test with different severity levels (critical, high, medium, low)
3. Click **"Save"** when satisfied
4. Copy the **Template ID** (format: `d-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)

---

## Step 5: Configure Environment Variables

Add the following to your `.env` file:

```bash
# SendGrid Email Configuration
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@fleetguard.ai
SENDGRID_FROM_NAME=FleetGuard AI
# Optional: Use Dynamic Template
SENDGRID_ALERT_TEMPLATE_ID=d-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Required Variables:**
- `SENDGRID_API_KEY`: From Step 3.2
- `SENDGRID_FROM_EMAIL`: Must be verified (Step 2)
- `SENDGRID_FROM_NAME`: Display name in recipient inbox

**Optional Variables:**
- `SENDGRID_ALERT_TEMPLATE_ID`: From Step 4.4

---

## Step 6: Test Your Setup

### 6.1 Send Test Email via API

```bash
curl -X POST https://api.sendgrid.com/v3/mail/send \
  -H "Authorization: Bearer SG.YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "personalizations": [{
      "to": [{"email": "your-email@example.com"}],
      "dynamic_template_data": {
        "subject": "Test Alert",
        "severity": "medium",
        "alert_title": "Test Notification",
        "alert_description": "This is a test email from FleetGuard AI",
        "alert_type": "test",
        "vehicle_identifier": "TEST-001",
        "timestamp": "2024-01-15 14:30:00",
        "dashboard_link": "https://app.fleetguard.ai",
        "current_year": "2024",
        "unsubscribe_link": "https://app.fleetguard.ai/settings"
      }
    }],
    "from": {"email": "noreply@fleetguard.ai", "name": "FleetGuard AI"},
    "template_id": "d-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  }'
```

### 6.2 Test via FleetGuard AI

```bash
curl -X POST https://your-project.supabase.co/functions/v1/notification-processor/test \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "email",
    "recipient": "your-email@example.com",
    "test_message": true
  }'
```

### 6.3 Check Delivery

1. Check your inbox for the test email
2. If not in inbox, check spam/junk folder
3. Navigate to **Activity → Email Activity** in SendGrid Dashboard
4. Find your test email and check status:
   - ✅ **Delivered**: Success
   - ⏳ **Processed**: Sent to recipient's mail server
   - ❌ **Bounce**: Failed delivery

---

## Step 7: Production Checklist

Before going live, ensure:

- ✅ Domain authentication completed (for production)
- ✅ API key created with correct permissions
- ✅ Sender email verified
- ✅ Email template created and tested
- ✅ Environment variables configured
- ✅ Test emails delivered successfully
- ✅ DNS records verified (if using domain authentication)
- ✅ SPF, DKIM records in place
- ✅ Unsubscribe link implemented

---

## Troubleshooting

### Error: "The from email does not contain a valid address"

**Solution:**
- Verify sender email in Single Sender Verification
- OR complete domain authentication
- Ensure email matches verified sender exactly

### Error: "Permission denied, wrong credentials"

**Solution:**
- Check API key is correct and not expired
- Regenerate API key if needed
- Ensure API key has "Mail Send" permission

### Emails going to spam

**Solutions:**
1. **Complete domain authentication** (most important)
2. Add SPF record to DNS:
   ```
   v=spf1 include:sendgrid.net ~all
   ```
3. Set up DMARC record:
   ```
   v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com
   ```
4. Warm up your IP address (for dedicated IPs)
5. Maintain good sender reputation:
   - Low bounce rate (< 5%)
   - Low spam complaint rate (< 0.1%)
   - High engagement (opens, clicks)

### Error: "Template not found"

**Solution:**
- Verify template ID is correct
- Check template is published (not draft)
- Ensure API key has access to templates

### Emails not delivering

**Checklist:**
1. Check Activity feed for delivery status
2. Verify recipient email is valid
3. Check for bounces (invalid email)
4. Review spam reports
5. Ensure sender reputation is good
6. Check DNS records are properly configured

---

## Deliverability Best Practices

### 1. Content Guidelines

**DO:**
- Use clear, descriptive subject lines
- Include plain text version (SendGrid auto-generates)
- Keep HTML clean and simple
- Include physical mailing address (required by CAN-SPAM)
- Provide easy unsubscribe option

**DON'T:**
- Use ALL CAPS in subject line
- Overuse exclamation marks!!!
- Include spammy keywords (FREE, URGENT, CLICK HERE)
- Use misleading subject lines
- Send from personal email addresses

### 2. Email Authentication

Complete all authentication steps:
- ✅ Domain Authentication (SPF, DKIM)
- ✅ DMARC policy
- ✅ Branded links (optional but helps)

### 3. List Management

- Remove bounced emails promptly
- Honor unsubscribe requests immediately
- Maintain clean email list
- Don't purchase email lists

### 4. Sending Patterns

- Warm up new domains gradually
- Send consistent volumes
- Avoid sudden volume spikes
- Maintain regular sending schedule

---

## Rate Limits and Quotas

### Free Plan
- **100 emails/day**
- All features included
- Single sender verification only

### Essentials Plan ($19.95/month)
- **50,000 emails/month**
- $0.50 per 1,000 additional
- Includes domain authentication
- Email API access

### Pro Plan ($89.95/month)
- **100,000 emails/month**
- $0.42 per 1,000 additional
- Dedicated IP option
- Advanced analytics

Check current pricing: [SendGrid Pricing](https://sendgrid.com/pricing/)

---

## Monitoring and Analytics

### 1. Activity Feed

Navigate to **Activity** to view:
- Real-time email events
- Delivery status
- Opens and clicks
- Bounces and spam reports

### 2. Stats Dashboard

Navigate to **Stats → Overview**:
- Delivery rate
- Open rate
- Click rate
- Bounce rate
- Spam report rate

### 3. Email Tracking

Enable tracking features:
- **Open Tracking**: Track when emails are opened
- **Click Tracking**: Track link clicks
- **Subscription Tracking**: Manage unsubscribes

Configure in **Settings → Tracking**

### 4. Alerts

Set up alerts for:
- High bounce rate
- Spam reports
- API errors

Configure in **Settings → Alerts**

---

## Advanced Features

### 1. Dynamic Templates with Handlebars

Use Handlebars helpers for conditional content:

```html
{{#if_equals severity "critical"}}
  <p style="color: red; font-weight: bold;">URGENT ACTION REQUIRED</p>
{{/if_equals}}

{{#each vehicle_list}}
  <li>{{this.name}} - {{this.status}}</li>
{{/each}}
```

### 2. A/B Testing

Test different email versions:
1. Navigate to **Email API → A/B Testing**
2. Create test with multiple versions
3. SendGrid automatically sends winning version

### 3. Suppression Groups

Allow users to opt out of specific notification types:

1. Navigate to **Suppressions → Unsubscribe Groups**
2. Create group: "Critical Alerts", "Maintenance Updates", etc.
3. Include in email template:
   ```html
   [Unsubscribe from {{unsubscribe_group_name}}]
   ```

### 4. Webhooks

Receive real-time delivery events:

```typescript
// Set webhook URL in Settings → Mail Settings → Event Webhook
const webhookUrl = 'https://your-project.supabase.co/functions/v1/sendgrid-webhook';

// Webhook handler
Deno.serve(async (req) => {
  const events = await req.json();
  
  for (const event of events) {
    const { email, event: eventType, sg_message_id } = event;
    
    if (eventType === 'bounce') {
      // Handle bounced email
      await markEmailAsInvalid(email);
    }
  }
});
```

---

## Security Best Practices

### 1. API Key Security

- Store API keys in environment variables
- Never commit to version control
- Use separate keys for dev/staging/production
- Rotate keys periodically
- Use restricted access (not full access)

### 2. Rate Limiting

Implement application-level rate limiting:

```typescript
const emailRateLimiter = new Map<string, number>();
const MAX_EMAILS_PER_USER_PER_DAY = 50;

function checkEmailRateLimit(userEmail: string): boolean {
  const today = new Date().toDateString();
  const key = `${userEmail}:${today}`;
  const count = emailRateLimiter.get(key) || 0;
  
  if (count >= MAX_EMAILS_PER_USER_PER_DAY) {
    return false;
  }
  
  emailRateLimiter.set(key, count + 1);
  return true;
}
```

### 3. Content Sanitization

```typescript
function sanitizeEmailContent(content: string): string {
  // Remove potentially dangerous HTML
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '');
}
```

---

## Useful Resources

- [SendGrid Documentation](https://docs.sendgrid.com/)
- [API Reference](https://docs.sendgrid.com/api-reference)
- [Dynamic Templates Guide](https://docs.sendgrid.com/ui/sending-email/how-to-send-an-email-with-dynamic-templates)
- [Email Deliverability Guide](https://sendgrid.com/resource/email-deliverability-guide/)
- [Best Practices](https://docs.sendgrid.com/ui/sending-email/getting-started-with-sendgrid)

---

## Support

For SendGrid issues:
- SendGrid Support: [support.sendgrid.com](https://support.sendgrid.com/)
- Knowledge Base: [sendgrid.com/docs](https://sendgrid.com/docs)
- Community Forum: [community.sendgrid.com](https://community.sendgrid.com/)

For FleetGuard AI integration issues:
- Check Edge Function logs in Supabase Dashboard
- Review notification_jobs table for error messages
- Contact FleetGuard AI support team
