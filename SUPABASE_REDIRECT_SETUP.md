# Update Supabase Redirect URLs - Quick Guide

## ⚠️ IMPORTANT: Do This Now!

Your app is deployed but **login will not work** until you complete these steps.

---

## Step-by-Step Instructions

### 1. Open Supabase Authentication Settings

Go to this URL:
```
https://supabase.com/dashboard/project/ftywwrzkbtayapfiocck/auth/url-configuration
```

Or manually:
1. Go to https://supabase.com/dashboard
2. Select project: `ftywwrzkbtayapfiocck`
3. Click "Authentication" in left sidebar
4. Click "URL Configuration"

---

### 2. Update Site URL

In the **Site URL** field, change from:
```
http://localhost:3000
```

To:
```
https://fleet-guard-five.vercel.app
```

---

### 3. Add Redirect URLs

In the **Redirect URLs** section, add these two URLs (keep localhost for development):

```
http://localhost:3000/**
https://fleet-guard-five.vercel.app/**
https://fleet-guard-q31afqawq-shoebbirader4s-projects.vercel.app/**
```

**Note**: The `/**` at the end is important - it allows all paths under that domain.

---

### 4. Save Changes

Click the **Save** button at the bottom of the page.

---

## ✅ Test Authentication

After saving:

1. Go to: https://fleet-guard-five.vercel.app
2. Try to log in with your credentials
3. You should be redirected properly after login
4. Gmail notifications should work for:
   - Password reset emails
   - Maintenance alerts
   - Odometer update notifications

---

## 📧 Email Notifications

Your notification system is configured to send emails through Supabase:

- **Email Provider**: Supabase built-in email (60 emails/hour on free tier)
- **Sender**: noreply@mail.app.supabase.io
- **Use Case**: 
  - Vehicle maintenance reminders
  - Document expiry alerts
  - Odometer threshold notifications
  - Password reset emails

If you want to use your Gmail account as the sender, you'll need to configure SMTP settings in Supabase (requires paid plan or custom SMTP).

---

## 🚨 Common Issues

### Login redirects to localhost
- You forgot to update the Site URL in Supabase
- Solution: Set Site URL to `https://fleet-guard-five.vercel.app`

### "Invalid redirect URL" error
- The Vercel URL is not in the Redirect URLs list
- Solution: Add `https://fleet-guard-five.vercel.app/**` to Redirect URLs

### Emails not sending
- Check your Supabase email quota (60/hour on free tier)
- Verify the notification-processor function is deployed
- Check function logs in Supabase dashboard

---

## 📊 Verification Checklist

After completing the setup:

- [ ] Site URL updated to Vercel domain
- [ ] Redirect URLs include Vercel domain
- [ ] Changes saved in Supabase
- [ ] Login works on production site
- [ ] Can access dashboard after login
- [ ] Notifications are being triggered
- [ ] Email alerts are received

---

## 🎯 Quick Test

1. Visit: https://fleet-guard-five.vercel.app
2. Log in with your credentials
3. Go to a vehicle detail page
4. Update the odometer reading
5. Check if notification is sent (if threshold exceeded)

---

**That's it! Your production deployment is complete and functional!** 🎉
