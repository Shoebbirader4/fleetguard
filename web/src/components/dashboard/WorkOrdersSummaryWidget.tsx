/**
 * WorkOrdersSummaryWidget Component
 * 
 * Displays work orders summary with breakdown by status and priority.
 * Uses visual representation to show distribution.
 * 
 * Task 23.3 - Create WorkOrdersSummaryWidget
 * Requirements: 8.1
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  ClipboardDocumentListIcon, 
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import LoadingSpinner from '../LoadingSpinner';
import { WORK_ORDER_STATUSES, WORK_ORDER_PRIORITIES } from '../../types/workOrder';

interface WorkOrderStats {
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
}

/**
 * WorkOrdersSummaryWidget displays work order statistics
 * 
 * **Validates: Requirements 8.1**
 * - Display: Total work orders, By status breakdown, By priority breakdown
 * - Use chart or visual representation
 */
export default function WorkOrdersSummaryWidget() {
  const user = useAuthStore((state) => state.user);
  const tenantId = user?.tenantId || '';

  const { data: stats, isLoading, error } = useQuery<WorkOrderStats>({
    queryKey: ['work-orders-summary', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_orders')
        .select('status, priority')
        .eq('tenant_id', tenantId);
      
      if (error) throw error;

      const byStatus: Record<string, number> = {
        pending: 0,
        assigned: 0,
        in_progress: 0,
        completed: 0,
        cancelled: 0,
      };

      const byPriority: Record<string, number> = {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0,
      };

      data.forEach((wo) => {
        byStatus[wo.status] = (byStatus[wo.status] || 0) + 1;
        byPriority[wo.priority] = (byPriority[wo.priority] || 0) + 1;
      });

      return {
        total: data.length,
        byStatus,
        byPriority,
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
          <p className="text-sm font-normal leading-normal">Failed to load work orders summary</p>
          <p className="text-xs font-normal leading-tight text-gray-500 mt-1">
            {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </div>
      </div>
    );
  }

  const total = stats?.total || 0;
  const activeCount = (stats?.byStatus.assigned || 0) + (stats?.byStatus.in_progress || 0);

  return (
    <div className="space-y-6">
      {/* Total Work Orders */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <ClipboardDocumentListIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{total}</p>
            <p className="text-sm font-normal leading-normal text-gray-600 dark:text-gray-400">Total Work Orders</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{activeCount}</p>
          <p className="text-xs font-normal leading-tight text-gray-600 dark:text-gray-400">Active</p>
        </div>
      </div>

      {/* Status Breakdown */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">By Status</h4>
        <div className="space-y-2">
          {WORK_ORDER_STATUSES.map((status) => {
            const count = stats?.byStatus[status.value] || 0;
            const percentage = total > 0 ? (count / total) * 100 : 0;
            
            return (
              <div key={status.value}>
                <div className="flex items-center justify-between text-sm font-normal leading-normal mb-1">
                  <span className="text-gray-600 dark:text-gray-400">{status.label}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{count}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      status.value === 'completed' ? 'bg-green-500' :
                      status.value === 'in_progress' ? 'bg-yellow-500' :
                      status.value === 'assigned' ? 'bg-blue-500' :
                      status.value === 'cancelled' ? 'bg-red-500' :
                      'bg-gray-400'
                    }`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Priority Breakdown */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">By Priority</h4>
        <div className="grid grid-cols-2 gap-3">
          {WORK_ORDER_PRIORITIES.map((priority) => {
            const count = stats?.byPriority[priority.value] || 0;
            
            return (
              <div
                key={priority.value}
                className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-normal leading-tight font-medium px-2 py-0.5 rounded-full ${priority.color}`}>
                    {priority.label}
                  </span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">{count}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
