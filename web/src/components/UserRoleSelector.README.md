# UserRoleSelector Component

A reusable dropdown component for selecting user roles in the FleetGuard AI system. This component provides a consistent interface for role selection across team management, user invitations, and role editing contexts.

## Features

- ✅ Displays all 9 available user roles from the system
- ✅ Shows role descriptions inline or as helper text
- ✅ Prevents self-role editing (Requirement 1.3)
- ✅ Supports disabled state for permission control
- ✅ Displays validation errors
- ✅ Fully accessible with ARIA attributes
- ✅ Dark mode support
- ✅ Follows FleetGuard AI design system

## Requirements

This component fulfills the following requirements:
- **Requirement 1.3**: Users cannot change their own role
- **Requirement 1.7**: Role selection during user management

## Installation

```typescript
import UserRoleSelector from '../components/UserRoleSelector';
import type { UserRole } from '../types/user';
```

## Basic Usage

```tsx
import { useState } from 'react';
import UserRoleSelector from './UserRoleSelector';
import type { UserRole } from '../types/user';

function InviteUserForm() {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  return (
    <UserRoleSelector
      value={selectedRole}
      onChange={setSelectedRole}
      label="User Role"
      placeholder="Select a role..."
    />
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `UserRole \| null` | - | Currently selected role (required) |
| `onChange` | `(role: UserRole) => void` | - | Callback when role selection changes (required) |
| `label` | `string` | - | Optional label for the select field |
| `placeholder` | `string` | `'Select a role...'` | Placeholder text when no role is selected |
| `disabled` | `boolean` | `false` | Whether the selector is disabled |
| `currentUserId` | `string` | - | Current user's ID (for permission checks) |
| `targetUserId` | `string` | - | Target user's ID (user being edited) |
| `showDescriptions` | `boolean` | `true` | Whether to show role descriptions in dropdown |
| `error` | `string` | - | Error message to display |

## Available Roles

The component displays all roles defined in `USER_ROLES`:

1. **Company Owner** - Full system access and administration
2. **Fleet Manager** - Manage vehicles, drivers, and operations
3. **Workshop Manager** - Manage work orders and maintenance
4. **Maintenance Engineer** - Plan and schedule maintenance
5. **Mechanic** - Execute work orders and repairs
6. **Driver** - Operate vehicles and report issues
7. **Inspector** - Conduct vehicle inspections
8. **Accountant** - Financial reporting and cost tracking
9. **Auditor** - View-only access for compliance

## Usage Examples

### 1. Basic Role Selection

```tsx
<UserRoleSelector
  value={selectedRole}
  onChange={setSelectedRole}
  label="Select User Role"
  placeholder="Choose a role..."
/>
```

### 2. Without Descriptions in Dropdown

Show descriptions as helper text instead of inline:

```tsx
<UserRoleSelector
  value={selectedRole}
  onChange={setSelectedRole}
  label="User Role"
  showDescriptions={false}
/>
```

### 3. Disabled State

Disable the selector when user lacks permission:

```tsx
<UserRoleSelector
  value={currentRole}
  onChange={setRole}
  label="User Role"
  disabled={!canEditRoles}
/>
```

### 4. Self-Role Editing Prevention (Requirement 1.3)

Automatically prevents users from changing their own role:

```tsx
<UserRoleSelector
  value={userRole}
  onChange={handleRoleChange}
  label="User Role"
  currentUserId={currentUser.id}
  targetUserId={editingUser.id}
  // Will auto-disable if currentUserId === targetUserId
/>
```

### 5. With Validation Error

Display validation errors:

```tsx
<UserRoleSelector
  value={selectedRole}
  onChange={setSelectedRole}
  label="User Role"
  error={errors.role}
/>
```

### 6. In Team Management Context

Full example with permission checking:

```tsx
import { canEditUserRole } from '../utils/authorization';
import { useAuth } from '../hooks/useAuth';

function EditUserRoleForm({ user }) {
  const { user: currentUser } = useAuth();
  const [role, setRole] = useState(user.role);
  
  const canEdit = canEditUserRole(
    currentUser.role,
    user.id,
    currentUser.id
  );

  return (
    <UserRoleSelector
      value={role}
      onChange={setRole}
      label="User Role"
      disabled={!canEdit}
      currentUserId={currentUser.id}
      targetUserId={user.id}
    />
  );
}
```

## Behavior

### Self-Role Editing Prevention

When `currentUserId` matches `targetUserId`:
- The selector automatically becomes disabled
- A warning message appears: "(Cannot change your own role)"
- Helper text explains: "You cannot change your own role. Contact another administrator to change your role."

This implements **Requirement 1.3**: Users cannot change their own role.

### Role Descriptions

By default (`showDescriptions={true}`):
- Descriptions appear inline in the dropdown: `"Fleet Manager - Manage vehicles, drivers, and operations"`

When `showDescriptions={false}`:
- Only role labels appear in dropdown: `"Fleet Manager"`
- The description for the selected role appears as helper text below the select

## Accessibility

The component follows accessibility best practices:

- ✅ Proper ARIA labels (`aria-label`)
- ✅ Error associations (`aria-describedby`)
- ✅ Keyboard navigation support
- ✅ Focus states with visible outline
- ✅ Screen reader friendly error messages
- ✅ WCAG AA color contrast compliance

## Styling

The component uses Tailwind CSS classes and follows the FleetGuard AI design system:

- Primary color: `blue-600`
- Error color: `red-600`
- Warning color: `amber-600`
- Dark mode: Full support with `dark:` variants
- Focus ring: `ring-blue-500`

## Testing

The component has comprehensive test coverage:

```bash
npm test -- UserRoleSelector.test.tsx
```

Test coverage includes:
- Rendering all roles correctly
- User interaction and onChange callbacks
- Disabled state handling
- Self-role editing prevention (Requirement 1.3)
- Error state display
- Accessibility compliance
- Dark mode support

## Integration Points

### Used By:
- `InviteUserModal` - When inviting new users
- `TeamPage` - When editing existing user roles
- `SignUpPage` - During invitation-based signup (read-only)

### Uses:
- `USER_ROLES` from `types/user.ts` - Role definitions
- `canEditUserRole` from `utils/authorization.ts` - Permission checking

## Related Components

- **DriverSelector** - For selecting drivers to assign to vehicles
- **MechanicSelector** - For assigning mechanics to work orders
- **VendorSelector** - For selecting vendors in purchase orders

## Notes

- The component does NOT fetch data from the server (unlike DriverSelector or MechanicSelector)
- All role data comes from the static `USER_ROLES` constant
- Permission checking (via `canEditUserRole`) should be done by the parent component
- The selector itself only handles the UI logic for self-editing prevention

## Version History

- **v1.0.0** (2024) - Initial implementation
  - All 9 user roles supported
  - Self-role editing prevention
  - Full accessibility support
  - Dark mode compatible
