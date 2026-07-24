/**
 * Alert Dispatcher Edge Function
 * 
 * Routes alerts to appropriate notification channels based on user preferences.
 * Creates notification jobs for each enabled channel per user.
 * 
 * Requirements:
 * - 10.2: Deliver alerts via WhatsApp, SMS, Email, and mobile app push notifications
 * - 10.3: Send notifications to all users with appropriate role permissions within 60 seconds
 * - 10.4: Allow users to configure notification preferences per alert type and delivery channel
 * 
 * Input:
 * {
 *   alert_id: UUID,
 *   user_ids?: UUID[], // Optional: specific users to notify. If not provided, derives from alert
 *   channels?: ('whatsapp' | 'sms' | 'email' | 'push')[] // Optional: override channels
 * }
 * 
 * Output:
 * {
 *   alert_id: UUID,
 *   jobs_created: number,
 *   delivery_status: {
 *     user_id: UUID,
 *     channels: {
 *       channel: 'whatsapp' | 'sms' | 'email' | 'push',
 *       status: 'queued' | 'skipped',
 *       job_id?: UUID,
 *       reason?: string
 *     }[]
 *   }[]
 * }
 */

import {
  authMiddleware,
  forbiddenResponse,
  successResponse,
  corsPreflightResponse,
} from '../_shared/auth-middleware.ts';
import { authorize } from '../shared/auth/permissions.ts';
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// ============================================================================
// Types
// ============================================================================

type NotificationChannel = 'whatsapp' | 'sms' | 'email' | 'push';

interface DispatchAlertRequest {
  alert_id: string;
  user_ids?: string[];
  channels?: NotificationChannel[];
}

interface Alert {
  id: string;
  tenant_id: string;
  vehicle_id: string | null;
  component_id: string | null;
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  status: string;
}

interface User {
  id: string;
  tenant_id: string;
  email: string;
  full_name: string;
  role: string;
  phone: string | null;
  fcm_token: string | null;
  notification_preferences: Record<string, string[]>;
}

interface NotificationJob {
  tenant_id: string;
  alert_id: string;
  user_id: string;
  channel: NotificationChannel;
  recipient: string;
  payload: Record<string, unknown>;
  status: 'queued';
  attempt: number;
}

interface ChannelStatus {
  channel: NotificationChannel;
  status: 'queued' | 'skipped';
  job_id?: string;
  reason?: string;
}

interface UserDeliveryStatus {
  user_id: string;
  channels: ChannelStatus[];
}

interface DispatchAlertResponse {
  alert_id: string;
  jobs_created: number;
  delivery_status: UserDeliveryStatus[];
}

// ============================================================================
// Alert Functions
// ============================================================================

/**
 * Get alert details by ID
 */
async function getAlert(
  supabase: SupabaseClient,
  tenantId: string,
  alertId: string
): Promise<Alert> {
  const { data, error } = await supabase
    .from('alerts')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('id', alertId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch alert: ${error.message}`);
  }

  if (!data) {
    throw new Error(`Alert not found: ${alertId}`);
  }

  return data;
}

/**
 * Get users who should be notified based on alert and roles
 * If user_ids is provided, fetch those specific users
 * Otherwise, fetch all users with roles that should be notified for this alert type
 */
async function getNotificationRecipients(
  supabase: SupabaseClient,
  tenantId: string,
  alert: Alert,
  userIds?: string[]
): Promise<User[]> {
  let query = supabase
    .from('users')
    .select('id, tenant_id, email, full_name, role, phone, fcm_token, notification_preferences')
    .eq('tenant_id', tenantId);

  if (userIds && userIds.length > 0) {
    // Fetch specific users
    query = query.in('id', userIds);
  } else {
    // Derive users based on alert type and severity
    // For critical and high severity alerts, notify managers and engineers
    // For medium and low severity, notify relevant roles
    const rolesToNotify = getRolesToNotify(alert);
    query = query.in('role', rolesToNotify);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch users: ${error.message}`);
  }

  return data || [];
}

/**
 * Determine which roles should be notified based on alert type and severity
 */
function getRolesToNotify(alert: Alert): string[] {
  const { alert_type, severity } = alert;

  // Critical and high severity alerts: notify all management
  if (severity === 'critical' || severity === 'high') {
    return [
      'company_owner',
      'fleet_manager',
      'workshop_manager',
      'maintenance_engineer',
    ];
  }

  // Medium severity: notify managers and engineers
  if (severity === 'medium') {
    return [
      'fleet_manager',
      'workshop_manager',
      'maintenance_engineer',
    ];
  }

  // Low severity: notify engineers only
  return ['maintenance_engineer', 'workshop_manager'];
}

