# FleetGuard Mechanic Mobile App Guide

## Overview

The FleetGuard Mechanic Mobile App enables workshop mechanics to efficiently manage work orders, capture maintenance documentation, and track parts and labor—all from their mobile device with full offline support.

## Features

### 🔧 Work Order Management
- View assigned work orders with priority indicators
- Start work with timestamp tracking
- Complete work orders with automatic service report generation
- Real-time status updates (Assigned → In Progress → Completed)

### 📸 Media Capture & Documentation
- **Photo Capture**: Take photos of vehicle issues or completed repairs
- **Video Recording**: Record short videos (up to 1 minute) for detailed documentation
- **Voice Notes**: Record audio descriptions of maintenance work
- **AI Analysis**: Automatic component identification and issue classification

### 💰 Parts & Labor Tracking
- Record parts consumed with quantity and cost
- Log labor hours with hourly rates
- Automatic total cost calculation
- Real-time summary of work order costs

### 📜 Service History
- View complete vehicle maintenance history
- Filter by all records, completed only, or recent (last 30 days)
- Access previous work order details and costs
- Review past labor hours and parts used

### 🔄 Offline-First Operation
- All features work without internet connectivity
- Automatic background sync when online
- Sync status indicator
- Data persistence with WatermelonDB

## Screen Navigation

```
┌─────────────────────────────────────┐
│     Mechanic Dashboard              │
│  - Assigned work orders count       │
│  - In progress count                │
│  - Completed today count            │
└──────────────┬──────────────────────┘
               │
               ├─► Work Order List
               │   ├─► Filter: Assigned
               │   ├─► Filter: In Progress
               │   └─► Filter: All
               │        │
               │        └─► Work Order Detail
               │             ├─► Start Work (if Assigned)
               │             ├─► Complete Work (if In Progress)
               │             ├─► Media Capture
               │             │   ├─► Photo
               │             │   ├─► Video
               │             │   └─► Voice
               │             ├─► Parts & Labor Entry
               │             └─► Service History
               │
               └─► Sign Out
```

## Using the App

### Starting Your Shift

1. **Open the App**
   - The app opens to the Mechanic Dashboard
   - View your work order statistics at a glance

2. **Check Assigned Work Orders**
   - Tap "View All Work Orders" on the dashboard
   - Or use the dashboard stats to see your workload

### Managing Work Orders

#### Viewing Work Orders

1. Navigate to "Work Order List"
2. Use filter tabs to narrow your view:
   - **Assigned**: New work orders waiting to be started
   - **In Progress**: Work orders you're currently working on
   - **All**: Complete list of your work orders

3. Each work order shows:
   - Work order number
   - Vehicle name
   - Description
   - Priority badge (Critical, High, Medium, Low)
   - Status badge
   - Creation date

#### Starting a Work Order

1. Tap on an assigned work order
2. Review the vehicle information and work details
3. Tap "Start Work"
4. Confirm the action
5. Status changes to "In Progress" with timestamp

#### Capturing Documentation

**Taking Photos:**
1. From Work Order Detail, tap "Capture Photo"
2. Grant camera permissions if prompted
3. Take photo or select from gallery
4. Review the captured photo
5. Wait for AI analysis (if configured)
6. Review AI-generated description
7. Tap "Save" to attach to work order

**Recording Video:**
1. From Work Order Detail, tap "Record Video"
2. Grant camera permissions if prompted
3. Tap camera icon to start recording
4. Recording stops automatically after 1 minute or tap stop
5. Review the video
6. Wait for AI analysis (if configured)
7. Tap "Save" to attach to work order

**Recording Voice Notes:**
1. From Work Order Detail, tap "Record Voice Note"
2. Grant microphone permissions if prompted
3. Tap "Start Recording"
4. Speak your maintenance notes clearly
5. Tap "Stop Recording" when done
6. Wait for AI analysis (if configured)
7. Review transcribed text and analysis
8. Tap "Save" to attach to work order

**AI Analysis Features:**
- Automatically identifies component type (e.g., "brake", "tire", "oil filter")
- Classifies damage type (e.g., "worn", "cracked", "leaking")
- Assesses severity (e.g., "critical", "medium", "low")
- Generates maintenance description
- Falls back gracefully if AI is not configured

#### Recording Parts & Labor

1. From Work Order Detail, tap "Record Parts & Labor"

**Adding Parts:**
1. Fill in part details:
   - Part Number
   - Description
   - Quantity
   - Unit Cost
2. Tap "+ Add Part"
3. Part appears in the list with calculated total
4. Repeat for additional parts
5. Remove parts by tapping the ✕ button

**Adding Labor:**
1. Fill in labor details:
   - Description (e.g., "Brake pad replacement")
   - Hours worked
   - Hourly Rate
2. Tap "+ Add Labor"
3. Labor entry appears in the list with calculated total
4. Repeat for additional labor entries
5. Remove labor by tapping the ✕ button

**Review Summary:**
- View total parts cost
- View total labor hours
- View total labor cost
- View grand total

3. Tap "Save Parts & Labor"
4. Work order is updated with totals

#### Viewing Service History

1. From Work Order Detail, tap "View Service History"
2. See complete maintenance history for the vehicle
3. Use filter tabs:
   - **All**: Complete service history
   - **Completed**: Only completed work orders
   - **Recent**: Last 30 days
4. View details for each service record:
   - Work order number and status
   - Description of work performed
   - Created and completed dates
   - Labor hours and total cost

