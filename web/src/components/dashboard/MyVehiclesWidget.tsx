/**
 * MyVehiclesWidget Component
 * 
 * Displays vehicles assigned to the current driver.
 * Shows vehicle details, status, and quick actions.
 * 
 * Task 23.6 - Create additional role-specific widgets (My Vehicles for drivers)
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  TruckIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import LoadingSpinner from '../LoadingSpinner';
import type { VehicleWithDriver } from '../../types/vehicle';

/**
 * MyVehiclesWidget displays vehicles assigned to current driver
 * 
 * **Validates: Requirements 8.3, 8.4**
 * - Display vehicles assigned to the current driver
 * - Show vehicle status and details
 * - Provide quick access to vehicle details
 */
export default function MyVehiclesWidget() {
  const user = useAuthStore((state) => state.user);
  const userId = user?.id || '';

  const { data: vehicles, isLoading, error } = useQuery<VehicleWithDriver[]>({
    queryKey: ['my-vehicles', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('assigned_driver_id', userId)
        .order('make')
        .order('model');
      
      if (error) throw error;
      return data as VehicleWithDriver[];
    },
    enabled: !!userId,
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
          <p className="text-sm font-normal leading-normal">Failed to load your vehicles</p>
          <p className="text-xs font-normal leading-tight text-gray-500 mt-1">
            {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </div>
      </div>
    );
  }

  const vehiclesList = vehicles || [];

  if (vehiclesList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <TruckIcon className="h-12 w-12 text-gray-400 dark:text-gray-600 mb-3" />
        <p className="text-sm font-normal leading-normal text-gray-600 dark:text-gray-400">No vehicles assigned</p>
        <p className="text-xs font-normal leading-tight text-gray-500 dark:text-gray-500 mt-1">
          Contact your fleet manager to get a vehicle assigned
        </p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'maintenance':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'retired':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'maintenance':
        return 'Maintenance';
      case 'retired':
        return 'Retired';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TruckIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {vehiclesList.length} {vehiclesList.length === 1 ? 'Vehicle' : 'Vehicles'} Assigned
          </span>
        </div>
        <Link
          to="/vehicles"
          className="text-xs font-normal leading-tight text-blue-600 dark:text-blue-400 hover:underline"
        >
          View All
        </Link>
      </div>

      {/* Vehicles List */}
      <div className="space-y-2">
        {vehiclesList.map((vehicle) => (
          <div
            key={vehicle.id}
            className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
          >
            {/* Vehicle Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <h4 className="text-base font-normal leading-normal font-semibold text-gray-900 dark:text-white truncate">
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </h4>
                <p className="text-xs font-normal leading-tight text-gray-600 dark:text-gray-400 mt-1">
                  VIN: {vehicle.vin}
                </p>
              </div>
              <span className={`text-xs font-normal leading-tight px-2 py-1 rounded-full font-medium flex-shrink-0 ml-2 ${getStatusColor(vehicle.status)}`}>
                {getStatusLabel(vehicle.status)}
              </span>
            </div>

            {/* Vehicle Details */}
            <div className="grid grid-cols-2 gap-2 mb-3 text-xs font-normal leading-tight">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Type:</span>
                <span className="ml-1 text-gray-900 dark:text-white font-medium">
                  {vehicle.vehicle_type}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Odometer:</span>
                <span className="ml-1 text-gray-900 dark:text-white font-medium">
                  {vehicle.current_odometer.toLocaleString()} {vehicle.unit}
                </span>
              </div>
              {vehicle.assigned_route && (
                <div className="col-span-2">
                  <span className="text-gray-500 dark:text-gray-400">Route:</span>
                  <span className="ml-1 text-gray-900 dark:text-white font-medium">
                    {vehicle.assigned_route}
                  </span>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <Link
                to={`/vehicles/${vehicle.id}`}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-normal leading-tight font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-md transition-colors"
              >
                View Details
                <ArrowRightIcon className="h-3 w-3" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
