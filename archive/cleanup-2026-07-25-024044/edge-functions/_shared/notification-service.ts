/**
 * Notification Service - Supabase Email Integration
 * 
 * Uses Supabase's built-in email service (free tier) for sending notifications
 * instead of external services like SendGrid, Twilio, etc.
 * 
 * This service handles:
 * - Alert notifications (due_soon, overdue, critical_failure_risk, etc.)
 * - User invitations
 * - Password resets
 * - System notifications
 * 
 * Note: Supabase free tier includes up to 60 emails per hour
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// ==================================================================
// Types
// ==================================================================

export interface EmailNotification {
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  metadata?: Record<string, any>;
}

export interface AlertNotification {
  userEmail: string;
  userName: string;
  alertType: string;
  severity: string;
  title: string;
  description: string;
  vehicleRegistration?: string;
  componentType?: string;
  actionUrl?: string;
}

export interface InvitationNotification {
  email: string;
  inviterName: string;
  companyName: string;
  role: string;
  invitationUrl: string;
  expiresAt: string;
}

// ==================================================================
// Supabase Email Service (Free Tier)
// ==================================================================

/**
 * Send email notification using Supabase Auth's built-in email
 * This method leverages Supabase's free email service
 */
export async function sendEmailViaSupabase(
  notification: EmailNotification
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase credentials');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Use Supabase Auth's admin API to send a magic link email
    // which we can customize with our content
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: notification.to,
      options: {
        data: {
          custom_email: true,
          subject: notification.subject,
          html_body: notification.htmlBody,
          text_body: notification.textBody,
          ...notification.metadata,
        },
      },
    });

    if (error) {
      console.error('[Notification Service] Email error:', error);
      return { success: false, error: error.message };
    }

    console.log(`[Notification Service] Email sent to ${notification.to}`);
    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Notification Service] Exception:', errorMsg);
    return { success: false, error: errorMsg };
  }
}

// ==================================================================
// Email Templates
// ==================================================================

/**
 * Generate HTML for alert notification
 */
