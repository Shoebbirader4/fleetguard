import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-bold text-gray-900 dark:text-gray-100">404</h1>
        <p className="text-xl text-gray-600 dark:text-gray-400">Page not found</p>
        <Link to="/" className="btn-primary inline-block">
          Go Home
        </Link>
      </div>
    </div>
  );
}
