import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuthStore } from '../../stores/authStore';
import { database } from '../../database';
import { Q } from '@nozbe/watermelondb';
import { supabase } from '../../lib/supabase';
import SyncStatusIndicator from '../../components/SyncStatusIndicator';
import { format } from 'date-fns';

type RootStackParamList = {
  ManagerDashboard: undefined;
  AlertsList: undefined;
  AlertDetail: { alertId: string };
  Analytics: undefined;
  WorkOrderCreate: undefined;
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'ManagerDashboard'>;

interface FleetStats {
  fleetHealthScore: number;
  totalVehicles: number;
  vehiclesInService: number;
  vehiclesUnderMaintenance: number;
  activeAlerts: number;
  criticalAlerts: number;
}

interface RecentAlert {
  id: string;
  title: string;
  severity: string;
  vehicleId?: string;
  vehicleName?: string;
  createdAt: Date;
}

export default function ManagerDashboardScreen() {
  const { user, signOut, tenantId } = useAuthStore();
  const navigation = useNavigation<NavigationProp>();

  const [fleetStats, setFleetStats] = useState<FleetStats>({
    fleetHealthScore: 0,
    totalVehicles: 0,
    vehiclesInService: 0,
    vehiclesUnderMaintenance: 0,
    activeAlerts: 0,
    criticalAlerts: 0,
  });
  const [recentAlerts, setRecentAlerts] = useState<RecentAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFleetData = async () => {
    try {
      // Load vehicles
      const vehicles = await database.collections
        .get('vehicles')
        .query(Q.where('tenant_id', tenantId || ''))
        .fetch();

      const totalVehicles = vehicles.length;
      const vehiclesInService = vehicles.filter((v: any) => v.status === 'active').length;
      const vehiclesUnderMaintenance = vehicles.filter((v: any) => v.status === 'maintenance').length;

      // Load active alerts
      const alerts = await database.collections
        .get('alerts')
        .query(
          Q.where('tenant_id', tenantId || ''),
          Q.where('status', 'active')
        )
        .fetch();

      const activeAlerts = alerts.length;
      const criticalAlerts = alerts.filter((a: any) => a.severity === 'critical').length;

      // Fetch fleet health score from Supabase (calculated by ML service)
      let fleetHealthScore = 0;
      try {
        const { data: healthData } = await supabase
          .from('fleet_health')
          .select('health_score')
          .eq('tenant_id', tenantId)
          .order('calculated_at', { ascending: false })
          .limit(1)
          .single();

        if (healthData) {
          fleetHealthScore = Math.round(healthData.health_score);
        }
      } catch (error) {
        console.log('Fleet health score not available:', error);
      }

      setFleetStats({
        fleetHealthScore,
        totalVehicles,
        vehiclesInService,
        vehiclesUnderMaintenance,
        activeAlerts,
        criticalAlerts,
      });

      // Load recent alerts (top 5)
      const recentAlertsData = await database.collections
        .get('alerts')
        .query(
          Q.where('tenant_id', tenantId || ''),
          Q.where('status', 'active'),
          Q.sortBy('created_at', Q.desc),
          Q.take(5)
        )
        .fetch();

      const alertsWithVehicles = await Promise.all(
        recentAlertsData.map(async (alert: any) => {
          let vehicleName = undefined;
          if (alert.vehicleId) {
            try {
              const vehicle = await database.collections
                .get('vehicles')
                .find(alert.vehicleId);
              vehicleName = `${(vehicle as any).make} ${(vehicle as any).model}`;
            } catch (e) {
              // Vehicle not found
            }
          }

          return {
            id: alert.id,
            title: alert.title,
            severity: alert.severity,
            vehicleId: alert.vehicleId,
            vehicleName,
            createdAt: alert.createdAt,
          };
        })
      );

      setRecentAlerts(alertsWithVehicles);
    } catch (error) {
      console.error('Failed to load fleet data:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadFleetData();
  }, [user, tenantId]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadFleetData();
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return '#10b981'; // green
    if (score >= 60) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '#ef4444';
      case 'high':
        return '#f97316';
      case 'medium':
        return '#f59e0b';
      case 'low':
        return '#3b82f6';
      default:
        return '#6b7280';
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View style={styles.content}>
        <SyncStatusIndicator />

        <Text style={styles.title}>Fleet Manager</Text>
        <Text style={styles.subtitle}>Welcome, {user?.email}</Text>

        {/* Fleet Health Score Card */}
        <View style={styles.healthCard}>
          <Text style={styles.cardTitle}>Fleet Health Score</Text>
          <Text
            style={[
              styles.healthScore,
              { color: getHealthScoreColor(fleetStats.fleetHealthScore) },
            ]}
          >
            {fleetStats.fleetHealthScore || '--'}
          </Text>
          <Text style={styles.healthSubtext}>
            {fleetStats.fleetHealthScore >= 80
              ? 'Excellent condition'
              : fleetStats.fleetHealthScore >= 60
              ? 'Good condition'
              : fleetStats.fleetHealthScore > 0
              ? 'Needs attention'
              : 'Calculating...'}
          </Text>
        </View>

        {/* Fleet Statistics */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{fleetStats.totalVehicles}</Text>
            <Text style={styles.statLabel}>Total Vehicles</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#10b981' }]}>
              {fleetStats.vehiclesInService}
            </Text>
            <Text style={styles.statLabel}>In Service</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#f59e0b' }]}>
              {fleetStats.vehiclesUnderMaintenance}
            </Text>
            <Text style={styles.statLabel}>Maintenance</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#ef4444' }]}>
              {fleetStats.criticalAlerts}
            </Text>
            <Text style={styles.statLabel}>Critical Alerts</Text>
          </View>
        </View>

        {/* Active Alerts Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Active Alerts</Text>
            <View style={styles.alertBadge}>
              <Text style={styles.alertBadgeText}>{fleetStats.activeAlerts}</Text>
            </View>
          </View>

          {recentAlerts.length > 0 ? (
            <>
              {recentAlerts.map((alert) => (
                <TouchableOpacity
                  key={alert.id}
                  style={styles.alertItem}
                  onPress={() => navigation.navigate('AlertDetail', { alertId: alert.id })}
                >
                  <View
                    style={[
                      styles.severityIndicator,
                      { backgroundColor: getSeverityColor(alert.severity) },
                    ]}
                  />
                  <View style={styles.alertContent}>
                    <Text style={styles.alertTitle} numberOfLines={1}>
                      {alert.title}
                    </Text>
                    {alert.vehicleName && (
                      <Text style={styles.alertVehicle} numberOfLines={1}>
                        {alert.vehicleName}
                      </Text>
                    )}
                    <Text style={styles.alertTime}>
                      {format(alert.createdAt, 'MMM dd, hh:mm a')}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => navigation.navigate('AlertsList')}
              >
                <Text style={styles.viewAllButtonText}>View All Alerts</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.emptyText}>No active alerts</Text>
          )}
        </View>

        {/* Quick Actions Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Quick Actions</Text>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('WorkOrderCreate')}
          >
            <Text style={styles.actionButtonText}>➕ Create Work Order</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Analytics')}
          >
            <Text style={styles.actionButtonText}>📊 View Analytics</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('AlertsList')}
          >
            <Text style={styles.actionButtonText}>🔔 Manage Alerts</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 24,
  },
  healthCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  healthScore: {
    fontSize: 56,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  healthSubtext: {
    fontSize: 14,
    color: '#6b7280',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
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
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  alertBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  alertBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  severityIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  alertVehicle: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  alertTime: {
    fontSize: 11,
    color: '#9ca3af',
  },
  viewAllButton: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  viewAllButtonText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
  },
  actionButton: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 10,
  },
  actionButtonText: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '500',
  },
  signOutButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  signOutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
