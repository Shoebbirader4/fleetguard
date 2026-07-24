# Multi-Channel Notification Setup Guide

## Overview

This guide provides step-by-step instructions for setting up all four notification channels for the FleetGuard AI alert system:

1. **WhatsApp Business API** - For WhatsApp messages
2. **Twilio SMS** - For SMS text messages
3. **SendGrid** - For email notifications
4. **Firebase Cloud Messaging (FCM)** - For mobile push notifications

Each channel requires separate API credentials and configuration. Follow the instructions below to set up each service.

---

## Table of Contents

1. [WhatsApp Business API Setup](#1-whatsapp-business-api-setup)
2. [Twilio SMS Setup](#2-twilio-sms-setup)
3. [SendGrid Email Setup](#3-sendgrid-email-setup)
4. [Firebase Cloud Messaging Setup](#4-firebase-cloud-messaging-setup)
5. [Environment Configuration](#5-environment-configuration)
6. [Testing Your Setup](#6-testing-your-setup)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. WhatsApp Business API Setup

### Prerequisites
- A Facebook Business Manager account
- A verified business phone number

### Step-by-Step Instructions

#### 1.1 Create Facebook App
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Click "My Apps" → "Create App"
3. Select "Business" as the app type
4. Fill in app details:
   - **App Name**: FleetGuard AI Notifications
   - **Contact Email**: Your business email
5. Click "Create App"

#### 1.2 Add WhatsApp Product
1. In your app dashboard, click "Add Product"
2. Find "WhatsApp" and click "Set Up"
3. Select or create a WhatsApp Business Account

#### 1.3 Configure Phone Number
1. Navigate to WhatsApp → Getting Started
2. Add a phone number (either use the test number or add your business number)
3. Verify the phone number through SMS or voice call

#### 1.4 Get API Credentials
You need three pieces of information:

**Phone Number ID:**
1. Go to WhatsApp → API Setup
2. Copy the "Phone Number ID" (format: `123456789012345`)

**Access Token:**
1. In the same section, find "Temporary Access Token"
2. Copy the token (starts with `EAA...`)
3. **IMPORTANT**: For production, generate a System User Token (permanent):
   - Go to Business Settings → System Users
   - Create a system user with admin permissions
   - Generate a token with `whatsapp_business_messaging` permission

**WhatsApp Business Account ID:**
1. Found in WhatsApp → Getting Started
2. Or in the URL when viewing your WhatsApp settings

#### 1.5 Set Up Message Templates (Required for Production)
WhatsApp requires pre-approved message templates for business-initiated messages:


1. Go to WhatsApp → Message Templates
2. Click "Create Template"
3. Create an alert notification template:

**Template Name**: `alert_notification`
**Category**: UTILITY (for account updates and alerts)
**Language**: English
**Template Content**:
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

**Variables**:
- {{1}} = User's full name
- {{2}} = Alert title
- {{3}} = Alert description  
- {{4}} = Severity level
- {{5}} = Vehicle identifier

4. Submit for approval (usually takes 1-2 business days)

#### 1.6 Test Your Setup
Use the test number provided by WhatsApp to send test messages before going live.

**Configuration Summary:**
```env
WHATSAPP_API_URL=https://graph.facebook.com/v17.0
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_permanent_access_token
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id
```

**Resources:**
- [WhatsApp Business Platform Documentation](https://developers.facebook.com/docs/whatsapp)
- [Cloud API Quick Start](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started)

---


## 2. Twilio SMS Setup

### Prerequisites
- A valid phone number for verification
- Credit card for account verification (Twilio offers free trial credits)

### Step-by-Step Instructions

#### 2.1 Create Twilio Account
1. Go to [Twilio Sign Up](https://www.twilio.com/try-twilio)
2. Complete the registration form
3. Verify your email address
4. Verify your phone number

#### 2.2 Get a Twilio Phone Number
1. Log in to [Twilio Console](https://console.twilio.com/)
2. Navigate to Phone Numbers → Manage → Buy a number
3. Select your country
4. Choose a phone number with SMS capability
5. Purchase the number (uses trial credits or billing)

#### 2.3 Get API Credentials
1. Go to [Twilio Console Dashboard](https://console.twilio.com/)
2. Find "Account Info" section
3. Copy the following:
   - **Account SID** (format: `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)
   - **Auth Token** (click "Show" to reveal, format: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)

#### 2.4 Verify Phone Numbers (Trial Account Only)
If using a trial account, you must verify recipient phone numbers:

1. Go to Phone Numbers → Manage → Verified Caller IDs
2. Click "Add a new Caller ID"
3. Enter the phone number to verify
4. Complete verification via SMS or voice call

**Note**: Upgrade to a paid account to remove this restriction and send to any number.

#### 2.5 Configure Messaging Service (Optional but Recommended)
For better deliverability and features:

1. Navigate to Messaging → Services
2. Click "Create Messaging Service"
3. Name: "FleetGuard AI Alerts"
4. Use Case: "Notifications"
5. Add your purchased phone number to the messaging service
6. Copy the Messaging Service SID

**Configuration Summary:**
```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_MESSAGING_SERVICE_SID=MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  # Optional
```

**Resources:**
- [Twilio SMS Quick Start](https://www.twilio.com/docs/sms/quickstart)
- [Twilio API Documentation](https://www.twilio.com/docs/sms/api)

---

## 3. SendGrid Email Setup

### Prerequisites
- A verified business email domain (for better deliverability)
- Access to your domain's DNS settings

### Step-by-Step Instructions

#### 3.1 Create SendGrid Account
1. Go to [SendGrid Sign Up](https://signup.sendgrid.com/)
2. Complete the registration form
3. Verify your email address
4. Choose the Free plan (100 emails/day) or a paid plan

#### 3.2 Complete Sender Authentication
**Option A: Single Sender Verification (Quick Start)**
1. Go to Settings → Sender Authentication → Single Sender Verification
2. Click "Create New Sender"
3. Fill in details:
   - From Name: FleetGuard AI
   - From Email: noreply@yourdomain.com
   - Reply To: support@yourdomain.com
   - Company details
4. Click "Save" and verify the email address

**Option B: Domain Authentication (Recommended for Production)**
1. Go to Settings → Sender Authentication → Authenticate Your Domain
2. Select your DNS provider
3. Enter your domain (e.g., `fleetguard.ai`)
4. SendGrid will generate DNS records:
   - CNAME records for domain authentication
   - TXT records for SPF/DKIM
5. Add these records to your DNS settings
6. Click "Verify" (may take up to 48 hours for DNS propagation)

#### 3.3 Create API Key
1. Go to Settings → API Keys
2. Click "Create API Key"
3. Name: "FleetGuard AI Production"
4. Permissions: **Full Access** (or restricted to "Mail Send" for security)
5. Click "Create & View"
6. **IMPORTANT**: Copy the API key immediately (it won't be shown again)
   - Format: `SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

#### 3.4 Create Email Templates
1. Go to Email API → Dynamic Templates
2. Click "Create a Dynamic Template"
3. Name: "Alert Notification"
4. Click "Add Version" → "Blank Template" → "Code Editor"

**Template HTML** (alert_template.html):
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FleetGuard Alert</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; border-left: 4px solid #dc3545; padding: 20px; margin-bottom: 20px;">
    <h2 style="margin: 0 0 10px 0; color: #dc3545;">{{alert_title}}</h2>
    <p style="margin: 0; font-size: 14px; color: #666;">
      Severity: <strong style="color: {{severity_color}};">{{severity}}</strong>
    </p>
  </div>
