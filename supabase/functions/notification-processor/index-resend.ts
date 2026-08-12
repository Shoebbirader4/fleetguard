/**
 * Notification Processor Edge Function - FIXED WITH RESEND
 * 
 * Processes queued notification jobs using Resend email API.
 * Handles delivery via Email and Push notifications.
 * 
 * Requirements:
 * - RESEND_API_KEY environment variable (get from resend.com)
 * - FCM_SERVER_KEY environment variable (optional, for push notifications)
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

interface ProcessingResult {
  total_processed: number;
  successful: number;
  failed: number;
  retry_scheduled: number;
  max_retries_exceeded: number;
}

interface DeliveryResult {
  success: boolean;
  error?: string;
}

// ============================================================================
// Configuration
// ============================================================================

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAYS = [1, 5, 15]; // minutes
const BATCH_SIZE = 50;

// ============================================================================
// Resend Email Service
// ============================================================================

/**
 * Generate HTML email template
 */
function generateAlertEmailHtml(payload: Record<string, unknown>): string {
  const title = payload.title as string || 'FleetGuard Alert';
  const description = payload.description as string || '';
  const severity = (payload.severity as string || 'medium').toLowerCase();
  const userName = payload.user_name as string || 'User';
  const alertType = (payload.alert_type as string || 'alert').replace('_', ' ').toUpperCase();
  
  const severityColors: Record<string, string> = {
    low: '#10B981',
    medium: '#F59E0B',
    high: '#EF4444',
    critical: '#DC2626',
  };

  const color = severityColors[severity] || '#6B7280';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">🚗 FleetGuard AI</h1>
    <p style="color: #E0E7FF; margin: 10px 0 0 0;">Fleet Maintenance Alert System</p>
  </div>
  
  <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <p style="font-size: 16px; color: #4B5563; margin-top: 0;">Hello ${userName},</p>
    
    <div style="background: ${color}15; border-left: 4px solid ${color}; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <div style="display: flex; align-items: center; margin-bottom: 10px;">
        <span style="background: ${color}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; text-transform: uppercase;">${severity}</span>
        <span style="margin-left: 10px; color: #6B7280; font-size: 14px;">${alertType}</span>
      </div>
      <h2 style="color: #111827; margin: 10px 0; font-size: 20px;">${title}</h2>
      <p style="color: #4B5563; margin: 10px 0 0 0; font-size: 14px;">${description}</p>
    </div>

    <div style="border-top: 1px solid #E5E7EB; margin-top: 30px; padding-top: 20px;">
      <p style="color: #6B7280; font-size: 13px; margin: 0;">
        <strong>What should I do?</strong><br>
        Please review this alert and take appropriate action based on your maintenance schedule and vehicle usage.
      </p>
    </div>
  </div>

  <div style="text-align: center; margin-top: 20px; color: #9CA3AF; font-size: 12px;">
    <p style="margin: 5px 0;">FleetGuard AI - Intelligent Fleet Maintenance Management</p>
    <p style="margin: 5px 0;">This is an automated notification from your fleet management system.</p>
  </div>
</body>
</html>
  `;
}

/**
 * Send email via Resend API
 */
async function sendEmailViaResend(job: NotificationJob): Promise<DeliveryResult> {
  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!resendApiKey) {
      console.warn('[Notification Processor] RESEND_API_KEY not configured');
      return {
        success: false,
        error: 'Resend API key not configured. Set RESEND_API_KEY in Supabase secrets.',
      };
    }

    const subject = job.payload.subject as string || '[FleetGuard] Fleet Alert';
    const htmlContent = generateAlertEmailHtml(job.payload);

    const emailPayload = {
      from: 'FleetGuard AI <onboarding@resend.dev>', // Use resend.dev for testing, replace with your domain later
      to: [job.recipient],
      subject: subject,
      html: htmlContent,
    };

    console.log(`[Notification Processor] Sending email to ${job.recipient} via Resend`);

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Notification Processor] Resend API error:', errorText);
      return {
        success: false,
        error: `Resend API error: ${response.status} ${errorText}`,
      };
    }

    const result = await response.json();
    console.log(`[Notification Processor] Email sent successfully via Resend. ID: ${result.id}`);
    
    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Notification Processor] Exception sending email:', errorMsg);
    return {
      success: false,
      error: errorMsg,
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
      console.warn('[Notification Processor] FCM_SERVER_KEY not configured');
      return {
        success: false,
        error: 'FCM not configured',
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
      return await sendEmailViaResend(job);
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

function calculateNextRetryTime(attempt: number): string | null {
  if (attempt >= MAX_RETRY_ATTEMPTS) {
    return null;
  }

  const delayMinutes = RETRY_DELAYS[attempt] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
  const nextRetry = new Date(Date.now() + delayMinutes * 60 * 1000);
  return nextRetry.toISOString();
}

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
        `[Notification Processor] Job ${job.id} failed (attempt ${newAttempt}/${MAX_RETRY_ATTEMPTS}). Retry at ${nextRetryTime}`
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
// Main Handler
// ============================================================================

Deno.serve(async (req) => {
  try {
    console.log('[Notification Processor] Starting job processing');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const result: ProcessingResult = {
      total_processed: 0,
      successful: 0,
      failed: 0,
      retry_scheduled: 0,
      max_retries_exceeded: 0,
    };

    // Fetch queued jobs
    const { data: queuedJobs, error: queueError } = await supabase
      .from('notification_jobs')
      .select('*')
      .eq('status', 'queued')
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (queueError) {
      throw new Error(`Failed to fetch queued jobs: ${queueError.message}`);
    }

    // Fetch retry-ready failed jobs
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
      throw new Error(`Failed to fetch retry jobs: ${retryError.message}`);
    }

    // Combine jobs
    const allJobs = [...(queuedJobs || []), ...(retryJobs || [])];
    result.total_processed = allJobs.length;

    console.log(`[Notification Processor] Processing ${allJobs.length} jobs (${queuedJobs?.length || 0} queued, ${retryJobs?.length || 0} retries)`);

    // Process each job
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
