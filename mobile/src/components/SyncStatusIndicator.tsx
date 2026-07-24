import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { syncEngine, SyncStatus } from '../lib/syncEngine';

/**
 * Sync status indicator component
 * Shows sync status, pending changes, and last sync time
 * Allows manual sync trigger
 */
export default function SyncStatusIndicator() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isSyncing: false,
    lastSyncTime: null,
    lastSyncSuccess: true,
    pendingChanges: 0,
  });

  useEffect(() => {
    // Initial status fetch
    syncEngine.getStatus().then(setSyncStatus);

    // Subscribe to sync status updates
    const unsubscribe = syncEngine.addSyncListener(setSyncStatus);

    return unsubscribe;
  }, []);

  const handleManualSync = async () => {
    if (!syncStatus.isSyncing) {
      await syncEngine.sync();
    }
  };

  const formatLastSync = (date: Date | null): string => {
    if (!date) return 'Never';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.statusRow}>
        <View style={styles.statusInfo}>
          {syncStatus.isSyncing ? (
            <>
              <ActivityIndicator size="small" color="#2563eb" />
              <Text style={styles.statusText}>Syncing...</Text>
            </>
          ) : (
            <>
              <View
                style={[
                  styles.statusDot,
                  syncStatus.lastSyncSuccess ? styles.successDot : styles.errorDot,
                ]}
              />
              <Text style={styles.statusText}>
                {syncStatus.pendingChanges > 0
                  ? `${syncStatus.pendingChanges} pending`
                  : 'Synced'}
              </Text>
            </>
          )}
        </View>

        <Text style={styles.lastSyncText}>
          Last sync: {formatLastSync(syncStatus.lastSyncTime)}
        </Text>
      </View>

      {syncStatus.pendingChanges > 0 && !syncStatus.isSyncing && (
        <TouchableOpacity
          style={styles.syncButton}
          onPress={handleManualSync}
          activeOpacity={0.7}
        >
          <Text style={styles.syncButtonText}>Sync Now</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  successDot: {
    backgroundColor: '#10b981',
  },
  errorDot: {
    backgroundColor: '#ef4444',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  lastSyncText: {
    fontSize: 12,
    color: '#6b7280',
  },
  syncButton: {
    backgroundColor: '#2563eb',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 8,
    alignItems: 'center',
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
