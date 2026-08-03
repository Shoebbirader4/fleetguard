/**
 * Button Component
 * 
 * Standardized button component with consistent variants, sizes, and states.
 * Supports all design system button patterns with full dark mode support.
 * 
 * Task 27.2 - Standardize component styling
 * Requirements: 5.1, 5.2
 */

import { ButtonHTMLAttributes, forwardRef } from 'react';
import { BUTTON_CLASSES } from '../config/designSystem';
import LoadingSpinner from './LoadingSpinner';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm font-normal leading-normal',
  md: 'px-4 py-2 text-base font-normal leading-normal',
  lg: 'px-6 py-3 text-lg',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      icon,
      fullWidth = false,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const baseClasses = BUTTON_CLASSES[variant];
    const sizeClass = sizeClasses[size];
    const widthClass = fullWidth ? 'w-full' : '';
    
    return (
      <button
        ref={ref}
        className={`${baseClasses} ${sizeClass} ${widthClass} flex items-center justify-center gap-2 ${className}`}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <LoadingSpinner size="sm" />}
        {!isLoading && icon && icon}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
