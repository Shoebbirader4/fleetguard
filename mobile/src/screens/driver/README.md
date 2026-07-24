# Driver Mobile App Screens

## Overview
Complete driver mobile app implementation with offline-first functionality for daily operations.

## Screens

### 1. DashboardScreen.tsx
**Purpose**: Main driver dashboard showing vehicle info and quick actions

**Features**:
- Vehicle information display (make, model, VIN, odometer, route, depot)
- Inspection summary (last inspection, total count, pending defects)
- Quick action buttons (Start Inspection, Report Defect)
- Pull-to-refresh functionality
- Offline-first data loading

**Navigation**:
- From: Login (after successful driver login)
- To: DailyInspectionScreen, DefectReportScreen

**Requirements**: 15.6 (Display assigned vehicle and route information)

### 2. DailyInspectionScreen.tsx
**Purpose**: Daily vehicle inspection checklist with photo capture

**Features**:
- Dynamic checklist loading based on vehicle type
- Multiple item types (yes/no, pass/fail, numeric, text, photo)
- Photo capture with camera
- Odometer reading input
- Automatic compliance tracking
- Notes for non-compliant items
- Photo requirements for failed items
- Offline data persistence

**Navigation**:
- From: DashboardScreen
- Params: { vehicleId, checklistId }
- Returns to: DashboardScreen (after submission)

**Requirements**:
- 15.2 (Daily inspection checklist customized per vehicle type)
- 15.3 (Record completion timestamp, odometer, inspection results)

**Data Flow**:
1. Load vehicle info from WatermelonDB
2. Load checklist items for vehicle type
3. Driver completes checklist
4. Capture photos for failed/required items
5. Save inspection to local database
6. Update vehicle odometer
7. Queue for sync (synced: false)
8. Sync engine uploads when online

### 3. DefectReportScreen.tsx
**Purpose**: Report vehicle defects with severity classification

**Features**:
- Defect description (required)
- Severity selection (low, medium, high, critical)
- Photo capture (required for critical defects)
- Automatic work order creation
- Critical defect alerting
- Offline submission

**Severity Levels**:
- **Low**: Minor issue, does not affect operation (Green)
- **Medium**: Moderate issue, requires attention soon (Yellow)
- **High**: Significant issue, requires immediate attention (Red)
- **Critical**: Safety risk, vehicle should not operate (Dark Red)

**Navigation**:
- From: DashboardScreen
- Params: { vehicleId }
- Returns to: DashboardScreen (after submission)

**Requirements**:
- 15.4 (Report defects with description, severity, photo uploads)
- 15.5 (Critical defects immediately notify Fleet Manager and Workshop Manager)

**Data Flow**:
1. Load vehicle info
2. Driver enters defect details
3. Driver selects severity level
4. Capture/select photos
5. Create work order (priority = severity)
6. If critical/high: Create alert (type: safety_risk)
7. Save to local database
8. Queue for sync
9. Sync engine notifies managers when online

## Offline Functionality

All screens work completely offline using:
- **WatermelonDB**: Local SQLite database
- **FileSystem**: Local photo storage
- **SyncEngine**: Background sync when online
- **AsyncStorage**: Last sync time tracking

### Offline Data Storage

**Inspections**:
```typescript
{
  id: UUID,
  tenantId: string,
  vehicleId: string,
  inspectorId: string,
  checklistId: string,
  inspectionDate: timestamp,
  odometerReading: number,
  overallStatus: 'pass' | 'fail' | 'warning',
  checklistResults: JSON string,
  defectsReported: number,
  synced: false
}
```

**Work Orders** (from defects):
```typescript
{
  id: UUID,
  tenantId: string,
  workOrderNumber: string,
  vehicleId: string,
  description: '[DEFECT] ...',
  priority: 'low' | 'medium' | 'high' | 'critical',
  status: 'pending',
  requestedBy: userId,
  synced: false
}
```

**Alerts** (from critical defects):
```typescript
{
  id: UUID,
  tenantId: string,
  vehicleId: string,
  alertType: 'safety_risk',
  severity: 'high' | 'critical',
  title: string,
  description: string,
  status: 'active',
  synced: false
}
```

### Sync Behavior

1. **Background Sync**: Automatically syncs when network detected
2. **Periodic Sync**: Every 5 minutes when online
3. **Conflict Resolution**: Last-write-wins strategy
4. **Retry Logic**: Up to 3 attempts for failed syncs
5. **Status Tracking**: Real-time sync status indicator

