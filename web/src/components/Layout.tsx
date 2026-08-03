/**
 * Layout Component
 * 
 * Main application layout with navigation and content area.
 * Enhanced with semantic HTML and skip link for accessibility.
 * 
 * Task 30.1, 30.2 - Keyboard navigation and screen reader support
 * Requirements: 5.2, 5.8
 */

import { ReactNode } from 'react';
import Navigation from './Navigation';
import ErrorBoundary from './ErrorBoundary';
import SkipLink from './SkipLink';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <SkipLink />
      <Navigation />
      {/* Main content with left margin on desktop to account for sidebar */}
      <main id="main-content" className="lg:pl-64" tabIndex={-1}>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </main>
    </div>
  );
}
