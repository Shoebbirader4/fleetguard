/**
 * Channel-specific handlers for multi-channel notification delivery
 * 
 * This module contains handlers for each notification channel:
 * - WhatsApp Business API (template messages)
 * - Twilio SMS (text messages)
 * - SendGrid Email (HTML templates)
 * - Firebase Cloud Messaging (push notifications)
 * 
 * Each handler:
 * 1. Reads jobs from notification_jobs table with status='queued'
 * 2. Calls the external API
 * 3. Updates job status based on API response
 * 4. Implements retry logic with exponential backoff
 * 
 * Requirements: 10.2, 10.3
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// ============================================================================
// Types
// ============================================================================

interface NotificationJob {
  id: string;
  tenant_id: string;
  alert_id: string;
  user_id: string;
  channel: 'email' | 'push';
  recipient: string;
  payload: Record<string, unknown>;
  status: 'queued' | 'processing' | 'sent' | 'failed';
  attempt: number;
  last_attempt_at: string | null;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

interface DeliveryResult {
  success: boolean;
  error?: string;
  messageId?: string;
}

// ============================================================================
// Environment Configuration
// ============================================================================

import { loadNotificationConfig } from '../shared/notifications/config.ts';

// Load configuration from environment variables
const config = loadNotificationConfig();

// Channel-specific configurations
const EMAIL_FROM = config.email.fromEmail;
const EMAIL_FROM_NAME = config.email.fromName;

const FCM_SERVER_KEY = config.fcm.serverKey;
const FCM_API_URL = config.fcm.apiUrl;

const MAX_RETRY_ATTEMPTS = config.retry.maxAttempts;

// ============================================================================
// Email Handler
// ============================================================================

/**
 * Send Email using Supabase Auth built-in email service
 * Sends HTML formatted emails (100% free, no API key required)
 */
async function sendEmailMessage(job: NotificationJob): Promise<DeliveryResult> {
  try {
    // Get Supabase client URL and service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return {
        success: false,
        error: 'Supabase credentials not configured',
      };
    }

    const payload = job.payload as {
      subject?: string;
      html_content?: string;
      title?: string;
      description?: string;
      severity?: string;
      alert_type?: string;
      user_name?: string;
    };

    // Build HTML email content
    const htmlContent = payload.html_content || buildEmailHTML({
      title: payload.title || 'Fleet Alert',
      description: payload.description || '',
      severity: payload.severity || 'info',
      alertType: payload.alert_type || 'general',
      userName: payload.user_name || '',
    });

    // Use Supabase Auth API to send email
    const response = await fetch(`${supabaseUrl}/auth/v1/admin/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey,
      },
      body: JSON.stringify({
        email: job.recipient,
        subject: payload.subject || `[FleetGuard] ${payload.title}`,
        html: htmlContent,
      }),
    });

    if (response.ok) {
      console.log('[Email Handler] Message sent successfully via Supabase');
      return {
        success: true,
        messageId: 'supabase-email-sent',
      };
    } else {
      const errorText = await response.text();
      console.error('[Email Handler] Failed to send message:', errorText);
      return {
        success: false,
        error: `Supabase email error: ${response.status} ${errorText}`,
      };
    }
  } catch (error) {
    console.error('[Email Handler] Exception:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Build HTML email template
 */
function buildEmailHTML(params: {
  title: string;
  description: string;
  severity: string;
  alertType: string;
  userName: string;
}): string {
  const severityColors: Record<string, string> = {
    critical: '#DC2626',
    high: '#EA580C',
    medium: '#F59E0B',
    low: '#10B981',
  };

  const severityColor = severityColors[params.severity.toLowerCase()] || '#6B7280';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${params.title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #F3F4F6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F3F4F6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px; background-color: #1F2937; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #FFFFFF; font-size: 24px; font-weight: 600;">
                🚛 FleetGuard AI
              </h1>
            </td>
          </tr>
          
          <!-- Severity Badge -->
          <tr>
            <td style="padding: 24px 40px 0 40px;">
              <div style="display: inline-block; padding: 8px 16px; background-color: ${severityColor}; color: #FFFFFF; border-radius: 4px; font-size: 12px; font-weight: 600; text-transform: uppercase;">
                ${params.severity} ALERT
              </div>
            </td>
          </tr>
          
          <!-- Alert Title -->
          <tr>
            <td style="padding: 16px 40px 0 40px;">
              <h2 style="margin: 0; color: #111827; font-size: 20px; font-weight: 600;">
                ${params.title}
              </h2>
            </td>
          </tr>
          
          <!-- Alert Description -->
          <tr>
            <td style="padding: 16px 40px;">
              <p style="margin: 0; color: #4B5563; font-size: 16px; line-height: 1.6;">
                ${params.description}
              </p>
            </td>
          </tr>
          
          <!-- Alert Details -->
          <tr>
            <td style="padding: 24px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F9FAFB; border-radius: 6px; padding: 16px;">
                <tr>
                  <td style="padding: 8px 0;">
                    <strong style="color: #374151;">Alert Type:</strong> 
                    <span style="color: #6B7280;">${params.alertType}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <strong style="color: #374151;">Recipient:</strong> 
                    <span style="color: #6B7280;">${params.userName}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Call to Action -->
          <tr>
            <td style="padding: 0 40px 32px 40px;" align="center">
              <a href="https://app.fleetguard.ai/alerts" style="display: inline-block; padding: 12px 32px; background-color: #2563EB; color: #FFFFFF; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
                View in Dashboard
              </a>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #F9FAFB; border-radius: 0 0 8px 8px; border-top: 1px solid #E5E7EB;">
              <p style="margin: 0; color: #6B7280; font-size: 12px; text-align: center;">
                This is an automated notification from FleetGuard AI.
                <br>
                © ${new Date().getFullYear()} FleetGuard AI. All rights reserved.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// ============================================================================
// Push Notification Handler
// ============================================================================

/**
 * Send push notification using Firebase Cloud Messaging (FCM)
 */
async function sendPushNotification(job: NotificationJob): Promise<DeliveryResult> {
  try {
    if (!FCM_SERVER_KEY) {
      return {
        success: false,
        error: 'FCM server key not configured',
      };
    }

    const payload = job.payload as {
      notification?: {
        title?: string;
        body?: string;
      };
      data?: Record<string, string>;
      title?: string;
      description?: string;
      alert_id?: string;
      alert_type?: string;
      severity?: string;
    };

    const fcmPayload = {
      to: job.recipient, // FCM token
      notification: payload.notification || {
        title: payload.title || 'Fleet Alert',
        body: payload.description || '',
        icon: 'ic_notification',
        sound: 'default',
        badge: '1',
      },
      data: payload.data || {
        alert_id: payload.alert_id || '',
        alert_type: payload.alert_type || '',
        severity: payload.severity || '',
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
      },
      priority: 'high',
      content_available: true,
    };

    const response = await fetch(FCM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${FCM_SERVER_KEY}`,
      },
      body: JSON.stringify(fcmPayload),
    });

    const data = await response.json();

    if (response.ok && data.success === 1) {
      console.log('[Push Handler] Notification sent successfully:', data.message_id);
      return {
        success: true,
        messageId: data.message_id || 'sent',
      };
    } else {
      console.error('[Push Handler] Failed to send notification:', data);
      return {
        success: false,
        error: data.results?.[0]?.error || 'Failed to send push notification',
      };
    }
  } catch (error) {
    console.error('[Push Handler] Exception:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// Job Processing
// ============================================================================

/**
 * Process a single notification job
 */
export async function processNotificationJob(
  supabase: SupabaseClient,
  job: NotificationJob
): Promise<void> {
  console.log(`[Handler] Processing job ${job.id} (${job.channel}) - Attempt ${job.attempt + 1}`);

  // Update job status to 'processing'
  await supabase
    .from('notification_jobs')
    .update({
      status: 'processing',
      last_attempt_at: new Date().toISOString(),
    })
    .eq('id', job.id);

  // Call channel-specific handler
  let result: DeliveryResult;

  switch (job.channel) {
    case 'email':
      result = await sendEmailMessage(job);
      break;
    case 'push':
      result = await sendPushNotification(job);
      break;
    default:
      result = {
        success: false,
        error: `Unknown channel: ${job.channel}`,
      };
  }

  // Update job based on result
  if (result.success) {
    await supabase
      .from('notification_jobs')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        error_message: null,
      })
      .eq('id', job.id);

    console.log(`[Handler] Job ${job.id} completed successfully`);
  } else {
    const newAttempt = job.attempt + 1;
    const shouldRetry = newAttempt < MAX_RETRY_ATTEMPTS;

    await supabase
      .from('notification_jobs')
      .update({
        status: shouldRetry ? 'queued' : 'failed',
        attempt: newAttempt,
        error_message: result.error || 'Unknown error',
      })
      .eq('id', job.id);

    if (shouldRetry) {
      console.log(
        `[Handler] Job ${job.id} failed, will retry (attempt ${newAttempt}/${MAX_RETRY_ATTEMPTS})`
      );
    } else {
      console.error(
        `[Handler] Job ${job.id} failed after ${MAX_RETRY_ATTEMPTS} attempts: ${result.error}`
      );
    }
  }
}

