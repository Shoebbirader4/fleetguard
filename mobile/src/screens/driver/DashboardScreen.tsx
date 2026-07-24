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
import { format } from 'date-fns';

type RootStackParamList = {
  DriverDashboard: undefined;
  DailyInspection: { vehicleId: string; checklistId: string };
  DefectReport: { vehicleId: string };
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'DriverDashboard'>;

interface VehicleData {
  id: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  currentOdometer: number;
  unit: string;
  assignedRoute?: string;
  depotLocation?: string;
  status: string;
}

interface InspectionSummary {
  lastInspection?: Date;
  totalInspections: number;
  pendingDefects: number;
}

export default function DriverDashboardScreen() {
  const { user, signOut, tenantId } = useAuthStore();
  const navigation = useNavigation<NavigationProp>();
  
  const [vehicle, setVehicle] = useState<VehicleData | null>(null);
  const [inspectionSummary, setInspectionSummary] = useState<InspectionSummary>({
    totalInspections: 0,
    pendingDefects: 0,
  });
  const [checklistId, setChecklistId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      // Load assigned vehicle
      const vehicles = await database.collections
        .get('vehicles')
        .query(
          Q.where('tenant_id', tenantId || ''),
          Q.where('status', 'active')
        )
        .fetch();

      if (vehicles.length > 0) {
        const v = vehicles[0] as any;
        setVehicle({
          id: v.id,
          make: v.make,
          model: v.model,
          year: v.year,
          vin: v.vin,
          currentOdometer: v.currentOdometer,
          unit: v.unit,
          assignedRoute: v.assignedRoute,
          depotLocation: v.depotLocation,
          status: v.status,
        });

        // Load inspection checklist for vehicle type
        const checklists = await database.collections
          .get('inspection_checklists')
          .query(
            Q.where('tenant_id', tenantId || ''),
            Q.where('vehicle_type', v.vehicleType)
          )
          .fetch();

        if (checklists.length > 0) {
          setChecklistId(checklists[0].id);
        }

        // Load inspection summary
        const inspections = await database.collections
          .get('inspections')
          .query(
            Q.where('vehicle_id', v.id),
            Q.sortBy('inspection_date', Q.desc)
          )
          .fetch();

        const lastInsp = inspections.length > 0 
          ? new Date((inspections[0] as any).inspectionDate) 
          : undefined;

        // Count pending defects (inspections with overall_status = 'fail' or 'warning')
        const pendingDefects = inspections.filter(
          (i: any) => i.overallStatus === 'fail' || i.overallStatus === 'warning'
        ).length;

        setInspectionSummary({
          lastInspection: lastInsp,
          totalInspections: inspections.length,
          pendingDefects,
        });
      }
    } catch (error) {
      console.error('Failed to load driver data:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user, tenantId]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleStartInspection = () => {
    if (vehicle && checklistId) {
      navigation.navigate('DailyInspection', {
        vehicleId: vehicle.id,
        checklistId,
      });
    }
  };

  const handleReportDefect = () => {
    if (vehicle) {
      navigation.navigate('DefectReport', {
        vehicleId: vehicle.id,
      });
    }
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

        <Text style={styles.title}>Driver Dashboard</Text>
        <Text style={styles.subtitle}>Welcome, {user?.email}</Text>

        {/* Vehicle Information Card */}
        {vehicle ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>My Vehicle</Text>
            <View style={styles.vehicleInfo}>
              <Text style={styles.vehicleName}>
                {vehicle.make} {vehicle.model} ({vehicle.year})
              </Text>
              <Text style={styles.infoRow}>
                <Text style={styles.infoLabel}>VIN:</Text> {vehicle.vin}
              </Text>
              <Text style={styles.infoRow}>
                <Text style={styles.infoLabel}>Odometer:</Text>{' '}
                {vehicle.currentOdometer.toLocaleString()} {vehicle.unit}
              </Text>
              {vehicle.assignedRoute && (
                <Text style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Route:</Text> {vehicle.assignedRoute}
                </Text>
              )}
              {vehicle.depotLocation && (
                <Text style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Depot:</Text> {vehicle.depotLocation}
                </Text>
              )}
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>
                  {vehicle.status.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>My Vehicle</Text>
            <Text style={styles.emptyText}>No vehicle assigned</Text>
          </View>
        )}

        {/* Daily Inspection Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Daily Inspection</Text>
          {inspectionSummary.lastInspection && (
            <Text style={styles.infoText}>
              Last inspection:{' '}
              {format(inspectionSummary.lastInspection, 'MMM dd, yyyy hh:mm a')}
            </Text>
          )}
          <Text style={styles.infoText}>
            Total inspections: {inspectionSummary.totalInspections}
          </Text>
          <TouchableOpacity
            style={[styles.cardButton, !vehicle && styles.cardButtonDisabled]}
            onPress={handleStartInspection}
            disabled={!vehicle || !checklistId}
          >
            <Text style={styles.cardButtonText}>Start Inspection</Text>
          </TouchableOpacity>
        </View>

        {/* Defects Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Defects</Text>
          <Text style={styles.infoText}>
            Pending defects: {inspectionSummary.pendingDefects}
          </Text>
          <TouchableOpacity
            style={[styles.cardButtonSecondary, !vehicle && styles.cardButtonDisabled]}
            onPress={handleReportDefect}
            disabled={!vehicle}
          >
            <Text style={styles.cardButtonSecondaryText}>Report New Defect</Text>
          </TouchableOpacity>
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
  vehicleInfo: {
    marginTop: 8,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  infoRow: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 6,
  },
  infoLabel: {
    fontWeight: '600',
    color: '#374151',
  },
  infoText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  cardButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  cardButtonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  cardButtonDisabled: {
    opacity: 0.5,
  },
  cardButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  cardButtonSecondaryText: {
    color: '#2563eb',
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
