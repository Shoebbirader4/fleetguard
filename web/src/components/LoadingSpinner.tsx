import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * LoadingSpinner component
 * 
 * A reusable loading spinner component that follows the FleetGuard AI design system.
 * Uses the animate-spin pattern with border styling.
 * 
 * @param size - Optional size prop: 'sm' (h-4 w-4), 'md' (h-5 w-5), 'lg' (h-8 w-8). Default: 'md'
 * @param className - Optional additional CSS classes
 * 
 * Requirements: 5.3 (Loading states within 300ms), 5.5 (Support for all screen sizes)
 */
export default function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-8 w-8',
  };

  return (
    <div
      className={`inline-block animate-spin rounded-full border-b-2 border-blue-600 dark:border-blue-400 ${sizeClasses[size]} ${className}`}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}
