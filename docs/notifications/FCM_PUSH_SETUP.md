# Firebase Cloud Messaging (FCM) Setup Guide

## Overview

This guide walks you through setting up Firebase Cloud Messaging (FCM) for FleetGuard AI push notifications on Android and iOS mobile apps.

**Prerequisites:**
- Google Account
- Mobile app bundle IDs (for iOS) or package names (for Android)

**Estimated Setup Time:** 20-30 minutes

---

## Step 1: Create Firebase Project

### 1.1 Access Firebase Console

1. Navigate to [Firebase Console](https://console.firebase.google.com/)
2. Sign in with your Google Account
3. Click **"Add project"** (or **"Create a project"**)

### 1.2 Configure Project

1. **Project name**: Enter `FleetGuard AI`
2. Click **"Continue"**
3. **Google Analytics**: 
   - Toggle ON (recommended for analytics)
   - Or toggle OFF for faster setup
4. Click **"Continue"**
5. If Google Analytics enabled:
   - Select or create Analytics account
   - Accept terms
6. Click **"Create project"**
7. Wait for project creation (30-60 seconds)
8. Click **"Continue"**

---

## Step 2: Add Android App

### 2.1 Register Android App

1. In Firebase Console, click the **Android icon** to add Android app
2. Fill in app details:
   - **Android package name**: `com.fleetguard.mobile` (or your actual package name)
   - **App nickname**: `FleetGuard Android` (optional)
   - **Debug signing certificate SHA-1**: (optional for FCM, required for other Firebase features)
3. Click **"Register app"**

### 2.2 Download google-services.json

1. Click **"Download google-services.json"**
2. Save the file
3. In your React Native project, place the file at:
   ```
   android/app/google-services.json
   ```

### 2.3 Add Firebase SDK

Firebase SDK should already be configured if you're using React Native Firebase.

Verify in `android/build.gradle`:

```gradle
buildscript {
    dependencies {
        classpath 'com.google.gms:google-services:4.3.15'
    }
}
```

And in `android/app/build.gradle`:

```gradle
apply plugin: 'com.google.gms.google-services'

dependencies {
    implementation platform('com.google.firebase:firebase-bom:32.0.0')
    implementation 'com.google.firebase:firebase-messaging'
}
```

### 2.4 Complete Setup

1. Click **"Next"** (skip additional steps if SDK already configured)
2. Click **"Continue to console"**

---

## Step 3: Add iOS App

### 3.1 Register iOS App

1. In Firebase Console, click the **iOS icon** to add iOS app
2. Fill in app details:
   - **iOS bundle ID**: `com.fleetguard.mobile` (from Xcode project)
   - **App nickname**: `FleetGuard iOS` (optional)
   - **App Store ID**: (optional, can add later)
3. Click **"Register app"**

### 3.2 Download GoogleService-Info.plist

1. Click **"Download GoogleService-Info.plist"**
2. Save the file
3. Open your Xcode project
4. Drag and drop the file into the project root
5. Ensure "Copy items if needed" is checked
6. Select your app target

### 3.3 Configure APNs (Apple Push Notification service)

Firebase uses APNs to send notifications to iOS devices.

#### Get APNs Authentication Key

1. Go to [Apple Developer Portal](https://developer.apple.com/account/)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Click **Keys** in the sidebar
4. Click **+** to create a new key
5. Configure key:
   - **Key Name**: `FleetGuard APNs Key`
   - **Enable**: Apple Push Notifications service (APNs)
6. Click **"Continue"**
7. Click **"Register"**
8. **Download the .p8 file** (you can only download once)
9. Note the **Key ID** (10-character string)
10. Note your **Team ID** (found in top right of Apple Developer portal)

#### Upload APNs Key to Firebase

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Select the **Cloud Messaging** tab
3. Scroll to **Apple app configuration**
4. Under **APNs Authentication Key**, click **"Upload"**
5. Upload the .p8 file
6. Enter **Key ID** and **Team ID**
7. Click **"Upload"**

---

## Step 4: Get Server Key (Legacy)

**Note:** FCM now recommends using Firebase Admin SDK with service account, but the legacy server key still works and is simpler to set up.

### 4.1 Get Legacy Server Key

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Select the **Cloud Messaging** tab
3. Scroll to **Cloud Messaging API (Legacy)**
4. If disabled, click **"Enable"**
5. Copy the **Server key**
   - Format: `AAAAxxxxxxx:APA91bxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
6. Save this for `FCM_SERVER_KEY` environment variable

### 4.2 Note Project ID

1. In **Project Settings → General**
2. Copy **Project ID** (format: `fleetguard-ai-12345`)
3. Save for `FCM_PROJECT_ID` environment variable

---

## Step 5: Create Service Account (Recommended for Production)

For production, use service account authentication instead of legacy server key.

### 5.1 Create Service Account

1. In Firebase Console, go to **Project Settings → Service Accounts**
2. Click **"Generate new private key"**
3. Confirm by clicking **"Generate key"**
4. A JSON file will download (format: `fleetguard-ai-xxxxx-firebase-adminsdk-xxxxx.json`)
5. **Keep this file secure** - it provides admin access to your Firebase project

### 5.2 Store Service Account

1. Rename file to: `firebase-service-account.json`
2. Place in project root or secure location
3. **Never commit this file to version control**
4. Add to `.gitignore`:
   ```
   firebase-service-account.json
   ```

---

## Step 6: Configure React Native App

### 6.1 Install React Native Firebase

If not already installed:

```bash
npm install @react-native-firebase/app @react-native-firebase/messaging
```

For iOS, install pods:

```bash
cd ios && pod install && cd ..
```

### 6.2 Request Notification Permissions

In your React Native app:

```typescript
import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';

// Request permission (iOS requires this, Android 12- automatically granted)
async function requestNotificationPermission() {
  if (Platform.OS === 'ios') {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log('Authorization status:', authStatus);
    }
  }
}
```

### 6.3 Get FCM Token

```typescript
import messaging from '@react-native-firebase/messaging';

async function getFCMToken() {
  try {
    // Get FCM token
    const token = await messaging().getToken();
    console.log('FCM Token:', token);
    
    // Send token to your backend
    await sendTokenToBackend(token);
    
    return token;
  } catch (error) {
    console.error('Error getting FCM token:', error);
  }
}

async function sendTokenToBackend(token: string) {
  await fetch('https://your-project.supabase.co/rest/v1/users', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_USER_TOKEN',
      'apikey': 'YOUR_SUPABASE_ANON_KEY',
    },
    body: JSON.stringify({ fcm_token: token }),
  });
}
```

### 6.4 Handle Token Refresh

```typescript
messaging().onTokenRefresh(async (token) => {
  console.log('FCM Token refreshed:', token);
  await sendTokenToBackend(token);
});
```

### 6.5 Handle Foreground Notifications

```typescript
import messaging from '@react-native-firebase/messaging';

