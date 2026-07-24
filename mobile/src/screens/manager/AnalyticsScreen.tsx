import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useAuthStore } from '../../stores/authStore';
import { database } from '../../database';
import { Q } from '@nozbe/watermelondb';
import { supabase } from '../../lib/supabase';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

type ReportType = 'cost' | 'breakdown' | 'downtime';

interface CostSummary {
  totalCost: number;
  costPerVehicle: number;
  partsCount: number;
  laborHours: number;
  workOrdersCompleted: number;
}

interface BreakdownSummary {
  totalBreakdowns: number;
  criticalBreakdowns: number;
  topFailureType: string;
  failureRate: number; // failures per 1000 km
}

interface DowntimeSummary {
  totalDowntimeHours: number;
  downtimePerVehicle: number;
  vehiclesAffected: number;
  averageRepairTime: number; // hours
}

export default function AnalyticsScreen() {
  const { tenantId } = useAuthStore();

  const [activeReport, setActiveReport] = useState<ReportType>('cost');
  const [costSummary, setCostSummary] = useState<CostSummary | null>(null);
  const [breakdownSummary, setBreakdownSummary] = useState<BreakdownSummary | null>(null);
  const [downtimeSummary, setDowntimeSummary] = useState<DowntimeSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: subDays(new Date(), 30),
    end: new Date(),
  });

  const loadCostSummary = async () => {
    try {
      const startDate = startOfDay(dateRange.start).getTime();
      const endDate = endOfDay(dateRange.end).getTime();

      // Load completed work orders within date range
      const workOrders = await database.collections
        .get('work_orders')
        .query(
          Q.where('tenant_id', tenantId || ''),
          Q.where('status', 'completed'),
          Q.where('completed_at', Q.gte(startDate))
        )
        .fetch();

      const filteredOrders = workOrders.filter((wo: any) => wo.completedAt <= endDate);

      const totalCost = filteredOrders.reduce((sum: number, wo: any) => sum + (wo.totalCost || 0), 0);
      const laborHours = filteredOrders.reduce(
        (sum: number, wo: any) => sum + (wo.totalLaborHours || 0),
        0
      );

      // Count unique vehicles
      const vehicles = await database.collections
        .get('vehicles')
        .query(Q.where('tenant_id', tenantId || ''))
        .fetch();

      const vehicleCount = vehicles.length || 1; // Avoid division by zero

      setCostSummary({
        totalCost: Math.round(totalCost),
        costPerVehicle: Math.round(totalCost / vehicleCount),
        partsCount: filteredOrders.length * 3, // Simplified estimate
        laborHours: Math.round(laborHours * 10) / 10,
        workOrdersCompleted: filteredOrders.length,
      });
    } catch (error) {
      console.error('Failed to load cost summary:', error);
    }
  };

  const loadBreakdownSummary = async () => {
    try {
      const startDate = startOfDay(dateRange.start).getTime();
      const endDate = endOfDay(dateRange.end).getTime();

      // Load alerts within date range
      const alerts = await database.collections
        .get('alerts')
        .query(
          Q.where('tenant_id', tenantId || ''),
          Q.where('alert_type', Q.oneOf(['critical_failure_risk', 'safety_risk']))
        )
        .fetch();

      const filteredAlerts = alerts.filter(
        (alert: any) =>
          alert.createdAt.getTime() >= startDate && alert.createdAt.getTime() <= endDate
      );

      const criticalBreakdowns = filteredAlerts.filter(
        (alert: any) => alert.severity === 'critical'
      ).length;

      // Calculate failure rate (simplified)
      const vehicles = await database.collections
        .get('vehicles')
        .query(Q.where('tenant_id', tenantId || ''))
        .fetch();

      const totalOdometer = vehicles.reduce(
        (sum: number, v: any) => sum + (v.currentOdometer || 0),
        0
      );
      const failureRate =
        totalOdometer > 0 ? (filteredAlerts.length / totalOdometer) * 1000 : 0;

      // Determine top failure type (simplified)
      const alertTypes = filteredAlerts.map((a: any) => a.alertType);
      const typeCounts: Record<string, number> = {};
      alertTypes.forEach((type: string) => {
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      });

      let topFailureType = 'None';
      let maxCount = 0;
      Object.entries(typeCounts).forEach(([type, count]) => {
        if (count > maxCount) {
          maxCount = count;
          topFailureType = type.replace(/_/g, ' ');
        }
      });

      setBreakdownSummary({
        totalBreakdowns: filteredAlerts.length,
        criticalBreakdowns,
        topFailureType,
        failureRate: Math.round(failureRate * 100) / 100,
      });
    } catch (error) {
      console.error('Failed to load breakdown summary:', error);
    }
  };

  const loadDowntimeSummary = async () => {
    try {
      const startDate = startOfDay(dateRange.start).getTime();
      const endDate = endOfDay(dateRange.end).getTime();

      // Load completed work orders within date range
      const workOrders = await database.collections
        .get('work_orders')
        .query(
          Q.where('tenant_id', tenantId || ''),
          Q.where('status', 'completed')
        )
        .fetch();

      const filteredOrders = workOrders.filter(
        (wo: any) =>
          wo.completedAt >= startDate &&
          wo.completedAt <= endDate &&
          wo.startedAt &&
          wo.completedAt
      );

      // Calculate downtime in hours
      let totalDowntimeMs = 0;
      const vehiclesAffectedSet = new Set<string>();

      filteredOrders.forEach((wo: any) => {
        if (wo.startedAt && wo.completedAt) {
          const downtime = wo.completedAt - wo.startedAt;
          totalDowntimeMs += downtime;
          vehiclesAffectedSet.add(wo.vehicleId);
        }
      });

      const totalDowntimeHours = totalDowntimeMs / (1000 * 60 * 60);
      const vehiclesAffected = vehiclesAffectedSet.size;
      const averageRepairTime =
        filteredOrders.length > 0 ? totalDowntimeHours / filteredOrders.length : 0;
      const downtimePerVehicle =
        vehiclesAffected > 0 ? totalDowntimeHours / vehiclesAffected : 0;

      setDowntimeSummary({
        totalDowntimeHours: Math.round(totalDowntimeHours * 10) / 10,
        downtimePerVehicle: Math.round(downtimePerVehicle * 10) / 10,
        vehiclesAffected,
        averageRepairTime: Math.round(averageRepairTime * 10) / 10,
      });
    } catch (error) {
      console.error('Failed to load downtime summary:', error);
    }
  };

  const loadAnalytics = async () => {
    try {
      await Promise.all([loadCostSummary(), loadBreakdownSummary(), loadDowntimeSummary()]);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [tenantId, dateRange]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadAnalytics();
  };

  const renderReportButton = (type: ReportType, label: string, icon: string) => (
    <TouchableOpacity
      style={[styles.reportButton, activeReport === type && styles.reportButtonActive]}
      onPress={() => setActiveReport(type)}
    >
      <Text style={styles.reportIcon}>{icon}</Text>
      <Text
        style={[styles.reportButtonText, activeReport === type && styles.reportButtonTextActive]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <View style={styles.content}>
        {/* Date Range */}
        <View style={styles.dateRangeCard}>
          <Text style={styles.dateRangeLabel}>Report Period</Text>
          <Text style={styles.dateRangeText}>
            {format(dateRange.start, 'MMM dd, yyyy')} - {format(dateRange.end, 'MMM dd, yyyy')}
          </Text>
          <Text style={styles.dateRangeSubtext}>Last 30 days</Text>
        </View>

        {/* Report Type Selector */}
        <View style={styles.reportSelector}>
          {renderReportButton('cost', 'Cost', '💰')}
          {renderReportButton('breakdown', 'Breakdowns', '🔧')}
          {renderReportButton('downtime', 'Downtime', '⏱️')}
        </View>

        {/* Cost Report */}
        {activeReport === 'cost' && costSummary && (
          <View style={styles.reportContainer}>
            <Text style={styles.reportTitle}>Cost Summary</Text>

            <View style={styles.statGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statBoxValue}>${costSummary.totalCost.toLocaleString()}</Text>
                <Text style={styles.statBoxLabel}>Total Cost</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statBoxValue}>
                  ${costSummary.costPerVehicle.toLocaleString()}
                </Text>
                <Text style={styles.statBoxLabel}>Cost Per Vehicle</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statBoxValue}>{costSummary.workOrdersCompleted}</Text>
                <Text style={styles.statBoxLabel}>Work Orders</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statBoxValue}>{costSummary.laborHours}h</Text>
                <Text style={styles.statBoxLabel}>Labor Hours</Text>
              </View>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.infoCardTitle}>Parts Consumed</Text>
              <Text style={styles.infoCardValue}>{costSummary.partsCount} items</Text>
            </View>
          </View>
        )}

        {/* Breakdown Report */}
        {activeReport === 'breakdown' && breakdownSummary && (
          <View style={styles.reportContainer}>
            <Text style={styles.reportTitle}>Breakdown Summary</Text>

            <View style={styles.statGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statBoxValue}>{breakdownSummary.totalBreakdowns}</Text>
                <Text style={styles.statBoxLabel}>Total Breakdowns</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statBoxValue, { color: '#ef4444' }]}>
                  {breakdownSummary.criticalBreakdowns}
                </Text>
                <Text style={styles.statBoxLabel}>Critical</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statBoxValue}>{breakdownSummary.failureRate}</Text>
                <Text style={styles.statBoxLabel}>Per 1000 km</Text>
              </View>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.infoCardTitle}>Top Failure Type</Text>
              <Text style={styles.infoCardValue}>{breakdownSummary.topFailureType}</Text>
            </View>
          </View>
        )}

        {/* Downtime Report */}
        {activeReport === 'downtime' && downtimeSummary && (
          <View style={styles.reportContainer}>
            <Text style={styles.reportTitle}>Downtime Summary</Text>

            <View style={styles.statGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statBoxValue}>
                  {downtimeSummary.totalDowntimeHours.toFixed(1)}h
                </Text>
                <Text style={styles.statBoxLabel}>Total Downtime</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statBoxValue}>{downtimeSummary.vehiclesAffected}</Text>
                <Text style={styles.statBoxLabel}>Vehicles Affected</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statBoxValue}>
                  {downtimeSummary.downtimePerVehicle.toFixed(1)}h
                </Text>
                <Text style={styles.statBoxLabel}>Per Vehicle</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statBoxValue}>
                  {downtimeSummary.averageRepairTime.toFixed(1)}h
                </Text>
                <Text style={styles.statBoxLabel}>Avg Repair Time</Text>
              </View>
            </View>
          </View>
        )}

        {/* Info Message */}
        <View style={styles.infoMessageCard}>
          <Text style={styles.infoMessage}>
            📊 Analytics are calculated from local data. Sync with the server for most accurate
            results.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  dateRangeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dateRangeLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  dateRangeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  dateRangeSubtext: {
    fontSize: 12,
    color: '#9ca3af',
  },
  reportSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  reportButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  reportButtonActive: {
    backgroundColor: '#2563eb',
  },
  reportIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  reportButtonText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  reportButtonTextActive: {
    color: '#fff',
  },
  reportContainer: {
    marginBottom: 16,
  },
  reportTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statBox: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statBoxValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 4,
  },
  statBoxLabel: {
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  infoCardTitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  infoCardValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  infoMessageCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 32,
  },
  infoMessage: {
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 18,
  },
});
