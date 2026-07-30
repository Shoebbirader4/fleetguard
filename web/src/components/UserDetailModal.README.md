# UserDetailModal Component

A comprehensive modal component for viewing and managing user details within the FleetGuard AI team management system.

## Overview

The `UserDetailModal` component provides a complete interface for viewing user information and performing administrative actions such as role changes and user deactivation. It implements authorization checks to ensure only permitted users can perform sensitive operations.

## Features

- **User Information Display**: Shows comprehensive user details including name, email, role, phone, status, and join date
- **Role Editing**: Allows authorized users (company_owner) to change user roles with optimistic updates
- **User Deactivation**: Provides ability to deactivate users with confirmation dialog
- **Authorization Controls**: Enforces role-based permissions (users cannot edit their own roles)
- **Optimistic Updates**: Provides instant feedback by updating UI before server response
- **Confirmation Dialogs**: Requires confirmation for destructive actions
- **Loading States**: Shows appropriate loading indicators during async operations
- **Error Handling**: Displays toast notifications for success/error states

## Requirements

Task 8.3 - Create UserDetailModal component

Validates Requirements:
- **1.3**: Users cannot change their own role
- **1.6**: View user details and options to Edit or Deactivate
- **1.7**: Company_owner can change any user's role except their own

## Usage

### Basic Example

```tsx
import UserDetailModal from '../components/UserDetailModal';
import { useAuthStore } from '../stores/authStore';

function TeamPage() {
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const currentUser = useAuthStore((state) => state.user);

  return (
    <>
      <button onClick={() => {
        setSelectedUser(user);
        setShowModal(true);
      }}>
        View Details
      </button>

      <UserDetailModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        currentUser={currentUser}
      />
    </>
  );
}
```

### With Table Integration

```tsx
<table>
  <tbody>
    {users.map((user) => (
      <tr key={user.id}>
        <td>{user.full_name}</td>
        <td>{user.email}</td>
        <td>
          <button
            onClick={() => {
              setSelectedUser(user);
              setShowUserDetailModal(true);
            }}
            className="text-blue-600 hover:text-blue-900"
          >
            View Details
          </button>
        </td>
      </tr>
    ))}
  </tbody>
</table>

<UserDetailModal
  isOpen={showUserDetailModal}
  onClose={() => {
    setShowUserDetailModal(false);
    setSelectedUser(null);
  }}
  user={selectedUser}
  currentUser={currentUser}
/>
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `isOpen` | `boolean` | Yes | Controls modal visibility |
| `onClose` | `() => void` | Yes | Callback function when modal is closed |
| `user` | `User \| null` | Yes | The user whose details should be displayed |
| `currentUser` | `User \| null` | Yes | The currently logged-in user (for permission checks) |

## User Information Displayed

The modal displays the following user information:

1. **Name**: User's full name
2. **Email**: User's email address
3. **Role**: User's current role with color-coded badge
4. **Phone**: User's phone number (or "Not provided" if missing)
5. **Status**: Active or Inactive status with color-coded badge
6. **Joined**: User's account creation date (formatted as "Month Day, Year")

## Actions

### Edit Role

- **Visibility**: Only shown to `company_owner` role
- **Restriction**: Cannot edit own role (Requirement 1.3)
- **Behavior**: 
  - Clicking "Edit Role" switches to edit mode
  - Shows `UserRoleSelector` dropdown
  - Displays "Save Changes" and "Cancel" buttons
  - Uses optimistic updates for instant feedback
  - Shows success/error toast notifications

### Deactivate User

- **Visibility**: Only shown for active users who are not the current user
- **Behavior**:
  - Clicking "Deactivate" opens confirmation modal
  - Requires explicit confirmation before proceeding
  - Shows success/error toast notifications
  - Closes main modal after successful deactivation

## Authorization Logic

The component implements several authorization checks:

```typescript
// Can edit role: Only company_owner, and cannot edit own role
const canEdit = currentUser && user 
  ? canEditUserRole(currentUser.role, user.id, currentUser.id) 
  : false;

// Can deactivate: Cannot deactivate self, only active users
const canDeactivate = currentUser 
  && user.id !== currentUser.id 
  && user.is_active;
```

## Optimistic Updates

The role change operation uses optimistic updates for better UX:

```typescript
// Update cache immediately
queryClient.setQueryData(['users'], (oldUsers) => {
  return oldUsers.map((u) =>
    u.id === user.id 
      ? { ...u, role: selectedRole } 
      : u
  );
});

// Perform actual mutation
await updateRoleMutation.mutateAsync({ userId, role });

// On error, revert by invalidating cache
catch (error) {
  queryClient.invalidateQueries({ queryKey: ['users'] });
}
```

## Styling

The component follows the FleetGuard AI design system:

- **Modal Size**: Large (`lg`) for comfortable viewing
- **Layout**: 2-column grid for information display
- **Colors**: Blue for primary actions, red for destructive actions
- **Typography**: Consistent with design system standards
- **Dark Mode**: Full dark mode support

## Dependencies

- `Modal`: Base modal component for dialog functionality
- `ConfirmationModal`: For deactivation confirmation
- `UserRoleSelector`: Dropdown for role selection
- `LoadingSpinner`: Loading state indicator
- `useUpdateUserRole`: Hook for role update mutation
- `useDeactivateUser`: Hook for user deactivation mutation
- `canEditUserRole`: Authorization utility function
- `toast`: Toast notification system

## Error Handling

All operations include comprehensive error handling:

```typescript
try {
  await operation();
  toast.success('Operation successful');
} catch (error) {
  toast.error(error instanceof Error ? error.message : 'Operation failed');
  // Revert optimistic updates if applicable
}
```

## Accessibility

- Semantic HTML structure
- Proper ARIA labels
- Keyboard navigation support (via Modal component)
- Focus management (via Modal component)
- Color contrast meets WCAG AA standards

## Testing

The component includes comprehensive test coverage:

- Modal rendering states
- User information display
- Edit role functionality
- Deactivate user functionality
- Authorization checks
- Optimistic updates
- Error handling
- Loading states
- Modal close behavior

Run tests with:
```bash
npm test -- UserDetailModal.test.tsx
```

## Related Components

- `TeamPage`: Main page that uses this modal
- `InviteUserModal`: For inviting new users
- `UserRoleSelector`: Reusable role selection dropdown
- `ConfirmationModal`: For confirming destructive actions

## Best Practices

1. Always clear `selectedUser` state when closing the modal
2. Ensure `currentUser` is available before rendering
3. Handle loading states during async operations
4. Use optimistic updates for better perceived performance
5. Always show confirmation for destructive actions
6. Provide clear success/error feedback via toast notifications

## Known Limitations

- Modal does not support editing phone number or email
- Cannot reactivate deactivated users (must be done elsewhere)
- Role changes apply immediately without undo capability
