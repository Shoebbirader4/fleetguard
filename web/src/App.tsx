import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useThemeStore } from './stores/themeStore';
import ToastContainer from './components/ToastContainer';

// Immediate loading for critical routes
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import JoinPage from './pages/JoinPage';

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
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

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

  // Apply theme class to HTML element
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }

  return (
    <div className="min-h-screen">
      <ToastContainer />
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/join" element={<JoinPage />} />
          <Route path="/password-reset" element={<PasswordResetPage />} />
          <Route path="/reset-password" element={<UpdatePasswordPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/vehicles" element={<VehicleListPage />} />
          <Route path="/vehicles/new" element={<VehicleFormPage />} />
          <Route path="/vehicles/:id" element={<VehicleDetailPage />} />
          <Route path="/vehicles/:id/edit" element={<VehicleFormPage />} />
          <Route path="/components" element={<ComponentsPage />} />
          <Route path="/components/new" element={<ComponentFormPage />} />
          <Route path="/components/:id/edit" element={<ComponentFormPage />} />
          <Route path="/vehicles/:vehicleId/components/new" element={<ComponentFormPage />} />
          <Route path="/work-orders" element={<WorkOrderListPage />} />
          <Route path="/work-orders/new" element={<WorkOrderFormPage />} />
          <Route path="/work-orders/:id" element={<WorkOrderDetailPage />} />
          <Route path="/work-orders/:id/edit" element={<WorkOrderFormPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/inventory/parts/new" element={<SparePartFormPage />} />
          <Route path="/inventory/parts/:id/edit" element={<SparePartFormPage />} />
          <Route path="/inventory/purchase-orders" element={<PurchaseOrderPage />} />
          <Route path="/inventory/purchase-orders/new" element={<PurchaseOrderFormPage />} />
          <Route path="/inventory/purchase-orders/:id" element={<PurchaseOrderDetailPage />} />
          <Route path="/inventory/purchase-orders/:id/edit" element={<PurchaseOrderFormPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/users" element={<UserManagementPage />} />
          <Route path="/settings/checklists" element={<InspectionChecklistPage />} />
          <Route path="/settings/notifications" element={<NotificationPreferencesPage />} />
          <Route path="/settings/appearance" element={<AppearancePage />} />
          <Route path="/import" element={<DataImportPage />} />
          <Route path="/audit-logs" element={<AuditLogsPage />} />
          <Route path="/subscription" element={<SubscriptionPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </div>
  );
}

export default App;
