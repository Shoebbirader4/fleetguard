# Offline-First Sync Implementation Guide

## Overview

The FleetGuard AI mobile app implements a robust offline-first synchronization system using WatermelonDB for local storage and Supabase for remote backend. This guide explains the architecture, features, and usage of the sync engine.

## Architecture

### Components

1. **WatermelonDB**: Local SQLite database with JSI for performance
2. **Sync Engine**: Bidirectional sync manager with conflict resolution
3. **Network Listener**: Automatic sync trigger on connectivity restoration
4. **Sync Status Tracker**: Real-time sync status monitoring

### Data Flow

```
┌─────────────────┐
│  Mobile App     │
│                 │
│  ┌───────────┐  │
│  │ UI Layer  │  │
│  └─────┬─────┘  │
│        │        │
│  ┌─────▼─────┐  │
│  │WatermelonDB│◄─┼─── Local storage (offline-capable)
│  └─────┬─────┘  │
│        │        │
│  ┌─────▼─────┐  │
│  │Sync Engine│  │
│  └─────┬─────┘  │
└────────┼────────┘
         │
    ┌────▼────┐
    │ Network │
    │Detection│
    └────┬────┘
         │
         │ (When online)
         │
    ┌────▼────┐
    │Supabase │
    │Backend  │
    └─────────┘
```

## Features

### 1. Bidirectional Sync

The sync engine supports both push and pull operations:

- **Push**: Upload local changes to Supabase
- **Pull**: Download remote changes to local database

```typescript
// Sync order:
// 1. Push local changes first
// 2. Then pull remote changes
// 3. Apply conflict resolution
await syncEngine.sync();
```

### 2. Background Sync

Automatic sync triggers when:
- Network connectivity is restored
- App comes to foreground
- Periodic interval (every 5 minutes when online)

```typescript
// Initialize on app startup
await syncEngine.initialize();

// Background sync starts automatically
// Cleanup on app unmount
syncEngine.stopBackgroundSync();
```

### 3. Conflict Resolution

**Strategy**: Last-write-wins based on `updated_at` timestamp

When a conflict is detected:
1. Compare local and remote `updated_at` timestamps
2. Keep the newer version
3. Discard the older version
4. Log conflict for monitoring

```typescript
// Conflict detection
if (remoteUpdatedAt > localUpdatedAt) {
  // Remote wins, update local
  await record.update(remoteData);
} else {
  // Local wins, will push in next sync
  conflictCount++;
}
```

### 4. Sync Status Tracking

Real-time status monitoring with:
- Sync in progress indicator
- Last sync timestamp
- Pending changes count
- Error messages

```typescript
// Get current status
const status = await syncEngine.getStatus();
console.log(status);
// {
//   isSyncing: false,
//   lastSyncTime: Date,
//   lastSyncSuccess: true,
//   pendingChanges: 5
// }

// Listen for status changes
const unsubscribe = syncEngine.addSyncListener((status) => {
  console.log('Sync status updated:', status);
});
```

### 5. Queue Management

Pending changes are tracked with a `synced` flag:
- `synced: false` = needs to be pushed
- `synced: true` = in sync with server

```typescript
// Create a record offline
await database.write(async () => {
  await database.collections.get('inspections').create(inspection => {
    inspection.vehicleId = vehicleId;
    inspection.inspectorId = userId;
    inspection.synced = false; // Will be pushed on next sync
  });
});
```

### 6. Error Handling

Comprehensive error handling with:
- Network connectivity checks
- Retry logic for failed operations
- Graceful degradation
- Error logging

```typescript
try {
  const result = await syncEngine.sync();
  if (!result.success) {
    console.error('Sync failed:', result.error);
  }
} catch (error) {
  console.error('Sync exception:', error);
}
```

## Database Schema

### Tables

1. **vehicles** - Vehicle profiles
2. **work_orders** - Maintenance work orders
3. **inspections** - Daily inspection records
4. **alerts** - Fleet alerts and notifications
5. **components** - Vehicle component tracking
6. **inspection_checklists** - Inspection templates

### Synced Entities

All tables include these sync-related fields:
- `synced: boolean` - Sync status flag
- `created_at: number` - Creation timestamp
- `updated_at: number` - Last update timestamp

