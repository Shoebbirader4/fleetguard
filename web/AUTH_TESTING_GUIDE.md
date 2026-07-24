# Authentication Testing Guide

This guide provides step-by-step instructions for manually testing the authentication implementation.

## Prerequisites

1. Supabase project is set up and running
2. Web application is running (`npm run dev` in `/web` directory)
3. At least one test user exists in Supabase Auth
4. User profile exists in the `users` table

## Test Suite

### Test 1: Login with Valid Credentials

**Steps:**
1. Navigate to `http://localhost:5173/login`
2. Enter valid email address
3. Enter valid password
4. Click "Sign In" button

**Expected Results:**
- ✅ Loading state shows "Signing in..."
- ✅ User is redirected to `/dashboard`
- ✅ User's name and role are displayed in header
- ✅ Dashboard shows user-specific data
- ✅ JWT token is stored in session
- ✅ Auth state persists on page refresh

**Verification:**
- Check browser DevTools > Application > Local Storage for `fleetguard-auth`
- Check Network tab for Authorization header in subsequent requests

---

### Test 2: Login with Invalid Credentials

**Steps:**
1. Navigate to `http://localhost:5173/login`
2. Enter email: `invalid@example.com`
3. Enter password: `wrongpassword`
4. Click "Sign In" button

**Expected Results:**
- ✅ Error message displays: "Invalid email or password. Please try again."
- ✅ User remains on login page
- ✅ Form fields remain editable
- ✅ No redirect occurs

---

### Test 3: Login Form Validation

**Steps:**
1. Navigate to `http://localhost:5173/login`
2. Enter invalid email: `notanemail`
3. Click "Sign In" button

**Expected Results:**
- ✅ Error message: "Please enter a valid email address"
- ✅ No API call is made

**Additional Tests:**
4. Enter valid email but password < 6 characters
5. Click "Sign In"

**Expected Results:**
- ✅ Error message: "Password must be at least 6 characters"
- ✅ No API call is made

---

### Test 4: Password Reset Request

**Steps:**
1. Navigate to `http://localhost:5173/login`
2. Click "Forgot password?" link
3. Redirected to `/password-reset`
4. Enter valid email address
5. Click "Send Reset Link" button

**Expected Results:**
- ✅ Success message: "Password reset email sent! Please check your inbox..."
- ✅ Email is sent to user's inbox (check Supabase email logs)
- ✅ Form is cleared after submission
- ✅ "Back to Login" link works

---

### Test 5: Password Reset - Invalid Email

**Steps:**
1. Navigate to `http://localhost:5173/password-reset`
2. Enter non-existent email: `nonexistent@example.com`
3. Click "Send Reset Link" button