messaging().onMessage(async (remoteMessage) => {
  console.log('Notification received in foreground:', remoteMessage);
  
  // Show local notification
  // Or update UI directly
});
```

### 6.6 Handle Background Notifications

```typescript
// In index.js (before AppRegistry.registerComponent)
import messaging from '@react-native-firebase/messaging';

messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('Message handled in background:', remoteMessage);
  
  // Process notification
  // Update local database
});
```

### 6.7 Handle Notification Tap

```typescript
import { useEffect } from 'react';
import messaging from '@react-native-firebase/messaging';
import { useNavigation } from '@react-navigation/native';

function useNotificationHandler() {
  const navigation = useNavigation();

  useEffect(() => {
    // Handle notification tap when app is in background
    messaging().onNotificationOpenedApp((remoteMessage) => {
      console.log('Notification opened app from background:', remoteMessage);
      
      // Navigate to alert screen
      if (remoteMessage.data?.alert_id) {
        navigation.navigate('AlertDetail', {
          alertId: remoteMessage.data.alert_id,
        });
      }
    });

    // Handle notification tap when app was closed
    messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (remoteMessage) {
          console.log('Notification opened app from quit state:', remoteMessage);
          
          if (remoteMessage.data?.alert_id) {
            navigation.navigate('AlertDetail', {
              alertId: remoteMessage.data.alert_id,
            });
          }
        }
      });
  }, [navigation]);
}
```

---

## Step 7: Configure Environment Variables

Add the following to your `.env` file:

```bash
# Firebase Cloud Messaging Configuration
FCM_SERVER_KEY=AAAAxxxxxxx:APA91bxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
FCM_PROJECT_ID=fleetguard-ai-12345
# For service account authentication (recommended for production)
FCM_SERVICE_ACCOUNT_KEY_PATH=./firebase-service-account.json
```

**Required Variables:**
- `FCM_SERVER_KEY`: From Step 4.1
- `FCM_PROJECT_ID`: From Step 4.2

**Optional Variables:**
- `FCM_SERVICE_ACCOUNT_KEY_PATH`: Path to service account JSON file

---

## Step 8: Test Push Notifications

### 8.1 Test via Firebase Console

1. In Firebase Console, go to **Cloud Messaging**
2. Click **"Send your first message"**
3. Configure test notification:
   - **Notification title**: "Test Alert"
   - **Notification text**: "This is a test notification from FleetGuard AI"
4. Click **"Next"**
5. **Target**: Select "Single device"
6. **FCM registration token**: Paste token from Step 6.3
7. Click **"Next"**
8. **Scheduling**: Now
9. Click **"Review"**
10. Click **"Publish"**

**Check your mobile device** - notification should appear within seconds.

### 8.2 Test via API

```bash
curl -X POST https://fcm.googleapis.com/fcm/send \
  -H "Authorization: key=YOUR_FCM_SERVER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "USER_FCM_TOKEN",
    "notification": {
      "title": "Test Alert",
      "body": "This is a test notification",
      "icon": "ic_notification",
      "sound": "default"
    },
    "data": {
      "alert_id": "12345",
      "alert_type": "test",
      "severity": "low"
    }
  }'
