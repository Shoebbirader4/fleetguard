# Notification Utility

This utility provides functions to send notifications when work orders are assigned or reassigned to mechanics.

## Features

- **Email Notifications**: Sends formatted email notifications with work order details
- **Push Notifications**: Sends mobile push notifications via Firebase Cloud Messaging (FCM)
- **Notification Preferences**: Respects user notification preferences stored in the database
- **Graceful Degradation**: Skips channels when user contact info is missing
- **Error Handling**: Returns detailed error information for each channel

## Architecture

The notification system uses a job queue approach:

1. Frontend calls notification utility functions
2. Utility creates notification jobs in `notification_jobs` table
3. Background workers (`notification-processor` Edge Function) process the queue
4. Workers send notifications via appropriate channels (email, push, etc.)

## Usage

### Send Notification on Work Order Assignment

```typescript
import { sendWorkOrderAssignmentNotification } from '@/utils/notifications';

// When assigning a work order to a mechanic
const result = await sendWorkOrderAssignmentNotification(
  mechanicId,
  {
    workOrderId: workOrder.id,
    workOrderTitle: workOrder.title,
    workOrderDescription: workOrder.description,
    priority: workOrder.priority,
    vehicleInfo: {
      id: vehicle.id,
      vin: vehicle.vin,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
    },
    assignedBy: {
      id: currentUser.id,
      name: currentUser.full_name,
    },
  },
  false // isReassignment = false
);

if (!result.success) {
  console.error('Notification failed:', result.errors);
}
```

### Send Notifications on Work Order Reassignment

```typescript
import { sendWorkOrderReassignmentNotifications } from '@/utils/notifications';

// When reassigning a work order from one mechanic to another
const result = await sendWorkOrderReassignmentNotifications(
  oldMechanicId,
  newMechanicId,
  notificationData
);

// Check results for both mechanics
if (result.oldMechanicResult && !result.oldMechanicResult.success) {
  console.error('Failed to notify old mechanic:', result.oldMechanicResult.errors);
}

if (!result.newMechanicResult.success) {
  console.error('Failed to notify new mechanic:', result.newMechanicResult.errors);
}
```

### Check if Notifications are Enabled

```typescript
import { areNotificationsEnabled } from '@/utils/notifications';

// Check before sending notifications
const enabled = await areNotificationsEnabled(userId, 'work_order_assigned');

if (enabled) {
  // Proceed with notification
}
```

## Notification Preferences

Users can configure notification preferences in their profile settings. The preferences are stored as JSONB in the `notification_preferences` column of the `users` table:

```json
{
  "work_order_assigned": ["email", "push"],
  "work_order_reassigned": ["email"]
}
```

### Default Behavior

- If user has no preferences set: defaults to `["email"]`
- If user has empty array for a notification type: no notifications sent
- If database error occurs: defaults to `["email"]` (safe default)

## Database Schema

The utility creates jobs in the `notification_jobs` table:

```sql
CREATE TABLE notification_jobs (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  alert_id UUID, -- null for work order notifications
  user_id UUID NOT NULL,
  channel TEXT NOT NULL, -- 'email' or 'push'
  recipient TEXT NOT NULL, -- email address or FCM token
  payload JSONB NOT NULL, -- channel-specific payload
  status TEXT NOT NULL DEFAULT 'queued', -- 'queued', 'processing', 'sent', 'failed'
  attempt INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## Email Template

Email notifications include:
- Work order title and description
- Priority level (color-coded)
- Vehicle information (make, model, year, VIN)
- Link to view work order in the app
- Assigned by information

## Push Notification Format

Push notifications include:
- Title: "Work Order Assigned" or "Work Order Reassigned"
- Body: Vehicle make/model and work order title
- Data payload: work_order_id, priority, type, vehicle_id

## Error Handling

The utility returns a `NotificationResult` object:

```typescript
interface NotificationResult {
  success: boolean;       // Overall success status
  jobsCreated: number;    // Number of notification jobs created
  errors: string[];       // Array of error messages
}
```

### Common Error Scenarios

1. **Missing Contact Info**: User has no email or FCM token
   - Error: "No email address configured for user"
   - Behavior: Skips that channel, tries other channels

2. **Database Error**: Failed to fetch user preferences
   - Behavior: Falls back to default ["email"]

3. **Job Creation Failed**: Error inserting into notification_jobs
   - Error: "Failed to create notification job: [error message]"
   - Behavior: Marks as failure, logs error

## Background Processing

Notification jobs are processed by the `notification-processor` Edge Function:

- **Trigger**: Cron job (every minute) or manual HTTP POST
- **Batch Size**: 50 jobs per run
- **Retry Logic**: Exponential backoff (1min, 5min, 15min)
- **Max Retries**: 3 attempts
- **Timeout**: 60 seconds per batch

## Testing

Run the test suite:

```bash
npm test -- notifications.test.ts
```

Tests cover:
- Successful notification creation
- Missing contact information handling
- Empty notification preferences
- Reassignment to both mechanics
- Error scenarios

## Integration Points

### Work Order Assignment Hook

```typescript
import { useAssignWorkOrder } from '@/hooks/useWorkOrderAssignment';
import { sendWorkOrderAssignmentNotification } from '@/utils/notifications';

const { mutate: assignWorkOrder } = useAssignWorkOrder({
  onSuccess: async (data, variables) => {
    // Send notification after successful assignment
    await sendWorkOrderAssignmentNotification(
      variables.assignedTo,
      notificationData,
      false
    );
  },
});
```

### Work Order Reassignment Hook

```typescript
const { mutate: reassignWorkOrder } = useReassignWorkOrder({
  onSuccess: async (data, variables) => {
    // Send notifications to both mechanics
    await sendWorkOrderReassignmentNotifications(
      variables.oldAssignedTo,
      variables.newAssignedTo,
      notificationData
    );
  },
});
```

## Environment Variables

Required environment variables:

```env
# Application URL for email links
VITE_APP_URL=https://app.fleetguard.ai
```

## Future Enhancements

Potential improvements:
- SMS notifications via Twilio
- WhatsApp notifications
- In-app notification center
- Notification templates management
- Delivery status tracking UI
- Notification history

## Related Files

- `web/src/utils/notifications.ts` - Main utility
- `web/src/utils/notifications.test.ts` - Test suite
- `supabase/functions/notification-processor/index.ts` - Background worker
- `supabase/functions/notification-worker/index.ts` - Cron job handler
- `supabase/migrations/20250610000000_create_notification_jobs_table.sql` - Schema

## Requirements Satisfied

- **Requirement 4.3**: Assigned users must receive notifications (if enabled)
- **Requirement 4.5**: Reassignment notifications to both old and new mechanics
