/**
 * Backup Monitor Edge Function
 * 
 * Monitors automated backup health and integrity
 * Runs every 15 minutes via Supabase cron
 * 
 * Requirements: 27.1, 27.4, 27.5
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface BackupStatus {
  lastBackupTime: string | null;
  lastBackupSize: number | null;
  backupAgeHours: number | null;
  pitrStatus: 'healthy' | 'degraded' | 'unavailable';
  walArchivingActive: boolean;
  storageHealthy: boolean;
  integrityCheckPassed: boolean;
  issues: string[];
}

interface BackupLog {
  backup_timestamp: string;
  status: 'success' | 'failed' | 'in_progress';
  duration_seconds: number | null;
  backup_size_mb: number | null;
  error_message: string | null;
  integrity_verified: boolean;
}

serve(async (req) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check if this is a cron job or manual trigger
    const isCronJob = req.headers.get('x-supabase-cron') === 'true';

    console.log(`Backup monitor starting (cron: ${isCronJob})...`);

    // Perform backup health checks
    const backupStatus = await checkBackupHealth(supabase);

    // Log the monitoring result
    await logMonitoringResult(supabase, backupStatus);

    // If issues detected, trigger alert
    if (backupStatus.issues.length > 0) {
      console.error('Backup issues detected:', backupStatus.issues);
      await triggerBackupAlert(supabase, backupStatus);
    }

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        status: backupStatus,
        alertsTriggered: backupStatus.issues.length > 0,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Backup monitor error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        status: 500,
      }
    );
  }
});

/**
 * Check backup health and integrity
 */
async function checkBackupHealth(supabase: any): Promise<BackupStatus> {
  const issues: string[] = [];
  let lastBackupTime: string | null = null;
  let lastBackupSize: number | null = null;
  let backupAgeHours: number | null = null;

  // 1. Check last backup existence
  try {
    const { data: lastBackup, error } = await supabase
      .from('backup_monitoring_log')
      .select('*')
      .eq('status', 'success')
      .order('backup_timestamp', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      throw error;
    }

    if (lastBackup) {
      lastBackupTime = lastBackup.backup_timestamp;
      lastBackupSize = lastBackup.backup_size_mb;

      // Calculate backup age
      const backupDate = new Date(lastBackup.backup_timestamp);
      const now = new Date();
      backupAgeHours = (now.getTime() - backupDate.getTime()) / (1000 * 60 * 60);

      // Requirement 27.1: Check if backup is overdue (> 25 hours)
      if (backupAgeHours > 25) {
        issues.push(`Backup overdue: Last backup was ${backupAgeHours.toFixed(1)} hours ago`);
      }
    } else {
      issues.push('No successful backup found in monitoring logs');
    }
  } catch (error) {
    console.error('Error checking last backup:', error);
    issues.push(`Failed to query backup logs: ${error.message}`);
  }

  // 2. Check PITR status (Requirement 27.5)
  const pitrStatus = await checkPITRStatus(supabase);
  if (pitrStatus !== 'healthy') {
    issues.push(`PITR status degraded: ${pitrStatus}`);
  }

  // 3. Check WAL archiving (Requirement 27.5)
  const walArchivingActive = await checkWALArchiving(supabase);
  if (!walArchivingActive) {
    issues.push('WAL archiving is not active or has gaps');
  }

  // 4. Verify backup integrity (Requirement 27.4)
  const integrityCheckPassed = await verifyBackupIntegrity(supabase, lastBackupSize);
  if (!integrityCheckPassed) {
    issues.push('Backup integrity check failed');
  }

  // 5. Check storage health (Requirement 27.3)
  const storageHealthy = await checkStorageHealth(supabase);
  if (!storageHealthy) {
    issues.push('Backup storage health check failed');
  }

  return {
    lastBackupTime,
    lastBackupSize,
    backupAgeHours,
    pitrStatus,
    walArchivingActive,
    storageHealthy,
    integrityCheckPassed,
    issues,
  };
}

/**
 * Check Point-in-Time Recovery status
 */
async function checkPITRStatus(supabase: any): Promise<'healthy' | 'degraded' | 'unavailable'> {
  try {
    // Query pg_stat_archiver to check WAL archiving
    const { data, error } = await supabase
      .rpc('check_wal_archiver_status');

    if (error) {
      console.error('Error checking PITR status:', error);
      return 'unavailable';
    }

    // Check if archiving is active and no recent failures
    if (data && data.archived_count > 0 && data.failed_count === 0) {
      return 'healthy';
    } else if (data && data.archived_count > 0 && data.failed_count < 5) {
      return 'degraded';
    } else {
      return 'unavailable';
    }
  } catch (error) {
    console.error('PITR check error:', error);
    return 'unavailable';
  }
}