## Usage Examples

### Initialize Sync Engine

```typescript
// In App.tsx
import { syncEngine } from './src/lib/syncEngine';

useEffect(() => {
  async function init() {
    await syncEngine.initialize();
  }
  init();

  return () => {
    syncEngine.stopBackgroundSync();
  };
}, []);
```

### Manual Sync Trigger

```typescript
import { syncEngine } from '../lib/syncEngine';

const handleSyncButton = async () => {
  const result = await syncEngine.sync();
  
  if (result.success) {
    Alert.alert('Success', `Synced ${result.pushedRecords} local changes`);
  } else {
    Alert.alert('Error', result.error);
  }
};
```

### Display Sync Status

```typescript
import SyncStatusIndicator from '../components/SyncStatusIndicator';

function DashboardScreen() {
  return (
    <View>
      <SyncStatusIndicator />
      {/* Rest of dashboard */}
    </View>
  );
}
```

### Create Offline Records

```typescript
import { database } from '../database';

// Works offline - will sync when online
async function createInspection(data) {
  await database.write(async () => {
    const inspection = await database.collections
      .get('inspections')
      .create(i => {
        i.vehicleId = data.vehicleId;
        i.inspectorId = data.inspectorId;
        i.inspectionDate = Date.now();
        i.odometerReading = data.odometer;
        i.overallStatus = data.status;
        i.checklistResults = JSON.stringify(data.results);
        i.synced = false; // Will sync later
      });
    
    return inspection;
  });
}
```

### Query Local Data

```typescript
import { database } from '../database';
import { Q } from '@nozbe/watermelondb';

// Query works offline
async function getUnsyncedInspections() {
  const inspections = await database.collections
    .get('inspections')
    .query(Q.where('synced', false))
    .fetch();
  
  return inspections;
}
```

### Listen for Network Changes

```typescript
import NetInfo from '@react-native-community/netinfo';
import { syncEngine } from '../lib/syncEngine';

// Already handled in App.tsx, but can be customized
NetInfo.addEventListener(state => {
  if (state.isConnected) {
    console.log('Online - triggering sync');
    syncEngine.sync();
  } else {
    console.log('Offline - queuing changes');
  }
});
```

## Performance Considerations

### 1. Lazy Loading

WatermelonDB uses lazy loading by default:
```typescript
// Only loads when accessed
const vehicle = await vehicleCollection.find(id);
const workOrders = await vehicle.workOrders.fetch();
```

### 2. Indexing

All foreign keys and frequently queried fields are indexed:
```typescript
{ name: 'tenant_id', type: 'string', isIndexed: true }
{ name: 'vehicle_id', type: 'string', isIndexed: true }
{ name: 'synced', type: 'boolean', isIndexed: true }
```

### 3. Batch Operations

Use `database.write()` for multiple operations:
```typescript
await database.write(async () => {
  // All operations in one transaction
  await record1.update(...);
  await record2.update(...);
  await record3.create(...);
});
```

### 4. Sync Limits

To prevent large payloads:
- Vehicles: All (typically < 1000)
- Work Orders: Recent 500
- Alerts: Active 100
- Components: Active 1000
- Checklists: All

## Testing

### Unit Tests

```bash
cd mobile
npm test src/lib/syncEngine.test.ts
```

### Manual Testing

1. **Offline Creation**:
   - Enable airplane mode
   - Create inspection/work order
   - Verify `synced: false`
   - Disable airplane mode
   - Verify record syncs

2. **Conflict Resolution**:
   - Modify same record on mobile and web
   - Trigger sync
   - Verify newer version wins

3. **Background Sync**:
   - Go offline
   - Create records
   - Come back online
   - Verify automatic sync

4. **Error Handling**:
   - Force network error
   - Verify graceful degradation
   - Check error messages

## Troubleshooting

### Sync Not Triggering

**Issue**: Sync doesn't start when online

**Solutions**:
1. Check `syncEngine.initialize()` is called
2. Verify network permissions in `app.json`
3. Check console logs for errors
4. Manually trigger: `syncEngine.forceSync()`

### Conflicts Not Resolving

