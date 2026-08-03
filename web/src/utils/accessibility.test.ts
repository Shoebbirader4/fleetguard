/**
 * Accessibility Utilities Tests
 * 
 * Task 30 - Implement accessibility features
 * Requirements: 5.2, 5.8
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getFocusableElements,
  isFocusable,
  generateAriaId,
  getContrastRatio,
  meetsWCAGAA,
  meetsWCAGAAA,
  prefersReducedMotion,
} from './accessibility';

describe('Accessibility Utilities', () => {
  describe('getFocusableElements', () => {
    let container: HTMLDivElement;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
    });

    afterEach(() => {
      document.body.removeChild(container);
    });

    it('should find all focusable elements', () => {
      container.innerHTML = `
        <button>Button</button>
        <a href="#">Link</a>
        <input type="text" />
        <select><option>Option</option></select>
        <textarea></textarea>
        <div>Not focusable</div>
      `;

      const focusable = getFocusableElements(container);
      expect(focusable.length).toBe(5);
    });

    it('should exclude disabled elements', () => {
      container.innerHTML = `
        <button disabled>Disabled Button</button>
        <button>Enabled Button</button>
        <input type="text" disabled />
        <input type="text" />
      `;

      const focusable = getFocusableElements(container);
      expect(focusable.length).toBe(2);
    });

    it('should include elements with tabindex', () => {
      container.innerHTML = `
        <div tabindex="0">Focusable div</div>
        <div tabindex="-1">Not focusable div</div>
        <div>Regular div</div>
      `;

      const focusable = getFocusableElements(container);
      expect(focusable.length).toBe(1);
    });
  });

  describe('isFocusable', () => {
    it('should return true for focusable elements', () => {
      const button = document.createElement('button');
      expect(isFocusable(button)).toBe(true);

      const link = document.createElement('a');
      expect(isFocusable(link)).toBe(true);

      const input = document.createElement('input');
      expect(isFocusable(input)).toBe(true);
    });

    it('should return false for disabled elements', () => {
      const button = document.createElement('button');
      button.disabled = true;
      expect(isFocusable(button)).toBe(false);
    });

    it('should return false for elements with tabindex="-1"', () => {
      const div = document.createElement('div');
      div.setAttribute('tabindex', '-1');
      expect(isFocusable(div)).toBe(false);
    });

    it('should return true for elements with tabindex="0"', () => {
      const div = document.createElement('div');
      div.setAttribute('tabindex', '0');
      expect(isFocusable(div)).toBe(true);
    });
  });

  describe('generateAriaId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateAriaId();
      const id2 = generateAriaId();
      expect(id1).not.toBe(id2);
    });

    it('should use provided prefix', () => {
      const id = generateAriaId('test');
      expect(id).toMatch(/^test-/);
    });

    it('should use default prefix', () => {
      const id = generateAriaId();
      expect(id).toMatch(/^aria-/);
    });
  });

  describe('getContrastRatio', () => {
    it('should calculate contrast ratio for black and white', () => {
      const ratio = getContrastRatio('#000000', '#FFFFFF');
      expect(ratio).toBeCloseTo(21, 0);
    });

    it('should calculate contrast ratio for same colors', () => {
      const ratio = getContrastRatio('#000000', '#000000');
      expect(ratio).toBeCloseTo(1, 0);
    });

    it('should calculate contrast ratio for primary blue on white', () => {
      // Blue-600 (#2563EB) on white should have good contrast
      const ratio = getContrastRatio('#2563EB', '#FFFFFF');
      expect(ratio).toBeGreaterThan(4.5); // Should meet WCAG AA
    });

    it('should calculate contrast ratio for text colors', () => {
      // Gray-700 on white should have good contrast for text
      const ratio = getContrastRatio('#374151', '#FFFFFF');
      expect(ratio).toBeGreaterThan(4.5);
    });
  });

  describe('meetsWCAGAA', () => {
    it('should return true for sufficient contrast (normal text)', () => {
      const ratio = 4.5;
      expect(meetsWCAGAA(ratio, false)).toBe(true);
    });

    it('should return false for insufficient contrast (normal text)', () => {
      const ratio = 4.0;
      expect(meetsWCAGAA(ratio, false)).toBe(false);
    });

    it('should return true for sufficient contrast (large text)', () => {
      const ratio = 3.0;
      expect(meetsWCAGAA(ratio, true)).toBe(true);
    });

    it('should return false for insufficient contrast (large text)', () => {
      const ratio = 2.5;
      expect(meetsWCAGAA(ratio, true)).toBe(false);
    });
  });

  describe('meetsWCAGAAA', () => {
    it('should return true for sufficient contrast (normal text)', () => {
      const ratio = 7.0;
      expect(meetsWCAGAAA(ratio, false)).toBe(true);
    });

    it('should return false for insufficient contrast (normal text)', () => {
      const ratio = 6.0;
      expect(meetsWCAGAAA(ratio, false)).toBe(false);
    });

    it('should return true for sufficient contrast (large text)', () => {
      const ratio = 4.5;
      expect(meetsWCAGAAA(ratio, true)).toBe(true);
    });

    it('should return false for insufficient contrast (large text)', () => {
      const ratio = 4.0;
      expect(meetsWCAGAAA(ratio, true)).toBe(false);
    });
  });

  describe('prefersReducedMotion', () => {
    it('should return a boolean', () => {
      const result = prefersReducedMotion();
      expect(typeof result).toBe('boolean');
    });
  });
});
