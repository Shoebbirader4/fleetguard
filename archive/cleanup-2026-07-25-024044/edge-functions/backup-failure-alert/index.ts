/**
 * Backup Failure Alert Edge Function
 * 
 * Sends alerts to system administrators when backup failures are detected
 * Requirement 27.6: Alert within 5 minutes of backup failure
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Alert configuration
const ALERT_CONFIG = {
  email: {
    enabled: true,
    recipients: (Deno.env.get('ADMIN_EMAIL_RECIPIENTS') || 'admin@fleetguard.ai').split(','),
    from: Deno.env.get('ALERT_EMAIL_FROM') || 'alerts@fleetguard.ai',
    subject: '[CRITICAL] FleetGuard AI Backup Failure',
  },
  sms: {
    enabled: Deno.env.get('SMS_ALERTS_ENABLED') === 'true',
    recipients: (Deno.env.get('ADMIN_SMS_RECIPIENTS') || '').split(',').filter(Boolean),
  },
  slack: {
    enabled: Deno.env.get('SLACK_WEBHOOK_URL') !== undefined,
    webhook_url: Deno.env.get('SLACK_WEBHOOK_URL'),
    channel: Deno.env.get('SLACK_ALERT_CHANNEL') || '#fleetguard-alerts',
  },
};

// Twilio credentials for SMS
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
const TWILIO_FROM_NUMBER = Deno.env.get('TWILIO_FROM_NUMBER');

// SendGrid API key for email
const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');

interface BackupAlert {
  alert_type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  timestamp: string;
  details: {
    failure_reason: string;
    last_successful_backup: string | null;
    backup_age_hours: number | null;
    pitr_status: string;
    wal_archiving_active: boolean;
    integrity_check_passed: boolean;
    storage_healthy: boolean;
  };
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
    const alert: BackupAlert = await req.json();

    console.log('Processing backup failure alert:', alert);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Track alert delivery status
    const deliveryResults = {
      email: { attempted: false, success: false, error: null as string | null },
      sms: { attempted: false, success: false, error: null as string | null },
      slack: { attempted: false, success: false, error: null as string | null },
    };

    // Send email alerts
    if (ALERT_CONFIG.email.enabled && SENDGRID_API_KEY) {
      deliveryResults.email.attempted = true;
      try {
        await sendEmailAlert(alert);
        deliveryResults.email.success = true;
        console.log('Email alert sent successfully');
      } catch (error) {
        deliveryResults.email.error = error.message;
        console.error('Email alert failed:', error);
      }
    }

    // Send SMS alerts
    if (ALERT_CONFIG.sms.enabled && ALERT_CONFIG.sms.recipients.length > 0) {
      deliveryResults.sms.attempted = true;
      try {
        await sendSMSAlert(alert);
        deliveryResults.sms.success = true;
        console.log('SMS alert sent successfully');
      } catch (error) {
        deliveryResults.sms.error = error.message;
        console.error('SMS alert failed:', error);
      }
    }

    // Send Slack alerts
    if (ALERT_CONFIG.slack.enabled && ALERT_CONFIG.slack.webhook_url) {
      deliveryResults.slack.attempted = true;
      try {
        await sendSlackAlert(alert);
        deliveryResults.slack.success = true;
        console.log('Slack alert sent successfully');
      } catch (error) {
        deliveryResults.slack.error = error.message;
        console.error('Slack alert failed:', error);
      }
    }

    // Log alert to database
    await logAlert(supabase, alert, deliveryResults);

    // Check if any alert succeeded
    const anySuccess = deliveryResults.email.success || deliveryResults.sms.success || deliveryResults.slack.success;

    return new Response(
      JSON.stringify({
        success: anySuccess,
        timestamp: new Date().toISOString(),
        delivery_results: deliveryResults,
        alert_id: `backup-alert-${Date.now()}`,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        status: anySuccess ? 200 : 500,
      }
    );
  } catch (error) {
    console.error('Backup alert error:', error);

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
 * Send email alert via SendGrid
 */
