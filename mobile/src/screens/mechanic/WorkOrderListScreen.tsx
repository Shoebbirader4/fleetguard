import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
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
import { format } from 'date-fns';

type RootStackParamList = {
  WorkOrderList: undefined;
  WorkOrderDetail: { workOrderId: string };
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'WorkOrderList'>;

interface WorkOrderItem {
  id: string;
  workOrderNumber: string;
  vehicleId: string;
  vehicleName: string;
  description: string;
  priority: string;
  status: string;
  createdAt: Date;
}

export default function WorkOrderListScreen() {
  const { user, tenantId } = useAuthStore();
  const navigation = useNavigation<NavigationProp>();
  
  const [workOrders, setWorkOrders] = useState<WorkOrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'assigned' | 'in_progress'>('assigned');

  const loadWorkOrders = async () => {
    try {
      let query = database.collections
        .get('work_orders')
        .query(Q.where('tenant_id', tenantId || ''));

      // Apply filters based on selected tab
      if (filter === 'assigned') {
        query = database.collections
          .get('work_orders')
          .query(
            Q.where('tenant_id', tenantId || ''),
            Q.where('assigned_to', user?.id || ''),
            Q.where('status', Q.oneOf(['pending', 'assigned']))
          );
      } else if (filter === 'in_progress') {
        query = database.collections
          .get('work_orders')
          .query(
            Q.where('tenant_id', tenantId || ''),
            Q.where('assigned_to', user?.id || ''),
            Q.where('status', 'in_progress')
          );
      } else {
        query = database.collections
          .get('work_orders')
          .query(
            Q.where('tenant_id', tenantId || ''),
            Q.where('assigned_to', user?.id || '')
          );
      }

      const results = await query.fetch();

      // Load vehicle details for each work order
      const workOrdersWithVehicles = await Promise.all(
        results.map(async (wo: any) => {
          const vehicle = await database.collections
            .get('vehicles')
            .find(wo.vehicleId);

          return {
            id: wo.id,
            workOrderNumber: wo.workOrderNumber,
            vehicleId: wo.vehicleId,
            vehicleName: vehicle ? `${(vehicle as any).make} ${(vehicle as any).model}` : 'Unknown Vehicle',
            description: wo.description,
            priority: wo.priority,
            status: wo.status,
            createdAt: wo.createdAt,
          };
        })
      );

      // Sort by priority and date
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      workOrdersWithVehicles.sort((a, b) => {
        const priorityDiff = priorityOrder[a.priority as keyof typeof priorityOrder] - 
                            priorityOrder[b.priority as keyof typeof priorityOrder];
        if (priorityDiff !== 0) return priorityDiff;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });

      setWorkOrders(workOrdersWithVehicles);
    } catch (error) {
      console.error('Failed to load work orders:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadWorkOrders();
  }, [user, tenantId, filter]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadWorkOrders();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return '#dc2626';
      case 'high':
        return '#ea580c';
      case 'medium':
        return '#ca8a04';
      case 'low':
        return '#16a34a';
      default:
        return '#6b7280';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#9ca3af';
      case 'assigned':
        return '#3b82f6';
      case 'in_progress':
        return '#eab308';
      case 'completed':
        return '#10b981';
      case 'cancelled':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const renderWorkOrder = ({ item }: { item: WorkOrderItem }) => (
    <TouchableOpacity
      style={styles.workOrderCard}
      onPress={() => navigation.navigate('WorkOrderDetail', { workOrderId: item.id })}
    >
      <View style={styles.workOrderHeader}>
        <Text style={styles.workOrderNumber}>{item.workOrderNumber}</Text>
        <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
          <Text style={styles.badgeText}>{item.priority.toUpperCase()}</Text>
        </View>
      </View>

      <Text style={styles.vehicleName}>{item.vehicleName}</Text>
      <Text style={styles.description} numberOfLines={2}>
        {item.description}
      </Text>

      <View style={styles.workOrderFooter}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.badgeText}>
            {item.status.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
        <Text style={styles.dateText}>
          {format(item.createdAt, 'MMM dd, yyyy')}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading work orders...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SyncStatusIndicator />

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'assigned' && styles.filterTabActive]}
          onPress={() => setFilter('assigned')}
        >
          <Text style={[styles.filterTabText, filter === 'assigned' && styles.filterTabTextActive]}>
            Assigned
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'in_progress' && styles.filterTabActive]}
          onPress={() => setFilter('in_progress')}
        >
          <Text style={[styles.filterTabText, filter === 'in_progress' && styles.filterTabTextActive]}>
            In Progress
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterTabText, filter === 'all' && styles.filterTabTextActive]}>
            All
          </Text>
        </TouchableOpacity>
      </View>

      {/* Work Orders List */}
      {workOrders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No work orders found</Text>
          <Text style={styles.emptySubtext}>
            {filter === 'assigned' && 'You have no assigned work orders'}
            {filter === 'in_progress' && 'No work orders in progress'}
            {filter === 'all' && 'No work orders available'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={workOrders}
          renderItem={renderWorkOrder}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
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
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  filterTabActive: {
    borderBottomColor: '#2563eb',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterTabTextActive: {
    color: '#2563eb',
  },
  listContent: {
    padding: 16,
  },
  workOrderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  workOrderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  workOrderNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  vehicleName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  workOrderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
});
