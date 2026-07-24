import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import SubscriptionWidget from '../components/SubscriptionWidget';
import Layout from '../components/Layout';

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

  // Fetch fleet statistics
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

  // Fetch active alerts
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

  // Fetch cost trends (last 6 months)
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
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Fleet Dashboard
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Last updated: {lastUpdate.toLocaleTimeString()}
                </span>
                {isRealtimeConnected && (
                  <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    Live
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Fleet Statistics Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {/* Fleet Health Score Widget */}
          <div className="card">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              Fleet Health Score
            </h3>
            {statsLoading ? (
              <div className="text-2xl font-bold text-gray-400">Loading...</div>
            ) : (
              <>
                <div className={`text-4xl font-bold ${getHealthScoreColor(fleetStats?.fleet_health_score || 0)}`}>
                  {fleetStats?.fleet_health_score || 0}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">out of 100</p>
              </>
            )}
          </div>

          {/* Total Vehicles Widget */}
          <div className="card">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              Total Vehicles
            </h3>
            {statsLoading ? (
              <div className="text-2xl font-bold text-gray-400">Loading...</div>
            ) : (
              <div className="text-4xl font-bold text-primary-600 dark:text-primary-400">
                {fleetStats?.total_vehicles || 0}
              </div>
            )}
          </div>

          {/* Vehicles in Service Widget */}
          <div className="card">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              In Service
            </h3>
            {statsLoading ? (
              <div className="text-2xl font-bold text-gray-400">Loading...</div>
            ) : (
              <div className="text-4xl font-bold text-green-600 dark:text-green-400">
                {fleetStats?.vehicles_in_service || 0}
              </div>
            )}
          </div>

          {/* Vehicles Under Maintenance Widget */}
          <div className="card">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              Under Maintenance
            </h3>
            {statsLoading ? (
              <div className="text-2xl font-bold text-gray-400">Loading...</div>
            ) : (
              <div className="text-4xl font-bold text-orange-600 dark:text-orange-400">
                {fleetStats?.vehicles_under_maintenance || 0}
              </div>
            )}
          </div>

          {/* Vehicles Overdue Widget */}
          <div className="card">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              Overdue Alerts
            </h3>
            {statsLoading ? (
              <div className="text-2xl font-bold text-gray-400">Loading...</div>
            ) : (
              <div className="text-4xl font-bold text-red-600 dark:text-red-400">
                {fleetStats?.vehicles_overdue || 0}
              </div>
            )}
          </div>
        </div>

        {/* Subscription Widget */}
        <div className="mb-8 max-w-md">
          <SubscriptionWidget />
        </div>

        {/* Cost Trends Chart */}
        <div className="card mb-8">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
            Cost Trends (Last 6 Months)
          </h2>
          {costsLoading ? (
            <div className="h-64 flex items-center justify-center text-gray-400">
              Loading cost data...
            </div>
          ) : costTrends && costTrends.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={costTrends}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-300 dark:stroke-gray-700" />
                <XAxis 
                  dataKey="month" 
                  className="text-gray-600 dark:text-gray-400"
                  tick={{ fill: 'currentColor' }}
                />
                <YAxis 
                  className="text-gray-600 dark:text-gray-400"
                  tick={{ fill: 'currentColor' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'var(--tooltip-bg, #fff)',
                    border: '1px solid var(--tooltip-border, #ccc)',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="total_cost"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Total Cost ($)"
                  dot={{ fill: '#3b82f6' }}
                />
                <Line
                  type="monotone"
                  dataKey="cost_per_vehicle"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Cost per Vehicle ($)"
                  dot={{ fill: '#10b981' }}
                />
                <Line
                  type="monotone"
                  dataKey="cost_per_km"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  name="Cost per km ($)"
                  dot={{ fill: '#f59e0b' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              No cost data available
            </div>
          )}
        </div>

        {/* Active Alerts List */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
            Active Alerts
          </h2>
          {alertsLoading ? (
            <div className="text-gray-600 dark:text-gray-400">Loading alerts...</div>
          ) : alerts && alerts.length > 0 ? (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border-l-4 bg-gray-50 dark:bg-gray-800 ${severityBorderColors[alert.severity]}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${severityColors[alert.severity]}`}>
                          {alert.severity.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {alert.alert_type.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                        {alert.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {alert.description}
                      </p>
                      {alert.vehicle && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Vehicle: {alert.vehicle.make} {alert.vehicle.model} ({alert.vehicle.vin})
                        </p>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 ml-4">
                      {formatTimestamp(alert.created_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="mt-2">No active alerts</p>
            </div>
          )}
        </div>
      </main>
    </Layout>
  );
}
