/**
 * Unit tests for validation utilities
 */

import { describe, it, expect } from 'vitest';
import {
  validateEmail,
  validatePhone,
  validateFullName,
  validateRole,
  validatePassword,
  validateCompanyName,
  validateRequired,
  validateMinLength,
  validateMaxLength,
  validateUrl,
  validateNumeric,
  validatePositiveNumber,
} from './validation';

describe('validation utilities', () => {
  describe('validateEmail', () => {
    it('should return null for valid email', () => {
      expect(validateEmail('user@example.com')).toBeNull();
      expect(validateEmail('test.user+tag@domain.co.uk')).toBeNull();
    });

    it('should return error for invalid email format', () => {
      expect(validateEmail('invalid-email')).toBe('Invalid email format');
      expect(validateEmail('user@')).toBe('Invalid email format');
      expect(validateEmail('@domain.com')).toBe('Invalid email format');
    });

    it('should return error for empty email', () => {
      expect(validateEmail('')).toBe('Email is required');
      expect(validateEmail('   ')).toBe('Email is required');
    });

    it('should return error for too long email', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      expect(validateEmail(longEmail)).toBe('Email must be less than 255 characters');
    });
  });

  describe('validatePhone', () => {
    it('should return null for valid phone numbers', () => {
      expect(validatePhone('+12345678901')).toBeNull();
      expect(validatePhone('12345678901')).toBeNull();
      expect(validatePhone('+447911123456')).toBeNull();
    });

    it('should return null for empty phone (optional)', () => {
      expect(validatePhone('')).toBeNull();
      expect(validatePhone('   ')).toBeNull();
    });

    it('should return error for invalid phone format', () => {
      expect(validatePhone('abc')).toContain('Invalid phone format');
      expect(validatePhone('0123456789')).toContain('Invalid phone format'); // Cannot start with 0
      expect(validatePhone('+0123456789')).toContain('Invalid phone format'); // Cannot start with 0 after +
    });
  });

  describe('validateFullName', () => {
    it('should return null for valid names', () => {
      expect(validateFullName('John Doe')).toBeNull();
      expect(validateFullName('María García-López')).toBeNull();
      expect(validateFullName("O'Brien")).toBeNull();
      expect(validateFullName('Jean-Pierre Dupont')).toBeNull();
    });

    it('should return error for empty name', () => {
      expect(validateFullName('')).toBe('Full name is required');
      expect(validateFullName('   ')).toBe('Full name is required');
    });

    it('should return error for too short name', () => {
      expect(validateFullName('A')).toBe('Name must be at least 2 characters');
    });

    it('should return error for too long name', () => {
      const longName = 'A'.repeat(101);
      expect(validateFullName(longName)).toBe('Name must be less than 100 characters');
    });

    it('should return error for invalid characters', () => {
      expect(validateFullName('John123')).toContain('letters, spaces, hyphens, and apostrophes');
      expect(validateFullName('User@Name')).toContain('letters, spaces, hyphens, and apostrophes');
    });
  });

  describe('validateRole', () => {
    it('should return null for valid roles', () => {
      expect(validateRole('company_owner')).toBeNull();
      expect(validateRole('fleet_manager')).toBeNull();
      expect(validateRole('driver')).toBeNull();
      expect(validateRole('mechanic')).toBeNull();
    });

    it('should return error for invalid role', () => {
      expect(validateRole('invalid_role')).toBe('Invalid role');
      expect(validateRole('admin')).toBe('Invalid role');
    });

    it('should return error for empty role', () => {
      expect(validateRole('')).toBe('Role is required');
      expect(validateRole('   ')).toBe('Role is required');
    });
  });

  describe('validatePassword', () => {
    it('should return null for valid passwords', () => {
      expect(validatePassword('MyP@ssw0rd')).toBeNull();
      expect(validatePassword('Secur3Pass!')).toBeNull();
      expect(validatePassword('Test1234')).toBeNull();
    });

    it('should return error for empty password', () => {
      expect(validatePassword('')).toBe('Password is required');
    });

    it('should return error for too short password', () => {
      expect(validatePassword('Pass1')).toBe('Password must be at least 8 characters');
    });

    it('should return error for too long password', () => {
      const longPassword = 'P' + 'a'.repeat(72);
      expect(validatePassword(longPassword)).toBe('Password must be less than 72 characters');
    });

    it('should return error for missing uppercase letter', () => {
      expect(validatePassword('password123')).toContain('uppercase letter');
    });

    it('should return error for missing lowercase letter', () => {
      expect(validatePassword('PASSWORD123')).toContain('lowercase letter');
    });

    it('should return error for missing number', () => {
      expect(validatePassword('PasswordABC')).toContain('number');
    });
  });

  describe('validateCompanyName', () => {
    it('should return null for valid company names', () => {
      expect(validateCompanyName('Acme Inc.')).toBeNull();
      expect(validateCompanyName('ABC Transportation & Logistics')).toBeNull();
    });

    it('should return error for empty company name', () => {
      expect(validateCompanyName('')).toBe('Company name is required');
    });

    it('should return error for too short company name', () => {
      expect(validateCompanyName('A')).toBe('Company name must be at least 2 characters');
    });

    it('should return error for too long company name', () => {
      const longName = 'A'.repeat(201);
      expect(validateCompanyName(longName)).toBe('Company name must be less than 200 characters');
    });
  });

  describe('validateRequired', () => {
    it('should return null for non-empty value', () => {
      expect(validateRequired('value', 'Field')).toBeNull();
    });

    it('should return error for empty value', () => {
      expect(validateRequired('', 'Field')).toBe('Field is required');
      expect(validateRequired('   ', 'Field')).toBe('Field is required');
      expect(validateRequired(null, 'Field')).toBe('Field is required');
      expect(validateRequired(undefined, 'Field')).toBe('Field is required');
    });
  });

  describe('validateMinLength', () => {
    it('should return null for value meeting minimum length', () => {
      expect(validateMinLength('test', 3, 'Field')).toBeNull();
      expect(validateMinLength('test', 4, 'Field')).toBeNull();
    });

    it('should return error for value below minimum length', () => {
      expect(validateMinLength('ab', 3, 'Field')).toBe('Field must be at least 3 characters');
    });

    it('should return null for empty value', () => {
      expect(validateMinLength('', 3, 'Field')).toBeNull();
    });
  });

  describe('validateMaxLength', () => {
    it('should return null for value within maximum length', () => {
      expect(validateMaxLength('test', 10, 'Field')).toBeNull();
      expect(validateMaxLength('test', 4, 'Field')).toBeNull();
    });

    it('should return error for value exceeding maximum length', () => {
      expect(validateMaxLength('testing', 5, 'Field')).toBe('Field must be less than 5 characters');
    });

    it('should return null for empty value', () => {
      expect(validateMaxLength('', 5, 'Field')).toBeNull();
    });
  });

  describe('validateUrl', () => {
    it('should return null for valid URLs', () => {
      expect(validateUrl('https://example.com')).toBeNull();
      expect(validateUrl('http://localhost:3000')).toBeNull();
      expect(validateUrl('https://sub.domain.com/path?query=value')).toBeNull();
    });

    it('should return null for empty URL (optional)', () => {
      expect(validateUrl('')).toBeNull();
      expect(validateUrl('   ')).toBeNull();
    });

    it('should return error for invalid URL', () => {
      expect(validateUrl('not-a-url')).toBe('Invalid URL format');
      expect(validateUrl('example.com')).toBe('Invalid URL format');
    });
  });

  describe('validateNumeric', () => {
    it('should return null for numeric values', () => {
      expect(validateNumeric('123', 'Field')).toBeNull();
      expect(validateNumeric('123.45', 'Field')).toBeNull();
      expect(validateNumeric('-10', 'Field')).toBeNull();
    });

    it('should return null for empty value (optional)', () => {
      expect(validateNumeric('', 'Field')).toBeNull();
      expect(validateNumeric('   ', 'Field')).toBeNull();
    });

    it('should return error for non-numeric value', () => {
      expect(validateNumeric('abc', 'Field')).toBe('Field must be a number');
      expect(validateNumeric('12abc', 'Field')).toBe('Field must be a number');
    });
  });

  describe('validatePositiveNumber', () => {
    it('should return null for positive numbers', () => {
      expect(validatePositiveNumber('123', 'Field')).toBeNull();
      expect(validatePositiveNumber('1.5', 'Field')).toBeNull();
      expect(validatePositiveNumber(100, 'Field')).toBeNull();
    });

    it('should return error for zero', () => {
      expect(validatePositiveNumber('0', 'Field')).toBe('Field must be a positive number');
      expect(validatePositiveNumber(0, 'Field')).toBe('Field must be a positive number');
    });

    it('should return error for negative numbers', () => {
      expect(validatePositiveNumber('-5', 'Field')).toBe('Field must be a positive number');
      expect(validatePositiveNumber(-10, 'Field')).toBe('Field must be a positive number');
    });

    it('should return error for non-numeric value', () => {
      expect(validatePositiveNumber('abc', 'Field')).toBe('Field must be a number');
    });
  });
});
