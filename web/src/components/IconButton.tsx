/**
 * IconButton Component
 * 
 * Button component specifically for icon-only buttons with proper ARIA labels.
 * Ensures accessibility for screen readers.
 * 
 * Task 30.2 - Add screen reader support
 * Requirements: 5.2, 5.8
 */

import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react';
import Tooltip from './Tooltip';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: string; // Required for accessibility
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
}

const variantClasses = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
  secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 focus:ring-gray-500',
  danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
  ghost: 'bg-transparent hover:bg-gray-100 text-gray-700 dark:hover:bg-gray-700 dark:text-gray-300 focus:ring-gray-500',
};

const sizeClasses = {
  sm: 'p-1.5',
  md: 'p-2',
  lg: 'p-3',
};

const iconSizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon,
      label,
      variant = 'ghost',
      size = 'md',
      showTooltip = true,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const button = (
      <button
        ref={ref}
        aria-label={label}
        title={!showTooltip ? label : undefined}
        className={`
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          rounded-lg
          transition-colors
          focus:outline-none focus:ring-2 focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          inline-flex items-center justify-center
          ${className}
        `}
        disabled={disabled}
        {...props}
      >
        <span className={iconSizeClasses[size]} aria-hidden="true">
          {icon}
        </span>
      </button>
    );

    if (showTooltip && !disabled) {
      return <Tooltip content={label}>{button}</Tooltip>;
    }

    return button;
  }
);

IconButton.displayName = 'IconButton';

export default IconButton;
