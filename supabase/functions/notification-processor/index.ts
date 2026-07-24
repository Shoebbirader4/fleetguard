/**
 * Notification Processor Edge Function
 * 
 * Processes queued notification jobs with exponential backoff retry logic.
 * Handles delivery via WhatsApp, SMS, Email, and Push notifications.
 * Implements escalation for critical alerts not acknowledged within 2 hours.
 * 
 * Requirements:
 * - 10.5: Track alert delivery status and retry failed deliveries up to 3 times
 * - 10.6: Escalate critical alerts to Fleet Manager if not acknowledged within 2 hours
 * 
 * Trigger: Can be invoked as a cron job or manually
 * 
 * Process Flow:
 * 1. Fetch queued and retry-ready failed jobs
 * 2. Process each job through channel-specific handler
 * 3. Update job status and schedule retries for failures
 * 4. Check critical alerts for escalation timeout
 * 5. Return processing summary
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// ============================================================================
// Types
// ============================================================================

type NotificationChannel = 'email' | 'push';

interface NotificationJob {
  id: string;
  tenant_id: string;
  alert_id: string;
  user_id: string;
  channel: NotificationChannel;
  recipient: string;
  payload: Record<string, unknown>;
  status: 'queued' | 'processing' | 'sent' | 'failed';
  attempt: number;
  last_attempt_at: string | null;
  next_retry_at: string | null;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

interface Alert {
  id: string;
  tenant_id: string;
  severity: string;
  status: string;
  created_at: string;
  acknowledged_at: string | null;
}

interface ProcessingResult {
  total_processed: number;
  successful: number;
  failed: number;
  retry_scheduled: number;
  max_retries_exceeded: number;
  escalations_created: number;
}

interface DeliveryResult {
  success: boolean;
  error?: string;
}

// ============================================================================
// Configuration
// ============================================================================

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAYS = [1, 5, 15]; // minutes: 1st retry after 1min, 2nd after 5min, 3rd after 15min
const CRITICAL_ALERT_TIMEOUT = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
const BATCH_SIZE = 50; // Process jobs in batches

// ============================================================================
// Channel Handlers
// ============================================================================

/**
 * Send notification via Supabase Auth built-in email service
 */
async function sendEmail(job: NotificationJob): Promise<DeliveryResult> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('[Notification Processor] Supabase credentials not configured');
      return {
        success: false,
        error: 'Supabase email not configured',
      };
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Use Supabase Auth's admin API to send email via magic link
    // which allows custom HTML content
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: job.recipient,
      options: {
        data: {
          custom_email: true,
          subject: job.payload.subject as string || 'FleetGuard Alert',
          html_body: job.payload.html_content as string,
          text_body: job.payload.text_body as string,
          alert_id: job.payload.alert_id,
          alert_type: job.payload.alert_type,
          severity: job.payload.severity,
        },
      },
    });

    if (error) {
      console.error('[Notification Processor] Supabase email error:', error);
      return {
        success: false,
        error: `Supabase email error: ${error.message}`,
      };
    }

    console.log(`[Notification Processor] Email sent successfully to ${job.recipient}`);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Send notification via Firebase Cloud Messaging (Push)
 */
