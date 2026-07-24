import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user, checkSession } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const verifySession = async () => {
      await checkSession();
      setIsChecking(false);
    };
    verifySession();
  }, [checkSession]);

  // Show loading state while checking session
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role-based access if roles are specified
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className="card max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-danger-600 dark:text-danger-400 mb-4">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You do not have permission to access this page.
          </p>
          <button
            onClick={() => window.history.back()}
            className="btn-primary"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
