/**
 * MobileOptimizedForm Component
 * 
 * Form wrapper with mobile optimizations (Task 29.3)
 * 
 * Requirements:
 * - 5.3: Fully responsive and mobile-optimized
 * - Task 29.3: Use single column layout on mobile
 * - Task 29.3: Increase touch target sizes (minimum 44x44px)
 * - Task 29.3: Use native mobile inputs for date, time, number fields
 * - Task 29.3: Ensure form validation messages are visible on small screens
 */

import { FormEvent, ReactNode } from 'react';

export interface MobileOptimizedFormProps {
  children: ReactNode;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  title?: string;
  subtitle?: string;
  className?: string;
}

export default function MobileOptimizedForm({
  children,
  onSubmit,
  title,
  subtitle,
  className = '',
}: MobileOptimizedFormProps) {
  return (
    <form onSubmit={onSubmit} className={`space-y-6 ${className}`}>
      {(title || subtitle) && (
        <div className="mb-6">
          {title && (
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {subtitle}
            </p>
          )}
        </div>
      )}
      
      {/* Form content with mobile-first single column layout */}
      <div className="space-y-4">
        {children}
      </div>
    </form>
  );
}

// Form Field Component with mobile optimizations
export interface FormFieldProps {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'date' | 'time' | 'datetime-local' | 'url';
  value: string | number;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  helperText?: string;
  disabled?: boolean;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  autoComplete?: string;
  className?: string;
}

export function FormField({
  label,
  name,
  type = 'text',
  value,
  onChange,
  error,
  required = false,
  placeholder,
  helperText,
  disabled = false,
  min,
  max,
  step,
  autoComplete,
  className = '',
}: FormFieldProps) {
  return (
    <div className={`w-full ${className}`}>
      <label
        htmlFor={name}
        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        autoComplete={autoComplete}
        className={`w-full px-4 py-3 sm:py-2 border rounded-lg shadow-sm
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
          dark:bg-gray-700 dark:border-gray-600 dark:text-white
          dark:focus:ring-blue-500 dark:disabled:bg-gray-800
          text-base sm:text-sm
          min-h-[44px] sm:min-h-[38px]
          ${error ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}
        `}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : helperText ? `${name}-helper` : undefined}
      />
      
      {helperText && !error && (
        <p id={`${name}-helper`} className="mt-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          {helperText}
        </p>
      )}
      
      {error && (
        <p id={`${name}-error`} className="mt-1 text-xs sm:text-sm text-red-600 dark:text-red-400 flex items-start gap-1">
          <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

// Select Field Component
export interface SelectFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  error?: string;
  required?: boolean;
  helperText?: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function SelectField({
  label,
  name,
  value,
  onChange,
  options,
  error,
  required = false,
  helperText,
  disabled = false,
  placeholder,
  className = '',
}: SelectFieldProps) {
  return (
    <div className={`w-full ${className}`}>
      <label
        htmlFor={name}
        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <select
        id={name}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        className={`w-full px-4 py-3 sm:py-2 border rounded-lg shadow-sm
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
          dark:bg-gray-700 dark:border-gray-600 dark:text-white
          dark:focus:ring-blue-500 dark:disabled:bg-gray-800
          text-base sm:text-sm
          min-h-[44px] sm:min-h-[38px]
          ${error ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}
        `}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : helperText ? `${name}-helper` : undefined}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      
      {helperText && !error && (
        <p id={`${name}-helper`} className="mt-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          {helperText}
        </p>
      )}
      
      {error && (
        <p id={`${name}-error`} className="mt-1 text-xs sm:text-sm text-red-600 dark:text-red-400 flex items-start gap-1">
          <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

// Textarea Field Component
export interface TextareaFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  helperText?: string;
  disabled?: boolean;
  rows?: number;
  className?: string;
}

export function TextareaField({
  label,
  name,
  value,
  onChange,
  error,
  required = false,
  placeholder,
  helperText,
  disabled = false,
  rows = 4,
  className = '',
}: TextareaFieldProps) {
  return (
    <div className={`w-full ${className}`}>
      <label
        htmlFor={name}
        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <textarea
        id={name}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        className={`w-full px-4 py-3 sm:py-2 border rounded-lg shadow-sm
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
          dark:bg-gray-700 dark:border-gray-600 dark:text-white
          dark:focus:ring-blue-500 dark:disabled:bg-gray-800
          text-base sm:text-sm resize-y
          ${error ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}
        `}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : helperText ? `${name}-helper` : undefined}
      />
      
      {helperText && !error && (
        <p id={`${name}-helper`} className="mt-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          {helperText}
        </p>
      )}
      
      {error && (
        <p id={`${name}-error`} className="mt-1 text-xs sm:text-sm text-red-600 dark:text-red-400 flex items-start gap-1">
          <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

// Form Actions (Submit, Cancel buttons)
export interface FormActionsProps {
  submitLabel?: string;
  cancelLabel?: string;
  onCancel?: () => void;
  isSubmitting?: boolean;
  submitDisabled?: boolean;
  className?: string;
}

export function FormActions({
  submitLabel = 'Submit',
  cancelLabel = 'Cancel',
  onCancel,
  isSubmitting = false,
  submitDisabled = false,
  className = '',
}: FormActionsProps) {
  return (
    <div className={`flex flex-col-reverse sm:flex-row gap-3 sm:gap-4 pt-4 ${className}`}>
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="w-full sm:w-auto px-6 py-3 sm:py-2 text-sm font-medium text-gray-700 dark:text-gray-200 
            bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 
            hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg transition-colors
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            disabled:opacity-50 disabled:cursor-not-allowed
            min-h-[44px] sm:min-h-[38px]"
        >
          {cancelLabel}
        </button>
      )}
      
      <button
        type="submit"
        disabled={isSubmitting || submitDisabled}
        className="w-full sm:w-auto px-6 py-3 sm:py-2 text-sm font-medium text-white 
          bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          min-h-[44px] sm:min-h-[38px]
          flex items-center justify-center gap-2"
      >
        {isSubmitting && (
          <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {isSubmitting ? 'Submitting...' : submitLabel}
      </button>
    </div>
  );
}
