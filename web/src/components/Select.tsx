/**
 * Select Component
 * 
 * Standardized select dropdown component with consistent styling and focus states.
 * Supports full dark mode and validation states.
 * 
 * Task 27.2 - Standardize component styling
 * Requirements: 5.1, 5.2
 */

import { SelectHTMLAttributes, forwardRef } from 'react';
import { INPUT_CLASSES } from '../config/designSystem';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options?: Array<{ value: string; label: string }>;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, options, children, className = '', id, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '_');
    const selectClasses = error ? INPUT_CLASSES.error : INPUT_CLASSES.default;
    
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`${selectClasses} ${className}`}
          {...props}
        >
          {options ? (
            options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))
          ) : (
            children
          )}
        </select>
        {error && (
          <p className="mt-1 text-sm font-normal leading-normal text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p className="mt-1 text-sm font-normal leading-normal text-gray-500 dark:text-gray-400">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;
