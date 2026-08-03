/**
 * Color Contrast Utility for WCAG AA Compliance
 * FleetGuard AI Design System
 * 
 * This utility helps verify that color combinations meet WCAG AA standards (4.5:1 contrast ratio)
 */

interface Color {
  name: string;
  hex: string;
  usage: string;
}

interface ContrastResult {
  foreground: string;
  background: string;
  ratio: number;
  passesAA: boolean;
  passesAAA: boolean;
}

/**
 * Convert hex color to RGB values
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Calculate relative luminance of a color
 * Based on WCAG 2.1 specification
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((val) => {
    val = val / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 * Returns a ratio value (1:1 to 21:1)
 */
export function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) {
    throw new Error('Invalid color format. Use hex format (#RRGGBB)');
  }

  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast ratio meets WCAG AA standard (4.5:1 for normal text)
 */
export function meetsWCAG_AA(ratio: number): boolean {
  return ratio >= 4.5;
}

/**
 * Check if contrast ratio meets WCAG AAA standard (7:1 for normal text)
 */
export function meetsWCAG_AAA(ratio: number): boolean {
  return ratio >= 7.0;
}

/**
 * Test a color combination
 */
export function testColorCombination(
  foreground: string,
  background: string,
  foregroundName: string = 'Foreground',
  backgroundName: string = 'Background'
): ContrastResult {
  const ratio = getContrastRatio(foreground, background);

  return {
    foreground: `${foregroundName} (${foreground})`,
    background: `${backgroundName} (${background})`,
    ratio: Math.round(ratio * 100) / 100,
    passesAA: meetsWCAG_AA(ratio),
    passesAAA: meetsWCAG_AAA(ratio),
  };
}

/**
 * FleetGuard AI Color Palette
 */
export const FLEETGUARD_COLORS = {
  // Primary Blue
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb', // FleetGuard AI Primary
    700: '#1d4ed8',
    800: '#1e40af', // FleetGuard AI Primary Dark
    900: '#1e3a8a',
  },
  // Success Green
  success: {
    500: '#10b981',
    600: '#059669',
  },
  // Warning Amber
  warning: {
    500: '#f59e0b',
    600: '#d97706',
  },
  // Error Red
  error: {
    500: '#ef4444',
    600: '#dc2626',
  },
  // Neutral
  white: '#ffffff',
  black: '#000000',
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    900: '#111827',
  },
};

/**
 * Run comprehensive color contrast tests for FleetGuard AI palette
 */
export function runColorContrastTests(): ContrastResult[] {
  const tests: ContrastResult[] = [];

  // Primary Blue on White
  tests.push(
    testColorCombination(
      FLEETGUARD_COLORS.primary[600],
      FLEETGUARD_COLORS.white,
      'Primary Blue (600)',
      'White'
    )
  );

  // White on Primary Blue
  tests.push(
    testColorCombination(
      FLEETGUARD_COLORS.white,
      FLEETGUARD_COLORS.primary[600],
      'White',
      'Primary Blue (600)'
    )
  );

  // Primary Dark on White
  tests.push(
    testColorCombination(
      FLEETGUARD_COLORS.primary[800],
      FLEETGUARD_COLORS.white,
      'Primary Dark (800)',
      'White'
    )
  );

  // Success Green on White
  tests.push(
    testColorCombination(
      FLEETGUARD_COLORS.success[500],
      FLEETGUARD_COLORS.white,
      'Success (500)',
      'White'
    )
  );

  tests.push(
    testColorCombination(
      FLEETGUARD_COLORS.success[600],
      FLEETGUARD_COLORS.white,
      'Success (600)',
      'White'
    )
  );

  // Error Red on White
  tests.push(
    testColorCombination(
      FLEETGUARD_COLORS.error[500],
      FLEETGUARD_COLORS.white,
      'Error (500)',
      'White'
    )
  );

  tests.push(
    testColorCombination(
      FLEETGUARD_COLORS.error[600],
      FLEETGUARD_COLORS.white,
      'Error (600)',
      'White'
    )
  );

  // Warning Amber on White
  tests.push(
    testColorCombination(
      FLEETGUARD_COLORS.warning[500],
      FLEETGUARD_COLORS.white,
      'Warning (500)',
      'White'
    )
  );

  tests.push(
    testColorCombination(
      FLEETGUARD_COLORS.warning[600],
      FLEETGUARD_COLORS.white,
      'Warning (600)',
      'White'
    )
  );

  return tests;
}

/**
 * Log color contrast test results to console
 */
export function logColorContrastTests(): void {
  console.group('🎨 FleetGuard AI Color Contrast Tests (WCAG AA)');

  const results = runColorContrastTests();

  results.forEach((result) => {
    const status = result.passesAA ? '✅ PASS' : '❌ FAIL';
    const level = result.passesAAA ? 'AAA' : result.passesAA ? 'AA' : 'FAIL';

    console.log(
      `${status} ${result.foreground} on ${result.background}: ${result.ratio}:1 (${level})`
    );
  });

  console.groupEnd();

  const allPass = results.every((r) => r.passesAA);

  if (allPass) {
    console.log('✅ All color combinations meet WCAG AA standards!');
  } else {
    console.warn('⚠️ Some color combinations do not meet WCAG AA standards.');
  }
}

/**
 * Get recommended color for text based on background
 */
export function getRecommendedTextColor(backgroundColor: string): string {
  const rgb = hexToRgb(backgroundColor);
  if (!rgb) return FLEETGUARD_COLORS.black;

  const luminance = getLuminance(rgb.r, rgb.g, rgb.b);

  // If background is light, use dark text. If dark, use light text.
  return luminance > 0.5 ? FLEETGUARD_COLORS.black : FLEETGUARD_COLORS.white;
}
