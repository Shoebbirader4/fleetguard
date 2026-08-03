/**
 * ErrorBoundary Component Examples
 * 
 * Demonstrates various usage patterns for the ErrorBoundary component
 */

import ErrorBoundary from './ErrorBoundary';
import Button from './Button';
import { useState } from 'react';

// Example 1: Basic Usage
export function BasicExample() {
  return (
    <ErrorBoundary>
      <div className="p-4">
        <h2 className="text-xl font-bold mb-4">Protected Content</h2>
        <p>This content is wrapped in an error boundary.</p>
      </div>
    </ErrorBoundary>
  );
}

// Example 2: Component That Throws Error
function ProblematicComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Something went wrong in this component!');
  }
  return <div>Component rendered successfully</div>;
}

export function ErrorExample() {
  const [throwError, setThrowError] = useState(false);

  return (
    <div className="p-4">
      <Button onClick={() => setThrowError(true)} className="mb-4">
        Trigger Error
      </Button>
      <ErrorBoundary>
        <ProblematicComponent shouldThrow={throwError} />
      </ErrorBoundary>
    </div>
  );
}

// Example 3: Custom Fallback
export function CustomFallbackExample() {
  const customFallback = (
    <div className="p-8 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-400 rounded-lg">
      <h3 className="text-lg font-bold text-yellow-800 dark:text-yellow-400 mb-2">
        Custom Error Message
      </h3>
      <p className="text-yellow-700 dark:text-yellow-300">
        This is a custom fallback UI for this specific component.
      </p>
    </div>
  );

  return (
    <ErrorBoundary fallback={customFallback}>
      <ProblematicComponent shouldThrow={true} />
    </ErrorBoundary>
  );
}

// Example 4: With Reset Callback
export function ResetCallbackExample() {
  const [count, setCount] = useState(0);
  const [throwError, setThrowError] = useState(false);

  const handleReset = () => {
    console.log('Resetting app state...');
    setCount(0);
    setThrowError(false);
  };

  return (
    <div className="p-4">
      <div className="mb-4">
        <p className="mb-2">Counter: {count}</p>
        <Button onClick={() => setCount(count + 1)} className="mr-2">
          Increment
        </Button>
        <Button onClick={() => setThrowError(true)} variant="danger">
          Trigger Error
        </Button>
      </div>
      <ErrorBoundary onReset={handleReset}>
        <ProblematicComponent shouldThrow={throwError} />
      </ErrorBoundary>
    </div>
  );
}

// Example 5: Nested Error Boundaries
function SidebarComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Sidebar error!');
  }
  return (
    <div className="p-4 bg-blue-50 dark:bg-blue-900/20">
      <h3 className="font-bold mb-2">Sidebar</h3>
      <ul>
        <li>Menu Item 1</li>
        <li>Menu Item 2</li>
        <li>Menu Item 3</li>
      </ul>
    </div>
  );
}

function MainContent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Main content error!');
  }
  return (
    <div className="p-4">
      <h3 className="font-bold mb-2">Main Content</h3>
      <p>This is the main content area.</p>
    </div>
  );
}

export function NestedErrorBoundariesExample() {
  const [sidebarError, setSidebarError] = useState(false);
  const [mainError, setMainError] = useState(false);

  const sidebarFallback = (
    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
      <p className="text-sm text-red-600 dark:text-red-400">Sidebar failed to load</p>
    </div>
  );

  return (
    <div className="p-4">
      <div className="mb-4 space-x-2">
        <Button onClick={() => setSidebarError(true)} variant="secondary">
          Break Sidebar
        </Button>
        <Button onClick={() => setMainError(true)} variant="secondary">
          Break Main Content
        </Button>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {/* Sidebar with isolated error boundary */}
        <div className="col-span-1">
          <ErrorBoundary fallback={sidebarFallback}>
            <SidebarComponent shouldThrow={sidebarError} />
          </ErrorBoundary>
        </div>
        {/* Main content with isolated error boundary */}
        <div className="col-span-3">
          <ErrorBoundary>
            <MainContent shouldThrow={mainError} />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}

// Example 6: Error Boundary with Async Data
function AsyncComponent({ shouldFail }: { shouldFail: boolean }) {
  const [data, setData] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    try {
      if (shouldFail) {
        throw new Error('Async operation failed');
      }
      setData('Data loaded successfully');
    } catch (err) {
      setError(err as Error);
    }
  };

  if (error) {
    throw error; // This will be caught by ErrorBoundary
  }

  return (
    <div className="p-4">
      <Button onClick={fetchData} className="mb-2">
        Load Data
      </Button>
      {data && <p className="text-green-600">{data}</p>}
    </div>
  );
}

export function AsyncErrorExample() {
  return (
    <ErrorBoundary>
      <AsyncComponent shouldFail={true} />
    </ErrorBoundary>
  );
}

// Example 7: Production vs Development Display
export function DevelopmentModeExample() {
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Development Mode Example</h2>
      <p className="mb-4 text-gray-600">
        In development mode, error boundaries show detailed error information.
        In production, they show user-friendly messages only.
      </p>
      <ErrorBoundary>
        <ProblematicComponent shouldThrow={true} />
      </ErrorBoundary>
    </div>
  );
}

// Example 8: Complete App Integration
export function CompleteAppExample() {
  const [pageError, setPageError] = useState(false);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <header className="bg-white dark:bg-gray-800 shadow">
          <div className="px-4 py-4">
            <h1 className="text-2xl font-bold">My App</h1>
          </div>
        </header>
        <main className="container mx-auto p-4">
          <ErrorBoundary>
            <div className="mb-4">
              <Button onClick={() => setPageError(true)}>
                Trigger Page Error
              </Button>
            </div>
            <ProblematicComponent shouldThrow={pageError} />
          </ErrorBoundary>
        </main>
      </div>
    </ErrorBoundary>
  );
}
