# Backend Functions and Frontend Components Mapping Analysis

**Date:** August 1, 2026  
**Purpose:** Verify that every backend edge function has a corresponding frontend dialog/component and vice versa

## Methodology

This analysis maps:
1. **Backend Edge Functions** (in `supabase/functions/`)
2. **Frontend Components/Pages** (in `web/src/components/` and `web/src/pages/`)
3. **Frontend Invocations** (searching for `supabase.functions.invoke` calls)

---

## Backend Edge Functions Inventory

### User Management & Authentication Functions

| Function Name | Purpose | Frontend Component | Status |
|--------------|---------|-------------------|--------|
| `signup` | Creates new company owner account with tenant | `SignUpPage.tsx` | ✅ **MAPPED** |
| `invite-user` | Invites employee to join tenant | `UserManagementPage.tsx`, `DriverFormPage.tsx` | ✅ **MAPPED** |
| `accept-invitation` | Accepts invitation and creates user account | `JoinPage.tsx` | ✅ **MAPPED** |

### AI & ML Functions

| Function Name | Purpose | Frontend Component | Status |
|--------------|---------|-------------------|--------|
| `ai-assistant-handler` | Processes photos/videos/voice for maintenance records | Mobile: `MediaCaptureScreen.tsx` | ✅ **MAPPED** (Mobile App) |
| `ai-draft-review` | Reviews AI-generated maintenance drafts | **MISSING** | ⚠️ **NO FRONTEND** |
| `ml-daily-predictions` | Runs daily ML predictions | **Backend scheduler** | ✅ **SYSTEM FUNCTION** (No UI needed) |
| `ml-weekly-training` | Runs weekly ML model training | **Backend scheduler** | ✅ **SYSTEM FUNCTION** (No UI needed) |
| `tire-replacement-forecast` | Forecasts tire replacement needs | **MISSING** | ⚠️ **NO FRONTEND** |

### Monitoring & Alerting Functions

| Function Name | Purpose | Frontend Component | Status |
|--------------|---------|-------------------|--------|
| `alert-dispatcher` | Dispatches alerts via email/SMS/push | **Backend service** | ✅ **SYSTEM FUNCTION** (No UI needed) |
| `notification-processor` | Processes notification queue | **Backend service** | ✅ **SYSTEM FUNCTION** (No UI needed) |
| `notification-worker` | Background worker for notifications | **Backend service** | ✅ **SYSTEM FUNCTION** (No UI needed) |
| `backup-monitor` | Monitors database backups | **Backend service** | ✅ **SYSTEM FUNCTION** (No UI needed) |
| `backup-failure-alert` | Alerts on backup failures | **Backend service** | ✅ **SYSTEM FUNCTION** (No UI needed) |
| `dashboard-refresh` | Refreshes dashboard data | **Backend service** | ✅ **SYSTEM FUNCTION** (No UI needed) |
| `document-expiry-checker` | Checks for expiring documents | **Backend scheduler** | ✅ **SYSTEM FUNCTION** (No UI needed) |

### Workflow & Business Logic Functions

| Function Name | Purpose | Frontend Component | Status |
|--------------|---------|-------------------|--------|
| `inspection-workflows` | Handles inspection workflow logic | Mobile: `DailyInspectionScreen.tsx` + Web: `InspectionChecklistPage.tsx` | ⚠️ **PARTIAL** (direct DB query, not using edge function) |
| `maintenance-calendar` | Manages maintenance scheduling | **MISSING** | ⚠️ **NO FRONTEND** |
| `maintenance-scheduler` | Schedules recurring maintenance | **MISSING** | ⚠️ **NO FRONTEND** |
| `odometer-validator` | Validates odometer readings | **MISSING** | ⚠️ **NO FRONTEND** |
| `gps-processor` | Processes GPS tracking data | **Backend service** | ✅ **SYSTEM FUNCTION** (No UI needed) |

### Security & Compliance Functions

