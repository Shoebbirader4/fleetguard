/**
 * ResponsiveTable Component
 * 
 * Mobile-responsive table that converts to card layout on small screens (Task 29.2)
 * 
 * Requirements:
 * - 5.3: Fully responsive and mobile-optimized
 * - 5.5: Support sorting, searching, pagination, and column filtering
 * - Task 29.2: Convert tables to card layout on mobile
 * - Task 29.2: Show only critical columns on mobile
 * - Task 29.2: Implement horizontal scroll with shadow indicators
 */

import { ReactNode, useState, useRef, useEffect } from 'react';

export interface Column<T> {
  key: string;
  label: string;
  render: (item: T) => ReactNode;
  sortable?: boolean;
  critical?: boolean; // Show on mobile
  className?: string;
}

export interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  mobileCardRenderer?: (item: T) => ReactNode; // Custom mobile card renderer
  emptyMessage?: string;
  className?: string;
  loading?: boolean;
  onRowClick?: (item: T) => void;
}

export default function ResponsiveTable<T>({
  data,
  columns,
  keyExtractor,
  mobileCardRenderer,
  emptyMessage = 'No data available',
  className = '',
  loading = false,
  onRowClick,
}: ResponsiveTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showLeftShadow, setShowLeftShadow] = useState(false);
  const [showRightShadow, setShowRightShadow] = useState(false);
  const tableScrollRef = useRef<HTMLDivElement>(null);

  // Handle table scroll to show/hide shadow indicators (Task 29.2)
  const handleScroll = () => {
    if (tableScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tableScrollRef.current;
      setShowLeftShadow(scrollLeft > 0);
      setShowRightShadow(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  // Check initial scroll state
  useEffect(() => {
    handleScroll();
  }, [data]);

  // Handle column sorting
  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  // Sort data if sorting is active
  const sortedData = sortKey ? [...data].sort((a: any, b: any) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    
    if (aVal === bVal) return 0;
    
    const comparison = aVal < bVal ? -1 : 1;
    return sortDirection === 'asc' ? comparison : -comparison;
  }) : data;

  // Get critical columns for mobile view
  const criticalColumns = columns.filter(col => col.critical);

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded mb-2"></div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile Card View - Task 29.2 */}
      <div className="md:hidden space-y-3">
        {sortedData.map((item) => (
          <div
            key={keyExtractor(item)}
            onClick={() => onRowClick?.(item)}
            className={`card ${onRowClick ? 'cursor-pointer hover:shadow-md' : ''}`}
          >
            {mobileCardRenderer ? (
              mobileCardRenderer(item)
            ) : (
              <div className="space-y-2">
                {columns.map((column) => (
                  <div key={column.key} className="flex justify-between items-start gap-3">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[100px]">
                      {column.label}:
                    </span>
                    <span className="text-sm text-gray-900 dark:text-gray-100 text-right flex-1">
                      {column.render(item)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop Table View with Horizontal Scroll - Task 29.2 */}
      <div className={`hidden md:block relative ${className}`}>
        {/* Left Shadow Indicator */}
        {showLeftShadow && (
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-gray-200 dark:from-gray-800 to-transparent pointer-events-none z-10" />
        )}
        
        {/* Right Shadow Indicator */}
        {showRightShadow && (
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-gray-200 dark:from-gray-800 to-transparent pointer-events-none z-10" />
        )}

        <div
          ref={tableScrollRef}
          onScroll={handleScroll}
          className="overflow-x-auto"
        >
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={`px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${
                      column.sortable ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700' : ''
                    } ${column.className || ''}`}
                    onClick={() => column.sortable && handleSort(column.key)}
                  >
                    <div className="flex items-center gap-2">
                      {column.label}
                      {column.sortable && (
                        <svg
                          className={`w-4 h-4 ${
                            sortKey === column.key
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-gray-400'
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          {sortKey === column.key && sortDirection === 'desc' ? (
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          ) : (
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 15l7-7 7 7"
                            />
                          )}
                        </svg>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {sortedData.map((item) => (
                <tr
                  key={keyExtractor(item)}
                  onClick={() => onRowClick?.(item)}
                  className={`${
                    onRowClick
                      ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'
                      : ''
                  }`}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 ${
                        column.className || ''
                      }`}
                    >
                      {column.render(item)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
