/**
 * Notification Service Configuration Module
 * 
 * Centralizes all notification channel configurations and credentials.
 * Validates that required environment variables are set for each channel.
 * 
 * Requirements: 10.2 - Multi-channel notification support
 */

// ============================================================================
// Types
// ============================================================================

export type NotificationChannel = 'email' | 'push';

export interface ChannelConfig {
  enabled: boolean;
  configured: boolean;
  missingVars?: string[];
}

export interface NotificationConfig {
  email: {
    fromEmail: string;
    fromName: string;
    useSupabaseEmail: boolean;
  };
  fcm: {
    serverKey: string;
    projectId: string;
    serviceAccountKeyPath?: string;
    apiUrl: string;
  };
  retry: {
    maxAttempts: number;
    backoffDelays: number[];
  };
  processing: {
    batchSize: number;
  };
}

// ============================================================================
// Environment Variable Loading
// ============================================================================

/**
 * Load notification configuration from environment variables
 */
export function loadNotificationConfig(): NotificationConfig {
  return {
    email: {
      fromEmail: Deno.env.get('EMAIL_FROM') || 'noreply@fleetguard.ai',
      fromName: Deno.env.get('EMAIL_FROM_NAME') || 'FleetGuard AI',
      useSupabaseEmail: true, // Always use Supabase built-in email
    },
    fcm: {
      serverKey: Deno.env.get('FCM_SERVER_KEY') || '',
      projectId: Deno.env.get('FCM_PROJECT_ID') || '',
      serviceAccountKeyPath: Deno.env.get('FCM_SERVICE_ACCOUNT_KEY_PATH'),
      apiUrl: 'https://fcm.googleapis.com/fcm/send',
    },
    retry: {
      maxAttempts: parseInt(Deno.env.get('MAX_RETRY_ATTEMPTS') || '3', 10),
      backoffDelays: (Deno.env.get('RETRY_BACKOFF_DELAYS') || '60000,300000,900000')
        .split(',')
        .map((delay) => parseInt(delay, 10)),
    },
    processing: {
      batchSize: parseInt(Deno.env.get('JOB_BATCH_SIZE') || '100', 10),
    },
  };
}

/**
 * Check if a notification channel is properly configured
 */
export function getChannelStatus(channel: NotificationChannel): ChannelConfig {
  const config = loadNotificationConfig();
  const missingVars: string[] = [];

  switch (channel) {
    case 'email': {
      // Supabase email is always configured (no API key needed)
      return {
        enabled: true,
        configured: true,
        missingVars: undefined,
      };
    }

    case 'push': {
      if (!config.fcm.serverKey) missingVars.push('FCM_SERVER_KEY');
      
      return {
        enabled: true,
        configured: missingVars.length === 0,
        missingVars: missingVars.length > 0 ? missingVars : undefined,
      };
    }

    default:
      return {
        enabled: false,
        configured: false,
        missingVars: ['Unknown channel'],
      };
  }
}

/**
 * Get status of all notification channels
 */
export function getAllChannelStatus(): Record<NotificationChannel, ChannelConfig> {
  return {
    email: getChannelStatus('email'),
    push: getChannelStatus('push'),
  };
}

/**
 * Validate that at least one notification channel is configured
 */
export function validateNotificationConfig(): {
  valid: boolean;
  configuredChannels: NotificationChannel[];
  unconfiguredChannels: NotificationChannel[];
  errors: string[];
} {
  const allStatus = getAllChannelStatus();
  const channels: NotificationChannel[] = ['email', 'push'];
  
  const configuredChannels = channels.filter((ch) => allStatus[ch].configured);
  const unconfiguredChannels = channels.filter((ch) => !allStatus[ch].configured);
  
  const errors: string[] = [];
  
  if (configuredChannels.length === 0) {
    errors.push('No notification channels are configured. At least one channel is required.');
  }
  
  // Add warnings for unconfigured channels
  unconfiguredChannels.forEach((channel) => {
    const status = allStatus[channel];
    if (status.missingVars && status.missingVars.length > 0) {
      errors.push(
        `Channel '${channel}' is not configured. Missing: ${status.missingVars.join(', ')}`
      );
    }
  });

  return {
    valid: configuredChannels.length > 0,
    configuredChannels,
    unconfiguredChannels,
    errors,
  };
}

/**
 * Get a summary of the notification configuration for logging/debugging
 */
export function getConfigSummary(): string {
  const validation = validateNotificationConfig();
  
  const lines = [
    '=== Notification Configuration Summary ===',
    `Configured Channels: ${validation.configuredChannels.join(', ') || 'None'}`,
    `Unconfigured Channels: ${validation.unconfiguredChannels.join(', ') || 'None'}`,
  ];
  
  if (validation.errors.length > 0) {
    lines.push('Errors/Warnings:');
    validation.errors.forEach((err) => lines.push(`  - ${err}`));
  }
  
  lines.push('=========================================');
  
  return lines.join('\n');
}