/**
 * Get enabled channels for a user based on their preferences and alert type
 */
function getEnabledChannels(
  user: User,
  alert: Alert,
  overrideChannels?: NotificationChannel[]
): NotificationChannel[] {
  // If override channels provided, use those
  if (overrideChannels && overrideChannels.length > 0) {
    return overrideChannels;
  }

  // Get user's preferences for this alert type
  const preferences = user.notification_preferences || {};
  const channelsForAlertType = preferences[alert.alert_type] || [];

  // Default to email if no preferences set
  if (channelsForAlertType.length === 0) {
    return ['email'];
  }

  return channelsForAlertType.filter((ch: string) => 
    ['whatsapp', 'sms', 'email', 'push'].includes(ch)
  ) as NotificationChannel[];
}

/**
 * Validate if user has required contact information for a channel
 */
function canSendToChannel(
  user: User,
  channel: NotificationChannel
): { valid: boolean; reason?: string } {
  switch (channel) {
    case 'whatsapp':
    case 'sms':
      if (!user.phone) {
        return { valid: false, reason: 'No phone number configured' };
      }
      return { valid: true };

    case 'email':
      if (!user.email) {
        return { valid: false, reason: 'No email address configured' };
      }
      return { valid: true };

    case 'push':
      if (!user.fcm_token) {
        return { valid: false, reason: 'No FCM token registered' };
      }
      return { valid: true };

    default:
      return { valid: false, reason: 'Unknown channel' };
  }
}

/**
 * Get recipient address for a channel
 */
function getRecipient(user: User, channel: NotificationChannel): string {
  switch (channel) {
    case 'whatsapp':
    case 'sms':
      return user.phone || '';
    case 'email':
      return user.email;
    case 'push':
      return user.fcm_token || '';
    default:
      return '';
  }
}

/**
 * Create notification payload for a channel
 */
function createPayload(
  user: User,
  alert: Alert,
  channel: NotificationChannel
): Record<string, unknown> {
  const basePayload = {
    alert_id: alert.id,
    alert_type: alert.alert_type,
    severity: alert.severity,
    title: alert.title,
    description: alert.description,
    user_name: user.full_name,
  };

  switch (channel) {
    case 'whatsapp':
      return {
        ...basePayload,
        template: 'alert_notification',
        params: [alert.title, alert.description],
      };

    case 'sms':
      return {
        ...basePayload,
        body: `[${alert.severity.toUpperCase()}] ${alert.title}: ${alert.description}`,
      };

    case 'email':
      return {
        ...basePayload,
        template_id: 'alert_template',
        subject: `[FleetGuard] ${alert.title}`,
        html_content: formatEmailContent(alert),
      };

    case 'push':
      return {
        ...basePayload,
        notification: {
          title: alert.title,
          body: alert.description,
        },
        data: {
          alert_id: alert.id,
          alert_type: alert.alert_type,
          severity: alert.severity,
        },
      };

    default:
      return basePayload;
  }
}

/**
 * Format email content for alert notification
 */
function formatEmailContent(alert: Alert): string {
  return `
    <h2>Fleet Alert: ${alert.title}</h2>
    <p><strong>Severity:</strong> ${alert.severity.toUpperCase()}</p>
    <p><strong>Type:</strong> ${alert.alert_type}</p>
    <p><strong>Description:</strong></p>
    <p>${alert.description}</p>
    <hr>
    <p><small>This is an automated notification from FleetGuard AI.</small></p>
  `;
}

/**
 * Create a notification job in the database
 */