async function sendEmailAlert(alert: BackupAlert): Promise<void> {
  if (!SENDGRID_API_KEY) {
    throw new Error('SendGrid API key not configured');
  }

  const htmlContent = generateEmailHTML(alert);
  const textContent = generateEmailText(alert);

  for (const recipient of ALERT_CONFIG.email.recipients) {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: recipient }],
          subject: ALERT_CONFIG.email.subject,
        }],
        from: { email: ALERT_CONFIG.email.from },
        content: [
          { type: 'text/plain', value: textContent },
          { type: 'text/html', value: htmlContent },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`SendGrid API error: ${error}`);
    }
  }
}

/**
 * Send SMS alert via Twilio
 */
async function sendSMSAlert(alert: BackupAlert): Promise<void> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
    throw new Error('Twilio credentials not configured');
  }

  const message = `CRITICAL: FleetGuard backup failed. ${alert.details.failure_reason}. Check email for details.`;

  for (const recipient of ALERT_CONFIG.sms.recipients) {
    const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

    const formData = new URLSearchParams({
      To: recipient,
      From: TWILIO_FROM_NUMBER,
      Body: message,
    });

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Twilio API error: ${error}`);
    }
  }
}

/**
 * Send Slack alert via webhook
 */
async function sendSlackAlert(alert: BackupAlert): Promise<void> {
  if (!ALERT_CONFIG.slack.webhook_url) {
    throw new Error('Slack webhook URL not configured');
  }

  const slackMessage = {
    channel: ALERT_CONFIG.slack.channel,
    username: 'FleetGuard Backup Monitor',
    icon_emoji: ':rotating_light:',
    attachments: [{
      color: 'danger',
      title: '🚨 CRITICAL: Backup Failure Detected',
      text: alert.details.failure_reason,
      fields: [
        {
          title: 'Last Successful Backup',
          value: alert.details.last_successful_backup || 'Unknown',
          short: true,
        },
        {
          title: 'Backup Age',
          value: alert.details.backup_age_hours
            ? `${alert.details.backup_age_hours.toFixed(1)} hours`
            : 'Unknown',
          short: true,
        },
        {
          title: 'PITR Status',
          value: alert.details.pitr_status,
          short: true,
        },
        {
          title: 'WAL Archiving',
          value: alert.details.wal_archiving_active ? '✅ Active' : '❌ Inactive',
          short: true,
        },
        {
          title: 'Integrity Check',
          value: alert.details.integrity_check_passed ? '✅ Passed' : '❌ Failed',
          short: true,
        },
        {
          title: 'Storage Health',
          value: alert.details.storage_healthy ? '✅ Healthy' : '❌ Unhealthy',
          short: true,
        },
      ],
      footer: 'FleetGuard Backup Monitor',
      footer_icon: 'https://fleetguard.ai/favicon.ico',
      ts: Math.floor(new Date(alert.timestamp).getTime() / 1000),
    }],
  };

  const response = await fetch(ALERT_CONFIG.slack.webhook_url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(slackMessage),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Slack webhook error: ${error}`);
  }
}

/**
 * Generate HTML email content
 */
