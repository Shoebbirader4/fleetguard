/**
 * Custom hook for fetching dashboard data with caching
 * 
 * Demonstrates best practices for:
 * - Using materialized views for fast queries
 * - React Query caching with appropriate stale times
 * - Real-time updates via Supabase Realtime
 * - Proper cache invalidation
 * 
 * Requirements: 26.2 (Dashboard must load within 2 seconds)
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import {
  cacheKeys,
  useDashboardRealtimeUpdates,
} from '../lib/cache-utils';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface FleetHealthDashboard {
  total_vehicles: number;
  vehicles_in_service: number;
  vehicles_under_maintenance: number;
  vehicles_retired: number;
  vehicles_overdue: number;
  fleet_health_score: number;
  refreshed_at: string;
}

interface AlertsSummary {
  severity: 'low' | 'medium' | 'high' | 'critical';
  alert_type: string;
  alert_count: number;
  affected_vehicles: number;
  latest_alert_time: string;
}

// ============================================================================
// DASHBOARD DATA HOOK
// ============================================================================

/**
 * Fetch and cache fleet health dashboard data
 * 
 * Performance characteristics:
 * - First load: 50-200ms (from materialized view)
 * - Cached: 0ms (instant from React Query cache)
 * - Background refetch: Every 5 minutes
 * - Real-time updates: < 2 seconds via WebSocket
 * 
 * @param tenantId - The tenant ID to fetch data for
 * @returns Fleet health dashboard data with loading and error states
 * 
 * @example
 * const { data, isLoading, error } = useFleetHealthDashboard(tenantId);
 */
export function useFleetHealthDashboard(tenantId: string) {
  // Subscribe to real-time updates for automatic cache invalidation
  useDashboardRealtimeUpdates(tenantId);

  return useQuery<FleetHealthDashboard>({
    queryKey: cacheKeys.fleetHealth(tenantId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_fleet_health_dashboard');

      if (error) throw error;
      return data;
    },
    // Data is considered fresh for 5 minutes (matches materialized view refresh)
    staleTime: 5 * 60 * 1000,
    // Keep data in cache for 10 minutes after last use
    gcTime: 10 * 60 * 1000,
    // Enabled only when tenantId is available
    enabled: !!tenantId,
  });
}

/**
 * Fetch and cache active alerts summary
 * 
 * @param tenantId - The tenant ID to fetch data for
 * @returns Active alerts summary with loading and error states
 * 
 * @example
 * const { data, isLoading, error } = useAlertsSummary(tenantId);
 */
export function useAlertsSummary(tenantId: string) {
  // Real-time updates handled by useDashboardRealtimeUpdates in parent component

  return useQuery<AlertsSummary[]>({
    queryKey: cacheKeys.alertsSummary(tenantId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_active_alerts_summary');

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
    enabled: !!tenantId,
  });
}

/**
 * Combined hook that fetches all dashboard data
 * Use this in dashboard pages for optimal performance
 * 
 * @param tenantId - The tenant ID to fetch data for
 * @returns All dashboard data with combined loading state
 * 
 * @example
 * const { 
 *   fleetHealth, 
 *   alertsSummary, 
 *   isLoading 
 * } = useDashboardData(tenantId);
 */
export function useDashboardData(tenantId: string) {
  const fleetHealthQuery = useFleetHealthDashboard(tenantId);
  const alertsSummaryQuery = useAlertsSummary(tenantId);

  return {
    fleetHealth: fleetHealthQuery.data,
    alertsSummary: alertsSummaryQuery.data,
    isLoading: fleetHealthQuery.isLoading || alertsSummaryQuery.isLoading,
    error: fleetHealthQuery.error || alertsSummaryQuery.error,
    isStale: fleetHealthQuery.isStale || alertsSummaryQuery.isStale,
    refetch: () => {
      fleetHealthQuery.refetch();
      alertsSummaryQuery.refetch();
    },
  };
}

// ============================================================================
// USAGE EXAMPLE
// ============================================================================

/**
 * Example component showing how to use the dashboard hook
 * 
 * @example
 * import { DashboardExample } from './hooks/useDashboardData';
 * 
 * function App() {
 *   return <DashboardExample tenantId="tenant-123" />;
 * }
 */
export function DashboardExample({ tenantId }: { tenantId: string }) {
  const { fleetHealth, alertsSummary, isLoading, error, refetch } =
    useDashboardData(tenantId);

  if (isLoading) {
    return <div>Loading dashboard...</div>;
  }

  if (error) {
    return <div>Error loading dashboard: {(error as Error).message}</div>;
  }

  return (
    <div>
      <h1>Fleet Dashboard</h1>

      {/* Fleet Health Card */}
      <div className="card">
        <h2>Fleet Health Score</h2>
        <div className="score">{fleetHealth?.fleet_health_score}/100</div>
        <div className="stats">
          <div>Total Vehicles: {fleetHealth?.total_vehicles}</div>
          <div>In Service: {fleetHealth?.vehicles_in_service}</div>
          <div>Under Maintenance: {fleetHealth?.vehicles_under_maintenance}</div>
          <div>Overdue: {fleetHealth?.vehicles_overdue}</div>
        </div>
        <div className="refresh-time">
          Last updated: {new Date(fleetHealth?.refreshed_at || '').toLocaleString()}
        </div>
      </div>

      {/* Active Alerts Card */}
      <div className="card">
        <h2>Active Alerts</h2>
        <table>
          <thead>
            <tr>
              <th>Severity</th>
              <th>Type</th>
              <th>Count</th>
              <th>Affected Vehicles</th>
            </tr>
          </thead>
          <tbody>
            {alertsSummary?.map((alert) => (
              <tr key={`${alert.severity}-${alert.alert_type}`}>
                <td>
                  <span className={`badge badge-${alert.severity}`}>
                    {alert.severity}
                  </span>
                </td>
                <td>{alert.alert_type}</td>
                <td>{alert.alert_count}</td>
                <td>{alert.affected_vehicles}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Manual Refresh Button */}
      <button onClick={() => refetch()}>Refresh Dashboard</button>
    </div>
  );
}
