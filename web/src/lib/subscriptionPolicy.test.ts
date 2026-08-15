import { describe, expect, it } from 'vitest';
import { calculateMonthlyEstimate, trialAllowsFeature, trialDaysRemaining, TRIAL_VEHICLE_LIMIT } from './subscriptionPolicy';

describe('subscription policy', () => {
  it('limits the free trial to three vehicles', () => {
    expect(TRIAL_VEHICLE_LIMIT).toBe(3);
  });

  it('allows only visibility and component-health features during trial', () => {
    expect(trialAllowsFeature('vehicles')).toBe(true);
    expect(trialAllowsFeature('component_health')).toBe(true);
    expect(trialAllowsFeature('work_orders')).toBe(false);
    expect(trialAllowsFeature('inventory')).toBe(false);
    expect(trialAllowsFeature('gps_tracking')).toBe(false);
  });

  it('calculates remaining trial days without returning negative values', () => {
    const now = new Date('2026-08-15T00:00:00Z');
    expect(trialDaysRemaining('2026-08-22T00:00:00Z', now)).toBe(7);
    expect(trialDaysRemaining('2026-08-14T00:00:00Z', now)).toBe(0);
  });

  it('calculates INR monthly estimates from active vehicles', () => {
    expect(calculateMonthlyEstimate(500, 20)).toBe(10000);
    expect(calculateMonthlyEstimate(500, -2)).toBe(0);
  });
});
