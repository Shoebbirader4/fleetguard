import { Link } from 'react-router-dom';
import { useThemeStore } from '../stores/themeStore';

export default function HomePage() {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-900 dark:to-gray-800">
      <div className="text-center space-y-6 px-4">
        <h1 className="text-5xl font-bold text-primary-900 dark:text-primary-100">
          FleetGuard AI
        </h1>
        <p className="text-xl text-gray-700 dark:text-gray-300 max-w-2xl">
          Enterprise-grade fleet maintenance management with predictive analytics
        </p>
        <div className="flex gap-4 justify-center mt-8">
          <Link to="/signup" className="btn-primary">
            Get Started
          </Link>
          <Link to="/login" className="btn-secondary">
            Sign In
          </Link>
        </div>
        <button
          onClick={toggleTheme}
          className="mt-4 px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        >
          Toggle Theme ({theme})
        </button>
      </div>
    </div>
  );
}
