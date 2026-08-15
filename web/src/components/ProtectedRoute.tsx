import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import LoadingSpinner from './LoadingSpinner';
import { FeatureKey, useSubscription } from '../hooks/useSubscription';
import type { UserRole } from '../types/user';

interface ProtectedRouteProps { children: React.ReactNode; requiredRoles?: UserRole[]; requiredFeature?: FeatureKey; }

export default function ProtectedRoute({ children, requiredRoles, requiredFeature }: ProtectedRouteProps) {
  const { isAuthenticated, user, checkSession } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);
  const location = useLocation();
  const publicPaths = new Set(['/','/login','/signup','/join','/password-reset','/reset-password']);
  const isPublicRoute = publicPaths.has(location.pathname);
  const subscription = useSubscription();

  useEffect(() => { checkSession().finally(() => setIsChecking(false)); }, [checkSession]);

  if (isPublicRoute) return <>{children}</>;
  if (isChecking || (isAuthenticated && requiredFeature && subscription.loading)) return <div className="grid min-h-screen place-items-center bg-slate-50 dark:bg-slate-950"><LoadingSpinner size="lg" /></div>;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  if (requiredRoles && user && !requiredRoles.includes(user.role)) return <Navigate to="/forbidden" replace />;
  if (requiredFeature && !subscription.hasFeature(requiredFeature)) return <Navigate to="/subscription" state={{ blockedFeature: requiredFeature }} replace />;
  return <>{children}</>;
}
