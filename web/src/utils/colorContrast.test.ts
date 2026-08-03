import { describe, it, expect } from 'vitest';
import {
  getContrastRatio,
  meetsWCAG_AA,
  meetsWCAG_AAA,
  testColorCombination,
  runColorContrastTests,
  FLEETGUARD_COLORS,
} from './colorContrast';

describe('Color Contrast Utility', () => {
  describe('getContrastRatio', () => {
    it('should calculate correct contrast ratio for black on white', () => {
      const ratio = getContrastRatio('#000000', '#ffffff');
      expect(ratio).toBe(21); // Maximum contrast
    });

    it('should calculate correct contrast ratio for white on white', () => {
      const ratio = getContrastRatio('#ffffff', '#ffffff');
      expect(ratio).toBe(1); // Minimum contrast
    });

    it('should calculate contrast ratio for FleetGuard primary blue on white', () => {
      const ratio = getContrastRatio('#2563EB', '#ffffff');
      expect(ratio).toBeGreaterThan(4.5); // Should pass WCAG AA
    });
  });

  describe('WCAG Compliance', () => {
    it('should correctly identify AA compliant ratios', () => {
      expect(meetsWCAG_AA(4.5)).toBe(true);
      expect(meetsWCAG_AA(4.6)).toBe(true);
      expect(meetsWCAG_AA(4.4)).toBe(false);
      expect(meetsWCAG_AA(3.0)).toBe(false);
    });

    it('should correctly identify AAA compliant ratios', () => {
      expect(meetsWCAG_AAA(7.0)).toBe(true);
      expect(meetsWCAG_AAA(8.0)).toBe(true);
      expect(meetsWCAG_AAA(6.9)).toBe(false);
      expect(meetsWCAG_AAA(4.5)).toBe(false);
    });
  });

  describe('FleetGuard AI Color Palette Compliance', () => {
    describe('Primary Blue (#2563EB)', () => {
      it('should meet WCAG AA when used as text on white background', () => {
        const result = testColorCombination(
          FLEETGUARD_COLORS.primary[600],
          FLEETGUARD_COLORS.white,
          'Primary Blue',
          'White'
        );
        expect(result.passesAA).toBe(true);
        expect(result.ratio).toBeGreaterThanOrEqual(4.5);
      });

      it('should meet WCAG AA when white text is used on primary blue background', () => {
        const result = testColorCombination(
          FLEETGUARD_COLORS.white,
          FLEETGUARD_COLORS.primary[600],
          'White',
          'Primary Blue'
        );
        expect(result.passesAA).toBe(true);
        expect(result.ratio).toBeGreaterThanOrEqual(4.5);
      });
    });

    describe('Success Green (#10B981)', () => {
      it('should calculate contrast ratio for success-500 on white', () => {
        const result = testColorCombination(
          FLEETGUARD_COLORS.success[500],
          FLEETGUARD_COLORS.white,
          'Success 500',
          'White'
        );
        // Success-500 has lower contrast (~2.54:1), use darker background or 700+ for text
        expect(result.ratio).toBeGreaterThan(2.5);
        expect(result.ratio).toBeLessThan(3.0);
      });

      it('should calculate contrast ratio for success-600 on white', () => {
        const result = testColorCombination(
          FLEETGUARD_COLORS.success[600],
          FLEETGUARD_COLORS.white,
          'Success 600',
          'White'
        );
        // Success-600 has moderate contrast (~3.77:1), better for text but still below AA
        expect(result.ratio).toBeGreaterThan(3.5);
        expect(result.ratio).toBeLessThan(4.5);
      });
    });

    describe('Error Red (#EF4444)', () => {
      it('should calculate contrast ratio for error-500 on white', () => {
        const result = testColorCombination(
          FLEETGUARD_COLORS.error[500],
          FLEETGUARD_COLORS.white,
          'Error 500',
          'White'
        );
        // Error-500 has moderate contrast, suitable for error indicators
        expect(result.ratio).toBeGreaterThan(3.5);
      });

      it('should meet good contrast for error-600 on white', () => {
        const result = testColorCombination(
          FLEETGUARD_COLORS.error[600],
          FLEETGUARD_COLORS.white,
          'Error 600',
          'White'
        );
        // Error-600 should have better contrast
        expect(result.ratio).toBeGreaterThan(4.5);
      });
    });

    describe('Warning Amber (#F59E0B)', () => {
      it('should check warning-500 contrast (may not pass AA)', () => {
        const result = testColorCombination(
          FLEETGUARD_COLORS.warning[500],
          FLEETGUARD_COLORS.white,
          'Warning 500',
          'White'
        );
        // Warning-500 typically fails AA, which is why we use it for backgrounds only
        expect(result.ratio).toBeLessThan(4.5);
      });

      it('should calculate contrast ratio for warning-600 on white', () => {
        const result = testColorCombination(
          FLEETGUARD_COLORS.warning[600],
          FLEETGUARD_COLORS.white,
          'Warning 600',
          'White'
        );
        // Warning-600 has ~3.19:1 contrast, better than 500 but still below AA for small text
        expect(result.ratio).toBeGreaterThan(3.0);
        expect(result.ratio).toBeLessThan(3.5);
      });
    });
  });

  describe('Comprehensive Color Tests', () => {
    it('should run all color contrast tests without errors', () => {
      expect(() => runColorContrastTests()).not.toThrow();
    });

    it('should return results for all test combinations', () => {
      const results = runColorContrastTests();
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((r) => typeof r.ratio === 'number')).toBe(true);
    });

    it('should run complete test suite and identify passing combinations', () => {
      const results = runColorContrastTests();
      const passingTests = results.filter((r) => r.passesAA);
      const failingTests = results.filter((r) => !r.passesAA);

      // Should have some passing tests (primary blue combinations)
      expect(passingTests.length).toBeGreaterThan(0);

      // Document which ones pass for reference
      expect(results.length).toBeGreaterThan(5);
    });
  });

  describe('testColorCombination', () => {
    it('should return complete contrast result object', () => {
      const result = testColorCombination('#2563EB', '#ffffff', 'Blue', 'White');

      expect(result).toHaveProperty('foreground');
      expect(result).toHaveProperty('background');
      expect(result).toHaveProperty('ratio');
      expect(result).toHaveProperty('passesAA');
      expect(result).toHaveProperty('passesAAA');

      expect(typeof result.ratio).toBe('number');
      expect(typeof result.passesAA).toBe('boolean');
      expect(typeof result.passesAAA).toBe('boolean');
    });

    it('should include color names in result', () => {
      const result = testColorCombination(
        '#2563EB',
        '#ffffff',
        'Primary Blue',
        'White Background'
      );

      expect(result.foreground).toContain('Primary Blue');
      expect(result.background).toContain('White Background');
    });
  });
});
