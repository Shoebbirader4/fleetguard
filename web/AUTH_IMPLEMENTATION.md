# Authentication Implementation Guide

This document describes the authentication implementation for FleetGuard AI web application.

## Overview

The authentication system is built on Supabase Auth with JWT token management, password reset flow, form validation, and axios interceptors for API calls.

## Features Implemented

### 1. Login Page (`/login`)
- Email/password authentication via Supabase Auth
- Client-side form validation
- User-friendly error messages
- "Remember me" checkbox
- Link to password reset page
- Redirects authenticated users to dashboard
- Auto-complete support for email and password

### 2. Password Reset Flow

#### Request Reset (`/password-reset`)
- Users enter their email
- Supabase sends password reset email with magic link
- Success feedback after email sent
- Link back to login page

#### Update Password (`/reset-password`)
- Secure password update page
- Password complexity validation:
  - Minimum 12 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character
- Password confirmation check
- Real-time validation feedback
- Redirects to login after successful update

### 3. JWT Token Management

#### Axios Interceptor (`src/lib/axios.ts`)
The axios instance automatically:
- Adds JWT token to all API requests via Authorization header
- Refreshes expired tokens automatically
- Redirects to login on authentication failure
- Handles 401 errors with token refresh retry logic

**Usage Example:**
```typescript
import { vehicleApi } from '../lib/api';

// All requests automatically include JWT token
const vehicles = await vehicleApi.getAll();
```

### 4. Auth State Management (`src/stores/authStore.ts`)

Zustand store with localStorage persistence:
- `setAuth(user, token)` - Set authenticated user
- `clearAuth()` - Clear authentication state
- `logout()` - Sign out and clear state
- `checkSession()` - Verify session validity

### 5. Session Management

Features:
- Persistent sessions via localStorage
- Automatic token refresh before expiration
- 24-hour session timeout (as per requirements)
- Auth state listener for real-time updates
- Session validation on page load

### 6. Protected Routes (`src/components/ProtectedRoute.tsx`)

Component for protecting authenticated routes:
- Verifies user session on mount
- Shows loading state during verification
- Redirects to login if not authenticated
- Supports role-based access control

**Usage Example:**
```tsx
<Route 
  path="/dashboard" 
  element={
    <ProtectedRoute allowedRoles={['fleet_manager', 'company_owner']}>
      <DashboardPage />
    </ProtectedRoute>
  } 
/>
```

### 7. Custom Hooks

#### `useAuth` Hook (`src/hooks/useAuth.ts`)
Manages authentication state across the app:
- Monitors auth state changes
- Handles sign in/out events
- Auto-updates on token refresh
- Provides user info and auth status

**Usage Example:**
```typescript
import { useAuth } from '../hooks/useAuth';

function MyComponent() {
  const { user, isAuthenticated, logout } = useAuth();
  
  return (
    <div>
      {isAuthenticated && <p>Welcome {user.fullName}</p>}
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

## File Structure

```
web/src/
├── lib/
│   ├── supabase.ts          # Supabase client configuration
│   ├── axios.ts             # Axios instance with JWT interceptor
│   └── api.ts               # API service layer with typed endpoints
├── stores/
│   └── authStore.ts         # Zustand auth state management
├── hooks/
│   └── useAuth.ts           # Authentication hook
├── components/
│   └── ProtectedRoute.tsx   # Route protection component
└── pages/
    ├── LoginPage.tsx        # Login page with validation
    ├── PasswordResetPage.tsx    # Request password reset
    └── UpdatePasswordPage.tsx   # Update password after reset
```

## Security Features

1. **Password Requirements**: Enforces strong password policy (12+ chars, mixed case, numbers, special chars)
2. **JWT Storage**: Tokens stored securely in Supabase session (httpOnly cookies where possible)
3. **Token Refresh**: Automatic refresh before expiration
4. **Session Timeout**: 24-hour inactivity timeout as per requirements
5. **HTTPS Only**: All authentication traffic over TLS
6. **XSS Protection**: Tokens not exposed in localStorage (handled by Supabase)
7. **CSRF Protection**: JWT-based stateless authentication

## API Integration

All API calls should use the axios instance to automatically include JWT tokens:

```typescript
import axios from '../lib/axios';

// GET request with auth
const response = await axios.get('/api/vehicles');

// POST request with auth
const response = await axios.post('/api/work-orders', {
  vehicleId: '123',
  description: 'Oil change'
});
```

Pre-built API services are available in `src/lib/api.ts`:
- `vehicleApi` - Vehicle management
- `alertApi` - Alert management
- `workOrderApi` - Work order management
- `analyticsApi` - Analytics and reports

## Environment Variables

Required environment variables in `.env`:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_BASE_URL=your_api_base_url (optional, for external APIs)
```

## Testing Authentication

### Test Login
1. Navigate to `/login`
2. Enter valid credentials
3. Verify redirect to dashboard
4. Check user info displayed in header
5. Verify JWT token in network requests

### Test Password Reset
1. Navigate to `/password-reset`
2. Enter email address
3. Check email for reset link
4. Click link to navigate to `/reset-password`
5. Enter new password (meeting requirements)
6. Verify redirect to login
7. Login with new password

### Test Session Timeout
1. Login successfully
2. Wait 24 hours (or modify timeout for testing)
3. Try to access protected route
4. Verify redirect to login
5. Verify token refresh if within refresh window

### Test Token Refresh
1. Login successfully
2. Wait until token is near expiration (typically 1 hour)
3. Make an API call
4. Verify token is refreshed automatically in interceptor
5. Verify request succeeds without logout

## Integration with Supabase Database

The authentication flow integrates with the `users` table:

```sql
-- Users table stores profile information
SELECT id, email, full_name, role, tenant_id 
FROM users 
WHERE id = auth.uid();
```

After successful login:
1. Supabase Auth validates credentials
2. App fetches user profile from `users` table
3. User data stored in auth store
4. JWT token includes `tenant_id` claim for RLS policies

## Troubleshooting

### Login fails with "Invalid email or password"
- Verify user exists in Supabase Auth
- Check user email is confirmed
- Verify credentials are correct
- Check Supabase Auth logs for details

### Token refresh fails
- Verify Supabase refresh token is valid
- Check network connectivity
- Verify Supabase project is active
- Check browser console for errors

### Session not persisting
- Check localStorage is enabled in browser
- Verify `persistSession: true` in Supabase client config
- Check for localStorage quota errors
- Clear browser cache and retry

### API calls return 401
- Verify token is being added to headers (check Network tab)
- Check token hasn't expired
- Verify API endpoint expects JWT auth
- Check Supabase RLS policies are configured

## Next Steps

1. Implement email verification flow
2. Add multi-factor authentication (MFA)
3. Add social login providers (Google, Microsoft)
4. Implement password strength meter
5. Add remember device functionality
6. Implement audit logging for auth events
7. Add rate limiting for login attempts
8. Implement account lockout after failed attempts

## References

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Axios Interceptors](https://axios-http.com/docs/interceptors)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [React Router Protected Routes](https://reactrouter.com/en/main/start/tutorial)