**Expected Results:**
- ✅ Success message still shows (security best practice - don't reveal if email exists)
- ✅ No actual email is sent

---

### Test 6: Update Password Flow

**Setup:**
1. Complete Test 4 to receive password reset email
2. Click the reset link in email

**Steps:**
1. Redirected to `/reset-password`
2. Enter new password: `NewSecurePass123!@#`
3. Enter confirm password: `NewSecurePass123!@#`
4. Click "Update Password" button

**Expected Results:**
- ✅ Success alert: "Password updated successfully! Redirecting to login..."
- ✅ Redirect to `/login` after 2 seconds
- ✅ Can login with new password
- ✅ Old password no longer works

---

### Test 7: Update Password - Validation Errors

**Steps:**
1. Navigate to `/reset-password` (with valid reset token)
2. Enter weak password: `pass123`
3. Click "Update Password" button

**Expected Results:**
- ✅ Validation errors displayed:
  - "Password must be at least 12 characters long"
  - "Password must contain at least one uppercase letter"
  - "Password must contain at least one special character"
- ✅ Password is not updated

**Additional Tests:**
4. Enter valid password: `ValidPass123!@#`
5. Enter different confirm password: `DifferentPass123!@#`
6. Click "Update Password"

**Expected Results:**
- ✅ Error message: "Passwords do not match"
- ✅ Password is not updated

---

### Test 8: Logout Functionality

**Steps:**
1. Login successfully
2. Navigate to dashboard
3. Click "Logout" button in header

**Expected Results:**
- ✅ User is signed out from Supabase
- ✅ Redirected to `/login`
- ✅ Auth state is cleared from localStorage
- ✅ Attempting to access `/dashboard` redirects to login

---

### Test 9: Protected Route Access

**Steps:**
1. Ensure user is logged out
2. Manually navigate to `http://localhost:5173/dashboard`

**Expected Results:**
- ✅ Redirected to `/login`
- ✅ Loading state shows briefly during session check
- ✅ After login, user is redirected back to intended route

---

### Test 10: Session Persistence

**Steps:**
1. Login successfully
2. Navigate to dashboard
3. Close browser tab
4. Open new tab
5. Navigate to `http://localhost:5173/dashboard`

**Expected Results:**
- ✅ User remains logged in
- ✅ Dashboard loads without redirect
- ✅ User data is displayed correctly
- ✅ No login required

---

### Test 11: JWT Token in API Calls

**Steps:**
1. Login successfully
2. Open browser DevTools > Network tab
3. Navigate to dashboard (triggers vehicle query)
4. Find the request to Supabase API
5. Check request headers

**Expected Results:**
- ✅ Authorization header present: `Bearer <jwt-token>`
- ✅ API request succeeds with 200 status
- ✅ Data is returned correctly

---

### Test 12: Token Expiration Handling

**Note:** This test requires manual token expiration or time manipulation

**Setup:**
1. Login successfully
2. Modify token expiration in browser DevTools or wait for actual expiration

**Steps:**
1. Make an API call (navigate to different page)

**Expected Results:**
- ✅ Token refresh is attempted automatically
- ✅ If refresh succeeds, request continues
- ✅ If refresh fails, redirected to login
- ✅ User sees loading state during refresh

---

### Test 13: Remember Me Functionality

**Steps:**
1. Navigate to `/login`
2. Check "Remember me" checkbox
3. Enter credentials and login
4. Close browser completely
5. Reopen browser and navigate to app

**Expected Results:**
- ✅ User remains logged in
- ✅ Session persists across browser restarts

**Additional Test:**
6. Login without "Remember me" checked
7. Close browser
8. Reopen and navigate to app

**Expected Results:**
- ✅ User is logged out (session expired)
- ✅ Redirected to login page

---

### Test 14: Already Authenticated Redirect

**Steps:**
1. Login successfully
2. Manually navigate to `http://localhost:5173/login`

**Expected Results:**
- ✅ Immediately redirected to `/dashboard`
- ✅ Login form is not displayed

---

### Test 15: Role-Based Access Control (Future)

**Note:** This test is for when role-based route protection is implemented

**Steps:**
1. Login as user with role "driver"
2. Try to access admin-only route

**Expected Results:**
- ✅ Access Denied page is shown
- ✅ Error message: "You do not have permission to access this page"
- ✅ "Go Back" button is available

---

## Common Issues and Troubleshooting

### Issue: Login fails with no error message

**Possible Causes:**
- Supabase connection issue
- Invalid environment variables
- User not confirmed in Supabase

**Debug Steps:**
1. Check browser console for errors
2. Verify `.env` variables are correct
3. Check Supabase dashboard for user status
4. Verify RLS policies allow user profile query

---

### Issue: Token not included in API requests

**Possible Causes:**
- Axios interceptor not configured
- Token not stored in session
- Request made before token available

**Debug Steps:**
1. Check Network tab for Authorization header
2. Verify token exists in localStorage
3. Check axios instance is being used (not native fetch)
4. Verify Supabase session is active

---

### Issue: Session not persisting across page refresh

**Possible Causes:**
- localStorage disabled
- Zustand persist not working
- Browser security settings

**Debug Steps:**
1. Check browser allows localStorage
2. Verify `fleetguard-auth` exists in localStorage
3. Check for quota errors in console
4. Try incognito mode to rule out extensions

---

### Issue: Password reset email not received

**Possible Causes:**
- Email in spam folder
- Supabase email settings not configured
- Invalid email address

**Debug Steps:**
1. Check spam/junk folder
2. Verify Supabase email templates are configured
3. Check Supabase logs for email sending errors
4. Verify SMTP settings in Supabase dashboard

---

## Performance Testing

### Test: Login Performance

**Metric:** Time from submit to dashboard load
**Target:** < 2 seconds

**Steps:**
1. Open DevTools Performance tab
2. Start recording
3. Submit login form
4. Stop recording when dashboard loads
5. Analyze timeline

**Expected Results:**
- ✅ Auth API call: < 500ms
- ✅ Profile fetch: < 300ms
- ✅ Redirect: < 100ms
- ✅ Total: < 2 seconds

---

### Test: Token Refresh Performance

**Metric:** Time for token refresh
**Target:** < 500ms

**Steps:**
1. Wait for token near expiration
2. Make API call
3. Measure refresh time in Network tab

**Expected Results:**
- ✅ Refresh completes: < 500ms
- ✅ Original request retried automatically
- ✅ No user-visible delay

---

## Security Testing

### Test: XSS Protection

**Steps:**
1. Try entering `<script>alert('xss')</script>` in email field
2. Submit form

**Expected Results:**
- ✅ Script is not executed
- ✅ Input is sanitized

---

### Test: SQL Injection Protection

**Steps:**
1. Try entering `' OR '1'='1` in password field
2. Submit form

**Expected Results:**
- ✅ Login fails with invalid credentials
- ✅ No database error exposed

---

### Test: CSRF Protection

**Steps:**
1. Create malicious form on different domain
2. Try to submit to login endpoint

**Expected Results:**
- ✅ Request is rejected
- ✅ JWT-based stateless auth prevents CSRF

---

## Accessibility Testing

### Test: Keyboard Navigation

**Steps:**
1. Navigate to login page
2. Use only Tab and Enter keys
3. Complete login flow

**Expected Results:**
- ✅ All form fields are focusable
- ✅ Focus order is logical
- ✅ Form can be submitted with Enter
- ✅ Links are accessible

---

### Test: Screen Reader Compatibility

**Steps:**
1. Enable screen reader (NVDA, JAWS, or VoiceOver)
2. Navigate login page
3. Listen to announcements

**Expected Results:**
- ✅ Form labels are announced
- ✅ Errors are announced
- ✅ Success messages are announced
- ✅ All interactive elements are labeled

---

## Checklist Summary

Use this checklist to verify all tests pass:

- [ ] Login with valid credentials
- [ ] Login with invalid credentials
- [ ] Login form validation
- [ ] Password reset request
- [ ] Password reset with invalid email
- [ ] Update password flow
- [ ] Update password validation
- [ ] Logout functionality
- [ ] Protected route access
- [ ] Session persistence
- [ ] JWT token in API calls
- [ ] Token expiration handling
- [ ] Remember me functionality
- [ ] Already authenticated redirect
- [ ] Role-based access control
- [ ] Login performance < 2s
- [ ] Token refresh < 500ms
- [ ] XSS protection
- [ ] SQL injection protection
- [ ] Keyboard navigation
- [ ] Screen reader compatibility

---

## Reporting Issues

When reporting authentication issues, include:

1. **Steps to reproduce**
2. **Expected behavior**
3. **Actual behavior**
4. **Browser and version**
5. **Console errors** (if any)
6. **Network tab screenshot** (if relevant)
7. **Environment** (dev/staging/production)

---

## Next Steps After Testing

Once all tests pass:

1. ✅ Deploy to staging environment
2. ✅ Perform UAT with real users
3. ✅ Monitor auth metrics (login success rate, session duration)
4. ✅ Set up error tracking (Sentry, LogRocket)
5. ✅ Document known issues and workarounds
6. ✅ Create user documentation
7. ✅ Plan for production deployment
