import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

interface TenantSubscription {
  subscription_plan: 'starter' | 'professional' | 'enterprise';
  vehicle_limit: number;
  subscription_status: 'active' | 'suspended' | 'cancelled';
  billing_cycle: 'monthly' | 'annual';
  next_billing_date: string;
}

interface VehicleUsage {
  current_count: number;
  vehicle_limit: number;
  usage_percentage: number;
}

interface PlanFeature {
  name: string;
  starter: boolean | string;
  professional: boolean | string;
  enterprise: boolean | string;
}

const PLAN_FEATURES: PlanFeature[] = [
  { name: 'Vehicle Limit', starter: '50 vehicles', professional: '200 vehicles', enterprise: 'Unlimited' },
  { name: 'User Accounts', starter: 'Unlimited', professional: 'Unlimited', enterprise: 'Unlimited' },
  { name: 'Component Tracking', starter: true, professional: true, enterprise: true },
  { name: 'Predictive Maintenance', starter: true, professional: true, enterprise: true },
  { name: 'Multi-Channel Alerts', starter: 'Email only', professional: 'Email + Push', enterprise: 'All channels' },
  { name: 'GPS Tracking', starter: true, professional: true, enterprise: true },
  { name: 'Mobile Apps', starter: true, professional: true, enterprise: true },
  { name: 'Advanced Analytics', starter: false, professional: true, enterprise: true },
  { name: 'Custom Reports', starter: false, professional: true, enterprise: true },
  { name: 'API Access', starter: false, professional: true, enterprise: true },
  { name: 'Data Export', starter: 'Basic', professional: 'Advanced', enterprise: 'Advanced' },
  { name: 'Priority Support', starter: false, professional: true, enterprise: true },
  { name: 'Dedicated Account Manager', starter: false, professional: false, enterprise: true },
  { name: 'Custom Integrations', starter: false, professional: false, enterprise: true },
];

const PLAN_PRICING = {
  starter: { monthly: 99, annual: 990 },
  professional: { monthly: 299, annual: 2990 },
  enterprise: { monthly: 999, annual: 9990 },
};

