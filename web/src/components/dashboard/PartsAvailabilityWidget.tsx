/**
 * PartsAvailabilityWidget Component
 * 
 * Displays parts availability for mechanics.
 * Shows low stock alerts, recently used parts, and quick access to inventory.
 * 
 * Task 23.6 - Create additional role-specific widgets (Parts Availability for mechanics)
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  CubeIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import LoadingSpinner from '../LoadingSpinner';
import type { SparePart } from '../../types/inventory';

interface PartsStats {
  lowStockParts: SparePart[];
  totalParts: number;
  outOfStock: number;
  inStock: number;
}

/**
 * PartsAvailabilityWidget displays parts inventory status
 * 
 * **Validates: Requirements 8.1, 8.2, 8.3**
 * - Display parts availability for mechanics
 * - Show low stock alerts
 * - Provide quick access to parts inventory
 */
export default function PartsAvailabilityWidget() {
  const user = useAuthStore((state) => state.user);
  const tenantId = user?.tenantId || '';

  const { data: stats, isLoading, error } = useQuery<PartsStats>({
    queryKey: ['parts-availability', tenantId],
    queryFn: async () => {
      // Fetch all parts
      const { data: allParts, error: partsError } = await supabase
        .from('spare_parts')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('current_quantity');
      
      if (partsError) throw partsError;

      // Filter low stock parts (below reorder level)
      const lowStockParts = (allParts || []).filter(
        (part) => part.current_quantity <= part.reorder_level
      );

      // Count out of stock
      const outOfStock = (allParts || []).filter(
        (part) => part.current_quantity === 0
      ).length;

      const inStock = (allParts || []).filter(
        (part) => part.current_quantity > 0
      ).length;

      return {
        lowStockParts: lowStockParts.slice(0, 5), // Top 5 low stock items
        totalParts: allParts?.length || 0,
        outOfStock,
        inStock,
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
          <p className="text-sm font-normal leading-normal">Failed to load parts availability</p>
          <p className="text-xs font-normal leading-tight text-gray-500 mt-1">
            {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </div>
      </div>
    );
  }

  const hasLowStock = (stats?.lowStockParts.length || 0) > 0;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        {/* Total Parts */}
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
          <div className="flex items-center gap-2 mb-1">
            <CubeIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-normal leading-tight text-blue-600 dark:text-blue-400 font-medium">Total</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats?.totalParts || 0}
          </p>
        </div>

        {/* In Stock */}
        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircleIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span className="text-xs font-normal leading-tight text-green-600 dark:text-green-400 font-medium">In Stock</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats?.inStock || 0}
          </p>
        </div>

        {/* Out of Stock */}
        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800">
          <div className="flex items-center gap-2 mb-1">
            <ExclamationTriangleIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
            <span className="text-xs font-normal leading-tight text-red-600 dark:text-red-400 font-medium">Out</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats?.outOfStock || 0}
          </p>
        </div>
      </div>

      {/* Low Stock Alert Banner */}
      {hasLowStock && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-start gap-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-900 dark:text-yellow-200">
                Low Stock Alert
              </p>
              <p className="text-xs font-normal leading-tight text-yellow-700 dark:text-yellow-300 mt-1">
                {stats?.lowStockParts.length || 0} {stats?.lowStockParts.length === 1 ? 'part is' : 'parts are'} below reorder level
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Low Stock Parts List */}
      {hasLowStock ? (
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Low Stock Items
          </h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {stats?.lowStockParts.map((part) => {
              const isOutOfStock = part.current_quantity === 0;
              const stockPercentage = part.reorder_level > 0
                ? Math.min((part.current_quantity / part.reorder_level) * 100, 100)
                : 0;

              return (
                <div
                  key={part.id}
                  className={`p-3 rounded-lg border ${
                    isOutOfStock
                      ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                      : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {part.description}
                      </p>
                      <p className="text-xs font-normal leading-tight text-gray-600 dark:text-gray-400 mt-1">
                        Part #: {part.part_number}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-normal leading-tight px-2 py-0.5 rounded-full font-medium flex-shrink-0 ml-2 ${
                        isOutOfStock
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                      }`}
                    >
                      {isOutOfStock ? 'Out of Stock' : 'Low Stock'}
                    </span>
                  </div>

                  {/* Stock Level Bar */}
                  <div className="mb-2">
                    <div className="flex items-center justify-between text-xs font-normal leading-tight mb-1">
                      <span className="text-gray-600 dark:text-gray-400">
                        Current: {part.current_quantity} {part.unit_of_measure}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        Reorder: {part.reorder_level}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${
                          isOutOfStock
                            ? 'bg-red-500'
                            : stockPercentage < 50
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        }`}
                        style={{ width: `${stockPercentage}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Category */}
                  <div className="text-xs font-normal leading-tight text-gray-500 dark:text-gray-400">
                    Category: {part.category}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-6 text-center">
          <CheckCircleIcon className="h-12 w-12 text-green-500 dark:text-green-400 mb-3" />
          <p className="text-sm font-medium text-green-600 dark:text-green-400">
            All Parts In Stock
          </p>
          <p className="text-xs font-normal leading-tight text-gray-500 dark:text-gray-400 mt-1">
            All parts are above reorder levels
          </p>
        </div>
      )}

      {/* Quick Actions */}
      <div className="pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
        <Link
          to="/inventory"
          className="flex items-center justify-center gap-2 w-full px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
        >
          View Full Inventory
          <ArrowRightIcon className="h-4 w-4" />
        </Link>
        {hasLowStock && (
          <Link
            to="/inventory/purchase-orders/new"
            className="block text-center text-xs font-normal leading-tight text-blue-600 dark:text-blue-400 hover:underline"
          >
            Create Purchase Order →
          </Link>
        )}
      </div>
    </div>
  );
}
