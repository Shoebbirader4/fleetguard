/**
 * Card Component
 * 
 * Standardized card component with consistent styling, shadows, and borders.
 * Supports different variants for semantic contexts and full dark mode support.
 * 
 * Task 27.2 - Standardize component styling
 * Requirements: 5.1, 5.2
 */

import { HTMLAttributes, forwardRef } from 'react';
import { CARD_CLASSES } from '../config/designSystem';

type CardVariant = 'default' | 'compact' | 'elevated';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  hover?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ children, variant = 'default', hover = false, className = '', ...props }, ref) => {
    const baseClasses = CARD_CLASSES[variant];
    const hoverClass = hover ? 'hover:shadow-md transition-shadow' : '';
    
    return (
      <div
        ref={ref}
        className={`${baseClasses} ${hoverClass} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export default Card;
