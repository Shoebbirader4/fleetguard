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

interface AlertsSummaryData {
  by_type: { [key: string]: number };
  by_severity: { [key: string]: number };
  total_active: number;
  recent_alerts: Array<{
    id: string;
    alert_type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    vehicle_id: string;
    created_at: string;
  }>;
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
    // Auto-refresh every 5 minutes (Requirement 8.4)
    refetchInterval: 5 * 60 * 1000,
  });
}

/**
 * Fetch and cache active alerts summary
 * 
 * Returns the full JSON structure from get_active_alerts_summary RPC:
 * {
 *   by_type: { [type: string]: number },
 *   by_severity: { [severity: string]: number },
 *   total_active: number,
 *   recent_alerts: Array<{id, alert_type, severity, message, vehicle_id, created_at}>
 * }
 * 
 * @param tenantId - The tenant ID to fetch data for
 * @returns Active alerts summary JSON object with loading and error states
 * 
 * @example
 * const { data, isLoading, error } = useAlertsSummary(tenantId);
 * const recentAlerts = data?.recent_alerts || [];
 * const totalActive = data?.total_active || 0;
 */
export function useAlertsSummary(tenantId: string) {
  // Real-time updates handled by useDashboardRealtimeUpdates in parent component

  return useQuery<AlertsSummaryData>({
    queryKey: cacheKeys.alertsSummary(tenantId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_active_alerts_summary');

      if (error) throw error;
      // Return the full JSON object structure from the RPC function
      return data || { by_type: {}, by_severity: {}, total_active: 0, recent_alerts: [] };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
    enabled: !!tenantId,
    // Auto-refresh every 5 minutes (Requirement 8.4)
    refetchInterval: 5 * 60 * 1000,
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
        <div className="stats">
          <div>Total Active: {alertsSummary?.total_active || 0}</div>
          <div>Critical: {alertsSummary?.by_severity?.critical || 0}</div>
          <div>High: {alertsSummary?.by_severity?.high || 0}</div>
        </div>
        <div className="recent-alerts">
          <h3>Recent Alerts</h3>
          {alertsSummary?.recent_alerts?.map((alert: any) => (
            <div key={alert.id} className={`alert alert-${alert.severity}`}>
              <div className="alert-type">{alert.alert_type}</div>
              <div className="alert-message">{alert.message}</div>
              <div className="alert-time">
                {new Date(alert.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Manual Refresh Button */}
      <button onClick={() => refetch()}>Refresh Dashboard</button>
    </div>
  );
}
