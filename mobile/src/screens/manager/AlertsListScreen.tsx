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
import { format } from 'date-fns';

type RootStackParamList = {
  AlertsList: undefined;
  AlertDetail: { alertId: string };
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'AlertsList'>;

interface AlertItem {
  id: string;
  title: string;
  description: string;
  severity: string;
  alertType: string;
  status: string;
  vehicleId?: string;
  vehicleName?: string;
  createdAt: Date;
}

type FilterType = 'all' | 'critical' | 'high' | 'medium' | 'low';
type SortType = 'priority' | 'date';

export default function AlertsListScreen() {
  const { tenantId } = useAuthStore();
  const navigation = useNavigation<NavigationProp>();

  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<AlertItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('priority');

  const loadAlerts = async () => {
    try {
      const alertsData = await database.collections
        .get('alerts')
        .query(
          Q.where('tenant_id', tenantId || ''),
          Q.where('status', 'active')
        )
        .fetch();

      const alertsWithVehicles = await Promise.all(
        alertsData.map(async (alert: any) => {
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
            description: alert.description,
            severity: alert.severity,
            alertType: alert.alertType,
            status: alert.status,
            vehicleId: alert.vehicleId,
            vehicleName,
            createdAt: alert.createdAt,
          };
        })
      );

      setAlerts(alertsWithVehicles);
      applyFiltersAndSort(alertsWithVehicles, filter, sortBy);
    } catch (error) {
      console.error('Failed to load alerts:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const applyFiltersAndSort = (
    alertsData: AlertItem[],
    filterType: FilterType,
    sortType: SortType
  ) => {
    // Apply filter
    let filtered = alertsData;
    if (filterType !== 'all') {
      filtered = alertsData.filter((alert) => alert.severity === filterType);
    }

    // Apply sort
    if (sortType === 'priority') {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      filtered.sort((a, b) => {
        const aOrder = severityOrder[a.severity as keyof typeof severityOrder] ?? 4;
        const bOrder = severityOrder[b.severity as keyof typeof severityOrder] ?? 4;
        return aOrder - bOrder;
      });
    } else {
      // Sort by date (newest first)
      filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    setFilteredAlerts(filtered);
  };

  useEffect(() => {
    loadAlerts();
  }, [tenantId]);

  useEffect(() => {
    applyFiltersAndSort(alerts, filter, sortBy);
  }, [filter, sortBy]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadAlerts();
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

  const renderFilterButton = (filterType: FilterType, label: string) => (
    <TouchableOpacity
      style={[styles.filterButton, filter === filterType && styles.filterButtonActive]}
      onPress={() => setFilter(filterType)}
    >
      <Text
        style={[styles.filterButtonText, filter === filterType && styles.filterButtonTextActive]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderAlertItem = ({ item }: { item: AlertItem }) => (
    <TouchableOpacity
      style={styles.alertCard}
      onPress={() => navigation.navigate('AlertDetail', { alertId: item.id })}
    >
      <View style={[styles.severityBar, { backgroundColor: getSeverityColor(item.severity) }]} />
      <View style={styles.alertContent}>
        <View style={styles.alertHeader}>
          <Text style={styles.alertTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(item.severity) }]}>
            <Text style={styles.severityText}>{item.severity.toUpperCase()}</Text>
          </View>
        </View>
        <Text style={styles.alertDescription} numberOfLines={2}>
          {item.description}
        </Text>
        {item.vehicleName && (
          <Text style={styles.vehicleInfo}>🚗 {item.vehicleName}</Text>
        )}
        <View style={styles.alertFooter}>
          <Text style={styles.alertType}>{item.alertType.replace(/_/g, ' ')}</Text>
          <Text style={styles.alertTime}>{format(item.createdAt, 'MMM dd, hh:mm a')}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading alerts...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filter Section */}
      <View style={styles.filtersContainer}>
        <Text style={styles.sectionTitle}>Filter by Severity</Text>
        <View style={styles.filterRow}>
          {renderFilterButton('all', 'All')}
          {renderFilterButton('critical', 'Critical')}
          {renderFilterButton('high', 'High')}
          {renderFilterButton('medium', 'Medium')}
          {renderFilterButton('low', 'Low')}
        </View>
      </View>

      {/* Sort Section */}
      <View style={styles.sortContainer}>
        <Text style={styles.sectionTitle}>Sort by</Text>
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'priority' && styles.sortButtonActive]}
            onPress={() => setSortBy('priority')}
          >
            <Text
              style={[styles.sortButtonText, sortBy === 'priority' && styles.sortButtonTextActive]}
            >
              Priority
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'date' && styles.sortButtonActive]}
            onPress={() => setSortBy('date')}
          >
            <Text style={[styles.sortButtonText, sortBy === 'date' && styles.sortButtonTextActive]}>
              Date
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Results Count */}
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsText}>
          {filteredAlerts.length} {filteredAlerts.length === 1 ? 'alert' : 'alerts'}
        </Text>
      </View>

      {/* Alerts List */}
      {filteredAlerts.length > 0 ? (
        <FlatList
          data={filteredAlerts}
          renderItem={renderAlertItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No alerts found</Text>
          <Text style={styles.emptySubtext}>
            {filter !== 'all'
              ? 'Try adjusting your filters'
              : 'All clear! No active alerts at the moment.'}
          </Text>
        </View>
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
  filtersContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sortContainer: {
    backgroundColor: '#fff',
    padding: 16,
    paddingTop: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  filterButtonText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  sortButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginRight: 8,
  },
  sortButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  sortButtonText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  sortButtonTextActive: {
    color: '#fff',
  },
  resultsContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  resultsText: {
    fontSize: 13,
    color: '#6b7280',
  },
  listContent: {
    padding: 16,
  },
  alertCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  severityBar: {
    width: 4,
  },
  alertContent: {
    flex: 1,
    padding: 14,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  alertTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginRight: 8,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  severityText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  alertDescription: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 8,
    lineHeight: 18,
  },
  vehicleInfo: {
    fontSize: 12,
    color: '#2563eb',
    marginBottom: 8,
  },
  alertFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertType: {
    fontSize: 11,
    color: '#9ca3af',
    textTransform: 'capitalize',
  },
  alertTime: {
    fontSize: 11,
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
    color: '#111827',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});
