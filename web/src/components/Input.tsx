/**
 * Input Component
 * 
 * Standardized form input component with consistent styling, focus states, and validation.
 * Supports text inputs, email, password, number, date, etc.
 * 
 * Task 27.2 - Standardize component styling
 * Requirements: 5.1, 5.2
 */

import { InputHTMLAttributes, forwardRef } from 'react';
import { INPUT_CLASSES } from '../config/designSystem';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '_');
    const inputClasses = error ? INPUT_CLASSES.error : INPUT_CLASSES.default;
    
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`${inputClasses} ${className}`}
          {...props}
        />
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

Input.displayName = 'Input';

export default Input;
