/**
 * Driver Detail Page
 * 
 * Displays detailed information about a single driver including:
 * - Driver information (name, email, phone, license details)
 * - List of all vehicles assigned to this driver
 * - Edit button for authorized users
 * 
 * Requirements: 2.5 - Driver detail view with assigned vehicles
 */

import { useNavigate, useParams, Link } from 'react-router-dom';
import { useDriverWithVehicles } from '../hooks/useDrivers';
import { useAuthStore } from '../stores/authStore';
import { canManageDrivers } from '../utils/authorization';

export default function DriverDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: authUser } = useAuthStore();

  // Check permissions
  const canManage = authUser ? canManageDrivers(authUser.role) : false;

  // Fetch driver with vehicles
  const { data: driver, isLoading, error } = useDriverWithVehicles(id || '');

  const handleBack = () => {
    navigate('/drivers');
  };

  const handleEdit = () => {
    navigate(`/drivers/${id}/edit`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading driver details...</p>
        </div>
      </div>
    );
  }

  if (error || !driver) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="card bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-red-800 dark:text-red-200">
              Error loading driver: {error instanceof Error ? error.message : 'Driver not found'}
            </p>
            <button onClick={handleBack} className="mt-4 btn-primary">
              Back to Drivers
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-soft">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                aria-label="Back to drivers"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {driver.full_name}
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Driver Details
                </p>
              </div>
            </div>
            {canManage && (
              <button onClick={handleEdit} className="btn-primary flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Driver
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Driver Information Card */}
          <div className="lg:col-span-1">
            <div className="card">
              <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-gray-100">
                Driver Information
              </h2>
              <div className="space-y-4">
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Name</span>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {driver.full_name}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Email</span>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {driver.email}
                  </p>
                </div>
                {driver.phone && (
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Phone</span>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {driver.phone}
                    </p>
                  </div>
                )}
                {driver.license_number && (
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">License Number</span>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {driver.license_number}
                    </p>
                  </div>
                )}
                {driver.license_expiry && (
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">License Expiry</span>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {new Date(driver.license_expiry).toLocaleDateString()}
                    </p>
                    {new Date(driver.license_expiry) < new Date() && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                        ⚠️ License expired
                      </p>
                    )}
                  </div>
                )}
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
                  <p className="font-medium">
                    {driver.is_active ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                        Inactive
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Metadata */}
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  Metadata
                </h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Created:</span>
                    <p className="text-gray-900 dark:text-gray-100">
                      {new Date(driver.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Last Updated:</span>
                    <p className="text-gray-900 dark:text-gray-100">
                      {new Date(driver.updated_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Assigned Vehicles Card */}
          <div className="lg:col-span-2">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  Assigned Vehicles ({driver.assigned_vehicles?.length || 0})
                </h2>
              </div>

              {!driver.assigned_vehicles || driver.assigned_vehicles.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <svg 
                    className="mx-auto h-12 w-12 text-gray-400" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" 
                    />
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" 
                    />
                  </svg>
                  <p className="mt-2">No vehicles assigned to this driver yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {driver.assigned_vehicles.map((assignment) => (
                    <Link
                      key={assignment.vehicle_id}
                      to={`/vehicles/${assignment.vehicle_id}`}
                      className="block p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                            {assignment.vehicle.make} {assignment.vehicle.model} ({assignment.vehicle.year})
                          </h3>
                          <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">VIN:</span>
                              <span className="ml-2 text-gray-900 dark:text-gray-100 font-mono">
                                {assignment.vehicle.vin}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Type:</span>
                              <span className="ml-2 text-gray-900 dark:text-gray-100">
                                {assignment.vehicle.vehicle_type}
                              </span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-gray-600 dark:text-gray-400">Assigned:</span>
                              <span className="ml-2 text-gray-900 dark:text-gray-100">
                                {new Date(assignment.assigned_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="ml-4">
                          <svg 
                            className="w-5 h-5 text-gray-400" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                              strokeWidth={2} 
                              d="M9 5l7 7-7 7" 
                            />
                          </svg>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
