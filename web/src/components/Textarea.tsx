/**
 * Textarea Component
 * 
 * Standardized textarea component with consistent styling and focus states.
 * Supports full dark mode and validation states.
 * 
 * Task 27.2 - Standardize component styling
 * Requirements: 5.1, 5.2
 */

import { TextareaHTMLAttributes, forwardRef } from 'react';
import { INPUT_CLASSES } from '../config/designSystem';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, className = '', id, ...props }, ref) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, '_');
    const textareaClasses = error ? INPUT_CLASSES.error : INPUT_CLASSES.default;
    
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={`${textareaClasses} resize-none ${className}`}
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

Textarea.displayName = 'Textarea';

export default Textarea;
