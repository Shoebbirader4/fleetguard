/**
 * ErrorBoundary Component
 * 
 * Catches React errors in component tree and displays user-friendly fallback UI.
 * 
 * Requirements:
 * - 5.4: Display user-friendly error messages
 * - 5.6: Catch component crashes and provide recovery options
 * 
 * Features:
 * - Catches rendering errors, lifecycle errors, and constructor errors
 * - Logs errors for debugging
 * - Provides "Try Again" and "Go to Dashboard" recovery buttons
 * - Shows different UI for development vs production
 */

import React, { Component, ReactNode } from 'react';
import { logError } from '../utils/errorHandler';
import Button from './Button';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error details for debugging
    logError(error, 'ErrorBoundary');
    
    // Store error info in state
    this.setState({
      error,
      errorInfo,
    });

    // In production, you could send this to an error tracking service
    // Example: Sentry.captureException(error, { extra: errorInfo });
  }

  handleReset = (): void => {
    // Reset error state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    // Call optional reset callback
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleGoToDashboard = (): void => {
    // Reset error state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    // Navigate to dashboard
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
          <div className="max-w-md w-full">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 border border-gray-200 dark:border-gray-700">
              {/* Error Icon */}
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-red-600 dark:text-red-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
              </div>

              {/* Error Title */}
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-4">
                Something went wrong
              </h1>

              {/* Error Message */}
              <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
                We encountered an unexpected error. Don't worry, your data is safe.
                You can try again or return to the dashboard.
              </p>

              {/* Development Mode: Show Error Details */}
              {import.meta.env.DEV && this.state.error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm font-semibold text-red-800 dark:text-red-400 mb-2">
                    Error Details (Development Only):
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-300 font-mono break-all">
                    {this.state.error.toString()}
                  </p>
                  {this.state.errorInfo && (
                    <details className="mt-2">
                      <summary className="text-xs text-red-600 dark:text-red-400 cursor-pointer">
                        Component Stack
                      </summary>
                      <pre className="mt-2 text-xs text-red-700 dark:text-red-300 overflow-auto max-h-40">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={this.handleReset}
                  variant="primary"
                  className="flex-1"
                >
                  Try Again
                </Button>
                <Button
                  onClick={this.handleGoToDashboard}
                  variant="secondary"
                  className="flex-1"
                >
                  Go to Dashboard
                </Button>
              </div>

              {/* Help Text */}
              <p className="text-xs text-gray-500 dark:text-gray-500 text-center mt-6">
                If the problem persists, please contact support with the error details.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
