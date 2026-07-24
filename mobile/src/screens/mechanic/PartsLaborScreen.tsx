import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { database } from '../../database';
import { useAuthStore } from '../../stores/authStore';

type RootStackParamList = {
  PartsLabor: { workOrderId: string };
  WorkOrderDetail: { workOrderId: string };
};

type ScreenRouteProp = RouteProp<RootStackParamList, 'PartsLabor'>;
type NavigationProp = StackNavigationProp<RootStackParamList, 'PartsLabor'>;

interface PartEntry {
  id: string;
  partNumber: string;
  description: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

interface LaborEntry {
  id: string;
  description: string;
  hours: number;
  rate: number;
  totalCost: number;
}

export default function PartsLaborScreen() {
  const route = useRoute<ScreenRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { workOrderId } = route.params;
  const { user } = useAuthStore();

  const [parts, setParts] = useState<PartEntry[]>([]);
  const [labor, setLabor] = useState<LaborEntry[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Part form fields
  const [partNumber, setPartNumber] = useState('');
  const [partDescription, setPartDescription] = useState('');
  const [partQuantity, setPartQuantity] = useState('1');
  const [partUnitCost, setPartUnitCost] = useState('');

  // Labor form fields
  const [laborDescription, setLaborDescription] = useState('');
  const [laborHours, setLaborHours] = useState('');
  const [laborRate, setLaborRate] = useState('50'); // Default rate

  const addPart = () => {
    if (!partNumber || !partDescription || !partQuantity || !partUnitCost) {
      Alert.alert('Validation Error', 'Please fill in all part fields');
      return;
    }

    const quantity = parseFloat(partQuantity);
    const unitCost = parseFloat(partUnitCost);

    if (isNaN(quantity) || quantity <= 0) {
      Alert.alert('Validation Error', 'Quantity must be a positive number');
      return;
    }

    if (isNaN(unitCost) || unitCost <= 0) {
      Alert.alert('Validation Error', 'Unit cost must be a positive number');
      return;
    }

    const newPart: PartEntry = {
      id: Date.now().toString(),
      partNumber,
      description: partDescription,
      quantity,
      unitCost,
      totalCost: quantity * unitCost,
    };

    setParts([...parts, newPart]);

    // Reset form
    setPartNumber('');
    setPartDescription('');
    setPartQuantity('1');
    setPartUnitCost('');
  };

  const removePart = (id: string) => {
    setParts(parts.filter((p) => p.id !== id));
  };

  const addLabor = () => {
    if (!laborDescription || !laborHours || !laborRate) {
      Alert.alert('Validation Error', 'Please fill in all labor fields');
      return;
    }

    const hours = parseFloat(laborHours);
    const rate = parseFloat(laborRate);

    if (isNaN(hours) || hours <= 0) {
      Alert.alert('Validation Error', 'Hours must be a positive number');
      return;
    }

    if (isNaN(rate) || rate <= 0) {
      Alert.alert('Validation Error', 'Rate must be a positive number');
      return;
    }

    const newLabor: LaborEntry = {
      id: Date.now().toString(),
      description: laborDescription,
      hours,
      rate,
      totalCost: hours * rate,
    };

    setLabor([...labor, newLabor]);

    // Reset form
    setLaborDescription('');
    setLaborHours('');
    setLaborRate('50');
  };

  const removeLabor = (id: string) => {
    setLabor(labor.filter((l) => l.id !== id));
  };

  const calculateTotals = () => {
    const totalPartsCost = parts.reduce((sum, part) => sum + part.totalCost, 0);
    const totalLaborHours = labor.reduce((sum, l) => sum + l.hours, 0);
    const totalLaborCost = labor.reduce((sum, l) => sum + l.totalCost, 0);
    const grandTotal = totalPartsCost + totalLaborCost;

    return { totalPartsCost, totalLaborHours, totalLaborCost, grandTotal };
  };

  const handleSave = async () => {
    if (parts.length === 0 && labor.length === 0) {
      Alert.alert('Validation Error', 'Please add at least one part or labor entry');
      return;
    }

    setIsSaving(true);

    try {
      const totals = calculateTotals();

      // Update work order with totals
      const wo = await database.collections.get('work_orders').find(workOrderId);
      await database.write(async () => {
        await (wo as any).update((record: any) => {
          record.totalLaborHours = totals.totalLaborHours;
          record.totalCost = totals.grandTotal;
          record.synced = false;
        });
      });

      // TODO: Store parts and labor entries in local database
      // For now, we'll just store them in the work order metadata
      // In a production app, you'd have separate tables for work_order_parts and work_order_labor

      Alert.alert(
        'Success',
        'Parts and labor recorded successfully',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Failed to save parts/labor:', error);
      Alert.alert('Error', 'Failed to save parts and labor');
    } finally {
      setIsSaving(false);
    }
  };

  const totals = calculateTotals();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Parts Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Parts Consumed</Text>

          {parts.length > 0 && (
            <View style={styles.entriesList}>
              {parts.map((part) => (
                <View key={part.id} style={styles.entryCard}>
                  <View style={styles.entryHeader}>
                    <Text style={styles.entryTitle}>{part.partNumber}</Text>
                    <TouchableOpacity onPress={() => removePart(part.id)}>
                      <Text style={styles.removeButton}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.entryDescription}>{part.description}</Text>
                  <View style={styles.entryDetails}>
                    <Text style={styles.entryDetail}>
                      Qty: {part.quantity} × ${part.unitCost.toFixed(2)}
                    </Text>
                    <Text style={styles.entryTotal}>${part.totalCost.toFixed(2)}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={styles.form}>
            <Text style={styles.formTitle}>Add Part</Text>
            
            <Text style={styles.label}>Part Number</Text>
            <TextInput
              style={styles.input}
              value={partNumber}
              onChangeText={setPartNumber}
              placeholder="Enter part number"
              placeholderTextColor="#9ca3af"
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={styles.input}
              value={partDescription}
              onChangeText={setPartDescription}
              placeholder="Enter part description"
              placeholderTextColor="#9ca3af"
            />

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Text style={styles.label}>Quantity</Text>
                <TextInput
                  style={styles.input}
                  value={partQuantity}
                  onChangeText={setPartQuantity}
                  placeholder="Qty"
                  keyboardType="decimal-pad"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={styles.halfInput}>
                <Text style={styles.label}>Unit Cost ($)</Text>
                <TextInput
                  style={styles.input}
                  value={partUnitCost}
                  onChangeText={setPartUnitCost}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </View>

            <TouchableOpacity style={styles.addButton} onPress={addPart}>
              <Text style={styles.addButtonText}>+ Add Part</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Labor Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Labor Hours</Text>

          {labor.length > 0 && (
            <View style={styles.entriesList}>
              {labor.map((l) => (
                <View key={l.id} style={styles.entryCard}>
                  <View style={styles.entryHeader}>
                    <Text style={styles.entryTitle}>{l.description}</Text>
                    <TouchableOpacity onPress={() => removeLabor(l.id)}>
                      <Text style={styles.removeButton}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.entryDetails}>
                    <Text style={styles.entryDetail}>
                      {l.hours} hrs × ${l.rate.toFixed(2)}/hr
                    </Text>
                    <Text style={styles.entryTotal}>${l.totalCost.toFixed(2)}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={styles.form}>
            <Text style={styles.formTitle}>Add Labor</Text>
            
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={styles.input}
              value={laborDescription}
              onChangeText={setLaborDescription}
              placeholder="Enter labor description"
              placeholderTextColor="#9ca3af"
            />

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Text style={styles.label}>Hours</Text>
                <TextInput
                  style={styles.input}
                  value={laborHours}
                  onChangeText={setLaborHours}
                  placeholder="0.0"
                  keyboardType="decimal-pad"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={styles.halfInput}>
                <Text style={styles.label}>Rate ($/hr)</Text>
                <TextInput
                  style={styles.input}
                  value={laborRate}
                  onChangeText={setLaborRate}
                  placeholder="50.00"
                  keyboardType="decimal-pad"
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </View>

            <TouchableOpacity style={styles.addButton} onPress={addLabor}>
              <Text style={styles.addButtonText}>+ Add Labor</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Totals Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Summary</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Parts Total:</Text>
            <Text style={styles.summaryValue}>${totals.totalPartsCost.toFixed(2)}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Labor Hours:</Text>
            <Text style={styles.summaryValue}>{totals.totalLaborHours.toFixed(2)} hrs</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Labor Cost:</Text>
            <Text style={styles.summaryValue}>${totals.totalLaborCost.toFixed(2)}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <Text style={styles.grandTotalLabel}>Grand Total:</Text>
            <Text style={styles.grandTotalValue}>${totals.grandTotal.toFixed(2)}</Text>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Parts & Labor</Text>
          )}
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  entriesList: {
    marginBottom: 16,
  },
  entryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  entryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  removeButton: {
    fontSize: 20,
    color: '#ef4444',
    fontWeight: '700',
  },
  entryDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  entryDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  entryDetail: {
    fontSize: 14,
    color: '#374151',
  },
  entryTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2563eb',
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#111827',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  addButton: {
    backgroundColor: '#eff6ff',
    borderWidth: 2,
    borderColor: '#2563eb',
    borderStyle: 'dashed',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  addButtonText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 12,
  },
  grandTotalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  grandTotalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2563eb',
  },
  saveButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 32,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
