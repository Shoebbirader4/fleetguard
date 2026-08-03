/**
 * Centralized design system style patterns for FleetGuard AI
 * 
 * This file provides standardized class name patterns for consistent styling
 * across the application. All patterns support light and dark themes.
 * 
 * Task 27.2 - Standardize component styling
 * Requirements: 5.1, 5.2
 * 
 * DEPRECATION NOTICE: This file is maintained for backward compatibility.
 * New code should use the standardized components (Button, Card, Input, Badge, etc.)
 * and the design system configuration from config/designSystem.ts
 */

// Import from design system for consistency
import { BUTTON_CLASSES, CARD_CLASSES, INPUT_CLASSES, BADGE_CLASSES } from '../config/designSystem';

/**
 * Button variant styles
 * @deprecated Use Button component from components/Button.tsx instead
 */
export const buttonStyles = BUTTON_CLASSES;

/**
 * Card variants for different use cases
 * @deprecated Use Card component from components/Card.tsx instead
 */
export const cardVariants = {
  default: CARD_CLASSES.default,
  hover: CARD_CLASSES.default,
  info: 'bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-6',
  warning: 'bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800 p-6',
  success: 'bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 p-6',
  error: 'bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 p-6',
  compact: CARD_CLASSES.compact,
  elevated: CARD_CLASSES.elevated,
} as const;

/**
 * @deprecated Use Card component instead
 */
export const cardStyles = CARD_CLASSES.default;

/**
 * Form input styling pattern
 * @deprecated Use Input component from components/Input.tsx instead
 */
export const inputStyles = INPUT_CLASSES.default;

/**
 * Select/dropdown styling pattern
 * @deprecated Use Select component from components/Select.tsx instead
 */
export const selectStyles = INPUT_CLASSES.default;

/**
 * Textarea styling pattern
 * @deprecated Use Textarea component from components/Textarea.tsx instead
 */
export const textareaStyles = `${INPUT_CLASSES.default} resize-none`;

/**
 * Badge styling patterns
 * @deprecated Use Badge component from components/Badge.tsx instead
 */
export const badgeStyles = {
  default: BADGE_CLASSES.blue,
  success: BADGE_CLASSES.success,
  warning: BADGE_CLASSES.warning,
  error: BADGE_CLASSES.error,
  info: BADGE_CLASSES.info,
  neutral: BADGE_CLASSES.gray,
  purple: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
} as const;

/**
 * Status badge helper
 * @deprecated Use Badge component with context="status" instead
 */
export const getStatusBadgeStyle = (status: string): string => {
  const statusMap: Record<string, keyof typeof badgeStyles> = {
    active: 'success',
    inactive: 'neutral',
    pending: 'warning',
    completed: 'success',
    cancelled: 'error',
    assigned: 'info',
    in_progress: 'warning',
    approved: 'success',
    rejected: 'error',
    draft: 'neutral',
  };
  
  const variant = statusMap[status.toLowerCase()] || 'default';
  return badgeStyles[variant];
};

/**
 * Priority badge helper
 * @deprecated Use Badge component with context="priority" instead
 */
export const getPriorityBadgeStyle = (priority: string): string => {
  const priorityMap: Record<string, keyof typeof badgeStyles> = {
    critical: 'error',
    high: 'warning',
    medium: 'info',
    low: 'neutral',
  };
  
  const variant = priorityMap[priority.toLowerCase()] || 'default';
  return badgeStyles[variant];
};

/**
 * Helper function to get button classes
 * @deprecated Use Button component instead
 */
export const getButtonClass = (variant: keyof typeof buttonStyles = 'primary', additionalClasses?: string): string => {
  return `${buttonStyles[variant]} ${additionalClasses || ''}`.trim();
};

/**
 * Helper function to get card classes
 * @deprecated Use Card component instead
 */
export const getCardClass = (variant: keyof typeof cardVariants = 'default', additionalClasses?: string): string => {
  return `${cardVariants[variant]} ${additionalClasses || ''}`.trim();
};

/**
 * Helper function to get badge classes
 * @deprecated Use Badge component instead
 */
export const getBadgeClass = (variant: keyof typeof badgeStyles = 'default', additionalClasses?: string): string => {
  return `${badgeStyles[variant]} ${additionalClasses || ''}`.trim();
};

// ============================================================================
// LAYOUT & STRUCTURE PATTERNS (Not components, used for page structure)
// ============================================================================

/**
 * Page container patterns - these are layout utilities, not replaceable by components
 */
export const pageStyles = {
  container: 'min-h-screen bg-gray-50 dark:bg-gray-900',
  header: 'bg-white dark:bg-gray-800 shadow-sm',
  headerContent: 'max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8',
  mainContent: 'max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8',
} as const;

/**
 * Modal styling patterns
 */
export const modalStyles = {
  overlay: 'fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4',
  container: 'bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4',
  containerLarge: 'bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto',
  icon: {
    info: 'mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20',
    success: 'mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20',
    warning: 'mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/20',
    error: 'mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20',
  },
} as const;

/**
 * Loading spinner pattern
 */
export const spinnerStyles = 'inline-block animate-spin rounded-full border-b-2 border-blue-600';

/**
 * Helper to get spinner with size
 */
export const getSpinnerClass = (size: 'sm' | 'md' | 'lg' = 'md'): string => {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-8 w-8',
  };
  return `${spinnerStyles} ${sizes[size]}`;
};

/**
 * Table styling patterns
 */
export const tableStyles = {
  container: 'bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden',
  table: 'min-w-full divide-y divide-gray-200 dark:divide-gray-700',
  thead: 'bg-gray-50 dark:bg-gray-700',
  th: 'px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider',
  tbody: 'bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700',
  td: 'px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100',
  tdSecondary: 'px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400',
} as const;

/**
 * Form label pattern
 */
export const labelStyles = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

/**
 * Form error message pattern
 */
export const errorMessageStyles = 'mt-1 text-sm text-red-600 dark:text-red-400';

/**
 * Link pattern
 */
export const linkStyles = 'text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline transition-colors';

/**
 * Divider pattern
 */
export const dividerStyles = 'border-t border-gray-200 dark:border-gray-700';

/**
 * Section heading patterns
 */
export const headingStyles = {
  h1: 'text-2xl font-bold text-gray-900 dark:text-gray-100',
  h2: 'text-xl font-semibold text-gray-900 dark:text-gray-100',
  h3: 'text-lg font-medium text-gray-900 dark:text-gray-100',
  h4: 'text-base font-medium text-gray-900 dark:text-gray-100',
} as const;

/**
 * Common spacing utilities
 */
export const spacingStyles = {
  sectionGap: 'space-y-6',
  cardGap: 'space-y-4',
  formGap: 'space-y-4',
  buttonGap: 'space-x-3',
} as const;
