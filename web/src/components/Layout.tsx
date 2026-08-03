import { ReactNode } from 'react';
import Navigation from './Navigation';
import ErrorBoundary from './ErrorBoundary';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      {/* Main content with left margin on desktop to account for sidebar */}
      <div className="lg:pl-64">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </div>
    </div>
  );
}
