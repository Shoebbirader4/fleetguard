/**
 * DriverAssignmentsWidget Component
 * 
 * Displays driver assignments for fleet managers.
 * Shows assigned vehicles, unassigned vehicles, and driver utilization.
 * 
 * Task 23.6 - Create additional role-specific widgets (Driver Assignments for fleet managers)
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  UserGroupIcon,
  TruckIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import LoadingSpinner from '../LoadingSpinner';

interface DriverAssignment {
  driverId: string;
  driverName: string;
  driverEmail: string;
  vehicleId: string;
  vehicleInfo: string;
  vehicleStatus: string;
  assignedRoute?: string;
}

interface AssignmentStats {
  totalDrivers: number;
  assignedDrivers: number;
  unassignedDrivers: number;
  totalVehicles: number;
  assignedVehicles: number;
  unassignedVehicles: number;
  recentAssignments: DriverAssignment[];
}

/**
 * DriverAssignmentsWidget displays driver assignment overview
 * 
 * **Validates: Requirements 8.1, 8.2**
 * - Display driver assignment statistics for fleet managers
 * - Show assigned and unassigned counts
 * - Provide quick access to driver and vehicle management
 */
export default function DriverAssignmentsWidget() {
  const user = useAuthStore((state) => state.user);
  const tenantId = user?.tenantId || '';

  const { data: stats, isLoading, error } = useQuery<AssignmentStats>({
    queryKey: ['driver-assignments', tenantId],
    queryFn: async () => {
      // Fetch all drivers (users with driver role)
      const { data: drivers, error: driversError } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('tenant_id', tenantId)
        .eq('role', 'driver')
        .eq('is_active', true);
      
      if (driversError) throw driversError;

      // Fetch all vehicles with driver assignments
      const { data: vehicles, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('id, vin, make, model, year, vehicle_type, status, assigned_driver_id, assigned_route')
        .eq('tenant_id', tenantId)
        .in('status', ['active', 'maintenance']);
      
      if (vehiclesError) throw vehiclesError;

      // Calculate assignments
      const totalDrivers = drivers?.length || 0;
      const totalVehicles = vehicles?.length || 0;
      
      const assignedVehicles = (vehicles || []).filter(v => v.assigned_driver_id);
      const unassignedVehicles = totalVehicles - assignedVehicles.length;
      
      // Get unique assigned drivers
      const assignedDriverIds = new Set(
        assignedVehicles.map(v => v.assigned_driver_id).filter(Boolean)
      );
      const assignedDrivers = assignedDriverIds.size;
      const unassignedDrivers = totalDrivers - assignedDrivers;

      // Build recent assignments list
      const recentAssignments: DriverAssignment[] = assignedVehicles
        .slice(0, 5)
        .map((vehicle) => {
          const driver = drivers?.find(d => d.id === vehicle.assigned_driver_id);
          return {
            driverId: vehicle.assigned_driver_id!,
            driverName: driver?.full_name || 'Unknown Driver',
            driverEmail: driver?.email || '',
            vehicleId: vehicle.id,
            vehicleInfo: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
            vehicleStatus: vehicle.status,
            assignedRoute: vehicle.assigned_route,
          };
        });

      return {
        totalDrivers,
        assignedDrivers,
        unassignedDrivers,
        totalVehicles,
        assignedVehicles: assignedVehicles.length,
        unassignedVehicles,
        recentAssignments,
      };
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    // Auto-refresh every 5 minutes (Requirement 8.4)
    refetchInterval: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-4 text-center">
        <div className="text-red-600 dark:text-red-400">
          <ExclamationTriangleIcon className="h-8 w-8 mx-auto mb-2" />
          <p className="text-sm font-normal leading-normal">Failed to load driver assignments</p>
          <p className="text-xs font-normal leading-tight text-gray-500 mt-1">
            {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </div>
      </div>
    );
  }

  const hasUnassigned = (stats?.unassignedDrivers || 0) > 0 || (stats?.unassignedVehicles || 0) > 0;
  const driverUtilization = stats?.totalDrivers && stats.totalDrivers > 0
    ? Math.round((stats.assignedDrivers / stats.totalDrivers) * 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Drivers Summary */}
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
          <div className="flex items-center gap-2 mb-2">
            <UserGroupIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-normal leading-tight text-blue-600 dark:text-blue-400 font-medium">Drivers</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats?.assignedDrivers || 0} / {stats?.totalDrivers || 0}
          </p>
          <p className="text-xs font-normal leading-tight text-gray-600 dark:text-gray-400 mt-1">
            {driverUtilization}% utilization
          </p>
        </div>

        {/* Vehicles Summary */}
        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800">
          <div className="flex items-center gap-2 mb-2">
            <TruckIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span className="text-xs font-normal leading-tight text-green-600 dark:text-green-400 font-medium">Vehicles</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats?.assignedVehicles || 0} / {stats?.totalVehicles || 0}
          </p>
          <p className="text-xs font-normal leading-tight text-gray-600 dark:text-gray-400 mt-1">
            Assigned
          </p>
        </div>
      </div>

      {/* Unassigned Alert */}
      {hasUnassigned && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-start gap-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-900 dark:text-yellow-200">
                Unassigned Items
              </p>
              <div className="text-xs font-normal leading-tight text-yellow-700 dark:text-yellow-300 mt-1 space-y-1">
                {stats?.unassignedDrivers !== undefined && stats.unassignedDrivers > 0 && (
                  <p>• {stats.unassignedDrivers} {stats.unassignedDrivers === 1 ? 'driver has' : 'drivers have'} no vehicle assigned</p>
                )}
                {stats?.unassignedVehicles !== undefined && stats.unassignedVehicles > 0 && (
                  <p>• {stats.unassignedVehicles} {stats.unassignedVehicles === 1 ? 'vehicle has' : 'vehicles have'} no driver assigned</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Assignments */}
      {stats?.recentAssignments && stats.recentAssignments.length > 0 ? (
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Recent Assignments
          </h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {stats.recentAssignments.map((assignment, index) => (
              <div
                key={`${assignment.driverId}-${assignment.vehicleId}-${index}`}
                className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
              >
                {/* Driver Info */}
                <div className="flex items-start gap-2 mb-2">
                  <UserGroupIcon className="h-4 w-4 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {assignment.driverName}
                    </p>
                    <p className="text-xs font-normal leading-tight text-gray-600 dark:text-gray-400 truncate">
                      {assignment.driverEmail}
                    </p>
                  </div>
                </div>

                {/* Vehicle Info */}
                <div className="flex items-start gap-2 mb-2">
                  <TruckIcon className="h-4 w-4 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-normal leading-normal text-gray-900 dark:text-white truncate">
                      {assignment.vehicleInfo}
                    </p>
                    {assignment.assignedRoute && (
                      <p className="text-xs font-normal leading-tight text-gray-600 dark:text-gray-400 truncate">
                        Route: {assignment.assignedRoute}
                      </p>
                    )}
                  </div>
                  <span
                    className={`text-xs font-normal leading-tight px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                      assignment.vehicleStatus === 'active'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                        : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
                    }`}
                  >
                    {assignment.vehicleStatus}
                  </span>
                </div>

                {/* Quick Actions */}
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                  <Link
                    to={`/drivers/${assignment.driverId}`}
                    className="text-xs font-normal leading-tight text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    View Driver
                  </Link>
                  <span className="text-gray-300 dark:text-gray-600">•</span>
                  <Link
                    to={`/vehicles/${assignment.vehicleId}`}
                    className="text-xs font-normal leading-tight text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    View Vehicle
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-6 text-center">
          <CheckCircleIcon className="h-12 w-12 text-gray-400 dark:text-gray-600 mb-3" />
          <p className="text-sm font-normal leading-normal text-gray-600 dark:text-gray-400">
            No driver assignments yet
          </p>
          <p className="text-xs font-normal leading-tight text-gray-500 dark:text-gray-500 mt-1">
            Start assigning drivers to vehicles
          </p>
        </div>
      )}

      {/* Quick Actions */}
      <div className="pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Link
            to="/drivers"
            className="flex items-center justify-center gap-1 px-3 py-2 text-xs font-normal leading-tight font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
          >
            <UserGroupIcon className="h-4 w-4" />
            Drivers
          </Link>
          <Link
            to="/vehicles"
            className="flex items-center justify-center gap-1 px-3 py-2 text-xs font-normal leading-tight font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50 rounded-lg transition-colors"
          >
            <TruckIcon className="h-4 w-4" />
            Vehicles
          </Link>
        </div>
        {hasUnassigned && (
          <Link
            to="/vehicles"
            className="flex items-center justify-center gap-2 w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 rounded-lg transition-colors"
          >
            Assign Now
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        )}
      </div>
    </div>
  );
}
