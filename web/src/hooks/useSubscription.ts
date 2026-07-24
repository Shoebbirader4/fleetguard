import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

interface SubscriptionCheck {
  allowed: boolean;
  current_count: number;
  vehicle_limit: number;
  subscription_plan: string;
  upgrade_message?: string;
}

interface SubscriptionStatus {
  loading: boolean;
  error: string | null;
  canAddVehicle: boolean;
  currentCount: number;
  vehicleLimit: number;
  subscriptionPlan: string;
  upgradeMessage?: string;
}

/**
 * Hook to check subscription status and vehicle limits
 * Requirement 18.2: Enforce vehicle limits per subscription plan
 * Requirement 18.3: Prevent adding new vehicles and display upgrade prompt
 */
export function useSubscription(): SubscriptionStatus {
  const user = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<SubscriptionCheck | null>(null);

  useEffect(() => {
    if (user?.tenantId) {
      checkSubscription();
    }
  }, [user?.tenantId]);

  const checkSubscription = async () => {
    if (!user?.tenantId) {
      setError('No tenant ID available');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Call subscription-enforcer Edge Function
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/subscription-enforcer`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
          body: JSON.stringify({
            tenant_id: user.tenantId,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to check subscription');
      }

      const data: SubscriptionCheck = await response.json();
      setStatus(data);
    } catch (err) {
      console.error('Error checking subscription:', err);
      setError(err instanceof Error ? err.message : 'Failed to check subscription');
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    canAddVehicle: status?.allowed ?? false,
    currentCount: status?.current_count ?? 0,
    vehicleLimit: status?.vehicle_limit ?? 0,
    subscriptionPlan: status?.subscription_plan ?? '',
    upgradeMessage: status?.upgrade_message,
  };
}

/**
 * Check if vehicle can be added before creation
 * Returns null if allowed, otherwise returns error message
 */
export async function checkVehicleCreationAllowed(tenantId: string): Promise<string | null> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      return 'Not authenticated';
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/subscription-enforcer`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({
          tenant_id: tenantId,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return errorData.error || 'Failed to check subscription';
    }

    const data: SubscriptionCheck = await response.json();

    if (!data.allowed) {
      return data.upgrade_message || 'Vehicle limit reached';
    }

    return null;
  } catch (err) {
    console.error('Error checking vehicle creation:', err);
    return err instanceof Error ? err.message : 'Failed to check subscription';
  }
}