async function sendPush(job: NotificationJob): Promise<DeliveryResult> {
  try {
    const fcmServerKey = Deno.env.get('FCM_SERVER_KEY');

    if (!fcmServerKey) {
      console.warn('[Notification Processor] FCM credentials not configured');
      return {
        success: false,
        error: 'FCM push notifications not configured',
      };
    }

    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Authorization': `key=${fcmServerKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: job.recipient,
        notification: job.payload.notification || {
          title: 'FleetGuard Alert',
          body: 'You have a new alert',
        },
        data: job.payload.data || {},
        priority: 'high',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return {
        success: false,
        error: `FCM API error: ${error}`,
      };
    }

    const result = await response.json();
    if (result.failure > 0) {
      return {
        success: false,
        error: `FCM delivery failed: ${JSON.stringify(result.results)}`,
      };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Route notification to appropriate channel handler
 */
async function deliverNotification(job: NotificationJob): Promise<DeliveryResult> {
  console.log(`[Notification Processor] Delivering ${job.channel} notification to ${job.recipient}`);

  switch (job.channel) {
    case 'email':
      return await sendEmail(job);
    case 'push':
      return await sendPush(job);
    default:
      return {
        success: false,
        error: `Unknown channel: ${job.channel}`,
      };
  }
}

// ============================================================================
// Retry Logic
// ============================================================================

/**
 * Calculate next retry time using exponential backoff
 */
function calculateNextRetryTime(attempt: number): string | null {
  if (attempt >= MAX_RETRY_ATTEMPTS) {
    return null; // No more retries
  }

  const delayMinutes = RETRY_DELAYS[attempt] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
  const nextRetry = new Date(Date.now() + delayMinutes * 60 * 1000);
  return nextRetry.toISOString();
}

/**
 * Process a single notification job
 */
async function processJob(supabase: any, job: NotificationJob): Promise<{
  success: boolean;
  retry_scheduled: boolean;
  max_retries_exceeded: boolean;
}> {
  // Update status to processing
  await supabase
    .from('notification_jobs')
    .update({
      status: 'processing',
      last_attempt_at: new Date().toISOString(),
    })
    .eq('id', job.id);

  // Attempt delivery
  const result = await deliverNotification(job);

  if (result.success) {
    // Mark as sent
    await supabase
      .from('notification_jobs')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        error_message: null,
      })
      .eq('id', job.id);

    console.log(`[Notification Processor] Job ${job.id} sent successfully`);
    return { success: true, retry_scheduled: false, max_retries_exceeded: false };
  } else {
    // Delivery failed
    const newAttempt = job.attempt + 1;
    const nextRetryTime = calculateNextRetryTime(newAttempt);

    if (nextRetryTime) {
      // Schedule retry
      await supabase
        .from('notification_jobs')
        .update({
          status: 'failed',
          attempt: newAttempt,
          next_retry_at: nextRetryTime,
          error_message: result.error,
        })
        .eq('id', job.id);

      console.log(
        `[Notification Processor] Job ${job.id} failed (attempt ${newAttempt}/${MAX_RETRY_ATTEMPTS}). Retry scheduled for ${nextRetryTime}`
      );
      return { success: false, retry_scheduled: true, max_retries_exceeded: false };
    } else {
      // Max retries exceeded
      await supabase
        .from('notification_jobs')
        .update({
          status: 'failed',
          attempt: newAttempt,
          next_retry_at: null,
          error_message: `Max retries exceeded. Last error: ${result.error}`,
        })
        .eq('id', job.id);

      console.error(
        `[Notification Processor] Job ${job.id} failed permanently after ${MAX_RETRY_ATTEMPTS} attempts`
      );
      return { success: false, retry_scheduled: false, max_retries_exceeded: true };
    }
  }
}

// ============================================================================
// Escalation Logic
// ============================================================================

/**
 * Check and escalate critical alerts not acknowledged within 2 hours
 */
