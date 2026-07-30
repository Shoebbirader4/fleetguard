import React from 'react';
import LoadingSpinner from './LoadingSpinner';

/**
 * LoadingSpinner Examples
 * 
 * Demonstrates different use cases for the LoadingSpinner component
 */

export default function LoadingSpinnerExamples() {
  return (
    <div className="p-8 space-y-8">
      <section>
        <h2 className="text-xl font-semibold mb-4">Size Variants</h2>
        <div className="flex items-center gap-8">
          <div className="text-center">
            <LoadingSpinner size="sm" />
            <p className="text-sm text-gray-600 mt-2">Small</p>
          </div>
          <div className="text-center">
            <LoadingSpinner size="md" />
            <p className="text-sm text-gray-600 mt-2">Medium (default)</p>
          </div>
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="text-sm text-gray-600 mt-2">Large</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Loading States</h2>
        
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
            <h3 className="font-medium mb-2">Button with Loading</h3>
            <button
              disabled
              className="bg-blue-600 text-white font-medium px-4 py-2 rounded-lg flex items-center gap-2 opacity-50 cursor-not-allowed"
            >
              <LoadingSpinner size="sm" className="border-white" />
              Loading...
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
            <h3 className="font-medium mb-2">Centered Page Loading</h3>
            <div className="flex items-center justify-center h-32">
              <LoadingSpinner size="lg" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
            <h3 className="font-medium mb-2">Inline Loading</h3>
            <p className="flex items-center gap-2">
              <LoadingSpinner size="sm" />
              <span className="text-gray-600 dark:text-gray-400">Fetching data...</span>
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
            <h3 className="font-medium mb-2">Card Loading State</h3>
            <div className="flex flex-col items-center justify-center py-8">
              <LoadingSpinner size="md" />
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Loading vehicles...</p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Dark Mode Support</h2>
        <div className="bg-gray-900 p-6 rounded-lg">
          <div className="flex items-center gap-8">
            <div className="text-center">
              <LoadingSpinner size="sm" />
              <p className="text-sm text-gray-300 mt-2">Small</p>
            </div>
            <div className="text-center">
              <LoadingSpinner size="md" />
              <p className="text-sm text-gray-300 mt-2">Medium</p>
            </div>
            <div className="text-center">
              <LoadingSpinner size="lg" />
              <p className="text-sm text-gray-300 mt-2">Large</p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Usage in Forms</h2>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Enter email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input
                type="password"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Enter password"
              />
            </div>
            <button
              type="submit"
              disabled
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg flex items-center justify-center gap-2 opacity-50 cursor-not-allowed"
            >
              <LoadingSpinner size="sm" className="border-white" />
              Submitting...
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
