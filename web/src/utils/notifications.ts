/**
 * Notification Utility for Work Order Assignments
 * 
 * Provides functions to send notifications when work orders are assigned or reassigned.
 * Supports both email and in-app notifications based on user preferences.
 * 
 * Requirements: 4.3, 4.5
 */

import { supabase } from '../lib/supabase';

// ============================================================================
// Types
// ============================================================================

export type NotificationChannel = 'email' | 'push';

export interface WorkOrderNotificationData {
  workOrderId: string;
  workOrderTitle: string;
  workOrderDescription: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  vehicleInfo: {
    id: string;
    vin: string;
    make: string;
    model: string;
    year: number;
  };
  assignedBy: {
    id: string;
    name: string;
  };
}

export interface NotificationPreferences {
  work_order_assigned?: NotificationChannel[];
  work_order_reassigned?: NotificationChannel[];
}

export interface NotificationResult {
  success: boolean;
  jobsCreated: number;
  errors: string[];
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get user notification preferences
 */
async function getUserPreferences(userId: string): Promise<NotificationPreferences> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('notification_preferences')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('[Notifications] Error fetching user preferences:', error);
      // Default to email notifications if preferences not found
      return {
        work_order_assigned: ['email'],
        work_order_reassigned: ['email'],
      };
    }

    return (data?.notification_preferences as NotificationPreferences) || {
      work_order_assigned: ['email'],
      work_order_reassigned: ['email'],
    };
  } catch (err) {
    console.error('[Notifications] Error in getUserPreferences:', err);
    // Default to email notifications on error
    return {
      work_order_assigned: ['email'],
      work_order_reassigned: ['email'],
    };
  }
}

/**
 * Get user contact information for notification delivery
 */
async function getUserContactInfo(userId: string): Promise<{
  email: string;
  fcmToken: string | null;
  fullName: string;
  tenantId: string;
}> {
  const { data, error } = await supabase
    .from('users')
    .select('email, fcm_token, full_name, tenant_id')
    .eq('id', userId)
    .single();

  if (error || !data) {
    throw new Error(`Failed to fetch user contact info: ${error?.message || 'User not found'}`);
  }

  return {
    email: data.email,
    fcmToken: data.fcm_token || null,
    fullName: data.full_name,
    tenantId: data.tenant_id,
  };
}

/**
 * Create email payload for work order assignment
 */
