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
import { useRoute, RouteProp } from '@react-navigation/native';
import { useAuthStore } from '../../stores/authStore';
import { database } from '../../database';
import { Q } from '@nozbe/watermelondb';
import { format } from 'date-fns';

type RootStackParamList = {
  ServiceHistory: { vehicleId: string };
};

type ScreenRouteProp = RouteProp<RootStackParamList, 'ServiceHistory'>;

interface ServiceRecord {
  id: string;
  workOrderNumber: string;
  description: string;
  status: string;
  completedAt?: Date;
  totalLaborHours?: number;
  totalCost?: number;
  createdAt: Date;
}

interface VehicleInfo {
  make: string;
  model: string;
  year: number;
  vin: string;
  currentOdometer: number;
  unit: string;
}

export default function ServiceHistoryScreen() {
  const route = useRoute<ScreenRouteProp>();
  const { vehicleId } = route.params;
  const { tenantId } = useAuthStore();

  const [vehicle, setVehicle] = useState<VehicleInfo | null>(null);
  const [serviceRecords, setServiceRecords] = useState<ServiceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'completed' | 'recent'>('all');

  const loadServiceHistory = async () => {
    try {
      // Load vehicle details
      const v = await database.collections.get('vehicles').find(vehicleId);
      setVehicle({
        make: (v as any).make,
        model: (v as any).model,
        year: (v as any).year,
        vin: (v as any).vin,
        currentOdometer: (v as any).currentOdometer,
        unit: (v as any).unit,
      });

      // Load work orders for this vehicle
      let query = database.collections
        .get('work_orders')
        .query(
          Q.where('tenant_id', tenantId || ''),
          Q.where('vehicle_id', vehicleId)
        );

      if (filter === 'completed') {
        query = database.collections
          .get('work_orders')
          .query(
            Q.where('tenant_id', tenantId || ''),
            Q.where('vehicle_id', vehicleId),
            Q.where('status', 'completed')
          );
      } else if (filter === 'recent') {
        // Last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        query = database.collections
          .get('work_orders')
          .query(
            Q.where('tenant_id', tenantId || ''),
            Q.where('vehicle_id', vehicleId),
            Q.where('created_at', Q.gte(thirtyDaysAgo.getTime()))
          );
      }

      const results = await query.fetch();

      const records: ServiceRecord[] = results.map((wo: any) => ({
        id: wo.id,
        workOrderNumber: wo.workOrderNumber,
        description: wo.description,
        status: wo.status,
        completedAt: wo.completedAt ? new Date(wo.completedAt) : undefined,
        totalLaborHours: wo.totalLaborHours,
        totalCost: wo.totalCost,
        createdAt: wo.createdAt,
      }));

      // Sort by date (newest first)
      records.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      setServiceRecords(records);
    } catch (error) {
      console.error('Failed to load service history:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadServiceHistory();
  }, [vehicleId, tenantId, filter]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadServiceHistory();
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

  const renderServiceRecord = ({ item }: { item: ServiceRecord }) => (
    <View style={styles.recordCard}>
      <View style={styles.recordHeader}>
        <Text style={styles.workOrderNumber}>{item.workOrderNumber}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.badgeText}>
            {item.status.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
      </View>

      <Text style={styles.description} numberOfLines={2}>
        {item.description}
      </Text>

      <View style={styles.recordDetails}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Created</Text>
          <Text style={styles.detailValue}>
            {format(item.createdAt, 'MMM dd, yyyy')}
          </Text>
        </View>

        {item.completedAt && (
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Completed</Text>
            <Text style={styles.detailValue}>
              {format(item.completedAt, 'MMM dd, yyyy')}
            </Text>
          </View>
        )}
      </View>

      {(item.totalLaborHours !== undefined || item.totalCost !== undefined) && (
        <View style={styles.costRow}>
          {item.totalLaborHours !== undefined && (
            <View style={styles.costItem}>
              <Text style={styles.costLabel}>Labor Hours</Text>
              <Text style={styles.costValue}>{item.totalLaborHours.toFixed(2)} hrs</Text>
            </View>
          )}
          {item.totalCost !== undefined && (
            <View style={styles.costItem}>
              <Text style={styles.costLabel}>Total Cost</Text>
              <Text style={styles.costValue}>${item.totalCost.toFixed(2)}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading service history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Vehicle Info Header */}
      {vehicle && (
        <View style={styles.vehicleCard}>
          <Text style={styles.vehicleName}>
            {vehicle.make} {vehicle.model} ({vehicle.year})
          </Text>
          <View style={styles.vehicleDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>VIN:</Text>
              <Text style={styles.detailValue}>{vehicle.vin}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Odometer:</Text>
              <Text style={styles.detailValue}>
                {vehicle.currentOdometer.toLocaleString()} {vehicle.unit}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterTabText, filter === 'all' && styles.filterTabTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'completed' && styles.filterTabActive]}
          onPress={() => setFilter('completed')}
        >
          <Text style={[styles.filterTabText, filter === 'completed' && styles.filterTabTextActive]}>
            Completed
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'recent' && styles.filterTabActive]}
          onPress={() => setFilter('recent')}
        >
          <Text style={[styles.filterTabText, filter === 'recent' && styles.filterTabTextActive]}>
            Recent
          </Text>
        </TouchableOpacity>
      </View>

      {/* Service Records List */}
      {serviceRecords.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No service records found</Text>
          <Text style={styles.emptySubtext}>
            {filter === 'completed' && 'No completed service records'}
            {filter === 'recent' && 'No service records in the last 30 days'}
            {filter === 'all' && 'No service history available'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={serviceRecords}
          renderItem={renderServiceRecord}
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
  vehicleCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  vehicleName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  vehicleDetails: {
    marginTop: 4,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 4,
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
  recordCard: {
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
  recordHeader: {
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
  description: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  recordDetails: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 8,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  costRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  costItem: {
    flex: 1,
  },
  costLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  costValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563eb',
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
