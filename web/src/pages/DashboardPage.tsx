import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import SubscriptionWidget from '../components/SubscriptionWidget';
import Layout from '../components/Layout';
import { useDashboardLayout } from '../hooks/useDashboard';
import DashboardWidget from '../components/dashboard/DashboardWidget';
import DashboardCustomizer from '../components/dashboard/DashboardCustomizer';
import { DashboardPageSkeleton } from '../components/SkeletonScreens';
import TireReplacementWidget from '../components/dashboard/TireReplacementWidget';

interface Alert {
  id: string;
  vehicle_id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  alert_type: string;
  status: string;
  created_at: string;
  vehicle?: {
    vin: string;
    make: string;
    model: string;
  };
}

interface FleetStats {
  fleet_health_score: number;
  total_vehicles: number;
  vehicles_in_service: number;
  vehicles_under_maintenance: number;
  vehicles_overdue: number;
}

interface CostTrend {
  month: string;
  total_cost: number;
  cost_per_vehicle: number;
  cost_per_km: number;
}

const severityColors = {
  low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

const severityBorderColors = {
  low: 'border-blue-200 dark:border-blue-800',
  medium: 'border-yellow-200 dark:border-yellow-800',
  high: 'border-orange-200 dark:border-orange-800',
  critical: 'border-red-200 dark:border-red-800',
};

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch user's dashboard layout with role-specific widgets
  const { data: dashboardLayout, isLoading: layoutLoading } = useDashboardLayout();

  // Manual refresh function for all dashboard queries
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Invalidate all dashboard-related queries to trigger refetch
      await queryClient.invalidateQueries({ queryKey: ['fleetStats'] });
      await queryClient.invalidateQueries({ queryKey: ['activeAlerts'] });
      await queryClient.invalidateQueries({ queryKey: ['costTrends'] });
      await queryClient.invalidateQueries({ queryKey: ['fleet-health'] });
      await queryClient.invalidateQueries({ queryKey: ['alerts-summary'] });
      await queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      await queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
      await queryClient.invalidateQueries({ queryKey: ['team-summary'] });
      await queryClient.invalidateQueries({ queryKey: ['my-vehicles'] });
      await queryClient.invalidateQueries({ queryKey: ['parts-availability'] });
      await queryClient.invalidateQueries({ queryKey: ['driver-assignments'] });
      await queryClient.invalidateQueries({ queryKey: ['vehicles-overdue'] });
      await queryClient.invalidateQueries({ queryKey: ['vehicles-upcoming-maintenance'] });
      
      setLastUpdate(new Date());
    } finally {
      // Keep the button disabled briefly to prevent spam
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  };

  // Fetch fleet statistics (kept for compatibility with existing widgets)
  const { data: fleetStats, isLoading: statsLoading } = useQuery<FleetStats>({
    queryKey: ['fleetStats'],
    queryFn: async () => {
      // Get total vehicles
      const { count: totalVehicles, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('*', { count: 'exact', head: true });

      if (vehiclesError) throw vehiclesError;

      // Get vehicles in service (active status)
      const { count: inService, error: inServiceError } = await supabase
        .from('vehicles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      if (inServiceError) throw inServiceError;

      // Get vehicles under maintenance
      const { count: underMaintenance, error: maintenanceError } = await supabase
        .from('vehicles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'maintenance');

      if (maintenanceError) throw maintenanceError;

      // Get vehicles with overdue alerts
      const { data: overdueAlerts, error: overdueError } = await supabase
        .from('alerts')
        .select('vehicle_id')
        .eq('alert_type', 'overdue')
        .eq('status', 'active');

      if (overdueError) throw overdueError;

      const vehiclesOverdue = new Set(overdueAlerts?.map(a => a.vehicle_id)).size;

      // Calculate fleet health score (simplified calculation)
      // In production, this would come from the ML service or a materialized view
      const healthScore = Math.round(
        ((totalVehicles || 0) - vehiclesOverdue - (underMaintenance || 0)) / 
        Math.max(totalVehicles || 1, 1) * 100
      );

      return {
        fleet_health_score: Math.max(0, Math.min(100, healthScore)),
        total_vehicles: totalVehicles || 0,
        vehicles_in_service: inService || 0,
        vehicles_under_maintenance: underMaintenance || 0,
        vehicles_overdue: vehiclesOverdue,
      };
    },
    enabled: !!user,
    refetchInterval: 60000, // Refetch every minute as fallback
  });

  // Fetch active alerts (kept for compatibility, but can be removed once all widgets use their own hooks)
  const { data: alerts, isLoading: alertsLoading } = useQuery<Alert[]>({
    queryKey: ['activeAlerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alerts')
        .select(`
          id,
          vehicle_id,
          title,
          description,
          severity,
          alert_type,
          status,
          created_at,
          vehicles:vehicle_id (
            vin,
            make,
            model
          )
        `)
        .eq('status', 'active')
        .order('severity', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      return data.map((alert: any) => ({
        ...alert,
        vehicle: alert.vehicles,
      }));
    },
    enabled: !!user,
  });

  // Fetch cost trends (kept for compatibility, but can be removed once all widgets use their own hooks)
  const { data: costTrends, isLoading: costsLoading } = useQuery<CostTrend[]>({
    queryKey: ['costTrends'],
    queryFn: async () => {
      // In a real implementation, this would query aggregated cost data
      // For now, we'll generate sample data based on work orders
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data: workOrders, error } = await supabase
        .from('work_orders')
        .select('completed_at, total_cost')
        .eq('status', 'completed')
        .gte('completed_at', sixMonthsAgo.toISOString());

      if (error) throw error;

      // Group by month
      const monthlyData: { [key: string]: { total: number; count: number } } = {};
      const months = [];
      
      // Generate last 6 months
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        months.push(monthKey);
        monthlyData[monthKey] = { total: 0, count: 0 };
      }

      // Aggregate costs
      workOrders?.forEach((wo: any) => {
        if (wo.completed_at && wo.total_cost) {
          const date = new Date(wo.completed_at);
          const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          if (monthlyData[monthKey]) {
            monthlyData[monthKey].total += parseFloat(wo.total_cost);
            monthlyData[monthKey].count += 1;
          }
        }
      });

      const totalVehicles = fleetStats?.total_vehicles || 1;

      return months.map(month => {
        const data = monthlyData[month];
        const totalCost = data.total;
        const costPerVehicle = totalCost / totalVehicles;
        // Assuming average 2000 km per vehicle per month
        const costPerKm = totalCost / (totalVehicles * 2000);

        return {
          month,
          total_cost: Math.round(totalCost),
          cost_per_vehicle: Math.round(costPerVehicle),
          cost_per_km: parseFloat(costPerKm.toFixed(2)),
        };
      });
    },
    enabled: !!user && !!fleetStats,
  });

  // Setup Realtime subscriptions
  useEffect(() => {
    if (!user) return;

    // Subscribe to alerts changes
    const alertsChannel = supabase
      .channel('dashboard-alerts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'alerts',
        },
        (payload) => {
          console.log('Alert change detected:', payload);
          queryClient.invalidateQueries({ queryKey: ['activeAlerts'] });
          queryClient.invalidateQueries({ queryKey: ['fleetStats'] });
          setLastUpdate(new Date());
        }
      )
      .subscribe((status) => {
        console.log('Alerts channel status:', status);
        setIsRealtimeConnected(status === 'SUBSCRIBED');
      });

    // Subscribe to vehicle status changes
    const vehiclesChannel = supabase
      .channel('dashboard-vehicles')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'vehicles',
          filter: 'status=neq.null',
        },
        (payload) => {
          console.log('Vehicle status change detected:', payload);
          queryClient.invalidateQueries({ queryKey: ['fleetStats'] });
          setLastUpdate(new Date());
        }
      )
      .subscribe((status) => {
        console.log('Vehicles channel status:', status);
      });

    // Subscribe to work orders for cost updates
    const workOrdersChannel = supabase
      .channel('dashboard-work-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'work_orders',
        },
        (payload) => {
          console.log('Work order change detected:', payload);
          queryClient.invalidateQueries({ queryKey: ['costTrends'] });
          setLastUpdate(new Date());
        }
      )
      .subscribe((status) => {
        console.log('Work orders channel status:', status);
      });

    // Cleanup subscriptions on unmount
    return () => {
      supabase.removeChannel(alertsChannel);
      supabase.removeChannel(vehiclesChannel);
      supabase.removeChannel(workOrdersChannel);
    };
  }, [user, queryClient]);

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    if (score >= 40) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <Layout>
      <div className="bg-white dark:bg-gray-800 shadow-soft border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold leading-tight text-gray-900 dark:text-gray-100">
                Dashboard
              </h1>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs font-normal leading-tight font-normal leading-tight text-gray-500 dark:text-gray-400">
                  Last updated: {lastUpdate.toLocaleTimeString()}
                </span>
                {isRealtimeConnected && (
                  <span className="flex items-center gap-1 text-xs font-normal leading-tight font-normal leading-tight text-green-600 dark:text-green-400">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    Live
                  </span>
                )}
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {/* Manual Refresh Button */}
              <button
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-normal leading-normal font-normal leading-normal text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh dashboard data"
              >
                <svg
                  className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </button>
              
              {/* Customize Dashboard Button */}
              <button
                onClick={() => setIsCustomizerOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-normal leading-normal font-normal leading-normal text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <Cog6ToothIcon className="h-5 w-5" />
                Customize Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Loading State */}
        {layoutLoading ? (
          <DashboardPageSkeleton />
        ) : dashboardLayout ? (
          <>
            {/* Role-specific Dashboard Widgets - Task 29.4: Single column on mobile, grid on desktop */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
              {dashboardLayout.widgets
                .filter(widget => widget.visible)
                .sort((a, b) => a.order - b.order)
                .map(widget => (
                  <DashboardWidget
                    key={widget.id}
                    widget={widget}
                  />
                ))}
            </div>

            {/* ML-Powered Tire Replacement Forecast Widget - Batch 1 */}
            <div className="mb-8">
              <TireReplacementWidget />
            </div>

            {/* Subscription Widget */}
            <div className="mb-8 max-w-full md:max-w-md">
              <SubscriptionWidget />
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-base font-normal leading-normal font-normal leading-normal text-gray-500 dark:text-gray-400">Unable to load dashboard. Please try refreshing the page.</p>
          </div>
        )}
      </main>
      
      {/* Dashboard Customizer Modal */}
      <DashboardCustomizer
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
      />
    </Layout>
  );
}
