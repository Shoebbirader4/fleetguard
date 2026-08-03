/**
 * useAriaLive Hook
 * 
 * Custom hook for announcing dynamic content updates to screen readers.
 * Creates and manages ARIA live regions.
 * 
 * Task 30.2 - Add screen reader support
 * Requirements: 5.2, 5.8
 */

import { useEffect, useRef } from 'react';

type PolitenessLevel = 'polite' | 'assertive' | 'off';

export function useAriaLive(
  message: string,
  politeness: PolitenessLevel = 'polite',
  clearAfter: number = 3000
) {
  const liveRegionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Create live region if it doesn't exist
    if (!liveRegionRef.current) {
      const region = document.createElement('div');
      region.setAttribute('role', 'status');
      region.setAttribute('aria-live', politeness);
      region.setAttribute('aria-atomic', 'true');
      region.className = 'sr-only';
      document.body.appendChild(region);
      liveRegionRef.current = region;
    }

    // Update message
    if (message && liveRegionRef.current) {
      liveRegionRef.current.textContent = message;

      // Clear message after delay
      if (clearAfter > 0) {
        const timeout = setTimeout(() => {
          if (liveRegionRef.current) {
            liveRegionRef.current.textContent = '';
          }
        }, clearAfter);

        return () => clearTimeout(timeout);
      }
    }

    // Cleanup on unmount
    return () => {
      if (liveRegionRef.current && liveRegionRef.current.parentNode) {
        liveRegionRef.current.parentNode.removeChild(liveRegionRef.current);
        liveRegionRef.current = null;
      }
    };
  }, [message, politeness, clearAfter]);
}

/**
 * Hook for managing focus trapping within a container
 */
export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTab);
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleTab);
    };
  }, [isActive]);

  return containerRef;
}