function generateEmailHTML(alert: BackupAlert): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #dc2626; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
    .details { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
    .status-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    .status-item:last-child { border-bottom: none; }
    .success { color: #059669; }
    .failed { color: #dc2626; }
    .footer { background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚨 CRITICAL: Backup Failure Detected</h1>
    </div>
    <div class="content">
      <p><strong>Time:</strong> ${new Date(alert.timestamp).toLocaleString()}</p>
      <p><strong>Severity:</strong> ${alert.severity.toUpperCase()}</p>
      
      <h2>Failure Details</h2>
      <div class="details">
        <p><strong>Reason:</strong> ${alert.details.failure_reason}</p>
        <p><strong>Last Successful Backup:</strong> ${alert.details.last_successful_backup || 'Unknown'}</p>
        <p><strong>Backup Age:</strong> ${alert.details.backup_age_hours?.toFixed(1) || 'Unknown'} hours</p>
      </div>
      
      <h2>System Status</h2>
      <div class="details">
        <div class="status-item">
          <span>PITR Status:</span>
          <span class="${alert.details.pitr_status === 'healthy' ? 'success' : 'failed'}">${alert.details.pitr_status}</span>
        </div>
        <div class="status-item">
          <span>WAL Archiving:</span>
          <span class="${alert.details.wal_archiving_active ? 'success' : 'failed'}">${alert.details.wal_archiving_active ? 'Active' : 'Inactive'}</span>
        </div>
        <div class="status-item">
          <span>Integrity Check:</span>
          <span class="${alert.details.integrity_check_passed ? 'success' : 'failed'}">${alert.details.integrity_check_passed ? 'Passed' : 'Failed'}</span>
        </div>
        <div class="status-item">
          <span>Storage Health:</span>
          <span class="${alert.details.storage_healthy ? 'success' : 'failed'}">${alert.details.storage_healthy ? 'Healthy' : 'Unhealthy'}</span>
        </div>
      </div>
      
      <h2>Required Actions</h2>
      <ol>
        <li>Review Supabase Dashboard backup logs</li>
        <li>Check for long-running queries blocking backups</li>
        <li>Verify database storage capacity</li>
        <li>Manually trigger backup if needed</li>
        <li>Contact Supabase support if issue persists</li>
      </ol>
      
      <p><strong>Runbook:</strong> <a href="https://docs.fleetguard.ai/runbooks/backup-failure">Backup Failure Response Guide</a></p>
    </div>
    <div class="footer">
      FleetGuard AI Backup Monitor<br>
      This is an automated alert. Do not reply to this email.
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generate plain text email content
 */
function generateEmailText(alert: BackupAlert): string {
  return `
CRITICAL: FleetGuard AI Backup Failure Detected

Time: ${new Date(alert.timestamp).toLocaleString()}
Severity: ${alert.severity.toUpperCase()}

FAILURE DETAILS
---------------
Reason: ${alert.details.failure_reason}
Last Successful Backup: ${alert.details.last_successful_backup || 'Unknown'}
Backup Age: ${alert.details.backup_age_hours?.toFixed(1) || 'Unknown'} hours

SYSTEM STATUS
-------------
PITR Status: ${alert.details.pitr_status}
WAL Archiving: ${alert.details.wal_archiving_active ? 'Active' : 'Inactive'}
Integrity Check: ${alert.details.integrity_check_passed ? 'Passed' : 'Failed'}
Storage Health: ${alert.details.storage_healthy ? 'Healthy' : 'Unhealthy'}

REQUIRED ACTIONS
----------------
1. Review Supabase Dashboard backup logs
2. Check for long-running queries blocking backups
3. Verify database storage capacity
4. Manually trigger backup if needed
5. Contact Supabase support if issue persists

Runbook: https://docs.fleetguard.ai/runbooks/backup-failure

---
FleetGuard AI Backup Monitor
This is an automated alert. Do not reply to this email.
  `;
}

/**
 * Log alert to database
 */
async function logAlert(
  supabase: any,
  alert: BackupAlert,
  deliveryResults: any
): Promise<void> {
  try {
    const { error } = await supabase
      .from('alerts')
      .insert({
        type: 'backup_failure',
        severity: alert.severity,
        title: 'Backup Failure Detected',
        description: alert.details.failure_reason,
        metadata: {
          ...alert.details,
          delivery_results: deliveryResults,
        },
        created_at: alert.timestamp,
        acknowledged: false,
      });

    if (error) {
      console.error('Error logging alert to database:', error);
    }
  } catch (error) {
    console.error('Alert logging error:', error);
  }
}