**Issue**: Records keep conflicting

**Solutions**:
1. Check timestamps are being set correctly
2. Verify `updated_at` field in schema
3. Check conflict resolution logic in `pullRemoteChanges()`
4. Review console logs for conflict count

### Records Not Syncing

**Issue**: Records marked `synced: false` not pushing

**Solutions**:
1. Check authentication status
2. Verify tenant_id in session
3. Check Supabase RLS policies
4. Review push error logs
5. Test Supabase connection

### Database Errors

**Issue**: WatermelonDB crashes or errors

**Solutions**:
1. Check schema matches model definitions
2. Verify migrations are applied
3. Clear database: `syncEngine.clearLocalData()`
4. Reinstall app (clears SQLite)

### Performance Issues

**Issue**: Sync is slow

**Solutions**:
1. Check network speed
2. Reduce sync limits
3. Optimize queries with indexes
4. Use batch operations
5. Profile with React DevTools

## Best Practices

### 1. Always Use Transactions

```typescript
// Good
await database.write(async () => {
  await record.update(...);
});

// Bad
await record.update(...); // Missing transaction
```

### 2. Handle Offline State

```typescript
// Good
const netInfo = await NetInfo.fetch();
if (!netInfo.isConnected) {
  Alert.alert('Offline', 'Changes will sync when online');
}

// Bad
// Assuming always online
```

### 3. Show Sync Status

```typescript
// Good
<SyncStatusIndicator />

// Bad
// No feedback to user about sync state
```

### 4. Validate Before Sync

```typescript
// Good
if (data.isValid()) {
  await createRecord(data);
}

// Bad
// Creating invalid records that fail on sync
```

### 5. Log Sync Events

```typescript
// Good
console.log('[Sync] Pushed 5 records');

// Bad
// Silent failures with no logging
```

## API Reference

### SyncEngine

#### Methods

- `initialize(): Promise<void>` - Initialize sync engine
- `sync(): Promise<SyncResult>` - Perform bidirectional sync
- `forceSync(): Promise<SyncResult>` - Force sync even if in progress
- `startBackgroundSync(): void` - Enable automatic sync
- `stopBackgroundSync(): void` - Disable automatic sync
- `getStatus(): Promise<SyncStatus>` - Get current sync status
- `addSyncListener(listener): () => void` - Subscribe to status changes
- `getLastSyncTime(): Date | null` - Get last sync timestamp
- `isSyncInProgress(): boolean` - Check if sync is active
- `clearLocalData(): Promise<void>` - Clear local database

#### Types

```typescript
interface SyncStatus {
  isSyncing: boolean;
  lastSyncTime: Date | null;
  lastSyncSuccess: boolean;
  pendingChanges: number;
  errorMessage?: string;
}

interface SyncResult {
  success: boolean;
  error?: string;
  pushedRecords: number;
  pulledRecords: number;
  conflicts: number;
}
```

## Security Considerations

### 1. Authentication

- JWT tokens stored in AsyncStorage
- Automatic session refresh
- Token included in all Supabase requests

### 2. Row-Level Security

- Supabase RLS enforces tenant isolation
- `tenant_id` filter on all queries
- Cross-tenant access impossible

### 3. Data Encryption

- SQLite database encrypted on device
- HTTPS for all network requests
- Sensitive data sanitized in logs

## Future Enhancements

### Planned Features

1. **Delta Sync**: Only sync changed fields
2. **Conflict UI**: Manual conflict resolution
3. **Compression**: Compress sync payloads
4. **Incremental Sync**: Timestamp-based filtering
5. **Selective Sync**: User-configurable sync entities
6. **Offline Photos**: Queue photo uploads
7. **Sync Analytics**: Track sync performance metrics

## Support

For issues or questions:
1. Check console logs for errors
2. Review this guide
3. Check WatermelonDB docs: https://nozbe.github.io/WatermelonDB/
4. File an issue in the project repository

## Changelog

### Version 1.0.0 (Task 13.2)
- Initial implementation
- Bidirectional sync
- Background sync on network reconnection
- Conflict resolution (last-write-wins)
- Sync status tracking
- Queue management
- Error handling
- Complete WatermelonDB schema