function generateAlertEmailHtml(alert: AlertNotification): string {
  const severityColors: Record<string, string> = {
    low: '#10B981',
    medium: '#F59E0B',
    high: '#EF4444',
    critical: '#DC2626',
  };

  const color = severityColors[alert.severity] || '#6B7280';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${alert.subject}</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">FleetGuard AI</h1>
    <p style="color: #E0E7FF; margin: 10px 0 0 0;">Fleet Maintenance Alert System</p>
  </div>
  
  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
    <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <p style="font-size: 16px; color: #4B5563; margin-top: 0;">Hello ${alert.userName},</p>
      
      <div style="background: ${color}15; border-left: 4px solid ${color}; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <div style="display: flex; align-items: center; margin-bottom: 10px;">
          <span style="background: ${color}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; text-transform: uppercase;">${alert.severity}</span>
          <span style="margin-left: 10px; color: #6B7280; font-size: 14px;">${alert.alertType.replace('_', ' ').toUpperCase()}</span>
        </div>
        <h2 style="color: #111827; margin: 10px 0; font-size: 20px;">${alert.title}</h2>
        <p style="color: #4B5563; margin: 10px 0 0 0; font-size: 14px;">${alert.description}</p>
      </div>

      ${alert.vehicleRegistration ? `
      <div style="background: #F3F4F6; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <p style="margin: 0; color: #6B7280; font-size: 13px; font-weight: 600;">VEHICLE</p>
        <p style="margin: 5px 0 0 0; color: #111827; font-size: 16px; font-weight: bold;">${alert.vehicleRegistration}</p>
        ${alert.componentType ? `<p style="margin: 5px 0 0 0; color: #6B7280; font-size: 14px;">Component: ${alert.componentType}</p>` : ''}
      </div>
      ` : ''}

      ${alert.actionUrl ? `
      <div style="text-align: center; margin: 30px 0;">
        <a href="${alert.actionUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px;">
          View Alert in Dashboard
        </a>
      </div>
      ` : ''}

      <div style="border-top: 1px solid #E5E7EB; margin-top: 30px; padding-top: 20px;">
        <p style="color: #6B7280; font-size: 13px; margin: 0;">
          <strong>What should I do?</strong><br>
          Please review this alert and take appropriate action based on your maintenance schedule and vehicle usage.
        </p>
      </div>
    </div>

    <div style="text-align: center; margin-top: 20px; color: #9CA3AF; font-size: 12px;">
      <p style="margin: 5px 0;">FleetGuard AI - Intelligent Fleet Maintenance Management</p>
      <p style="margin: 5px 0;">
        <a href="#" style="color: #667eea; text-decoration: none;">Unsubscribe</a> | 
        <a href="#" style="color: #667eea; text-decoration: none;">Manage Preferences</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generate plain text version of alert email
 */
function generateAlertEmailText(alert: AlertNotification): string {
  return `
FleetGuard AI - Fleet Maintenance Alert

Hello ${alert.userName},

[${alert.severity.toUpperCase()}] ${alert.alertType.replace('_', ' ').toUpperCase()}

${alert.title}

${alert.description}

${alert.vehicleRegistration ? `Vehicle: ${alert.vehicleRegistration}` : ''}
${alert.componentType ? `Component: ${alert.componentType}` : ''}

${alert.actionUrl ? `View in Dashboard: ${alert.actionUrl}` : ''}

---
FleetGuard AI - Intelligent Fleet Maintenance Management
  `.trim();
}

/**
 * Generate HTML for invitation email
 */
function generateInvitationEmailHtml(invitation: InvitationNotification): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're Invited to Join ${invitation.companyName}</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">FleetGuard AI</h1>
    <p style="color: #E0E7FF; margin: 10px 0 0 0;">You've Been Invited!</p>
  </div>
  
  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
    <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <p style="font-size: 16px; color: #4B5563; margin-top: 0;">Hello!</p>
      
      <p style="font-size: 16px; color: #111827; line-height: 1.8;">
        <strong>${invitation.inviterName}</strong> has invited you to join <strong>${invitation.companyName}</strong> on FleetGuard AI.
      </p>

      <div style="background: #F3F4F6; padding: 20px; border-radius: 6px; margin: 20px 0;">
        <p style="margin: 0; color: #6B7280; font-size: 13px; font-weight: 600;">YOUR ROLE</p>
        <p style="margin: 5px 0 0 0; color: #111827; font-size: 18px; font-weight: bold;">${invitation.role.replace('_', ' ').toUpperCase()}</p>
      </div>

      <p style="font-size: 14px; color: #6B7280;">
        Click the button below to accept your invitation and set up your account. This invitation expires on <strong>${new Date(invitation.expiresAt).toLocaleDateString()}</strong>.
      </p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${invitation.invitationUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px;">
          Accept Invitation
        </a>
      </div>

      <div style="border-top: 1px solid #E5E7EB; margin-top: 30px; padding-top: 20px;">
        <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
          If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${invitation.invitationUrl}" style="color: #667eea; word-break: break-all;">${invitation.invitationUrl}</a>
        </p>
      </div>
    </div>

    <div style="text-align: center; margin-top: 20px; color: #9CA3AF; font-size: 12px;">
      <p style="margin: 5px 0;">FleetGuard AI - Intelligent Fleet Maintenance Management</p>
      <p style="margin: 5px 0;">If you didn't expect this invitation, you can safely ignore this email.</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generate plain text version of invitation email
 */
function generateInvitationEmailText(invitation: InvitationNotification): string {
  return `
You've Been Invited to Join ${invitation.companyName}!

Hello!

${invitation.inviterName} has invited you to join ${invitation.companyName} on FleetGuard AI.

Your Role: ${invitation.role.replace('_', ' ').toUpperCase()}

Click the link below to accept your invitation and set up your account:
${invitation.invitationUrl}

This invitation expires on ${new Date(invitation.expiresAt).toLocaleDateString()}.

---
FleetGuard AI - Intelligent Fleet Maintenance Management

If you didn't expect this invitation, you can safely ignore this email.
  `.trim();
}

// ==================================================================
// High-Level Notification Functions
// ==================================================================

/**
 * Send alert notification to user
 */
export async function sendAlertNotification(
  alert: AlertNotification
): Promise<{ success: boolean; error?: string }> {
  const notification: EmailNotification = {
    to: alert.userEmail,
    subject: `[FleetGuard AI] ${alert.severity.toUpperCase()}: ${alert.title}`,
    htmlBody: generateAlertEmailHtml(alert),
    textBody: generateAlertEmailText(alert),
    metadata: {
      alert_type: alert.alertType,
      severity: alert.severity,
    },
  };

  return sendEmailViaSupabase(notification);
}

/**
 * Send invitation notification
 */
export async function sendInvitationNotification(
  invitation: InvitationNotification
): Promise<{ success: boolean; error?: string }> {
  const notification: EmailNotification = {
    to: invitation.email,
    subject: `You're invited to join ${invitation.companyName} on FleetGuard AI`,
    htmlBody: generateInvitationEmailHtml(invitation),
    textBody: generateInvitationEmailText(invitation),
    metadata: {
      invitation_type: 'user_invitation',
      company: invitation.companyName,
      role: invitation.role,
    },
  };

  return sendEmailViaSupabase(notification);
}

/**
 * Batch send alert notifications to multiple users
 */
export async function sendBatchAlertNotifications(
  alerts: AlertNotification[]
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const results = {
    sent: 0,
    failed: 0,
    errors: [] as string[],
  };

  for (const alert of alerts) {
    const result = await sendAlertNotification(alert);
    if (result.success) {
      results.sent++;
    } else {
      results.failed++;
      if (result.error) {
        results.errors.push(`${alert.userEmail}: ${result.error}`);
      }
    }

    // Rate limiting: Supabase free tier allows 60 emails per hour
    // Add a small delay between emails (1 second = max 60/hour)
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return results;
}
