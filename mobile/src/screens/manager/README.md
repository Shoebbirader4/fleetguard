# Manager Mobile App Screens

This directory contains all screens for the Fleet Manager mobile application, implementing Requirements 17.1-17.6.

## Screens Overview

### 1. DashboardScreen.tsx
**Main manager dashboard with fleet overview**
- Fleet health score display
- Fleet statistics (total vehicles, in service, maintenance, critical alerts)
- Recent alerts panel (top 5)
- Quick action buttons
- Implements: Req 17.1

### 2. AlertsListScreen.tsx
**Comprehensive alerts management**
- View all active alerts
- Filter by severity (Critical, High, Medium, Low)
- Sort by priority or date
- Navigate to alert details
- Implements: Req 17.2

### 3. AlertDetailScreen.tsx
**Detailed alert information**
- Full alert details and description
- Vehicle information (if applicable)
- Component information (if applicable)
- Actions: Create work order, Acknowledge alert
- Implements: Req 17.3

### 4. AnalyticsScreen.tsx
**Simplified analytics reports**
- Cost summary report
- Breakdown summary report
- Downtime summary report
- Date range display (last 30 days)
- Implements: Req 17.4

### 5. WorkOrderCreateScreen.tsx
**Create and assign work orders**
- Select vehicle from list
- Enter description
- Set priority level
- Optionally assign to mechanic
- Context-aware pre-filling from alerts
- Implements: Req 17.6

## Navigation Structure

```
ManagerDashboard (Home)
├── AlertsList
│   └── AlertDetail
│       └── WorkOrderCreate (with context)
├── Analytics
└── WorkOrderCreate (standalone)
```

## Key Features

### Offline-First Architecture
All screens work offline using WatermelonDB:
- Read from local database
- Write locally and mark as unsynced
- Background sync when online
- Pull-to-refresh for manual sync

### Data Sources
- **Local:** WatermelonDB (vehicles, alerts, work_orders, components)
- **Remote:** Supabase API (fleet_health score)
- **Sync:** Automatic background sync via syncEngine

### State Management
- User authentication: `useAuthStore` (Zustand)
- Navigation: React Navigation hooks
- Data: WatermelonDB observable queries

### UI/UX Patterns
- Consistent card-based layout
- Color-coded severity indicators
- Loading states with spinners
- Empty states with helpful messages
- Pull-to-refresh support
- Touch-friendly button sizes

## Usage Example

```typescript
import { useNavigation } from '@react-navigation/native';

// Navigate to alerts list
navigation.navigate('AlertsList');

// Navigate to alert detail
navigation.navigate('AlertDetail', { alertId: 'alert-id-123' });

// Navigate to analytics
navigation.navigate('Analytics');

// Create work order (standalone)
navigation.navigate('WorkOrderCreate');

// Create work order from alert (with context)
navigation.navigate('WorkOrderCreate', {
  vehicleId: 'vehicle-id-456',
  alertId: 'alert-id-123'
});
```

## Dependencies

All dependencies are shared with the mobile app:
- `@react-navigation/native` - Navigation
- `@nozbe/watermelondb` - Local database
- `@supabase/supabase-js` - Backend API
- `date-fns` - Date formatting
- `zustand` - State management

## Styling

Consistent styling across all screens:
- Primary color: `#2563eb` (blue)
- Success: `#10b981` (green)
- Warning: `#f59e0b` (yellow)
- Error: `#ef4444` (red)
- Background: `#f3f4f6`

All styles use StyleSheet.create() for performance.

## Testing

See the comprehensive testing checklist in:
- `mobile/MANAGER_APP_GUIDE.md`

## Documentation

For detailed implementation guide:
- **Complete Guide:** `mobile/MANAGER_APP_GUIDE.md`
- **Offline Sync:** `mobile/OFFLINE_SYNC_GUIDE.md`
- **Setup:** `mobile/SETUP_NOTES.md`

## Requirements Mapping

| Screen | Requirements | Features |
|--------|-------------|----------|
| DashboardScreen | 17.1 | Fleet health score, active alerts, fleet stats |
| AlertsListScreen | 17.2 | Alert filtering, priority sorting |
| AlertDetailScreen | 17.3 | Alert details, vehicle info, actions |
| AnalyticsScreen | 17.4 | Cost/breakdown/downtime reports |
| WorkOrderCreateScreen | 17.6 | Work order creation, mechanic assignment |

## Implementation Status

✅ All screens implemented
✅ Navigation integrated
✅ Offline-first architecture
✅ Error handling
✅ Loading states
✅ Empty states
✅ Pull-to-refresh
✅ TypeScript types
✅ No diagnostics errors

**Task 13.5 Complete!**
