import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuthStore } from '../stores/authStore';

// Import screens
import LoginScreen from '../screens/auth/LoginScreen';
import DriverDashboardScreen from '../screens/driver/DashboardScreen';
import DailyInspectionScreen from '../screens/driver/DailyInspectionScreen';
import DefectReportScreen from '../screens/driver/DefectReportScreen';
import MechanicDashboardScreen from '../screens/mechanic/DashboardScreen';
import WorkOrderListScreen from '../screens/mechanic/WorkOrderListScreen';
import WorkOrderDetailScreen from '../screens/mechanic/WorkOrderDetailScreen';
import MediaCaptureScreen from '../screens/mechanic/MediaCaptureScreen';
import PartsLaborScreen from '../screens/mechanic/PartsLaborScreen';
import ServiceHistoryScreen from '../screens/mechanic/ServiceHistoryScreen';
import ManagerDashboardScreen from '../screens/manager/DashboardScreen';
import AlertsListScreen from '../screens/manager/AlertsListScreen';
import AlertDetailScreen from '../screens/manager/AlertDetailScreen';
import AnalyticsScreen from '../screens/manager/AnalyticsScreen';
import WorkOrderCreateScreen from '../screens/manager/WorkOrderCreateScreen';

export type RootStackParamList = {
  Login: undefined;
  DriverDashboard: undefined;
  DailyInspection: { vehicleId: string; checklistId: string };
  DefectReport: { vehicleId: string };
  MechanicDashboard: undefined;
  WorkOrderList: undefined;
  WorkOrderDetail: { workOrderId: string };
  MediaCapture: { workOrderId: string; mediaType: 'photo' | 'video' | 'voice' };
  PartsLabor: { workOrderId: string };
  ServiceHistory: { vehicleId: string };
  ManagerDashboard: undefined;
  AlertsList: undefined;
  AlertDetail: { alertId: string };
  Analytics: undefined;
  WorkOrderCreate: { vehicleId?: string; alertId?: string };
};

const Stack = createStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { user, role } = useAuthStore();

  // Determine initial route based on user role
  const getInitialRouteName = (): keyof RootStackParamList => {
    if (!user) return 'Login';
    
    switch (role) {
      case 'driver':
        return 'DriverDashboard';
      case 'mechanic':
        return 'MechanicDashboard';
      case 'fleet_manager':
      case 'workshop_manager':
      case 'company_owner':
        return 'ManagerDashboard';
      default:
        return 'Login';
    }
  };

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={getInitialRouteName()}
        screenOptions={{
          headerStyle: {
            backgroundColor: '#2563eb',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        {!user ? (
          <Stack.Screen 
            name="Login" 
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        ) : (
          <>
            <Stack.Screen 
              name="DriverDashboard" 
              component={DriverDashboardScreen}
              options={{ title: 'Driver Dashboard' }}
            />
            <Stack.Screen 
              name="DailyInspection" 
              component={DailyInspectionScreen}
              options={{ title: 'Daily Inspection' }}
            />
            <Stack.Screen 
              name="DefectReport" 
              component={DefectReportScreen}
              options={{ title: 'Report Defect' }}
            />
            <Stack.Screen 
              name="MechanicDashboard" 
              component={MechanicDashboardScreen}
              options={{ title: 'Mechanic Dashboard' }}
            />
            <Stack.Screen 
              name="WorkOrderList" 
              component={WorkOrderListScreen}
              options={{ title: 'Work Orders' }}
            />
            <Stack.Screen 
              name="WorkOrderDetail" 
              component={WorkOrderDetailScreen}
              options={{ title: 'Work Order Details' }}
            />
            <Stack.Screen 
              name="MediaCapture" 
              component={MediaCaptureScreen}
              options={{ title: 'Capture Media' }}
            />
            <Stack.Screen 
              name="PartsLabor" 
              component={PartsLaborScreen}
              options={{ title: 'Parts & Labor' }}
            />
            <Stack.Screen 
              name="ServiceHistory" 
              component={ServiceHistoryScreen}
              options={{ title: 'Service History' }}
            />
            <Stack.Screen 
              name="ManagerDashboard" 
              component={ManagerDashboardScreen}
              options={{ title: 'Manager Dashboard' }}
            />
            <Stack.Screen 
              name="AlertsList" 
              component={AlertsListScreen}
              options={{ title: 'Alerts' }}
            />
            <Stack.Screen 
              name="AlertDetail" 
              component={AlertDetailScreen}
              options={{ title: 'Alert Details' }}
            />
            <Stack.Screen 
              name="Analytics" 
              component={AnalyticsScreen}
              options={{ title: 'Analytics' }}
            />
            <Stack.Screen 
              name="WorkOrderCreate" 
              component={WorkOrderCreateScreen}
              options={{ title: 'Create Work Order' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