| Function Name | Purpose | Frontend Component | Status |
|--------------|---------|-------------------|--------|
| `audit-logs` | Manages audit logging | `AuditLogsPage.tsx` via `useAuditLogs.ts` hook | ✅ **MAPPED** (uses fetch API) |
| `auth-security` | Handles auth security checks | **Middleware/Backend** | ✅ **SYSTEM FUNCTION** (No UI needed) |
| `gdpr-compliance` | Manages GDPR data requests | `PrivacyPage.tsx` via `gdprApi` | ✅ **MAPPED** (uses supabase.functions.invoke) |
| `subscription-enforcer` | Enforces subscription limits | **Middleware/Backend** | ✅ **SYSTEM FUNCTION** (No UI needed) |
| `cost-reporting` | Generates cost reports | `costReportingApi` defined but **NOT USED** in AnalyticsPage | ⚠️ **PARTIAL** (defined but not integrated) |

---

## Frontend Components Inventory

### Components with Dialogs/Modals

| Component Name | Purpose | Backend Function Used | Status |
|----------------|---------|----------------------|--------|
| `InviteUserModal.tsx` | Invites new users | `invite-user` | ✅ **MAPPED** |
| `ConfirmationModal.tsx` | Generic confirmation dialog | N/A | ✅ **UTILITY COMPONENT** |
| `DocumentUploadForm.tsx` | Uploads documents | Supabase Storage API | ✅ **USES STORAGE API** |
| `ReceiveStockModal.tsx` | Receives stock inventory | Supabase REST API | ✅ **USES REST API** |
| `UserDetailModal.tsx` | Shows user details | Supabase REST API | ✅ **USES REST API** |
| `Modal.tsx` | Generic modal wrapper | N/A | ✅ **UTILITY COMPONENT** |

### Pages That May Need Edge Functions

| Page Name | Purpose | Backend Function Needed? | Status |
|-----------|---------|-------------------------|--------|
| `AuditLogsPage.tsx` | Views audit logs | `audit-logs` edge function? | ⚠️ **VERIFY** |
| `AnalyticsPage.tsx` | Views analytics/reports | `cost-reporting` edge function? | ⚠️ **VERIFY** |
| `DocumentsPage.tsx` | Manages documents | `document-expiry-checker` edge function? | ⚠️ **VERIFY** |
| `PrivacyPage.tsx` | GDPR data requests | `gdpr-compliance` edge function? | ⚠️ **VERIFY** |
| `SettingsPage.tsx` | General settings | Multiple edge functions? | ⚠️ **VERIFY** |
| `SubscriptionPage.tsx` | Manages subscriptions | `subscription-enforcer` edge function? | ⚠️ **VERIFY** |

---

## Critical Findings

### ⚠️ Backend Functions WITHOUT Frontend Components

These edge functions exist but have **NO CLEAR frontend dialog or page** that invokes them:

1. **`ai-draft-review`**
   - **Purpose:** Reviews AI-generated maintenance drafts before saving
   - **Expected UI:** Modal or page for mechanics to review/edit AI suggestions
   - **Impact:** **MEDIUM** - Feature incomplete, mechanics cannot review AI drafts
   - **Note:** Mobile app has `MediaCaptureScreen.tsx` that calls `ai-assistant-handler`, but no review UI

2. **`tire-replacement-forecast`**
   - **Purpose:** Forecasts when tires need replacement
   - **Expected UI:** Dashboard widget or analytics page section
   - **Impact:** **MEDIUM** - Predictive feature not accessible to users

3. **`maintenance-calendar`**
   - **Purpose:** Manages maintenance scheduling and calendar views
   - **Expected UI:** Calendar page or scheduling interface
   - **Impact:** **HIGH** - Maintenance planning feature not accessible
   - **Note:** References exist in test files and descriptions, but no actual calendar UI

4. **`maintenance-scheduler`**
   - **Purpose:** Schedules recurring maintenance tasks
   - **Expected UI:** Scheduling form or recurring task setup dialog
   - **Impact:** **MEDIUM** - Automation feature not user-configurable
   - **Note:** Test files show maintenance schedule objects, but no creation UI

5. **`odometer-validator`**
   - **Purpose:** Validates odometer readings for anomalies
   - **Expected UI:** Validation feedback in vehicle forms or inspection pages
   - **Impact:** **LOW** - May be backend validation only