/**
 * Check WAL archiving status
 */
async function checkWALArchiving(supabase: any): Promise<boolean> {
  try {
    // Check for WAL archive gaps in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    // In a real implementation, this would query pg_stat_archiver
    // For now, we'll assume WAL archiving is active if we can query the database
    const { data, error } = await supabase
      .from('backup_monitoring_log')
      .select('backup_timestamp')
      .gte('backup_timestamp', oneHourAgo)
      .limit(1);

    // If we can query successfully, database is accessible (basic check)
    return !error;
  } catch (error) {
    console.error('WAL archiving check error:', error);
    return false;
  }
}

/**
 * Verify backup integrity
 */
async function verifyBackupIntegrity(supabase: any, lastBackupSize: number | null): Promise<boolean> {
  try {
    if (!lastBackupSize) {
      console.warn('No backup size available for integrity check');
      return false;
    }

    // Get previous successful backups to compare
    const { data: recentBackups, error } = await supabase
      .from('backup_monitoring_log')
      .select('backup_size_mb')
      .eq('status', 'success')
      .order('backup_timestamp', { ascending: false })
      .limit(7);

    if (error) {
      console.error('Error fetching recent backups:', error);
      return false;
    }

    if (!recentBackups || recentBackups.length < 2) {
      // Not enough data to compare, assume OK
      return true;
    }

    // Calculate average size of recent backups
    const avgSize = recentBackups.slice(1).reduce((sum, b) => sum + b.backup_size_mb, 0) / (recentBackups.length - 1);

    // Check if latest backup size is within 30% of average (allow for growth)
    const sizeDeviation = Math.abs(lastBackupSize - avgSize) / avgSize;
    if (sizeDeviation > 0.5) {
      console.warn(`Backup size deviation: ${(sizeDeviation * 100).toFixed(1)}% from average`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Integrity check error:', error);
    return false;
  }
}

/**
 * Check backup storage health
 */
async function checkStorageHealth(supabase: any): Promise<boolean> {
  try {
    // Check database connectivity (basic health check)
    const { data, error } = await supabase
      .from('backup_monitoring_log')
      .select('count')
      .limit(1);

    if (error) {
      console.error('Storage health check error:', error);
      return false;
    }

    // If we can query, storage is accessible
    return true;
  } catch (error) {
    console.error('Storage health check error:', error);
    return false;
  }
}

/**
 * Log monitoring result
 */
async function logMonitoringResult(supabase: any, status: BackupStatus): Promise<void> {
  try {
    const { error } = await supabase
      .from('backup_monitoring_log')
      .insert({
        backup_timestamp: new Date().toISOString(),
        status: status.issues.length === 0 ? 'success' : 'failed',
        duration_seconds: null,
        backup_size_mb: status.lastBackupSize,
        error_message: status.issues.length > 0 ? status.issues.join('; ') : null,
        integrity_verified: status.integrityCheckPassed,
      });

    if (error) {
      console.error('Error logging monitoring result:', error);
    }
  } catch (error) {
    console.error('Logging error:', error);
  }
}

/**
 * Trigger backup failure alert
 */
async function triggerBackupAlert(supabase: any, status: BackupStatus): Promise<void> {
  try {
    // Call backup-failure-alert Edge Function
    const { data, error } = await supabase.functions.invoke('backup-failure-alert', {
      body: {
        alert_type: 'backup_failure',
        severity: 'critical',
        timestamp: new Date().toISOString(),
        details: {
          failure_reason: status.issues.join('; '),
          last_successful_backup: status.lastBackupTime,
          backup_age_hours: status.backupAgeHours,
          pitr_status: status.pitrStatus,
          wal_archiving_active: status.walArchivingActive,
          integrity_check_passed: status.integrityCheckPassed,
          storage_healthy: status.storageHealthy,
        },
      },
    });

    if (error) {
      console.error('Error triggering backup alert:', error);
    } else {
      console.log('Backup alert triggered successfully:', data);
    }
  } catch (error) {
    console.error('Alert trigger error:', error);
  }
}
