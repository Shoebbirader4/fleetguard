/**
 * DriversPage Component
 * 
 * Displays a list of all drivers with search, filter, and sorting capabilities.
 * Allows authorized users to add new drivers via invitation modal.
 * 
 * Task 13.1 - Create DriversPage component
 * Requirements: 2.1, 2.4
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDrivers } from '../hooks/useDrivers';
import { useAuthStore } from '../stores/authStore';
import { canManageDrivers } from '../utils/authorization';
import type { Driver } from '../types/driver';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import InviteUserModal from '../components/InviteUserModal';
import { toast } from '../components/ToastContainer';

export default function DriversPage() {
  const navigate = useNavigate();
  const authUser = useAuthStore((state) => state.user);
  const { data: drivers, isLoading, error } = useDrivers();
  
  // State for search
  const [searchQuery, setSearchQuery] = useState('');
  
  // State for invite modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  
  // Check permissions
  const canManage = authUser ? canManageDrivers(authUser.role) : false;
  
  // Filter and search drivers
  const filteredDrivers = useMemo(() => {
    if (!drivers) return [];
    
    return drivers.filter((driver) => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery ||
        driver.full_name.toLowerCase().includes(searchLower) ||
        driver.email.toLowerCase().includes(searchLower) ||
        (driver.phone && driver.phone.toLowerCase().includes(searchLower));
      
      return matchesSearch;
    });
  }, [drivers, searchQuery]);

  // Get count of assigned vehicles for a driver
  const getAssignedVehiclesCount = (driver: Driver): number => {
    return driver.assigned_vehicles?.length || 0;
  };

  return (
    <Layout>
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-soft border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Drivers
            </h1>
            {canManage && (
              <div className="flex gap-2">
                <button
                  onClick={() => navigate('/drivers/new')}
                  className="btn-primary flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Driver
                </button>
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="btn-secondary flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Invite Driver
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Search */}
        <div className="card mb-6">
          <div className="max-w-md">
            <label className="label">Search</label>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field"
            />
          </div>

          {/* Results Summary */}
          {drivers && (
            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              Showing {filteredDrivers.length} of {drivers.length} drivers
            </div>
          )}
        </div>

        {/* Driver Table */}
        {isLoading ? (
          <div className="card text-center py-12">
            <LoadingSpinner size="lg" className="mx-auto" />
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading drivers...</p>
          </div>
        ) : error ? (
          <div className="card bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-red-800 dark:text-red-200">
              Error loading drivers: {error instanceof Error ? error.message : 'Unknown error'}
            </p>
          </div>
        ) : filteredDrivers.length === 0 ? (
          <div className="card text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-gray-100">
              No drivers found
            </h3>
            <p className="mt-1 text-gray-500 dark:text-gray-400">
              {searchQuery
                ? 'Try adjusting your search'
                : 'Get started by adding your first driver'}
            </p>
            {canManage && !searchQuery && (
              <div className="mt-4 flex gap-2 justify-center">
                <button
                  onClick={() => navigate('/drivers/new')}
                  className="btn-primary"
                >
                  Create Driver
                </button>
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="btn-secondary"
                >
                  Invite Driver
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      Name
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      Email
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      Phone
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      License Number
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      Assigned Vehicles
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredDrivers.map((driver) => (
                    <tr key={driver.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {driver.full_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {driver.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {driver.phone || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {driver.license_number || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {getAssignedVehiclesCount(driver)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => navigate(`/drivers/${driver.id}`)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          title="View details"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Invite User Modal - Pre-set to driver role */}
      <InviteUserModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        defaultRole="driver"
        onSuccess={() => {
          toast.success('Driver invited successfully!');
        }}
      />
    </Layout>
  );
}
