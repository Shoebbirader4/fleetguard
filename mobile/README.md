# FleetGuard AI Mobile Apps

React Native mobile applications for FleetGuard AI fleet management system.

## Overview

This mobile application supports three user roles:
- **Driver App**: Daily vehicle inspections, defect reporting
- **Mechanic App**: Work order management, maintenance record creation
- **Manager App**: Fleet monitoring, alert management, analytics

## Technology Stack

- **Framework**: React Native (Expo SDK 50)
- **Navigation**: React Navigation 6
- **State Management**: Zustand
- **Offline Storage**: WatermelonDB with SQLite
- **Backend**: Supabase (Auth, Database, Storage, Realtime)
- **Push Notifications**: Firebase Cloud Messaging (FCM)
- **Maps**: React Native Maps (Google Maps)

## Architecture

### Offline-First Design

The app implements an offline-first architecture using WatermelonDB:

1. **Local Database**: All data is stored locally using SQLite
2. **Background Sync**: Changes sync automatically when network is available
3. **Conflict Resolution**: Last-write-wins strategy for sync conflicts
4. **Queue Management**: Unsynced changes are queued until connectivity is restored

### Database Schema

WatermelonDB tables:
- `vehicles` - Vehicle information
- `work_orders` - Maintenance work orders
- `inspections` - Daily inspection records
- `alerts` - Fleet alerts and notifications
- `components` - Vehicle component tracking
- `inspection_checklists` - Inspection templates

### Authentication Flow

1. User enters credentials on LoginScreen
2. Supabase Auth validates credentials
3. User profile fetched to determine role and tenant
4. Navigation routes to appropriate dashboard based on role
5. FCM token registered for push notifications

## Setup Instructions

### Prerequisites

- Node.js 18+ installed
- Expo CLI installed (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Studio (Windows/Mac/Linux)
- Supabase project configured
- Firebase project configured for FCM

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
```

### Installation

```bash
# Navigate to mobile directory
cd mobile

# Install dependencies
npm install

# Start development server
npm start
```

### Running on Devices

**iOS Simulator:**
```bash
npm run ios
```

**Android Emulator:**
```bash
npm run android
```

**Physical Device:**
1. Install Expo Go app from App Store/Play Store
2. Scan QR code from `npm start`

## Project Structure

```
mobile/
├── src/
│   ├── database/           # WatermelonDB schema and models
│   │   ├── models/         # Data models
│   │   ├── schema.ts       # Database schema
│   │   ├── migrations.ts   # Schema migrations
│   │   └── index.ts        # Database instance
│   ├── lib/                # Core libraries
│   │   ├── supabase.ts     # Supabase client
│   │   ├── syncEngine.ts   # Offline sync logic
│   │   └── notifications.ts # FCM setup
│   ├── navigation/         # React Navigation
│   │   └── AppNavigator.tsx
│   ├── screens/            # Screen components
│   │   ├── auth/           # Authentication screens
│   │   ├── driver/         # Driver-specific screens
│   │   ├── mechanic/       # Mechanic-specific screens
│   │   └── manager/        # Manager-specific screens
│   └── stores/             # Zustand state stores
│       └── authStore.ts    # Authentication state
├── App.tsx                 # Root component
├── app.json                # Expo configuration
├── babel.config.js         # Babel configuration
├── metro.config.js         # Metro bundler config
├── tsconfig.json           # TypeScript config
└── package.json            # Dependencies

```

## Key Features

### 1. Offline-First Sync

```typescript
// Automatic sync when network is available
NetInfo.addEventListener(state => {
  if (state.isConnected) {
    syncEngine.sync();
  }
});
```

### 2. Push Notifications

```typescript
// Register for FCM notifications
await registerForPushNotifications();

// Handle notification taps
addNotificationResponseReceivedListener(response => {
  // Navigate to relevant screen
});
```

### 3. Role-Based Navigation

```typescript
// Different dashboards for different roles
if (role === 'driver') return 'DriverDashboard';
if (role === 'mechanic') return 'MechanicDashboard';
if (role === 'fleet_manager') return 'ManagerDashboard';
```

## Development Workflow

### Testing

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Run tests
npm test
```

### Building for Production

**iOS:**
```bash
eas build --platform ios
```

**Android:**
```bash
eas build --platform android
```

## Offline Storage Strategy

### Data Flow

1. **User Action** → Local WatermelonDB write
2. **Mark as Unsynced** → `synced: false` flag
3. **Network Available** → Sync engine pushes to Supabase
4. **Sync Success** → Mark as synced `synced: true`

### Sync Priority

1. User-created data (inspections, work orders)
2. User updates (status changes)
3. Read-only data (vehicles, alerts)

## Firebase Cloud Messaging Setup

### Android Configuration

1. Download `google-services.json` from Firebase Console
2. Place in `mobile/` directory
3. Reference in `app.json`:

```json
{
  "android": {
    "googleServicesFile": "./google-services.json"
  }
}
```

### iOS Configuration

1. Download `GoogleService-Info.plist` from Firebase Console
2. Add to iOS build via Xcode or EAS Build

## Common Issues

### WatermelonDB Build Errors

If you encounter build errors with WatermelonDB:
```bash
# Clear cache
expo start --clear

# Rebuild native modules
expo prebuild --clean
```

### Push Notifications Not Working

- Ensure Firebase project is configured
- Verify `google-services.json` is present
- Check FCM token is saved to user profile
- Test on physical device (push notifications don't work on simulators)

## Next Steps

- Implement inspection checklist screens (Task 13.2)
- Add photo capture and upload functionality (Task 13.3)
- Build work order management screens (Task 13.4)
- Integrate GPS tracking (Task 13.5)
- Add real-time alert notifications (Task 13.6)

## Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Navigation](https://reactnavigation.org/)
- [WatermelonDB](https://nozbe.github.io/WatermelonDB/)
- [Supabase React Native Guide](https://supabase.com/docs/guides/getting-started/quickstarts/react-native)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)

## Support

For issues or questions, contact the development team or refer to the main project documentation.
