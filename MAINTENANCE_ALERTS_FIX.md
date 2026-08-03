# MaintenanceAlertsWidget and Dashboard Layouts Fix

## Problems Fixed

### 1. MaintenanceAlertsWidget React Error
The MaintenanceAlertsWidget component was throwing a React error:
```
TypeError: (alertsSummary || []).reduce is not a function
```

### 2. Dashboard Layouts 406 Error
The dashboard was throwing a 406 error when fetching dashboard layouts:
```
Failed to load resource: the server responded with a status of 406 ()
ftywwrzkbtayapfiocck.supabase.co/rest/v1/dashboard_layouts?select=*&user_id=eq.41e88732...
```

## Root Causes

### Issue 1: Type Mismatch in useAlertsSummary
The `get_active_alerts_summary()` RPC function returns a **JSON object** with this structure:
```json
{
  "by_type": { "maintenance": 5, "inspection": 3 },
  "by_severity": { "critical": 2, "high": 4, "medium": 6 },
  "total_active": 12,
  "recent_alerts": [
    {
      "id": "...",
      "alert_type": "maintenance",
      "severity": "critical",
      "message": "...",
      "vehicle_id": "...",
      "created_at": "..."
    }
  ]
}
```

However, the `useAlertsSummary` hook in `useDashboardData.tsx` was incorrectly typed to expect an **array** (`AlertsSummary[]`), and was returning `data || []` as a fallback. This caused components using the hook to receive a JSON object when they expected an array, leading to errors when trying to call array methods like `.reduce()`, `.map()`, etc.

### Issue 2: Wrong Method for Optional Row Query
The `useDashboardLayout` hook was using `.single()` to fetch the dashboard layout:
```typescript
.select('*')
.eq('user_id', user.id)
.single();
```

The `.single()` method throws a **406 error** when:
- No rows are found (expected for new users who haven't customized their dashboard yet)
- Multiple rows match the query
- The Accept header doesn't match the response

The correct approach is to use `.maybeSingle()`, which:
- Returns `null` when no rows are found (instead of throwing an error)
- Returns the single row when found
- Throws an error only when multiple rows match (which shouldn't happen with a PRIMARY KEY constraint)

## Fixes Applied

### Fix 1: Updated useAlertsSummary Hook (web/src/hooks/useDashboardData.tsx)
- **Changed return type** from `AlertsSummary[]` to `AlertsSummaryData` (proper JSON object structure)
- **Updated default value** from `[]` to `{ by_type: {}, by_severity: {}, total_active: 0, recent_alerts: [] }`
- **Added comprehensive documentation** explaining the return structure
- **Updated TypeScript interface** to match the actual RPC function return type:
  ```typescript
  interface AlertsSummaryData {
    by_type: { [key: string]: number };
    by_severity: { [key: string]: number };
    total_active: number;
    recent_alerts: Array<{...}>;
  }
  ```
- **Updated example code** to demonstrate correct usage of the JSON object structure

### Fix 2: Cleaned Up MaintenanceAlertsWidget (web/src/components/dashboard/MaintenanceAlertsWidget.tsx)
- **Removed unused import** of `useAlertsSummary` (component was already querying the RPC function directly)
- Component already correctly handles the JSON object structure from the RPC function

### Fix 3: Fixed Dashboard Layouts Query (web/src/hooks/useDashboard.ts)
- **Changed from `.single()` to `.maybeSingle()`** to gracefully handle missing rows
- **Simplified error handling** - removed PGRST116 error code check since `.maybeSingle()` returns null instead of throwing
- **Cleaner default layout logic** - now simply checks `if (!data)` instead of checking error codes
- **Better user experience** - no more 406 errors for new users without custom layouts

## Verification
- ✅ Build succeeds with no TypeScript errors
- ✅ Type safety is now enforced correctly
- ✅ MaintenanceAlertsWidget correctly parses the JSON structure
- ✅ Hook returns consistent data structure
- ✅ Dashboard layouts query no longer throws 406 errors
- ✅ New users get default layouts without errors
- ✅ Dev server running at http://127.0.0.1:3000/

## Files Modified
1. `web/src/hooks/useDashboardData.tsx` - Fixed hook types and return values
2. `web/src/components/dashboard/MaintenanceAlertsWidget.tsx` - Removed unused import
3. `web/src/hooks/useDashboard.ts` - Changed `.single()` to `.maybeSingle()`

## Impact
- The `.reduce()` error should no longer occur in the MaintenanceAlertsWidget
- The 406 error for dashboard_layouts should no longer occur
- New users will seamlessly get default dashboard layouts
- Any future components using `useAlertsSummary` will now receive the correct data structure
- Type safety prevents similar errors in the future
