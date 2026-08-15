import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useThemeStore } from './stores/themeStore';
import ToastContainer from './components/ToastContainer';
import OfflineIndicator from './components/OfflineIndicator';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

// Immediate loading for critical routes
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import JoinPage from './pages/JoinPage';
import WelcomePage from './pages/WelcomePage';
import OnboardingPage from './pages/OnboardingPage';

// Lazy load all other routes for better initial load performance
const PasswordResetPage = lazy(() => import('./pages/PasswordResetPage'));
const UpdatePasswordPage = lazy(() => import('./pages/UpdatePasswordPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const VehicleListPage = lazy(() => import('./pages/VehicleListPage'));
const VehicleDetailPage = lazy(() => import('./pages/VehicleDetailPage'));
const VehicleFormPage = lazy(() => import('./pages/VehicleFormPage'));
const ComponentsPage = lazy(() => import('./pages/ComponentsPage'));
const ComponentFormPage = lazy(() => import('./pages/ComponentFormPage'));
const WorkOrderListPage = lazy(() => import('./pages/WorkOrderListPage'));
const WorkOrderDetailPage = lazy(() => import('./pages/WorkOrderDetailPage'));
const WorkOrderFormPage = lazy(() => import('./pages/WorkOrderFormPage'));
const InventoryPage = lazy(() => import('./pages/InventoryPage'));
const SparePartFormPage = lazy(() => import('./pages/SparePartFormPage'));
const PurchaseOrderPage = lazy(() => import('./pages/PurchaseOrderPage'));
const PurchaseOrderFormPage = lazy(() => import('./pages/PurchaseOrderFormPage'));
const PurchaseOrderDetailPage = lazy(() => import('./pages/PurchaseOrderDetailPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const DocumentsPage = lazy(() => import('./pages/DocumentsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const UserManagementPage = lazy(() => import('./pages/settings/UserManagementPage'));
const InspectionChecklistPage = lazy(() => import('./pages/settings/InspectionChecklistPage'));
const NotificationPreferencesPage = lazy(() => import('./pages/settings/NotificationPreferencesPage'));
const AppearancePage = lazy(() => import('./pages/settings/AppearancePage'));
const DataImportPage = lazy(() => import('./pages/DataImportPage'));
const AuditLogsPage = lazy(() => import('./pages/AuditLogsPage'));
const SubscriptionPage = lazy(() => import('./pages/SubscriptionPage'));
const TeamPage = lazy(() => import('./pages/TeamPage'));
const DriversPage = lazy(() => import('./pages/DriversPage'));
const DriverDetailPage = lazy(() => import('./pages/DriverDetailPage'));
const DriverFormPage = lazy(() => import('./pages/DriverFormPage'));
const VendorsPage = lazy(() => import('./pages/VendorsPage'));
const VendorDetailPage = lazy(() => import('./pages/VendorDetailPage'));
const VendorFormPage = lazy(() => import('./pages/VendorFormPage'));
const MaintenanceCalendarPage = lazy(() => import('./pages/MaintenanceCalendarPage'));
const GPSTrackingPage = lazy(() => import('./pages/GPSTrackingPage'));
const RecurringMaintenancePage = lazy(() => import('./pages/RecurringMaintenancePage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

// Lazy load ForbiddenPage
const ForbiddenPage = lazy(() => import('./pages/ForbiddenPage'));

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

function App() {
  const theme = useThemeStore((state) => state.theme);
  const gated = (feature: import('./hooks/useSubscription').FeatureKey, element: React.ReactNode) => <ProtectedRoute requiredFeature={feature}>{element}</ProtectedRoute>;
  // Apply theme class to HTML element
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen">
        <OfflineIndicator />
        <ToastContainer />
        <Suspense fallback={<LoadingFallback />}>
          <ProtectedRoute><Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/join" element={<JoinPage />} />
          <Route path="/welcome" element={<WelcomePage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/password-reset" element={<PasswordResetPage />} />
          <Route path="/reset-password" element={<UpdatePasswordPage />} />
          <Route path="/dashboard" element={gated('dashboard', <DashboardPage />)} />
          <Route path="/vehicles" element={gated('vehicles', <VehicleListPage />)} />
          <Route path="/vehicles/new" element={gated('vehicles', <VehicleFormPage />)} />
          <Route path="/vehicles/:id" element={gated('vehicles', <VehicleDetailPage />)} />
          <Route path="/vehicles/:id/edit" element={gated('vehicles', <VehicleFormPage />)} />
          <Route path="/components" element={gated('components', <ComponentsPage />)} />
          <Route path="/components/new" element={gated('components', <ComponentFormPage />)} />
          <Route path="/components/:id/edit" element={gated('components', <ComponentFormPage />)} />
          <Route path="/vehicles/:vehicleId/components/new" element={gated('components', <ComponentFormPage />)} />
          <Route path="/work-orders" element={gated('work_orders', <WorkOrderListPage />)} />
          <Route path="/work-orders/new" element={gated('work_orders', <WorkOrderFormPage />)} />
          <Route path="/work-orders/:id" element={gated('work_orders', <WorkOrderDetailPage />)} />
          <Route path="/work-orders/:id/edit" element={gated('work_orders', <WorkOrderFormPage />)} />
          <Route path="/inventory" element={gated('inventory', <InventoryPage />)} />
          <Route path="/inventory/parts/new" element={gated('inventory', <SparePartFormPage />)} />
          <Route path="/inventory/parts/:id/edit" element={gated('inventory', <SparePartFormPage />)} />
          <Route path="/inventory/purchase-orders" element={gated('inventory', <PurchaseOrderPage />)} />
          <Route path="/inventory/purchase-orders/new" element={gated('inventory', <PurchaseOrderFormPage />)} />
          <Route path="/inventory/purchase-orders/:id" element={gated('inventory', <PurchaseOrderDetailPage />)} />
          <Route path="/inventory/purchase-orders/:id/edit" element={gated('inventory', <PurchaseOrderFormPage />)} />
          <Route path="/analytics" element={gated('analytics', <AnalyticsPage />)} />
          <Route path="/calendar" element={<MaintenanceCalendarPage />} />
          <Route path="/gps-tracking" element={gated('gps_tracking', <GPSTrackingPage />)} />
          <Route path="/recurring-maintenance" element={<RecurringMaintenancePage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/users" element={<UserManagementPage />} />
          <Route path="/settings/checklists" element={<InspectionChecklistPage />} />
          <Route path="/settings/notifications" element={<NotificationPreferencesPage />} />
          <Route path="/settings/appearance" element={<AppearancePage />} />
          <Route path="/import" element={<DataImportPage />} />
          <Route path="/audit-logs" element={<AuditLogsPage />} />
          <Route path="/subscription" element={<SubscriptionPage />} />
          <Route 
            path="/team" 
            element={
              <ProtectedRoute requiredRoles={['company_owner', 'fleet_manager']}>
                <TeamPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/drivers" 
            element={
              <ProtectedRoute requiredRoles={['company_owner', 'fleet_manager', 'workshop_manager']}>
                <DriversPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/drivers/new" 
            element={
              <ProtectedRoute requiredRoles={['company_owner', 'fleet_manager', 'workshop_manager']}>
                <DriverFormPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/drivers/:id" 
            element={
              <ProtectedRoute requiredRoles={['company_owner', 'fleet_manager', 'workshop_manager']}>
                <DriverDetailPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/drivers/:id/edit" 
            element={
              <ProtectedRoute requiredRoles={['company_owner', 'fleet_manager', 'workshop_manager']}>
                <DriverFormPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/vendors" 
            element={
              <ProtectedRoute requiredRoles={['company_owner', 'fleet_manager', 'workshop_manager']}>
                <VendorsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/vendors/new" 
            element={
              <ProtectedRoute requiredRoles={['company_owner', 'fleet_manager', 'workshop_manager']}>
                <VendorFormPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/vendors/:id" 
            element={
              <ProtectedRoute requiredRoles={['company_owner', 'fleet_manager', 'workshop_manager']}>
                <VendorDetailPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/vendors/:id/edit" 
            element={
              <ProtectedRoute requiredRoles={['company_owner', 'fleet_manager', 'workshop_manager']}>
                <VendorFormPage />
              </ProtectedRoute>
            } 
          />
          <Route path="/forbidden" element={<ForbiddenPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes></ProtectedRoute>
      </Suspense>
    </div>
    </ErrorBoundary>
  );
}

export default App;
