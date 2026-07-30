/**
 * Validation Utilities
 * 
 * This module provides validation functions for user input in the FleetGuard AI system.
 * All validation functions return null for valid input, or an error message string for invalid input.
 * 
 * Requirements:
 * - 1.2: Invited users must receive role specified in invitation (role validation)
 * - 3.2: Vendor email and phone must be unique per tenant
 * - 5.4: Forms must show inline validation errors with clear, helpful messages
 */

import { USER_ROLES } from '../types/user';

/**
 * Email validation regex
 * Validates standard email format: user@domain.tld
 */
export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Phone validation regex
 * Validates international phone format (E.164): +[country code][number]
 * Optional + prefix, must start with 1-9, followed by 1-14 digits
 */
export const phoneRegex = /^\+?[1-9]\d{1,14}$/;

/**
 * Full name validation regex
 * Allows letters, spaces, hyphens, apostrophes, and common accented characters
 * Must start with a letter
 */
export const fullNameRegex = /^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s'-]*$/;

/**
 * Validate email address format
 * 
 * Requirement: 5.4 - Clear, helpful validation messages
 * 
 * @param email - The email address to validate
 * @returns null if valid, error message if invalid
 * 
 * @example
 * validateEmail('user@example.com') // returns null (valid)
 * validateEmail('invalid-email') // returns 'Invalid email format'
 * validateEmail('') // returns 'Email is required'
 */
export function validateEmail(email: string): string | null {
  if (!email || email.trim() === '') {
    return 'Email is required';
  }
  
  if (!emailRegex.test(email.trim())) {
    return 'Invalid email format';
  }
  
  if (email.length > 255) {
    return 'Email must be less than 255 characters';
  }
  
  return null;
}

/**
 * Validate phone number format
 * 
 * Phone numbers should be in international format with optional + prefix
 * Requirement: 5.4 - Clear, helpful validation messages
 * 
 * @param phone - The phone number to validate
 * @returns null if valid, error message if invalid
 * 
 * @example
 * validatePhone('+12345678901') // returns null (valid)
 * validatePhone('1234567890') // returns null (valid, + is optional)
 * validatePhone('') // returns null (phone is optional)
 * validatePhone('abc') // returns 'Invalid phone format...'
 */
export function validatePhone(phone: string): string | null {
  // Phone is optional
  if (!phone || phone.trim() === '') {
    return null;
  }
  
  const trimmedPhone = phone.trim();
  
  if (!phoneRegex.test(trimmedPhone)) {
    return 'Invalid phone format (use international format, e.g., +1234567890)';
  }
  
  return null;
}

/**
 * Validate full name
 * 
 * Names must be at least 2 characters and contain only valid characters
 * Requirement: 5.4 - Clear, helpful validation messages
 * 
 * @param name - The full name to validate
 * @returns null if valid, error message if invalid
 * 
 * @example
 * validateFullName('John Doe') // returns null (valid)
 * validateFullName('María García-López') // returns null (valid)
 * validateFullName('J') // returns 'Name must be at least 2 characters'
 * validateFullName('') // returns 'Full name is required'
 */
export function validateFullName(name: string): string | null {
  if (!name || name.trim() === '') {
    return 'Full name is required';
  }
  
  const trimmedName = name.trim();
  
  if (trimmedName.length < 2) {
    return 'Name must be at least 2 characters';
  }
  
  if (trimmedName.length > 100) {
    return 'Name must be less than 100 characters';
  }
  
  if (!fullNameRegex.test(trimmedName)) {
    return 'Name can only contain letters, spaces, hyphens, and apostrophes';
  }
  
  return null;
}

/**
 * Validate user role
 * 
 * Ensures the role is one of the valid system roles
 * Requirement: 1.2 - Invited users must receive valid role
 * 
 * @param role - The role to validate
 * @returns null if valid, error message if invalid
 * 
 * @example
 * validateRole('company_owner') // returns null (valid)
 * validateRole('invalid_role') // returns 'Invalid role'
 * validateRole('') // returns 'Role is required'
 */
