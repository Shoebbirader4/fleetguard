/**
 * ErrorBoundary Component Tests
 * 
 * Tests error boundary functionality for catching component crashes
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';

// Component that throws an error
function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
}

// Suppress console.error during tests to avoid cluttering test output
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('ErrorBoundary', () => {
  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('should catch errors and display fallback UI', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/We encountered an unexpected error/)).toBeInTheDocument();
  });

  it('should display Try Again button', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('should display Go to Dashboard button', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByRole('button', { name: /go to dashboard/i })).toBeInTheDocument();
  });

  it('should call onReset when Try Again is clicked', () => {
    const onReset = vi.fn();
    
    const { rerender } = render(
      <ErrorBoundary onReset={onReset}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const tryAgainButton = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(tryAgainButton);

    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('should render custom fallback when provided', () => {
    const customFallback = <div>Custom error message</div>;
    
    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('should reset error state when Try Again is clicked', () => {
    const TestComponent = ({ throwError }: { throwError: boolean }) => {
      if (throwError) {
        throw new Error('Test error');
      }
      return <div>No error</div>;
    };

    const Wrapper = ({ shouldError }: { shouldError: boolean }) => {
      const [hasError, setHasError] = React.useState(shouldError);
      
      return (
        <ErrorBoundary onReset={() => setHasError(false)}>
          <TestComponent throwError={hasError} />
        </ErrorBoundary>
      );
    };
    
    const { rerender } = render(<Wrapper shouldError={true} />);

    // Error boundary should show
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Click Try Again - this will reset the error state
    const tryAgainButton = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(tryAgainButton);

    // Re-render without error
    rerender(<Wrapper shouldError={false} />);

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('should display error icon', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Check for SVG icon by checking the viewBox attribute
    const svg = screen.getByText('Something went wrong').closest('div')?.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
  });

  it('should display help text', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/If the problem persists/)).toBeInTheDocument();
  });
});
