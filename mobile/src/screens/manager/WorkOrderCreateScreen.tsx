import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuthStore } from '../../stores/authStore';
import { database } from '../../database';
import { Q } from '@nozbe/watermelondb';

type RootStackParamList = {
  WorkOrderCreate: { vehicleId?: string; alertId?: string };
  ManagerDashboard: undefined;
};

type WorkOrderCreateRouteProp = RouteProp<RootStackParamList, 'WorkOrderCreate'>;
type NavigationProp = StackNavigationProp<RootStackParamList, 'WorkOrderCreate'>;

interface VehicleOption {
  id: string;
  label: string;
}

interface MechanicOption {
  id: string;
  label: string;
}

type Priority = 'low' | 'medium' | 'high' | 'critical';

export default function WorkOrderCreateScreen() {
  const route = useRoute<WorkOrderCreateRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { user, tenantId } = useAuthStore();
  const { vehicleId: initialVehicleId, alertId } = route.params || {};

  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [mechanics, setMechanics] = useState<MechanicOption[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(initialVehicleId || '');
  const [selectedMechanicId, setSelectedMechanicId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadOptions = async () => {
    try {
      // Load vehicles
      const vehiclesData = await database.collections
        .get('vehicles')
        .query(
          Q.where('tenant_id', tenantId || ''),
          Q.where('status', Q.oneOf(['active', 'maintenance']))
        )
        .fetch();

      const vehicleOptions = vehiclesData.map((v: any) => ({
        id: v.id,
        label: `${v.make} ${v.model} (${v.year}) - ${v.vin}`,
      }));

      setVehicles(vehicleOptions);

      // Load mechanics from local database (filtered from users)
      // In a real app, you would query the users table with role='mechanic'
      // For now, we'll use a placeholder
      const mechanicsData: MechanicOption[] = [
        { id: 'mechanic_1', label: 'Available Mechanics (load from server)' },
      ];
      setMechanics(mechanicsData);

      // If there's an alert, load its description
      if (alertId) {
        try {
          const alert = await database.collections.get('alerts').find(alertId);
          setDescription(`Alert: ${(alert as any).title}\n\n${(alert as any).description}`);
          setPriority((alert as any).severity === 'critical' ? 'critical' : 'high');
        } catch (e) {
          console.log('Alert not found:', e);
        }
      }
    } catch (error) {
      console.error('Failed to load options:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOptions();
  }, [tenantId]);

  const generateWorkOrderNumber = () => {
    // Generate a simple work order number
    const timestamp = Date.now();
    return `WO-${timestamp.toString().slice(-8)}`;
  };

  const handleSubmit = async () => {
    // Validation
    if (!selectedVehicleId) {
      Alert.alert('Validation Error', 'Please select a vehicle');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Validation Error', 'Please enter a description');
      return;
    }

    setIsSubmitting(true);

    try {
      const workOrderNumber = generateWorkOrderNumber();

      await database.write(async () => {
        const workOrdersCollection = database.collections.get('work_orders');
        await workOrdersCollection.create((workOrder: any) => {
          workOrder.tenantId = tenantId;
          workOrder.workOrderNumber = workOrderNumber;
          workOrder.vehicleId = selectedVehicleId;
          workOrder.description = description.trim();
          workOrder.priority = priority;
          workOrder.status = selectedMechanicId ? 'assigned' : 'pending';
          workOrder.requestedBy = user?.id || '';
          workOrder.assignedTo = selectedMechanicId || null;
          workOrder.synced = false;
        });
      });

      Alert.alert('Success', 'Work order created successfully', [
        {
          text: 'OK',
          onPress: () => navigation.navigate('ManagerDashboard'),
        },
      ]);
    } catch (error) {
      console.error('Failed to create work order:', error);
      Alert.alert('Error', 'Failed to create work order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderPriorityButton = (p: Priority, label: string, color: string) => (
    <TouchableOpacity
      style={[
        styles.priorityButton,
        priority === p && { backgroundColor: color, borderColor: color },
      ]}
      onPress={() => setPriority(p)}
    >
      <Text
        style={[styles.priorityButtonText, priority === p && { color: '#fff' }]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Create Work Order</Text>

        {/* Vehicle Selection */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Vehicle <Text style={styles.required}>*</Text>
          </Text>
          {vehicles.length > 0 ? (
            <View style={styles.vehicleList}>
              {vehicles.map((vehicle) => (
                <TouchableOpacity
                  key={vehicle.id}
                  style={[
                    styles.vehicleOption,
                    selectedVehicleId === vehicle.id && styles.vehicleOptionSelected,
                  ]}
                  onPress={() => setSelectedVehicleId(vehicle.id)}
                >
                  <View
                    style={[
                      styles.radioButton,
                      selectedVehicleId === vehicle.id && styles.radioButtonSelected,
                    ]}
                  />
                  <Text
                    style={[
                      styles.vehicleLabel,
                      selectedVehicleId === vehicle.id && styles.vehicleLabelSelected,
                    ]}
                  >
                    {vehicle.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>No vehicles available</Text>
          )}
        </View>

        {/* Description */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Description <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.textArea}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the issue or maintenance required..."
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </View>

        {/* Priority */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Priority <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.priorityRow}>
            {renderPriorityButton('low', 'Low', '#3b82f6')}
            {renderPriorityButton('medium', 'Medium', '#f59e0b')}
            {renderPriorityButton('high', 'High', '#f97316')}
            {renderPriorityButton('critical', 'Critical', '#ef4444')}
          </View>
        </View>

        {/* Assign Mechanic (Optional) */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Assign to Mechanic (Optional)</Text>
          {mechanics.length > 0 ? (
            <View style={styles.mechanicList}>
              <TouchableOpacity
                style={[
                  styles.mechanicOption,
                  selectedMechanicId === '' && styles.mechanicOptionSelected,
                ]}
                onPress={() => setSelectedMechanicId('')}
              >
                <View
                  style={[
                    styles.radioButton,
                    selectedMechanicId === '' && styles.radioButtonSelected,
                  ]}
                />
                <Text
                  style={[
                    styles.mechanicLabel,
                    selectedMechanicId === '' && styles.mechanicLabelSelected,
                  ]}
                >
                  Unassigned (will assign later)
                </Text>
              </TouchableOpacity>
              {mechanics.map((mechanic) => (
                <TouchableOpacity
                  key={mechanic.id}
                  style={[
                    styles.mechanicOption,
                    selectedMechanicId === mechanic.id && styles.mechanicOptionSelected,
                  ]}
                  onPress={() => setSelectedMechanicId(mechanic.id)}
                >
                  <View
                    style={[
                      styles.radioButton,
                      selectedMechanicId === mechanic.id && styles.radioButtonSelected,
                    ]}
                  />
                  <Text
                    style={[
                      styles.mechanicLabel,
                      selectedMechanicId === mechanic.id && styles.mechanicLabelSelected,
                    ]}
                  >
                    {mechanic.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>No mechanics available</Text>
          )}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? 'Creating...' : 'Create Work Order'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={isSubmitting}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
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
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  required: {
    color: '#ef4444',
  },
  vehicleList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  vehicleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  vehicleOptionSelected: {
    backgroundColor: '#eff6ff',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d1d5db',
    marginRight: 12,
  },
  radioButtonSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#2563eb',
  },
  vehicleLabel: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  vehicleLabelSelected: {
    color: '#1e40af',
    fontWeight: '600',
  },
  textArea: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    minHeight: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  priorityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  priorityButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  mechanicList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  mechanicOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  mechanicOptionSelected: {
    backgroundColor: '#eff6ff',
  },
  mechanicLabel: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  mechanicLabelSelected: {
    color: '#1e40af',
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
    padding: 16,
    textAlign: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  submitButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 32,
  },
  cancelButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '600',
  },
});