```

### 8.3 Test via FleetGuard AI

```bash
curl -X POST https://your-project.supabase.co/functions/v1/notification-processor/test \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "push",
    "recipient": "USER_FCM_TOKEN",
    "test_message": true
  }'
```

---

## Step 9: Production Checklist

Before going live, ensure:

- ✅ Firebase project created
- ✅ Android app registered with google-services.json
- ✅ iOS app registered with GoogleService-Info.plist
- ✅ APNs authentication key uploaded (iOS)
- ✅ Server key or service account configured
- ✅ React Native Firebase SDK installed
- ✅ Notification permissions requested
- ✅ FCM token retrieval implemented
- ✅ Foreground/background handlers implemented
- ✅ Notification tap handling implemented
- ✅ Environment variables configured
- ✅ Test notifications delivered successfully

---

## Troubleshooting

### iOS: Notifications not received

**Solutions:**
1. **Check APNs key**:
   - Verify APNs key uploaded to Firebase
   - Ensure Key ID and Team ID are correct
   - Verify .p8 file is valid

2. **Check capabilities**:
   - In Xcode, select target → Signing & Capabilities
   - Ensure "Push Notifications" capability is added
   - Ensure "Background Modes" → "Remote notifications" is enabled

3. **Check entitlements**:
   - Verify `aps-environment` is set in entitlements file
   - Should be `development` for debug, `production` for release

4. **Check permissions**:
   - Request notification permissions before attempting to receive
   - Check permission status in Settings → FleetGuard AI

### Android: Notifications not received

**Solutions:**
1. **Check google-services.json**:
   - Ensure file is in `android/app/` directory
   - Verify package name matches Firebase console

2. **Check battery optimization**:
   - Some Android devices kill background apps
   - Request user to disable battery optimization for your app

3. **Check notification channels** (Android 8+):
   ```kotlin
   // Create notification channel
   val channel = NotificationChannel(
       "alerts",
       "Fleet Alerts",
       NotificationManager.IMPORTANCE_HIGH
   )
   notificationManager.createNotificationChannel(channel)
   ```

### Error: "MismatchSenderId"

**Cause:** FCM token from one Firebase project, server key from another

**Solution:**
- Verify `google-services.json` and `GoogleService-Info.plist` are from correct project
- Ensure server key matches Firebase project
- Regenerate FCM token after fixing configuration

### Error: "InvalidRegistration"

**Cause:** Invalid FCM token format

**Solution:**
- Verify FCM token is correctly retrieved
- Ensure token is stored correctly in database
- Check token hasn't been deleted or expired

### Notifications delayed

**Cause:** Device in Doze mode or battery saver

**Solution:**
- Use high priority messages:
  ```json
  {
    "priority": "high",
    "notification": { ... }
  }
  ```
- Request battery optimization exemption
- Use FCM data messages for critical alerts

---

## Notification Payload Best Practices

### 1. Notification Structure

```json
{
  "to": "FCM_TOKEN",
  "priority": "high",
  "notification": {
    "title": "Critical Alert: Engine Overheating",
    "body": "Vehicle BUS-001 requires immediate attention",
    "icon": "ic_notification",
    "color": "#DC2626",
    "sound": "default",
    "badge": "1",
    "click_action": "FLUTTER_NOTIFICATION_CLICK"
  },
  "data": {
    "alert_id": "abc123",
    "alert_type": "critical_failure_risk",
    "severity": "critical",
    "vehicle_id": "bus-001",
    "timestamp": "2024-01-15T14:30:00Z"
  }
}
```

### 2. iOS-specific Configuration

```json
{
  "apns": {
    "headers": {
      "apns-priority": "10"
    },
    "payload": {
      "aps": {
        "alert": {
          "title": "Critical Alert",
          "body": "Engine overheating detected"
        },
        "sound": "default",
        "badge": 1,
        "category": "ALERT_CATEGORY"
      }
    }
  }
}
```

### 3. Android-specific Configuration

```json
{
  "android": {
    "priority": "high",
    "notification": {
      "channel_id": "alerts",
      "notification_priority": "PRIORITY_HIGH",
      "sound": "default",
      "color": "#DC2626",
      "icon": "ic_notification"
    }
  }
}
```

---

## Rate Limits and Quotas

### Free Tier (Spark Plan)
- **Unlimited notifications**
- No cost for FCM
- Standard rate limits apply

### Paid Plans (Blaze Plan)
- **Unlimited notifications**
- Pay for Firebase services used (Storage, Database, etc.)
- FCM remains free

### Rate Limits
- **Upstream messages** (device to server): 1,500,000 per minute per project
- **Downstream messages** (server to device): 600,000 per minute per project
- **Topic messages**: 10,000 per minute per project

For higher limits, contact Firebase support.

---

## Cost Considerations

Firebase Cloud Messaging is **completely free** for:
- Unlimited notifications
- All devices (iOS, Android, Web)
- All notification types

**Related Firebase Services** (if used):
- **Realtime Database**: Free tier: 1GB storage, 10GB/month transfer
- **Firestore**: Free tier: 1GB storage, 50K reads/day
- **Storage**: Free tier: 5GB storage, 1GB/day transfer

FleetGuard AI only uses FCM for notifications, so **no costs** for FCM specifically.

---

## Security Best Practices

### 1. Protect Server Key

```bash
# Never commit server key to version control
# Add to .gitignore
.env
firebase-service-account.json
```

### 2. Validate FCM Tokens

```typescript
function isValidFCMToken(token: string): boolean {
  // FCM tokens are typically 152-163 characters
  return token && token.length >= 140 && token.length <= 170;
}
```

### 3. Token Management

```typescript
// Store token with timestamp
interface FCMTokenRecord {
  userId: string;
  token: string;
  platform: 'ios' | 'android';
  createdAt: Date;
  lastUsedAt: Date;
}

