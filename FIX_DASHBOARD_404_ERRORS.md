# Fix Dashboard 404 Errors - Quick Guide

## Issue
The dashboard is showing 404 errors for RPC functions:
```
POST https://ftywwrzkbtayapfiocck.supabase.co/rest/v1/rpc/get_active_alerts_summary 404 (Not Found)
```

## Root Cause
Some migrations containing required database functions weren't applied to the production database.

## Status
✅ **FIXED**: Migration history has been repaired for:
- `20260119000100_optimize_database_performance.sql` - Contains `get_active_alerts_summary` function
- `20260728000000_add_missing_purchase_orders_and_functions.sql` - Contains dashboard functions

---

## Solution 1: Verify & Create Missing Functions (RECOMMENDED)

### Step 1: Run Verification Script

Open Supabase SQL Editor and run: `verify_functions.sql`

This will check if the functions exist.

### Step 2: Create Missing Functions

If functions are missing, run: `create_missing_dashboard_functions.sql`

This will create the `get_active_alerts_summary` function.

### Step 3: Refresh Your Browser

After running the SQL scripts:
1. Clear browser cache or hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
2. Reload the dashboard page
3. Check console - errors should be gone

---

## Solution 2: Push All Migrations (If needed)

If Solution 1 doesn't work, push all migrations:

```bash
# Check migration status
supabase migration list --linked

# Push any pending migrations
supabase db push --linked
```

---

## Solution 3: Manual Function Creation

If automated methods fail, manually create the function via Supabase Dashboard:

1. Go to: https://supabase.com/dashboard/project/ftywwrzkbtayapfiocck/sql
2. Click "New Query"
3. Paste the contents of `create_missing_dashboard_functions.sql`
4. Click "Run"
5. Check for success message

---

## What These Functions Do

### `get_active_alerts_summary()`
Returns active alerts for the current user's tenant, grouped by severity:
- Critical alerts
- High priority alerts  
- Medium priority alerts
- Low priority alerts

**Used by**: Dashboard widgets to show alert summary

**Returns**: JSON with alerts array and summary counts

---

## Verification

After applying the fix, verify it worked:

### Test 1: SQL Editor Test
```sql
-- Should return JSON with alerts and summary
SELECT get_active_alerts_summary();
```

Expected result: JSON object (even if empty)

### Test 2: Browser Console Test
1. Open dashboard page
2. Open browser console (F12)
3. Look for the 404 error
4. ✅ Error should be gone

### Test 3: Dashboard Visual Test
1. Dashboard should load without errors
2. Alert widgets should display data
3. No 404 errors in console

---

## Other Common Dashboard Issues

### React Router Warnings
**Status**: ✅ **FIXED** in latest commit

The warnings about `v7_startTransition` and `v7_relativeSplatPath` have been resolved by adding future flags to BrowserRouter.

### Refresh Token Errors
**Status**: ✅ **FIXED** in latest commit

Invalid refresh token errors now handled gracefully:
- Automatically clears invalid tokens
- Redirects to login when needed
- No more console spam

---

## Files Created

| File | Purpose |
|------|---------|
| `verify_functions.sql` | Check if RPC functions exist |
| `create_missing_dashboard_functions.sql` | Create missing functions |
| `FIX_DASHBOARD_404_ERRORS.md` | This guide |

---

## Quick Fix Checklist

- [x] Repair migration history for 20260119000100
- [x] Repair migration history for 20260728000000  
- [ ] Run `verify_functions.sql` in Supabase SQL Editor
- [ ] If needed, run `create_missing_dashboard_functions.sql`
- [ ] Clear browser cache
- [ ] Refresh dashboard page
- [ ] Verify no 404 errors in console

---

## Additional Migrations That May Need Repair

If you encounter other 404 errors for different functions, repair these migrations:

```bash
# Repair all suggested migrations
supabase migration repair --status applied --linked 20250610000000
supabase migration repair --status applied --linked 20260726010000
supabase migration repair --status applied --linked 20260726020000
supabase migration repair --status applied --linked 99999999999998
supabase migration repair --status applied --linked 99999999999999
```

---

## Support

If issues persist:

1. **Check migration status**:
   ```bash
   supabase migration list --linked
   ```

2. **Check function exists**:
   ```sql
   SELECT proname FROM pg_proc WHERE proname LIKE '%alerts%';
   ```

3. **Check RLS policies**:
   ```sql
   SELECT schemaname, tablename, policyname 
   FROM pg_policies 
   WHERE tablename = 'alerts';
   ```

4. **Check user permissions**:
   ```sql
   SELECT has_function_privilege('get_active_alerts_summary()', 'execute');
   ```

---

## Summary

✅ **Migration history repaired**  
✅ **React Router warnings fixed**  
✅ **Refresh token handling fixed**  
⏳ **Pending**: Run SQL scripts to create missing functions

**Next step**: Run `create_missing_dashboard_functions.sql` in Supabase SQL Editor to complete the fix.