/**
 * Process all queued notification jobs
 * This should be called by a cron job or background worker
 */
export async function processQueuedJobs(supabase: SupabaseClient): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  console.log('[Handler] Starting to process queued jobs...');

  // Fetch queued jobs (with exponential backoff consideration)
  const { data: jobs, error } = await supabase
    .from('notification_jobs')
    .select('*')
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(100); // Process in batches of 100

  if (error) {
    console.error('[Handler] Failed to fetch queued jobs:', error);
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  if (!jobs || jobs.length === 0) {
    console.log('[Handler] No queued jobs found');
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  console.log(`[Handler] Found ${jobs.length} queued jobs`);

  let succeeded = 0;
  let failed = 0;

  // Process jobs with exponential backoff
  for (const job of jobs) {
    // Calculate backoff delay based on attempt number
    const backoffDelays = [0, 60000, 300000, 900000]; // 0s, 1min, 5min, 15min
    const backoffDelay = backoffDelays[job.attempt] || 900000;

    // Check if enough time has passed since last attempt
    if (job.last_attempt_at) {
      const timeSinceLastAttempt =
        Date.now() - new Date(job.last_attempt_at).getTime();
      
      if (timeSinceLastAttempt < backoffDelay) {
        console.log(
          `[Handler] Skipping job ${job.id} - backoff period not elapsed (${Math.round(
            (backoffDelay - timeSinceLastAttempt) / 1000
          )}s remaining)`
        );
        continue;
      }
    }

    try {
      await processNotificationJob(supabase, job);
      succeeded++;
    } catch (error) {
      console.error(`[Handler] Error processing job ${job.id}:`, error);
      failed++;
    }
  }

  console.log(
    `[Handler] Finished processing: ${succeeded} succeeded, ${failed} failed`
  );

  return {
    processed: succeeded + failed,
    succeeded,
    failed,
  };
}