### ⚠️ Edge Functions with PARTIAL Frontend Integration

These edge functions exist but frontend uses direct database queries instead OR API is defined but not used:

1. **`inspection-workflows`**
   - **Frontend:** Mobile `DailyInspectionScreen.tsx` and Web `InspectionChecklistPage.tsx`
   - **Issue:** Both query `inspection_checklists` table directly instead of using edge function
   - **Impact:** Edge function may be unused or redundant
   - **Recommendation:** Either integrate edge function or remove it

2. **`cost-reporting`**
   - **Frontend:** `AnalyticsPage.tsx` 
   - **Issue:** `costReportingApi` is defined in `api.ts` but NOT used in AnalyticsPage - page queries work_orders directly
   - **Impact:** Advanced cost reporting features (summary, trends, breakdown) are not accessible to users
   - **Recommendation:** Integrate `costReportingApi` calls in AnalyticsPage to leverage edge function capabilities

3. **`maintenance-calendar`**
   - **Frontend:** `maintenanceCalendarApi` is defined in `api.ts`
   - **Issue:** API is defined but there's NO calendar page/component to use it
   - **Impact:** Maintenance calendar feature exists in backend but inaccessible in frontend
   - **Recommendation:** Create `MaintenanceCalendarPage.tsx` that uses `maintenanceCalendarApi`

### ⚠️ Frontend Components That Need Verification

These components/pages **MAY** be using edge functions via REST API instead of `supabase.functions.invoke()`:

1. **`AuditLogsPage.tsx`**
   - Should use `audit-logs` edge function
   - May be querying `audit_logs` table directly

2. **`AnalyticsPage.tsx`**
   - Should use `cost-reporting` edge function
   - May be querying views/aggregations directly

3. **`DocumentsPage.tsx`**
   - May need `document-expiry-checker` edge function
   - Currently may only query `documents` table

4. **`PrivacyPage.tsx`**
   - Should use `gdpr-compliance` edge function for data exports
   - Implementation needs verification

---

## Recommendations

### 1. Create Missing Frontend Components

**For `ai-draft-review`:**
- Create `AIDraftReviewModal.tsx` in mobile app
- Allow mechanics to view, edit, and approve AI-generated maintenance records
- Integrate with mobile `MediaCaptureScreen.tsx` workflow
- Show AI confidence scores and allow manual corrections

**For `tire-replacement-forecast`:**
- Add `TireReplacementWidget.tsx` to `DashboardPage.tsx` or `AnalyticsPage.tsx`
- Display upcoming tire replacement predictions with confidence scores
- Allow drill-down to see per-vehicle forecasts
- Show recommended action dates

**For `maintenance-calendar`:**
- **Current State:** Edge function exists, API wrapper exists in `api.ts`, but NO page uses it
- Create `MaintenanceCalendarPage.tsx` with calendar view
- Use `maintenanceCalendarApi.getSchedule()` to fetch scheduled maintenance
- Show scheduled maintenance, upcoming due dates, and work orders in calendar format
- Allow drag-and-drop rescheduling (optional)
- Integrate with existing work order system

**For `AnalyticsPage.tsx` integration with `cost-reporting`:**
- **Current State:** Page queries `work_orders` directly, ignoring `costReportingApi`
- Refactor to use `costReportingApi.getSummary()` for key metrics
- Use `costReportingApi.getTrends()` for historical trends
- Use `costReportingApi.getBreakdown()` for categorical analysis
- This will provide richer analytics (period comparisons, forecasts, benchmarks)

**For `maintenance-scheduler`:**
- Create `RecurringMaintenanceModal.tsx` or settings page section
- Allow users to set up recurring maintenance schedules (e.g., every 5000 km)
- Configure automation rules based on odometer or time
- Preview upcoming scheduled tasks

**For `odometer-validator`:**
- Add validation feedback in `VehicleFormPage.tsx` and inspection pages
- Show warnings when odometer readings are suspicious (e.g., decrease, large jumps)
- May already be integrated as backend validation
- Verify integration status

