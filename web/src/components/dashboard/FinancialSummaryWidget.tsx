/**
 * FinancialSummaryWidget Component
 * 
 * Displays financial summary for accountants and company owners.
 * Shows total costs, spending trends, and budget information.
 * 
 * Task 23.6 - Create additional role-specific widgets (Financial Summary)
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import LoadingSpinner from '../LoadingSpinner';

interface FinancialStats {
  totalCosts: number;
  workOrderCosts: number;
  purchaseOrderCosts: number;
  monthlySpend: number;
  previousMonthSpend: number;
}

/**
 * FinancialSummaryWidget displays financial overview
 * 
 * **Validates: Requirements 8.1, 8.2**
 * - Display financial metrics relevant to accountants and company owners
 * - Show spending trends and cost breakdown
 */
export default function FinancialSummaryWidget() {
  const user = useAuthStore((state) => state.user);
  const tenantId = user?.tenantId || '';

  const { data: stats, isLoading, error } = useQuery<FinancialStats>({
    queryKey: ['financial-summary', tenantId],
    queryFn: async () => {
      // Fetch work order costs
      const { data: workOrders, error: woError } = await supabase
        .from('work_orders')
        .select('total_cost, created_at')
        .eq('tenant_id', tenantId)
        .not('total_cost', 'is', null);
      
      if (woError) throw woError;

      // Fetch purchase order costs
      const { data: purchaseOrders, error: poError } = await supabase
        .from('purchase_orders')
        .select('total_cost, created_at')
        .eq('tenant_id', tenantId)
        .not('total_cost', 'is', null);
      
      if (poError) throw poError;

      // Calculate totals
      const workOrderCosts = (workOrders || []).reduce((sum, wo) => sum + (wo.total_cost || 0), 0);
      const purchaseOrderCosts = (purchaseOrders || []).reduce((sum, po) => sum + (po.total_cost || 0), 0);
      const totalCosts = workOrderCosts + purchaseOrderCosts;

      // Calculate monthly spend
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      const monthlySpend = (workOrders || [])
        .filter(wo => new Date(wo.created_at) >= currentMonthStart)
        .reduce((sum, wo) => sum + (wo.total_cost || 0), 0) +
        (purchaseOrders || [])
        .filter(po => new Date(po.created_at) >= currentMonthStart)
        .reduce((sum, po) => sum + (po.total_cost || 0), 0);

      const previousMonthSpend = (workOrders || [])
        .filter(wo => {
          const date = new Date(wo.created_at);
          return date >= previousMonthStart && date <= previousMonthEnd;
        })
        .reduce((sum, wo) => sum + (wo.total_cost || 0), 0) +
        (purchaseOrders || [])
        .filter(po => {
          const date = new Date(po.created_at);
          return date >= previousMonthStart && date <= previousMonthEnd;
        })
        .reduce((sum, po) => sum + (po.total_cost || 0), 0);

      return {
        totalCosts,
        workOrderCosts,
        purchaseOrderCosts,
        monthlySpend,
        previousMonthSpend,
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
          <p className="text-sm font-normal leading-normal">Failed to load financial summary</p>
          <p className="text-xs font-normal leading-tight text-gray-500 mt-1">
            {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </div>
      </div>
    );
  }

  // Calculate trend
  const spendChange = stats ? stats.monthlySpend - stats.previousMonthSpend : 0;
  const spendChangePercent = stats?.previousMonthSpend 
    ? ((spendChange / stats.previousMonthSpend) * 100)
    : 0;
  const isIncreasing = spendChange > 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-4">
      {/* Total Costs */}
      <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
        <div className="p-3 bg-blue-100 dark:bg-blue-800 rounded-lg">
          <CurrencyDollarIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(stats?.totalCosts || 0)}
          </p>
          <p className="text-sm font-normal leading-normal text-gray-600 dark:text-gray-400">Total Costs (All Time)</p>
        </div>
      </div>

      {/* Monthly Spend with Trend */}
      <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            This Month
          </span>
          {stats?.previousMonthSpend !== undefined && stats.previousMonthSpend > 0 && (
            <div className={`flex items-center gap-1 text-xs font-normal leading-tight font-medium ${
              isIncreasing 
                ? 'text-red-600 dark:text-red-400' 
                : 'text-green-600 dark:text-green-400'
            }`}>
              {isIncreasing ? (
                <ArrowTrendingUpIcon className="h-4 w-4" />
              ) : (
                <ArrowTrendingDownIcon className="h-4 w-4" />
              )}
              {Math.abs(spendChangePercent).toFixed(1)}%
            </div>
          )}
        </div>
        <p className="text-xl font-bold text-gray-900 dark:text-white">
          {formatCurrency(stats?.monthlySpend || 0)}
        </p>
        {stats?.previousMonthSpend !== undefined && (
          <p className="text-xs font-normal leading-tight text-gray-500 dark:text-gray-400 mt-1">
            Previous month: {formatCurrency(stats.previousMonthSpend)}
          </p>
        )}
      </div>

      {/* Cost Breakdown */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Cost Breakdown
        </h4>
        <div className="space-y-2">
          {/* Work Order Costs */}
          <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Work Orders
              </p>
              <p className="text-xs font-normal leading-tight text-gray-500 dark:text-gray-400">
                Labor & maintenance
              </p>
            </div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">
              {formatCurrency(stats?.workOrderCosts || 0)}
            </p>
          </div>

          {/* Purchase Order Costs */}
          <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Purchase Orders
              </p>
              <p className="text-xs font-normal leading-tight text-gray-500 dark:text-gray-400">
                Parts & supplies
              </p>
            </div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">
              {formatCurrency(stats?.purchaseOrderCosts || 0)}
            </p>
          </div>
        </div>
      </div>

      {/* View Reports Link */}
      <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
        <Link
          to="/analytics"
          className="text-xs font-normal leading-tight text-blue-600 dark:text-blue-400 hover:underline"
        >
          View detailed financial reports →
        </Link>
      </div>
    </div>
  );
}