export function validateRole(role: string): string | null {
  if (!role || role.trim() === '') {
    return 'Role is required';
  }
  
  const validRoles = USER_ROLES.map(r => r.value);
  
  if (!validRoles.includes(role as any)) {
    return 'Invalid role';
  }
  
  return null;
}

/**
 * Validate password strength
 * 
 * Passwords must meet minimum security requirements
 * 
 * @param password - The password to validate
 * @returns null if valid, error message if invalid
 * 
 * @example
 * validatePassword('MyP@ssw0rd') // returns null (valid)
 * validatePassword('weak') // returns 'Password must be...'
 */
export function validatePassword(password: string): string | null {
  if (!password) {
    return 'Password is required';
  }
  
  if (password.length < 8) {
    return 'Password must be at least 8 characters';
  }
  
  if (password.length > 72) {
    return 'Password must be less than 72 characters';
  }
  
  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter';
  }
  
  // Check for at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter';
  }
  
  // Check for at least one number
  if (!/\d/.test(password)) {
    return 'Password must contain at least one number';
  }
  
  return null;
}

/**
 * Validate company name
 * 
 * @param name - The company name to validate
 * @returns null if valid, error message if invalid
 */
export function validateCompanyName(name: string): string | null {
  if (!name || name.trim() === '') {
    return 'Company name is required';
  }
  
  const trimmedName = name.trim();
  
  if (trimmedName.length < 2) {
    return 'Company name must be at least 2 characters';
  }
  
  if (trimmedName.length > 200) {
    return 'Company name must be less than 200 characters';
  }
  
  return null;
}

/**
 * Validate required field
 * 
 * Generic validation for required fields
 * 
 * @param value - The value to validate
 * @param fieldName - The name of the field for error message
 * @returns null if valid, error message if invalid
 */
export function validateRequired(value: string | null | undefined, fieldName: string): string | null {
  if (!value || value.trim() === '') {
    return `${fieldName} is required`;
  }
  return null;
}

/**
 * Validate minimum length
 * 
 * @param value - The value to validate
 * @param minLength - Minimum required length
 * @param fieldName - The name of the field for error message
 * @returns null if valid, error message if invalid
 */
export function validateMinLength(value: string, minLength: number, fieldName: string): string | null {
  if (!value) return null;
  
  if (value.length < minLength) {
    return `${fieldName} must be at least ${minLength} characters`;
  }
  
  return null;
}

/**
 * Validate maximum length
 * 
 * @param value - The value to validate
 * @param maxLength - Maximum allowed length
 * @param fieldName - The name of the field for error message
 * @returns null if valid, error message if invalid
 */
export function validateMaxLength(value: string, maxLength: number, fieldName: string): string | null {
  if (!value) return null;
  
  if (value.length > maxLength) {
    return `${fieldName} must be less than ${maxLength} characters`;
  }
  
  return null;
}

/**
 * Validate URL format
 * 
 * @param url - The URL to validate
 * @returns null if valid, error message if invalid
 */
export function validateUrl(url: string): string | null {
  if (!url || url.trim() === '') {
    return null; // Optional
  }
  
  try {
    new URL(url);
    return null;
  } catch {
    return 'Invalid URL format';
  }
}

/**
 * Validate numeric value
 * 
 * @param value - The value to validate
 * @param fieldName - The name of the field for error message
 * @returns null if valid, error message if invalid
 */
export function validateNumeric(value: string, fieldName: string): string | null {
  if (!value || value.trim() === '') {
    return null; // Optional
  }
  
  if (isNaN(Number(value))) {
    return `${fieldName} must be a number`;
  }
  
  return null;
}

/**
 * Validate positive number
 * 
 * @param value - The value to validate
 * @param fieldName - The name of the field for error message
 * @returns null if valid, error message if invalid
 */
export function validatePositiveNumber(value: string | number, fieldName: string): string | null {
  const num = typeof value === 'string' ? Number(value) : value;
  
  if (isNaN(num)) {
    return `${fieldName} must be a number`;
  }
  
  if (num <= 0) {
    return `${fieldName} must be a positive number`;
  }
  
  return null;
}
