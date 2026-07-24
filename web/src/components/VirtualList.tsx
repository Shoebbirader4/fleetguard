import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef, ReactNode } from 'react';

interface VirtualListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  estimateSize: number;
  overscan?: number;
  className?: string;
  emptyMessage?: string;
}

/**
 * VirtualList component for efficient rendering of large lists
 * Uses @tanstack/react-virtual for windowing/virtualization
 * 
 * Benefits:
 * - Only renders visible items + overscan buffer
 * - Dramatically improves performance for lists with 100+ items
 * - Maintains scroll position and smooth scrolling
 * 
 * @example
 * <VirtualList
 *   items={vehicles}
 *   renderItem={(vehicle) => <VehicleCard vehicle={vehicle} />}
 *   estimateSize={120}
 *   overscan={5}
 * />
 */
export function VirtualList<T>({
  items,
  renderItem,
  estimateSize,
  overscan = 5,
  className = '',
  emptyMessage = 'No items to display',
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
  });

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500 dark:text-gray-400">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className={`overflow-auto ${className}`}
      style={{ height: '100%', width: '100%' }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            data-index={virtualItem.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {renderItem(items[virtualItem.index], virtualItem.index)}
          </div>
        ))}
      </div>
    </div>
  );
}
