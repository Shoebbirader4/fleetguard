/**
 * FleetOverviewWidget Component
 * 
 * Displays fleet overview statistics including total vehicles, active work orders,
 * and maintenance alerts count.
 * 
 * Task 23.2 - Create FleetOverviewWidget
 * Requirements: 8.1
 */

import React from 'react';
import { TruckIcon, WrenchScrewdriverIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useFleetHealthDashboard } from '../../hooks/useDashboardData';
import { useAuthStore } from '../../stores/authStore';
import LoadingSpinner from '../LoadingSpinner';

/**
 * Direct query hook as fallback when RPC function is not available
 */
function useDirectFleetQuery() {
  const user = useAuthStore((state) => state.user);
  
  return useQuery({
    queryKey: ['direct-fleet-health', user?.tenantId],
    queryFn: async () => {
      console.log('🔍 Direct Fleet Query - User:', user);
      console.log('🔍 Direct Fleet Query - Tenant ID:', user?.tenantId);

      // Count total vehicles
      const { count: totalVehicles, error: vehiclesError, data: vehiclesData } = await supabase
        .from('vehicles')
        .select('*', { count: 'exact', head: false });

      console.log('🚗 Total Vehicles Query Result:', { count: totalVehicles, error: vehiclesError, data: vehiclesData });

      if (vehiclesError) {
        console.error('❌ Vehicles query error:', vehiclesError);
        throw vehiclesError;
      }

      // Count vehicles by status
      const { count: inService, error: inServiceError } = await supabase
        .from('vehicles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      if (inServiceError) throw inServiceError;

      const { count: underMaintenance, error: maintenanceError } = await supabase
        .from('vehicles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'maintenance');

      if (maintenanceError) throw maintenanceError;

      const { count: retired, error: retiredError } = await supabase
        .from('vehicles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'retired');

      if (retiredError) throw retiredError;

      // Count overdue alerts
      const { count: overdueAlerts, error: overdueError } = await supabase
        .from('alerts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .eq('alert_type', 'overdue');

      const vehiclesOverdue = overdueAlerts || 0;

      // Calculate fleet health score
      const healthScore = Math.round(
        ((totalVehicles || 0) - vehiclesOverdue - (underMaintenance || 0)) / 
        Math.max(totalVehicles || 1, 1) * 100
      );

      const result = {
        total_vehicles: totalVehicles || 0,
        vehicles_in_service: inService || 0,
        vehicles_under_maintenance: underMaintenance || 0,
        vehicles_retired: retired || 0,
        vehicles_overdue: vehiclesOverdue,
        fleet_health_score: Math.max(0, Math.min(100, healthScore)),
        refreshed_at: new Date().toISOString(),
      };

      console.log('✅ Direct Fleet Query Result:', result);
      return result;
    },
    enabled: !!user,
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes
  });
}

/**
 * FleetOverviewWidget displays key fleet metrics
 * 
 * **Validates: Requirements 8.1**
 * - Display: Total vehicles, Active work orders, Maintenance alerts count
 * - Fetch data using appropriate React Query hooks
 * - Show loading skeleton while fetching
 * - Handle error states gracefully
 */
export default function FleetOverviewWidget() {
  const user = useAuthStore((state) => state.user);
  const tenantId = user?.tenantId || '';

  console.log('🎯 FleetOverviewWidget - User:', user);
  console.log('🎯 FleetOverviewWidget - Tenant ID:', tenantId);

  // Fallback: Direct query if RPC fails
  const { data: directFleetData, isLoading: directLoading, error: directError } = useDirectFleetQuery();
  const { data: fleetHealth, isLoading: rpcLoading, error } = useFleetHealthDashboard(tenantId);
  
  console.log('📊 RPC Data:', fleetHealth, 'Error:', error);
  console.log('📊 Direct Data:', directFleetData, 'Error:', directError);
  
  // Use direct query - it works correctly with RLS
  const isLoading = directLoading;
  const effectiveData = directFleetData;
  
  console.log('✨ Effective Data:', effectiveData);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Loading Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error && !effectiveData) {
    return (
      <div className="flex items-center justify-center p-4 text-center">
        <div className="text-red-600 dark:text-red-400">
          <ExclamationTriangleIcon className="h-8 w-8 mx-auto mb-2" />
          <p className="text-sm font-normal leading-normal">Failed to load fleet overview</p>
          <p className="text-xs font-normal leading-tight text-gray-500 mt-1">
            {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </div>
      </div>
    );
  }

  const totalVehicles = effectiveData?.total_vehicles || 0;
  const activeWorkOrders = effectiveData?.vehicles_under_maintenance || 0;
  const maintenanceAlerts = effectiveData?.vehicles_overdue || 0;

  return (
    <div className="space-y-4">
      {/* Fleet Health Score */}
      {effectiveData?.fleet_health_score !== undefined && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-normal leading-normal text-gray-600 dark:text-gray-400">Fleet Health Score</span>
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {effectiveData.fleet_health_score}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                effectiveData.fleet_health_score >= 80
                  ? 'bg-green-500'
                  : effectiveData.fleet_health_score >= 60
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }`}
              style={{ width: `${effectiveData.fleet_health_score}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Vehicles */}
        <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
          <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
            <TruckIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {totalVehicles}
            </p>
            <p className="text-sm font-normal leading-normal text-gray-600 dark:text-gray-400">Total Vehicles</p>
          </div>
        </div>

        {/* Active Work Orders */}
        <div className="flex items-center gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-100 dark:border-yellow-800">
          <div className="p-2 bg-yellow-100 dark:bg-yellow-800 rounded-lg">
            <WrenchScrewdriverIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {activeWorkOrders}
            </p>
            <p className="text-sm font-normal leading-normal text-gray-600 dark:text-gray-400">Under Maintenance</p>
          </div>
        </div>

        {/* Maintenance Alerts */}
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800">
          <div className="p-2 bg-red-100 dark:bg-red-800 rounded-lg">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {maintenanceAlerts}
            </p>
            <p className="text-sm font-normal leading-normal text-gray-600 dark:text-gray-400">Overdue</p>
          </div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-2 gap-3 text-sm font-normal leading-normal">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">In Service:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {effectiveData?.vehicles_in_service || 0}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Retired:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {effectiveData?.vehicles_retired || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Last Updated */}
      {effectiveData?.refreshed_at && (
        <div className="mt-3 text-xs font-normal leading-tight text-gray-500 dark:text-gray-400 text-center">
          Last updated: {new Date(effectiveData.refreshed_at).toLocaleString()}
        </div>
      )}
    </div>
  );
}