function createEmailPayload(
  notificationData: WorkOrderNotificationData,
  recipientName: string,
  isReassignment: boolean
): Record<string, unknown> {
  const action = isReassignment ? 'reassigned' : 'assigned';
  const subject = `Work Order ${action.charAt(0).toUpperCase() + action.slice(1)}: ${notificationData.vehicleInfo.make} ${notificationData.vehicleInfo.model}`;
  
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563EB;">Work Order ${action.charAt(0).toUpperCase() + action.slice(1)}</h2>
      
      <p>Hi ${recipientName},</p>
      
      <p>A work order has been ${action} to you by ${notificationData.assignedBy.name}.</p>
      
      <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #1f2937;">Work Order Details</h3>
        
        <p style="margin: 8px 0;"><strong>Title:</strong> ${notificationData.workOrderTitle}</p>
        <p style="margin: 8px 0;"><strong>Description:</strong> ${notificationData.workOrderDescription || 'N/A'}</p>
        <p style="margin: 8px 0;"><strong>Priority:</strong> <span style="color: ${getPriorityColor(notificationData.priority)}; font-weight: bold;">${notificationData.priority.toUpperCase()}</span></p>
        
        <h4 style="margin-top: 16px; margin-bottom: 8px; color: #1f2937;">Vehicle Information</h4>
        <p style="margin: 8px 0;"><strong>Make/Model:</strong> ${notificationData.vehicleInfo.make} ${notificationData.vehicleInfo.model}</p>
        <p style="margin: 8px 0;"><strong>Year:</strong> ${notificationData.vehicleInfo.year}</p>
        <p style="margin: 8px 0;"><strong>VIN:</strong> ${notificationData.vehicleInfo.vin}</p>
      </div>
      
      <p style="margin-top: 20px;">
        <a href="${getAppUrl()}/work-orders/${notificationData.workOrderId}" 
           style="background-color: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          View Work Order
        </a>
      </p>
      
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
      
      <p style="color: #6b7280; font-size: 14px;">
        This is an automated notification from FleetGuard AI. 
        ${isReassignment ? 'You have been reassigned this work order.' : 'This work order is now assigned to you.'}
      </p>
    </div>
  `;
  
  const textBody = `
Work Order ${action.charAt(0).toUpperCase() + action.slice(1)}

Hi ${recipientName},

A work order has been ${action} to you by ${notificationData.assignedBy.name}.

Work Order Details:
- Title: ${notificationData.workOrderTitle}
- Description: ${notificationData.workOrderDescription || 'N/A'}
- Priority: ${notificationData.priority.toUpperCase()}

Vehicle Information:
- Make/Model: ${notificationData.vehicleInfo.make} ${notificationData.vehicleInfo.model}
- Year: ${notificationData.vehicleInfo.year}
- VIN: ${notificationData.vehicleInfo.vin}

View the work order: ${getAppUrl()}/work-orders/${notificationData.workOrderId}

---
This is an automated notification from FleetGuard AI.
  `.trim();

  return {
    subject,
    html_content: htmlContent,
    text_body: textBody,
    work_order_id: notificationData.workOrderId,
    priority: notificationData.priority,
    alert_type: isReassignment ? 'work_order_reassigned' : 'work_order_assigned',
    severity: notificationData.priority === 'critical' ? 'critical' : 
              notificationData.priority === 'high' ? 'high' : 'medium',
  };
}

/**
 * Create push notification payload
 */
function createPushPayload(
  notificationData: WorkOrderNotificationData,
  isReassignment: boolean
): Record<string, unknown> {
  const action = isReassignment ? 'reassigned' : 'assigned';
  
  return {
    notification: {
      title: `Work Order ${action.charAt(0).toUpperCase() + action.slice(1)}`,
      body: `${notificationData.vehicleInfo.make} ${notificationData.vehicleInfo.model} - ${notificationData.workOrderTitle}`,
    },
    data: {
      work_order_id: notificationData.workOrderId,
      priority: notificationData.priority,
      type: isReassignment ? 'work_order_reassigned' : 'work_order_assigned',
      vehicle_id: notificationData.vehicleInfo.id,
    },
  };
}

/**
 * Get priority color for email formatting
 */
function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'critical':
      return '#DC2626'; // red-600
    case 'high':
      return '#EA580C'; // orange-600
    case 'medium':
      return '#F59E0B'; // amber-500
    case 'low':
      return '#10B981'; // green-500
    default:
      return '#6B7280'; // gray-500
  }
}

/**
 * Get application URL from environment
 */
function getAppUrl(): string {
  return import.meta.env.VITE_APP_URL || window.location.origin;
}

/**
 * Create a notification job in the database
 */
async function createNotificationJob(
  tenantId: string,
  userId: string,
  channel: NotificationChannel,
  recipient: string,
  payload: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase
    .from('notification_jobs')
    .insert({
      tenant_id: tenantId,
      alert_id: null, // Work order notifications don't have alert_id
      user_id: userId,
      channel,
      recipient,
      payload,
      status: 'queued',
      attempt: 0,
    });

  if (error) {
    console.error('[Notifications] Error creating notification job:', error);
    throw new Error(`Failed to create notification job: ${error.message}`);
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Send notification to a user about work order assignment
 * 
 * @param userId - ID of the user to notify
 * @param notificationData - Work order details
 * @param isReassignment - Whether this is a reassignment (true) or initial assignment (false)
 * @returns Result indicating success and any errors
 */
export async function sendWorkOrderAssignmentNotification(
  userId: string,
  notificationData: WorkOrderNotificationData,
  isReassignment: boolean = false
): Promise<NotificationResult> {
  const result: NotificationResult = {
    success: true,
    jobsCreated: 0,
    errors: [],
  };

  try {
    // Get user preferences
    const preferences = await getUserPreferences(userId);
    const notificationType = isReassignment ? 'work_order_reassigned' : 'work_order_assigned';
    const enabledChannels = preferences[notificationType] || ['email'];

    // If no channels enabled, return early
    if (enabledChannels.length === 0) {
      console.log(`[Notifications] No channels enabled for user ${userId}`);
      return result;
    }

    // Get user contact info
    const userInfo = await getUserContactInfo(userId);

    // Process each enabled channel
    for (const channel of enabledChannels) {
      try {
        let recipient = '';
        let payload: Record<string, unknown> = {};
        let skip = false;

        switch (channel) {
          case 'email':
            if (!userInfo.email) {
              result.errors.push('No email address configured for user');
              skip = true;
            } else {
              recipient = userInfo.email;
              payload = createEmailPayload(notificationData, userInfo.fullName, isReassignment);
            }
            break;

          case 'push':
            if (!userInfo.fcmToken) {
              result.errors.push('No FCM token configured for user');
              skip = true;
            } else {
              recipient = userInfo.fcmToken;
              payload = createPushPayload(notificationData, isReassignment);
            }
            break;

          default:
            result.errors.push(`Unknown channel: ${channel}`);
            skip = true;
        }

        if (skip) {
          continue;
        }

        // Create notification job
        await createNotificationJob(
          userInfo.tenantId,
          userId,
          channel,
          recipient,
          payload
        );

        result.jobsCreated++;
        console.log(`[Notifications] Created ${channel} notification job for user ${userId}`);
      } catch (channelError) {
        const errorMsg = channelError instanceof Error ? channelError.message : 'Unknown error';
        console.error(`[Notifications] Error creating ${channel} job:`, channelError);
        result.errors.push(`${channel}: ${errorMsg}`);
      }
    }

    // If no jobs were created, mark as failure
    if (result.jobsCreated === 0) {
      result.success = false;
    }
  } catch (err) {
    console.error('[Notifications] Error in sendWorkOrderAssignmentNotification:', err);
    result.success = false;
    result.errors.push(err instanceof Error ? err.message : 'Unknown error');
  }

  return result;
}

/**
 * Send notifications for work order reassignment to both old and new mechanic
 * 
 * @param oldMechanicId - ID of the mechanic being unassigned
 * @param newMechanicId - ID of the mechanic being assigned
 * @param notificationData - Work order details
 * @returns Combined results for both notifications
 */
export async function sendWorkOrderReassignmentNotifications(
  oldMechanicId: string | null,
  newMechanicId: string,
  notificationData: WorkOrderNotificationData
): Promise<{
  oldMechanicResult: NotificationResult | null;
  newMechanicResult: NotificationResult;
}> {
  const results = {
    oldMechanicResult: null as NotificationResult | null,
    newMechanicResult: {
      success: false,
      jobsCreated: 0,
      errors: [],
    } as NotificationResult,
  };

  // Send notification to old mechanic (if exists)
  if (oldMechanicId) {
    try {
      results.oldMechanicResult = await sendWorkOrderAssignmentNotification(
        oldMechanicId,
        {
          ...notificationData,
          workOrderTitle: `Work Order Unassigned: ${notificationData.workOrderTitle}`,
        },
        true
      );
    } catch (err) {
      console.error('[Notifications] Error notifying old mechanic:', err);
      results.oldMechanicResult = {
        success: false,
        jobsCreated: 0,
        errors: [err instanceof Error ? err.message : 'Unknown error'],
      };
    }
  }

  // Send notification to new mechanic
  try {
    results.newMechanicResult = await sendWorkOrderAssignmentNotification(
      newMechanicId,
      notificationData,
      true
    );
  } catch (err) {
    console.error('[Notifications] Error notifying new mechanic:', err);
    results.newMechanicResult = {
      success: false,
      jobsCreated: 0,
      errors: [err instanceof Error ? err.message : 'Unknown error'],
    };
  }

  return results;
}

/**
 * Check if notifications are enabled for a user
 * 
 * @param userId - ID of the user to check
 * @param notificationType - Type of notification to check ('work_order_assigned' or 'work_order_reassigned')
 * @returns True if at least one notification channel is enabled
 */
export async function areNotificationsEnabled(
  userId: string,
  notificationType: 'work_order_assigned' | 'work_order_reassigned'
): Promise<boolean> {
  try {
    const preferences = await getUserPreferences(userId);
    const channels = preferences[notificationType] || [];
    return channels.length > 0;
  } catch (err) {
    console.error('[Notifications] Error checking if notifications enabled:', err);
    // Default to true (assume notifications enabled) on error
    return true;
  }
}