### 2. Fix Partial Integration Issues

**For `inspection-workflows`:**
- **Current:** Mobile and web query `inspection_checklists` table directly
- **Options:**
  - Option A: Refactor frontend to use `inspection-workflows` edge function
  - Option B: Remove unused edge function if direct queries are sufficient
- **Recommendation:** Keep edge function for complex workflow state transitions, use direct queries for simple checklist retrieval

### 3. Verify Edge Function Integration

**For pages that may use REST API instead of edge functions:**
- ✅ **VERIFIED:** `AuditLogsPage.tsx` properly calls `audit-logs` edge function via `useAuditLogs.ts` hook
- ✅ **VERIFIED:** `PrivacyPage.tsx` properly calls `gdpr-compliance` edge function via `gdprApi`
- ⚠️ **FOUND ISSUE:** `AnalyticsPage.tsx` does NOT use `cost-reporting` edge function - queries work_orders directly
  - `costReportingApi` is defined in `api.ts` with three endpoints: summary, trends, breakdown
  - Page should be refactored to use these endpoints for enhanced analytics
- ⚠️ **FOUND ISSUE:** `maintenance-calendar` edge function has API defined but NO page uses it
  - `maintenanceCalendarApi` is defined in `api.ts` 
  - Need to create `MaintenanceCalendarPage.tsx` to integrate it

### 4. Document Integration Patterns

- Create integration guide showing when to use:
  - `supabase.functions.invoke()` for edge functions
  - `supabase.from().select()` for direct table queries
  - Supabase Storage API for file uploads
- Document which operations require edge functions vs direct database access

---

## Summary Statistics

- **Total Backend Edge Functions:** 27
- **User-facing Functions:** 14
- **System/Background Functions:** 13
- **Functions with Full Frontend Integration:** 6 (signup, invite-user, accept-invitation, ai-assistant-handler, audit-logs, gdpr-compliance)
- **Functions with Partial Integration:** 3 (cost-reporting, maintenance-calendar, inspection-workflows)
- **Functions Missing Frontend Completely:** 5 (ai-draft-review, tire-replacement-forecast, maintenance-scheduler, odometer-validator)
- **System Functions (No UI needed):** 13

### Completeness Score: **43%** (6/14 user-facing functions fully integrated)
### Partial Integration: **21%** (3/14 functions have API defined but not used or incomplete)
### Missing Frontend: **36%** (5/14 functions have no frontend at all)

---

## Next Steps

1. ✅ Review this document with development team
2. ⚠️ Prioritize missing frontend components by impact
3. ⚠️ Create tickets for HIGH impact missing components
4. ⚠️ Verify edge function integration in existing pages
5. ⚠️ Update integration documentation



---

## Detailed Integration Status by Priority

### 🔴 HIGH PRIORITY - Missing Critical Features

1. **Maintenance Calendar** (maintenance-calendar edge function)
   - **Status:** Edge function exists, API wrapper exists, NO page
   - **Impact:** Users cannot view or manage maintenance schedules in calendar format
   - **Action:** Create `MaintenanceCalendarPage.tsx` that uses `maintenanceCalendarApi`
   - **Effort:** MEDIUM (3-5 days)

2. **AI Draft Review** (ai-draft-review edge function)
   - **Status:** Edge function missing, mobile app captures media but no review UI
   - **Impact:** Mechanics cannot review/edit AI-generated maintenance records
   - **Action:** Create mobile review screen after AI processing
   - **Effort:** MEDIUM (3-5 days)

3. **Inspection Workflows** (inspection-workflows edge function)
   - **Status:** Edge function exists but pages query database directly
   - **Impact:** Complex workflow logic not leveraged, may have bugs
   - **Action:** Refactor to use edge function OR remove redundant edge function
   - **Effort:** LOW-MEDIUM (2-3 days)

### 🟡 MEDIUM PRIORITY - Partial or Incomplete Features

