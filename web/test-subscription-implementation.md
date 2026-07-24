# Subscription Feature Manual Testing Guide

## Test Setup Required

Before testing, ensure you have:
1. A running Supabase instance (local or cloud)
2. At least one tenant in the `tenants` table with subscription data
3. A logged-in user with a valid JWT token containing `tenantId`
4. The `subscription-enforcer` Edge Function deployed

## Test 1: Subscription Page Loads

**Steps:**
1. Login to the application
2. Navigate to `/subscription`
3. Verify the page loads without errors

**Expected Result:**
- Current plan displays correctly (Starter/Professional/Enterprise)
- Subscription status shows (Active/Suspended/Cancelled)
- Next billing date displays
- Vehicle usage shows current count vs limit
- Progress bar renders with correct color
- All three plan cards display with correct pricing

## Test 2: Vehicle Usage Display

**Steps:**
1. On subscription page, observe the vehicle usage section
2. Check the displayed count matches actual vehicle count
3. Verify progress bar percentage is accurate

**Expected Result:**
- Progress bar color:
  - Green: 0-89% usage
  - Yellow: 90-99% usage
  - Red: 100% usage
- Usage percentage displayed accurately
- Warning banner shows when approaching limit (90%+)
- Error banner shows when at limit (100%)

## Test 3: Plan Upgrade (Starter → Professional)

**Prerequisites:**
- Tenant on Starter plan (50 vehicle limit)
- Current vehicle count < 50

**Steps:**
1. Navigate to `/subscription`
2. Click "Upgrade" button on Professional plan card
3. Confirm the upgrade in dialog
4. Wait for success message

**Expected Result:**
- Confirmation dialog shows correct information
- Success message displays: "Successfully changed plan to professional. You now have immediate access to new features!"
- Page refreshes and shows Professional plan
- Vehicle limit now shows 200
- Badge changes to "Professional"

## Test 4: Plan Downgrade Validation

**Prerequisites:**
- Tenant on Professional plan (200 vehicle limit)
- Current vehicle count > 50 (e.g., 75 vehicles)

**Steps:**
1. Navigate to `/subscription`
2. Click "Downgrade" button on Starter plan card
3. Observe the alert message

**Expected Result:**
- Alert displays: "Cannot downgrade to starter plan. You have 75 vehicles, but the starter plan supports only 50 vehicles. Please reduce your vehicle count first."
- Plan does NOT change
- User remains on Professional plan

## Test 5: Plan Downgrade Success

**Prerequisites:**
- Tenant on Professional plan (200 vehicle limit)
- Current vehicle count ≤ 50 (e.g., 30 vehicles)

**Steps:**
1. Navigate to `/subscription`
2. Click "Downgrade" button on Starter plan card
3. Confirm downgrade in dialog
4. Wait for success message

**Expected Result:**
- Confirmation dialog warns: "Your data will be retained, but vehicle creation will be limited to 50 vehicles. Changes take effect on your next billing date."
- Success message displays
- Page refreshes and shows Starter plan
- Vehicle limit now shows 50
- Badge changes to "Starter"

## Test 6: Vehicle Creation Within Limit

**Prerequisites:**
- Current vehicle count < plan limit

**Steps:**
1. Navigate to `/vehicles/new`
2. Fill out vehicle form with valid data
3. Submit the form

**Expected Result:**
- Vehicle creates successfully
- No error messages display
- Redirected to vehicle detail page
- New vehicle appears in vehicle list

## Test 7: Vehicle Creation At Limit

**Prerequisites:**
- Current vehicle count = plan limit (e.g., 50/50 on Starter)

**Steps:**
1. Navigate to `/vehicles/new`
2. Fill out vehicle form with valid data
3. Submit the form

**Expected Result:**
- Error message displays: "You have reached the vehicle limit for your Starter plan (50 vehicles). Upgrade to Professional to add up to 200 vehicles with advanced analytics and reporting features."
- Link displays: "View Subscription Plans →"
- Vehicle is NOT created
- Form remains on page

## Test 8: Subscription Widget on Dashboard

**Steps:**
1. Navigate to `/dashboard`
2. Locate the subscription widget (should be below stats cards)

**Expected Result:**
- Widget displays current plan badge
- Shows vehicle usage: "X / Y vehicles"
- Progress bar renders with correct color
- Alert badge shows if approaching or at limit
- "Upgrade Plan" or "Manage Subscription" button displays
- Clicking button navigates to `/subscription` page

## Test 9: Upgrade Link from Vehicle Creation Error

**Steps:**
1. Attempt to create vehicle when at limit (see Test 7)
2. Click "View Subscription Plans →" link in error message

**Expected Result:**
- Navigates to `/subscription` page
- All subscription details display correctly
- User can immediately upgrade if desired

## Test 10: Enterprise Plan Unlimited Vehicles

**Prerequisites:**
- Tenant on Enterprise plan

**Steps:**
1. Navigate to `/subscription`
2. Observe vehicle limit display

**Expected Result:**
- Vehicle limit shows "∞" (infinity symbol) instead of a number
- Progress bar always shows green (cannot reach 100%)
- No limit warnings display
- Can create unlimited vehicles

## Test 11: Dark Mode Support

**Steps:**
1. Toggle dark mode in application
2. Navigate to `/subscription`
3. Observe all UI elements

**Expected Result:**
- All text readable in dark mode
- Progress bars visible
- Cards have appropriate dark backgrounds
- Borders visible
- No contrast issues

## Test 12: Mobile Responsiveness

**Steps:**
1. Open application on mobile device or resize browser to mobile width
2. Navigate to `/subscription`
3. Test all interactions

**Expected Result:**
- Plan cards stack vertically on mobile
- Table scrolls horizontally
- Buttons remain accessible
- Text remains readable
- No layout breaking

