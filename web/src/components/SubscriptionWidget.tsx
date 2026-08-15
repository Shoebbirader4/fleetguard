import { Link } from 'react-router-dom';
import { useSubscription } from '../hooks/useSubscription';

/**
 * Subscription status widget for dashboard
 * Shows vehicle usage vs limit and upgrade CTA
 * Requirements: 18.2, 18.3, 18.4
 */
export default function SubscriptionWidget() {
  const { loading, error, canAddVehicle, currentCount, vehicleLimit, subscriptionPlan } = useSubscription();

  if (loading) {
    return (
      <div className="card animate-pulse">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
      </div>
    );
  }

  if (error) {
    // Show a minimal error state without disrupting the dashboard
    return (
      <div className="card border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold leading-snug text-gray-900 dark:text-gray-100 mb-2">Subscription</h3>
        <p className="text-sm font-normal leading-normal text-gray-500 dark:text-gray-400">
          Unable to load subscription status
        </p>
      </div>
    );
  }

  const usagePercentage = vehicleLimit ? (currentCount / vehicleLimit) * 100 : 0;
  const isNearLimit = usagePercentage >= 90;
  const isAtLimit = !canAddVehicle;

  const getProgressBarColor = () => {
    if (isAtLimit) return 'bg-red-600';
    if (isNearLimit) return 'bg-yellow-500';
    return 'bg-green-600';
  };

  const getStatusColor = () => {
    if (isAtLimit) return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
    if (isNearLimit) return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400';
    return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400';
  };

  return (
    <div className={`card ${isAtLimit ? 'border-red-200 dark:border-red-800' : isNearLimit ? 'border-yellow-200 dark:border-yellow-800' : ''}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold leading-snug text-gray-900 dark:text-gray-100">Subscription</h3>
        <span className={`px-2 py-1 rounded-full text-xs font-normal leading-tight font-semibold capitalize ${getStatusColor()}`}>
          {subscriptionPlan}
        </span>
      </div>

      <div className="mb-3">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-normal leading-normal text-gray-600 dark:text-gray-400">Vehicle Usage</span>
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {currentCount} / {vehicleLimit ?? '∞'}
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${getProgressBarColor()}`}
            style={{ width: `${Math.min(usagePercentage, 100)}%` }}
          ></div>
        </div>
      </div>

      {isAtLimit && (
        <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm font-normal leading-normal text-red-800 dark:text-red-200 font-medium mb-2">
            Vehicle limit reached!
          </p>
          <p className="text-xs font-normal leading-tight text-red-700 dark:text-red-300">
            Upgrade your plan to add more vehicles and unlock advanced features.
          </p>
        </div>
      )}

      {!isAtLimit && isNearLimit && (
        <div className="mb-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm font-normal leading-normal text-yellow-800 dark:text-yellow-200 font-medium">
            Approaching limit ({usagePercentage.toFixed(0)}% used)
          </p>
        </div>
      )}

      <Link
        to="/subscription"
        className="block w-full px-4 py-2 text-center text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 border border-blue-600 dark:border-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
      >
        {isAtLimit || isNearLimit ? 'Upgrade Plan' : 'Manage Subscription'}
      </Link>
    </div>
  );
}
