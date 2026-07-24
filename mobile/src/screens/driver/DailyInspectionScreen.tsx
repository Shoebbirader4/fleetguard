import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
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
  DailyInspection: { vehicleId: string; checklistId: string };
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'DailyInspection'>;
type InspectionRouteProp = RouteProp<RootStackParamList, 'DailyInspection'>;

interface ChecklistItem {
  id: string;
  description: string;
  type: 'yes_no' | 'pass_fail' | 'numeric' | 'text' | 'photo';
  required: boolean;
  photo_required?: boolean;
}

interface ChecklistResult {
  item_id: string;
  result: string | number | boolean;
  notes?: string;
  photo_urls?: string[];
  compliant: boolean;
}

export default function DailyInspectionScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<InspectionRouteProp>();
  const { vehicleId, checklistId } = route.params;
  const { user, tenantId } = useAuthStore();

  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [vehicleName, setVehicleName] = useState('');
  const [currentOdometer, setCurrentOdometer] = useState('');
  const [results, setResults] = useState<Map<string, ChecklistResult>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadChecklistData();
  }, [vehicleId, checklistId]);

  const loadChecklistData = async () => {
    try {
      // Load vehicle info
      const vehicle = await database.collections
        .get('vehicles')
        .find(vehicleId);
      
      const v = vehicle as any;
      setVehicleName(`${v.make} ${v.model}`);
      setCurrentOdometer(v.currentOdometer.toString());

      // Load checklist
      const checklistDoc = await database.collections
        .get('inspection_checklists')
        .find(checklistId);

      const items = JSON.parse((checklistDoc as any).checklistItems);
      setChecklist(items);

      // Initialize results
      const initialResults = new Map<string, ChecklistResult>();
      items.forEach((item: ChecklistItem) => {
        initialResults.set(item.id, {
          item_id: item.id,
          result: item.type === 'yes_no' || item.type === 'pass_fail' ? false : '',
          compliant: true,
          photo_urls: [],
        });
      });
      setResults(initialResults);
    } catch (error) {
      console.error('Failed to load checklist:', error);
      Alert.alert('Error', 'Failed to load inspection checklist');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResultChange = (itemId: string, value: any, compliant: boolean) => {
    const current = results.get(itemId) || {
      item_id: itemId,
      result: value,
      compliant,
      photo_urls: [],
    };
    
    setResults(new Map(results.set(itemId, {
      ...current,
      result: value,
      compliant,
    })));
  };

  const handleNotesChange = (itemId: string, notes: string) => {
    const current = results.get(itemId);
    if (current) {
      setResults(new Map(results.set(itemId, {
        ...current,
        notes,
      })));
    }
  };

  const handleTakePhoto = async (itemId: string) => {
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
        
        // Upload to Supabase Storage (or keep local for offline)
        const photoUrl = await uploadPhoto(photo.uri);

        const current = results.get(itemId);
        if (current) {
          const photoUrls = current.photo_urls || [];
          photoUrls.push(photoUrl);
          
          setResults(new Map(results.set(itemId, {
            ...current,
            photo_urls: photoUrls,
          })));
        }
      }
    } catch (error) {
      console.error('Failed to capture photo:', error);
      Alert.alert('Error', 'Failed to capture photo');
    }
  };

  const uploadPhoto = async (uri: string): Promise<string> => {
    try {
      // For offline mode, save locally and return local URI
      // In online mode, upload to Supabase Storage
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        throw new Error('File does not exist');
      }

      // Generate unique filename
      const timestamp = Date.now();
      const filename = `inspection_${vehicleId}_${timestamp}.jpg`;
      const localPath = `${FileSystem.documentDirectory}inspections/${filename}`;

      // Create directory if it doesn't exist
      const dirInfo = await FileSystem.getInfoAsync(`${FileSystem.documentDirectory}inspections`);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}inspections`, {
          intermediates: true,
        });
      }

      // Copy file to local directory
      await FileSystem.copyAsync({
        from: uri,
        to: localPath,
      });

      // TODO: Upload to Supabase Storage when online
      // For now, return local path for offline-first approach
      return localPath;
    } catch (error) {
      console.error('Failed to save photo:', error);
      throw error;
    }
  };

  const validateInspection = (): boolean => {
    let isValid = true;
    let missingFields: string[] = [];

    checklist.forEach((item) => {
      const result = results.get(item.id);
      if (item.required) {
        if (!result || result.result === '' || result.result === false) {
          isValid = false;
          missingFields.push(item.description);
        }
      }

      if (item.photo_required && (!result?.photo_urls || result.photo_urls.length === 0)) {
        isValid = false;
        missingFields.push(`${item.description} (photo required)`);
      }
    });

    if (!isValid) {
      Alert.alert(
        'Incomplete Inspection',
        `Please complete the following:\n${missingFields.join('\n')}`
      );
    }

    return isValid;
  };

  const handleSubmit = async () => {
    if (!validateInspection()) {
      return;
    }

    if (!currentOdometer || isNaN(Number(currentOdometer))) {
      Alert.alert('Error', 'Please enter a valid odometer reading');
      return;
    }

    setIsSaving(true);

    try {
      // Calculate overall status
      let hasFailures = false;
      let hasWarnings = false;
      let defectsCount = 0;

      results.forEach((result) => {
        if (!result.compliant) {
          hasFailures = true;
          defectsCount++;
        }
      });

      const overallStatus = hasFailures ? 'fail' : 'pass';

      // Save inspection to local database
      await database.write(async () => {
        const inspectionsCollection = database.collections.get('inspections');
        await inspectionsCollection.create((inspection: any) => {
          inspection.tenantId = tenantId;
          inspection.vehicleId = vehicleId;
          inspection.inspectorId = user?.id;
          inspection.checklistId = checklistId;
          inspection.inspectionDate = Date.now();
          inspection.odometerReading = Number(currentOdometer);
          inspection.overallStatus = overallStatus;
          inspection.checklistResults = JSON.stringify(Array.from(results.values()));
          inspection.defectsReported = defectsCount;
          inspection.synced = false;
          inspection.createdAt = Date.now();
        });
      });

      // Update vehicle odometer
      const vehicle = await database.collections.get('vehicles').find(vehicleId);
      await database.write(async () => {
        await (vehicle as any).update((v: any) => {
          v.currentOdometer = Number(currentOdometer);
          v.synced = false;
        });
      });

      Alert.alert(
        'Inspection Complete',
        `Inspection saved successfully.\nStatus: ${overallStatus.toUpperCase()}\nDefects: ${defectsCount}`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Failed to save inspection:', error);
      Alert.alert('Error', 'Failed to save inspection. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading checklist...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Daily Inspection</Text>
        <Text style={styles.subtitle}>{vehicleName}</Text>

        {/* Odometer Input */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Odometer Reading</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter current odometer reading"
            value={currentOdometer}
            onChangeText={setCurrentOdometer}
            keyboardType="numeric"
          />
        </View>

        {/* Checklist Items */}
        {checklist.map((item, index) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemNumber}>{index + 1}</Text>
              <Text style={styles.itemDescription}>
                {item.description}
                {item.required && <Text style={styles.required}> *</Text>}
              </Text>
            </View>

            {/* Yes/No or Pass/Fail */}
            {(item.type === 'yes_no' || item.type === 'pass_fail') && (
              <View style={styles.buttonGroup}>
                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    results.get(item.id)?.result === true && styles.optionButtonSelected,
                  ]}
                  onPress={() =>
                    handleResultChange(item.id, true, item.type === 'yes_no' || item.type === 'pass_fail')
                  }
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      results.get(item.id)?.result === true && styles.optionButtonTextSelected,
                    ]}
                  >
                    {item.type === 'yes_no' ? 'Yes' : 'Pass'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    results.get(item.id)?.result === false && styles.optionButtonSelectedFail,
                  ]}
                  onPress={() => handleResultChange(item.id, false, false)}
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      results.get(item.id)?.result === false && styles.optionButtonTextSelected,
                    ]}
                  >
                    {item.type === 'yes_no' ? 'No' : 'Fail'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Numeric Input */}
            {item.type === 'numeric' && (
              <TextInput
                style={styles.input}
                placeholder="Enter value"
                value={results.get(item.id)?.result?.toString() || ''}
                onChangeText={(text) => handleResultChange(item.id, text, true)}
                keyboardType="numeric"
              />
            )}

            {/* Text Input */}
            {item.type === 'text' && (
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter notes"
                value={results.get(item.id)?.result?.toString() || ''}
                onChangeText={(text) => handleResultChange(item.id, text, true)}
                multiline
                numberOfLines={3}
              />
            )}

            {/* Notes (shown if item failed) */}
            {!results.get(item.id)?.compliant && (
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe the issue..."
                value={results.get(item.id)?.notes || ''}
                onChangeText={(text) => handleNotesChange(item.id, text)}
                multiline
                numberOfLines={3}
              />
            )}

            {/* Photo Capture */}
            {(item.type === 'photo' || item.photo_required || !results.get(item.id)?.compliant) && (
              <View style={styles.photoSection}>
                <TouchableOpacity
                  style={styles.photoButton}
                  onPress={() => handleTakePhoto(item.id)}
                >
                  <Text style={styles.photoButtonText}>
                    📷 Take Photo {item.photo_required && '*'}
                  </Text>
                </TouchableOpacity>
                {results.get(item.id)?.photo_urls && results.get(item.id)!.photo_urls!.length > 0 && (
                  <Text style={styles.photoCount}>
                    {results.get(item.id)!.photo_urls!.length} photo(s) captured
                  </Text>
                )}
              </View>
            )}
          </View>
        ))}

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, isSaving && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Complete Inspection</Text>
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
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  itemNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563eb',
    width: 30,
  },
  itemDescription: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    lineHeight: 22,
  },
  required: {
    color: '#ef4444',
    fontWeight: 'bold',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 80,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 8,
    alignItems: 'center',
  },
  optionButtonSelected: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  optionButtonSelectedFail: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  optionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  optionButtonTextSelected: {
    color: '#fff',
  },
  photoSection: {
    marginTop: 12,
  },
  photoButton: {
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
  photoCount: {
    marginTop: 8,
    fontSize: 14,
    color: '#10b981',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