async function createNotificationJob(
  supabase: SupabaseClient,
  job: NotificationJob
): Promise<string> {
  const { data, error } = await supabase
    .from('notification_jobs')
    .insert({
      tenant_id: job.tenant_id,
      alert_id: job.alert_id,
      user_id: job.user_id,
      channel: job.channel,
      recipient: job.recipient,
      payload: job.payload,
      status: 'queued',
      attempt: 0,
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create notification job: ${error.message}`);
  }

  return data.id;
}

/**
 * Enqueue notification jobs for a user
 */
async function enqueueNotificationsForUser(
  supabase: SupabaseClient,
  tenantId: string,
  user: User,
  alert: Alert,
  channels: NotificationChannel[]
): Promise<ChannelStatus[]> {
  const results: ChannelStatus[] = [];

  for (const channel of channels) {
    try {
      // Validate user has required contact info for this channel
      const validation = canSendToChannel(user, channel);
      
      if (!validation.valid) {
        results.push({
          channel,
          status: 'skipped',
          reason: validation.reason,
        });
        console.log(
          `[Alert Dispatcher] Skipping ${channel} for user ${user.id}: ${validation.reason}`
        );
        continue;
      }

      // Create notification job
      const job: NotificationJob = {
        tenant_id: tenantId,
        alert_id: alert.id,
        user_id: user.id,
        channel,
        recipient: getRecipient(user, channel),
        payload: createPayload(user, alert, channel),
        status: 'queued',
        attempt: 0,
      };

      const jobId = await createNotificationJob(supabase, job);

      results.push({
        channel,
        status: 'queued',
        job_id: jobId,
      });

      console.log(
        `[Alert Dispatcher] Created ${channel} notification job ${jobId} for user ${user.id}`
      );
    } catch (err) {
      console.error(
        `[Alert Dispatcher] Failed to create ${channel} job for user ${user.id}:`,
        err
      );
      results.push({
        channel,
        status: 'skipped',
        reason: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  return results;
}

// ============================================================================
// Main Handler
// ============================================================================

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return corsPreflightResponse();
  }

  try {
    // Step 1: Authenticate
    const { authContext, supabase, error: authError } = await authMiddleware(req);

    if (authError) {
      console.error('[Alert Dispatcher] Auth error:', authError);
      return new Response(JSON.stringify(authError), {
        status: authError.code === 'MISSING_TOKEN' ? 401 : 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Step 2: Check permission
    // Only managers and engineers can dispatch alerts
    const authResult = authorize(authContext!, 'alerts:create');
    if (!authResult.authorized) {
      console.warn('[Alert Dispatcher] Authorization failed:', {
        userId: authContext!.userId,
        role: authContext!.role,
        reason: authResult.reason,
      });
      return forbiddenResponse(authResult.reason);
    }

    // Step 3: Parse and validate request body
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed. Use POST.' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body: DispatchAlertRequest = await req.json();

    // Validate required fields
    if (!body.alert_id) {
      return new Response(
        JSON.stringify({
          error: 'Missing required field',
          details: 'alert_id is required',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Alert Dispatcher] Processing alert dispatch:', {
      alertId: body.alert_id,
      userIds: body.user_ids?.length || 'all eligible',
      channels: body.channels || 'per user preferences',
    });

    // Step 4: Get alert details
    const alert = await getAlert(
      supabase,
      authContext!.tenantId,
      body.alert_id
    );

    console.log('[Alert Dispatcher] Alert details:', {
      id: alert.id,
      type: alert.alert_type,
      severity: alert.severity,
      title: alert.title,
    });

    // Step 5: Get notification recipients
    const users = await getNotificationRecipients(
      supabase,
      authContext!.tenantId,
      alert,
      body.user_ids
    );

    console.log(`[Alert Dispatcher] Found ${users.length} users to notify`);

    if (users.length === 0) {
      console.warn('[Alert Dispatcher] No users found to notify');
      return successResponse({
        alert_id: alert.id,
        jobs_created: 0,
        delivery_status: [],
      });
    }

    // Step 6: Enqueue notification jobs for each user
    const deliveryStatus: UserDeliveryStatus[] = [];
    let totalJobsCreated = 0;

    for (const user of users) {
      const enabledChannels = getEnabledChannels(user, alert, body.channels);
      
      console.log(
        `[Alert Dispatcher] Processing user ${user.id} (${user.role}) with channels:`,
        enabledChannels
      );

      const channelStatuses = await enqueueNotificationsForUser(
        supabase,
        authContext!.tenantId,
        user,
        alert,
        enabledChannels
      );

      const queuedCount = channelStatuses.filter(cs => cs.status === 'queued').length;
      totalJobsCreated += queuedCount;

      deliveryStatus.push({
        user_id: user.id,
        channels: channelStatuses,
      });
    }

    console.log(
      `[Alert Dispatcher] Successfully created ${totalJobsCreated} notification jobs for ${users.length} users`
    );

    // Step 7: Return response
    const response: DispatchAlertResponse = {
      alert_id: alert.id,
      jobs_created: totalJobsCreated,
      delivery_status: deliveryStatus,
    };

    return successResponse(response, 201);
  } catch (err) {
    console.error('[Alert Dispatcher] Unhandled error:', err);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: err instanceof Error ? err.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
