import { lazy, Suspense, ComponentType, ReactNode } from 'react';

interface LazyComponentWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Default loading fallback for lazy components
 */
function DefaultLoadingFallback() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

/**
 * LazyComponentWrapper - Wraps lazy-loaded components with Suspense
 * 
 * @example
 * const HeavyChart = lazy(() => import('./HeavyChart'));
 * 
 * <LazyComponentWrapper>
 *   <HeavyChart data={data} />
 * </LazyComponentWrapper>
 */
export function LazyComponentWrapper({
  children,
  fallback = <DefaultLoadingFallback />,
}: LazyComponentWrapperProps) {
  return <Suspense fallback={fallback}>{children}</Suspense>;
}

/**
 * Creates a lazy-loaded component with built-in Suspense wrapper
 * 
 * @example
 * export const LazyAnalyticsChart = createLazyComponent(
 *   () => import('./AnalyticsChart'),
 *   <ChartSkeleton />
 * );
 * 
 * // Usage in component:
 * <LazyAnalyticsChart data={data} />
 */
export function createLazyComponent<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: ReactNode
) {
  const LazyComponent = lazy(importFunc);

  return (props: React.ComponentProps<T>) => (
    <Suspense fallback={fallback || <DefaultLoadingFallback />}>
      <LazyComponent {...props} />
    </Suspense>
  );
}

/**
 * Skeleton loaders for common component types
 */
export function ChartSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded"></div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
        <div className="space-y-3">
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
        </div>
      </div>
    </div>
  );
}

export function MapSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
        <div className="text-gray-400 dark:text-gray-500">
          <svg
            className="w-16 h-16 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
            />
          </svg>
          <p className="text-sm">Loading map...</p>
        </div>
      </div>
    </div>
  );
}
