# Integration Tests for FleetGuard Web Frontend

This document describes the integration test suite for the FleetGuard AI web frontend application.

## Overview

The integration tests validate critical user workflows and system requirements, including:
- Authentication flows (login, logout, session management)
- Dashboard data fetching and real-time updates
- Vehicle CRUD operations
- Work order creation and assignment

## Test Coverage

### 1. Authentication Integration Tests (`auth.integration.test.tsx`)

**Validates:**
- **Requirement 1.4**: Authentication failure error messages within 500ms
- **Requirement 1.5**: Session management with 24-hour timeout

**Test Cases:**
- Successful login with valid credentials
- Failed login with error message timing validation
- Email and password validation before submission
- Successful logout and state cleanup
- Session maintenance for valid tokens
- Token refresh when expired
- Session clearance after 24-hour timeout
- Session invalidation when no session exists

### 2. Dashboard Integration Tests (`dashboard.integration.test.tsx`)

**Validates:**
- **Requirement 30.2**: Dashboard updates within 2 seconds when vehicle status changes

**Test Cases:**
- Fleet statistics fetching and display
- Active alerts fetching and display
- Real-time subscription setup
- Dashboard updates within 2 seconds on vehicle status change
- Dashboard updates on new alert generation
- Real-time connection status indicator
- Last update timestamp tracking
- Offline indicator when connection is lost

### 3. Vehicle CRUD Integration Tests (`vehicle-crud.integration.test.tsx`)

**Validates:**
- **Requirement 3.3**: Vehicle identifier generation within 1 second

**Test Cases:**
- Create vehicle with unique identifier within 1 second
- VIN format validation
- Required field validation
- Create vehicle with all optional fields
- Display vehicle details when loaded
- Update existing vehicle
- VIN immutability in edit mode

### 4. Work Order Integration Tests (`work-order.integration.test.tsx`)

**Validates:**
- **Requirement 7.2**: Work order unique number assignment

**Test Cases:**
- Create work order with unique sequential number
- First work order creation with WO-0001
- Required field validation
- Create work order with all priority levels
- Create work order with assigned mechanic
- Create unassigned work order
- Display available mechanics with different roles
- Error handling on creation failure

## Running the Tests

### Run All Integration Tests

```bash
cd web
npm test -- --run src/test/integration
```

### Run Specific Test Suite

```bash
# Authentication tests only
npm test -- --run src/test/integration/auth.integration.test.tsx

# Dashboard tests only
npm test -- --run src/test/integration/dashboard.integration.test.tsx

# Vehicle CRUD tests only
npm test -- --run src/test/integration/vehicle-crud.integration.test.tsx

# Work order tests only
npm test -- --run src/test/integration/work-order.integration.test.tsx
```

### Run Tests in Watch Mode

```bash
npm test -- src/test/integration
```

### Run Tests with UI

```bash
npm run test:ui
```

Then navigate to the integration tests in the Vitest UI.

### Run Tests with Coverage

```bash
npm test -- --coverage src/test/integration
```

## Test Infrastructure

### Test Utilities

The tests use shared utilities from `src/test/test-utils.tsx`:

- `renderWithProviders`: Renders components with React Query and Router providers
- Mocked authentication state via Zustand store
- Mocked Supabase client for database operations

### Test Setup

Global test setup is configured in `src/test/setup.ts`:

- Jest DOM matchers for assertions
- Automatic cleanup after each test
- Window.matchMedia mock for responsive components

### Mocking Strategy

**Supabase Client:**
- All Supabase operations are mocked
- Database queries return controlled test data
- Real-time subscriptions are simulated

**React Router:**
- Navigation is mocked
- URL parameters are controlled via `useParams` mock

**Authentication Store:**
- Zustand store is used directly (not mocked)
- State is cleared before/after each test

## Performance Validation

Several tests include timing validation to ensure requirements are met:

### Authentication Response Time (Req 1.4)
```typescript
const startTime = Date.now();
// ... authentication attempt ...
const responseTime = Date.now() - startTime;
expect(responseTime).toBeLessThan(600); // 500ms + 100ms buffer
```

### Vehicle Creation Time (Req 3.3)
```typescript
const startTime = Date.now();
// ... vehicle creation ...
const creationTime = Date.now() - startTime;
expect(creationTime).toBeLessThan(1000); // 1 second
```

### Dashboard Real-time Update (Req 30.2)
```typescript
const startTime = Date.now();
// ... trigger realtime event ...
await waitFor(() => {
  expect(queryInvalidated).toBe(true);
}, { timeout: 2000 }); // 2 seconds
const updateTime = Date.now() - startTime;
expect(updateTime).toBeLessThan(2000);
```

## Test Data

Tests use realistic mock data that mirrors production data structures:

**Users:**
```typescript
{
  id: 'user-123',
  email: 'test@example.com',
  full_name: 'Test User',
  role: 'fleet_manager',
  tenant_id: 'tenant-123'
}
```

**Vehicles:**
```typescript
{
  id: 'vehicle-123',
  vin: '1HGBH41JXMN109186',
  make: 'Honda',
  model: 'Accord',
  year: 2023,
  vehicle_type: 'sedan',
  current_odometer: 10000,
  unit: 'km',
  status: 'active'
}
```

**Work Orders:**
```typescript
{
  id: 'wo-123',
  work_order_number: 'WO-0042',
  vehicle_id: 'vehicle-1',
  description: 'Oil change needed',
  priority: 'medium',
  status: 'pending',
  requested_by: 'user-123'
}
```

## Continuous Integration

These integration tests should be run as part of the CI/CD pipeline:

```yaml
# Example GitHub Actions workflow
- name: Run Integration Tests
  run: |
    cd web
    npm test -- --run src/test/integration
```

## Troubleshooting

### Tests Timeout
- Increase timeout in `waitFor` calls if testing slow operations
- Check that mocked async operations resolve/reject properly
- Verify Supabase mocks are returning data correctly

### State Pollution Between Tests
- Ensure `beforeEach` properly resets auth store
- Clear all mocks with `vi.clearAllMocks()`
- Restore mocks with `vi.restoreAllMocks()` in `afterEach`

### Mock Not Working
- Verify mock is defined before component import
- Check that mock path matches actual import path
- Use `vi.mock()` at module level, not inside tests

## Future Enhancements

Potential additions to the test suite:

1. **End-to-End Tests**: Full user workflows with real backend
2. **Performance Tests**: Load testing and stress testing
3. **Accessibility Tests**: Automated a11y validation
4. **Visual Regression Tests**: Screenshot comparison
5. **API Contract Tests**: Validate frontend-backend contracts

## References

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
