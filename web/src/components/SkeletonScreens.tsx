/**
 * SkeletonScreens Component Library
 * 
 * Comprehensive skeleton screen components for loading states across the application.
 * These replace generic spinners with contextual skeleton screens that match the content layout.
 * 
 * Task 28.1 - Add loading states for all async operations
 * Requirements: 5.3 (Loading states within 300ms), 5.5 (Mobile responsive)
 */

import React from 'react';

/**
 * Base skeleton component for single lines
 */
export function SkeletonLine({ className = '' }: { className?: string }) {
  return (
    <div 
      className={`h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse ${className}`}
      role="status"
      aria-label="Loading..."
    />
  );
}

/**
 * Base skeleton component for blocks
 */
export function SkeletonBlock({ className = '' }: { className?: string }) {
  return (
    <div 
      className={`bg-gray-200 dark:bg-gray-700 rounded animate-pulse ${className}`}
      role="status"
      aria-label="Loading..."
    />
  );
}

/**
 * Skeleton for table rows - used in list pages
 */
export function TableRowSkeleton() {
  return (
    <tr className="animate-pulse">
      {[...Array(6)].map((_, i) => (
        <td key={i} className="px-6 py-4 whitespace-nowrap">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
        </td>
      ))}
    </tr>
  );
}

/**
 * Skeleton for complete table - Team, Drivers, Vendors pages
 */
export function TableSkeleton({ rows = 5, columns = 6 }: { rows?: number; columns?: number }) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              {[...Array(columns)].map((_, i) => (
                <th key={i} scope="col" className="px-6 py-3 text-left">
                  <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-20 animate-pulse"></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {[...Array(rows)].map((_, i) => (
              <TableRowSkeleton key={i} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Skeleton for list page (Team, Drivers, Vendors)
 */
export function ListPageSkeleton() {
  return (
    <>
      {/* Search and Filters Skeleton */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-2"></div>
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-48 animate-pulse"></div>
        </div>
      </div>

      {/* Table Skeleton */}
      <TableSkeleton rows={8} columns={7} />
    </>
  );
}

/**
 * Skeleton for card-based list items (Work Orders, Vehicles)
 */
export function CardListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="card animate-pulse">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
              </div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            </div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, j) => (
              <div key={j} className="space-y-2">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for grid-based list (Vehicles, Dashboard widgets)
 */
export function GridCardSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="card animate-pulse">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1 space-y-2">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            </div>
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, j) => (
              <div key={j} className="space-y-2">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for modal content
 */
export function ModalSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Title */}
      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
      
      {/* Form fields */}
      {[...Array(4)].map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      ))}
      
      {/* Buttons */}
      <div className="flex justify-end gap-3 mt-6">
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
      </div>
    </div>
  );
}

/**
 * Skeleton for form pages
 */
export function FormSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="space-y-6">
        {/* Form Title */}
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
        
        {/* Form fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          ))}
        </div>
        
        {/* Full width textarea */}
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
        
        {/* Action buttons */}
        <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for detail pages
 */
export function DetailPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="card animate-pulse">
        <div className="flex justify-between items-start">
          <div className="flex-1 space-y-3">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          </div>
          <div className="flex gap-2">
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
          </div>
        </div>
      </div>
      
      {/* Info Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card animate-pulse">
            <div className="space-y-4">
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
              {[...Array(3)].map((_, j) => (
                <div key={j} className="space-y-2">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton for dashboard widgets
 */
export function DashboardWidgetSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="space-y-4">
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
        <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for dashboard page with multiple widgets
 */
export function DashboardPageSkeleton() {
  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card animate-pulse">
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Main Widgets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <DashboardWidgetSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton for inline button loading state
 */
export function ButtonLoadingSpinner({ className = '' }: { className?: string }) {
  return (
    <div 
      className={`inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent ${className}`}
      role="status"
      aria-label="Loading..."
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

/**
 * Skeleton for search/filter section
 */
export function FilterSkeleton() {
  return (
    <div className="card mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton for empty state with centered message
 */
export function EmptyStateSkeleton() {
  return (
    <div className="card text-center py-12 animate-pulse">
      <div className="mx-auto h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded-full mb-4"></div>
      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mx-auto mb-2"></div>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-64 mx-auto"></div>
    </div>
  );
}
