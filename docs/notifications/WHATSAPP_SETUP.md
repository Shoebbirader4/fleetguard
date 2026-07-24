# WhatsApp Business API Setup Guide

## Overview

This guide walks you through setting up WhatsApp Business API for FleetGuard AI notifications. WhatsApp messages are sent using the official WhatsApp Business Platform (Cloud API).

**Prerequisites:**
- A Facebook Business Manager account
- A verified business phone number
- Access to Facebook Developers platform

**Estimated Setup Time:** 30-45 minutes

---

## Step 1: Create Facebook App

### 1.1 Access Facebook Developers

1. Navigate to [Facebook Developers](https://developers.facebook.com/)
2. Click **"My Apps"** in the top right
3. Click **"Create App"**

### 1.2 Configure App Settings

1. Select app type: **"Business"**
2. Fill in app details:
   - **Display Name**: `FleetGuard AI Notifications`
   - **App Contact Email**: Your business email
   - **Business Account**: Select or create a business account
3. Click **"Create App"**
4. Complete security verification if prompted

---

## Step 2: Add WhatsApp Product

### 2.1 Enable WhatsApp

1. In your app dashboard, find the **"Add Products"** section
2. Locate **"WhatsApp"** and click **"Set Up"**
3. Select or create a WhatsApp Business Account
4. Accept the terms of service

### 2.2 Configure Business Profile

1. Navigate to **WhatsApp → Settings → Business Profile**
2. Fill in business information:
   - Business Name
   - Business Description
   - Business Category
   - Business Address
   - Business Website
3. Click **"Save"**

---

## Step 3: Set Up Phone Number

### 3.1 Add Phone Number

You have two options:

**Option A: Use Test Number (For Development)**
1. Go to **WhatsApp → API Setup**
2. Meta provides a test number automatically
3. This number can send messages to up to 5 verified numbers
4. **Limitations:** Test mode only, messages show test indicator

**Option B: Add Your Business Number (For Production)**
1. Go to **WhatsApp → API Setup**
2. Click **"Add Phone Number"**
3. Select **"Use your own phone number"**
4. Enter your business phone number
5. Verify the number via SMS or voice call
6. Complete two-factor authentication setup

### 3.2 Get Phone Number ID

1. Navigate to **WhatsApp → API Setup**
2. Copy the **Phone Number ID** (format: `123456789012345`)
3. Save this value - you'll need it for `WHATSAPP_PHONE_NUMBER_ID`

---

## Step 4: Get Access Token

### 4.1 Temporary Access Token (Development)

1. Go to **WhatsApp → API Setup**
2. Find the **"Temporary access token"** section
3. Copy the token (starts with `EAA...`)
4. **Note:** This token expires in 24 hours

### 4.2 Permanent Access Token (Production)

**Required for Production Use**

1. Navigate to **Business Settings** (gear icon in top right)
2. Click **"System Users"** in the left sidebar
3. Click **"Add"** to create a new system user
4. Configure system user:
   - **Name**: `FleetGuard Notifications Service`
   - **Role**: **Admin**
5. Click **"Create System User"**

6. Assign Assets to System User:
   - Click on the system user you just created
   - Click **"Add Assets"**
   - Select **"Apps"**
   - Select your FleetGuard AI app
   - Enable **"Full Control"**
   - Click **"Save Changes"**

7. Generate Access Token:
   - Click **"Generate New Token"** for the system user
   - Select your app
   - Select permissions:
     - ✅ `whatsapp_business_messaging`
     - ✅ `whatsapp_business_management`
   - Click **"Generate Token"**
   - **IMPORTANT:** Copy and securely store this token immediately
   - This token does not expire

---

## Step 5: Create Message Templates

WhatsApp requires pre-approved message templates for business-initiated messages.

### 5.1 Create Alert Template

1. Navigate to **WhatsApp → Message Templates**
2. Click **"Create Template"**
3. Configure template:

**Template Details:**
- **Name**: `alert_notification`
- **Category**: **UTILITY** (for account updates and alerts)
- **Language**: English (en)

**Template Body:**
```
Hello {{1}},

*Fleet Alert: {{2}}*

{{3}}

Severity: {{4}}
Vehicle: {{5}}

Please review this alert in your FleetGuard AI dashboard.

Thank you,
FleetGuard AI Team
```

**Variable Mapping:**
- `{{1}}` = User's full name
- `{{2}}` = Alert title
- `{{3}}` = Alert description
- `{{4}}` = Severity level (Critical, High, Medium, Low)
- `{{5}}` = Vehicle identifier

4. Click **"Submit"**

### 5.2 Wait for Approval

- Template review typically takes 1-2 business days
- You'll receive email notification when approved
- Check status in **WhatsApp → Message Templates**

### 5.3 Create Additional Templates (Optional)

Consider creating templates for:
- **Maintenance Due**: Scheduled maintenance reminders
- **Work Order Completed**: Service completion notifications
- **Document Expiry**: Certificate expiration warnings

---

## Step 6: Configure Environment Variables

Add the following to your `.env` file:

```bash
# WhatsApp Business API Configuration
WHATSAPP_API_URL=https://graph.facebook.com/v17.0
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_API_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
WHATSAPP_BUSINESS_ACCOUNT_ID=123456789012345
WHATSAPP_ALERT_TEMPLATE_NAME=alert_notification
```

**Required Variables:**
- `WHATSAPP_API_URL`: Base URL for WhatsApp Graph API (v17.0 or later)
- `WHATSAPP_PHONE_NUMBER_ID`: From Step 3.2
- `WHATSAPP_API_TOKEN`: Permanent token from Step 4.2
- `WHATSAPP_BUSINESS_ACCOUNT_ID`: From WhatsApp → Getting Started
- `WHATSAPP_ALERT_TEMPLATE_NAME`: Template name from Step 5.1

---

## Step 7: Test Your Setup

### 7.1 Verify Recipient Numbers (Test Mode)

If using test mode:
1. Go to **WhatsApp → API Setup**
2. Scroll to **"To"** field
3. Click **"Manage phone number list"**
4. Add phone numbers that can receive test messages (max 5)
5. Verify each number via WhatsApp message

### 7.2 Send Test Message

Use the FleetGuard AI notification test endpoint:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/notification-processor/test \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "whatsapp",
    "recipient": "+919876543210",
    "test_message": true
  }'
