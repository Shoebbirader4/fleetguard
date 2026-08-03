/**
 * Skip Link Component
 * 
 * Provides keyboard users the ability to skip to main content.
 * This is an essential accessibility feature for screen reader users.
 * 
 * Task 30.1 - Ensure keyboard navigation works
 * Requirements: 5.2, 5.8
 */

export default function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
    >
      Skip to main content
    </a>
  );
}
