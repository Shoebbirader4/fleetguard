import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuthStore } from '../../stores/authStore';
import { database } from '../../database';
import { format } from 'date-fns';

type RootStackParamList = {
  WorkOrderDetail: { workOrderId: string };
  MediaCapture: { workOrderId: string; mediaType: 'photo' | 'video' | 'voice' };
  PartsLabor: { workOrderId: string };
  ServiceHistory: { vehicleId: string };
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'WorkOrderDetail'>;
type ScreenRouteProp = RouteProp<RootStackParamList, 'WorkOrderDetail'>;

interface WorkOrderDetails {
  id: string;
  workOrderNumber: string;
  vehicleId: string;
  vehicleName: string;
  vin: string;
  description: string;
  priority: string;
  status: string;
  requestedBy: string;
  assignedTo?: string;
  startedAt?: Date;
  completedAt?: Date;
  totalLaborHours?: number;
  totalCost?: number;
  createdAt: Date;
}

export default function WorkOrderDetailScreen() {
  const { user } = useAuthStore();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ScreenRouteProp>();
  const { workOrderId } = route.params;

  const [workOrder, setWorkOrder] = useState<WorkOrderDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const loadWorkOrderDetails = async () => {
    try {
      const wo = await database.collections.get('work_orders').find(workOrderId);
      const vehicle = await database.collections.get('vehicles').find((wo as any).vehicleId);

      setWorkOrder({
        id: (wo as any).id,
        workOrderNumber: (wo as any).workOrderNumber,
        vehicleId: (wo as any).vehicleId,
        vehicleName: vehicle ? `${(vehicle as any).make} ${(vehicle as any).model}` : 'Unknown',
        vin: vehicle ? (vehicle as any).vin : 'N/A',
        description: (wo as any).description,
        priority: (wo as any).priority,
        status: (wo as any).status,
        requestedBy: (wo as any).requestedBy,
        assignedTo: (wo as any).assignedTo,
        startedAt: (wo as any).startedAt ? new Date((wo as any).startedAt) : undefined,
        completedAt: (wo as any).completedAt ? new Date((wo as any).completedAt) : undefined,
        totalLaborHours: (wo as any).totalLaborHours,
        totalCost: (wo as any).totalCost,
        createdAt: (wo as any).createdAt,
      });
    } catch (error) {
      console.error('Failed to load work order details:', error);
      Alert.alert('Error', 'Failed to load work order details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWorkOrderDetails();
  }, [workOrderId]);

  const handleStartWork = async () => {
    if (!workOrder) return;

    Alert.alert(
      'Start Work',
      'Are you sure you want to start work on this order?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start',
          onPress: async () => {
            setIsUpdating(true);
            try {
              const wo = await database.collections.get('work_orders').find(workOrderId);
              await database.write(async () => {
                await (wo as any).update((record: any) => {
                  record.status = 'in_progress';
                  record.startedAt = Date.now();
                  record.synced = false;
                });
              });
              await loadWorkOrderDetails();
              Alert.alert('Success', 'Work order started successfully');
            } catch (error) {
              console.error('Failed to start work order:', error);
              Alert.alert('Error', 'Failed to start work order');
            } finally {
              setIsUpdating(false);
            }
          },
        },
      ]
    );
  };

  const handleCompleteWork = async () => {
    if (!workOrder) return;

    Alert.alert(
      'Complete Work',
      'Are you sure you want to mark this work order as completed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            setIsUpdating(true);
            try {
              const wo = await database.collections.get('work_orders').find(workOrderId);
              await database.write(async () => {
                await (wo as any).update((record: any) => {
                  record.status = 'completed';
                  record.completedAt = Date.now();
                  record.synced = false;
                });
              });
              await loadWorkOrderDetails();
              Alert.alert('Success', 'Work order completed successfully', [
                { text: 'OK', onPress: () => navigation.goBack() }
              ]);
            } catch (error) {
              console.error('Failed to complete work order:', error);
              Alert.alert('Error', 'Failed to complete work order');
            } finally {
              setIsUpdating(false);
            }
          },
        },
      ]
    );
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

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading work order...</Text>
      </View>
    );
  }

  if (!workOrder) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Work order not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Header Card */}
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.workOrderNumber}>{workOrder.workOrderNumber}</Text>
            <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(workOrder.priority) }]}>
              <Text style={styles.badgeText}>{workOrder.priority.toUpperCase()}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(workOrder.status) }]}>
            <Text style={styles.badgeText}>
              {workOrder.status.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Vehicle Information */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Vehicle Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Vehicle:</Text>
            <Text style={styles.infoValue}>{workOrder.vehicleName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>VIN:</Text>
            <Text style={styles.infoValue}>{workOrder.vin}</Text>
          </View>
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.navigate('ServiceHistory', { vehicleId: workOrder.vehicleId })}
          >
            <Text style={styles.linkButtonText}>View Service History →</Text>
          </TouchableOpacity>
        </View>

        {/* Work Order Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Work Order Details</Text>
          <Text style={styles.description}>{workOrder.description}</Text>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Created:</Text>
            <Text style={styles.infoValue}>
              {format(workOrder.createdAt, 'MMM dd, yyyy hh:mm a')}
            </Text>
          </View>
          {workOrder.startedAt && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Started:</Text>
              <Text style={styles.infoValue}>
                {format(workOrder.startedAt, 'MMM dd, yyyy hh:mm a')}
              </Text>
            </View>
          )}
          {workOrder.completedAt && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Completed:</Text>
              <Text style={styles.infoValue}>
                {format(workOrder.completedAt, 'MMM dd, yyyy hh:mm a')}
              </Text>
            </View>
          )}
          {workOrder.totalLaborHours !== undefined && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Labor Hours:</Text>
              <Text style={styles.infoValue}>{workOrder.totalLaborHours.toFixed(2)} hrs</Text>
            </View>
          )}
          {workOrder.totalCost !== undefined && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Total Cost:</Text>
              <Text style={styles.infoValue}>${workOrder.totalCost.toFixed(2)}</Text>
            </View>
          )}
        </View>

        {/* Media Capture Actions */}
        {workOrder.status !== 'completed' && workOrder.status !== 'cancelled' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Documentation</Text>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('MediaCapture', { workOrderId: workOrder.id, mediaType: 'photo' })}
            >
              <Text style={styles.actionButtonIcon}>📸</Text>
              <Text style={styles.actionButtonText}>Capture Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('MediaCapture', { workOrderId: workOrder.id, mediaType: 'video' })}
            >
              <Text style={styles.actionButtonIcon}>🎥</Text>
              <Text style={styles.actionButtonText}>Record Video</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('MediaCapture', { workOrderId: workOrder.id, mediaType: 'voice' })}
            >
              <Text style={styles.actionButtonIcon}>🎙️</Text>
              <Text style={styles.actionButtonText}>Record Voice Note</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Parts & Labor */}
        {workOrder.status !== 'completed' && workOrder.status !== 'cancelled' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Parts & Labor</Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate('PartsLabor', { workOrderId: workOrder.id })}
            >
              <Text style={styles.primaryButtonText}>Record Parts & Labor</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Status Actions */}
        {workOrder.status === 'assigned' && (
          <TouchableOpacity
            style={[styles.primaryButton, styles.startButton, isUpdating && styles.buttonDisabled]}
            onPress={handleStartWork}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Start Work</Text>
            )}
          </TouchableOpacity>
        )}

        {workOrder.status === 'in_progress' && (
          <TouchableOpacity
            style={[styles.primaryButton, styles.completeButton, isUpdating && styles.buttonDisabled]}
            onPress={handleCompleteWork}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Complete Work Order</Text>
            )}
          </TouchableOpacity>
        )}
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  workOrderNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    width: 100,
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  description: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 12,
  },
  linkButton: {
    marginTop: 8,
  },
  linkButtonText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  actionButtonIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#eab308',
  },
  completeButton: {
    backgroundColor: '#10b981',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
