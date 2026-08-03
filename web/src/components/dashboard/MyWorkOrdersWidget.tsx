/**
 * MyWorkOrdersWidget Component
 * 
 * Displays work orders assigned to the current user.
 * Shows sorted list by priority and created date with quick actions.
 * 
 * Task 23.4 - Create MyWorkOrdersWidget
 * Requirements: 8.3
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ClipboardDocumentCheckIcon, 
  ExclamationTriangleIcon,
  ArrowRightIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { useMyWorkOrders } from '../../hooks/useWorkOrderAssignment';
import { useAuthStore } from '../../stores/authStore';
import LoadingSpinner from '../LoadingSpinner';
import { WORK_ORDER_PRIORITIES } from '../../types/workOrder';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

/**
 * MyWorkOrdersWidget displays work orders assigned to current user
 * 
 * **Validates: Requirements 8.3**
 * - Display work orders assigned to current user
 * - Sort by priority and created date
 * - Show quick actions: View, Mark In Progress
 */
export default function MyWorkOrdersWidget() {
  const user = useAuthStore((state) => state.user);
  const userId = user?.id || '';

  const { data: workOrders, isLoading, error } = useMyWorkOrders(userId);
  const queryClient = useQueryClient();

  const markInProgressMutation = useMutation({
    mutationFn: async (workOrderId: string) => {
      const { error } = await supabase
        .from('work_orders')
        .update({ 
          status: 'in_progress',
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', workOrderId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['work-orders', 'my', userId] });
    },
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
          <p className="text-sm font-normal leading-normal">Failed to load your work orders</p>
          <p className="text-xs font-normal leading-tight text-gray-500 mt-1">
            {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </div>
      </div>
    );
  }

  const workOrdersList = workOrders || [];

  if (workOrdersList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <ClipboardDocumentCheckIcon className="h-12 w-12 text-gray-400 dark:text-gray-600 mb-3" />
        <p className="text-sm font-normal leading-normal text-gray-600 dark:text-gray-400">No work orders assigned</p>
        <p className="text-xs font-normal leading-tight text-gray-500 dark:text-gray-500 mt-1">
          Work orders assigned to you will appear here
        </p>
      </div>
    );
  }

  const getPriorityColor = (priority: string) => {
    const priorityConfig = WORK_ORDER_PRIORITIES.find(p => p.value === priority);
    return priorityConfig?.color || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-3">
      {/* Header with count */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ClipboardDocumentCheckIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {workOrdersList.length} Active {workOrdersList.length === 1 ? 'Order' : 'Orders'}
          </span>
        </div>
        <Link
          to="/work-orders"
          className="text-xs font-normal leading-tight text-blue-600 dark:text-blue-400 hover:underline"
        >
          View All
        </Link>
      </div>

      {/* Work Orders List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {workOrdersList.slice(0, 10).map((wo) => (
          <div
            key={wo.id}
            className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
          >
            {/* Work Order Header */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-normal leading-tight font-mono text-gray-600 dark:text-gray-400">
                    {wo.work_order_number}
                  </span>
                  <span className={`text-xs font-normal leading-tight font-medium px-2 py-0.5 rounded-full ${getPriorityColor(wo.priority)}`}>
                    {wo.priority}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {wo.description}
                </p>
              </div>
            </div>

            {/* Vehicle Info */}
            {wo.vehicle && (
              <div className="mb-2 text-xs font-normal leading-tight text-gray-600 dark:text-gray-400">
                <span className="font-medium">
                  {wo.vehicle.year} {wo.vehicle.make} {wo.vehicle.model}
                </span>
                {' • '}
                <span>{wo.vehicle.vin}</span>
              </div>
            )}

            {/* Status Badge */}
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs font-normal leading-tight px-2 py-1 rounded-full ${
                wo.status === 'assigned' 
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
              }`}>
                {wo.status === 'assigned' ? 'Assigned' : 'In Progress'}
              </span>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 mt-3">
              <Link
                to={`/work-orders/${wo.id}`}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-normal leading-tight font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-md transition-colors"
              >
                View
                <ArrowRightIcon className="h-3 w-3" />
              </Link>
              
              {wo.status === 'assigned' && (
                <button
                  onClick={() => markInProgressMutation.mutate(wo.id)}
                  disabled={markInProgressMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-normal leading-tight font-medium text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircleIcon className="h-3 w-3" />
                  Start Work
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {workOrdersList.length > 10 && (
        <div className="mt-3 text-center">
          <Link
            to="/work-orders"
            className="text-xs font-normal leading-tight text-blue-600 dark:text-blue-400 hover:underline"
          >
            View all {workOrdersList.length} work orders
          </Link>
        </div>
      )}
    </div>
  );
}
