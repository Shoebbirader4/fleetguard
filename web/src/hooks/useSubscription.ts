import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

export type PlanCode = 'trial' | 'basic' | 'plus' | 'all';
export type FeatureKey = 'vehicles' | 'component_health' | 'dashboard' | 'vehicle_tracking' | 'components' | 'analytics' | 'work_orders' | 'inventory' | 'gps_tracking' | 'reports' | 'team_management' | 'data_export' | 'api_access';

export interface SubscriptionSnapshot {
  tenant_id: string;
  plan: PlanCode;
  plan_name: string;
  price_per_vehicle_inr: number;
  billing_currency: 'INR';
  billing_interval: 'monthly' | 'annual';
  subscription_status: string;
  vehicle_count: number;
  trial_started_at?: string | null;
  trial_ends_at?: string | null;
  trial_vehicle_limit?: number;
  features: Record<FeatureKey, boolean>;
}

interface SubscriptionResponse extends SubscriptionSnapshot { allowed: boolean; feature_allowed?: boolean; upgrade_message?: string; }

export function useSubscription() {
  const user = useAuthStore((state) => state.user);
  const [snapshot, setSnapshot] = useState<SubscriptionSnapshot | null>(null);
  const [loading, setLoading] = useState(Boolean(user?.tenantId));
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async (feature?: FeatureKey): Promise<SubscriptionResponse | null> => {
    if (!user?.tenantId) return null;
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) throw new Error('Not authenticated');
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/subscription-enforcer`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionData.session.access_token}` }, body: JSON.stringify({ tenant_id: user.tenantId, feature, action: feature ? 'feature:check' : 'vehicle:create' }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to check subscription');
    return data as SubscriptionResponse;
  }, [user?.tenantId]);

  const refresh = useCallback(async () => {
    if (!user?.tenantId) { setSnapshot(null); setLoading(false); return; }
    try { setLoading(true); setError(null); const { data, error: rpcError } = await supabase.rpc('subscription_snapshot', { requested_tenant_id: user.tenantId }); if (rpcError) throw rpcError; setSnapshot(data as SubscriptionSnapshot); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load subscription'); } finally { setLoading(false); }
  }, [user?.tenantId]);

  useEffect(() => { refresh(); }, [refresh]);

  const hasFeature = (feature: FeatureKey) => Boolean(snapshot?.features?.[feature]);
  const trialDaysRemaining = snapshot?.trial_ends_at ? Math.max(0, Math.ceil((new Date(snapshot.trial_ends_at).getTime() - Date.now()) / 86400000)) : 0;
  const vehicleLimit = snapshot?.subscription_status === 'trialing' ? (snapshot.trial_vehicle_limit || 3) : undefined;
  return { snapshot, loading, error, refresh, hasFeature, check, trialDaysRemaining, isTrial: snapshot?.subscription_status === 'trialing', canAddVehicle: Boolean(snapshot && (snapshot.subscription_status === 'active' || (snapshot.subscription_status === 'trialing' && trialDaysRemaining > 0))), currentCount: snapshot?.vehicle_count || 0, vehicleLimit, subscriptionPlan: snapshot?.plan || '' };
}

export async function checkVehicleCreationAllowed(tenantId: string): Promise<string | null> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) return 'Not authenticated';
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/subscription-enforcer`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionData.session.access_token}` }, body: JSON.stringify({ tenant_id: tenantId, action: 'vehicle:create' }) });
    const data = await response.json();
    return data.allowed ? null : data.upgrade_message || 'Your subscription does not allow adding another vehicle.';
  } catch (err) { return err instanceof Error ? err.message : 'Failed to check vehicle entitlement'; }
}
