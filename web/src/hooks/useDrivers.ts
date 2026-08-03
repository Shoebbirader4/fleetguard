/**
 * Driver Management Hooks
 * 
 * React Query hooks for fetching and managing driver data and vehicle assignments.
 * 
 * Task 12.1 - Driver management hooks with optimistic updates
 * Requirements: 2.1, 2.2, 2.3, 2.5
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { toast } from '../components/ToastContainer';
import type { Driver } from '../types/driver';
import type { VehicleWithDriver } from '../types/vehicle';

/**
 * Hook to fetch all active drivers
 * Returns drivers ordered by full_name
 * Only includes users with role='driver' and is_active=true
 * Includes count of assigned vehicles for each driver
 * 
 * **Validates: Requirements 2.1**
 */
export function useDrivers() {
  return useQuery({
    queryKey: ['drivers'],
    queryFn: async () => {
      // Fetch all active drivers
      const { data: drivers, error: driversError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'driver')
        .eq('is_active', true)
        .order('full_name');
      
      if (driversError) throw driversError;
      
      // For each driver, fetch their assigned vehicles count
      const driversWithVehicles = await Promise.all(
        drivers.map(async (driver) => {
          const { data: vehicles, error: vehiclesError } = await supabase
            .from('vehicles')
            .select('id, vin, make, model, year, vehicle_type, updated_at')
            .eq('assigned_driver_id', driver.id);
          
          if (vehiclesError) {
            console.error('Error fetching vehicles for driver:', driver.id, vehiclesError);
            return {
              ...driver,
              assigned_vehicles: [],
            };
          }
          
          return {
            ...driver,
            assigned_vehicles: vehicles.map(vehicle => ({
              vehicle_id: vehicle.id,
              vehicle: {
                id: vehicle.id,
                vin: vehicle.vin,
                make: vehicle.make,
                model: vehicle.model,
                year: vehicle.year,
                vehicle_type: vehicle.vehicle_type,
              },
              assigned_at: vehicle.updated_at,
            })),
          } as Driver;
        })
      );
      
      return driversWithVehicles;
    },
  });
}

/**
 * Hook to fetch a single driver with their assigned vehicles
 * Joins with vehicles table to get all vehicles assigned to this driver
 * 
 * @param driverId - Driver ID to fetch
 * 
 * **Validates: Requirements 2.2, 2.3**
 */
export function useDriverWithVehicles(driverId: string) {
  return useQuery({
    queryKey: ['drivers', driverId, 'vehicles'],
    queryFn: async () => {
      // First, fetch the driver
      const { data: driver, error: driverError } = await supabase
        .from('users')
        .select('*')
        .eq('id', driverId)
        .eq('role', 'driver')
        .single();
      
      if (driverError) throw driverError;

      // Then fetch assigned vehicles
      const { data: vehicles, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('*')
        .eq('assigned_driver_id', driverId)
        .order('make');
      
      if (vehiclesError) throw vehiclesError;

      // Return driver with vehicles
      return {
        ...driver,
        assigned_vehicles: vehicles.map(vehicle => ({
          vehicle_id: vehicle.id,
          vehicle: {
            id: vehicle.id,
            vin: vehicle.vin,
            make: vehicle.make,
            model: vehicle.model,
            year: vehicle.year,
            vehicle_type: vehicle.vehicle_type,
          },
          assigned_at: vehicle.updated_at,
        })),
      } as Driver;
    },
    enabled: !!driverId,
  });
}

/**
 * Hook to assign or unassign a driver to a vehicle
 * Implements optimistic updates for immediate UI feedback
 * Rolls back on error
 * 
 * **Validates: Requirements 2.3, 2.5**
 * - Optimistic updates for immediate UI response
 * - Automatic cache invalidation
 */
export function useAssignDriverToVehicle() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      vehicleId, 
      driverId 
    }: { 
      vehicleId: string; 
      driverId: string | null;
    }) => {
      const { data, error } = await supabase
        .from('vehicles')
        .update({ 
          assigned_driver_id: driverId,
          updated_at: new Date().toISOString() 
        })
        .eq('id', vehicleId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    // Optimistic update: Update UI immediately before server responds
    onMutate: async ({ vehicleId, driverId }) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ['vehicles'] });
      await queryClient.cancelQueries({ queryKey: ['drivers'] });

      // Snapshot the previous value for rollback
      const previousVehicles = queryClient.getQueryData(['vehicles']);
      const previousDriverVehicles = driverId 
        ? queryClient.getQueryData(['drivers', driverId, 'vehicles'])
        : null;

      // Optimistically update vehicles cache
      queryClient.setQueryData<VehicleWithDriver[]>(['vehicles'], (old) => {
        if (!old) return old;
        return old.map((vehicle) =>
          vehicle.id === vehicleId
            ? { ...vehicle, assigned_driver_id: driverId ?? undefined }
            : vehicle
        );
      });

      // Return context with rollback data
      return { previousVehicles, previousDriverVehicles };
    },
    // On error, roll back to the previous value
    onError: (err, variables, context) => {
      if (context?.previousVehicles) {
        queryClient.setQueryData(['vehicles'], context.previousVehicles);
      }
      if (context?.previousDriverVehicles) {
        queryClient.setQueryData(
          ['drivers', variables.driverId, 'vehicles'],
          context.previousDriverVehicles
        );
      }
      
      // Show error toast
      toast.error(`Failed to assign driver: ${err.message}`);
    },
    // Always refetch after error or success to ensure consistency
    onSettled: (data, error, variables) => {
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      
      // If a driver was assigned, invalidate their specific vehicles query
      if (variables.driverId) {
        queryClient.invalidateQueries({ 
          queryKey: ['drivers', variables.driverId, 'vehicles'] 
        });
      }
      
      // Show success toast only if no error occurred
      if (!error) {
        toast.success(
          variables.driverId 
            ? 'Driver assigned successfully' 
            : 'Driver unassigned successfully'
        );
      }
    },
  });
}
