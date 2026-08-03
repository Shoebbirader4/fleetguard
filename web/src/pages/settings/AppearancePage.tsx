import { useThemeStore } from '../../stores/themeStore';

export default function AppearancePage() {
  const { theme, setTheme } = useThemeStore();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-soft">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-3xl font-bold leading-tight text-gray-900 dark:text-gray-100">
              Appearance
            </h1>
            <p className="mt-1 text-sm font-normal leading-normal text-gray-600 dark:text-gray-400">
              Customize the visual appearance of your application
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="card">
          <h2 className="text-xl font-semibold leading-snug text-gray-900 dark:text-gray-100 mb-4">
            Theme Mode
          </h2>
          <p className="text-sm font-normal leading-normal text-gray-600 dark:text-gray-400 mb-6">
            Select your preferred color theme for the interface
          </p>

          <div className="space-y-3">
            {/* Light Theme Option */}
            <label className="flex items-start gap-4 p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:border-primary-500 dark:hover:border-primary-500 transition-colors">
              <input
                type="radio"
                name="theme"
                value="light"
                checked={theme === 'light'}
                onChange={() => setTheme('light')}
                className="mt-1 w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
              />
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-white border-2 border-gray-300 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-yellow-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-normal leading-normal font-semibold text-gray-900 dark:text-gray-100">
                      Light Mode
                    </h3>
                    <p className="text-sm font-normal leading-normal text-gray-600 dark:text-gray-400">
                      Clean and bright interface optimized for daytime use
                    </p>
                  </div>
                </div>
                {theme === 'light' && (
                  <div className="ml-[52px] mt-2 flex items-center gap-2 text-sm font-normal leading-normal text-primary-600 dark:text-primary-400">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="font-medium">Currently active</span>
                  </div>
                )}
              </div>
            </label>

            {/* Dark Theme Option */}
            <label className="flex items-start gap-4 p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:border-primary-500 dark:hover:border-primary-500 transition-colors">
              <input
                type="radio"
                name="theme"
                value="dark"
                checked={theme === 'dark'}
                onChange={() => setTheme('dark')}
                className="mt-1 w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
              />
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-gray-800 border-2 border-gray-600 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-blue-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-normal leading-normal font-semibold text-gray-900 dark:text-gray-100">
                      Dark Mode
                    </h3>
                    <p className="text-sm font-normal leading-normal text-gray-600 dark:text-gray-400">
                      Reduced eye strain for low-light environments and nighttime use
                    </p>
                  </div>
                </div>
                {theme === 'dark' && (
                  <div className="ml-[52px] mt-2 flex items-center gap-2 text-sm font-normal leading-normal text-primary-600 dark:text-primary-400">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="font-medium">Currently active</span>
                  </div>
                )}
              </div>
            </label>
          </div>

          {/* Info Box */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
              About Theme Settings
            </h4>
            <ul className="text-xs font-normal leading-tight text-blue-800 dark:text-blue-300 space-y-1">
              <li>• Your theme preference is saved automatically and persists across sessions</li>
              <li>• Dark mode can help reduce eye strain during extended use</li>
              <li>• Theme changes apply instantly without requiring a page reload</li>
            </ul>
          </div>
        </div>

        {/* Preview Section */}
        <div className="card mt-6">
          <h2 className="text-xl font-semibold leading-snug text-gray-900 dark:text-gray-100 mb-4">
            Theme Preview
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Preview Card 1 */}
            <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Sample Card
              </h3>
              <p className="text-xs font-normal leading-tight text-gray-600 dark:text-gray-400 mb-3">
                This is how cards and content will appear in the selected theme.
              </p>
              <button className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-normal leading-tight rounded transition-colors">
                Primary Button
              </button>
            </div>

            {/* Preview Card 2 */}
            <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  FG
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    FleetGuard AI
                  </div>
                  <div className="text-xs font-normal leading-tight text-gray-600 dark:text-gray-400">
                    Fleet Management System
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs font-normal leading-tight rounded">
                  Active
                </span>
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs font-normal leading-tight rounded">
                  Premium
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