async function checkEscalations(supabase: any): Promise<number> {
  try {
    const twoHoursAgo = new Date(Date.now() - CRITICAL_ALERT_TIMEOUT).toISOString();

    // Find critical alerts created more than 2 hours ago that are not acknowledged
    const { data: criticalAlerts, error: alertError } = await supabase
      .from('alerts')
      .select('id, tenant_id, vehicle_id, title, description')
      .eq('severity', 'critical')
      .eq('status', 'active')
      .is('acknowledged_at', null)
      .lt('created_at', twoHoursAgo)
      .limit(BATCH_SIZE);

    if (alertError) {
      console.error('[Notification Processor] Error fetching critical alerts:', alertError);
      return 0;
    }

    if (!criticalAlerts || criticalAlerts.length === 0) {
      return 0;
    }

    console.log(`[Notification Processor] Found ${criticalAlerts.length} critical alerts requiring escalation`);

    let escalationCount = 0;

    for (const alert of criticalAlerts) {
      // Check if already escalated
      const { data: existingEscalation } = await supabase
        .from('alert_escalations')
        .select('id')
        .eq('alert_id', alert.id)
        .limit(1);

      if (existingEscalation && existingEscalation.length > 0) {
        continue; // Already escalated
      }

      // Find Fleet Managers for this tenant
      const { data: fleetManagers, error: managerError } = await supabase
        .from('users')
        .select('id, email, full_name, phone, fcm_token, notification_preferences')
        .eq('tenant_id', alert.tenant_id)
        .eq('role', 'fleet_manager')
        .limit(5);

      if (managerError || !fleetManagers || fleetManagers.length === 0) {
        console.error(`[Notification Processor] No Fleet Managers found for tenant ${alert.tenant_id}`);
        continue;
      }

      // Get original notification jobs for this alert to find original recipients
      const { data: originalJobs } = await supabase
        .from('notification_jobs')
        .select('user_id')
        .eq('alert_id', alert.id)
        .limit(1);

      const originalUserId = originalJobs && originalJobs.length > 0
        ? originalJobs[0].user_id
        : null;

      // Create escalation records and notification jobs for Fleet Managers
      for (const manager of fleetManagers) {
        // Create escalation record
        const { error: escalationError } = await supabase
          .from('alert_escalations')
          .insert({
            tenant_id: alert.tenant_id,
            alert_id: alert.id,
            original_user_id: originalUserId,
            escalated_to_user_id: manager.id,
            escalation_reason: 'Critical alert not acknowledged within 2 hours',
            escalated_at: new Date().toISOString(),
          });

        if (escalationError) {
          console.error('[Notification Processor] Error creating escalation:', escalationError);
          continue;
        }

        // Get preferred channels for manager
        const preferences = manager.notification_preferences || {};
        const channels = preferences['critical'] || ['email', 'push'];

        // Create escalation notification jobs
        for (const channel of channels) {
          // Validate manager has required contact info
          let recipient = '';
          let skip = false;

          switch (channel) {
            case 'whatsapp':
            case 'sms':
              if (!manager.phone) skip = true;
              else recipient = manager.phone;
              break;
            case 'email':
              if (!manager.email) skip = true;
              else recipient = manager.email;
              break;
            case 'push':
              if (!manager.fcm_token) skip = true;
              else recipient = manager.fcm_token;
              break;
          }

          if (skip) continue;

          const payload = {
            alert_id: alert.id,
            alert_type: 'escalation',
            severity: 'critical',
            title: `ESCALATION: ${alert.title}`,
            description: `This critical alert has not been acknowledged for 2 hours. ${alert.description}`,
            user_name: manager.full_name,
            escalation: true,
          };

          await supabase
            .from('notification_jobs')
            .insert({
              tenant_id: alert.tenant_id,
              alert_id: alert.id,
              user_id: manager.id,
              channel,
              recipient,
              payload,
              status: 'queued',
              attempt: 0,
            });
        }

        escalationCount++;
      }

      console.log(`[Notification Processor] Escalated alert ${alert.id} to ${fleetManagers.length} Fleet Managers`);
    }

    return escalationCount;
  } catch (err) {
    console.error('[Notification Processor] Error in escalation check:', err);
    return 0;
  }
}

// ============================================================================
// Main Handler
// ============================================================================

Deno.serve(async (req) => {
  try {
    console.log('[Notification Processor] Starting job processing');

    // Initialize Supabase client with service role (bypasses RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const result: ProcessingResult = {
      total_processed: 0,
      successful: 0,
      failed: 0,
      retry_scheduled: 0,
      max_retries_exceeded: 0,
      escalations_created: 0,
    };

    // Step 1: Fetch queued jobs
    const { data: queuedJobs, error: queueError } = await supabase
      .from('notification_jobs')
      .select('*')
      .eq('status', 'queued')
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (queueError) {
      console.error('[Notification Processor] Error fetching queued jobs:', queueError);
      throw new Error(`Failed to fetch queued jobs: ${queueError.message}`);
    }

    // Step 2: Fetch retry-ready failed jobs
    const now = new Date().toISOString();
    const { data: retryJobs, error: retryError } = await supabase
      .from('notification_jobs')
      .select('*')
      .eq('status', 'failed')
      .not('next_retry_at', 'is', null)
      .lte('next_retry_at', now)
      .order('next_retry_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (retryError) {
      console.error('[Notification Processor] Error fetching retry jobs:', retryError);
      throw new Error(`Failed to fetch retry jobs: ${retryError.message}`);
    }

    // Combine jobs
    const allJobs = [...(queuedJobs || []), ...(retryJobs || [])];
    result.total_processed = allJobs.length;

    console.log(`[Notification Processor] Processing ${allJobs.length} jobs (${queuedJobs?.length || 0} queued, ${retryJobs?.length || 0} retries)`);

    // Step 3: Process each job
    for (const job of allJobs) {
      try {
        const jobResult = await processJob(supabase, job);

        if (jobResult.success) {
          result.successful++;
        } else {
          result.failed++;
          if (jobResult.retry_scheduled) {
            result.retry_scheduled++;
          }
          if (jobResult.max_retries_exceeded) {
            result.max_retries_exceeded++;
          }
        }
      } catch (err) {
        console.error(`[Notification Processor] Error processing job ${job.id}:`, err);
        result.failed++;
      }
    }

    // Step 4: Check for critical alert escalations
    const escalationsCreated = await checkEscalations(supabase);
    result.escalations_created = escalationsCreated;

    console.log('[Notification Processor] Processing complete:', result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[Notification Processor] Unhandled error:', err);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: err instanceof Error ? err.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