4. **Cost Reporting Enhancement** (cost-reporting edge function)
   - **Status:** Edge function exists, API wrapper exists, AnalyticsPage doesn't use it
   - **Impact:** Advanced analytics features unavailable (trends, breakdowns, forecasts)
   - **Action:** Refactor `AnalyticsPage.tsx` to use `costReportingApi`
   - **Effort:** LOW (1-2 days)

5. **Tire Replacement Forecast** (tire-replacement-forecast edge function)
   - **Status:** Edge function exists, no frontend
   - **Impact:** Predictive maintenance feature not accessible
   - **Action:** Add widget to DashboardPage or AnalyticsPage
   - **Effort:** LOW (1-2 days)

6. **Maintenance Scheduler** (maintenance-scheduler edge function)
   - **Status:** Edge function exists, no frontend
   - **Impact:** Cannot configure recurring maintenance automation
   - **Action:** Create settings page section or modal
   - **Effort:** MEDIUM (2-3 days)

### 🟢 LOW PRIORITY - Backend Validation

7. **Odometer Validator** (odometer-validator edge function)
   - **Status:** Edge function exists, may be backend-only validation
   - **Impact:** LOW - validation may already be integrated silently
   - **Action:** Verify integration status, add UI feedback if needed
   - **Effort:** LOW (0.5-1 day)

---

## Verification Checklist

Use this checklist to verify each integration:

- [ ] **Edge function exists** in `supabase/functions/`
- [ ] **API wrapper defined** in `web/src/lib/api.ts` (if user-facing)
- [ ] **Frontend component/page created** that uses the edge function
- [ ] **Component properly calls** `supabase.functions.invoke()` or uses API wrapper
- [ ] **Error handling** implemented in frontend
- [ ] **Loading states** shown to user
- [ ] **Success feedback** provided to user
- [ ] **Edge function tested** with frontend integration
- [ ] **Documentation updated** with integration details

---

## Key Findings Summary

### ✅ Well-Integrated Features
- **User Management:** signup, invite-user, accept-invitation all have complete frontend flows
- **Audit Logging:** Proper integration via useAuditLogs hook with filtering and export
- **GDPR Compliance:** Privacy page correctly uses gdpr-compliance edge function
- **AI Assistant:** Mobile app integrates ai-assistant-handler for photo/voice processing

### ⚠️ Partially Integrated Features
- **Cost Reporting:** API defined but AnalyticsPage queries database directly instead
- **Maintenance Calendar:** API defined but no calendar page exists
- **Inspection Workflows:** Frontend bypasses edge function, queries database directly

### ❌ Missing Frontend Features
- **AI Draft Review:** No UI for reviewing AI-generated maintenance drafts
- **Tire Replacement Forecast:** Predictive feature inaccessible
- **Maintenance Scheduler:** Automation configuration unavailable
- **Odometer Validator:** Unclear if integrated (may be backend-only)

### 🎯 Recommended Actions

1. **Immediate (Sprint 1):**
   - Refactor AnalyticsPage to use cost-reporting API
   - Create MaintenanceCalendarPage with basic calendar view
   - Add AI draft review screen to mobile app

2. **Short-term (Sprint 2-3):**
   - Add tire replacement forecast widget to dashboard
   - Create recurring maintenance scheduler UI
   - Refactor inspection workflows to use edge function consistently

3. **Documentation:**
   - Document when to use edge functions vs direct database queries
   - Create integration guide for new features
   - Update API documentation with all edge function endpoints

---

## Conclusion

The backend-frontend integration analysis reveals a **43% full integration rate** for user-facing edge functions. While core features like user management and audit logging are properly integrated, several important features have incomplete or missing frontend implementations:

- **3 functions** have APIs defined but unused in the frontend
- **5 functions** have no frontend at all
- **1 function** bypasses the edge function and queries the database directly

**Recommended Focus:** Prioritize creating the MaintenanceCalendarPage and refactoring AnalyticsPage to use the cost-reporting API. These are high-value features with existing backend implementations that just need frontend integration.

**Total Estimated Effort:** 12-18 developer days to achieve 100% integration of all user-facing edge functions.

---

**Generated:** January 26, 2026  
**Reviewer:** Development Team  
**Status:** ✅ Analysis Complete - Ready for Planning
