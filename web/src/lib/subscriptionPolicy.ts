import type { FeatureKey } from '../hooks/useSubscription';

export const TRIAL_FEATURES: ReadonlySet<FeatureKey> = new Set(['vehicles', 'component_health', 'dashboard', 'vehicle_tracking', 'components']);
export const TRIAL_VEHICLE_LIMIT = 3;
export const TRIAL_LENGTH_DAYS = 7;

export function trialDaysRemaining(trialEndsAt: string | Date, now = new Date()): number {
  return Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - now.getTime()) / 86400000));
}

export function trialAllowsFeature(feature: FeatureKey): boolean {
  return TRIAL_FEATURES.has(feature);
}

export function calculateMonthlyEstimate(pricePerVehicleInr: number, activeVehicles: number): number {
  return Math.max(0, pricePerVehicleInr) * Math.max(0, Math.floor(activeVehicles));
}