## Photo Handling

### Storage Strategy
```
${FileSystem.documentDirectory}/
├── inspections/
│   └── inspection_{vehicleId}_{timestamp}.jpg
└── defects/
    └── defect_{vehicleId}_{timestamp}.jpg
```

### Offline Mode
- Photos stored locally in app's document directory
- Full file paths stored in database
- Photos queued for upload when online

### Future: Supabase Storage Upload
```typescript
// Upload to Supabase Storage when online
const { data, error } = await supabase.storage
  .from('inspection-photos')
  .upload(`${tenantId}/${vehicleId}/${filename}`, file);
```

## Push Notifications

Handled in `App.tsx`:

**Foreground Notifications**:
- Display alert dialog with notification content
- User sees notification while using app

**Background/Tapped Notifications**:
- Parse notification data
- Navigate to appropriate screen
- Handle alert routing

**Critical Defect Flow**:
1. Driver reports critical defect
2. Alert saved to local database
3. Sync engine uploads when online
4. Edge Function dispatches notifications
5. Fleet Manager receives push notification
6. Workshop Manager receives push notification
7. SMS/Email/WhatsApp also sent (based on preferences)

## Testing

### Manual Test Cases

**Daily Inspection**:
1. Login as driver
2. View assigned vehicle on dashboard
3. Tap "Start Inspection"
4. Enter odometer reading
5. Complete all checklist items
6. Mark one item as fail
7. Add notes to failed item
8. Capture photo for failed item
9. Submit inspection
10. Verify inspection saved
11. Go offline, verify data persists
12. Go online, verify sync

**Defect Reporting**:
1. From dashboard, tap "Report New Defect"
2. Enter defect description
3. Select severity (try all levels)
4. Capture multiple photos
5. Submit defect report
6. Verify work order created
7. For critical: Verify alert created
8. Go offline, submit defect
9. Go online, verify sync
10. Verify notification sent (if critical)

### Offline Testing
1. Enable Airplane Mode
2. Complete inspection
3. Report defect
4. Verify data saved locally
5. Disable Airplane Mode
6. Wait for auto-sync
7. Verify data in Supabase

### Photo Testing
1. Capture photo with camera
2. Select photo from gallery
3. Multiple photos per item
4. Verify photo storage
5. Verify photo paths in database

## Code Quality

### TypeScript
- Full type safety with interfaces
- Proper type annotations
- Type guards where needed

### Error Handling
- Try-catch blocks for async operations
- User-friendly error messages
- Graceful degradation

### Performance
- Optimized database queries
- Lazy loading of data
- Efficient re-renders
- Proper cleanup of listeners

### Accessibility
- Proper text sizes
- Color contrast
- Touch target sizes
- Screen reader support (future enhancement)

## Dependencies

See `mobile/package.json` for full list:
- `expo-camera`: Photo capture
- `expo-image-picker`: Gallery selection
- `expo-file-system`: Local file storage
- `@nozbe/watermelondb`: Offline database
- `@react-navigation/native`: Navigation
- `date-fns`: Date formatting
- `zustand`: State management

## Future Enhancements

1. **Photo Preview**: Show thumbnails before submission
2. **Voice Notes**: Audio recording for defects
3. **Barcode Scanning**: Scan VIN/part numbers
4. **Inspection History**: View past inspections
5. **Defect Tracking**: Track work order status
6. **Signature Capture**: Sign off on inspections
7. **PDF Export**: Export inspection reports
8. **Offline Maps**: View route without connectivity
9. **Vehicle Health**: Show component status
10. **Maintenance Schedule**: View upcoming maintenance

## Troubleshooting

### Photos Not Saving
- Check camera permissions
- Verify FileSystem directory creation
- Check disk space

### Sync Not Working
- Verify network connectivity
- Check Supabase credentials
- Review sync engine logs

### Database Errors
- Clear app data and re-sync
- Check database migrations
- Verify schema matches Supabase

### Navigation Issues
- Check navigation params
- Verify screen registration
- Review navigation types

## Support

For issues or questions:
1. Check logs in React Native Debugger
2. Review TASK_13.3_COMPLETION_SUMMARY.md
3. Check Supabase dashboard for data
4. Test on physical device (not simulator)
