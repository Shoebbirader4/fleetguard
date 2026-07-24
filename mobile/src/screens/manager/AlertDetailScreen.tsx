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
  AlertDetail: { alertId: string };
  WorkOrderCreate: { vehicleId?: string; alertId?: string };
};

type AlertDetailRouteProp = RouteProp<RootStackParamList, 'AlertDetail'>;
type NavigationProp = StackNavigationProp<RootStackParamList, 'AlertDetail'>;

interface AlertDetail {
  id: string;
  title: string;
  description: string;
  severity: string;
  alertType: string;
  status: string;
  vehicleId?: string;
  componentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface VehicleInfo {
  id: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  currentOdometer: number;
  unit: string;
  status: string;
}

interface ComponentInfo {
  id: string;
  componentType: string;
  componentSubtype?: string;
  brand?: string;
  installationDate: Date;
  installationOdometer: number;
}

export default function AlertDetailScreen() {
  const route = useRoute<AlertDetailRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuthStore();
  const { alertId } = route.params;

  const [alert, setAlert] = useState<AlertDetail | null>(null);
  const [vehicle, setVehicle] = useState<VehicleInfo | null>(null);
  const [component, setComponent] = useState<ComponentInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAcknowledging, setIsAcknowledging] = useState(false);

  const loadAlertDetails = async () => {
    try {
      const alertData = await database.collections.get('alerts').find(alertId);

      const alertDetail: AlertDetail = {
        id: (alertData as any).id,
        title: (alertData as any).title,
        description: (alertData as any).description,
        severity: (alertData as any).severity,
        alertType: (alertData as any).alertType,
        status: (alertData as any).status,
        vehicleId: (alertData as any).vehicleId,
        componentId: (alertData as any).componentId,
        createdAt: (alertData as any).createdAt,
        updatedAt: (alertData as any).updatedAt,
      };

      setAlert(alertDetail);

      // Load vehicle info if available
      if (alertDetail.vehicleId) {
        try {
          const vehicleData = await database.collections
            .get('vehicles')
            .find(alertDetail.vehicleId);

          setVehicle({
            id: (vehicleData as any).id,
            make: (vehicleData as any).make,
            model: (vehicleData as any).model,
            year: (vehicleData as any).year,
            vin: (vehicleData as any).vin,
            currentOdometer: (vehicleData as any).currentOdometer,
            unit: (vehicleData as any).unit,
            status: (vehicleData as any).status,
          });
        } catch (e) {
          console.log('Vehicle not found:', e);
        }
      }

      // Load component info if available
      if (alertDetail.componentId) {
        try {
          const componentData = await database.collections
            .get('components')
            .find(alertDetail.componentId);

          setComponent({
            id: (componentData as any).id,
            componentType: (componentData as any).componentType,
            componentSubtype: (componentData as any).componentSubtype,
            brand: (componentData as any).brand,
            installationDate: new Date((componentData as any).installationDate),
            installationOdometer: (componentData as any).installationOdometer,
          });
        } catch (e) {
          console.log('Component not found:', e);
        }
      }
    } catch (error) {
      console.error('Failed to load alert details:', error);
      Alert.alert('Error', 'Failed to load alert details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAlertDetails();
  }, [alertId]);

  const handleAcknowledge = async () => {
    if (!alert || !user) return;

    Alert.alert(
      'Acknowledge Alert',
      'Mark this alert as acknowledged?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Acknowledge',
          onPress: async () => {
            setIsAcknowledging(true);
            try {
              await database.write(async () => {
                const alertRecord = await database.collections.get('alerts').find(alertId);
                await alertRecord.update((record: any) => {
                  record.status = 'acknowledged';
                });
              });

              Alert.alert('Success', 'Alert acknowledged');
              navigation.goBack();
            } catch (error) {
              console.error('Failed to acknowledge alert:', error);
              Alert.alert('Error', 'Failed to acknowledge alert');
            } finally {
              setIsAcknowledging(false);
            }
          },
        },
      ]
    );
  };

  const handleCreateWorkOrder = () => {
    if (vehicle) {
      navigation.navigate('WorkOrderCreate', {
        vehicleId: vehicle.id,
        alertId: alert?.id,
      });
    }
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
        <Text style={styles.loadingText}>Loading alert details...</Text>
      </View>
    );
  }

  if (!alert) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Alert not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Alert Header */}
        <View style={styles.headerCard}>
          <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(alert.severity) }]}>
            <Text style={styles.severityText}>{alert.severity.toUpperCase()}</Text>
          </View>
          <Text style={styles.title}>{alert.title}</Text>
          <Text style={styles.alertType}>{alert.alertType.replace(/_/g, ' ').toUpperCase()}</Text>
        </View>

        {/* Alert Description */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Description</Text>
          <Text style={styles.description}>{alert.description}</Text>
        </View>

        {/* Vehicle Information */}
        {vehicle && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Vehicle Information</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Vehicle:</Text>
              <Text style={styles.infoValue}>
                {vehicle.make} {vehicle.model} ({vehicle.year})
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>VIN:</Text>
              <Text style={styles.infoValue}>{vehicle.vin}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Odometer:</Text>
              <Text style={styles.infoValue}>
                {vehicle.currentOdometer.toLocaleString()} {vehicle.unit}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status:</Text>
              <Text
                style={[
                  styles.infoValue,
                  {
                    color:
                      vehicle.status === 'active'
                        ? '#10b981'
                        : vehicle.status === 'maintenance'
                        ? '#f59e0b'
                        : '#6b7280',
                  },
                ]}
              >
                {vehicle.status.toUpperCase()}
              </Text>
            </View>
          </View>
        )}

        {/* Component Information */}
        {component && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Component Information</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Type:</Text>
              <Text style={styles.infoValue}>{component.componentType}</Text>
            </View>
            {component.componentSubtype && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Subtype:</Text>
                <Text style={styles.infoValue}>{component.componentSubtype}</Text>
              </View>
            )}
            {component.brand && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Brand:</Text>
                <Text style={styles.infoValue}>{component.brand}</Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Installed:</Text>
              <Text style={styles.infoValue}>
                {format(component.installationDate, 'MMM dd, yyyy')} @{' '}
                {component.installationOdometer.toLocaleString()} km
              </Text>
            </View>
          </View>
        )}

        {/* Alert Metadata */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Alert Details</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status:</Text>
            <Text style={styles.infoValue}>{alert.status.toUpperCase()}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Created:</Text>
            <Text style={styles.infoValue}>{format(alert.createdAt, 'MMM dd, yyyy hh:mm a')}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Updated:</Text>
            <Text style={styles.infoValue}>{format(alert.updatedAt, 'MMM dd, yyyy hh:mm a')}</Text>
          </View>
        </View>

        {/* Actions */}
        {alert.status === 'active' && (
          <View style={styles.actionsCard}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleCreateWorkOrder}
              disabled={!vehicle}
            >
              <Text style={styles.primaryButtonText}>Create Work Order</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleAcknowledge}
              disabled={isAcknowledging}
            >
              <Text style={styles.secondaryButtonText}>
                {isAcknowledging ? 'Acknowledging...' : 'Acknowledge Alert'}
              </Text>
            </TouchableOpacity>
          </View>
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
  headerCard: {
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
  severityBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 12,
  },
  severityText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  alertType: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
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
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
    flex: 2,
    textAlign: 'right',
  },
  actionsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '600',
  },
});