#### Completing a Work Order

1. Ensure all work is documented:
   - ✅ Photos/videos/voice notes captured
   - ✅ Parts and labor recorded
2. Tap "Complete Work Order"
3. Confirm the completion
4. Status changes to "Completed" with timestamp
5. Service report is generated automatically
6. You're returned to the Work Order List

### Dashboard Statistics

The Mechanic Dashboard shows real-time stats:

- **Assigned**: Work orders waiting to be started
- **In Progress**: Work orders you're currently working on
- **Completed Today**: Work orders you've completed today

Pull down to refresh the statistics.

## Offline Mode

### How It Works

The app is designed to work seamlessly without internet connectivity:

1. **Data Storage**: All work orders, vehicles, and service history are stored locally
2. **Offline Operations**: All features work offline including:
   - Viewing work orders
   - Starting/completing work
   - Capturing media (stored locally)
   - Recording parts & labor
3. **Automatic Sync**: When internet connection is restored:
   - Status changes are synced
   - Media uploads automatically
   - Parts/labor data is sent to server
   - Local data is updated with server changes

### Sync Status Indicator

At the top of most screens, you'll see a sync status indicator:

- **🟢 Synced**: All data is up to date with the server
- **🟡 Syncing**: Currently syncing data
- **🔴 Offline**: No internet connection, operating in offline mode
- **⚠️ Pending Changes**: You have local changes waiting to sync

### Best Practices for Offline Work

1. **Start Online**: Open the app while online to download latest work orders
2. **Work Offline**: Perform all maintenance tasks without worrying about connectivity
3. **Sync When Possible**: The app automatically syncs when connection is restored
4. **Check Sync Status**: Ensure your work is synced before closing the app

## Permissions

The app requires the following permissions:

### Camera Permission
- **Purpose**: Take photos and record videos of maintenance work
- **When Requested**: First time you tap "Capture Photo" or "Record Video"
- **Required For**: Photo and video capture features

### Microphone Permission
- **Purpose**: Record voice notes describing maintenance work
- **When Requested**: First time you tap "Record Voice Note"
- **Required For**: Voice recording feature

### Storage Permission (Android)
- **Purpose**: Save media to device storage
- **When Requested**: Automatically when capturing media
- **Required For**: Media capture and offline storage

### Network Permission
- **Purpose**: Sync data with server and upload media
- **When Requested**: Automatically granted
- **Required For**: Online sync and uploads

## Troubleshooting

### Work Orders Not Appearing

**Problem**: Work order list is empty

**Solutions**:
1. Pull down to refresh the list
2. Check your internet connection and wait for sync
3. Check filter tabs (you may be on "In Progress" with no active work)
4. Sign out and sign back in to force a full refresh

### Media Capture Not Working

**Problem**: Camera or microphone doesn't work

**Solutions**:
1. Check app permissions in device settings
2. Close and reopen the app
3. Restart your device
4. Ensure your device camera/microphone hardware is working

### AI Analysis Not Showing

**Problem**: No AI analysis after capturing media

**Solutions**:
1. This is normal if AI is not configured on the backend
2. You can still save media without AI analysis
3. The media will be uploaded and attached to the work order

### Sync Issues

**Problem**: Changes not syncing to server

**Solutions**:
1. Check your internet connection
2. Ensure you're connected to WiFi or have cellular data
3. The app will retry automatically when connection is restored
4. Check sync status indicator at the top of the screen

### App Crashes

**Problem**: App closes unexpectedly

**Solutions**:
1. Clear app cache in device settings
2. Restart the app
3. Update to the latest app version
4. Contact support if problem persists

## Tips for Efficient Use

### 📋 Work Order Management
- Start your shift by pulling down to refresh work orders
- Focus on critical and high priority work orders first
- Complete one work order fully before starting the next

### 📸 Documentation
- Take clear, well-lit photos
- Capture multiple angles of issues
- Use voice notes for complex descriptions
- Review AI analysis and edit if needed

### 💵 Parts & Labor
- Enter parts and labor as you use them
- Double-check quantities and costs before saving
- Use descriptive labor descriptions for clarity

### 🔄 Sync Strategy
- Connect to WiFi at the beginning and end of your shift
- Let the app sync in the background
- Don't close the app immediately after completing work orders
- Check sync status before signing out

## Data Privacy & Security

- All data is encrypted in transit (TLS 1.3)
- Local data is stored securely on device
- User authentication required to access app
- Session timeout after 24 hours of inactivity
- Multi-tenant data isolation ensures your data is private

## Support

For technical support or questions:
- Contact your Fleet Manager
- Email: support@fleetguard.ai
- Refer to the work order number when reporting issues

## Updates

The app is regularly updated with new features and improvements:
- Enable automatic updates in your device's app store
- Check for updates weekly
- Review release notes for new features

## Keyboard Shortcuts & Gestures

### Pull to Refresh
- Pull down on any list to refresh data
- Works on: Dashboard, Work Order List, Service History

### Swipe Navigation
- Swipe back (left edge) to go to previous screen
- Standard Android/iOS back gestures supported

## Version Information

- **Current Version**: 1.0.0
- **Platform**: React Native (Expo)
- **Offline Support**: WatermelonDB
- **Backend**: Supabase
- **AI Features**: Computer Vision + NLP

---

**Made with ❤️ for FleetGuard mechanics**