// Periodically clean up invalid tokens
async function cleanupInvalidTokens() {
  const { data: failedJobs } = await supabase
    .from('notification_jobs')
    .select('recipient, error_message')
    .eq('channel', 'push')
    .eq('status', 'failed')
    .like('error_message', '%InvalidRegistration%');

  for (const job of failedJobs) {
    await supabase
      .from('users')
      .update({ fcm_token: null })
      .eq('fcm_token', job.recipient);
  }
}
```

### 4. Data Privacy

- Don't include sensitive data in notification payload
- Use notification data field for IDs only
- Fetch sensitive details after notification tap

---

## Advanced Features

### 1. Topic Messaging

Send notifications to multiple devices subscribed to a topic:

```typescript
// Subscribe to topic (mobile app)
await messaging().subscribeToTopic('critical-alerts');

// Send to topic (backend)
const message = {
  topic: 'critical-alerts',
  notification: {
    title: 'System Alert',
    body: 'Critical system maintenance scheduled',
  },
};

await admin.messaging().send(message);
```

### 2. Notification Channels (Android)

Create channels for different alert types:

```typescript
const channels = [
  {
    id: 'critical',
    name: 'Critical Alerts',
    importance: 'high',
    sound: 'critical_alert.mp3',
  },
  {
    id: 'maintenance',
    name: 'Maintenance Reminders',
    importance: 'default',
    sound: 'default',
  },
];
```

### 3. Silent Notifications (Data-only)

Send data without showing notification:

```json
{
  "to": "FCM_TOKEN",
  "data": {
    "type": "data_sync",
    "timestamp": "2024-01-15T14:30:00Z"
  },
  "content_available": true
}
```

### 4. Notification Analytics

Track notification performance:

```typescript
messaging().onNotificationOpenedApp((remoteMessage) => {
  // Track notification tap
  analytics().logEvent('notification_opened', {
    alert_id: remoteMessage.data.alert_id,
    alert_type: remoteMessage.data.alert_type,
  });
});
```

---

## Useful Resources

- [Firebase Cloud Messaging Documentation](https://firebase.google.com/docs/cloud-messaging)
- [React Native Firebase](https://rnfirebase.io/)
- [FCM API Reference](https://firebase.google.com/docs/reference/fcm/rest/v1/projects.messages)
- [APNs Documentation](https://developer.apple.com/documentation/usernotifications)
- [Android Notification Guide](https://developer.android.com/guide/topics/ui/notifiers/notifications)

---

## Support

For Firebase issues:
- Firebase Support: [firebase.google.com/support](https://firebase.google.com/support)
- Community Forum: [firebase.google.com/community](https://firebase.google.com/community)
- Stack Overflow: Tag questions with `firebase-cloud-messaging`

For FleetGuard AI integration issues:
- Check Edge Function logs in Supabase Dashboard
- Review notification_jobs table for error messages
- Check mobile app logs for FCM token issues
- Contact FleetGuard AI support team
