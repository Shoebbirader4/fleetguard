# ErrorBoundary Component

## Overview

The `ErrorBoundary` component is a React error boundary that catches JavaScript errors anywhere in the child component tree, logs those errors, and displays a fallback UI instead of crashing the entire application.

## Requirements

- **Requirement 5.4**: Display user-friendly error messages
- **Requirement 5.6**: Catch component crashes and provide recovery options

## Features

- ✅ Catches rendering errors, lifecycle errors, and constructor errors
- ✅ Logs errors for debugging (visible in development mode)
- ✅ Provides "Try Again" button to reset the error state
- ✅ Provides "Go to Dashboard" button for safe navigation
- ✅ Shows detailed error information in development mode
- ✅ Displays user-friendly error messages in production
- ✅ Supports custom fallback UI
- ✅ Optional onReset callback for custom recovery logic

## Usage

### Basic Usage

Wrap any component tree that might throw errors:

```tsx
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <YourComponent />
    </ErrorBoundary>
  );
}
```

### With Custom Fallback

```tsx
<ErrorBoundary fallback={<CustomErrorUI />}>
  <YourComponent />
</ErrorBoundary>
```

### With Reset Callback

```tsx
function App() {
  const handleReset = () => {
    // Custom reset logic (e.g., clear app state)
    console.log('Error boundary reset');
  };

  return (
    <ErrorBoundary onReset={handleReset}>
      <YourComponent />
    </ErrorBoundary>
  );
}
```

### Nested Error Boundaries

You can nest error boundaries to provide different fallback UIs for different parts of your app:

```tsx
<ErrorBoundary>
  <Header />
  <ErrorBoundary fallback={<SidebarError />}>
    <Sidebar />
  </ErrorBoundary>
  <ErrorBoundary>
    <MainContent />
  </ErrorBoundary>
</ErrorBoundary>
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `children` | `ReactNode` | Yes | The component tree to wrap |
| `fallback` | `ReactNode` | No | Custom fallback UI to show on error |
| `onReset` | `() => void` | No | Callback function when "Try Again" is clicked |

## Error Boundary Behavior

### What It Catches

Error boundaries catch errors during:
- Rendering
- In lifecycle methods
- In constructors of the whole tree below them

### What It Doesn't Catch

Error boundaries do NOT catch errors for:
- Event handlers (use try-catch for these)
- Asynchronous code (e.g., setTimeout, requestAnimationFrame callbacks)
- Server-side rendering
- Errors thrown in the error boundary itself

## Development vs Production

### Development Mode

In development mode, the error boundary displays:
- Full error message
- Component stack trace
- Expandable details section

### Production Mode

In production mode, the error boundary displays:
- User-friendly error message
- Generic description
- Action buttons (Try Again, Go to Dashboard)
- No technical details (for security)

## Implementation Details

### Architecture

The ErrorBoundary is implemented as a class component (required by React):

```tsx
class ErrorBoundary extends Component<Props, State> {
  // Lifecycle methods
  static getDerivedStateFromError(error: Error)
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo)
  
  // Recovery methods
  handleReset()
  handleGoToDashboard()
}
```

### Error Logging

Errors are logged using the `logError` utility from `utils/errorHandler.ts`:

```tsx
import { logError } from '../utils/errorHandler';

componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
  logError(error, 'ErrorBoundary');
}
```

In production, you can extend this to send errors to a service like Sentry.

## Integration with App

The ErrorBoundary is integrated at multiple levels:

1. **App Level**: Wraps the entire application in `App.tsx`
2. **Layout Level**: Wraps main content in `Layout.tsx`
3. **Route Level**: Can be added to specific routes that need isolated error handling

## Testing

The ErrorBoundary has comprehensive tests in `ErrorBoundary.test.tsx`:

```bash
npm run test ErrorBoundary.test.tsx
```

Tests cover:
- Rendering children without errors
- Catching and displaying errors
- Try Again functionality
- Go to Dashboard functionality
- Custom fallback rendering
- Reset callback invocation

## Accessibility

- Error messages are clear and descriptive
- Buttons have accessible labels
- Focus management after error display
- Semantic HTML structure
- Dark mode support

## Best Practices

1. **Place at Multiple Levels**: Use error boundaries at app, layout, and component levels for granular error isolation

2. **Provide Context**: Add specific fallback UIs for different parts of the app

3. **Log Errors**: Always log errors for debugging, and consider sending to error tracking service

4. **User Recovery**: Always provide clear recovery options (Try Again, Go to Dashboard)

5. **Test Error States**: Regularly test error boundary behavior in development

## Example: Testing Error Boundary

Create a component that throws an error for testing:

```tsx
function ErrorTester({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
}

// Use in development
<ErrorBoundary>
  <ErrorTester shouldThrow={true} />
</ErrorBoundary>
```

## Related Components

- `Toast`: For user notifications
- `LoadingSpinner`: For loading states
- `ProtectedRoute`: For authorization errors

## Related Utilities

- `utils/errorHandler.ts`: Error handling and logging utilities
- `utils/notifications.ts`: Toast notification system

## Future Enhancements

Possible improvements:
- Integration with error tracking service (Sentry, LogRocket)
- Error boundary with retry logic
- Automatic error reporting
- Error boundary analytics
- Custom error pages per route