## Test 13: Feature Comparison Table

**Steps:**
1. Navigate to `/subscription`
2. Scroll to feature comparison table
3. Review all features

**Expected Result:**
- All 14 features listed
- Checkmarks (✅) and X marks (❌) display correctly
- Text values display for non-boolean features
- Table is readable and aligned
- Current plan row highlighted (optional enhancement)

## API Integration Tests

### Test 14: Subscription Enforcer API Call

**Steps:**
1. Open browser DevTools Network tab
2. Navigate to `/vehicles/new`
3. Attempt to create a vehicle
4. Observe network requests

**Expected Result:**
- POST request to `/functions/v1/subscription-enforcer`
- Request includes `tenant_id` in body
- Authorization header includes JWT token
- Response includes:
  ```json
  {
    "allowed": boolean,
    "current_count": number,
    "vehicle_limit": number,
    "subscription_plan": string,
    "upgrade_message"?: string
  }
  ```

### Test 15: Plan Change API Call

**Steps:**
1. Open browser DevTools Network tab
2. Navigate to `/subscription`
3. Click upgrade/downgrade button
4. Confirm action
5. Observe network requests

**Expected Result:**
- UPDATE request to `tenants` table
- Request updates `subscription_plan` and `vehicle_limit`
- RLS policies allow update (company_owner or super_admin role)
- Success response received
- UI updates with new data

## Error Handling Tests

### Test 16: Network Error Handling

**Steps:**
1. Disconnect from internet
2. Navigate to `/subscription`

**Expected Result:**
- Error message displays: "Failed to load subscription data"
- Retry button or link to dashboard available
- Application doesn't crash

### Test 17: Invalid Token Handling

**Steps:**
1. Manually expire JWT token or use invalid token
2. Navigate to `/subscription`
3. Attempt to view subscription

**Expected Result:**
- Redirected to login page OR
- Error message displays
- No sensitive data exposed

### Test 18: RLS Policy Enforcement

**Steps:**
1. Login as Tenant A user
2. Note Tenant A's tenant_id
3. Manually craft API request for Tenant B's tenant_id
4. Submit request

**Expected Result:**
- Request rejected with 403 Forbidden
- Error message: "Cannot check subscription for a different tenant"
- No data from Tenant B returned
- Audit log records attempted access violation

## Performance Tests

### Test 19: Page Load Time

**Steps:**
1. Clear browser cache
2. Navigate to `/subscription`
3. Measure page load time

**Expected Result:**
- Page loads in < 2 seconds on normal connection
- No render blocking
- Smooth animations

### Test 20: Multiple Rapid Plan Changes

**Steps:**
1. Navigate to `/subscription`
2. Rapidly click upgrade button multiple times

**Expected Result:**
- Button disables during processing
- Only one request sent
- No race conditions
- No duplicate updates
- Proper error handling if any

## Accessibility Tests

### Test 21: Keyboard Navigation

**Steps:**
1. Navigate to `/subscription` using only keyboard
2. Tab through all interactive elements
3. Use Enter/Space to activate buttons

**Expected Result:**
- All buttons reachable via Tab
- Focus indicators visible
- Enter/Space activates buttons
- No keyboard traps

### Test 22: Screen Reader Support

**Steps:**
1. Enable screen reader (NVDA, JAWS, or VoiceOver)
2. Navigate to `/subscription`
3. Listen to announcements

**Expected Result:**
- All headings announced
- Plan names read correctly
- Usage percentages announced
- Button purposes clear
- Links descriptive

## Edge Cases

### Test 23: Exactly at Limit (49/50 to 50/50)

**Steps:**
1. Tenant has 49/50 vehicles
2. Create one vehicle successfully
3. Immediately try to create another

**Expected Result:**
- First vehicle creates successfully
- Second vehicle blocked with error
- Count updates to 50/50 immediately
- UI reflects limit reached

### Test 24: Suspended Subscription

**Prerequisites:**
- Tenant subscription_status = 'suspended'

**Steps:**
1. Navigate to `/subscription`
2. Observe plan details
3. Attempt to create vehicle

**Expected Result:**
- Subscription status shows "Suspended"
- Cannot create vehicles regardless of limit
- Warning message displays
- Contact support prompt shown

### Test 25: Cancelled Subscription

**Prerequisites:**
- Tenant subscription_status = 'cancelled'

**Steps:**
1. Navigate to `/subscription`
2. Attempt to use application

**Expected Result:**
- Access restricted or read-only mode
- Cannot create vehicles
- Reactivation prompt displays
- Contact support information shown

## Summary Checklist

- [ ] Subscription page loads correctly
- [ ] Vehicle usage displays accurately
- [ ] Plan upgrades work immediately
- [ ] Plan downgrades validate vehicle count
- [ ] Vehicle creation respects limits
- [ ] Error messages include upgrade links
- [ ] Dashboard widget shows subscription status
- [ ] Enterprise plan shows unlimited vehicles
- [ ] Dark mode renders properly
- [ ] Mobile responsive on all screen sizes
- [ ] Feature comparison table accurate
- [ ] API calls include proper authentication
- [ ] Network errors handled gracefully
- [ ] RLS policies enforce tenant isolation
- [ ] Performance meets requirements
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Edge cases handled correctly

---

**Testing Completed By:** _________________
**Date:** _________________
**Environment:** [ ] Local [ ] Staging [ ] Production
**Browser:** [ ] Chrome [ ] Firefox [ ] Safari [ ] Edge
**Mobile Tested:** [ ] iOS [ ] Android

**Issues Found:** (List any bugs or concerns)

1. 
2. 
3. 

**Overall Result:** [ ] Pass [ ] Fail [ ] Pass with Minor Issues
