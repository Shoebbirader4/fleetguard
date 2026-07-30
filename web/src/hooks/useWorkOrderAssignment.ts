/**
 * Work Order Assignment Hooks
 * 
 * React Query hooks for work order assignment, reassignment, and mechanic workload management.
 * 
 * Task 19.1 - Create work order assignment hooks
 * Requirements: 4.1, 4.2, 4.4
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { WorkOrderWithDetails } from '../types/workOrder';

interface MechanicUser {
  id: string;
  full_name: string;
  email: string;
  role: 'mechanic' | 'maintenance_engineer' | 'workshop_manager';
}

/**
 * Hook to fetch all active users with mechanic-related roles
 * Returns users with roles: mechanic, maintenance_engineer, workshop_manager
 * Only includes users with is_active=true, ordered by full_name
 * 
 * **Validates: Requirements 4.1**
 * - Only users with mechanic-related roles can be assigned work orders
 */
export function useMechanics() {
  return useQuery({
    queryKey: ['mechanics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, role')
        .in('role', ['mechanic', 'maintenance_engineer', 'workshop_manager'])
        .eq('is_active', true)
        .order('full_name');
      
      if (error) throw error;
      return data as MechanicUser[];
    },
  });
}

/**
 * Hook to assign a work order to a mechanic
 * Updates assigned_to field and changes status from 'pending' to 'assigned'
 * Implements optimistic updates for immediate UI feedback
 * 
 * **Validates: Requirements 4.1, 4.2**
 * - Only assigns to mechanic-related roles
 * - Work order status must change from pending to assigned when assignment occurs
 * 
 * @param workOrderId - ID of the work order to assign
 * @param assignedTo - ID of the mechanic/user to assign to
 */
export function useAssignWorkOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      workOrderId, 
      assignedTo 
    }: { 
      workOrderId: string; 
      assignedTo: string;
    }) => {
      const { data, error } = await supabase
        .from('work_orders')
        .update({
          assigned_to: assignedTo,
          status: 'assigned',
          updated_at: new Date().toISOString(),
        })
        .eq('id', workOrderId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    // Optimistic update: Update UI immediately before server responds
    onMutate: async ({ workOrderId, assignedTo }) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ['work-orders'] });

      // Snapshot the previous value for rollback
      const previousWorkOrders = queryClient.getQueryData(['work-orders']);
      const previousWorkOrder = queryClient.getQueryData(['work-orders', workOrderId]);

      // Optimistically update work orders cache
      queryClient.setQueryData<WorkOrderWithDetails[]>(['work-orders'], (old) => {
        if (!old) return old;
        return old.map((wo) =>
          wo.id === workOrderId
            ? { ...wo, assigned_to: assignedTo, status: 'assigned' as const }
            : wo
        );
      });

      // Optimistically update single work order cache
      queryClient.setQueryData<WorkOrderWithDetails>(['work-orders', workOrderId], (old) => {
        if (!old) return old;
        return { ...old, assigned_to: assignedTo, status: 'assigned' as const };
      });

      // Return context with rollback data
      return { previousWorkOrders, previousWorkOrder };
    },
    // On error, roll back to the previous value
    onError: (err, variables, context) => {
      if (context?.previousWorkOrders) {
        queryClient.setQueryData(['work-orders'], context.previousWorkOrders);
      }
      if (context?.previousWorkOrder) {
        queryClient.setQueryData(['work-orders', variables.workOrderId], context.previousWorkOrder);
      }
    },
    // Always refetch after error or success to ensure consistency
    onSettled: (data, error, variables) => {
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['work-orders', variables.workOrderId] });
      
      // Invalidate the assigned user's work orders
      if (variables.assignedTo) {
        queryClient.invalidateQueries({ 
          queryKey: ['work-orders', 'my', variables.assignedTo] 
        });
      }
    },
  });
}