```

### 7.3 Check Delivery Status

1. Monitor logs in Supabase Edge Function logs
2. Check WhatsApp → Analytics for delivery metrics
3. Verify message received on test device

---

## Step 8: Production Checklist

Before going live, ensure:

- ✅ Business phone number verified
- ✅ Permanent access token generated
- ✅ All message templates approved
- ✅ Business profile completed
- ✅ System user created with correct permissions
- ✅ Environment variables configured
- ✅ Test messages sent successfully
- ✅ Template compliance verified (no prohibited content)

---

## Troubleshooting

### Error: "Invalid phone number"

**Solution:**
- Ensure phone number includes country code (e.g., +91 for India)
- Remove any spaces, dashes, or special characters
- Verify number is not on WhatsApp blocklist

### Error: "Template not found"

**Solution:**
- Check template name matches exactly (case-sensitive)
- Verify template is approved (check status in console)
- Ensure template language matches recipient's language

### Error: "Access token expired"

**Solution:**
- Use permanent system user token instead of temporary token
- Follow Step 4.2 to generate permanent token
- Update `WHATSAPP_API_TOKEN` in `.env`

### Error: "Rate limit exceeded"

**Solution:**
- WhatsApp has rate limits based on business verification tier
- Check current limits in WhatsApp → Insights
- Request tier upgrade if needed
- Implement exponential backoff in retry logic

### Messages not delivering

**Checklist:**
1. Verify phone number is correct and formatted properly
2. Check recipient has WhatsApp installed
3. Ensure template is approved
4. Verify access token is valid
5. Check WhatsApp Analytics for delivery status
6. Review Edge Function logs for errors

---

## Rate Limits and Quotas

WhatsApp enforces messaging limits based on business verification:

| Tier | Messaging Limit | Requirements |
|------|----------------|--------------|
| Tier 1 | 1,000 conversations/24h | Default for new businesses |
| Tier 2 | 10,000 conversations/24h | Business verification + quality rating |
| Tier 3 | 100,000 conversations/24h | Higher quality rating |
| Unlimited | No limit | Enterprise verification |

**Tips:**
- Start with Tier 1 and scale up as needed
- Maintain high quality rating (>80%)
- Complete business verification for higher tiers
- Monitor usage in WhatsApp Analytics

---

## Cost Considerations

WhatsApp charges per conversation (24-hour messaging window):

- **Business-initiated conversations**: Charged per conversation
- **User-initiated conversations**: Free for first 1,000/month, then charged
- **Pricing**: Varies by country (typically $0.005 - $0.05 per conversation)

Check current pricing: [WhatsApp Business Pricing](https://developers.facebook.com/docs/whatsapp/pricing)

---

## Security Best Practices

1. **Protect Access Token:**
   - Never commit tokens to version control
   - Store in environment variables
   - Rotate tokens periodically
   - Use system user tokens (not personal access tokens)

2. **Phone Number Verification:**
   - Validate recipient numbers before sending
   - Sanitize user input
   - Maintain opt-out list

3. **Template Content:**
   - Avoid sensitive information in templates
   - Don't include credentials or passwords
   - Follow WhatsApp content policies

4. **Rate Limiting:**
   - Implement application-level rate limiting
   - Monitor API usage
   - Handle 429 errors gracefully

---

## Useful Resources

- [WhatsApp Business Platform Documentation](https://developers.facebook.com/docs/whatsapp)
- [Cloud API Quick Start](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started)
- [Message Templates Guide](https://developers.facebook.com/docs/whatsapp/message-templates)
- [WhatsApp Business Policy](https://www.whatsapp.com/legal/business-policy)
- [API Reference](https://developers.facebook.com/docs/whatsapp/cloud-api/reference)

---

## Support

For WhatsApp API issues:
- WhatsApp Business Support: [Business Help Center](https://business.whatsapp.com/support)
- Facebook Developer Community: [Developer Forum](https://developers.facebook.com/community)

For FleetGuard AI integration issues:
- Check logs in Supabase Dashboard
- Review Edge Function error messages
- Contact FleetGuard AI support team
