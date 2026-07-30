/**
 * Protected Route Component
 * 
 * Wraps routes that require authentication and/or specific roles.
 * 
 * Requirements:
 * - 6.1: Check authentication status using useAuth hook
 * - 6.2: Redirect to /login if not authenticated
 * - 6.2: Redirect to /forbidden if user lacks required role
 * - 6.5: Show LoadingSpinner while checking auth
 */

import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import LoadingSpinner from './LoadingSpinner';
import type { UserRole } from '../types/user';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: UserRole[];
}

export default function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
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

  // Show loading state while checking session (Requirement 6.5)
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Redirect to login if not authenticated (Requirement 6.2)
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Redirect to forbidden page if user lacks required role (Requirement 6.2)
  if (requiredRoles && user && !requiredRoles.includes(user.role)) {
    return <Navigate to="/forbidden" replace />;
  }

  return <>{children}</>;
}