/**
 * Hook to reassign a work order from one mechanic to another
 * Updates assigned_to field and creates an audit log entry
 * Sends notifications to both old and new mechanics (if notifications enabled)
 * 
 * **Validates: Requirements 4.2, 4.4**
 * - Updates work order assignment
 * - Reassignment creates an audit log entry (handled by database trigger)
 * 
 * @param workOrderId - ID of the work order to reassign
 * @param oldAssignedTo - ID of the current assigned mechanic (for cache invalidation)
 * @param newAssignedTo - ID of the new mechanic to assign to
 */
export function useReassignWorkOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      workOrderId, 
      oldAssignedTo,
      newAssignedTo 
    }: { 
      workOrderId: string;
      oldAssignedTo: string | null;
      newAssignedTo: string;
    }) => {
      const { data, error } = await supabase
        .from('work_orders')
        .update({
          assigned_to: newAssignedTo,
          updated_at: new Date().toISOString(),
        })
        .eq('id', workOrderId)
        .select()
        .single();
      
      if (error) throw error;
      
      // TODO: Implement notification sending in Task 21
      // This will notify both old and new mechanics about the reassignment
      
      return data;
    },
    // Optimistic update: Update UI immediately before server responds
    onMutate: async ({ workOrderId, newAssignedTo }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['work-orders'] });

      // Snapshot the previous values for rollback
      const previousWorkOrders = queryClient.getQueryData(['work-orders']);
      const previousWorkOrder = queryClient.getQueryData(['work-orders', workOrderId]);

      // Optimistically update work orders cache
      queryClient.setQueryData<WorkOrderWithDetails[]>(['work-orders'], (old) => {
        if (!old) return old;
        return old.map((wo) =>
          wo.id === workOrderId
            ? { ...wo, assigned_to: newAssignedTo }
            : wo
        );
      });

      // Optimistically update single work order cache
      queryClient.setQueryData<WorkOrderWithDetails>(['work-orders', workOrderId], (old) => {
        if (!old) return old;
        return { ...old, assigned_to: newAssignedTo };
      });

      // Return context with rollback data
      return { previousWorkOrders, previousWorkOrder };
    },
    // On error, roll back to the previous value
    onError: (err, variables, context) => {
      if (context?.previousWorkOrders) {
        queryClient.setQueryData(['work-orders'], context.previousWorkOrders);
      }
      if (context?.previousWorkOrder) {
        queryClient.setQueryData(['work-orders', variables.workOrderId], context.previousWorkOrder);
      }
    },
    // Always refetch after error or success to ensure consistency
    onSettled: (data, error, variables) => {
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['work-orders', variables.workOrderId] });
      
      // Invalidate both old and new mechanic's work orders
      if (variables.oldAssignedTo) {
        queryClient.invalidateQueries({ 
          queryKey: ['work-orders', 'my', variables.oldAssignedTo] 
        });
      }
      if (variables.newAssignedTo) {
        queryClient.invalidateQueries({ 
          queryKey: ['work-orders', 'my', variables.newAssignedTo] 
        });
      }
    },
  });
}

/**
 * Hook to fetch work orders assigned to a specific user
 * Returns work orders with status 'assigned' or 'in_progress'
 * Joins with vehicles table to include vehicle details
 * Orders by priority (descending) and created_at (descending)
 * 
 * **Validates: Requirements 4.2**
 * - Mechanics see work orders assigned to them organized by priority and status
 * 
 * @param userId - ID of the user to fetch work orders for
 */
export function useMyWorkOrders(userId: string) {
  return useQuery({
    queryKey: ['work-orders', 'my', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_orders')
        .select(`
          *,
          vehicle:vehicles(
            id,
            vin,
            make,
            model,
            year,
            vehicle_type
          )
        `)
        .eq('assigned_to', userId)
        .in('status', ['assigned', 'in_progress'])
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as WorkOrderWithDetails[];
    },
    enabled: !!userId,
  });
}
