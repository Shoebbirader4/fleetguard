import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useAuthStore } from '../../stores/authStore';
import { database } from '../../database';
import { supabase } from '../../lib/supabase';

type RootStackParamList = {
  DriverDashboard: undefined;
  DefectReport: { vehicleId: string };
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'DefectReport'>;
type DefectRouteProp = RouteProp<RootStackParamList, 'DefectReport'>;

type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';

interface SeverityOption {
  value: SeverityLevel;
  label: string;
  description: string;
  color: string;
}

const SEVERITY_OPTIONS: SeverityOption[] = [
  {
    value: 'low',
    label: 'Low',
    description: 'Minor issue, does not affect operation',
    color: '#10b981',
  },
  {
    value: 'medium',
    label: 'Medium',
    description: 'Moderate issue, requires attention soon',
    color: '#f59e0b',
  },
  {
    value: 'high',
    label: 'High',
    description: 'Significant issue, requires immediate attention',
    color: '#ef4444',
  },
  {
    value: 'critical',
    label: 'Critical',
    description: 'Safety risk, vehicle should not operate',
    color: '#7f1d1d',
  },
];

export default function DefectReportScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<DefectRouteProp>();
  const { vehicleId } = route.params;
  const { user, tenantId } = useAuthStore();

  const [vehicleName, setVehicleName] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<SeverityLevel>('medium');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadVehicleInfo();
  }, [vehicleId]);

  const loadVehicleInfo = async () => {
    try {
      const vehicle = await database.collections
        .get('vehicles')
        .find(vehicleId);
      
      const v = vehicle as any;
      setVehicleName(`${v.make} ${v.model} (${v.year})`);
    } catch (error) {
      console.error('Failed to load vehicle info:', error);
      Alert.alert('Error', 'Failed to load vehicle information');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera permission is required to take photos');
        return;
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
      });

      if (!result.canceled && result.assets[0]) {
        const photo = result.assets[0];
        const photoUrl = await savePhoto(photo.uri);
        setPhotos([...photos, photoUrl]);
      }
    } catch (error) {
      console.error('Failed to capture photo:', error);
      Alert.alert('Error', 'Failed to capture photo');
    }
  };

  const handleSelectPhoto = async () => {
    try {
      // Request media library permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Photo library permission is required');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsMultipleSelection: true,
      });

      if (!result.canceled && result.assets.length > 0) {
        const photoUrls = await Promise.all(
          result.assets.map((asset) => savePhoto(asset.uri))
        );
        setPhotos([...photos, ...photoUrls]);
      }
    } catch (error) {
      console.error('Failed to select photos:', error);
      Alert.alert('Error', 'Failed to select photos');
    }
  };

  const savePhoto = async (uri: string): Promise<string> => {
    try {
      // Generate unique filename
      const timestamp = Date.now();
      const filename = `defect_${vehicleId}_${timestamp}.jpg`;
      const localPath = `${FileSystem.documentDirectory}defects/${filename}`;

      // Create directory if it doesn't exist
      const dirInfo = await FileSystem.getInfoAsync(`${FileSystem.documentDirectory}defects`);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}defects`, {
          intermediates: true,
        });
      }

      // Copy file to local directory
      await FileSystem.copyAsync({
        from: uri,
        to: localPath,
      });

      return localPath;
    } catch (error) {
      console.error('Failed to save photo:', error);
      throw error;
    }
  };

  const handleRemovePhoto = (index: number) => {
    const newPhotos = [...photos];
    newPhotos.splice(index, 1);
    setPhotos(newPhotos);
  };

  const validateForm = (): boolean => {
    if (!description.trim()) {
      Alert.alert('Missing Information', 'Please provide a description of the defect');
      return false;
    }

    if (severity === 'critical' && photos.length === 0) {
      Alert.alert(
        'Photo Required',
        'Critical defects require at least one photo for documentation'
      );
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);

    try {
      // Create work order for the defect
      const workOrderNumber = `WO-${Date.now()}`;
      
      await database.write(async () => {
        const workOrdersCollection = database.collections.get('work_orders');
        await workOrdersCollection.create((workOrder: any) => {
          workOrder.tenantId = tenantId;
          workOrder.workOrderNumber = workOrderNumber;
          workOrder.vehicleId = vehicleId;
          workOrder.description = `[DEFECT] ${description}`;
          workOrder.priority = severity;
          workOrder.status = 'pending';
          workOrder.requestedBy = user?.id;
          workOrder.totalLaborHours = 0;
          workOrder.totalCost = 0;
          workOrder.synced = false;
          workOrder.createdAt = Date.now();
          workOrder.updatedAt = Date.now();
        });
      });

      // If critical, create an alert for immediate notification
      if (severity === 'critical' || severity === 'high') {
        await database.write(async () => {
          const alertsCollection = database.collections.get('alerts');
          await alertsCollection.create((alert: any) => {
            alert.tenantId = tenantId;
            alert.vehicleId = vehicleId;
            alert.alertType = 'safety_risk';
            alert.severity = severity;
            alert.title = `${severity.toUpperCase()} Defect Reported`;
            alert.description = description;
            alert.status = 'active';
            alert.synced = false;
            alert.createdAt = Date.now();
            alert.updatedAt = Date.now();
          });
        });

        Alert.alert(
          'Critical Defect Reported',
          'A critical defect notification has been sent to Fleet Manager and Workshop Manager. Work order created.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert(
          'Defect Reported',
          `Work order ${workOrderNumber} created successfully. Severity: ${severity.toUpperCase()}`,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Failed to save defect report:', error);
      Alert.alert('Error', 'Failed to save defect report. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

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
        <Text style={styles.title}>Report Defect</Text>
        <Text style={styles.subtitle}>{vehicleName}</Text>

        {/* Description */}
        <View style={styles.card}>
          <Text style={styles.label}>Defect Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe the issue in detail..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={5}
          />
        </View>

        {/* Severity Selection */}
        <View style={styles.card}>
          <Text style={styles.label}>Severity Level *</Text>
          {SEVERITY_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.severityOption,
                severity === option.value && {
                  borderColor: option.color,
                  backgroundColor: `${option.color}15`,
                },
              ]}
              onPress={() => setSeverity(option.value)}
            >
              <View style={styles.severityHeader}>
                <View
                  style={[
                    styles.severityIndicator,
                    { backgroundColor: option.color },
                  ]}
                />
                <Text
                  style={[
                    styles.severityLabel,
                    severity === option.value && { color: option.color, fontWeight: '600' },
                  ]}
                >
                  {option.label}
                </Text>
              </View>
              <Text style={styles.severityDescription}>{option.description}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Photo Upload */}
        <View style={styles.card}>
          <Text style={styles.label}>
            Photos {severity === 'critical' && '(Required)'}
          </Text>
          <View style={styles.photoButtons}>
            <TouchableOpacity style={styles.photoButton} onPress={handleTakePhoto}>
              <Text style={styles.photoButtonText}>📷 Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoButton} onPress={handleSelectPhoto}>
              <Text style={styles.photoButtonText}>🖼️ Choose Photos</Text>
            </TouchableOpacity>
          </View>

          {photos.length > 0 && (
            <View style={styles.photoList}>
              {photos.map((photo, index) => (
                <View key={index} style={styles.photoItem}>
                  <Text style={styles.photoName}>Photo {index + 1}</Text>
                  <TouchableOpacity onPress={() => handleRemovePhoto(index)}>
                    <Text style={styles.photoRemove}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, isSaving && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Defect Report</Text>
          )}
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            ℹ️ Critical and High severity defects will immediately notify the Fleet Manager
            and Workshop Manager.
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 20,
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
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 120,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  severityOption: {
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  severityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  severityIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  severityLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  severityDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 20,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  photoButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  photoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  photoList: {
    marginTop: 12,
  },
  photoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  photoName: {
    fontSize: 14,
    color: '#374151',
  },
  photoRemove: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    marginBottom: 32,
  },
  infoText: {
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
  },
});