export default function SubscriptionPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<TenantSubscription | null>(null);
  const [usage, setUsage] = useState<VehicleUsage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    if (user?.tenantId) {
      fetchSubscriptionData();
    }
  }, [user?.tenantId]);

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch tenant subscription details
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('subscription_plan, vehicle_limit, subscription_status, billing_cycle, next_billing_date')
        .eq('id', user!.tenantId)
        .single();

      if (tenantError) throw tenantError;

      setSubscription(tenantData);

      // Fetch vehicle usage
      const { count, error: countError } = await supabase
        .from('vehicles')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', user!.tenantId)
        .eq('status', 'active');

      if (countError) throw countError;

      const currentCount = count || 0;
      const usagePercentage = (currentCount / tenantData.vehicle_limit) * 100;

      setUsage({
        current_count: currentCount,
        vehicle_limit: tenantData.vehicle_limit,
        usage_percentage: usagePercentage,
      });
    } catch (err) {
      console.error('Error fetching subscription data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  const handlePlanChange = async (newPlan: 'starter' | 'professional' | 'enterprise') => {
    if (!subscription || !user?.tenantId) return;

    // Prevent downgrade if current vehicle count exceeds new plan limit
    const newLimit = newPlan === 'starter' ? 50 : newPlan === 'professional' ? 200 : 999999;
    if (usage && usage.current_count > newLimit) {
      alert(
        `Cannot downgrade to ${newPlan} plan. You have ${usage.current_count} vehicles, but the ${newPlan} plan supports only ${newLimit} vehicles. Please reduce your vehicle count first.`
      );
      return;
    }

    const confirmMessage =
      newPlan === 'enterprise' ||
      (newPlan === 'professional' && subscription.subscription_plan === 'starter')
        ? `Upgrade to ${newPlan} plan? Changes take effect immediately and you'll be billed for the new plan on your next billing date.`
        : `Downgrade to ${newPlan} plan? Your data will be retained, but vehicle creation will be limited to ${newLimit} vehicles. Changes take effect on your next billing date.`;

    if (!confirm(confirmMessage)) return;

    try {
      setUpgrading(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('tenants')
        .update({
          subscription_plan: newPlan,
          vehicle_limit: newLimit,
        })
        .eq('id', user.tenantId);

      if (updateError) throw updateError;

      alert(`Successfully changed plan to ${newPlan}. ${newPlan === 'enterprise' || (newPlan === 'professional' && subscription.subscription_plan === 'starter') ? 'You now have immediate access to new features!' : 'Changes will take effect on your next billing date.'}`);
      
      // Refresh subscription data
      await fetchSubscriptionData();
    } catch (err) {
      console.error('Error changing plan:', err);
      setError(err instanceof Error ? err.message : 'Failed to change plan');
    } finally {
      setUpgrading(false);
    }
  };

  const getUsageColor = (percentage: number): string => {
    if (percentage >= 100) return 'text-red-600 bg-red-100';
    if (percentage >= 90) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const getProgressBarColor = (percentage: number): string => {
    if (percentage >= 100) return 'bg-red-600';
    if (percentage >= 90) return 'bg-yellow-500';
    return 'bg-green-600';
  };

  const renderFeatureValue = (value: boolean | string) => {
    if (typeof value === 'boolean') {
      return value ? (
        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      ) : (
        <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      );
    }
    return <span className="text-sm text-gray-700">{value}</span>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading subscription details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg shadow-md max-w-md">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Error</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!subscription || !usage) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No subscription data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-blue-600 hover:text-blue-800 mb-4 inline-flex items-center"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Subscription Management</h1>
          <p className="mt-2 text-gray-600">Manage your subscription plan and billing</p>
        </div>

        {/* Current Plan Summary */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Plan</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-500 mb-1">Plan</p>
              <p className="text-2xl font-bold text-blue-600 capitalize">{subscription.subscription_plan}</p>
              <p className="text-sm text-gray-600 mt-1">
                ${PLAN_PRICING[subscription.subscription_plan][subscription.billing_cycle]} / {subscription.billing_cycle}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Status</p>
              <span
                className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${
                  subscription.subscription_status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : subscription.subscription_status === 'suspended'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {subscription.subscription_status}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Next Billing Date</p>
              <p className="text-lg font-semibold text-gray-900">
                {new Date(subscription.next_billing_date).toLocaleDateString()}
              </p>
              <p className="text-sm text-gray-600 mt-1">Billing Cycle: {subscription.billing_cycle}</p>
            </div>
          </div>
        </div>

        {/* Vehicle Usage */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Vehicle Usage</h2>
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">
                {usage.current_count} of {usage.vehicle_limit} vehicles used
              </span>
              <span className={`text-sm font-semibold px-2 py-1 rounded ${getUsageColor(usage.usage_percentage)}`}>
                {usage.usage_percentage.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${getProgressBarColor(
                  usage.usage_percentage
                )}`}
                style={{ width: `${Math.min(usage.usage_percentage, 100)}%` }}
              ></div>
            </div>
          </div>
          {usage.usage_percentage >= 90 && (
            <div
              className={`mt-4 p-4 rounded-lg ${
                usage.usage_percentage >= 100 ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'
              }`}
            >
              <p className={`text-sm font-semibold ${usage.usage_percentage >= 100 ? 'text-red-800' : 'text-yellow-800'}`}>
                {usage.usage_percentage >= 100
                  ? 'Vehicle limit reached! Upgrade your plan to add more vehicles.'
                  : 'Approaching vehicle limit! Consider upgrading to avoid service interruptions.'}
              </p>
            </div>
          )}
        </div>

        {/* Plan Comparison */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Compare Plans</h2>
          
          {/* Plan Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Starter Plan */}
            <div
              className={`border-2 rounded-lg p-6 ${
                subscription.subscription_plan === 'starter' ? 'border-blue-600 bg-blue-50' : 'border-gray-200'
              }`}
            >
              <h3 className="text-xl font-bold text-gray-900 mb-2">Starter</h3>
              <p className="text-3xl font-bold text-gray-900 mb-1">
                ${PLAN_PRICING.starter[subscription.billing_cycle]}
              </p>
              <p className="text-sm text-gray-600 mb-4">per {subscription.billing_cycle}</p>
              <p className="text-sm text-gray-700 mb-6">Perfect for small fleets getting started</p>
              {subscription.subscription_plan !== 'starter' ? (
                <button
                  onClick={() => handlePlanChange('starter')}
                  disabled={upgrading}
                  className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  {upgrading ? 'Processing...' : 'Downgrade'}
                </button>
              ) : (
                <div className="w-full px-4 py-2 bg-blue-600 text-white rounded text-center font-semibold">
                  Current Plan
                </div>
              )}
            </div>

            {/* Professional Plan */}
            <div
              className={`border-2 rounded-lg p-6 ${
                subscription.subscription_plan === 'professional' ? 'border-blue-600 bg-blue-50' : 'border-gray-200'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-xl font-bold text-gray-900">Professional</h3>
                <span className="px-2 py-1 bg-green-600 text-white text-xs font-semibold rounded">POPULAR</span>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1">
                ${PLAN_PRICING.professional[subscription.billing_cycle]}
              </p>
              <p className="text-sm text-gray-600 mb-4">per {subscription.billing_cycle}</p>
              <p className="text-sm text-gray-700 mb-6">For growing fleets with advanced needs</p>
              {subscription.subscription_plan !== 'professional' ? (
                <button
                  onClick={() => handlePlanChange('professional')}
                  disabled={upgrading}
                  className={`w-full px-4 py-2 rounded font-semibold disabled:opacity-50 ${
                    subscription.subscription_plan === 'starter'
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {upgrading ? 'Processing...' : subscription.subscription_plan === 'starter' ? 'Upgrade' : 'Downgrade'}
                </button>
              ) : (
                <div className="w-full px-4 py-2 bg-blue-600 text-white rounded text-center font-semibold">
                  Current Plan
                </div>
              )}
            </div>

            {/* Enterprise Plan */}
            <div
              className={`border-2 rounded-lg p-6 ${
                subscription.subscription_plan === 'enterprise' ? 'border-blue-600 bg-blue-50' : 'border-gray-200'
              }`}
            >
              <h3 className="text-xl font-bold text-gray-900 mb-2">Enterprise</h3>
              <p className="text-3xl font-bold text-gray-900 mb-1">
                ${PLAN_PRICING.enterprise[subscription.billing_cycle]}
              </p>
              <p className="text-sm text-gray-600 mb-4">per {subscription.billing_cycle}</p>
              <p className="text-sm text-gray-700 mb-6">For large fleets with unlimited vehicles</p>
              {subscription.subscription_plan !== 'enterprise' ? (
                <button
                  onClick={() => handlePlanChange('enterprise')}
                  disabled={upgrading}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  {upgrading ? 'Processing...' : 'Upgrade'}
                </button>
              ) : (
                <div className="w-full px-4 py-2 bg-blue-600 text-white rounded text-center font-semibold">
                  Current Plan
                </div>
              )}
            </div>
          </div>

          {/* Feature Comparison Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Feature
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Starter
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Professional
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Enterprise
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {PLAN_FEATURES.map((feature, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{feature.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">{renderFeatureValue(feature.starter)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {renderFeatureValue(feature.professional)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {renderFeatureValue(feature.enterprise)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Help Section */}
        <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Need Help?</h3>
          <p className="text-sm text-blue-800 mb-4">
            Have questions about plans or need assistance? Our team is here to help.
          </p>
          <div className="flex gap-4">
            <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Contact Support</button>
            <button className="px-4 py-2 border border-blue-600 text-blue-600 rounded hover:bg-blue-50">
              View Documentation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
