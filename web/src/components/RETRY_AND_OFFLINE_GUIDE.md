# Retry and Offline Handling Guide

This guide explains how to implement retry and offline handling in the FleetGuard AI application.

## Overview

The application now includes:
- **Automatic retry logic** for failed API requests with exponential backoff
- **Offline detection** with visual indicators
- **Mutation queueing** that automatically retries when connection is restored
- **Retry buttons** on error displays for manual retry

## Components

### 1. OfflineIndicator

A fixed banner that appears at the top of the screen when the user goes offline.

**Usage:**
Already added to `App.tsx`. No additional setup needed.

```tsx
// In App.tsx
<OfflineIndicator />
```

### 2. ErrorDisplay

A reusable error display component with an optional retry button.

**Props:**
- `error`: Error object (can be null)
- `onRetry`: Optional callback function for retry button
- `message`: Optional custom error message
- `className`: Optional additional CSS classes

**Usage:**

```tsx
import ErrorDisplay from '../components/ErrorDisplay';
import { getErrorMessage } from '../hooks/useQueryError';

function MyComponent() {
  const { data, error, refetch } = useQuery({
    queryKey: ['my-data'],
    queryFn: fetchMyData,
  });

  if (error) {
    return (
      <ErrorDisplay
        error={error as Error}
        message={getErrorMessage(error)}
        onRetry={() => refetch()}
      />
    );
  }

  return <div>{/* Success UI */}</div>;
}
```

### 3. useOnlineStatus Hook

A React hook that detects online/offline status and shows toast notifications.

**Usage:**

```tsx
import { useOnlineStatus } from '../hooks/useOnlineStatus';

function MyComponent() {
  const isOnline = useOnlineStatus();

  return (
    <div>
      {!isOnline && <p>You are offline</p>}
      {/* Rest of component */}
    </div>
  );
}
```

### 4. useQueryError Hook

A utility hook for extracting error information from React Query.

**Usage:**

```tsx
import { useQueryError, getErrorMessage } from '../hooks/useQueryError';

function MyComponent() {
  const query = useQuery({ /* ... */ });
  const { error, isError, refetch } = useQueryError(query);

  if (isError) {
    return <ErrorDisplay error={error} message={getErrorMessage(error)} onRetry={refetch} />;
  }

  return <div>{/* Success UI */}</div>;
}
```

## React Query Configuration

The React Query client is configured with:

### Queries
- **Retry**: Up to 3 times for network/5xx errors, no retry for 4xx errors
- **Retry Delay**: Exponential backoff (1s, 2s, 4s, max 30s)
- **Network Mode**: `online` - pauses queries when offline
- **Refetch on Reconnect**: Yes

### Mutations
- **Retry**: Up to 2 times for network/5xx errors
- **Network Mode**: `offlineFirst` - queues mutations when offline, auto-retries when online
- **Retry Delay**: Exponential backoff

## Error Message Mapping

The `getErrorMessage` utility maps common errors to user-friendly messages:

- **Offline**: "You are offline. Please check your internet connection."
- **JWT expired**: "Your session has expired. Please log in again."
- **Permission denied**: "You do not have permission to perform this action."
- **Unique constraint**: "This record already exists."
- **Not found**: "The requested data was not found."
- **400**: "Invalid request. Please check your input."
- **401**: "You are not authenticated. Please log in."
- **403**: "You do not have permission to access this resource."
- **404**: "The requested resource was not found."
- **500**: "Server error. Please try again later."
- **503**: "Service temporarily unavailable. Please try again later."

## Examples

### Example 1: List Page with Retry

```tsx
function VehiclesPage() {
  const { data: vehicles, isLoading, error, refetch } = useVehicles();

  if (isLoading) return <LoadingSpinner />;
  
  if (error) {
    return (
      <ErrorDisplay
        error={error as Error}
        message={getErrorMessage(error)}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div>
      {vehicles.map(vehicle => (
        <VehicleCard key={vehicle.id} vehicle={vehicle} />
      ))}
    </div>
  );
}
```

### Example 2: Mutation with Retry

```tsx
function CreateVehicleForm() {
  const createMutation = useMutation({
    mutationFn: createVehicle,
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
    onSuccess: () => {
      toast.success('Vehicle created successfully!');
    },
  });

  const handleSubmit = (data) => {
    createMutation.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      
      {createMutation.isError && (
        <ErrorDisplay
          error={createMutation.error as Error}
          message={getErrorMessage(createMutation.error)}
          onRetry={() => createMutation.reset()}
        />
      )}

      <button type="submit" disabled={createMutation.isPending}>
        {createMutation.isPending ? 'Saving...' : 'Save'}
      </button>
    </form>
  );
}
```

### Example 3: Custom Offline UI

```tsx
function MyComponent() {
  const isOnline = useOnlineStatus();

  return (
    <div>
      {!isOnline && (
        <div className="bg-yellow-100 p-4 rounded mb-4">
          <p>Changes will be saved when you reconnect</p>
        </div>
      )}
      {/* Rest of component */}
    </div>
  );
}
```

## Offline Behavior

### When User Goes Offline:
1. **OfflineIndicator** appears at the top of the screen
2. **Toast notification** warns the user
3. **Queries** are paused (no new requests)
4. **Mutations** are queued and wait for connection

### When User Comes Back Online:
1. **OfflineIndicator** disappears
2. **Toast notification** confirms connection restored
3. **Queries** automatically refetch if stale
4. **Queued mutations** automatically retry

## Testing Offline Behavior

To test offline behavior in development:

1. **Chrome DevTools**: 
   - Open DevTools (F12)
   - Go to Network tab
   - Select "Offline" from throttling dropdown

2. **Firefox DevTools**:
   - Open DevTools (F12)
   - Go to Network tab
   - Check "Offline" checkbox

3. **Manually**:
   - Disconnect from network
   - Test the application behavior

## Best Practices

1. **Always use getErrorMessage()** for consistent error messaging
2. **Always provide refetch function** to ErrorDisplay for queries
3. **Show loading states** during retries
4. **Disable submit buttons** during mutation retries
5. **Use toast notifications** for mutation success/error feedback
6. **Test offline scenarios** for critical user flows

## Requirements Satisfied

- **Requirement 5.4**: Retry buttons for failed API requests ✅
- **Requirement 5.4**: Detect offline status and show appropriate message ✅
- **Requirement 5.4**: Queue mutations when offline and retry when online ✅
- **Requirement 5.4**: Show visual indicator when app is offline ✅
