import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';

export const cacheKeys = {
  fleetHealth: (tenantId: string) => ['dashboard', 'fleet-health', tenantId] as const,
  alertsSummary: (tenantId: string) => ['dashboard', 'alerts-summary', tenantId] as const,
};

export function useDashboardRealtimeUpdates(tenantId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!tenantId) return;
    const channel = supabase
      .channel(`dashboard-updates-${tenantId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles', filter: `tenant_id=eq.${tenantId}` }, () => {
        void queryClient.invalidateQueries({ queryKey: cacheKeys.fleetHealth(tenantId) });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_alerts', filter: `tenant_id=eq.${tenantId}` }, () => {
        void queryClient.invalidateQueries({ queryKey: cacheKeys.alertsSummary(tenantId) });
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, tenantId]);
}
