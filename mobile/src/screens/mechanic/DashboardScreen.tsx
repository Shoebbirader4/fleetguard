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
import SyncStatusIndicator from '../../components/SyncStatusIndicator';

type RootStackParamList = {
  MechanicDashboard: undefined;
  WorkOrderList: undefined;
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'MechanicDashboard'>;

interface DashboardStats {
  assignedCount: number;
  inProgressCount: number;
  completedToday: number;
}

export default function MechanicDashboardScreen() {
  const { user, signOut, tenantId } = useAuthStore();
  const navigation = useNavigation<NavigationProp>();
  
  const [stats, setStats] = useState<DashboardStats>({
    assignedCount: 0,
    inProgressCount: 0,
    completedToday: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardStats = async () => {
    try {
      // Get assigned work orders
      const assigned = await database.collections
        .get('work_orders')
        .query(
          Q.where('tenant_id', tenantId || ''),
          Q.where('assigned_to', user?.id || ''),
          Q.where('status', Q.oneOf(['pending', 'assigned']))
        )
        .fetchCount();

      // Get in-progress work orders
      const inProgress = await database.collections
        .get('work_orders')
        .query(
          Q.where('tenant_id', tenantId || ''),
          Q.where('assigned_to', user?.id || ''),
          Q.where('status', 'in_progress')
        )
        .fetchCount();

      // Get completed today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      const completedToday = await database.collections
        .get('work_orders')
        .query(
          Q.where('tenant_id', tenantId || ''),
          Q.where('assigned_to', user?.id || ''),
          Q.where('status', 'completed'),
          Q.where('completed_at', Q.gte(todayStart.getTime()))
        )
        .fetchCount();

      setStats({
        assignedCount: assigned,
        inProgressCount: inProgress,
        completedToday,
      });
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardStats();
  }, [user, tenantId]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboardStats();
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

        <Text style={styles.title}>Mechanic Dashboard</Text>
        <Text style={styles.subtitle}>Welcome, {user?.email}</Text>

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.statCardBlue]}>
            <Text style={styles.statNumber}>{stats.assignedCount}</Text>
            <Text style={styles.statLabel}>Assigned</Text>
          </View>
          <View style={[styles.statCard, styles.statCardYellow]}>
            <Text style={styles.statNumber}>{stats.inProgressCount}</Text>
            <Text style={styles.statLabel}>In Progress</Text>
          </View>
          <View style={[styles.statCard, styles.statCardGreen]}>
            <Text style={styles.statNumber}>{stats.completedToday}</Text>
            <Text style={styles.statLabel}>Completed Today</Text>
          </View>
        </View>

        {/* Work Orders Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Work Orders</Text>
          <Text style={styles.cardText}>
            You have {stats.assignedCount} assigned work order{stats.assignedCount !== 1 ? 's' : ''}
            {stats.inProgressCount > 0 && ` and ${stats.inProgressCount} in progress`}
          </Text>
          <TouchableOpacity
            style={styles.cardButton}
            onPress={() => navigation.navigate('WorkOrderList')}
          >
            <Text style={styles.cardButtonText}>View All Work Orders</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Quick Actions</Text>
          <Text style={styles.helpText}>
            Select a work order to capture media and record parts & labor
          </Text>
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
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statCardBlue: {
    backgroundColor: '#eff6ff',
  },
  statCardYellow: {
    backgroundColor: '#fef3c7',
  },
  statCardGreen: {
    backgroundColor: '#d1fae5',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
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
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  cardText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  helpText: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  cardButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cardButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
