# Utility Functions

This directory contains utility functions for the FleetGuard AI frontend application.

## Files

### authorization.ts

Role-based authorization utilities for checking user permissions.

**Functions:**
- `hasPermission(userRole, requiredRoles)` - Check if user has permission from list of required roles
- `canInviteUsers(userRole)` - Check if user can invite other users (company_owner, fleet_manager)
- `canManageDrivers(userRole)` - Check if user can manage drivers
- `canManageVendors(userRole)` - Check if user can manage vendors
- `canAssignWorkOrders(userRole)` - Check if user can assign work orders
- `canEditUserRole(currentUserRole, targetUserId, currentUserId)` - Check if user can edit another user's role
- `canViewTeam(userRole)` - Check if user can view team/user management pages
- `canManageWorkOrders(userRole)` - Check if user can manage work orders
- `canViewReports(userRole)` - Check if user can view reports
- `canManageInventory(userRole)` - Check if user can manage inventory
- `canViewPurchaseOrders(userRole)` - Check if user can view purchase orders
- `getAccessibleNavItems(userRole)` - Get list of navigation items accessible to the user

**Requirements Covered:**
- 1.1: Only company_owner and fleet_manager can invite users
- 1.3: Users cannot change their own role
- 6.1: Navigation items must only show for roles with permission
- 6.2: Direct URL access to unauthorized pages must be blocked

**Usage Example:**
```typescript
import { canInviteUsers, canManageDrivers } from '@/utils/authorization';

// Check if user can invite
if (canInviteUsers(currentUser.role)) {
  // Show invite button
}

// Check if user can manage drivers
if (canManageDrivers(currentUser.role)) {
  // Allow driver management
}
```

### validation.ts

Input validation utilities with regex patterns and validation functions.

**Functions:**
- `validateEmail(email)` - Validate email address format
- `validatePhone(phone)` - Validate phone number (international format, optional)
- `validateFullName(name)` - Validate full name (2-100 characters, valid characters)
- `validateRole(role)` - Validate user role against valid system roles
- `validatePassword(password)` - Validate password strength (8+ chars, uppercase, lowercase, number)
- `validateCompanyName(name)` - Validate company name
- `validateRequired(value, fieldName)` - Generic required field validation
- `validateMinLength(value, minLength, fieldName)` - Minimum length validation
- `validateMaxLength(value, maxLength, fieldName)` - Maximum length validation
- `validateUrl(url)` - Validate URL format (optional)
- `validateNumeric(value, fieldName)` - Validate numeric value (optional)
- `validatePositiveNumber(value, fieldName)` - Validate positive number

**Regex Patterns:**
- `emailRegex` - Standard email format validation
- `phoneRegex` - International phone format (E.164)
- `fullNameRegex` - Name with letters, spaces, hyphens, apostrophes, accented characters

**Requirements Covered:**
- 1.2: Invited users must receive role specified in invitation
- 3.2: Vendor email and phone must be unique per tenant
- 5.4: Forms must show inline validation errors with clear messages

**Return Values:**
All validation functions return:
- `null` if input is valid
- `string` (error message) if input is invalid

**Usage Example:**
```typescript
import { validateEmail, validateFullName } from '@/utils/validation';

const emailError = validateEmail('user@example.com');
if (emailError) {
  // Show error: emailError contains the message
  console.error(emailError);
}

const nameError = validateFullName('John Doe');
if (nameError) {
  // Show error
  console.error(nameError);
}
```

### errorHandler.ts

Error handling utilities for API errors, especially from Supabase.

**Functions:**
- `handleApiError(error)` - Convert API errors to user-friendly messages
- `handleAuthError(error)` - Convert authentication errors to user-friendly messages
- `handleNetworkError(error)` - Convert network errors to user-friendly messages
- `handleUploadError(error)` - Convert file upload errors to user-friendly messages
- `logError(error, context)` - Log errors to console (dev) or error tracking service (prod)
- `createError(message, code, details)` - Create error object with context
- `isErrorCode(error, code)` - Check if error matches specific code
- `isPermissionError(error)` - Check if error is permission/authorization related
- `isNotFoundError(error)` - Check if error is not found
- `isDuplicateError(error)` - Check if error is duplicate/conflict

**Error Code Mappings:**
- `PGRST116` → "No records found or you do not have permission"
- `23505` → "This record already exists"
- `23503` → "Cannot complete this action because it is referenced by other records"
- `42501` → "You do not have permission to perform this action"
- `JWT/token expired` → "Your session has expired. Please log in again"
- `401` → "Authentication failed"
- `403` → "You do not have permission"
- `404` → "The requested resource was not found"
- `409` → "This record already exists or conflicts with existing data"
- `429` → "Too many requests. Please try again later"
- `500+` → "Server error. Please try again later"

**Requirements Covered:**
- 5.4: Toast notifications must show clear error messages
- 5.6: Error boundaries must catch component crashes

**Usage Example:**
```typescript
import { handleApiError, isPermissionError } from '@/utils/errorHandler';

try {
  await supabase.from('users').insert(data);
} catch (error) {
  const message = handleApiError(error);
  toast.error(message);
  
  if (isPermissionError(error)) {
    // Handle permission error specifically
    navigate('/forbidden');
  }
}
```

## Testing

All utility functions are fully tested with unit tests:
- `authorization.test.ts` - 136 tests covering all authorization functions
- `validation.test.ts` - Comprehensive validation tests
- `errorHandler.test.ts` - Error handling and mapping tests

Run tests:
```bash
npm test -- src/utils
```

## Type Safety

All utilities are fully typed with TypeScript:
- Import types from `../types/user.ts`
- No TypeScript errors
- Proper JSDoc documentation for all functions
