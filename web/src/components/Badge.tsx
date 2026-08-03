/**
 * Badge Component
 * 
 * Standardized badge component for status indicators with semantic colors.
 * Automatically applies appropriate colors based on status values.
 * 
 * Task 27.2 - Standardize component styling
 * Requirements: 5.1, 5.2
 */

import { HTMLAttributes } from 'react';
import { BADGE_CLASSES, getBadgeColor, getPriorityBadgeColor } from '../config/designSystem';

type BadgeVariant = 'default' | 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'success' | 'warning' | 'error' | 'info';
type BadgeContext = 'status' | 'priority' | 'custom';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  context?: BadgeContext;
  value?: string;
}

export default function Badge({ 
  children, 
  variant, 
  context = 'custom', 
  value, 
  className = '', 
  ...props 
}: BadgeProps) {
  let badgeClass: string = BADGE_CLASSES.default;
  
  // Determine badge class based on context
  if (context === 'status' && value) {
    badgeClass = getBadgeColor(value);
  } else if (context === 'priority' && value) {
    badgeClass = getPriorityBadgeColor(value);
  } else if (variant) {
    badgeClass = BADGE_CLASSES[variant] || BADGE_CLASSES.default;
  }
  
  return (
    <span className={`${badgeClass} ${className}`} {...props}>
      {children}
    </span>
  );
}
