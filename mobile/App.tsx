import React, { useEffect, useState } from 'react';
import { SafeAreaView, StatusBar, ActivityIndicator, View, StyleSheet, Alert } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import NetInfo from '@react-native-community/netinfo';
import AppNavigator from './src/navigation/AppNavigator';
import { useAuthStore } from './src/stores/authStore';
import { registerForPushNotifications } from './src/lib/notifications';
import { syncEngine } from './src/lib/syncEngine';

// Keep splash screen visible while app is loading
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const { initialize } = useAuthStore();

  useEffect(() => {
    async function prepare() {
      try {
        // Initialize auth
        await initialize();

        // Initialize sync engine
        await syncEngine.initialize();

        // Register for push notifications
        await registerForPushNotifications();

        // Mark app as ready
        setAppIsReady(true);
      } catch (error) {
        console.error('[App] Initialization failed:', error);
        setAppIsReady(true); // Continue even if initialization fails
      }
    }

    prepare();

    // Setup notification handlers
    const notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('[App] Notification received:', notification);
        // Handle foreground notifications
        const { title, body } = notification.request.content;
        Alert.alert(title || 'Notification', body || '');
      }
    );

    const responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('[App] Notification tapped:', response);
        // Handle notification tap
        const data = response.notification.request.content.data;
        
        // Navigate based on notification data
        if (data?.type === 'alert' && data?.vehicleId) {
          // TODO: Navigate to appropriate screen based on notification type
          console.log('[App] Navigate to alert for vehicle:', data.vehicleId);
        }
      }
    );

    // Cleanup on unmount
    return () => {
      syncEngine.stopBackgroundSync();
      notificationListener.remove();
      responseListener.remove();
    };
  }, [initialize]);

  useEffect(() => {
    if (appIsReady) {
      SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2563eb" />
      <AppNavigator />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
